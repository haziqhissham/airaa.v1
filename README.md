# MDEC AI Readiness Assessment Platform

Measures employee **AI readiness** and recommends the most suitable **MDEC AI training
programme**. First client implementation: **Johor Land Berhad (JLG)**. Multi-tenant by design
(`clientCode`).

> This is a diagnostic and advisory tool — **not** an AI quiz. There are no right or wrong
> answers; every question maps to a readiness dimension.

## Tech stack

Next.js 15 (App Router · RSC · Server Actions) · TypeScript (strict) · Tailwind CSS + shadcn/ui ·
Framer Motion · Recharts · Firebase (Auth / Firestore / Storage / Cloud Functions) · Vercel.
Future: Claude API for narrative report generation.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Firebase credentials
npm run dev
```

Open http://localhost:3000.

### Seed the Firestore catalogue

Questions, the assessment version, training programmes, recommendation rules, departments and
roles are **stored in Firestore, never hardcoded**. Populate them with:

```bash
npm run seed
```

(Requires Firebase Admin credentials in `.env.local` — see `.env.example`.)

## Project layout

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full architecture, Firestore schema, auth
flow, navigation and the scoring / persona / recommendation engine designs.

```
src/
├── app/            Next.js routes (landing, auth, employee, hr, admin)
├── components/     UI primitives (shadcn), layout, charts, shared
├── domain/         Framework-free business core (enums, types, scoring, persona, recommendation)
├── lib/            Firebase wiring, repositories, server actions, validation, seed data
├── config/         Site + navigation config
└── hooks/          React hooks
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed` | Seed Firestore catalogue |

## Build phases

1. **Foundation** ✅ — architecture, domain core, Firebase, design system, landing, seed data.
2. Landing + auth (login / register / forgot) + session + middleware.
3. Assessment engine (dynamic questions, autosave, resume).
4. Result page (radar, persona, learning path, printable report).
5. HR dashboard (charts + PDF/Excel export).
6. Admin panel + Claude AI reports + deploy.
