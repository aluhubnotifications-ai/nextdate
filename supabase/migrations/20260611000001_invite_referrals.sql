-- Viral invite → reveal-a-like loop.
-- The Likes tab promises "invite 3 friends to reveal 1 like"; this adds
-- the pieces that make it real:
--   * invitations table (crush emails — previously only documented in a
--     commit message, so IF NOT EXISTS keeps already-patched DBs happy)
--   * users.invited_by — set at signup from an inv:<uuid> share link or
--     the most recent crush invitation matching the signup email.
--     GET /referrals/stats counts these rows; the frontend unblurs one
--     liker tile per 3 credited signups.

CREATE TABLE IF NOT EXISTS public.invitations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id    UUID        REFERENCES public.users(id) ON DELETE CASCADE,
    invited_email TEXT        NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invitations_inviter_created_at
    ON public.invitations(inviter_id, created_at);
CREATE INDEX IF NOT EXISTS invitations_invited_email
    ON public.invitations(invited_email);

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS users_invited_by ON public.users(invited_by);
