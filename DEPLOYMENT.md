# Deployment — Vercel + Supabase

Turnkey guide to take the platform live. You perform the account steps; every
artifact is already in the repo.

## 0. Prerequisites
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account (import this Git repo)
- Optional: OpenAI / Anthropic / Google AI API keys for AI reports

## 1. Provision Supabase (see `supabase/README.md` for detail)
1. Create the project; copy the API URL, anon key, and service-role key.
2. Get the two Postgres connection strings (Project Settings → Database):
   - **Pooled** (`...pooler...:6543/postgres?pgbouncer=true`) → `DATABASE_URL`
   - **Direct** (`...:5432/postgres`) → `DIRECT_URL`

## 2. Create the schema + policies
```bash
npm install                 # runs `prisma generate` (postinstall)
npx prisma migrate deploy   # creates the 15 tables
# then run supabase/migrations/20260730000001_rls_and_storage.sql in the
# Supabase SQL editor (RLS policies + storage buckets)
npm run db:seed             # demo org, 10 categories, 5 readiness levels, …
```

## 3. Set environment variables (Vercel → Project → Settings → Env)
| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** |
| `DATABASE_URL` / `DIRECT_URL` | Prisma |
| `AI_DEFAULT_PROVIDER` | `claude` \| `openai` \| `gemini` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_AI_API_KEY` | at least one for AI |
| `NEXT_PUBLIC_DEFAULT_ORG_NAME` / `_SLUG` | white-label fallback |

## 4. OAuth (optional)
Supabase → Authentication → Providers → enable Google / Azure; add the redirect
URL `https://<your-domain>/auth/callback`. Set the same in Google/Azure consoles.

## 5. Deploy
Push to your default branch (or click **Deploy** in Vercel). `vercel.json` sets
the build to `prisma generate && next build` and gives server functions a 60s
budget (for AI generation).

## 6. First Super Admin
Sign up once, then in the Supabase SQL editor:
```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data
  || jsonb_build_object('role','SUPER_ADMIN','profile_complete',true)
where email = 'you@example.com';
```
Sign out/in to refresh the JWT. You'll land on `/super`.

## Security checklist (built in)
- **RLS** on all 15 tables (owner / HR / org-admin / super-admin) + JWT claim helpers
- **Server actions enforce ownership/role** (Prisma bypasses RLS by design)
- **Rate limiting** on AI generation (`src/lib/security/rate-limit.ts`)
- **Security headers** (HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy) in `next.config.ts`
- **Audit logging** on assessment + admin mutations (`audit_logs`)
- Service-role key is **server-only**; secure, `httpOnly`, same-site session cookies via `@supabase/ssr`

## Verify
```bash
npm run typecheck && npm run test && npm run build
```

## Production notes
- The in-memory rate limiter is per-instance. For strict global limits, back it
  with Upstash Redis / Vercel KV (swap the store in `rate-limit.ts`).
- Word/PowerPoint export are follow-ons (PDF-via-print + Excel are implemented).
- Add historical score snapshots to enable the trend chart.
