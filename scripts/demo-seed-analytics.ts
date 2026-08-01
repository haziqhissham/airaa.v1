/**
 * Demo analytics seed — populates the demo tenant with 20 sample employees who
 * have *completed* the assessment, so the HR, Admin and Super Admin dashboards
 * render with realistic data (readiness distribution, department comparison,
 * heat map, leaderboard, category profile) instead of the "No results yet"
 * empty state.
 *
 * Each sample employee gets:
 *   • a profile row (random name, one of several departments, job details)
 *   • a SUBMITTED assessment session with a full set of real answers
 *   • an assessment_scores row computed by the same scoring rules as a real
 *     submission (per-category 0..100 → weighted overall → readiness tier)
 *
 * Abilities are spread across all four readiness tiers (Beginner → AI Advanced)
 * and lightly biased by department so the charts tell a believable story.
 *
 * These are display-only sample records — they do NOT create Supabase auth
 * logins (employees.user_id is a synthetic UUID). The dashboards read them via
 * Prisma. Real accounts are untouched. TESTING / DEMO ONLY.
 *
 * Idempotent: sample employees are tagged with the `@sample.glow.test` email
 * domain and fully removed (cascade) at the start of every run.
 *
 * Usage: set DATABASE_URL + DIRECT_URL, then `npm run db:seed:demo`
 * (optionally `npm run db:seed:demo -- 30` to seed a different count).
 */

import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient, type Prisma } from "@prisma/client";

config({ path: ".env.local" });
config();
const prisma = new PrismaClient();

const SAMPLE_DOMAIN = "@sample.glow.test";
const COUNT = Math.max(1, Number(process.argv[2] ?? process.env.DEMO_EMPLOYEE_COUNT ?? 20));

