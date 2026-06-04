-- ============================================================
-- Broadcast profile changes so Discover refreshes when new users
-- join or anyone edits their profile, without the user having to
-- press ↻.
--
-- Why profiles, not match_preferences:
--   RLS on match_preferences only lets the row owner SELECT, so
--   realtime postgres_changes delivers nothing to other clients
--   from that table. profiles is readable by every authenticated
--   user, and the onboarding form upserts profiles on every save,
--   so a change there is a good proxy signal that someone joined
--   or edited their info. The client uses the event purely as an
--   invalidation signal and then re-fetches /suggestions, which
--   recomputes scores against the latest match_preferences rows.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end$$;

notify pgrst, 'reload schema';
