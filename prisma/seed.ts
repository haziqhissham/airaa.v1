/**
 * Prisma seed — MDEC AI Readiness & Adoption Assessment (AIRA), Pilot v1.0.
 * Provisions the JLAND pilot tenant with the AIRA model:
 *   • 3 assessment categories (A Knowledge 35% · B Readiness 35% · C Workplace 30%)
 *   • 45 questions (15 MCQ, 15 Likert incl. reverse-scored, 15 situational)
 *   • 4 readiness levels / AI personas (Beginner→AI Advanced)
 *   • 4 MDEC training programmes
 *   • 4 role/department/workplace-aware recommendation rules
 *
 * Usage: set DATABASE_URL + DIRECT_URL, run migrations, then `npm run db:seed`.
 * Idempotent via deterministic slugs/keys + upsert. Question sets are replaced
 * on each run (clean re-seed) so historical results are unaffected.
 */

import { config } from "dotenv";
import { PrismaClient, QuestionType, ModuleLevel } from "@prisma/client";
import { READINESS_BANDS } from "../src/domain/v2/readiness";

// Load env for standalone `tsx prisma/seed.ts` runs (prefers .env.local, then .env).
config({ path: ".env.local" });
config();

const prisma = new PrismaClient();

const ORG_SLUG = process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ?? "demo";
const ORG_NAME = process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ?? "JLAND Group Berhad";

// ─────────────────────────────────────────────────────────────
// Categories (weights sum to 1.0 → overall = A·0.35 + B·0.35 + C·0.30)
// ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "A", name: "AI Knowledge & Awareness", description: "Understanding of AI, generative AI, responsible use, prompting and governance.", weight: 0.35 },
  { key: "B", name: "AI Readiness, Confidence & Adoption Mindset", description: "Confidence, adoption mindset, willingness to learn and responsible use.", weight: 0.35 },
  { key: "C", name: "AI Workplace Scenarios", description: "Applying AI appropriately in everyday workplace situations (judgement).", weight: 0.30 },
] as const;

// ─────────────────────────────────────────────────────────────
// Category A — AI Knowledge & Awareness (15 MCQ, single best answer)
// ─────────────────────────────────────────────────────────────
interface McqInput {
  text: string;
  options: [string, string, string, string]; // A, B, C, D
  correct: "A" | "B" | "C" | "D";
  competency: string;
}