// ── tiny stats helpers ────────────────────────────────────────────────
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clamp100 = (n: number) => Math.min(100, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;
/** Standard-normal noise (Box–Muller). */
function gauss(mean = 0, sd = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── scoring (faithful copy of src/domain/v2/scoring.ts — kept dependency-free
//    so this runs under plain `tsx` without path-alias / server-only setup) ──
interface QOption { label: string; value: string; score: number }
interface Q { id: string; type: string; weight: number; options: QOption[] }

function scoreQuestion(q: Q, answer: string | string[]): { score: number; scored: boolean } {
  const opts = q.options;
  if (q.type === "OPEN_TEXT" || opts.length === 0) return { score: 0, scored: false };
  const maxOpt = Math.max(1, ...opts.map((o) => o.score));

  if (q.type === "MULTIPLE_CHOICE") {
    const selected = (Array.isArray(answer) ? answer : [answer]).map(String);
    const totalPossible = opts.reduce((a, o) => a + Math.max(0, o.score), 0);
    if (totalPossible <= 0) return { score: 0, scored: false };
    const got = selected.reduce((sum, v) => sum + (opts.find((o) => o.value === v)?.score ?? 0), 0);
    return { score: round1(clamp100((got / totalPossible) * 100)), scored: true };
  }

  // LIKERT & SINGLE_CHOICE: single value → its option's score, normalised to 100.
  const val = Array.isArray(answer) ? answer[0] : answer;
  const opt = opts.find((o) => o.value === String(val));
  return { score: round1(clamp100(((opt?.score ?? 0) / maxOpt) * 100)), scored: true };
}

function scoreCategory(questions: Q[], answers: Record<string, string | string[]>): number {
  let weighted = 0;
  let weightSum = 0;
  for (const q of questions) {
    const { score, scored } = scoreQuestion(q, answers[q.id]!);
    if (!scored) continue;
    const w = q.weight > 0 ? q.weight : 1;
    weighted += score * w;
    weightSum += w;
  }
  return weightSum > 0 ? round1(weighted / weightSum) : 0;
}

// ── answer generation: choose answers so a question's resulting 0..100 score
//    tracks the employee's ability for that category. ─────────────────────
/** Pick an answer value for one question, given a 0..1 target ability. */
function answerFor(q: Q, ability: number): string | string[] | null {
  const opts = q.options;
  if (q.type === "OPEN_TEXT" || opts.length === 0) return null;
  const maxOpt = Math.max(1, ...opts.map((o) => o.score));
  const norms = opts.map((o) => o.score / maxOpt);
  const binary = norms.every((n) => n === 0 || n === 1);

  if (q.type === "MULTIPLE_CHOICE") {
    const positives = opts.filter((o) => o.score > 0);
    const chosen = positives.filter(() => Math.random() < ability).map((o) => o.value);
    return chosen.length ? chosen : [pick(positives).value];
  }

  if (binary) {
    // Correct-vs-incorrect item (MCQ / situational): correct with prob = ability.
    const correct = opts.filter((o) => o.score === maxOpt);
    const wrong = opts.filter((o) => o.score < maxOpt);
    if (Math.random() < ability && correct.length) return pick(correct).value;
    return pick(wrong.length ? wrong : correct).value;
  }

  // Graded item (Likert): pick the option whose normalised score is closest to
  // the (noisy) target — this handles reverse-scored items automatically.
  const target = clamp01(ability + gauss(0, 0.08));
  let best = opts[0]!;
  let bestGap = Infinity;
  for (const o of opts) {
    const gap = Math.abs(o.score / maxOpt - target);
    if (gap < bestGap) { bestGap = gap; best = o; }
  }
  return best.value;
}

// ── sample people ─────────────────────────────────────────────────────
const FIRST = [
  "Nurul", "Ahmad", "Siti", "Mohd", "Aisyah", "Faiz", "Wei Ling", "Jun Hao",
  "Kavitha", "Arjun", "Priya", "Daniel", "Sarah", "Amir", "Farah", "Hafiz",
  "Mei Chen", "Ravi", "Aina", "Zulkifli", "Chloe", "Iskandar", "Divya", "Haziq",
];
const LAST = [
  "Abdullah", "Tan", "Rahman", "Lim", "Ismail", "Wong", "Krishnan", "Yusof",
  "Lee", "Nair", "Hassan", "Ng", "Rajah", "Salleh", "Chong", "Bakar",
  "Menon", "Aziz", "Goh", "Subramaniam",
];

// Departments with a small ability bias (offset in ability units, ±0.1) so the
// department comparison + heat map + lowest-departments cards have a story.
const DEPARTMENTS: { name: string; division: string; bias: number }[] = [
  { name: "Information Technology", division: "Technology", bias: 0.12 },
  { name: "Finance", division: "Corporate Services", bias: 0.03 },
  { name: "Marketing", division: "Commercial", bias: 0.0 },
  { name: "Human Resources", division: "Corporate Services", bias: -0.02 },
  { name: "Operations", division: "Operations", bias: -0.06 },
  { name: "Customer Service", division: "Operations", bias: -0.1 },
];

const POSITIONS = ["Executive", "Senior Executive", "Assistant Manager", "Manager", "Specialist", "Analyst", "Officer"];
const GRADES = ["G4", "G5", "G6", "M1", "M2"];
const AGE_GROUPS = ["21-30", "31-40", "41-50", "51-60"];
const LOCATIONS = ["Johor Bahru HQ", "Kuala Lumpur", "Iskandar Puteri", "Remote"];

/** Target overall-ability bands, spread across all four readiness tiers. */
function abilityBands(n: number): number[] {
  // Roughly bell-shaped org: fewer at the extremes, most in the middle tiers.
  const mix = [
    { lo: 0.24, hi: 0.38, share: 0.15 }, // Beginner   (0–39)
    { lo: 0.42, hi: 0.58, share: 0.3 },  // Emerging   (40–59)
    { lo: 0.62, hi: 0.78, share: 0.35 }, // AI Ready   (60–79)
    { lo: 0.82, hi: 0.94, share: 0.2 },  // AI Advanced(80–100)
  ];
  const out: number[] = [];
  for (const m of mix) {
    const k = Math.round(n * m.share);
    for (let i = 0; i < k; i++) out.push(m.lo + Math.random() * (m.hi - m.lo));
  }
  while (out.length < n) out.push(0.5 + Math.random() * 0.25);
  return out.slice(0, n);
}

// ── main ──────────────────────────────────────────────────────────────
async function main() {
  const org =
    (await prisma.organization.findFirst({ where: { slug: process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ?? "demo" } })) ??
    (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!org) throw new Error("No organization found — run `npm run db:seed` first.");
  console.log(`\n🌱 Seeding ${COUNT} sample employees for: ${org.name} (${org.slug})`);

  // Assessment form (categories + questions) for this org.
  const cats = await prisma.assessmentCategory.findMany({
    where: { organizationId: org.id, active: true },
    orderBy: { order: "asc" },
    include: { questions: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  if (!cats.length || !cats.some((c) => c.questions.length)) {
    throw new Error("No assessment questions found — run `npm run db:seed` first.");
  }
  const levels = await prisma.readinessLevel.findMany({
    where: { organizationId: org.id },
    orderBy: { minScore: "asc" },
  });
  // Gap-safe: exact band, else the highest band whose min ≤ score (fractional
  // scores like 39.3 fall in the 39–40 gap between integer band bounds).
  const asc = [...levels].sort((a, b) => a.minScore - b.minScore);
  const classify = (overall: number) =>
    asc.find((l) => overall >= l.minScore && overall <= l.maxScore) ??
    [...asc].reverse().find((l) => overall >= l.minScore) ??
    asc[0] ?? null;

  // Map DB questions → local scoring shape.
  const toQ = (q: (typeof cats)[number]["questions"][number]): Q => ({
    id: q.id,
    type: q.type,
    weight: q.weight,
    options: Array.isArray(q.options) ? (q.options as unknown as QOption[]) : [],
  });

  // Ensure the sample departments exist (create any missing).
  const deptByName = new Map<string, string>();
  for (const d of DEPARTMENTS) {
    const existing = await prisma.department.findFirst({ where: { organizationId: org.id, name: d.name } });
    const dept = existing ?? (await prisma.department.create({
      data: { organizationId: org.id, name: d.name, division: d.division },
    }));
    deptByName.set(d.name, dept.id);
  }

  // Clean slate: remove previously-seeded sample employees (cascade wipes their
  // sessions, answers and scores). Real accounts are on other email domains.
  const removed = await prisma.employee.deleteMany({
    where: { organizationId: org.id, email: { endsWith: SAMPLE_DOMAIN } },
  });
  if (removed.count) console.log(`  ↺ cleared ${removed.count} previous sample employee(s)`);

  // Unique random names.
  const usedNames = new Set<string>();
  const nameFor = () => {
    for (let i = 0; i < 200; i++) {
      const name = `${pick(FIRST)} ${pick(LAST)}`;
      if (!usedNames.has(name)) { usedNames.add(name); return name; }
    }
    return `${pick(FIRST)} ${pick(LAST)} ${usedNames.size}`;
  };

  const bands = abilityBands(COUNT).sort(() => Math.random() - 0.5);
  const tierTally = new Map<string, number>();
  let sum = 0;

  for (let i = 0; i < COUNT; i++) {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length]!; // round-robin → mixed depts
    const departmentId = deptByName.get(dept.name)!;
    const name = nameFor();
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}.${i + 1}${SAMPLE_DOMAIN}`;
    const baseAbility = bands[i]!;

    const employee = await prisma.employee.create({
      data: {
        userId: randomUUID(), // synthetic — no auth login (display-only sample)
        organizationId: org.id,
        departmentId,
        employeeCode: `DEMO-${String(i + 1).padStart(3, "0")}`,
        name,
        email,
        jobPosition: pick(POSITIONS),
        jobGrade: pick(GRADES),
        yearsOfService: 1 + Math.floor(Math.random() * 18),
        ageGroup: pick(AGE_GROUPS),
        officeLocation: pick(LOCATIONS),
        role: "EMPLOYEE",
      },
    });

    // Per-category ability = base + department bias + noise (independent noise
    // per category → varied radar + heat map).
    const answers: Record<string, string | string[]> = {};
    for (const c of cats) {
      const ability = clamp01(baseAbility + dept.bias + gauss(0, 0.06));
      for (const dbq of c.questions) {
        const a = answerFor(toQ(dbq), ability);
        if (a !== null) answers[dbq.id] = a;
      }
    }

    // Compute scores exactly like a real submission.
    const categoryScores: Record<string, number> = {};
    for (const c of cats) categoryScores[c.id] = scoreCategory(c.questions.map(toQ), answers);
    let weighted = 0, weightSum = 0;
    for (const c of cats) {
      const w = c.weight > 0 ? c.weight : 1;
      weighted += categoryScores[c.id]! * w;
      weightSum += w;
    }
    const overallScore = weightSum > 0 ? round1(weighted / weightSum) : 0;
    const tier = classify(overallScore);

    // Gap analysis (strengths ≥ 60, gaps < 50) — mirrors analyzeGaps().
    const rows = cats
      .map((c) => ({ id: c.id, name: c.name, score: categoryScores[c.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    const strengths = rows.filter((r) => r.score >= 60);
    if (!strengths.length && rows.length) strengths.push(rows[0]!);
    const gaps = [...rows].reverse().filter((r) => r.score < 50);

    // Submitted session + answers + score.
    const session = await prisma.assessmentSession.create({
      data: {
        organizationId: org.id,
        employeeId: employee.id,
        status: "SUBMITTED",
        progress: 100,
        currentCategoryId: cats.at(-1)!.id,
        submittedAt: new Date(),
      },
    });
    await prisma.assessmentAnswer.createMany({
      data: Object.entries(answers).map(([questionId, value]) => ({
        sessionId: session.id,
        questionId,
        value: value as Prisma.InputJsonValue,
      })),
    });
    await prisma.assessmentScore.create({
      data: {
        sessionId: session.id,
        organizationId: org.id,
        employeeId: employee.id,
        overallScore,
        readinessLevelId: tier?.id ?? null,
        categoryScores: categoryScores as Prisma.InputJsonValue,
        gapAnalysis: { strengths, gaps } as unknown as Prisma.InputJsonValue,
      },
    });

    sum += overallScore;
    const tierLabel = tier?.label ?? "—";
    tierTally.set(tierLabel, (tierTally.get(tierLabel) ?? 0) + 1);
    console.log(`  ✓ ${name.padEnd(22)} ${dept.name.padEnd(24)} ${String(overallScore).padStart(5)}  ${tierLabel}`);
  }

  console.log(`\n✅ Seeded ${COUNT} completed assessments · avg ${round1(sum / COUNT)}/100`);
  console.log(`   Tier spread: ${[...tierTally.entries()].map(([t, n]) => `${t} ${n}`).join(" · ")}`);
  console.log(`   View: /hr (HR dashboard) · /admin (overview) · /super (platform)\n`);
}

main()
  .catch((e) => { console.error("❌ Demo analytics seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
