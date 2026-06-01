# Supabase migrations

Versioned SQL migrations for the ALU Match database. Each file in
`migrations/` is timestamped and applied **in order, exactly once**.
Never edit a migration that has been applied — add a new one instead.

```
supabase/
└── migrations/
    └── 20260601000001_initial.sql   ← tables, RLS, RPCs, realtime publication
```

## Applying migrations

### Option A — Supabase CLI (recommended)

```bash
# one-time setup
brew install supabase/tap/supabase   # or scoop / npm
supabase login
supabase link --project-ref <your-project-ref>

# apply every unapplied migration in order
supabase db push
```

The CLI tracks which migrations have been applied in
`supabase_migrations.schema_migrations`, so re-running `db push` is safe.

### Option B — paste into the SQL editor

For a quick one-off deploy: open Supabase **SQL Editor → New query**,
paste the contents of each migration file in filename order, run them.

## Adding a new migration

```bash
supabase migration new add_user_blocks
# creates: supabase/migrations/<timestamp>_add_user_blocks.sql
```

Write the change as `alter table …` / `create table if not exists …` /
new RPCs. Commit the file. Run `supabase db push` to apply.

> Never re-edit an applied migration. If something needs to change, write
> a follow-up migration that alters it.
