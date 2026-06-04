-- User reports table. The frontend writes here directly via the Supabase
-- client; no backend endpoint needed. Admins review via the dashboard.
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  reported_id uuid not null references public.users(id) on delete cascade,
  session_id  uuid references public.chat_sessions(id) on delete set null,
  reason      text not null,
  details     text,
  created_at  timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "reports_self_insert" on public.reports;
create policy "reports_self_insert"
  on public.reports for insert
  to authenticated with check (auth.uid() = reporter_id);

-- Reporters can read their own reports; admins use the service key.
drop policy if exists "reports_self_select" on public.reports;
create policy "reports_self_select"
  on public.reports for select
  to authenticated using (auth.uid() = reporter_id);
