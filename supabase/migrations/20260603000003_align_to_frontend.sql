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
