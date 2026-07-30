import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  matchRecommendations,
  type Recommendation,
  type Rule,
} from "@/domain/v2/recommendations";

export interface ResultCategory {
  key: string;
  name: string;
  score: number;
}

export interface ResultView {
  sessionId: string;
  employeeUserId: string;
  organizationId: string;
  employeeName: string;
  overallScore: number;
  tierLabel: string;
  tierColor: string;
  tierDescription?: string | null;
  categories: ResultCategory[];
  strengths: string[];
  gaps: string[];
  recommendations: Recommendation[];
  aiSummary?: string | null;
  computedAt: string;
}

export async function loadResultView(sessionId: string): Promise<ResultView | null> {
  const score = await prisma.assessmentScore.findUnique({
    where: { sessionId },
    include: { readinessLevel: true, employee: true },
  });
  if (!score) return null;

  const [categories, modules, ruleRows, report] = await Promise.all([
    prisma.assessmentCategory.findMany({
      where: { organizationId: score.organizationId },
      orderBy: { order: "asc" },
    }),
    prisma.trainingModule.findMany({
      where: { organizationId: score.organizationId, active: true },
    }),
    prisma.recommendation.findMany({
      where: { organizationId: score.organizationId },
      orderBy: { priority: "asc" },
    }),
    prisma.report.findFirst({
      where: { sessionId, type: "EMPLOYEE" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const catScores = (score.categoryScores ?? {}) as Record<string, number>;
  const keyById = new Map(categories.map((c) => [c.id, c.key]));

  const resultCategories: ResultCategory[] = categories.map((c) => ({
    key: c.key,
    name: c.name,
    score: Math.round(catScores[c.id] ?? 0),
  }));

  const gaps = (score.gapAnalysis ?? {}) as {
    strengths?: { name: string }[];
    gaps?: { name: string }[];
  };

  // Recommendations by rule, keyed by category KEY.
  const categoryScoresByKey: Record<string, number> = {};
  for (const [id, s] of Object.entries(catScores))
    categoryScoresByKey[keyById.get(id) ?? id] = s;
  const weakest = [...resultCategories].sort((a, b) => a.score - b.score)[0];

  const rules: Rule[] = ruleRows.map((r) => ({
    id: r.id,
    label: r.label,
    priority: r.priority,
    conditions: (r.conditions ?? {}) as Rule["conditions"],
    moduleIds: r.moduleIds,
    reasonTemplate: r.reasonTemplate,
    stopOnMatch: r.stopOnMatch,
  }));

  const recommendations = matchRecommendations(
    rules,
    modules.map((m) => ({
      id: m.id,
      title: m.title,
      level: m.level,
      durationHours: m.durationHours,
      skills: m.skills,
      categoryId: m.categoryId,
    })),
    {
      name: score.employee.name,
      overall: score.overallScore,
      tier: score.readinessLevel?.tier,
      categoryScores: categoryScoresByKey,
      weakestCategory: weakest?.name,
    },
  );

  return {
    sessionId,
    employeeUserId: score.employee.userId,
    organizationId: score.organizationId,
    employeeName: score.employee.name,
    overallScore: score.overallScore,
    tierLabel: score.readinessLevel?.label ?? "Assessed",
    tierColor: score.readinessLevel?.color ?? "#2563eb",
    tierDescription: score.readinessLevel?.description,
    categories: resultCategories,
    strengths: gaps.strengths?.map((s) => s.name) ?? [],
    gaps: gaps.gaps?.map((g) => g.name) ?? [],
    recommendations,
    aiSummary: report?.aiSummary,
    computedAt: score.computedAt.toISOString(),
  };
}
