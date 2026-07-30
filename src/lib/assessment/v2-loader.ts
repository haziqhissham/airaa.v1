import "server-only";

/**
 * Loads the assessment form (categories + questions) from Prisma and maps it to
 * the pure v2 domain shapes the engine + UI consume.
 */

import { prisma } from "@/lib/db/prisma";
import type {
  CategoryWithQuestions,
  QOption,
  Question,
} from "@/domain/v2/types";

function toOptions(json: unknown): QOption[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((o) => o as Record<string, unknown>)
    .map((o) => ({
      label: String(o.label ?? ""),
      value: String(o.value ?? ""),
      score: Number(o.score ?? 0),
    }));
}

export async function loadAssessmentForm(
  organizationId: string,
): Promise<CategoryWithQuestions[]> {
  const [categories, questions] = await Promise.all([
    prisma.assessmentCategory.findMany({
      where: { organizationId, active: true },
      orderBy: { order: "asc" },
    }),
    prisma.assessmentQuestion.findMany({
      where: { organizationId, active: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const byCategory = new Map<string, Question[]>();
  for (const q of questions) {
    const mapped: Question = {
      id: q.id,
      categoryId: q.categoryId,
      order: q.order,
      type: q.type,
      text: q.text,
      helpText: q.helpText,
      required: q.required,
      weight: q.weight,
      maxScore: q.maxScore,
      options: toOptions(q.options),
    };
    const arr = byCategory.get(q.categoryId) ?? [];
    arr.push(mapped);
    byCategory.set(q.categoryId, arr);
  }

  return categories.map((c) => ({
    category: {
      id: c.id,
      key: c.key,
      name: c.name,
      description: c.description,
      weight: c.weight,
      order: c.order,
    },
    questions: (byCategory.get(c.id) ?? []).sort((a, b) => a.order - b.order),
  }));
}
