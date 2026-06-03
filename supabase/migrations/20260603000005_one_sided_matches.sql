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
