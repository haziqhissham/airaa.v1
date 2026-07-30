/**
 * Prisma seed — provisions a demo tenant with the v2 model:
 * 10 assessment categories, 5 readiness levels, Likert questions per category,
 * training modules and recommendation rules.
 *
 * Usage: set DATABASE_URL + DIRECT_URL, run migrations, then `npm run db:seed`.
 * Idempotent via deterministic slugs/keys + upsert.
 */

import { config } from "dotenv";
import { PrismaClient, QuestionType, ModuleLevel } from "@prisma/client";

// Load env for standalone `tsx prisma/seed.ts` runs (prefers .env.local, then .env).
config({ path: ".env.local" });
config();

const prisma = new PrismaClient();

const ORG_SLUG = "demo";

const CATEGORIES: { key: string; name: string; description: string }[] = [
  { key: "LEADERSHIP", name: "Leadership", description: "Executive sponsorship and vision for AI." },
  { key: "GOVERNANCE", name: "Governance", description: "Policies, oversight and accountability for AI." },
  { key: "TECHNOLOGY", name: "Technology", description: "Infrastructure and tooling readiness." },
  { key: "PEOPLE", name: "People", description: "Skills, roles and change readiness." },
  { key: "SECURITY", name: "Security", description: "AI security, privacy and risk controls." },
  { key: "CULTURE", name: "Culture", description: "Openness to experimentation and learning." },
  { key: "INNOVATION", name: "Innovation", description: "Capacity to pilot and scale new ideas." },
  { key: "DATA", name: "Data", description: "Data quality, access and management." },
  { key: "AUTOMATION", name: "Automation", description: "Process automation maturity." },
  { key: "AI_ETHICS", name: "AI Ethics", description: "Responsible and fair use of AI." },
];

const LIKERT_OPTIONS = [
  { label: "Strongly disagree", value: "1", score: 1 },
  { label: "Disagree", value: "2", score: 2 },
  { label: "Neutral", value: "3", score: 3 },
  { label: "Agree", value: "4", score: 4 },
  { label: "Strongly agree", value: "5", score: 5 },
];

/** Two representative statements per category (extend via Admin panel). */
const QUESTION_STEMS: Record<string, string[]> = {
  LEADERSHIP: [
    "Our leaders actively champion the use of AI.",
    "There is a clear, communicated AI vision for our organization.",
  ],
  GOVERNANCE: [
    "We have clear policies governing how AI may be used.",
    "Accountability for AI decisions is well defined.",
  ],
  TECHNOLOGY: [
    "Our systems and tools can support AI adoption.",
    "We can integrate AI tools with existing workflows.",
  ],
  PEOPLE: [
    "Our people have the skills to use AI effectively.",
    "Teams are supported through AI-driven change.",
  ],
  SECURITY: [
    "We manage the security risks of AI appropriately.",
    "Privacy is protected when we use AI on our data.",
  ],
  CULTURE: [
    "Experimenting with AI is encouraged here.",
    "We learn quickly from AI pilots that fail.",
  ],
  INNOVATION: [
    "We can move an AI idea from concept to pilot quickly.",
    "Successful AI pilots get scaled across the organization.",
  ],
  DATA: [
    "Our data is accurate and well organized for AI.",
    "Teams can access the data they need for AI.",
  ],
  AUTOMATION: [
    "We automate repetitive tasks where it makes sense.",
    "We identify automation opportunities systematically.",
  ],
  AI_ETHICS: [
    "We consider fairness and bias when using AI.",
    "Our AI use is transparent to those it affects.",
  ],
};

const READINESS_LEVELS = [
  { tier: "BEGINNER", label: "Beginner", min: 0, max: 20, color: "#94a3b8", description: "Early awareness; foundational steps needed." },
  { tier: "EMERGING", label: "Emerging", min: 21, max: 40, color: "#60a5fa", description: "Building blocks forming; pockets of activity." },
  { tier: "DEVELOPING", label: "Developing", min: 41, max: 60, color: "#3b82f6", description: "Consistent progress; scaling practices." },
  { tier: "ADVANCED", label: "Advanced", min: 61, max: 80, color: "#2563eb", description: "Mature capability across most areas." },
  { tier: "AI_READY", label: "AI Ready", min: 81, max: 100, color: "#1d4ed8", description: "Leading practice; AI embedded org-wide." },
] as const;

