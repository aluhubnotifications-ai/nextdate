"""
Typed models for every row the backend touches.

We use Pydantic (not an ORM) because the data layer is supabase-py over
PostgREST. These models give us static types, validation on the wire,
and a single source of truth for what each table looks like.

Mirror order matches supabase/migrations/20260601000001_initial.sql.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

TargetIntent = Literal["Friendships", "Dates", "Relationship"]
TermLength = Literal["Long-term", "Short-term"]


# ---------- public.users ----------
class User(BaseModel):
    id: str
    email: EmailStr
    created_at: Optional[datetime] = None
    # password_hash intentionally omitted — never serialize it.


class UserRecord(User):
    """Server-side variant including the password hash. Never return this."""
    password_hash: str


# ---------- public.profiles ----------
class Profile(BaseModel):
    id: str
    email: EmailStr
    nickname: str
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    zodiac_sign: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------- public.match_preferences ----------
class MatchPreferences(BaseModel):
    user_id: str
    target_intent: TargetIntent
    interests: List[str] = Field(default_factory=list)
    hobbies: List[str] = Field(default_factory=list)
    leisure_time: Optional[str] = None
    wants_in_relationship: Optional[str] = None
    term_length: TermLength
    updated_at: Optional[datetime] = None


# ---------- public.private_identities ----------
class PrivateIdentity(BaseModel):
    user_id: str
    real_name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=16, le=99)
    country: Optional[str] = None
    cohort: Optional[str] = None
    profile_picture: Optional[str] = None
    updated_at: Optional[datetime] = None


# ---------- public.chat_sessions ----------
class ChatSession(BaseModel):
    id: str
    user_a: str
    user_b: str
    user_a_approved_reveal: bool = False
    user_b_approved_reveal: bool = False
    created_at: Optional[datetime] = None

    @property
    def fully_revealed(self) -> bool:
        return self.user_a_approved_reveal and self.user_b_approved_reveal


# ---------- public.messages ----------
class Message(BaseModel):
    id: str
    session_id: str
    sender_id: str
    body: str
    created_at: Optional[datetime] = None


# ============================================================
# API request / response shapes
# ============================================================
class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user_id: str
    email: EmailStr
    token: str
    expires_in: int


class SuggestionResponse(BaseModel):
    user_id: str
    nickname: str
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    zodiac_sign: Optional[str] = None
    interests: List[str] = Field(default_factory=list)
    hobbies: List[str] = Field(default_factory=list)
    score: float = 0.0


# ---------- Web Push ----------
class PushSubscribeBody(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    user_agent: Optional[str] = None


class PushUnsubscribeBody(BaseModel):
    endpoint: str
