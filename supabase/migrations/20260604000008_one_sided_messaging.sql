-- One-sided like opens a chat immediately so the liker can message.
-- Mutual like (both sides) = a "match" with the overlay + match notification.
--
-- Changes:
--   1. Drop the old notification triggers — like_user handles them directly
--      to avoid double-firing.
--   2. like_user always creates a session (liker can message right away).
--      Returns jsonb {session_id, is_mutual} so the frontend knows whether
--      to show the match overlay or just open the chat.
--   3. One-sided like  → likee gets "💛 X liked you!" notification (actor_id set).
--   4. Mutual like     → both get "💖 It's a match!" notification (actor_id set).

drop trigger if exists trg_notify_new_like  on public.likes;
drop trigger if exists trg_notify_new_match on public.chat_sessions;

create or replace function public.like_user(target uuid)
returns jsonb
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
  is_new_session boolean;
  me_name       text;
  them_name     text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = target then raise exception 'cannot like yourself'; end if;

  -- Record the like (idempotent)
  insert into public.likes(liker, likee) values (me, target)
    on conflict do nothing;

  -- Check if the other person has already liked us back
  select exists(
    select 1 from public.likes where liker = target and likee = me
  ) into already_liked;

  -- Canonical ordering for the unique (user_a, user_b) constraint
  if me < target then lo := me; hi := target;
  else lo := target; hi := me;
  end if;

  -- Has a session already been opened for this pair?
  select id into sid from public.chat_sessions where user_a = lo and user_b = hi;
  is_new_session := sid is null;

  -- Always open a session — liker can message immediately
  insert into public.chat_sessions(user_a, user_b)
  values (lo, hi)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into sid;

  -- Fetch display names for notification copy
  select nickname into me_name   from public.profiles where id = me;
  select nickname into them_name from public.profiles where id = target;

  if already_liked then
    -- Mutual: notify both sides with match copy
    insert into public.notifications(user_id, actor_id, kind, title, body, session_id)
    values
      (me,     target, 'match',
       'It''s a match!',
       coalesce(them_name, 'Someone') || ' liked you back. Say hi!',
       sid),
      (target, me,     'match',
       'It''s a match!',
       coalesce(me_name, 'Someone') || ' liked you back. Say hi!',
       sid);
  elsif is_new_session then
    -- First like on a new session: notify the likee only
    insert into public.notifications(user_id, actor_id, kind, title, body)
    values (
      target, me, 'like',
      coalesce(me_name, 'Someone') || ' liked you!',
      'They can now message you. Like them back to match.'
    );
  end if;

  return jsonb_build_object('session_id', sid::text, 'is_mutual', already_liked);
end$$;

notify pgrst, 'reload schema';
