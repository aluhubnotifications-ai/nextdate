"""
ALU Matchmaking — FastAPI backend.

- Owns authentication (email/password, bcrypt, JWT).
- JWTs are HS256-signed with the Supabase JWT secret so that
  Supabase Realtime + RLS (auth.uid()) accept them transparently.
- Matching engine reads hidden match_preferences with the service key.

All row shapes live in models.py — this file only wires routes.
"""
import math
import os
import re
import time
import uuid
from collections import Counter
from typing import List, Optional

import bcrypt
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import Client, create_client

from models import (
    AuthResponse,
    LoginBody,
    Profile,
    SignupBody,
    SuggestionResponse,
)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
JWT_TTL_SECONDS = int(os.environ.get("JWT_TTL_SECONDS", "604800"))  # 7 days

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


# ---------- routes ----------
@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/auth/signup", response_model=AuthResponse)
def signup(body: SignupBody, db: Client = Depends(require_admin)):
    email = body.email.lower()
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


@app.delete("/auth/me")
def delete_me(uid: str = Depends(caller_id), db: Client = Depends(require_admin)):
    """Hard-delete the caller's account. public.users → ON DELETE CASCADE
    on every dependent table (profiles, match_preferences, likes,
    chat_sessions, messages, notifications, …) so a single delete
    here wipes the user from the entire app."""
    db.table("users").delete().eq("id", uid).execute()
    return {"ok": True}


# ---------- TF-IDF cosine matching ----------
# We score candidates by lexical similarity over a flat "profile document"
# built from each user's interests + hobbies + the two free-text fields
# (leisure_time, wants_in_relationship). IDF is computed per request over
# the live candidate pool so common words ("the", "coffee") get downweighted
# automatically — no hardcoded stopword list, no model weights to ship.
_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _doc_tokens(row: dict) -> list[str]:
    """Bag-of-words for a single user's preferences row."""
    if not row:
        return []
    parts: list[str] = []
    parts.extend(row.get("interests") or [])
    parts.extend(row.get("hobbies") or [])
    if row.get("leisure_time"):
        parts.append(row["leisure_time"])
    if row.get("wants_in_relationship"):
        parts.append(row["wants_in_relationship"])
    return _TOKEN_RE.findall(" ".join(parts).lower())


def _tfidf_cosine(a_tokens: list[str], b_tokens: list[str], idf: dict[str, float]) -> float:
    if not a_tokens or not b_tokens:
        return 0.0
    a_tf = Counter(a_tokens)
    b_tf = Counter(b_tokens)
    a_len = float(len(a_tokens))
    b_len = float(len(b_tokens))
    a_vec = {t: (c / a_len) * idf.get(t, 0.0) for t, c in a_tf.items()}
    b_vec = {t: (c / b_len) * idf.get(t, 0.0) for t, c in b_tf.items()}
    shared = a_vec.keys() & b_vec.keys()
    dot = sum(a_vec[t] * b_vec[t] for t in shared)
    a_norm = math.sqrt(sum(v * v for v in a_vec.values()))
    b_norm = math.sqrt(sum(v * v for v in b_vec.values()))
    if a_norm == 0.0 or b_norm == 0.0:
        return 0.0
    return dot / (a_norm * b_norm)


@app.get("/suggestions/{user_id}", response_model=List[SuggestionResponse])
def get_curated_suggestions(
    user_id: str,
    passed: List[str] = Query(default_factory=list),
    me: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    if user_id != me:
        raise HTTPException(status_code=403, detail="Forbidden.")

    pref_cols = "user_id, target_intent, term_length, interests, hobbies, leisure_time, wants_in_relationship"

    my_pref_q = (
        db.table("match_preferences")
        .select(pref_cols)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    # Brand-new users may not have preferences yet. Don't 404 — fall back
    # to a blank prefs object so the discovery deck still populates with
    # every other user (just unranked).
    my_pref = my_pref_q.data[0] if my_pref_q.data else None

    # Always pull the whole pool of other users with preferences. Intent
    # and term used to be hard filters, but that meant a new user picking
    # a niche combo (e.g. "Friendships / Short-term") saw "Check back
    # soon" until somebody else picked exactly the same combo. Now they
    # contribute scoring bonuses instead, and everyone is a candidate.
    candidates_q = (
        db.table("match_preferences")
        .select(pref_cols)
        .execute()
    )

    rows = [r for r in (candidates_q.data or []) if r["user_id"] != user_id]

    # If nobody has filled in preferences yet (or the caller hasn't), make
    # sure we still surface every other profile so Discover is never empty.
    profile_ids_with_prefs = {r["user_id"] for r in rows}
    extra_profiles_q = (
        db.table("profiles")
        .select("id")
        .neq("id", user_id)
        .execute()
    )
    for p in extra_profiles_q.data or []:
        if p["id"] not in profile_ids_with_prefs:
            rows.append({
                "user_id": p["id"], "interests": [], "hobbies": [],
                "leisure_time": None, "wants_in_relationship": None,
                "target_intent": None, "term_length": None,
            })

    if not rows:
        return []

    # Build the per-request IDF table from every candidate doc plus mine.
    # IDF = ln((N + 1) / (df + 1)) + 1, the standard smoothed form.
    my_tokens = _doc_tokens(my_pref or {})
    cand_tokens: dict[str, list[str]] = {r["user_id"]: _doc_tokens(r) for r in rows}
    all_docs = [my_tokens] + list(cand_tokens.values())
    df: Counter = Counter()
    for toks in all_docs:
        for term in set(toks):
            df[term] += 1
    N = len(all_docs)
    idf = {t: math.log((N + 1) / (cnt + 1)) + 1.0 for t, cnt in df.items()}

    my_intent = (my_pref or {}).get("target_intent")
    my_term = (my_pref or {}).get("term_length")
    passed_set = set(passed or [])

    # Composite: 70% lexical similarity, 20% intent match, 10% term match.
    # Previously-passed users still get scored and ranked against each
    # other, but they're forced to the bottom of the deck — the caller
    # sees every fresh face first and only re-encounters past passes
    # once they've gone through everyone new.
    scored: list[tuple[int, float, str]] = []
    for r in rows:
        uid = r["user_id"]
        sim = _tfidf_cosine(my_tokens, cand_tokens[uid], idf)
        intent_bonus = 1.0 if my_intent and r.get("target_intent") == my_intent else 0.0
        term_bonus = 1.0 if my_term and r.get("term_length") == my_term else 0.0
        score = 70.0 * sim + 20.0 * intent_bonus + 10.0 * term_bonus
        is_passed = 1 if uid in passed_set else 0
        scored.append((is_passed, round(score, 1), uid))

    # Two-tier sort: non-passed (0) above passed (1); within each tier,
    # higher score first.
    scored.sort(key=lambda x: (x[0], -x[1]))
    ordered = [(uid, s) for _, s, uid in scored]
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
