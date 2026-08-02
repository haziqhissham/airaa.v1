"use server";

/**
 * Assessment lifecycle (v2, Prisma-backed): start/resume, autosave, submit.
 * Prisma uses a direct DB connection (bypasses RLS), so these actions enforce
 * ownership + role in code; RLS is the safety net for any anon-client access.
 * Submit runs the pure v2 scoring engine and persists an assessment_scores row.
 */

import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { loadAssessmentForm } from "@/lib/assessment/v2-loader";
import {
  analyzeGaps,
  classifyReadiness,
  computeCategoryScores,
  computeOverall,
} from "@/domain/v2/scoring";
import type { AnswerValue, ReadinessTierConfig } from "@/domain/v2/types";
import type { Prisma } from "@prisma/client";

async function currentEmployee() {
  const user = await getSessionUser();
  if (!user) return { error: "Not signed in." as const };
  const employee = await prisma.employee.findUnique({
    where: { userId: user.uid },
  });
  if (!employee) return { error: "Complete your profile first." as const };
  return { employee };
}

/**
 * Demo-only: wipe the current employee's assessment history (sessions cascade to
 * their answers + scores; reports + certificates too) so the account can retake
 * from scratch. Guarded server-side by NEXT_PUBLIC_DEMO_MODE — never runs in prod.
 */
export async function resetMyAssessment(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await currentEmployee();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { employee } = ctx;

  // Allowed on the demo tenant (slug "demo") or any build with demo mode on.
  const org = await prisma.organization.findUnique({
    where: { id: employee.organizationId },
    select: { slug: true },
  });
  const demoAllowed =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" || org?.slug === "demo";
  if (!demoAllowed) {
    return { ok: false, error: "Reset is only available in the demo version." };
  }

  await prisma.$transaction([
    prisma.report.deleteMany({ where: { employeeId: employee.id } }),
    prisma.certificate.deleteMany({ where: { employeeId: employee.id } }),
    prisma.assessmentSession.deleteMany({ where: { employeeId: employee.id } }),
  ]);
  await prisma.auditLog.create({
    data: {
      organizationId: employee.organizationId,
      actorId: employee.userId,
      action: "ASSESSMENT_RESET",
      targetType: "employee",
      targetId: employee.id,
      metadata: { demoReset: true },
    },
  });
  return { ok: true };
}

export interface StartResult {
  ok: boolean;
  error?: string;
  sessionId?: string;
  status?: "IN_PROGRESS" | "SUBMITTED";
  answers?: Record<string, AnswerValue>;
  currentCategoryId?: string | null;
  progress?: number;
}

export async function startOrResumeAssessment(): Promise<StartResult> {
  const ctx = await currentEmployee();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { employee } = ctx;

  // Most recent session for this employee.
  const existing = await prisma.assessmentSession.findFirst({
    where: { employeeId: employee.id },
    orderBy: { startedAt: "desc" },
    include: { answers: true },
  });

  if (existing && existing.status === "SUBMITTED") {
    return { ok: true, sessionId: existing.id, status: "SUBMITTED" };
  }

  if (existing && existing.status === "IN_PROGRESS") {
    const answers: Record<string, AnswerValue> = {};
    for (const a of existing.answers) answers[a.questionId] = a.value as AnswerValue;
    return {
      ok: true,
      sessionId: existing.id,
      status: "IN_PROGRESS",
      answers,
      currentCategoryId: existing.currentCategoryId,
      progress: existing.progress,
    };
  }

  const session = await prisma.assessmentSession.create({
    data: {
      organizationId: employee.organizationId,
      employeeId: employee.id,
      status: "IN_PROGRESS",
      progress: 0,
    },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: employee.organizationId,
      actorId: employee.userId,
      action: "ASSESSMENT_STARTED",
      targetType: "session",
      targetId: session.id,
    },
  });

  return {
    ok: true,
    sessionId: session.id,
    status: "IN_PROGRESS",
    answers: {},
    currentCategoryId: null,
    progress: 0,
  };
}

async function ownSession(sessionId: string, employeeId: string) {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.employeeId !== employeeId) return null;
  return session;
}

