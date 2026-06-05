"""
ALU Matchmaking — FastAPI backend.

- Owns authentication (email/password, bcrypt, JWT).
- JWTs are HS256-signed with the Supabase JWT secret so that
  Supabase Realtime + RLS (auth.uid()) accept them transparently.
- Matching engine reads hidden match_preferences with the service key.

All row shapes live in models.py — this file only wires routes.
"""
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import bcrypt
import jwt
from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    Header,
    HTTPException,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import Client, create_client

from models import (
    AuthResponse,
    LoginBody,
    MatchPreferences,
    Profile,
    PushSubscribeBody,
    PushUnsubscribeBody,
    SignupBody,
    SuggestionResponse,
)

# Web Push is optional — if pywebpush isn't installed (older deploy of
# the requirements.txt), the subscribe endpoints still work so the
# frontend doesn't error, but /push/dispatch will no-op with a 503 so
# the webhook retry logic surfaces the misconfiguration.
try:
    from pywebpush import WebPushException, webpush  # type: ignore
    _PUSH_LIB_AVAILABLE = True
except Exception:  # pragma: no cover
    webpush = None  # type: ignore
    WebPushException = Exception  # type: ignore
    _PUSH_LIB_AVAILABLE = False

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
JWT_TTL_SECONDS = int(os.environ.get("JWT_TTL_SECONDS", "604800"))  # 7 days

# Web Push (VAPID). Generate once with `npx web-push generate-vapid-keys`.
# PUBLIC key is served to the browser via /push/vapid-public-key.
# PRIVATE key signs each push; keep it server-side only.
# PUSH_WEBHOOK_SECRET gates /push/dispatch so only the Supabase database
# webhook (which adds the same header) can trigger fan-out.
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
VAPID_CONTACT_EMAIL = os.environ.get("VAPID_CONTACT_EMAIL", "").strip()
PUSH_WEBHOOK_SECRET = os.environ.get("PUSH_WEBHOOK_SECRET", "").strip()

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
        pct = min(100.0, (raw / max(1, max_raw)) * 100.0)
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


# ============================================================
# Web Push
# ============================================================
@app.get("/push/vapid-public-key")
def push_vapid_public_key():
    """Frontend fetches this on first subscribe so the key can rotate
    without a redeploy. Empty string ⇒ push isn't configured yet."""
    return {"public_key": VAPID_PUBLIC_KEY}


@app.post("/push/subscribe")
def push_subscribe(
    body: PushSubscribeBody,
    uid: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    # Endpoint is unique — upsert so re-subscribing on the same browser
    # just refreshes keys + ownership instead of creating duplicates.
    payload = {
        "user_id": uid,
        "endpoint": body.endpoint,
        "p256dh": body.p256dh,
        "auth": body.auth,
        "user_agent": (body.user_agent or "")[:300] or None,
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
    }
    db.table("push_subscriptions").upsert(payload, on_conflict="endpoint").execute()
    return {"ok": True}


@app.post("/push/unsubscribe")
def push_unsubscribe(
    body: PushUnsubscribeBody,
    uid: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    # Only delete if the caller owns this endpoint — stops a hijacked
    # token from wiping somebody else's subscriptions.
    db.table("push_subscriptions").delete().eq("endpoint", body.endpoint).eq(
        "user_id", uid
    ).execute()
    return {"ok": True}


def _payload_for_notification(record: dict) -> dict:
    """Translate a public.notifications row into the JSON shape the
    service worker's `push` handler expects."""
    session_id = record.get("session_id")
    kind = record.get("kind") or "system"
    tag = f"msg:{session_id}" if kind == "message" and session_id else f"notif:{record.get('id')}"
    return {
        "title": record.get("title") or "NextDate",
        "body": (record.get("body") or "")[:200],
        "icon": "./icon.svg",
        "badge": "./icon.svg",
        "tag": tag,
        "data": {
            "sessionId": session_id,
            "view": "chats" if session_id else "notifications",
            "url": "./",
        },
    }


def _send_one_push(sub: dict, payload: dict, db: Client) -> None:
    """Send a single push; clean up the row if the endpoint is gone."""
    if not _PUSH_LIB_AVAILABLE:
        return
    try:
        webpush(
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
            },
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{VAPID_CONTACT_EMAIL or 'admin@example.com'}"},
            ttl=86400,
        )
    except WebPushException as exc:  # type: ignore[misc]
        status = getattr(getattr(exc, "response", None), "status_code", None)
        # 404 / 410: subscription has been unsubscribed or expired —
        # drop it so we stop trying. Anything else just logs.
        if status in (404, 410):
            try:
                db.table("push_subscriptions").delete().eq("endpoint", sub["endpoint"]).execute()
            except Exception as drop_err:
                print(f"[push] failed to drop stale endpoint: {drop_err}")
        else:
            print(f"[push] send failed ({status}): {exc}")
    except Exception as exc:  # pragma: no cover
        print(f"[push] unexpected error: {exc}")


def _fanout_push(user_id: str, payload: dict, db: Client) -> None:
    rows = (
        db.table("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", user_id)
        .execute()
    )
    for sub in rows.data or []:
        _send_one_push(sub, payload, db)


@app.post("/push/dispatch")
async def push_dispatch(
    request: Request,
    background: BackgroundTasks,
    x_webhook_secret: Optional[str] = Header(default=None),
    db: Client = Depends(require_admin),
):
    """Receive a Supabase Database Webhook fired on
    public.notifications INSERT and fan out a Web Push to every
    subscription owned by the recipient.

    The webhook must be configured in Supabase Dashboard with header
    `X-Webhook-Secret: <PUSH_WEBHOOK_SECRET>` so we can be sure the
    request isn't coming from an attacker.
    """
    if not PUSH_WEBHOOK_SECRET or x_webhook_secret != PUSH_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Bad webhook secret.")
    if not (_PUSH_LIB_AVAILABLE and VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY):
        # Acknowledge so Supabase doesn't keep retrying, but signal
        # via 503 in logs that the deploy is missing config.
        raise HTTPException(status_code=503, detail="Push not configured.")

    body = await request.json()
    record = body.get("record") or {}
    user_id = record.get("user_id")
    if not user_id:
        return {"ok": True, "skipped": "no user_id"}

    payload = _payload_for_notification(record)
    # Don't block the webhook on the actual HTTP fan-out — Supabase
    # will time us out if we sit here for several seconds.
    background.add_task(_fanout_push, user_id, payload, db)
    return {"ok": True}
