-- Remove the client-side INSERT policy on chat_sessions.
--
-- Sessions must only be created through the like_user RPC (which enforces
-- mutual likes). With this policy in place any authenticated user could
-- bypass the match requirement by inserting a chat_sessions row directly
-- via the REST API and then immediately messaging the other person.
--
-- like_user and open_chat_session are SECURITY DEFINER so they run as
-- the DB owner and are unaffected by RLS — they keep working.

drop policy if exists "sessions_participants_insert" on public.chat_sessions;
