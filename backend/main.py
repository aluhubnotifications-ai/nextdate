"""
ALU Matchmaking — FastAPI backend.

- Owns authentication (email/password, bcrypt, JWT).
- JWTs are HS256-signed with the Supabase JWT secret so that
  Supabase Realtime + RLS (auth.uid()) accept them transparently.
- Matching engine reads hidden match_preferences with the service key.

All row shapes live in models.py — this file only wires routes.
"""
import os
import time
import uuid
from typing import List, Optional

import bcrypt
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import Client, create_client

from models import (
    AuthResponse,
    LoginBody,
    MatchPreferences,
    Profile,
    SignupBody,
    SuggestionResponse,
)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
JWT_TTL_SECONDS = int(os.environ.get("JWT_TTL_SECONDS", "604800"))  # 7 days
ALLOWED_EMAIL_DOMAINS = [
    d.strip().lower()
    for d in os.environ.get("ALLOWED_EMAIL_DOMAINS", "alustudent.com,aluedu.org").split(",")
    if d.strip()
]

if not (SUPABASE_URL and SUPABASE_SERVICE_KEY and SUPABASE_JWT_SECRET):
    print("[warn] SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_JWT_SECRET not all set — auth + matching will 500.")

admin: Optional[Client] = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    if SUPABASE_URL and SUPABASE_SERVICE_KEY
    else None
)

app = FastAPI(title="ALU Matchmaking — Backend")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def _unhandled_exception_handler(_: Request, exc: Exception):
    # Catch-all so unexpected errors still pass through CORSMiddleware
    # (Starlette's default 500 path bypasses it, which surfaces in the
    # browser as a misleading "No Access-Control-Allow-Origin" error).
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {exc}"})


# ---------- helpers ----------
def require_admin() -> Client:
    if admin is None:
        raise HTTPException(status_code=500, detail="Backend not configured.")
    return admin


def mint_jwt(user_id: str, email: str) -> str:
    """Issue a Supabase-compatible JWT so RLS sees `auth.uid() = user_id`."""
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT secret not configured.")
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
        "iss": "alu-match-backend",
        "iat": now,
        "exp": now + JWT_TTL_SECONDS,
    }
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm="HS256")


