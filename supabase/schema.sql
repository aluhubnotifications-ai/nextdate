-- ============================================================
-- ALU Matchmaking — Supabase Schema
-- Run this in the Supabase SQL editor in order.
-- ============================================================

-- ---------- ENUMS ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'intent_kind') then
    create type intent_kind as enum ('Friendships', 'Dates', 'Relationship');
  end if;
  if not exists (select 1 from pg_type where typname = 'term_kind') then
    create type term_kind as enum ('Long-term', 'Short-term');
  end if;
end$$;

-- ---------- TABLE A: profiles (public) ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         varchar not null check (email ilike '%@alustudent.com' or email ilike '%@aluedu.org'),
  nickname      varchar not null,
  avatar_url    varchar,
  gender        varchar,
  zodiac_sign   varchar,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_all_authenticated" on public.profiles;
create policy "profiles_read_all_authenticated"
  on public.profiles for select
  to authenticated using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated using (auth.uid() = id);

-- ---------- TABLE B: match_preferences (hidden / backend only) ----------
create table if not exists public.match_preferences (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  target_intent        intent_kind not null,
  interests            text[] default '{}',
  hobbies              text[] default '{}',
  leisure_time         text,
  wants_in_relationship text,
  term_length          term_kind not null,
  updated_at           timestamptz not null default now()
);

alter table public.match_preferences enable row level security;

-- Owner can read/write own preferences ONLY (service role on backend bypasses RLS).
drop policy if exists "prefs_self_select" on public.match_preferences;
create policy "prefs_self_select"
  on public.match_preferences for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "prefs_self_upsert" on public.match_preferences;
create policy "prefs_self_upsert"
  on public.match_preferences for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "prefs_self_update" on public.match_preferences;
create policy "prefs_self_update"
  on public.match_preferences for update
  to authenticated using (auth.uid() = user_id);

-- ---------- TABLE C: private_identities (hard-locked) ----------
create table if not exists public.private_identities (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  real_name       varchar,
  profile_picture varchar,
  age             int,
  cohort          varchar,
  whatsapp_number varchar,
  updated_at      timestamptz not null default now()
);

alter table public.private_identities enable row level security;

-- The owner may always manage their OWN private record.
drop policy if exists "priv_self_select" on public.private_identities;
create policy "priv_self_select"
  on public.private_identities for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "priv_self_upsert" on public.private_identities;
create policy "priv_self_upsert"
  on public.private_identities for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "priv_self_update" on public.private_identities;
create policy "priv_self_update"
  on public.private_identities for update
  to authenticated using (auth.uid() = user_id);

-- ---------- chat sessions (1:1 rooms) ----------
create table if not exists public.chat_sessions (
  id                       uuid primary key default gen_random_uuid(),
  user_a                   uuid not null references public.profiles(id) on delete cascade,
  user_b                   uuid not null references public.profiles(id) on delete cascade,
  user_a_approved_reveal   boolean not null default false,
  user_b_approved_reveal   boolean not null default false,
  created_at               timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)        -- canonical ordering -> a single row per pair
);

alter table public.chat_sessions enable row level security;

drop policy if exists "sessions_participants_select" on public.chat_sessions;
create policy "sessions_participants_select"
  on public.chat_sessions for select
  to authenticated using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "sessions_participants_insert" on public.chat_sessions;
create policy "sessions_participants_insert"
  on public.chat_sessions for insert
  to authenticated with check (auth.uid() = user_a or auth.uid() = user_b);

-- A participant may only flip THEIR OWN reveal flag.
drop policy if exists "sessions_participants_update" on public.chat_sessions;
create policy "sessions_participants_update"
  on public.chat_sessions for update
  to authenticated
  using  (auth.uid() = user_a or auth.uid() = user_b)
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- ---------- messages ----------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists messages_session_idx on public.messages(session_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages_participants_select" on public.messages;
create policy "messages_participants_select"
  on public.messages for select
  to authenticated using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = session_id
        and (auth.uid() = s.user_a or auth.uid() = s.user_b)
    )
  );

drop policy if exists "messages_participants_insert" on public.messages;
create policy "messages_participants_insert"
  on public.messages for insert
  to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_sessions s
      where s.id = session_id
        and (auth.uid() = s.user_a or auth.uid() = s.user_b)
    )
  );

-- ---------- realtime publication ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_sessions'
  ) then
    alter publication supabase_realtime add table public.chat_sessions;
  end if;
end$$;

-- ---------- helper RPC: open / fetch a chat session (canonical order) ----------
create or replace function public.open_chat_session(other uuid)
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
  if me = other then
    raise exception 'cannot open a session with yourself';
  end if;

  if me < other then lo := me;    hi := other;
  else                lo := other; hi := me;
  end if;

  insert into public.chat_sessions(user_a, user_b)
  values (lo, hi)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into sid;

  return sid;
end$$;

grant execute on function public.open_chat_session(uuid) to authenticated;

-- ---------- helper RPC: reveal-state (mutual hydration) ----------
-- Returns the OTHER participant's private identity ONLY when both flags are true.
create or replace function public.get_revealed_identity(session uuid)
returns table (
  user_id         uuid,
  real_name       varchar,
  profile_picture varchar,
  age             int,
  cohort          varchar,
  whatsapp_number varchar
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me  uuid := auth.uid();
  s   public.chat_sessions%rowtype;
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
    return;  -- empty set: still locked
  end if;

  other := case when me = s.user_a then s.user_b else s.user_a end;

  return query
    select p.user_id, p.real_name, p.profile_picture, p.age, p.cohort, p.whatsapp_number
    from public.private_identities p
    where p.user_id = other;
end$$;

grant execute on function public.get_revealed_identity(uuid) to authenticated;
