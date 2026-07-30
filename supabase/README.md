# Supabase setup — v2 database

The database schema is owned by **Prisma**; **RLS policies + storage buckets**
are applied via the SQL migration in `supabase/migrations/`.

## 1. Create the Supabase project
1. Create a project at https://supabase.com.
2. Copy into `.env.local` (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)
   - `DATABASE_URL` (pooled, `...pooler...:6543/postgres?pgbouncer=true`)
   - `DIRECT_URL` (direct, `...:5432/postgres`)

## 2. Create the tables (Prisma)
```bash
npm run db:generate        # prisma generate
npx prisma migrate deploy  # or: npm run db:push   (dev)
```

## 3. Apply RLS + storage buckets (Supabase SQL)
Run `supabase/migrations/20260730000001_rls_and_storage.sql` in the Supabase
SQL editor (or `supabase db push` with the CLI). This:
- adds JWT claim helpers (`jwt_org_id()`, `jwt_role()`, `is_hr()`, …),
- enables RLS on all 15 tables with per-role policies,
- creates storage buckets (`profile-pictures`, `org-logos`, `reports`,
  `certificates`, `evidence`) + policies.

## 4. Seed demo data
```bash
npm run db:seed   # org, 10 categories, 5 readiness levels, questions, modules, rules
```

## 5. First Super Admin
Registration creates `EMPLOYEE`s. Promote your account by setting its auth
`app_metadata` (SQL editor → Auth, or via the service role):
```sql
-- after signing up once:
update auth.users
set raw_app_meta_data = raw_app_meta_data
  || jsonb_build_object('role','SUPER_ADMIN','profile_complete',true)
where email = 'you@example.com';
```

## Auth providers (optional)
Enable Google / Azure in **Authentication → Providers**, set the OAuth client
IDs/secrets, and add `https://<your-domain>/auth/callback` as a redirect URL.
