# MDEC AI Readiness Assessment Platform — Architecture

**Product:** MDEC AI Readiness Assessment · **Model:** White-label, multi-tenant SaaS
**First tenant:** Johor Land Berhad (JLG) — provisioned purely as *data*, never hardcoded.

This document is the single source of truth. Every collection, route and engine described
here maps to real code in the repository.

---

## 1. Purpose

Measure **employee AI readiness** and recommend the most suitable **MDEC AI training
programme**. It is a diagnostic/advisory tool — **not** a quiz. Every question maps to a
readiness dimension; every answer maps to a dimension-score contribution.

**Outcomes:** complete a six-section assessment → five dimension scores + one weighted overall
(0–100) → AI persona → one or more training recommendations (score **and** job function) → HR
analytics.

---

## 2. Multi-Tenant / White-Label Design

The platform serves many organizations. **Nothing is hardcoded to a specific client.**

- Every tenant-scoped document carries **`organizationId`**. The `TenantRepository` binds to an
  org via `.forOrg(orgId)` and **auto-filters reads / auto-stamps writes** — guaranteeing no
  cross-tenant leakage.
- Each **Organization** owns: profile, **logo**, **theme** (brand colours → CSS variables),
  default **assessment version**, **departments**, **training catalogue**, **personas**,
  **recommendation rules**, employees and reports.
- **Tenant resolution** (`lib/auth/tenant.ts`): authenticated requests use the org on the
  user's session; public requests resolve by **host/subdomain** (`organizations.domains`) or an
  env default. All resolution is wrapped so public pages still render when the Admin SDK is
  unconfigured (a neutral fallback org is used).
- **Branding is data-driven**: the landing + auth shells read the resolved org's name/logo/theme.
- JLG is seeded under `organizations/org-jlg`. Swapping/adding a tenant is a data operation.

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, RSC, Server Actions) |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| UI | Tailwind CSS v3 + shadcn/ui · Framer Motion · Recharts |
| Auth | Firebase Auth (email/password) + **HttpOnly session cookies** |
| Database | Cloud Firestore (Repository Pattern) |
| Files | Firebase Storage (report PDFs, org logos) |
| Server | Server Actions + Cloud Functions; Admin SDK on Node runtime |
| Hosting | Vercel |
| Validation | Zod (shared client + server) · React Hook Form |
| Future AI | Claude API (narrative reports) |

---

## 4. Folder Structure

```
├── ARCHITECTURE.md · README.md
├── firestore.rules · firestore.indexes.json · storage.rules · firebase.json
├── scripts/seed.ts                 # provisions the first tenant + catalogue
├── src/
│   ├── middleware.ts               # edge role-gate (cookie presence)
│   ├── app/
│   │   ├── page.tsx                # (1) Landing (white-label)
│   │   ├── (auth)/                 # login · register · forgot-password (+ shell)
│   │   ├── dashboard/              # employee home (guarded)
│   │   ├── assessment/ · result/   # (later modules)
│   │   ├── hr/ · admin/            # role-gated areas
│   │   ├── api/session/route.ts    # idToken → session cookie (POST/DELETE)
│   │   └── layout.tsx · globals.css
│   ├── components/{ui,layout,auth,marketing,shared,charts,providers}
│   ├── domain/                     # ⭐ framework-free business core
│   │   ├── enums.ts · types/
│   │   ├── scoring/  persona/  recommendation/  assessment/(assembler)
│   ├── lib/
│   │   ├── firebase/  {client,admin,collections}      # lazy-init SDKs
│   │   ├── repositories/  {repository,index}          # multi-tenant Repository Pattern
│   │   ├── auth/  {session,tenant,guards}
│   │   ├── actions/  {auth}                            # Server Actions
│   │   ├── validation/  {auth}                         # Zod schemas
│   │   └── seed/                                       # seed data (data, not logic)
│   ├── config/  {site,nav}   └── hooks/
```

**Dependency rule:** `domain/` depends on nothing app-specific → `lib/` → `components/`+`app/`.
The engines are pure and unit-testable.

---

## 5. Firestore Data Model (16 collections)

All tenant-scoped docs carry `organizationId`, `createdAt`, `updatedAt`.

| Collection | Key fields | Notes |
|---|---|---|
| `organizations` | name, code, status, logoUrl, **theme**, defaultVersionId, domains[] | tenant root (unscoped) |
| `users` | uid, email, **role**, status, profileComplete | auth identity + authorization |
| `employees` | uid, employeeId, name, departmentId, division, jobPosition, jobGrade, yearsOfService, ageGroup, officeLocation, **jobFunction** | rich HR profile (1:1 user) |
| `departments` | name, division, **jobFunction**, headcount | lookup + grouping |
| `job_roles` | title, jobFunction, jobGrade, defaultRole | lookup |
| `assessment_versions` | title, description, status, isDefault | supports multiple editions |
| `assessment_sections` | versionId, key(A–F), dimension, order, **weight** | ⭐ **configurable dimension weights** |
| `questions` | versionId, sectionId, section, dimension, order, type, required, weight, scoreMode, maxScore | **no inline options** |
| `question_options` | questionId, order, label, value, **score** | normalized options |
| `assessments` | uid, versionId, status, currentSection, progress | in-progress run (resume) |
| `responses` | assessmentId, uid, answers{qid→value} | autosaved |
| `assessment_results` | uid, dimensionScores, overallScore, persona, strengths, areasToImprove, recommendations[], learningPath[] | immutable snapshot |
| `personas` | key, label, **min, max**, order, tagline, description, accent | ⭐ **configurable persona tiers** |
| `training_programmes` | code, title, level, skills[], jobFunctions[], minScore, maxScore | per-tenant catalogue |
| `recommendation_rules` | priority, conditions{jobFunctions,departmentIds,personas,min/maxScore,dimensionBelow}, programmeCodes[], reasonTemplate, stopOnMatch | ⭐ **data-driven rules** |
| `audit_logs` | action, actorUid, targetType/Id, metadata, at | operations trail |
| `system_settings` | key, value, description | per-org (or GLOBAL) config |