const KNOWLEDGE: McqInput[] = [
  {
    text: "Which statement BEST describes Generative AI?",
    options: [
      "A technology that automatically stores and manages company databases.",
      "A type of AI that creates new content such as text, images, code or audio based on patterns learned from existing data.",
      "Software that searches the internet and returns verified facts.",
      "A digital assistant designed only for customer service automation.",
    ],
    correct: "B",
    competency: "AI Fundamentals",
  },
  {
    text: "Which factor has the GREATEST influence on the quality of an AI-generated response?",
    options: [
      "The popularity of the AI platform being used.",
      "The speed of the internet connection.",
      "The clarity and context provided in the prompt.",
      "The number of previous conversations with the AI.",
    ],
    correct: "C",
    competency: "Prompt Engineering",
  },
  {
    text: "Which statement BEST reflects responsible use of AI in the workplace?",
    options: [
      "AI-generated outputs should be treated as recommendations that require appropriate human judgement.",
      "AI-generated outputs should replace manual review whenever confidence is high.",
      "AI should only be used when performing repetitive administrative work.",
      "AI-generated information is generally reliable if produced by a reputable platform.",
    ],
    correct: "A",
    competency: "Responsible AI",
  },
  {
    text: "An AI system produces a response that sounds convincing but contains incorrect information. This is commonly referred to as:",
    options: ["Overfitting", "Hallucination", "Data Drift", "Machine Bias"],
    correct: "B",
    competency: "AI Limitations",
  },
  {
    text: "Which prompt is MOST likely to produce a high-quality response from an AI assistant?",
    options: [
      "Explain AI.",
      "Prepare a one-page executive summary of the attached report for senior management, highlighting key risks, recommendations and next steps.",
      "Write something about this document.",
      "Summarise everything.",
    ],
    correct: "B",
    competency: "Prompt Engineering",
  },
  {
    text: "Which practice BEST protects confidential organisational information when using AI?",
    options: [
      "Avoid uploading confidential information unless the AI platform and organisational policies explicitly permit it.",
      "Upload only password-protected documents.",
      "Replace employee names while keeping all other confidential details.",
      "Use public AI platforms only outside office hours.",
    ],
    correct: "A",
    competency: "AI Governance",
  },
  {
    text: "Which statement BEST describes the relationship between Artificial Intelligence and human expertise?",
    options: [
      "AI should replace human judgement whenever sufficient data is available.",
      "AI supports human decision-making but does not remove accountability from employees.",
      "AI is primarily intended to automate management decisions.",
      "AI produces objective decisions without requiring human interpretation.",
    ],
    correct: "B",
    competency: "Human Oversight",
  },
  {
    text: "Which situation MOST likely requires additional verification before relying on AI-generated content?",
    options: [
      "The response contains recent statistics and regulatory information.",
      "The response follows the requested writing style.",
      "The response includes a well-structured executive summary.",
      "The response is generated using a paid AI platform.",
    ],
    correct: "A",
    competency: "Critical Evaluation",
  },
  {
    text: "Which statement BEST explains why organisations establish AI governance policies?",
    options: [
      "To ensure AI is used responsibly, consistently and in accordance with organisational and regulatory requirements.",
      "To prevent employees from using AI during working hours.",
      "To guarantee AI-generated responses are always accurate.",
      "To standardise the use of a single AI platform across all departments.",
    ],
    correct: "A",
    competency: "AI Governance",
  },
  {
    text: "Which example represents the MOST effective use of AI in knowledge work?",
    options: [
      "Generating ideas, analysing information and improving productivity while keeping humans responsible for final decisions.",
      "Replacing employees responsible for reviewing reports.",
      "Automatically approving operational decisions.",
      "Eliminating the need for quality assurance processes.",
    ],
    correct: "A",
    competency: "AI Workplace Understanding",
  },
  {
    text: "An employee asks AI the same question several times but receives different answers. What is the MOST appropriate conclusion?",
    options: [
      "The AI platform is unreliable and should no longer be used.",
      "Different prompts or probabilistic generation can produce different outputs, so important information should be verified.",
      "Only the first response should be trusted.",
      "The AI system is experiencing a technical failure.",
    ],
    correct: "B",
    competency: "Understanding AI Behaviour",
  },
  {
    text: "Which statement BEST distinguishes Artificial Intelligence from traditional software?",
    options: [
      "Traditional software follows predefined rules, while AI can generate responses based on learned patterns.",
      "Traditional software cannot process data.",
      "AI always produces the correct answer.",
      "AI does not require programming.",
    ],
    correct: "A",
    competency: "AI Fundamentals",
  },
  {
    text: "Which factor is MOST important when evaluating whether an AI-generated response is suitable for business use?",
    options: [
      "Whether the response appears professional.",
      "Whether the response is detailed.",
      "Whether the response is accurate, relevant and appropriate for the intended purpose.",
      "Whether the response was generated quickly.",
    ],
    correct: "C",
    competency: "Critical Thinking",
  },
  {
    text: "Which statement BEST describes prompt engineering?",
    options: [
      "Developing computer hardware specifically designed for AI applications.",
      "Designing effective instructions that guide AI to produce useful and relevant outputs.",
      "Teaching AI models using programming languages.",
      "Creating automated workflows without human interaction.",
    ],
    correct: "B",
    competency: "Prompt Engineering",
  },
  {
    text: "Why is human oversight still important when using Generative AI in the workplace?",
    options: [
      "Because AI-generated outputs may require validation, contextual understanding and professional judgement before use.",
      "Because AI is unable to process written documents.",
      "Because AI can only perform simple administrative tasks.",
      "Because AI cannot generate original content.",
    ],
    correct: "A",
    competency: "Responsible AI",
  },
];

