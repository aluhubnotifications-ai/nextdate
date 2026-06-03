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
