-- ============================================================
-- Switch designated admin to horugavye.official@gmail.com and seed
-- the account so they can sign in immediately.
--
-- The previous trigger keyed off admin@nextdate.app. We replace the
-- trigger function so any current or future row with the new email
-- gets is_admin = true, and we backfill any existing rows.
--
-- The seed inserts public.users with a pre-computed bcrypt hash of
-- the password 'Horugavye@2024' (bcrypt 4.2.1, 12 rounds) and the
-- matching public.profiles row. The profiles INSERT trips the
-- is_admin trigger, so the new account is admin from row zero.
--
-- Other admins can be added later from the dashboard via
-- PATCH /admin/users/:id/admin — no migration required for that.
-- ============================================================

create or replace function public.profiles_apply_admin_flag()
returns trigger
language plpgsql
as $fn$
begin
  if new.email = 'horugavye.official@gmail.com' then
    new.is_admin := true;
  end if;
  return new;
end;
$fn$;

-- Backfill: any existing profile that matches the new email becomes admin.
update public.profiles
set is_admin = true
where email = 'horugavye.official@gmail.com';

-- Seed the admin user + profile if they don't exist yet, and (re)set
-- the password if they do. Wrapped in a DO block so the steps stay
-- atomic and we can branch on existence.
do $migration$
declare
  admin_email   constant text := 'horugavye.official@gmail.com';
  admin_pwhash  constant text := '$2b$12$naFxSxFk/r2TZZdEYUYA/.EDGkzQlRf4iAaKE1IkMkyJCG3ibXARi';
  admin_uid     uuid;
begin
  select id into admin_uid from public.users where email = admin_email;

  if admin_uid is null then
    admin_uid := gen_random_uuid();
    insert into public.users (id, email, password_hash)
    values (admin_uid, admin_email, admin_pwhash);
  else
    update public.users set password_hash = admin_pwhash where id = admin_uid;
  end if;

  -- Profile row trips the trigger, which sets is_admin = true. If a
  -- profile already exists we just nudge is_admin true explicitly
  -- (the trigger only fires on email change, not on no-op updates).
  insert into public.profiles (id, email, nickname, avatar_url, is_admin)
  values (admin_uid, admin_email, 'Admin', '🛡️', true)
  on conflict (id) do update
    set email = excluded.email,
        is_admin = true;
end
$migration$;

notify pgrst, 'reload schema';