// ─────────────────────────────────────────────────────────────
// Category B — AI Readiness, Confidence & Adoption Mindset (15 Likert)
// ─────────────────────────────────────────────────────────────
interface LikertInput {
  text: string;
  competency: string;
  reverse: boolean;
}

const READINESS: LikertInput[] = [
  { text: "I actively look for opportunities where AI can improve the quality or efficiency of my work.", competency: "AI Adoption Mindset", reverse: false },
  { text: "I feel confident evaluating whether an AI-generated response is suitable before using it in my work.", competency: "Critical Evaluation", reverse: false },
  { text: "Even if AI could help me complete a task faster, I usually prefer to work without it.", competency: "AI Adoption", reverse: true },
  { text: "When using AI, I understand that I remain responsible for the accuracy of the final outcome.", competency: "Responsible AI", reverse: false },
  { text: "I am comfortable experimenting with new AI tools to improve the way I work.", competency: "Learning Agility", reverse: false },
  { text: "I find it difficult to decide when AI should or should not be used.", competency: "Decision Confidence", reverse: true },
  { text: "I am willing to invest time in learning how to use AI more effectively.", competency: "Growth Mindset", reverse: false },
  { text: "Using AI requires very little judgement because the technology is usually accurate.", competency: "AI Judgement", reverse: true },
  { text: "I feel comfortable reviewing and improving AI-generated content before sharing it with others.", competency: "Human Oversight", reverse: false },
  { text: "I often think critically about whether AI recommendations make sense before acting on them.", competency: "Critical Thinking", reverse: false },
  { text: "I worry that using AI will reduce my ability to think independently.", competency: "AI Trust & Mindset", reverse: true },
  { text: "I believe AI will become an increasingly important part of my work over the next few years.", competency: "Future Readiness", reverse: false },
  { text: "When AI produces unexpected results, I usually try to improve my prompt or approach before giving up.", competency: "Problem Solving", reverse: false },
  { text: "I avoid using AI because learning new technology takes more effort than it is worth.", competency: "Change Readiness", reverse: true },
  { text: "I believe employees who understand how to work effectively with AI will have an advantage in the future workplace.", competency: "AI Awareness & Future of Work", reverse: false },
];

