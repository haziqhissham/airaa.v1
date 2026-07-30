# AI Readiness Assessment Platform — v2 Architecture (Supabase)

**Migration:** Firebase → **Supabase**, in place, reusing the framework-agnostic core.
**Strategy:** keep the domain engines, UI, charts and admin framework; replace the
persistence + auth layer; extend to the v2 scope (10 sections, 6 roles, OAuth, 3 AI providers).

> **No Firebase in the final product.** Firebase packages remain installed only transiently
> during the migration and are removed in Step 4 once the Supabase data + auth layer lands.

---

## 1. Tech Stack (v2)

| Concern | v1 (Firebase) | **v2 (Supabase)** |
|---|---|---|
| Framework | Next.js 15 · React 19 · TS | *(unchanged)* |
| UI | Tailwind · shadcn/ui · Framer Motion | *(unchanged)* |
| Charts | Recharts | *(unchanged)* |
| Auth | Firebase Auth + session cookie | **Supabase Auth** (email, Google, Azure, magic link, reset) |
| Database | Firestore | **Supabase PostgreSQL** |
| ORM / access | Repository over Firestore | **Prisma** (typed queries) + Supabase client |
| Authorization | Security Rules + custom claims | **Row Level Security (RLS)** + `app_metadata.role` |
| Storage | Firebase Storage | **Supabase Storage** (buckets) |
| Server logic | Server Actions + Admin SDK | **Server Actions + Route Handlers** + Supabase service role |
| Data fetching | RSC | RSC + **TanStack Query** (client caches) |
| Validation | Zod | *(unchanged)* |
| Forms | React Hook Form | *(unchanged)* |
| AI | (planned Claude) | **OpenAI + Claude + Gemini** provider abstraction |
| Hosting | Vercel | *(unchanged)* |

---

## 2. Migration Map — reuse / replace / add

### ✅ Reuse as-is (framework-agnostic — no changes)
- `src/domain/**` — scoring, persona, recommendation **engines**, result assembler, types, enums
- `src/components/**` — assessment flow, question renderers, result report, radar/charts,
  HR dashboard, **admin CRUD framework** (resource registry, entity form, resource manager)
- `src/lib/validation/**`, `src/lib/labels.ts`, `src/lib/utils.ts`, `src/lib/analytics/hr-analytics.ts`
- `src/lib/export/**` (xlsx), design system (`globals.css`, `tailwind.config.ts`)

### ♻️ Replace (Firebase → Supabase)
| v1 file | v2 replacement |
|---|---|
| `lib/firebase/client.ts` `admin.ts` | `lib/supabase/{client,server,admin,middleware}.ts` |
| `lib/repositories/**` (Firestore) | `lib/db/**` (Prisma) — same repository *interface*, Postgres underneath |
| `lib/auth/{session,tenant,guards}.ts` | `lib/auth/**` on Supabase sessions + RLS |
| `lib/actions/**` (Admin SDK writes) | Server Actions using Prisma + Supabase RLS |
| `app/api/session/route.ts` | `app/auth/callback/route.ts` (OAuth/magic-link exchange) |
| `firestore.rules` `storage.rules` `firestore.indexes.json` | `supabase/migrations/*.sql` (schema + **RLS policies**) |
| `scripts/seed.ts` (Admin SDK) | `prisma/seed.ts` (Prisma) |
| `middleware.ts` (cookie presence) | `middleware.ts` (Supabase `updateSession`) |

### ➕ Add (new v2 scope)
- **Prisma** schema + client; **Supabase SQL migrations** with RLS
- **10 assessment sections** (Leadership, Governance, Technology, People, Security, Culture,
  Innovation, Data, Automation, AI Ethics) — the existing dynamic engine already renders any
  configured sections/questions from the DB
- **6 roles** (Super Admin, Org Admin, HR Admin, Trainer, Employee, Guest)
- **OAuth** (Google, Azure) + **magic link** + reset
- **Multi-provider AI** (`lib/ai/**`) — OpenAI, Claude, Gemini behind one interface
- New tables/features: `admins`, `assessment_categories`, `readiness_levels`, `certificates`,
  `training_modules`, `audit_logs`, benchmarks; Super-Admin dashboard; heat maps, leaderboards;
  Word/PowerPoint export; board/executive reports

---

## 3. Folder Structure (v2)

```
├── prisma/
│   ├── schema.prisma              # models, enums, relations
│   └── seed.ts                    # seed via Prisma
├── supabase/
│   ├── config.toml                # local Supabase config
│   └── migrations/                # SQL: schema + RLS policies + storage buckets
├── src/
│   ├── middleware.ts              # Supabase session refresh + route gate
│   ├── app/
│   │   ├── (marketing)/           # landing (reused)
│   │   ├── (auth)/                # login, register, forgot, + OAuth buttons
│   │   ├── auth/callback/route.ts # OAuth / magic-link exchange
│   │   ├── dashboard/  assessment/  result/   # employee (reused UI)
│   │   ├── org/  hr/  admin/  super/           # role dashboards
│   │   └── api/                   # REST: /assessment /questions /answers /reports …
│   ├── domain/**                  # ♻ reused engines (unchanged)
│   ├── components/**              # ♻ reused UI (unchanged) + new charts (heatmap, leaderboard)
│   ├── lib/
│   │   ├── supabase/{client,server,admin,middleware}.ts   # SSR clients
│   │   ├── db/                    # Prisma client + repositories (same interface as v1)
│   │   ├── auth/                  # session, roles, RLS-aware guards
│   │   ├── ai/                    # provider interface + openai/claude/gemini adapters
│   │   ├── actions/               # Server Actions (Prisma-backed)
│   │   ├── analytics/  export/  validation/  # ♻ reused
│   │   └── admin/                 # ♻ reused resource registry
│   ├── hooks/                     # + TanStack Query hooks
│   └── config/  providers/        # + QueryClientProvider
```

