-- Persistent block list so blocks survive page reload.
-- Blocked users are filtered from the discover deck and hidden from sessions.
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;

drop policy if exists "blocked_users_self_select" on public.blocked_users;
create policy "blocked_users_self_select"
  on public.blocked_users for select
  to authenticated using (auth.uid() = blocker_id);

drop policy if exists "blocked_users_self_insert" on public.blocked_users;
create policy "blocked_users_self_insert"
  on public.blocked_users for insert
  to authenticated with check (auth.uid() = blocker_id);

drop policy if exists "blocked_users_self_delete" on public.blocked_users;
create policy "blocked_users_self_delete"
  on public.blocked_users for delete
  to authenticated using (auth.uid() = blocker_id);