// ─────────────────────────────────────────────────────────────
// Category C — AI Workplace Scenarios (15 SJT, single best answer)
// ─────────────────────────────────────────────────────────────
const WORKPLACE: McqInput[] = [
  {
    text: "Your manager asks you to prepare a two-page executive summary from a 40-page report before tomorrow morning. Which approach is MOST appropriate?",
    options: [
      "Use AI to generate a summary, then compare the output against the original report before finalising it.",
      "Read the report first, then use AI only to improve the wording and presentation.",
      "Use AI to summarise each section separately, combine the outputs, and perform a final review before submission.",
      "Use AI to produce an executive summary, validate key findings, figures and conclusions against the original document, then revise the content where necessary.",
    ],
    correct: "D",
    competency: "Human Oversight",
  },
  {
    text: "You receive an AI-generated response that appears well-written but includes several facts you cannot verify. What is the MOST appropriate action?",
    options: [
      "Accept the response because it appears professionally written.",
      "Compare the response with another AI tool before deciding whether it is reliable.",
      "Verify important facts using trusted sources before using the information.",
      "Rewrite the response manually so it no longer appears AI-generated.",
    ],
    correct: "C",
    competency: "Verification",
  },
  {
    text: "A colleague asks AI to compare three vendor proposals and recommend the best supplier. What is the BEST use of AI?",
    options: [
      "Use AI to compare the proposals and recommend a supplier based on predefined evaluation criteria.",
      "Use AI to identify strengths, weaknesses and potential risks before making the final decision.",
      "Use AI to rank the proposals and select the highest-scoring supplier.",
      "Use AI to summarise each proposal before presenting them to management.",
    ],
    correct: "B",
    competency: "Decision Support",
  },
  {
    text: "Your organisation allows approved AI tools for workplace use. Which practice demonstrates the BEST judgement?",
    options: [
      "Use AI whenever it can reduce the time required to complete a task.",
      "Use AI only for work that can be reviewed before being shared.",
      "Use AI whenever confidential information is not involved.",
      "Use AI after considering organisational policy, business context and the level of human review required.",
    ],
    correct: "D",
    competency: "AI Governance",
  },
  {
    text: "AI produces two different summaries for the same document. What should you do?",
    options: [
      "Choose the version that appears more comprehensive.",
      "Merge both summaries into one document.",
      "Refine your prompt and compare the outputs against the original document before deciding.",
      "Generate additional summaries until the responses become similar.",
    ],
    correct: "C",
    competency: "Quality Assurance",
  },
  {
    text: "You are preparing presentation slides for senior management. What is the MOST appropriate workflow?",
    options: [
      "Generate the presentation with AI, then review and customise it for the intended audience.",
      "Write the presentation manually before asking AI to improve the wording.",
      "Generate several AI presentations and choose the one with the best design.",
      "Use AI only to improve grammar after completing the slides.",
    ],
    correct: "A",
    competency: "Communication",
  },
  {
    text: "A team member wants to upload an internal document into a public AI platform. Which consideration should come FIRST?",
    options: [
      "Whether the document contains confidential or commercially sensitive information.",
      "Whether the AI platform provides accurate responses.",
      "Whether the document format is supported.",
      "Whether the task could be completed faster using AI.",
    ],
    correct: "A",
    competency: "Data Privacy",
  },
  {
    text: "Your department wants to improve a repetitive monthly reporting process. Which approach is MOST appropriate?",
    options: [
      "Use AI to automate the entire process.",
      "Identify repetitive tasks suitable for AI while maintaining human review for critical outputs.",
      "Use AI only to generate graphs and charts.",
      "Avoid AI because reporting requires complete accuracy.",
    ],
    correct: "B",
    competency: "Productivity & Automation",
  },
  {
    text: "You ask AI to draft an important email for an external stakeholder. Before sending it, what should you do?",
    options: [
      "Review the content for accuracy, tone and organisational context.",
      "Send it immediately because AI produces professional language.",
      "Replace only the greeting and closing paragraph.",
      "Ask AI to rewrite the email several times and choose the shortest version.",
    ],
    correct: "A",
    competency: "Quality Control",
  },
  {
    text: "During a meeting, someone suggests using AI to generate project recommendations. What is the BEST role for AI?",
    options: [
      "Provide recommendations that support discussion while people remain responsible for decisions.",
      "Determine the best recommendation based entirely on available data.",
      "Generate recommendations only after management has made the decision.",
      "Replace the need for team discussion.",
    ],
    correct: "A",
    competency: "Decision Support",
  },
  {
    text: "AI provides an answer that conflicts with information from a trusted internal document. What should you do?",
    options: [
      "Trust the AI because it may have newer information.",
      "Use the internal document because organisational information should take precedence unless verified otherwise.",
      "Average both answers.",
      "Ask another AI platform for the final decision.",
    ],
    correct: "B",
    competency: "Information Verification",
  },
  {
    text: "You notice that AI consistently produces incomplete responses for one of your tasks. What is the BEST action?",
    options: [
      "Provide additional context, clearer instructions and the desired outcome in your prompt.",
      "Ask the same question repeatedly.",
      "Move to another AI platform without changing the prompt.",
      "Accept that AI cannot perform the task.",
    ],
    correct: "A",
    competency: "Prompt Engineering",
  },
  {
    text: "Your team is brainstorming ideas for improving customer experience. How should AI contribute?",
    options: [
      "Generate possible ideas that the team can evaluate and refine.",
      "Identify the single best idea and recommend implementation.",
      "Replace the brainstorming session.",
      "Vote on behalf of the project team.",
    ],
    correct: "A",
    competency: "Innovation & Collaboration",
  },
  {
    text: "A colleague shares an AI-generated report containing statistics but no references. What is the MOST appropriate response?",
    options: [
      "Use the report because the statistics appear reasonable.",
      "Request supporting evidence or verify the statistics before relying on the report.",
      "Rewrite the report using different wording.",
      "Generate another version using a different AI tool.",
    ],
    correct: "B",
    competency: "Evidence Evaluation",
  },
  {
    text: "Your manager encourages the team to use AI more frequently. Which approach demonstrates the BEST professional judgement?",
    options: [
      "Use AI whenever it produces a faster result.",
      "Use AI only after receiving approval for every individual task.",
      "Use AI where it adds value while applying professional judgement, organisational policy and appropriate human review.",
      "Use AI only for simple administrative work.",
    ],
    correct: "C",
    competency: "AI Workplace Judgement",
  },
];

