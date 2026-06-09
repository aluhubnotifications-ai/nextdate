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
import secrets
import time
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import httpx

import bcrypt
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import Client, create_client

from models import (
    AuthResponse,
    ForgotPasswordBody,
    LoginBody,
    Profile,
    ResetPasswordBody,
    SignupBody,
    SuggestionResponse,
)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
JWT_TTL_SECONDS = int(os.environ.get("JWT_TTL_SECONDS", "604800"))  # 7 days

if not (SUPABASE_URL and SUPABASE_SERVICE_KEY and SUPABASE_JWT_SECRET):
    print("[warn] SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_JWT_SECRET not all set — auth + matching will 500.")
if not SUPABASE_ANON_KEY:
    print("[warn] SUPABASE_ANON_KEY not set — frontend config endpoint will fail.")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM     = os.environ.get("EMAIL_FROM", "NextDate <onboarding@resend.dev>")
APP_URL        = os.environ.get("APP_URL", "https://nextdate.pages.dev")

RESET_TOKEN_TTL_SECONDS = 3600  # 1 hour


def send_reset_email(to_email: str, token: str) -> None:
    reset_url = f"{APP_URL}?token={token}"

    if not RESEND_API_KEY:
        print("[RESET] No RESEND_API_KEY set — use this link to reset manually:")
        print(f"[RESET] {reset_url}")
        return

    text = (
        f"Hi,\n\nReset your NextDate password here: {reset_url}\n\n"
        "This link expires in 1 hour. If you didn't request this, ignore this email."
    )
    html = f"""
<p>Hi,</p>
<p>You requested a password reset for your NextDate account.</p>
<p>
  <a href="{reset_url}"
     style="background:#FF3D6E;color:#fff;padding:12px 24px;border-radius:8px;
            text-decoration:none;font-weight:600;display:inline-block;">
    Reset password
  </a>
</p>
<p style="word-break:break-all;">Or copy this link: {reset_url}</p>
<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
"""

    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={"from": EMAIL_FROM, "to": [to_email], "subject": "Reset your NextDate password", "html": html, "text": text},
        timeout=10,
    )
    if not resp.is_success:
        print(f"[RESET] Resend {resp.status_code}: {resp.text}")
        resp.raise_for_status()

def _build_admin_client() -> Optional[Client]:
    if not (SUPABASE_URL and SUPABASE_SERVICE_KEY):
        return None
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# We intentionally do NOT cache a module-level Supabase client. The
# Supabase Python SDK opens an HTTP/2 connection to PostgREST and reuses
# it for the lifetime of the process; on Render's free tier the container
# idles and the upstream silently closes the connection, so the next
# request fails with `httpcore.RemoteProtocolError: Server disconnected`.
# Building a fresh client per request gives each call a clean httpx pool,
# which avoids the stale-connection race entirely. Construction is ~5 ms.

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
    client = _build_admin_client()
    if client is None:
        raise HTTPException(status_code=500, detail="Backend not configured.")
    return client


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


@app.get("/config")
def config():
    """Return frontend config (Supabase URL / anon key, backend URL).
    Unauthenticated so the frontend can load it before the user logs in.
    The Supabase anon key is public by design (it's a client key), but
    it's never hardcoded in the frontend source code — it comes from
    backend environment variables instead."""
    if not SUPABASE_URL:
        return {"error": "Backend not configured. Set SUPABASE_URL in environment."}
    return {
        "supabase_url": SUPABASE_URL,
        "supabase_anon_key": SUPABASE_ANON_KEY,
        "backend_url": os.environ.get("BACKEND_URL", "https://nextdate-5may.onrender.com"),
    }


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


@app.post("/auth/forgot-password")
def forgot_password(body: ForgotPasswordBody, db: Client = Depends(require_admin)):
    email = body.email.lower()
    rows = db.table("users").select("id").eq("email", email).limit(1).execute()

    # Always return 200 — never reveal whether an email is registered.
    if not rows.data:
        return {"ok": True}

    user_id = rows.data[0]["id"]
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=RESET_TOKEN_TTL_SECONDS)).isoformat()

    db.table("password_reset_tokens").insert({
        "token": token,
        "user_id": user_id,
        "expires_at": expires_at,
    }).execute()

    try:
        send_reset_email(email, token)
    except Exception as exc:
        print(f"[error] Reset email failed for {email}: {exc}")

    return {"ok": True}


