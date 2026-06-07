-- ============================================================
-- Read receipts on messages.
--
-- Adds messages.read_at (nullable) so the sender can render
-- WhatsApp-style ticks:
--   read_at IS NULL  → single tick (sent, not yet read)
--   read_at IS SET   → double tick (read by recipient)
--
-- Writes happen through the existing "messages_participants_update"
-- policy added in 20260603000007_chat_policies.sql — the frontend
-- updates read_at to now() on any message in the session that isn't
-- its own and hasn't been read yet.
-- ============================================================

alter table public.messages
  add column if not exists read_at timestamptz;

-- Partial index speeds up the "mark all peer-sent unread as read"
-- update the frontend fires when a chat is opened.
create index if not exists messages_unread_session_sender_idx
  on public.messages (session_id, sender_id)
  where read_at is null;
