-- ============================================================
-- Admin role
--
-- One designated account (admin@nextdate.app) gets is_admin = true
-- on profile create / email update. The flag is read by:
--   - backend /admin/* endpoints (service-key call, but every endpoint
--     verifies the caller's is_admin first)
--   - the frontend, to show/hide the Admin nav entry
--
-- Existing rows with the admin email are backfilled at migration time.
--
-- Reports get a status column so the dashboard can resolve them.
-- ============================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Backfill any existing row that happens to use the admin email so
-- whoever signed up first as that address doesn't get locked out of
-- the dashboard after this migration runs.
update public.profiles set is_admin = true where email = 'admin@nextdate.app';

create or replace function public.profiles_apply_admin_flag()
returns trigger
language plpgsql
as $$
begin
  if new.email = 'admin@nextdate.app' then
    new.is_admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_apply_admin_flag on public.profiles;
create trigger profiles_apply_admin_flag
  before insert or update of email on public.profiles
  for each row execute function public.profiles_apply_admin_flag();

-- Reports lifecycle: open → resolved / dismissed. Default to "open"
-- so the existing rows show up in the queue.
alter table public.reports
  add column if not exists status text not null default 'open',
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_status_check'
  ) then
    alter table public.reports
      add constraint reports_status_check
      check (status in ('open', 'resolved', 'dismissed'));
  end if;
end$$;

notify pgrst, 'reload schema';
