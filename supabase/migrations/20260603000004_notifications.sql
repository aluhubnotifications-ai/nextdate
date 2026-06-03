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
