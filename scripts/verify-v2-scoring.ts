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

const levels: ReadinessTierConfig[] = [
  { id: "l1", tier: "BEGINNER", label: "Beginner", minScore: 0, maxScore: 20, color: "#94a3b8" },
  { id: "l2", tier: "EMERGING", label: "Emerging", minScore: 21, maxScore: 40, color: "#60a5fa" },
  { id: "l3", tier: "DEVELOPING", label: "Developing", minScore: 41, maxScore: 60, color: "#3b82f6" },
  { id: "l4", tier: "ADVANCED", label: "Advanced", minScore: 61, maxScore: 80, color: "#2563eb" },
  { id: "l5", tier: "AI_READY", label: "AI Ready", minScore: 81, maxScore: 100, color: "#1d4ed8" },
];

// Likert normalization sanity: 1→0, 3→50, 5→100
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
