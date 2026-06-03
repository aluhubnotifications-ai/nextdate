-- ============================================================
-- DELETE + UPDATE policies for chat correctness.
--
-- chat_sessions:
--   participants can DELETE their session (clears the chat from
--   their list; FK cascade removes its messages).
--
-- messages:
--   sender can DELETE their own message.
--   participants can UPDATE — used by the frontend to write the
--   reactions jsonb. Body / attachments / reply_to_id are still
--   only set on INSERT in practice; tightening this later to a
--   reactions-only check would require a trigger.
-- ============================================================

drop policy if exists "sessions_participants_delete" on public.chat_sessions;
create policy "sessions_participants_delete"
  on public.chat_sessions for delete
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "messages_participants_update" on public.messages;
create policy "messages_participants_update"
  on public.messages for update
  to authenticated
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = session_id
        and (auth.uid() = s.user_a or auth.uid() = s.user_b)
    )
  )
  with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = session_id
        and (auth.uid() = s.user_a or auth.uid() = s.user_b)
    )
  );

drop policy if exists "messages_sender_delete" on public.messages;
create policy "messages_sender_delete"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());

notify pgrst, 'reload schema';
