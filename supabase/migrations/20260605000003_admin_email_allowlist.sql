-- ============================================================
-- Admin selection by email allowlist.
--
-- Instead of promoting existing users with a button, the admin
-- designates new admins by adding their email to public.admin_emails.
-- The next time that email signs up (or if a matching profile already
-- exists), the trigger flips is_admin = true. Removing an email also
-- demotes any matching profile, so the allowlist is the single source
-- of truth for who's an admin.
--
-- Only the backend service key writes to this table; the dashboard
-- goes through /admin/emails endpoints which re-check is_admin.
-- ============================================================

create table if not exists public.admin_emails (
  email     text primary key,
  added_by  uuid references public.users(id) on delete set null,
  added_at  timestamptz not null default now()
);

alter table public.admin_emails enable row level security;

-- No client policies — the service key writes; the admin UI reads
-- through the FastAPI backend, never directly via PostgREST.

-- Seed the existing designated email so we don't lock ourselves out.
insert into public.admin_emails (email)
values ('horugavye.official@gmail.com')
on conflict (email) do nothing;

-- Trigger now reads from the allowlist instead of a hardcoded address.
create or replace function public.profiles_apply_admin_flag()
returns trigger
language plpgsql
as $fn$
begin
  if exists (select 1 from public.admin_emails where email = new.email) then
    new.is_admin := true;
  end if;
  return new;
end;
$fn$;

-- Backfill: every existing profile whose email is on the allowlist
-- becomes admin right now (covers the seed above + any manual entries
-- inserted before this migration ran).
update public.profiles p
set is_admin = true
where exists (select 1 from public.admin_emails a where a.email = p.email);

notify pgrst, 'reload schema';
