-- Update match notification text so each person is told
-- "[name] liked you and wants to start a conversation."
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
     coalesce(b_name, 'Someone new') || ' liked you!',
     coalesce(b_name, 'They') || ' wants to start a conversation with you.',
     new.id),
    (new.user_b, 'match',
     coalesce(a_name, 'Someone new') || ' liked you!',
     coalesce(a_name, 'They') || ' wants to start a conversation with you.',
     new.id);
  return new;
end$$;
