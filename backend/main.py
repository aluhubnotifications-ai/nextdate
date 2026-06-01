"""
ALU Matchmaking — FastAPI matching engine (Render deployment target).

Reads hidden match_preferences with the Supabase service role key, scores
candidates, and returns ONLY the public profile fields permitted by the
brief (Section 3). Verifies the caller's JWT and refuses to compute
suggestions for any user other than the token holder.
"""
import os
from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client, create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    # Allow boot in dev without env so /healthz still works.
    print("[warn] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — matching endpoints will 500.")

admin: Optional[Client] = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    if SUPABASE_URL and SUPABASE_SERVICE_KEY
    else None
)

app = FastAPI(title="ALU Matchmaking — Matching Engine")

# Cloudflare Pages frontend lives on a different origin.
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "*",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SuggestionResponse(BaseModel):
    user_id: str
    nickname: str
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    zodiac_sign: Optional[str] = None
    score: int = 0


def require_admin() -> Client:
    if admin is None:
        raise HTTPException(status_code=500, detail="Backend not configured.")
    return admin


def caller_id(authorization: Optional[str] = Header(default=None)) -> str:
    """Resolve the caller's auth.users.id from the bearer JWT."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.split(" ", 1)[1].strip()

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Auth verifier not configured.")

    verifier: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    try:
        user_resp = verifier.auth.get_user(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc

    user = getattr(user_resp, "user", None)
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="Invalid token.")
    return user.id


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/suggestions/{user_id}", response_model=List[SuggestionResponse])
def get_curated_suggestions(
    user_id: str,
    me: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    # A user may only compute suggestions for themselves.
    if user_id != me:
        raise HTTPException(status_code=403, detail="Forbidden.")

    pref = (
        db.table("match_preferences")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not pref.data:
        raise HTTPException(status_code=404, detail="Preferences unconfigured.")

    prefs = pref.data

    candidates_q = (
        db.table("match_preferences")
        .select("user_id, interests, hobbies, leisure_time, wants_in_relationship")
        .eq("target_intent", prefs["target_intent"])
        .eq("term_length", prefs["term_length"])
        .execute()
    )

    rows = [r for r in (candidates_q.data or []) if r["user_id"] != user_id]
    if not rows:
        return []

    my_interests = set(prefs.get("interests") or [])
    my_hobbies = set(prefs.get("hobbies") or [])

    scored = []
    for r in rows:
        score = 0
        score += 2 * len(my_interests.intersection(set(r.get("interests") or [])))
        score += 1 * len(my_hobbies.intersection(set(r.get("hobbies") or [])))
        scored.append((score, r["user_id"]))

    scored.sort(key=lambda x: x[0], reverse=True)
    ordered_ids = [uid for _, uid in scored]

    profiles_q = (
        db.table("profiles")
        .select("id, nickname, avatar_url, gender, zodiac_sign")
        .in_("id", ordered_ids)
        .execute()
    )

    by_id = {p["id"]: p for p in (profiles_q.data or [])}
    score_by_id = {uid: s for s, uid in scored}

    return [
        SuggestionResponse(
            user_id=uid,
            nickname=by_id[uid].get("nickname") or "Anonymous",
            avatar_url=by_id[uid].get("avatar_url"),
            gender=by_id[uid].get("gender"),
            zodiac_sign=by_id[uid].get("zodiac_sign"),
            score=score_by_id.get(uid, 0),
        )
        for uid in ordered_ids
        if uid in by_id
    ]