const MODULES = [
  { code: "AI-LEAD", title: "AI Leadership & Strategy", category: "LEADERSHIP", level: "INTERMEDIATE", skills: ["Vision setting", "AI roadmap", "Change leadership"] },
  { code: "AI-GOV", title: "AI Governance & Risk", category: "GOVERNANCE", level: "INTERMEDIATE", skills: ["Policy design", "Model oversight", "Compliance"] },
  { code: "AI-DATA", title: "Data Readiness for AI", category: "DATA", level: "FOUNDATION", skills: ["Data quality", "Data access", "Analytics"] },
  { code: "AI-ETHICS", title: "Responsible & Ethical AI", category: "AI_ETHICS", level: "FOUNDATION", skills: ["Fairness", "Transparency", "Bias mitigation"] },
  { code: "AI-AUTO", title: "Practical AI Automation", category: "AUTOMATION", level: "FOUNDATION", skills: ["Process mapping", "Workflow automation", "Copilot"] },
] as const;

async function main() {
  console.log("🌱 Seeding v2 tenant + assessment model…\n");

  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: {
      name: process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? "Demo Organisation",
      slug: ORG_SLUG,
      status: "ACTIVE",
    },
  });
  const orgId = org.id;
  console.log(`  ✓ organization: ${org.name}`);

  const existingDept = await prisma.department.findFirst({
    where: { organizationId: orgId },
  });
  if (!existingDept) {
    await prisma.department.create({
      data: { organizationId: orgId, name: "General", division: "Corporate" },
    });
  }

  // Readiness levels
  for (const [i, l] of READINESS_LEVELS.entries()) {
    await prisma.readinessLevel.upsert({
      where: { organizationId_tier: { organizationId: orgId, tier: l.tier } },
      update: { label: l.label, minScore: l.min, maxScore: l.max, order: i, color: l.color, description: l.description },
      create: { organizationId: orgId, tier: l.tier, label: l.label, minScore: l.min, maxScore: l.max, order: i, color: l.color, description: l.description },
    });
  }
  console.log(`  ✓ readiness levels: ${READINESS_LEVELS.length}`);

  // Categories + questions
  let qCount = 0;
  for (const [i, c] of CATEGORIES.entries()) {
    const category = await prisma.assessmentCategory.upsert({
      where: { organizationId_key: { organizationId: orgId, key: c.key } },
      update: { name: c.name, description: c.description, order: i, weight: 1 / CATEGORIES.length },
      create: { organizationId: orgId, key: c.key, name: c.name, description: c.description, order: i, weight: 1 / CATEGORIES.length },
    });

    const stems = QUESTION_STEMS[c.key] ?? [];
    // Replace existing questions for a clean re-seed.
    await prisma.assessmentQuestion.deleteMany({ where: { categoryId: category.id } });
    for (const [qi, text] of stems.entries()) {
      await prisma.assessmentQuestion.create({
        data: {
          organizationId: orgId,
          categoryId: category.id,
          order: qi,
          type: QuestionType.LIKERT,
          text,
          required: true,
          weight: 1,
          maxScore: 5,
          options: LIKERT_OPTIONS,
        },
      });
      qCount += 1;
    }
  }
  console.log(`  ✓ categories: ${CATEGORIES.length}, questions: ${qCount}`);

  // Training modules (clean re-seed)
  await prisma.trainingModule.deleteMany({ where: { organizationId: orgId } });
  const moduleIdByCode = new Map<string, string>();
  for (const m of MODULES) {
    const cat = await prisma.assessmentCategory.findUnique({
      where: { organizationId_key: { organizationId: orgId, key: m.category } },
    });
    const created = await prisma.trainingModule.create({
      data: {
        organizationId: orgId,
        categoryId: cat?.id,
        code: m.code,
        title: m.title,
        level: m.level as ModuleLevel,
        skills: [...m.skills],
      },
    });
    moduleIdByCode.set(m.code, created.id);
  }
  console.log(`  ✓ training modules: ${MODULES.length}`);

  // A couple of recommendation rules
  await prisma.recommendation.deleteMany({ where: { organizationId: orgId } });
  await prisma.recommendation.createMany({
    data: [
      {
        organizationId: orgId,
        label: "Low data readiness → Data course",
        priority: 10,
        conditions: { categories: ["DATA"], maxScore: 50 },
        moduleIds: [moduleIdByCode.get("AI-DATA")].filter(Boolean) as string[],
        reasonTemplate: "Your data readiness is still developing — {module} builds the foundations.",
      },
      {
        organizationId: orgId,
        label: "Foundational overall → Ethics + Automation",
        priority: 90,
        conditions: { maxScore: 40 },
        moduleIds: [moduleIdByCode.get("AI-ETHICS"), moduleIdByCode.get("AI-AUTO")].filter(Boolean) as string[],
        reasonTemplate: "Start with {module} to build responsible, practical AI habits.",
      },
    ],
  });
  console.log("  ✓ recommendation rules: 2");

  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
