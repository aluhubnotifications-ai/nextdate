-- Add actor_id to notifications so the frontend can show "Like back"
-- on a 'like' notification without a separate lookup.
alter table public.notifications
  add column if not exists actor_id uuid references public.profiles(id) on delete set null;

-- Backfill isn't needed for old rows (they have no actor).
-- Re-create notify_on_new_like to populate actor_id going forward.
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
  select exists(
    select 1 from public.chat_sessions
    where (user_a = new.liker and user_b = new.likee)
       or (user_a = new.likee and user_b = new.liker)
  ) into already_match;
  if already_match then return new; end if;

  select nickname into liker_name from public.profiles where id = new.liker;

  insert into public.notifications(user_id, actor_id, kind, title, body)
  values (
    new.likee,
    new.liker,
    'like',
    coalesce(liker_name, 'Someone') || ' liked you!',
    'Like them back to start a conversation.'
  );
  return new;
end$$;