def caller_id(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.split(" ", 1)[1].strip()
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT secret not configured.")
    try:
        claims = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token (no sub).")
    return sub


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def email_domain_ok(email: str) -> bool:
    e = email.strip().lower()
    return any(e.endswith("@" + d) for d in ALLOWED_EMAIL_DOMAINS)


# ---------- embedding model (lazy) ----------
# `all-MiniLM-L6-v2` is Apache-2.0, ~80 MB on disk, 384-dim output. We load it
# on first use (not import) so cold-start auth requests aren't blocked by the
# weight download, and so a backend that never serves /suggestions doesn't pay
# the ~200 MB resident cost.
_embedder = None


def get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer

        _embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _embedder


def prefs_to_doc(prefs: "MatchPreferences") -> str:
    interests = ", ".join(prefs.interests) if prefs.interests else "—"
    hobbies = ", ".join(prefs.hobbies) if prefs.hobbies else "—"
    leisure = prefs.leisure_time or "—"
    wants = prefs.wants_in_relationship or "—"
    return (
        f"Looking for {prefs.target_intent} ({prefs.term_length}). "
        f"Interests: {interests}. Hobbies: {hobbies}. "
        f"Free time: {leisure}. In a partner: {wants}."
    )


def embed_prefs(prefs: "MatchPreferences") -> list[float]:
    return get_embedder().encode(prefs_to_doc(prefs)).tolist()


def ensure_embedding(db: Client, uid: str, prefs: "MatchPreferences") -> None:
    """Compute + persist an embedding for `uid` if the row doesn't have one."""
    row = (
        db.table("match_preferences")
        .select("embedding")
        .eq("user_id", uid)
        .limit(1)
        .execute()
    )
    if row.data and row.data[0].get("embedding") is not None:
        return
    db.table("match_preferences").update({"embedding": embed_prefs(prefs)}).eq(
        "user_id", uid
    ).execute()


# ---------- routes ----------
@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/auth/signup", response_model=AuthResponse)
def signup(body: SignupBody, db: Client = Depends(require_admin)):
    email = body.email.lower()
    if not email_domain_ok(email):
        raise HTTPException(
            status_code=400,
            detail=f"Email must end in {' or '.join('@' + d for d in ALLOWED_EMAIL_DOMAINS)}.",
        )

    existing = db.table("users").select("id").eq("email", email).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered.")

    new_id = str(uuid.uuid4())
    db.table("users").insert(
        {"id": new_id, "email": email, "password_hash": hash_password(body.password)}
    ).execute()

    token = mint_jwt(new_id, email)
    return AuthResponse(user_id=new_id, email=email, token=token, expires_in=JWT_TTL_SECONDS)


@app.post("/auth/login", response_model=AuthResponse)
def login(body: LoginBody, db: Client = Depends(require_admin)):
    email = body.email.lower()
    rows = db.table("users").select("*").eq("email", email).limit(1).execute()
    user_row = rows.data[0] if rows.data else None
    if not user_row or not verify_password(body.password, user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = mint_jwt(user_row["id"], email)
    return AuthResponse(user_id=user_row["id"], email=email, token=token, expires_in=JWT_TTL_SECONDS)


@app.get("/auth/me")
def me(uid: str = Depends(caller_id), db: Client = Depends(require_admin)):
    rows = db.table("users").select("id, email, created_at").eq("id", uid).limit(1).execute()
    if not rows.data:
        raise HTTPException(status_code=404, detail="User not found.")
    return rows.data[0]


@app.get("/suggestions/{user_id}", response_model=List[SuggestionResponse])
def get_curated_suggestions(
    user_id: str,
    me: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    if user_id != me:
        raise HTTPException(status_code=403, detail="Forbidden.")

    pref_rows = (
        db.table("match_preferences")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not pref_rows.data:
        raise HTTPException(status_code=404, detail="Preferences unconfigured.")

    prefs = MatchPreferences(**pref_rows.data[0])

    # Embeddings are CACHED on the row. We only ever compute one for users
    # whose `embedding` is null — either brand-new accounts, or rows whose
    # prefs the user just edited (the trigger in 20260603000002 sets
    # embedding back to null on a real change). Existing cached vectors are
    # never recomputed here, so a new signup doesn't invalidate anyone else.

    # 1. Make sure the caller is embedded so the RPC has a query vector.
    ensure_embedding(db, user_id, prefs)

    # 2. Embed eligible candidates that are still null. Bounded to keep
    #    a single request cheap; whatever doesn't fit this batch gets
    #    picked up on the next /suggestions call.
    stale = (
        db.table("match_preferences")
        .select("user_id, target_intent, term_length, interests, hobbies, leisure_time, wants_in_relationship")
        .eq("target_intent", prefs.target_intent)
        .eq("term_length", prefs.term_length)
        .is_("embedding", "null")
        .neq("user_id", user_id)
        .limit(20)
        .execute()
    )
    for row in stale.data or []:
        cand_prefs = MatchPreferences(**row)
        db.table("match_preferences").update(
            {"embedding": embed_prefs(cand_prefs)}
        ).eq("user_id", row["user_id"]).execute()

    # 3. Postgres does the ranking against all cached vectors via pgvector.
    ranked = db.rpc("match_candidates", {"me": user_id, "k": 50}).execute()
    ordered = [(r["user_id"], float(r["score"])) for r in (ranked.data or [])]
    if not ordered:
        return []

    ordered_ids = [uid for uid, _ in ordered]
    profiles_q = (
        db.table("profiles")
        .select("id, email, nickname, avatar_url, gender, zodiac_sign")
        .in_("id", ordered_ids)
        .execute()
    )
    tags_q = (
        db.table("match_preferences")
        .select("user_id, interests, hobbies")
        .in_("user_id", ordered_ids)
        .execute()
    )

    by_id: dict[str, Profile] = {p["id"]: Profile(**p) for p in (profiles_q.data or [])}
    tags_by_id: dict[str, dict] = {t["user_id"]: t for t in (tags_q.data or [])}

    return [
        SuggestionResponse(
            user_id=uid,
            nickname=by_id[uid].nickname,
            avatar_url=by_id[uid].avatar_url,
            gender=by_id[uid].gender,
            zodiac_sign=by_id[uid].zodiac_sign,
            interests=(tags_by_id.get(uid) or {}).get("interests") or [],
            hobbies=(tags_by_id.get(uid) or {}).get("hobbies") or [],
            score=score,
        )
        for uid, score in ordered
        if uid in by_id
    ]