Question types: `MULTIPLE_CHOICE · CHECKBOX · LIKERT · DROPDOWN`. Score modes: `MAX · SUM · LIKERT`.

---

## 6. Authentication & Authorization Flow

```
Landing ─► /login ──(email/pw, Web SDK)──► idToken ──► POST /api/session
                                                          │  (Admin SDK verifies, mints
                                                          ▼   HttpOnly session cookie)
                                              middleware checks cookie presence (edge)
                                                          │
   /register (new user): create account → session → completeRegistration()  ────────┐
     writes users/{uid} + employees/{uid}, sets custom claims {role, orgId},         │
     refresh token → re-mint cookie with claims                                       ▼
                     server components call requireUser/requireRole (Firestore-authoritative)
                        EMPLOYEE→/dashboard · HR→/hr · ADMIN→/admin
```

- **Session cookies** keep RSC/Server Actions authenticated without shipping tokens client-side.
- **Role + orgId** live on `users/{uid}` (authoritative) and are mirrored to **custom claims**
  for Firestore Security Rules.
- **Two-tier gate:** middleware (edge) checks cookie presence; `lib/auth/guards.ts` does
  authoritative role/profile checks in server components (`requireUser`, `requireProfile`,
  `requireRole`).

---

## 7. Navigation

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | White-label landing (intro, duration, privacy, Start) |
| `/login` `/register` `/forgot-password` | Public | Firebase email auth |
| `/dashboard` | EMPLOYEE+ | Employee home |
| `/assessment` · `/result/[id]` | EMPLOYEE+ | Assessment flow · result (later modules) |
| `/hr` | HR, ADMIN | Org analytics (later module) |
| `/admin` | ADMIN | CMS (later module) |

---

## 8. Scoring Engine (`domain/scoring/`)

1. **Per-question raw score** from options via `scoreMode` (LIKERT normalizes 1–5; SUM caps
   checkbox sums; MAX takes the chosen option).
2. **Per-dimension score (0–100)** = weighted average of normalized question scores.
3. **Weighted overall (0–100)** using dimension weights **read from `assessment_sections`**
   (configurable): Awareness 20% · Exposure 20% · Confidence 25% · Adoption 20% · Mindset 15%
   (defaults; `weightsFromSections()` derives them, defensively normalized).

## 9. Persona Engine (`domain/persona/`)

`classifyPersona(score, personas)` maps the overall score to a tier using the **configurable
`personas` collection** (Unaware 0–20 · Curious 21–40 · Explorer 41–60 · Practitioner 61–80 ·
Champion 81–100 by default). Also derives strengths/areas-to-improve.

## 10. Recommendation Engine (`domain/recommendation/`)

A transparent rule engine keyed off **both** readiness (score / persona / weak dimension) **and**
**job function / department**. Rules come from `recommendation_rules` (priority-ordered), matched
against the `training_programmes` catalogue → deduped, ranked recommendations + a level-ordered
learning path. Baseline mapping: Admin→Office Mgmt · Sales→Sales CX · Finance→Data Analytics ·
HR→Copilot · Management→multiple.

The **Result Assembler** (`domain/assessment/result-assembler.ts`) composes scoring + persona +
recommendation into the immutable `assessment_results` document.

---

## 11. Security Rules (`firestore.rules`)

Owner-only reads/writes for personal docs; `results` are server-written only; catalogue is
auth-read / admin-write; everything scoped by the `orgId` custom claim for tenant isolation.
Storage rules protect report PDFs (owner/HR) and org logos (admin-write).

---

## 12. Delivery Modules

1. **Foundation + Module 1 (done):** architecture, domain core, multi-tenant infra, design
   system, **landing + email auth + registration + forgot-password + session cookies +
   role middleware**, seed data.
2. **Assessment engine** — dynamic renderers, autosave, resume.
3. **Scoring → result page** — radar, persona, learning path, printable report.
4. **HR dashboard** — charts + PDF/Excel export.
5. **Admin panel** — CMS for all catalogue collections + organizations.
6. **Claude AI reports**, a11y, tests, Vercel deploy.

## 13. Coding Standards

Modular architecture · multi-tenant Repository Pattern · Server Actions for writes · Zod shared
validation · reusable shadcn components · typed errors + toasts · loading skeletons · dark mode ·
responsive · WCAG AA · audit logging.
