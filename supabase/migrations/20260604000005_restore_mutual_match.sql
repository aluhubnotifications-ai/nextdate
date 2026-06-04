-- Restore proper mutual-match flow.
--
-- Previously like_user opened a chat_session on ANY single like, causing:
--   (a) the match overlay to fire on every like, not just mutual ones
--   (b) both users to receive "[name] liked you!" even when only one had liked
--
-- This migration:
--   1. Restores mutual check in like_user — session only created when BOTH liked
--   2. Adds notify_on_new_like trigger so the likee gets "[name] liked you!"
--   3. Updates notify_on_new_match to say "It's a match!" (mutual context)
--   4. Adds 'like' to the notifications.kind check constraint

alter table public.notifications
  drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('message', 'match', 'like', 'reveal', 'system'));

-- Restore mutual-match logic: only open a session when both sides have liked
create or replace function public.like_user(target uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me            uuid := auth.uid();
  lo            uuid;
  hi            uuid;
  sid           uuid;
  already_liked boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = target then raise exception 'cannot like yourself'; end if;

  insert into public.likes(liker, likee) values (me, target)
    on conflict do nothing;

  -- Only open a session when the other person has ALSO liked us back
  select exists(
    select 1 from public.likes where liker = target and likee = me
  ) into already_liked;

  if not already_liked then
    return null;  -- one-sided like; likee gets a notification from the trigger below
  end if;

  if me < target then lo := me; hi := target;
  else lo := target; hi := me;
  end if;

  insert into public.chat_sessions(user_a, user_b)
  values (lo, hi)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into sid;

  return sid;
end$$;

-- Notify the likee when someone likes them (before a match exists)
create or replace function public.notify_on_new_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  liker_name    text;
  already_match boolean;
begin
  -- If a chat_sessions row already exists for this pair, the match trigger
  -- will notify both sides — skip the "liked you" notification here.
  select exists(
    select 1 from public.chat_sessions
    where (user_a = new.liker and user_b = new.likee)
       or (user_a = new.likee and user_b = new.liker)
  ) into already_match;
  if already_match then return new; end if;

  select nickname into liker_name from public.profiles where id = new.liker;

  insert into public.notifications(user_id, kind, title, body)
  values (
    new.likee,
    'like',
    coalesce(liker_name, 'Someone') || ' liked you!',
    'Like them back to start a conversation.'
  );
  return new;
end$$;

drop trigger if exists trg_notify_new_like on public.likes;
create trigger trg_notify_new_like
  after insert on public.likes
  for each row execute function public.notify_on_new_like();

-- Update match notification: both sides liked, so say "It's a match!"
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
     'It''s a match!',
     coalesce(b_name, 'Someone') || ' liked you back. Say hi!',
     new.id),
    (new.user_b, 'match',
     'It''s a match!',
     coalesce(a_name, 'Someone') || ' liked you back. Say hi!',
     new.id);
  return new;
end$$;

notify pgrst, 'reload schema';
