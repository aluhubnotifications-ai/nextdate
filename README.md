# ALU Match

A campus-only matchmaking app for ALU students. Identities stay hidden until
both people in a chat tap **Reveal**.

```
Static frontend (Cloudflare Pages / any static host)
        │
        ├─ HTTP ──► FastAPI on Render  ──► AI matching (planned), returns public cards
        │
        └─ WebSocket ──► Supabase Realtime ──► instant chat
```

## Layout
```
frontend/                       Static Cloudflare Pages bundle (no build step)
backend/
├── main.py                     FastAPI app (routes only)
├── models.py                   Pydantic models — one source of truth per table
└── requirements.txt
supabase/
├── README.md                   How migrations work
└── migrations/                 Timestamped, append-only SQL
    └── 20260601000001_initial.sql
```

## 1 · Supabase setup
1. Create a new Supabase project.
2. Apply migrations — either:
   - **CLI** (`supabase link` then `supabase db push`), or
   - paste `supabase/migrations/*.sql` files in filename order into the SQL editor.
   See [`supabase/README.md`](./supabase/README.md).
3. (You can leave Supabase Auth providers off — we use our own auth.)
4. Copy these values from **Project Settings → API**:
   - `Project URL`
   - `anon` public key (used by the browser to reach Postgres + Realtime)
   - `service_role` secret key (backend only)
   - `JWT Secret` (backend only — used to sign our tokens so Supabase RLS trusts them)

## 2 · Backend (FastAPI on Render)
```
cd backend
pip install -r requirements.txt
SUPABASE_URL=...           \
SUPABASE_SERVICE_KEY=...   \
SUPABASE_JWT_SECRET=...    \
ALLOWED_EMAIL_DOMAINS=alustudent.com,aluedu.org \
uvicorn main:app --reload
```
Deploy on Render using `backend/render.yaml`. Set env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`     (read hidden `match_preferences`, manage `users`)
- `SUPABASE_JWT_SECRET`      (HS256 secret used to mint Supabase-compatible JWTs)
- `ALLOWED_ORIGINS`          (your Cloudflare Pages URL, comma-separated)
- `ALLOWED_EMAIL_DOMAINS`    (default: `alustudent.com,aluedu.org`)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CONTACT_EMAIL`
  (Web Push — see [Web Push setup](#4--web-push-app-closed-notifications) below)
- `PUSH_WEBHOOK_SECRET`      (shared secret for the Supabase webhook → `/push/dispatch`)

### Auth endpoints
- `POST /auth/signup` `{email, password}` → `{user_id, email, token, expires_in}`
- `POST /auth/login`  `{email, password}` → same shape
- `GET  /auth/me`     (Authorization: Bearer …) → current user
- `GET  /suggestions/{user_id}` → matched cards (caller must equal `user_id`)

## 3 · Frontend (static)
Deploy `frontend/` as a static site (Cloudflare Pages, Netlify, GitHub
Pages, etc.).

Runtime config is **hardcoded** at the top of `frontend/app.js`. Open it
and edit these four constants for your deployment:

```js
const SUPABASE_URL      = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-KEY";
const BACKEND_URL       = "https://alu-match-engine.onrender.com";
const EMAIL_DOMAINS     = ["alustudent.com", "aluedu.org"];
```

The Supabase **anon** key is meant to be public — it's the same value
the browser would receive from any runtime config endpoint, and Supabase
RLS does the actual access control. Do **not** put the `service_role`
key in here; that one stays on the backend only.

Build settings (for Cloudflare Pages / Netlify):
- **Build command**: *(blank)*
- **Build output directory**: `frontend`

For local development just serve the folder:
```
cd frontend
python3 -m http.server 5173
```

## 4 · Web Push (app-closed notifications)

When the user grants notification permission the browser hands us a
push subscription; we store it in `public.push_subscriptions` and a
Supabase database webhook on `notifications` INSERT calls the backend
to fan out a VAPID-signed Web Push to every subscription. The OS then
wakes the service worker even if the browser/PWA is fully closed.

Caveats: on **iOS** Web Push only works when the user has installed
the PWA to the home screen (Safari 16.4+). On Android Chrome /
Firefox / desktop browsers it works as long as the browser process is
running in the background — which is the default.

### One-time setup
1. **Generate a VAPID keypair** (Node only needs `npx`):
   ```bash
   npx web-push generate-vapid-keys
   ```
   You get a `publicKey` and `privateKey` (both URL-safe base64).
2. **Set backend env vars** on Render:
   - `VAPID_PUBLIC_KEY`   = the public key
   - `VAPID_PRIVATE_KEY`  = the private key
   - `VAPID_CONTACT_EMAIL` = an email the push services can reach you at
   - `PUSH_WEBHOOK_SECRET` = any random string (e.g. `openssl rand -hex 32`)
3. **Apply the migration** `20260605000001_push_subscriptions.sql`
   (creates `public.push_subscriptions`).
4. **Create the database webhook** in Supabase Dashboard →
   *Database → Webhooks → Create a new hook*:
   - Table: `notifications`
   - Events: ☑ Insert (only)
   - Type: HTTP request
   - Method: `POST`
   - URL: `https://<your-backend>.onrender.com/push/dispatch`
   - HTTP Headers:
     - `Content-Type: application/json`
     - `X-Webhook-Secret: <PUSH_WEBHOOK_SECRET>` (the value from step 2)

That's it. The frontend automatically subscribes the device on the
next sign-in after notification permission is granted, and the Profile
toggle drops the subscription when turned off.

## Auth model
- The FastAPI backend owns email/password (bcrypt-hashed, stored in `public.users`).
- On login/signup the backend issues a **JWT signed with Supabase's JWT secret**,
  with `sub = user_id`, `role = "authenticated"`, `aud = "authenticated"`.
- The browser passes that JWT as `Authorization: Bearer …` for **both** the
  Render backend and the Supabase REST + Realtime endpoints, so RLS
  (`auth.uid()`) keeps working transparently. We never call Supabase Auth.

## Privacy model
| Table | Visibility |
|---|---|
| `users` | Owner only via RLS. `password_hash` never leaves the backend. |
| `profiles` | Public to authenticated users (nickname, avatar, gender, zodiac). |
| `match_preferences` | Owner only via RLS. Backend reads with the service key. |
| `private_identities` | Owner only via RLS. Peer hydration happens only through `get_revealed_identity(session)`, which returns rows **only when both reveal flags are true**. |
