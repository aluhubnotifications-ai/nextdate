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
    # Brand-new users may not have preferences yet. Don't 404 — fall back
    # to a blank prefs object so the discovery deck still populates with
    # every other user (just unranked).
    prefs = MatchPreferences(**pref_rows.data[0]) if pref_rows.data else None

    # Always pull the whole pool of other users with preferences. Intent
    # and term used to be hard filters, but that meant a new user picking
    # a niche combo (e.g. "Friendships / Short-term") saw "Check back
    # soon" until somebody else picked exactly the same combo. Now they
    # contribute scoring bonuses instead, and everyone is a candidate.
    candidates_q = (
        db.table("match_preferences")
        .select("user_id, target_intent, term_length, interests, hobbies")
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
            rows.append({"user_id": p["id"], "interests": [], "hobbies": [],
                         "target_intent": None, "term_length": None})

    if not rows:
        return []

    my_interests = set(prefs.interests) if prefs else set()
    my_hobbies = set(prefs.hobbies) if prefs else set()
    my_intent = prefs.target_intent if prefs else None
    my_term = prefs.term_length if prefs else None

    # Scoring weights (raw points): interest overlap 2x, hobby overlap 1x,
    # intent match adds a flat 4-pt bonus, term match adds 2. We compute
    # the theoretical max for normalization so the returned percentage is
    # stable across users with different numbers of tags filled in.
    max_overlap = 2 * len(my_interests) + len(my_hobbies)
    max_raw = max_overlap + 4 + 2 if max_overlap or my_intent or my_term else 1

    scored: list[tuple[float, str]] = []
    for r in rows:
        common_i = len(my_interests.intersection(set(r.get("interests") or [])))
        common_h = len(my_hobbies.intersection(set(r.get("hobbies") or [])))
        intent_bonus = 4 if my_intent and r.get("target_intent") == my_intent else 0
        term_bonus = 2 if my_term and r.get("term_length") == my_term else 0
        raw = 2 * common_i + common_h + intent_bonus + term_bonus
        pct = (raw / max_raw) * 100.0
        scored.append((round(pct, 1), r["user_id"]))

    scored.sort(key=lambda x: x[0], reverse=True)
    ordered = [(uid, s) for s, uid in scored]
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
