-- ============================================================
-- unmatch_session: delete a chat_sessions row AND the underlying
-- likes for the pair, so both participants drop off each other's
-- "people I've already liked" skip set in Discover and can rediscover
-- one another later.
--
-- The frontend wires "Delete conversation" to this. It's a
-- SECURITY DEFINER function so it can clear both rows of public.likes
-- (which has no DELETE policy for clients), with an explicit
-- participant check up front.
-- ============================================================

create or replace function public.unmatch_session(session uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  s  public.chat_sessions%rowtype;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  select * into s from public.chat_sessions where id = session;
  if not found then
    return;
  end if;
  if me <> s.user_a and me <> s.user_b then
    raise exception 'forbidden';
  end if;

  delete from public.likes
   where (liker = s.user_a and likee = s.user_b)
      or (liker = s.user_b and likee = s.user_a);

  -- Cascades take care of messages + notifications referencing this id.
  delete from public.chat_sessions where id = session;
end$$;

grant execute on function public.unmatch_session(uuid) to authenticated;

notify pgrst, 'reload schema';
