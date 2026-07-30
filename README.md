# AI Readiness Assessment Platform

[![CI](https://github.com/haziqhissham/airaa.v1/actions/workflows/ci.yml/badge.svg)](https://github.com/haziqhissham/airaa.v1/actions/workflows/ci.yml)

A production-ready, **multi-tenant** platform that measures organizational AI readiness across
ten dimensions and recommends targeted training. Employees complete a weighted assessment;
HR and admins get org-wide analytics and AI-generated reports.

> A diagnostic and advisory tool — not a quiz. Every question maps to a readiness category.

## Tech stack

Next.js 15 (App Router · RSC · Server Actions) · React 19 · TypeScript (strict) ·
**Supabase** (Auth · PostgreSQL · Storage · Row Level Security) · **Prisma** · TanStack Query ·
Tailwind CSS + shadcn/ui · Framer Motion · Recharts · **OpenAI / Claude / Gemini** ·
deployed on **Vercel**.

## Features

- **Auth** — email/password, Google & Azure OAuth, magic link, password reset; **6 roles**
  (Super Admin, Org Admin, HR Admin, Trainer, Employee, Guest) enforced by RLS.
- **Assessment** — 10 configurable sections, 4 question types, autosave & resume; generalized
  N-category weighted scoring → readiness tier (Beginner → AI Ready) + gap analysis.
- **Dashboards** — employee result (radar, gaps, recommendations, print), HR
  (donut · radar · bars · heatmap · leaderboard), Super Admin (all-orgs).
- **AI reports** — provider-agnostic narrative summaries (OpenAI / Claude / Gemini).
- **Reporting** — export to **PDF · Excel · Word (.docx) · PowerPoint (.pptx)**.
- **Admin CMS** — self-service CRUD for categories, questions, readiness levels, training
  modules and recommendation rules.
- **Hardening** — RLS + server-side authz, rate limiting, security headers, audit logs, 15 tests.

## Getting started

```bash
npm install
cp .env.example .env.local          # fill Supabase + AI keys
npm run db:generate                 # prisma client
npx prisma migrate deploy           # create tables
# then run supabase/migrations/*.sql (RLS + storage) in the Supabase SQL editor
npm run db:seed                     # demo org, 10 categories, questions, levels, modules
npm run dev
```

Open http://localhost:3000. Full setup: [`supabase/README.md`](./supabase/README.md).

## Docs

- [`ARCHITECTURE_V2.md`](./ARCHITECTURE_V2.md) — architecture, data model, RLS, auth flow
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — turnkey Vercel + Supabase deployment
- [`supabase/README.md`](./supabase/README.md) — database provisioning

## Project layout

```
prisma/            Prisma schema + seed
supabase/          config + SQL migrations (RLS + storage buckets)
src/
├── app/           routes (landing, auth, dashboard, assessment, result, hr, super, admin, api)
├── components/    UI (shadcn), layout, charts, admin, ai, export
├── domain/v2/     framework-free engine (scoring, recommendations) + tests
├── lib/
│   ├── supabase/  SSR clients + middleware
│   ├── db/        Prisma client, queries, analytics, result
│   ├── auth/      session, roles, guards, tenant
│   ├── ai/        provider interface + OpenAI/Claude/Gemini adapters
│   ├── admin/     resource registry + Prisma CRUD
│   ├── actions/   server actions   · export/  security/  validation/
└── hooks/  config/
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:studio` | Prisma |

## License

Private / proprietary.