@app.post("/auth/reset-password")
def reset_password(body: ResetPasswordBody, db: Client = Depends(require_admin)):
    rows = db.table("password_reset_tokens").select("*").eq("token", body.token).limit(1).execute()
    if not rows.data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")

    record = rows.data[0]
    expires_at_str = record["expires_at"]
    # Supabase returns timestamps with "+00:00" or "Z" suffix.
    if expires_at_str.endswith("Z"):
        expires_at_str = expires_at_str[:-1] + "+00:00"
    expires_at = datetime.fromisoformat(expires_at_str)
    if datetime.now(timezone.utc) > expires_at:
        db.table("password_reset_tokens").delete().eq("token", body.token).execute()
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    db.table("users").update({"password_hash": hash_password(body.password)}).eq("id", record["user_id"]).execute()
    db.table("password_reset_tokens").delete().eq("token", body.token).execute()
    return {"ok": True}


# ---------- admin ----------
def require_admin_caller(uid: str, db: Client) -> None:
    """Authorize the caller as an admin or raise 403. Used by every
    /admin/* endpoint — the service key bypasses RLS so we can't rely
    on the database to enforce this for us."""
    rows = db.table("profiles").select("is_admin").eq("id", uid).limit(1).execute()
    if not rows.data or not rows.data[0].get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only.")


