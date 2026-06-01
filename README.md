# ALU Match

A campus-only matchmaking app for ALU students. Identities stay hidden until
both people in a chat tap **Reveal**.

```
Cloudflare Pages (frontend)
        │
        ├─ HTTP ──► FastAPI on Render  ──► reads hidden prefs, returns public cards
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

### Auth endpoints
- `POST /auth/signup` `{email, password}` → `{user_id, email, token, expires_in}`
- `POST /auth/login`  `{email, password}` → same shape
- `GET  /auth/me`     (Authorization: Bearer …) → current user
- `GET  /suggestions/{user_id}` → matched cards (caller must equal `user_id`)

## 3 · Frontend (Cloudflare Pages)
Deploy `frontend/` as a static site. **No values live in the repo** —
runtime config is served by a Pages Function (`frontend/functions/api/config.js`)
that reads from Pages environment variables.

In Cloudflare Pages → your project → **Settings → Environment variables**,
add (Production + Preview):

| Key | Example |
|---|---|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` |
| `BACKEND_URL` | `https://alu-match-engine.onrender.com` |
| `EMAIL_DOMAINS` *(optional)* | `alustudent.com,aluedu.org` |

Build settings:
- **Build command**: *(blank)*
- **Build output directory**: `frontend`

For local development with the same model, use Cloudflare's local dev
server so the Pages Function works:
```
npm install -g wrangler
cd frontend
SUPABASE_URL=... SUPABASE_ANON_KEY=... BACKEND_URL=... \
  wrangler pages dev . --port 5173
```

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
