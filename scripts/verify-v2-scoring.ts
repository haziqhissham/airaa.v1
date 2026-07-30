/** Offline check of the v2 (N-category) scoring engine. `npx tsx scripts/verify-v2-scoring.ts` */
import {
  analyzeGaps,
  classifyReadiness,
  computeCategoryScores,
  computeOverall,
  scoreQuestion,
} from "@/domain/v2/scoring";
import type {
  CategoryWithQuestions,
  ReadinessTierConfig,
} from "@/domain/v2/types";
import { READINESS_BANDS } from "@/domain/v2/readiness";

const likertOpts = [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: String(n), score: n }));

function cat(id: string, name: string, weight: number): CategoryWithQuestions {
  return {
    category: { id, key: id.toUpperCase(), name, weight, order: 0 },
    questions: [0, 1].map((i) => ({
      id: `${id}-q${i}`,
      categoryId: id,
      order: i,
      type: "LIKERT" as const,
      text: "…",
      required: true,
      weight: 1,
      maxScore: 5,
      options: likertOpts,
    })),
  };
}

const sections = [cat("lead", "Leadership", 0.5), cat("data", "Data", 0.3), cat("ethics", "Ethics", 0.2)];

const levels: ReadinessTierConfig[] = READINESS_BANDS.map((b, i) => ({
  id: `l${i + 1}`,
  tier: b.tier,
  label: b.label,
  minScore: b.min,
  maxScore: b.max,
  color: b.color,
}));

// Likert normalization sanity (AIRA spec, n/5): 1→20, 3→60, 5→100
console.log(
  "Likert 1/3/5 →",
  [1, 3, 5].map((n) => scoreQuestion(sections[0]!.questions[0]!, n).score),
);

function run(name: string, answersFor: (catId: string) => number) {
  const answers: Record<string, number> = {};
  for (const s of sections) for (const q of s.questions) answers[q.id] = answersFor(s.category.id);
  const catScores = computeCategoryScores(sections, answers);
  const overall = computeOverall(catScores, sections.map((s) => s.category));
  const tier = classifyReadiness(levels, overall);
  const gaps = analyzeGaps(catScores, sections.map((s) => s.category));
  console.log(`\n── ${name} ──`);
  console.log("  category scores:", catScores);
  console.log("  overall:", overall, "→", tier?.label);
  console.log("  strengths:", gaps.strengths.map((g) => g.name), "gaps:", gaps.gaps.map((g) => g.name));
}

run("All strong (5)", () => 5);
run("All low (2)", () => 2);
run("Mixed (lead 5, data 3, ethics 1)", (c) => (c === "lead" ? 5 : c === "data" ? 3 : 1));
console.log("\n✅ v2 scoring verified.");
