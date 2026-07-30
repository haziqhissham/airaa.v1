"use server";

/** AI report generation. Auth-gated; persists the narrative into `reports`. */

import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { getActiveOrganizationId } from "@/lib/auth/tenant";
import { ai } from "@/lib/ai";
import { employeeSummaryPrompt, orgSummaryPrompt } from "@/lib/ai/reports";
import { loadResultView } from "@/lib/db/result";
import { loadOrgAnalytics } from "@/lib/db/analytics";
import { rateLimit } from "@/lib/security/rate-limit";
import { HR_ROLES } from "@/domain/enums";
import type { AIProviderName } from "@/lib/ai";

/** 8 AI generations per user per minute. */
function checkRate(uid: string): AIResult | null {
  const rl = rateLimit(`ai:${uid}`, 8, 60_000);
  if (!rl.ok)
    return {
      ok: false,
      error: `Too many requests — try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
    };
  return null;
}

export interface AIResult {
  ok: boolean;
  error?: string;
  summary?: string;
}

export async function generateEmployeeSummary(
  sessionId: string,
  provider?: AIProviderName,
): Promise<AIResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const limited = checkRate(user.uid);
  if (limited) return limited;

  const view = await loadResultView(sessionId);
  if (!view) return { ok: false, error: "Result not found." };

  const isOwner = view.employeeUserId === user.uid;
  const isStaff = HR_ROLES.includes(user.role);
  if (!isOwner && !isStaff) return { ok: false, error: "Not permitted." };

  try {
    const { system, prompt } = employeeSummaryPrompt(view);
    const summary = await ai(provider).generate(prompt, { system, maxTokens: 1200 });

    await prisma.report.create({
      data: {
        organizationId: view.organizationId,
        type: "EMPLOYEE",
        title: `AI Readiness — ${view.employeeName}`,
        employeeId: (await prisma.employee.findUnique({ where: { userId: view.employeeUserId } }))?.id,
        sessionId,
        aiSummary: summary,
        generatedBy: user.uid,
      },
    });
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI generation failed." };
  }
}

export async function generateOrgSummary(
  provider?: AIProviderName,
): Promise<AIResult> {
  const user = await getSessionUser();
  if (!user || !HR_ROLES.includes(user.role))
    return { ok: false, error: "Not permitted." };
  const limited = checkRate(user.uid);
  if (limited) return limited;

  const orgId = await getActiveOrganizationId();
  const a = await loadOrgAnalytics(orgId);
  const org = await prisma.organization.findUnique({ where: { id: orgId } });

  try {
    const { system, prompt } = orgSummaryPrompt({
      orgName: org?.name ?? "Organisation",
      completed: a.completed,
      averageScore: a.averageScore,
      tierDistribution: a.tierDistribution.map((t) => ({ label: t.label, count: t.count })),
      categoryAverages: a.categoryAverages.map((c) => ({ name: c.name, score: c.score })),
      lowestDepartments: a.lowestDepartments.map((d) => ({ name: d.name, score: d.avg })),
    });
    const summary = await ai(provider).generate(prompt, { system, maxTokens: 1500 });

    await prisma.report.create({
      data: {
        organizationId: orgId,
        type: "ORGANIZATION",
        title: `Organization AI Readiness — ${org?.name ?? ""}`,
        aiSummary: summary,
        generatedBy: user.uid,
      },
    });
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI generation failed." };
  }
}
