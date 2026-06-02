-- Add `country` to private_identities and surface it through the
-- get_revealed_identity RPC so the reveal flow returns it.

alter table public.private_identities
  add column if not exists country varchar;

create or replace function public.get_revealed_identity(session uuid)
returns table (
  user_id         uuid,
  real_name       varchar,
  profile_picture varchar,
  age             int,
  country         varchar,
  cohort          varchar,
  whatsapp_number varchar
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
    select p.user_id, p.real_name, p.profile_picture, p.age,
           p.country, p.cohort, p.whatsapp_number
    from public.private_identities p
    where p.user_id = other;
end$$;

grant execute on function public.get_revealed_identity(uuid) to authenticated;