async function persistAnswers(
  sessionId: string,
  answers: Record<string, AnswerValue>,
) {
  const rows = Object.entries(answers)
    .filter(([, v]) => !(v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)))
    .map(([questionId, value]) => ({
      sessionId,
      questionId,
      value: value as Prisma.InputJsonValue,
    }));
  await prisma.$transaction([
    prisma.assessmentAnswer.deleteMany({ where: { sessionId } }),
    ...(rows.length ? [prisma.assessmentAnswer.createMany({ data: rows })] : []),
  ]);
}

export interface SaveInput {
  sessionId: string;
  answers: Record<string, AnswerValue>;
  currentCategoryId?: string | null;
  progress: number;
}

export async function saveAnswers(
  input: SaveInput,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await currentEmployee();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const session = await ownSession(input.sessionId, ctx.employee.id);
  if (!session) return { ok: false, error: "Assessment not found." };
  if (session.status === "SUBMITTED")
    return { ok: false, error: "Already submitted." };

  await persistAnswers(input.sessionId, input.answers);
  await prisma.assessmentSession.update({
    where: { id: input.sessionId },
    data: {
      currentCategoryId: input.currentCategoryId ?? undefined,
      progress: Math.round(input.progress),
    },
  });
  return { ok: true };
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
  missingQuestionIds?: string[];
  overallScore?: number;
  tierLabel?: string;
}

export async function submitAssessment(input: SaveInput): Promise<SubmitResult> {
  const ctx = await currentEmployee();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { employee } = ctx;

  const session = await ownSession(input.sessionId, employee.id);
  if (!session) return { ok: false, error: "Assessment not found." };

  const sections = await loadAssessmentForm(employee.organizationId);
  const allQuestions = sections.flatMap((s) => s.questions);

  const isBlank = (v: AnswerValue | undefined) =>
    v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
  const missing = allQuestions
    .filter((q) => q.required && q.type !== "OPEN_TEXT" && isBlank(input.answers[q.id]))
    .map((q) => q.id);
  if (missing.length) {
    return {
      ok: false,
      error: "Please answer all required questions.",
      missingQuestionIds: missing,
    };
  }

  await persistAnswers(input.sessionId, input.answers);

  const categories = sections.map((s) => s.category);
  const categoryScores = computeCategoryScores(sections, input.answers);
  const overallScore = computeOverall(categoryScores, categories);
  const gaps = analyzeGaps(categoryScores, categories);

  const levelRows = await prisma.readinessLevel.findMany({
    where: { organizationId: employee.organizationId },
    orderBy: { order: "asc" },
  });
  const levels: ReadinessTierConfig[] = levelRows.map((l) => ({
    id: l.id,
    tier: l.tier,
    label: l.label,
    minScore: l.minScore,
    maxScore: l.maxScore,
    color: l.color,
    description: l.description,
  }));
  const tier = classifyReadiness(levels, overallScore);

  await prisma.assessmentScore.upsert({
    where: { sessionId: input.sessionId },
    create: {
      sessionId: input.sessionId,
      organizationId: employee.organizationId,
      employeeId: employee.id,
      overallScore,
      readinessLevelId: tier?.id ?? null,
      categoryScores: categoryScores as Prisma.InputJsonValue,
      gapAnalysis: gaps as unknown as Prisma.InputJsonValue,
    },
    update: {
      overallScore,
      readinessLevelId: tier?.id ?? null,
      categoryScores: categoryScores as Prisma.InputJsonValue,
      gapAnalysis: gaps as unknown as Prisma.InputJsonValue,
      computedAt: new Date(),
    },
  });

  await prisma.assessmentSession.update({
    where: { id: input.sessionId },
    data: { status: "SUBMITTED", progress: 100, submittedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: employee.organizationId,
      actorId: employee.userId,
      action: "ASSESSMENT_SUBMITTED",
      targetType: "score",
      targetId: input.sessionId,
      metadata: { overallScore, tier: tier?.tier },
    },
  });

  return { ok: true, overallScore, tierLabel: tier?.label };
}