**Dependency rule unchanged:** `domain/` → `lib/` → `components/`+`app/`. Swapping the data
store never touches `domain/`.

---

## 4. Data Model (15 tables — detail in Step 4)

`organizations` · `departments` · `employees` · `admins` · `assessment_categories` ·
`assessment_questions` · `assessment_sessions` · `assessment_answers` · `assessment_scores` ·
`readiness_levels` · `recommendations` · `reports` · `certificates` · `audit_logs` ·
`training_modules`.

- Every tenant row carries `organization_id` (multi-tenant, enforced by **RLS**, not app code).
- Prisma models mirror these; SQL migrations add RLS policies Prisma can't express.
- The reused domain types map onto these tables via the `lib/db` repositories.

---

## 5. Roles & Authorization (RLS-first)

| Role | Scope |
|---|---|
| **Super Admin** | Everything, all organizations |
| **Organization Admin** | Their organization only |
| **HR Admin** | Their org's people + analytics |
| **Trainer** | Assigned training + relevant results |
| **Employee** | Their own data only |
| **Guest** | Public / read-limited |

- Role stored in Supabase `auth.users.app_metadata.role` (+ `organization_id`) so it's available
  inside **RLS policies** (`auth.jwt()`), and mirrored to an `employees`/`admins` row.
- **RLS is the source of truth** — e.g. `employees` policy: a user reads a row only when
  `organization_id = auth.jwt()->>'organization_id'` (admins) or `user_id = auth.uid()` (self).
- `lib/auth/guards.ts` adds app-level role checks for routing; RLS is the hard boundary.

---

## 6. Authentication Flow (Supabase)

```
Landing → /login ──▶ Supabase Auth
   ├─ email + password
   ├─ Google OAuth ─┐
   ├─ Azure OAuth  ─┼─▶ /auth/callback (code exchange) → session cookie (SSR)
   ├─ Magic link  ─┘
   └─ Reset password
        │
   middleware.ts calls supabase.auth.getUser() → refreshes session, gates routes
        │
   role from JWT app_metadata → Employee/HR/Org/Super dashboards
```

- `@supabase/ssr` manages cookies across RSC / Route Handlers / middleware.
- New users complete a profile → an `employees` row + role assignment (default Employee).

---

## 7. API Surface

REST **Route Handlers** under `src/app/api/` **and** Server Actions:
`/api/auth` · `/api/assessment` · `/api/questions` · `/api/answers` · `/api/reports` ·
`/api/dashboard` · `/api/recommendations`. All validate with Zod, run under RLS, and audit-log
mutations.

## 8. AI Provider Abstraction

`lib/ai/provider.ts` defines a single `AIProvider` interface (`generate(prompt, opts)`); adapters
for **OpenAI**, **Claude**, **Gemini** implement it. A `getAIProvider(name)` factory picks by env
/ config. Report generators (executive summary, roadmap, dept/skill-gap analysis, adoption
strategy) call the interface, provider-agnostic.

## 9. Security

Supabase **RLS** (primary) · Zod input validation · rate limiting on Route Handlers · CSRF via
same-site secure cookies + server actions · `audit_logs` on every mutation · service-role key
**server-only**.

## 10. Environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only
DATABASE_URL=                        # Prisma (pooled)
DIRECT_URL=                          # Prisma migrations (direct)
OPENAI_API_KEY=  ANTHROPIC_API_KEY=  GOOGLE_AI_API_KEY=
```

---

## 11. Build Steps (this deliverable = Step 1)

1. **Project structure** ← *you are here*: architecture, folders, deps, Prisma/Supabase/AI
   skeletons, env template.
2. **Supabase setup** — SSR clients, middleware, storage buckets, local config.
3. **Authentication** — email + OAuth + magic link + reset, 6 roles, guards.
4. **Database schema** — Prisma models + SQL migrations + RLS; repository swap; seed.
5. **Assessment engine** — 10 sections, branching (reused dynamic renderer).
6. **Dashboards** — Super/Org/HR/Employee (radar, bar, heatmap, trend, leaderboard).
7. **Reporting** — org/dept/employee/exec/board; PDF/Word/PPT.
8. **AI recommendation engine** — multi-provider summaries + roadmaps.
9. **Testing** — unit (engines), integration (RLS), a11y.
10. **Deployment** — Vercel + Supabase, env, migrations.

**What I cannot do for you:** create your Supabase project, set real secret keys, or deploy to
Vercel (these need your accounts). Every artifact needed to do so is generated and documented.
