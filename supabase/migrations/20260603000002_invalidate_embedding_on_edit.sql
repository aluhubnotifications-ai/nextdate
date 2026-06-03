-- ============================================================
-- Cache invalidation for match_preferences.embedding
--
-- Embeddings are cached on the row in 20260603000001. We must clear
-- the cache when the inputs change so the next /suggestions call
-- recomputes a fresh vector — but only for THAT row. Every other
-- user's cached embedding is untouched, and the embedding-only
-- UPDATE that the backend issues to write a freshly computed vector
-- must NOT re-trigger invalidation (it would loop forever).
--
-- The trigger nulls `embedding` only when one of the source columns
-- actually changed. Writing `SET embedding = $1` alone leaves the
-- prefs columns IS NOT DISTINCT FROM their old values, so the guard
-- short-circuits and the new vector survives.
-- ============================================================

create or replace function public.invalidate_embedding_on_pref_change()
returns trigger
language plpgsql
as $$
begin
  if (
    new.target_intent         is distinct from old.target_intent or
    new.term_length           is distinct from old.term_length or
    new.interests             is distinct from old.interests or
    new.hobbies               is distinct from old.hobbies or
    new.leisure_time          is distinct from old.leisure_time or
    new.wants_in_relationship is distinct from old.wants_in_relationship
  ) then
    new.embedding := null;
  end if;
  return new;
end$$;

drop trigger if exists match_preferences_invalidate_embedding
  on public.match_preferences;

create trigger match_preferences_invalidate_embedding
  before update on public.match_preferences
  for each row
  execute function public.invalidate_embedding_on_pref_change();
