-- Promoter / referral campaign tracking.
-- Admin creates campaigns; each gets a unique slug used in share links.
-- When someone signs up via ?ref=<slug>, their users row stores the slug.

CREATE TABLE IF NOT EXISTS public.campaigns (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT        NOT NULL UNIQUE,
    name        TEXT        NOT NULL,
    created_by  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ref_campaign TEXT;
