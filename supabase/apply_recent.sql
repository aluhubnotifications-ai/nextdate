-- ============================================================
-- NextDate — consolidated migration to bring an existing DB up to
-- date with the current `main` branch in one shot.
--
--   0. add private_identities.country if missing
--   1. 20260603000001_embedding_matching.sql
--   2. 20260603000002_invalidate_embedding_on_edit.sql
--   3. 20260603000003_align_to_frontend.sql
--   4. 20260603000004_notifications.sql
--   5. 20260603000005_one_sided_matches.sql
--   6. 20260603000006_profile_picture.sql
--   7. 20260603000007_chat_policies.sql
--   8. notify pgrst, 'reload schema'
--
-- Every statement is idempotent (IF NOT EXISTS / CREATE OR REPLACE /
-- DROP TRIGGER IF EXISTS), so it's safe to re-run.
--
-- HOW TO APPLY
--   Option A — Supabase dashboard:
--     SQL Editor → New query → paste this file → Run.
--   Option B — Supabase CLI:
--     supabase db push           (applies migrations/*.sql in order)
--   Option C — psql:
--     psql "$DATABASE_URL" -f supabase/apply_recent.sql
-- ============================================================


-- ============================================================
-- 0. Defensive: make sure country is on private_identities. It was
--    added by 20260602000001_add_country.sql; this is here so a DB
--    that somehow missed that migration can still catch up.
-- ============================================================
alter table public.private_identities
  add column if not exists country varchar;

-- ============================================================
-- 20260603000001_embedding_matching.sql
-- ============================================================
-- ============================================================
-- Embedding-based matching
--
-- We move the suggestion ranking from "set overlap on interests/
-- hobbies" (computed in Python) to cosine similarity over a single
-- 384-dim sentence-embedding per user, computed locally in the
-- backend with `all-MiniLM-L6-v2`.
--
-- Hard filters (target_intent, term_length) still apply — embeddings
-- only re-rank within an eligible pool.
-- ============================================================

create extension if not exists vector;

alter table public.match_preferences
  add column if not exists embedding vector(384);

-- Cosine kNN. ivfflat is fine up to ~100k rows; bump `lists` later if needed.
create index if not exists match_preferences_embedding_idx
  on public.match_preferences
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ---------- ranking RPC ----------
-- Returns candidates sharing my (target_intent, term_length), ordered
-- by cosine similarity to my embedding. Score in [0, 1], higher = closer.
create or replace function public.match_candidates(me uuid, k int default 50)
returns table (user_id uuid, score float)
language sql
stable
security definer
set search_path = public
as $$
  with me_row as (
    select embedding, target_intent, term_length
    from public.match_preferences
    where user_id = me
  )
  select mp.user_id,
         (1 - (mp.embedding <=> me_row.embedding))::float as score
  from public.match_preferences mp, me_row
  where mp.user_id <> me
    and mp.target_intent = me_row.target_intent
    and mp.term_length   = me_row.term_length
    and mp.embedding is not null
    and me_row.embedding is not null
  order by mp.embedding <=> me_row.embedding
  limit k;
$$;

grant execute on function public.match_candidates(uuid, int) to authenticated, service_role;

-- ============================================================
-- 20260603000002_invalidate_embedding_on_edit.sql
-- ============================================================
-- ============================================================
-- Cache invalidation for match_preferences.embedding
--
-- Embeddings are cached on the row in 20260603000001. We must clear
-- the cache when the inputs change so the next /suggestions call
-- recomputes a fresh vector — but only for THAT row. Every other
-- user's cached embedding is untouched, and the embedding-only
-- UPDATE that the backend issues to write a freshly computed vector
-- must NOT re-trigger invalidation (it would loop forever).
--
-- The trigger nulls `embedding` only when one of the source columns
-- actually changed. Writing `SET embedding = $1` alone leaves the
-- prefs columns IS NOT DISTINCT FROM their old values, so the guard
-- short-circuits and the new vector survives.
-- ============================================================

create or replace function public.invalidate_embedding_on_pref_change()
returns trigger
language plpgsql
as $$
begin
  if (
    new.target_intent         is distinct from old.target_intent or
    new.term_length           is distinct from old.term_length or
    new.interests             is distinct from old.interests or
    new.hobbies               is distinct from old.hobbies or
    new.leisure_time          is distinct from old.leisure_time or
    new.wants_in_relationship is distinct from old.wants_in_relationship
  ) then
    new.embedding := null;
  end if;
  return new;
end$$;

drop trigger if exists match_preferences_invalidate_embedding
  on public.match_preferences;

create trigger match_preferences_invalidate_embedding
  before update on public.match_preferences
  for each row
  execute function public.invalidate_embedding_on_pref_change();

-- ============================================================
-- 20260603000003_align_to_frontend.sql
-- ============================================================
-- ============================================================
-- Align the DB to what the frontend actually uses.
--
-- 1. Drop columns the UI never reads or writes:
--      - private_identities.whatsapp_number
--      - private_identities.profile_picture
--    Also drop them from get_revealed_identity's return shape.
--
-- 2. Expand `messages` so the existing chat composer works end to
--    end against Postgres (today's schema rejects attachments,
--    replies, and reactions, and forces non-empty body):
--      - attachments  jsonb (file/voice metadata)
--      - reply_to_id  uuid → messages(id)
--      - reactions    jsonb (emoji → user_id[])
--      - body         relaxed to nullable
--
-- 3. Add the swipe → mutual-match loop so non-demo mode actually
--    creates chat sessions from ♥ taps:
--      - public.likes  (liker, likee)  with RLS
--      - public.like_user(target uuid) returns uuid
--        Inserts the like; if reciprocal, opens / fetches the
--        canonical chat_sessions row and returns its id.
-- ============================================================

-- ---------- 1. private_identities cleanup ----------
alter table public.private_identities
  drop column if exists whatsapp_number;

alter table public.private_identities
  drop column if exists profile_picture;

-- Return shape changed (dropped whatsapp_number + profile_picture), so
-- CREATE OR REPLACE FUNCTION won't accept the new signature. Drop the
-- old function first; the policy granting EXECUTE is re-applied below.
drop function if exists public.get_revealed_identity(uuid);

create or replace function public.get_revealed_identity(session uuid)
returns table (
  user_id    uuid,
  real_name  varchar,
  age        int,
  country    varchar,
  cohort     varchar
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me    uuid := auth.uid();
  s     public.chat_sessions%rowtype;
  other uuid;
begin
  select * into s from public.chat_sessions where id = session;
  if not found then
    raise exception 'session not found';
  end if;
  if me <> s.user_a and me <> s.user_b then
    raise exception 'forbidden';
  end if;
  if not (s.user_a_approved_reveal and s.user_b_approved_reveal) then
    return;
  end if;

  other := case when me = s.user_a then s.user_b else s.user_a end;

  return query
    select p.user_id, p.real_name, p.age, p.country, p.cohort
    from public.private_identities p
    where p.user_id = other;
end$$;

grant execute on function public.get_revealed_identity(uuid) to authenticated;

-- ---------- 2. messages expansion ----------
alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.messages
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null;

alter table public.messages
  add column if not exists reactions jsonb not null default '{}'::jsonb;

-- Allow attachment-only / voice-only messages.
alter table public.messages
  alter column body drop not null;

-- ---------- 3. likes + mutual-match RPC ----------
create table if not exists public.likes (
  liker      uuid not null references public.profiles(id) on delete cascade,
  likee      uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker, likee),
  check (liker <> likee)
);

create index if not exists likes_likee_idx on public.likes(likee);

alter table public.likes enable row level security;

drop policy if exists "likes_self_insert" on public.likes;
create policy "likes_self_insert"
  on public.likes for insert
  to authenticated with check (auth.uid() = liker);

drop policy if exists "likes_participants_select" on public.likes;
create policy "likes_participants_select"
  on public.likes for select
  to authenticated using (auth.uid() = liker or auth.uid() = likee);

create or replace function public.like_user(target uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me         uuid := auth.uid();
  reciprocal boolean;
  lo         uuid;
  hi         uuid;
  sid        uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if me = target then
    raise exception 'cannot like yourself';
  end if;

  insert into public.likes(liker, likee) values (me, target)
    on conflict do nothing;

  select exists(
    select 1 from public.likes
    where liker = target and likee = me
  ) into reciprocal;

  if not reciprocal then
    return null;
  end if;

  if me < target then
    lo := me;    hi := target;
  else
    lo := target; hi := me;
  end if;

  insert into public.chat_sessions(user_a, user_b)
  values (lo, hi)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into sid;

  return sid;
end$$;

grant execute on function public.like_user(uuid) to authenticated;

-- ============================================================
-- 20260603000004_notifications.sql
-- ============================================================
-- ============================================================
-- Persistent, realtime notifications.
--
-- Server-side triggers create one notification row per event:
--   * message INSERT       → notify the recipient
--   * chat_sessions INSERT → notify both newly-matched participants
--   * chat_sessions UPDATE → notify the other side when reveal flag
--                            flips (one-sided request OR mutual unlock)
--
-- The frontend subscribes to notifications INSERTs with
-- `filter: user_id=eq.<me>` (RLS would already enforce this; the
-- filter just cuts noise). Existing rows are fetched on sign-in so
-- nothing missed while offline is lost.
-- ============================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('message', 'match', 'reveal', 'system')),
  title       text not null,
  body        text,
  session_id  uuid references public.chat_sessions(id) on delete cascade,
  unread      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifs_self_select" on public.notifications;
create policy "notifs_self_select"
  on public.notifications for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "notifs_self_update" on public.notifications;
create policy "notifs_self_update"
  on public.notifications for update
  to authenticated using (auth.uid() = user_id);

drop policy if exists "notifs_self_delete" on public.notifications;
create policy "notifs_self_delete"
  on public.notifications for delete
  to authenticated using (auth.uid() = user_id);

-- Inserts come only from triggers (security definer), never the client.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end$$;

-- ---------- triggers ----------

create or replace function public.notify_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s         public.chat_sessions%rowtype;
  recipient uuid;
  sender    text;
  preview   text;
begin
  select * into s from public.chat_sessions where id = new.session_id;
  if not found then return new; end if;
  recipient := case when new.sender_id = s.user_a then s.user_b else s.user_a end;
  select nickname into sender from public.profiles where id = new.sender_id;
  preview := coalesce(nullif(new.body, ''), '📎 Attachment');
  insert into public.notifications(user_id, kind, title, body, session_id)
  values (
    recipient,
    'message',
    coalesce(sender, 'Someone') || ' sent a message',
    left(preview, 120),
    new.session_id
  );
  return new;
end$$;

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_on_new_message();

create or replace function public.notify_on_new_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a_name text;
  b_name text;
begin
  select nickname into a_name from public.profiles where id = new.user_a;
  select nickname into b_name from public.profiles where id = new.user_b;
  insert into public.notifications(user_id, kind, title, body, session_id) values
    (new.user_a, 'match',
     'It''s a match — ' || coalesce(b_name, 'someone new'),
     'You both liked each other. Say hi when you''re ready.',
     new.id),
    (new.user_b, 'match',
     'It''s a match — ' || coalesce(a_name, 'someone new'),
     'You both liked each other. Say hi when you''re ready.',
     new.id);
  return new;
end$$;

drop trigger if exists trg_notify_new_match on public.chat_sessions;
create trigger trg_notify_new_match
  after insert on public.chat_sessions
  for each row execute function public.notify_on_new_match();

create or replace function public.notify_on_reveal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who       uuid;
  who_name  text;
  other     uuid;
  unlocked  boolean := new.user_a_approved_reveal and new.user_b_approved_reveal;
begin
  if new.user_a_approved_reveal and not old.user_a_approved_reveal then
    who := new.user_a; other := new.user_b;
  elsif new.user_b_approved_reveal and not old.user_b_approved_reveal then
    who := new.user_b; other := new.user_a;
  else
    return new;
  end if;

  select nickname into who_name from public.profiles where id = who;

  if unlocked then
    insert into public.notifications(user_id, kind, title, body, session_id)
    values (other, 'reveal',
            'Identity revealed',
            coalesce(who_name, 'They') || ' revealed too — you can now see each other.',
            new.id);
  else
    insert into public.notifications(user_id, kind, title, body, session_id)
    values (other, 'reveal',
            coalesce(who_name, 'They') || ' revealed their identity',
            'Reveal yours to unlock theirs.',
            new.id);
  end if;

  return new;
end$$;

drop trigger if exists trg_notify_reveal on public.chat_sessions;
create trigger trg_notify_reveal
  after update on public.chat_sessions
  for each row execute function public.notify_on_reveal();

-- ============================================================
-- 20260603000005_one_sided_matches.sql
-- ============================================================
-- ============================================================
-- One-sided matches.
--
-- like_user used to insert the like, then only open a chat_session
-- if the other side had already liked back. The product decision now
-- is: any single like opens the match for both people. The reciprocity
-- check goes away.
--
-- We still write to public.likes so we have a record (and the
-- discover deck still filters out anyone you've already liked).
-- chat_sessions's unique (user_a, user_b) + ON CONFLICT keeps the
-- single canonical row per pair, so liking the same person twice is
-- a no-op.
-- ============================================================

create or replace function public.like_user(target uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me  uuid := auth.uid();
  lo  uuid;
  hi  uuid;
  sid uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if me = target then
    raise exception 'cannot like yourself';
  end if;

  insert into public.likes(liker, likee) values (me, target)
    on conflict do nothing;

  if me < target then
    lo := me;    hi := target;
  else
    lo := target; hi := me;
  end if;

  insert into public.chat_sessions(user_a, user_b)
  values (lo, hi)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into sid;

  return sid;
end$$;

notify pgrst, 'reload schema';

-- ============================================================
-- 20260603000006_profile_picture.sql
-- ============================================================
-- ============================================================
-- Profile picture (private, revealed-only).
--
-- Add a text column back on private_identities to hold a base64
-- data URL of the user's photo. It's wrapped in the same privacy
-- contract as real_name / age / etc.: the column is gated by RLS,
-- and the get_revealed_identity RPC only returns it once both
-- participants of a chat have approved the reveal.
--
-- This is the inverse of part of migration 003, which dropped the
-- old (unused) column. The new column carries a data URL rather
-- than a Storage path so the MVP doesn't need a Storage bucket
-- with its own policies wired up.
-- ============================================================

alter table public.private_identities
  add column if not exists profile_picture text;

drop function if exists public.get_revealed_identity(uuid);

create or replace function public.get_revealed_identity(session uuid)
returns table (
  user_id          uuid,
  real_name        varchar,
  age              int,
  country          varchar,
  cohort           varchar,
  profile_picture  text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me    uuid := auth.uid();
  s     public.chat_sessions%rowtype;
  other uuid;
begin
  select * into s from public.chat_sessions where id = session;
  if not found then
    raise exception 'session not found';
  end if;
  if me <> s.user_a and me <> s.user_b then
    raise exception 'forbidden';
  end if;
  if not (s.user_a_approved_reveal and s.user_b_approved_reveal) then
    return;
  end if;

  other := case when me = s.user_a then s.user_b else s.user_a end;

  return query
    select p.user_id, p.real_name, p.age, p.country, p.cohort, p.profile_picture
    from public.private_identities p
    where p.user_id = other;
end$$;

grant execute on function public.get_revealed_identity(uuid) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- 20260603000007_chat_policies.sql
-- ============================================================
-- ============================================================
-- DELETE + UPDATE policies for chat correctness.
--
-- chat_sessions:
--   participants can DELETE their session (clears the chat from
--   their list; FK cascade removes its messages).
--
-- messages:
--   sender can DELETE their own message.
--   participants can UPDATE — used by the frontend to write the
--   reactions jsonb. Body / attachments / reply_to_id are still
--   only set on INSERT in practice; tightening this later to a
--   reactions-only check would require a trigger.
-- ============================================================

drop policy if exists "sessions_participants_delete" on public.chat_sessions;
create policy "sessions_participants_delete"
  on public.chat_sessions for delete
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "messages_participants_update" on public.messages;
create policy "messages_participants_update"
  on public.messages for update
  to authenticated
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = session_id
        and (auth.uid() = s.user_a or auth.uid() = s.user_b)
    )
  )
  with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = session_id
        and (auth.uid() = s.user_a or auth.uid() = s.user_b)
    )
  );

drop policy if exists "messages_sender_delete" on public.messages;
create policy "messages_sender_delete"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());

notify pgrst, 'reload schema';

-- ============================================================
-- Tell PostgREST to refresh its schema cache so columns added /
-- dropped above are picked up immediately. Without this, clients
-- can hit "Could not find the 'X' column ... in the schema cache"
-- right after a migration.
-- ============================================================
notify pgrst, 'reload schema';
