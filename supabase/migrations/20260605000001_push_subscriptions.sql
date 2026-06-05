-- ============================================================
-- Web Push subscriptions.
--
-- One row per (user, device/browser). Populated by the backend's
-- POST /push/subscribe after the user grants Notification permission
-- and the browser hands us a PushSubscription. Deleted on
-- /push/unsubscribe (Profile toggle off) or when the backend's
-- /push/dispatch handler discovers the endpoint is gone (HTTP 404/410
-- from the push service).
--
-- A Supabase Database Webhook on public.notifications INSERT calls the
-- backend's /push/dispatch, which looks up the recipient's
-- subscriptions here and POSTs a VAPID-signed message to each.
-- Inserts/updates/deletes happen only from the backend (service
-- role), but we still enable RLS so a leaked anon key can't list
-- everyone's endpoints.
-- ============================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Owner can read their own rows (used by the Profile toggle so it can
-- tell the user whether this device is already subscribed). All writes
-- go through the backend with the service key, so no insert/update/
-- delete policy is granted to authenticated.
drop policy if exists "push_self_select" on public.push_subscriptions;
create policy "push_self_select"
  on public.push_subscriptions for select
  to authenticated using (auth.uid() = user_id);