// Option builders --------------------------------------------------------------
const LETTERS = ["A", "B", "C", "D"] as const;

function mcqOptions(q: McqInput) {
  return q.options.map((label, i) => ({
    label,
    value: LETTERS[i],
    score: LETTERS[i] === q.correct ? 1 : 0,
  }));
}

function likertOptions(reverse: boolean) {
  const labels = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
  return [1, 2, 3, 4, 5].map((n) => ({
    label: labels[n - 1]!,
    value: String(n),
    score: reverse ? 6 - n : n, // reverse-scored items invert the scale
  }));
}

// ─────────────────────────────────────────────────────────────
// Training programmes (the 4 MDEC programmes)
// ─────────────────────────────────────────────────────────────
const PROGRAMMES = [
  {
    code: "EXEC_LEADERSHIP",
    title: "AI Executive Leadership",
    level: "ADVANCED" as const,
    description: "AI strategy, governance, risk and organisational transformation for senior leaders.",
    skills: ["AI Strategy", "AI Governance", "AI Risk Management", "Responsible AI Leadership", "Executive AI Adoption"],
  },
  {
    code: "DATA_ANALYTICS",
    title: "AI Data Analytics",
    level: "INTERMEDIATE" as const,
    description: "AI-powered analytics, business intelligence, predictive modelling and decision support.",
    skills: ["Business Intelligence", "Predictive Analytics", "Data Visualisation", "AI-assisted Reporting", "Advanced Prompting"],
  },
  {
    code: "SALES_CX",
    title: "AI Driven Sales & Customer Engagement",
    level: "INTERMEDIATE" as const,
    description: "AI for sales productivity, customer engagement, marketing and communication.",
    skills: ["AI Sales Assistant", "Customer Engagement", "AI Marketing", "CRM Productivity", "AI Content Generation"],
  },
  {
    code: "OFFICE_MGMT",
    title: "AI for Office Management",
    level: "FOUNDATION" as const,
    description: "Practical AI productivity, workflow automation and everyday office work.",
    skills: ["AI Productivity", "Microsoft Copilot", "Document Summarisation", "Office Automation", "Prompt Engineering"],
  },
] as const;

// ─────────────────────────────────────────────────────────────
// Departments (JLAND pilot) — jobFunction tokens drive recommendation Rules 2–4
// ─────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { name: "Executive Office", division: "Leadership", jobFunction: "MANAGEMENT" },
  { name: "Finance", division: "Finance & Strategy", jobFunction: "FINANCE" },
  { name: "Business Intelligence", division: "Finance & Strategy", jobFunction: "BUSINESS INTELLIGENCE" },
  { name: "Strategy & Planning", division: "Finance & Strategy", jobFunction: "PLANNING" },
  { name: "Information Technology", division: "Technology", jobFunction: "IT" },
  { name: "Engineering", division: "Technology", jobFunction: "ENGINEERING" },
  { name: "Digital", division: "Technology", jobFunction: "DIGITAL" },
  { name: "Sales", division: "Commercial", jobFunction: "SALES" },
  { name: "Marketing", division: "Commercial", jobFunction: "MARKETING" },
  { name: "Leasing", division: "Commercial", jobFunction: "LEASING" },
  { name: "Business Development", division: "Commercial", jobFunction: "BUSINESS DEVELOPMENT" },
  { name: "Customer Service", division: "Commercial", jobFunction: "CUSTOMER SERVICE" },
  { name: "Corporate Communication", division: "Corporate", jobFunction: "CORPORATE COMMUNICATION" },
  { name: "Human Resources", division: "Corporate", jobFunction: "HR" },
  { name: "Legal", division: "Corporate", jobFunction: "LEGAL" },
  { name: "Procurement", division: "Corporate", jobFunction: "PROCUREMENT" },
  { name: "Operations", division: "Corporate", jobFunction: "OPERATIONS" },
  { name: "Administration", division: "Corporate", jobFunction: "ADMIN" },
];

