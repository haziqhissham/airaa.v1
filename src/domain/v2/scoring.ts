/**
 * v2 Scoring Engine — pure, framework-free. Per-question → per-category (0..100)
 * → weighted overall (0..100), plus readiness classification and gap analysis.
 * Generalized to any number of categories (the 10 v2 sections and beyond).
 */

import type {
  AnswerValue,
  Category,
  CategoryScores,
  CategoryWithQuestions,
  Question,
  ReadinessTierConfig,
} from "@/domain/v2/types";

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

const isEmpty = (v: AnswerValue | undefined): boolean =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * Score a single question to 0..100. Returns `scored: false` for OPEN_TEXT and
 * blank answers so they don't drag the category average toward zero.
 */
export function scoreQuestion(
  q: Question,
  answer?: AnswerValue,
): { score: number; scored: boolean } {
  if (q.type === "OPEN_TEXT" || isEmpty(answer)) return { score: 0, scored: false };

  if (q.type === "LIKERT") {
    // Answer is the scale position (1..5) chosen by the user. We look up the
    // matching option to honour its `score`, which lets reverse-scored items be
    // encoded purely in data (value "5" → score 1, …). Per the AIRA spec the
    // readiness score is the proportion of the scale (userScore / 75), so a
    // per-question value maps score → score/5 (1→20, 3→60, 5→100). Averaging
    // these across a category reproduces (Σ value / (5·count)) × 100.
    const n = typeof answer === "number" ? answer : Number(answer);
    if (Number.isNaN(n)) return { score: 0, scored: false };
    const pos = clamp(n, 1, 5);
    const opt = q.options.find((o) => o.value === String(pos));
    const maxOpt = Math.max(1, ...q.options.map((o) => o.score));
    const raw = opt ? opt.score : pos;
    return { score: round1(clamp((raw / maxOpt) * 100)), scored: true };
  }

  if (q.type === "MULTIPLE_CHOICE") {
    const selected = (Array.isArray(answer) ? answer : [answer]).map(String);
    const totalPossible = q.options.reduce((a, o) => a + Math.max(0, o.score), 0);
    if (totalPossible <= 0) return { score: 0, scored: false };
    const got = selected.reduce((sum, val) => {
      const opt = q.options.find((o) => o.value === val);
      return sum + (opt?.score ?? 0);
    }, 0);
    return { score: round1(clamp((got / totalPossible) * 100)), scored: true };
  }

  // SINGLE_CHOICE
  const val = Array.isArray(answer) ? answer[0] : answer;
  const opt = q.options.find((o) => o.value === String(val));
  const maxOpt = Math.max(1, ...q.options.map((o) => o.score));
  return { score: round1(clamp(((opt?.score ?? 0) / maxOpt) * 100)), scored: true };
}

/** Weighted category score (0..100) over its scored questions. */
export function scoreCategory(
  questions: Question[],
  answers: Record<string, AnswerValue>,
): number {
  let weighted = 0;
  let weightSum = 0;
  for (const q of questions) {
    const { score, scored } = scoreQuestion(q, answers[q.id]);
    if (!scored) continue;
    const w = q.weight > 0 ? q.weight : 1;
    weighted += score * w;
    weightSum += w;
  }
  return weightSum > 0 ? round1(weighted / weightSum) : 0;
}

/** All category scores keyed by category id. */
export function computeCategoryScores(
  sections: CategoryWithQuestions[],
  answers: Record<string, AnswerValue>,
): CategoryScores {
  const out: CategoryScores = {};
  for (const s of sections) out[s.category.id] = scoreCategory(s.questions, answers);
  return out;
}

/** Weighted overall (0..100) using each category's configured weight. */
export function computeOverall(
  categoryScores: CategoryScores,
  categories: Category[],
): number {
  let weighted = 0;
  let weightSum = 0;
  for (const c of categories) {
    const score = categoryScores[c.id];
    if (score === undefined) continue;
    const w = c.weight > 0 ? c.weight : 1;
    weighted += score * w;
    weightSum += w;
  }
  return weightSum > 0 ? round1(weighted / weightSum) : 0;
}

/** Map an overall score to the configured readiness tier. */
export function classifyReadiness(
  levels: ReadinessTierConfig[],
  score: number,
): ReadinessTierConfig | null {
  const s = clamp(score);
  const ordered = [...levels].sort((a, b) => a.minScore - b.minScore);
  return ordered.find((l) => s >= l.minScore && s <= l.maxScore) ?? ordered.at(-1) ?? null;
}

export interface GapAnalysis {
  strengths: { id: string; name: string; score: number }[];
  gaps: { id: string; name: string; score: number }[];
}

/** Strengths (≥ strongAt) and gaps (< weakBelow), each sorted, never both empty. */
export function analyzeGaps(
  categoryScores: CategoryScores,
  categories: Category[],
  opts: { strongAt?: number; weakBelow?: number } = {},
): GapAnalysis {
  const strongAt = opts.strongAt ?? 60;
  const weakBelow = opts.weakBelow ?? 50;

  const rows = categories
    .map((c) => ({ id: c.id, name: c.name, score: categoryScores[c.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const strengths = rows.filter((r) => r.score >= strongAt);
  const gaps = [...rows].reverse().filter((r) => r.score < weakBelow);

  if (strengths.length === 0 && rows.length) strengths.push(rows[0]!);
  return { strengths, gaps };
}
