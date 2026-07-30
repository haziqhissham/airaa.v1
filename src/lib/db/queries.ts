import "server-only";

/**
 * Prisma data-access layer. Domain-focused read helpers used by the v2 feature
 * pages (Steps 5-8). All queries run under RLS via the request's Supabase JWT
 * when called through the anon client; server actions using the service role
 * bypass RLS for privileged writes.
 */

import { prisma } from "@/lib/db/prisma";
import type { ReadinessTier } from "@prisma/client";

export function getOrganization(orgId: string) {
  return prisma.organization.findUnique({ where: { id: orgId } });
}

export function getEmployeeByUserId(userId: string) {
  return prisma.employee.findUnique({
    where: { userId },
    include: { department: true },
  });
}

export function getActiveCategories(orgId: string) {
  return prisma.assessmentCategory.findMany({
    where: { organizationId: orgId, active: true },
    orderBy: { order: "asc" },
  });
}

export function getActiveQuestions(orgId: string) {
  return prisma.assessmentQuestion.findMany({
    where: { organizationId: orgId, active: true },
    orderBy: [{ categoryId: "asc" }, { order: "asc" }],
  });
}

export function getReadinessLevels(orgId: string) {
  return prisma.readinessLevel.findMany({
    where: { organizationId: orgId },
    orderBy: { order: "asc" },
  });
}

export function getTrainingModules(orgId: string) {
  return prisma.trainingModule.findMany({
    where: { organizationId: orgId, active: true },
    orderBy: { title: "asc" },
  });
}

export function getRecommendationRules(orgId: string) {
  return prisma.recommendation.findMany({
    where: { organizationId: orgId },
    orderBy: { priority: "asc" },
  });
}

/** Map an overall score (0..100) to the org's configured readiness tier. */
export function classifyReadiness<
  T extends { tier: ReadinessTier; minScore: number; maxScore: number },
>(levels: T[], score: number): T | null {
  const s = Math.max(0, Math.min(100, score));
  const ordered = [...levels].sort((a, b) => a.minScore - b.minScore);
  return ordered.find((l) => s >= l.minScore && s <= l.maxScore) ?? ordered.at(-1) ?? null;
}
