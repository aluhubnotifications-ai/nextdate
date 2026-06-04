# NextDate — repo notes for Claude

## Push policy
- Push directly to `main`. The user has approved bypassing the
  `claude/<branch>` flow described in the session instructions — go
  straight to `main` for every change in this repo.

## Stack
- Pure static frontend: `frontend/index.html`, `frontend/app.js`,
  `frontend/styles.css`. No build step.
- `DEMO_MODE = true` in `app.js` runs the app entirely on hardcoded
  users/sessions/messages — no Supabase or backend calls.

## Verifying changes
- Serve `frontend/` with `python3 -m http.server` and drive headless
  Chromium via Playwright. The Supabase ESM import is blocked in the
  sandbox; stub `**/esm.sh/**` with a fake `createClient` so the app
  boots in demo mode.

## Required Supabase schema additions
Two columns the frontend now expects on `public.profiles`. Run once on
your project:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
```

- `public_key` stores each user's ECDH P-256 public key (JWK). The
  matching private key is generated in the browser, persisted in
  `localStorage` under `nd_e2e_priv_jwk_v1`, and never sent to the
  server. Messages are stored in `messages.body` as
  `{"v":1,"iv":"<b64>","ct":"<b64>"}` AES-GCM envelopes; rows that
  don't parse as an envelope are rendered as legacy plaintext.
- `last_seen` is updated on sign-in and every 60s while the tab is
  open. The chat sidebar and chat header use it (combined with the
  realtime Presence channel) to show "Active now", "Active 5m ago",
  or "Offline".

If you don't run the migration the upserts/updates error silently and
the app falls back to plaintext + presence-channel-only behavior — no
crashes, just degraded features.