async function main() {
  console.log("🌱 Seeding AIRA pilot tenant (MDEC × JLAND)…\n");

  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME },
    create: { name: ORG_NAME, slug: ORG_SLUG, status: "ACTIVE" },
  });
  const orgId = org.id;
  console.log(`  ✓ organization: ${org.name}`);

  // Departments (find-or-create by name; preserves employee references)
  for (const d of DEPARTMENTS) {
    const existing = await prisma.department.findFirst({
      where: { organizationId: orgId, name: d.name },
    });
    if (existing) {
      await prisma.department.update({
        where: { id: existing.id },
        data: { division: d.division, jobFunction: d.jobFunction },
      });
    } else {
      await prisma.department.create({
        data: { organizationId: orgId, name: d.name, division: d.division, jobFunction: d.jobFunction },
      });
    }
  }
  console.log(`  ✓ departments: ${DEPARTMENTS.length}`);

  // Readiness levels / AI personas (from the canonical domain bands)
  for (const [i, b] of READINESS_BANDS.entries()) {
    await prisma.readinessLevel.upsert({
      where: { organizationId_tier: { organizationId: orgId, tier: b.tier } },
      update: { label: b.label, minScore: b.min, maxScore: b.max, order: i, color: b.color, description: b.description },
      create: { organizationId: orgId, tier: b.tier, label: b.label, minScore: b.min, maxScore: b.max, order: i, color: b.color, description: b.description },
    });
  }
  console.log(`  ✓ readiness levels: ${READINESS_BANDS.length}`);

  // Remove any categories from earlier models (cascades to their questions +
  // answers) so only the three AIRA categories remain and scoring isn't diluted.
  const staleCats = await prisma.assessmentCategory.deleteMany({
    where: { organizationId: orgId, key: { notIn: CATEGORIES.map((c) => c.key) } },
  });
  if (staleCats.count) console.log(`  ✓ removed stale categories: ${staleCats.count}`);

  // Categories + questions (clean re-seed of questions)
  const categoryIdByKey = new Map<string, string>();
  let qCount = 0;
  for (const [i, c] of CATEGORIES.entries()) {
    const category = await prisma.assessmentCategory.upsert({
      where: { organizationId_key: { organizationId: orgId, key: c.key } },
      update: { name: c.name, description: c.description, order: i, weight: c.weight },
      create: { organizationId: orgId, key: c.key, name: c.name, description: c.description, order: i, weight: c.weight },
    });
    categoryIdByKey.set(c.key, category.id);
    await prisma.assessmentQuestion.deleteMany({ where: { categoryId: category.id } });

    if (c.key === "A") {
      for (const [qi, q] of KNOWLEDGE.entries()) {
        await prisma.assessmentQuestion.create({
          data: {
            organizationId: orgId, categoryId: category.id, order: qi,
            type: QuestionType.SINGLE_CHOICE, text: q.text, required: true, weight: 1, maxScore: 1,
            options: mcqOptions(q),
          },
        });
        qCount += 1;
      }
    } else if (c.key === "B") {
      for (const [qi, q] of READINESS.entries()) {
        await prisma.assessmentQuestion.create({
          data: {
            organizationId: orgId, categoryId: category.id, order: qi,
            type: QuestionType.LIKERT, text: q.text, required: true, weight: 1, maxScore: 5,
            options: likertOptions(q.reverse),
          },
        });
        qCount += 1;
      }
    } else {
      for (const [qi, q] of WORKPLACE.entries()) {
        await prisma.assessmentQuestion.create({
          data: {
            organizationId: orgId, categoryId: category.id, order: qi,
            type: QuestionType.SINGLE_CHOICE, text: q.text, required: true, weight: 1, maxScore: 1,
            options: mcqOptions(q),
          },
        });
        qCount += 1;
      }
    }
  }
  console.log(`  ✓ categories: ${CATEGORIES.length}, questions: ${qCount}`);

  // Training programmes (clean re-seed)
  await prisma.trainingModule.deleteMany({ where: { organizationId: orgId } });
  const moduleIdByCode = new Map<string, string>();
  for (const p of PROGRAMMES) {
    const created = await prisma.trainingModule.create({
      data: {
        organizationId: orgId, code: p.code, title: p.title, description: p.description,
        level: p.level as ModuleLevel, skills: [...p.skills], active: true,
      },
    });
    moduleIdByCode.set(p.code, created.id);
  }
  console.log(`  ✓ training programmes: ${PROGRAMMES.length}`);

  // Recommendation rules (role/department/workplace-aware; priority ascending)
  await prisma.recommendation.deleteMany({ where: { organizationId: orgId } });
  await prisma.recommendation.createMany({
    data: [
      {
        organizationId: orgId,
        label: "Rule 1 — Executive Leadership",
        priority: 10,
        conditions: {
          jobGrades: ["Senior Manager", "Head", "General Manager", "Director", "Chief", "CEO", "COO", "CFO", "CIO", "CTO", "C-Suite", "C-Level"],
          minScore: 60,
        },
        moduleIds: [moduleIdByCode.get("EXEC_LEADERSHIP")!],
        reasonTemplate:
          "As a {grade}, {name} demonstrates sufficient AI capability (overall {score}%) and organisational influence to lead AI transformation initiatives.",
        stopOnMatch: false,
      },
      {
        organizationId: orgId,
        label: "Rule 2 — Data Analytics",
        priority: 20,
        conditions: {
          jobFunctions: ["FINANCE", "BUSINESS INTELLIGENCE", "PLANNING", "STRATEGY", "IT", "INFORMATION TECHNOLOGY", "ENGINEERING", "DIGITAL", "DATA", "ANALYTICS", "ANALYSIS", "RESEARCH", "REPORTING"],
          minCategoryScores: { A: 65, C: 65 },
        },
        moduleIds: [moduleIdByCode.get("DATA_ANALYTICS")!],
        reasonTemplate:
          "{name}'s role in {department} plus strong knowledge and workplace-application scores ({workplace}% Category C) point to high impact from AI-assisted analytics and decision support.",
        stopOnMatch: false,
      },
      {
        organizationId: orgId,
        label: "Rule 3 — Sales & Customer Engagement",
        priority: 30,
        conditions: {
          jobFunctions: ["SALES", "MARKETING", "CUSTOMER SERVICE", "CONTACT CENTRE", "BUSINESS DEVELOPMENT", "CORPORATE COMMUNICATION", "PUBLIC RELATIONS", "LEASING", "RELATIONSHIP MANAGEMENT", "CLIENT SUCCESS"],
          minCategoryScores: { C: 60 },
        },
        moduleIds: [moduleIdByCode.get("SALES_CX")!],
        reasonTemplate:
          "{name} works in {department}, engaging customers and stakeholders where AI can lift engagement, sales productivity and communication effectiveness.",
        stopOnMatch: false,
      },
      {
        organizationId: orgId,
        label: "Rule 4 — Office Management (catch-all)",
        priority: 99,
        conditions: {},
        moduleIds: [moduleIdByCode.get("OFFICE_MGMT")!],
        reasonTemplate:
          "{name} would benefit most from practical AI productivity tools that improve everyday office work, document generation and workflow automation.",
        stopOnMatch: false,
      },
    ],
  });
  console.log("  ✓ recommendation rules: 4");

  console.log("\n✅ AIRA seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
