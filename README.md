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
frontend/     Static Cloudflare Pages bundle (no build step)
backend/      FastAPI matching engine for Render
supabase/     SQL schema + RLS policies + helper RPCs
```

## 1 · Supabase setup
1. Create a new Supabase project.
2. Open **SQL editor → New query**, paste `supabase/schema.sql`, run it.
3. **Auth → Providers → Email**: enable email/password.
   For a strict campus-only deployment, also restrict signup domain to
   `alustudent.com` under *Auth → URL Configuration / Email Templates*.
4. Copy these values from **Project Settings → API**:
   - `Project URL`
   - `anon` public key
   - `service_role` secret key (backend only — never expose to the browser).

## 2 · Backend (FastAPI on Render)
```
cd backend
pip install -r requirements.txt
SUPABASE_URL=...          \
SUPABASE_ANON_KEY=...     \
SUPABASE_SERVICE_KEY=...  \
uvicorn main:app --reload
```
Deploy on Render using `backend/render.yaml`. Set env vars:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`        (used to verify caller JWTs)
- `SUPABASE_SERVICE_KEY`     (used to read hidden `match_preferences`)
- `ALLOWED_ORIGINS`          (your Cloudflare Pages URL, comma-separated)

## 3 · Frontend (Cloudflare Pages)
Edit `frontend/config.js` with your Supabase URL, anon key, and the deployed
Render backend URL. Then deploy `frontend/` as a static site on Cloudflare
Pages (no build command, output directory `/`).

For local development:
```
cd frontend
python -m http.server 5173
# open http://localhost:5173
```

## Privacy model
| Table | Visibility |
|---|---|
| `profiles` | Public to authenticated users (nickname, avatar, gender, zodiac). |
| `match_preferences` | Owner only via RLS. Backend reads with the service key. |
| `private_identities` | Owner only via RLS. Peer hydration happens only through `get_revealed_identity(session)`, which returns rows **only when both reveal flags are true**. |

The browser literally cannot read another user's `private_identities` row.
The Postgres function is `SECURITY DEFINER` and checks the mutual reveal
state before returning anything.
