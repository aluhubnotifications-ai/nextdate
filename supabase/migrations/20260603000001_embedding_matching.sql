-- ============================================================
-- Embedding-based matching
--
-- We move the suggestion ranking from "set overlap on interests/
-- hobbies" (computed in Python) to cosine similarity over a single
-- 384-dim sentence-embedding per user, computed locally in the
-- backend with `all-MiniLM-L6-v2`.
--
-- Hard filters (target_intent, term_length) still apply — embeddings
-- only re-rank within an eligible pool.
-- ============================================================

create extension if not exists vector;

alter table public.match_preferences
  add column if not exists embedding vector(384);

-- Cosine kNN. ivfflat is fine up to ~100k rows; bump `lists` later if needed.
create index if not exists match_preferences_embedding_idx
  on public.match_preferences
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ---------- ranking RPC ----------
-- Returns candidates sharing my (target_intent, term_length), ordered
-- by cosine similarity to my embedding. Score in [0, 1], higher = closer.
create or replace function public.match_candidates(me uuid, k int default 50)
returns table (user_id uuid, score float)
language sql
stable
security definer
set search_path = public
as $$
  with me_row as (
    select embedding, target_intent, term_length
    from public.match_preferences
    where user_id = me
  )
  select mp.user_id,
         (1 - (mp.embedding <=> me_row.embedding))::float as score
  from public.match_preferences mp, me_row
  where mp.user_id <> me
    and mp.target_intent = me_row.target_intent
    and mp.term_length   = me_row.term_length
    and mp.embedding is not null
    and me_row.embedding is not null
  order by mp.embedding <=> me_row.embedding
  limit k;
$$;

grant execute on function public.match_candidates(uuid, int) to authenticated, service_role;
