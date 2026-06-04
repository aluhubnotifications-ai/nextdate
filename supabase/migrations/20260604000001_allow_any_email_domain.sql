-- ============================================================
-- Allow any email domain on public.users.
-- The original schema restricted signup to @alustudent.com / @aluedu.org;
-- we now accept any valid email, so the CHECK constraint must go.
-- ============================================================

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%alustudent.com%'
  loop
    execute format('alter table public.users drop constraint %I', c.conname);
  end loop;
end$$;
