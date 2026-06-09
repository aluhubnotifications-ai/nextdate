-- One-time-use tokens for the "forgot password" flow.
-- The backend (service key) owns this table entirely — no RLS needed.
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    token       TEXT        PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