@app.get("/admin/users")
def admin_list_users(
    uid: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    """All accounts, joined with their profile + private identity + prefs.
    The dashboard renders one row per user with a delete button."""
    require_admin_caller(uid, db)
    profiles = db.table("profiles").select(
        "id, email, nickname, avatar_url, gender, zodiac_sign, is_admin, created_at"
    ).order("created_at", desc=True).execute()
    priv = db.table("private_identities").select(
        "user_id, real_name, age, country, cohort"
    ).execute()
    prefs = db.table("match_preferences").select(
        "user_id, target_intent, term_length, interests, hobbies"
    ).execute()
    priv_by_id = {r["user_id"]: r for r in priv.data or []}
    prefs_by_id = {r["user_id"]: r for r in prefs.data or []}
    return [
        {
            **p,
            "private": priv_by_id.get(p["id"]),
            "prefs": prefs_by_id.get(p["id"]),
        }
        for p in profiles.data or []
    ]


@app.delete("/admin/users/{target_id}")
def admin_delete_user(
    target_id: str,
    uid: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    """Hard-delete the target account. Refuses if the target is the caller
    (admin must delete themselves via /auth/me) or another admin (so two
    admins can't accidentally kick each other out)."""
    require_admin_caller(uid, db)
    if target_id == uid:
        raise HTTPException(status_code=400, detail="Use /auth/me to delete your own account.")
    target_profile = (
        db.table("profiles").select("is_admin").eq("id", target_id).limit(1).execute()
    )
    if target_profile.data and target_profile.data[0].get("is_admin"):
        raise HTTPException(status_code=400, detail="Can't delete another admin from the dashboard.")
    db.table("users").delete().eq("id", target_id).execute()
    return {"ok": True}


@app.get("/admin/emails")
def admin_list_emails(
    uid: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    """The admin-email allowlist. Anyone who signs up with one of these
    addresses is auto-promoted by the profiles trigger."""
    require_admin_caller(uid, db)
    rows = db.table("admin_emails").select("*").order("added_at", desc=True).execute()
    return rows.data or []


@app.post("/admin/emails")
def admin_add_email(
    body: dict = None,
    uid: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    """Add an email to the allowlist. Backfills is_admin for any
    existing profile that already uses this address — they don't have
    to log out + back in to gain access."""
    require_admin_caller(uid, db)
    email = ((body or {}).get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Provide a valid email.")
    db.table("admin_emails").upsert({"email": email, "added_by": uid}).execute()
    db.table("profiles").update({"is_admin": True}).eq("email", email).execute()
    return {"ok": True, "email": email}


@app.delete("/admin/emails/{email}")
def admin_remove_email(
    email: str,
    uid: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    """Remove an email from the allowlist and demote any matching
    profile in the same step. Refuses to remove the caller's own email
    so you can't accidentally lock yourself out."""
    require_admin_caller(uid, db)
    email = email.strip().lower()
    me = db.table("users").select("email").eq("id", uid).limit(1).execute()
    my_email = (me.data[0].get("email") or "").lower() if me.data else ""
    if email == my_email:
        raise HTTPException(status_code=400, detail="You can't remove your own email from the allowlist.")
    db.table("admin_emails").delete().eq("email", email).execute()
    db.table("profiles").update({"is_admin": False}).eq("email", email).execute()
    return {"ok": True, "email": email}


@app.get("/admin/reports")
def admin_list_reports(
    status: Optional[str] = None,
    uid: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    """Reports queue. Filter by status=open / resolved / dismissed; default
    returns everything, newest first."""
    require_admin_caller(uid, db)
    q = db.table("reports").select("*").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    reports = q.execute()
    rows = reports.data or []
    user_ids = list({r["reporter_id"] for r in rows} | {r["reported_id"] for r in rows})
    nicknames: dict[str, dict] = {}
    if user_ids:
        prof = db.table("profiles").select("id, nickname, email").in_("id", user_ids).execute()
        nicknames = {p["id"]: p for p in prof.data or []}
    return [
        {
            **r,
            "reporter": nicknames.get(r["reporter_id"]),
            "reported": nicknames.get(r["reported_id"]),
        }
        for r in rows
    ]


@app.post("/admin/reports/{report_id}/resolve")
def admin_resolve_report(
    report_id: str,
    body: dict = None,
    uid: str = Depends(caller_id),
    db: Client = Depends(require_admin),
):
    """Mark a report resolved or dismissed."""
    require_admin_caller(uid, db)
    new_status = (body or {}).get("status", "resolved")
    if new_status not in ("resolved", "dismissed", "open"):
        raise HTTPException(status_code=400, detail="status must be open / resolved / dismissed.")
    now_iso = datetime.now(timezone.utc).isoformat()
    db.table("reports").update({
        "status": new_status,
        "resolved_at": None if new_status == "open" else now_iso,
        "resolved_by": None if new_status == "open" else uid,
    }).eq("id", report_id).execute()
    return {"ok": True, "status": new_status}


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

    # Opposite-sex gender filter. Men see Women, Women see Men. The
    # only wildcard is "Prefer not to say" (stored as NULL/empty) — those
    # users see everyone and everyone sees them. Any legacy rows still
    # carrying "Non-binary" or "Other" from a previous version of the
    # signup form will not match anyone until the user edits their
    # profile and picks Woman, Man, or Prefer not to say.
    my_profile_q = (
        db.table("profiles")
        .select("gender")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    my_gender = (my_profile_q.data[0].get("gender") if my_profile_q.data else None) or None
    WILDCARD_GENDERS = {None, ""}
    if my_gender == "Man":
        allowed_genders: set | None = {"Woman"} | WILDCARD_GENDERS
    elif my_gender == "Woman":
        allowed_genders = {"Man"} | WILDCARD_GENDERS
    elif my_gender in WILDCARD_GENDERS:
        allowed_genders = None  # wildcard viewer — see everyone
    else:
        # Legacy non-binary/other accounts: only match the wildcard pool.
        allowed_genders = set(WILDCARD_GENDERS)

    # Build the gender map for every other profile in one shot so we can
    # filter both candidate sources (match_preferences rows and the
    # prefs-less profile fallback) against `allowed_genders`.
    all_profiles_q = (
        db.table("profiles")
        .select("id, gender")
        .neq("id", user_id)
        .execute()
    )
    gender_by_id: dict[str, str | None] = {
        p["id"]: (p.get("gender") or None) for p in (all_profiles_q.data or [])
    }
    def _is_visible(uid: str) -> bool:
        if allowed_genders is None:
            return True
        # Unknown profile (e.g. just-deleted) — keep it; the later
        # profile join will drop it if it really is gone.
        if uid not in gender_by_id:
            return True
        return gender_by_id[uid] in allowed_genders

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

    rows = [
        r for r in (candidates_q.data or [])
        if r["user_id"] != user_id and _is_visible(r["user_id"])
    ]

    # If nobody has filled in preferences yet (or the caller hasn't), make
    # sure we still surface every other profile so Discover is never empty.
    profile_ids_with_prefs = {r["user_id"] for r in rows}
    for pid, _ in gender_by_id.items():
        if pid in profile_ids_with_prefs:
            continue
        if not _is_visible(pid):
            continue
        rows.append({
            "user_id": pid, "interests": [], "hobbies": [],
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
