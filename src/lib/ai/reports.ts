import "server-only";

/** Prompt builders for AI-generated narrative reports. Provider-agnostic. */

import type { ResultView } from "@/lib/db/result";

const SYSTEM =
  "You are an expert AI transformation consultant writing concise, encouraging, actionable readiness reports for enterprise staff. Use plain business English, short paragraphs, and specific next steps. Do not invent numbers beyond those given.";

export function employeeSummaryPrompt(v: ResultView): { system: string; prompt: string } {
  const cats = v.categories.map((c) => `- ${c.name}: ${c.score}/100`).join("\n");
  return {
    system: SYSTEM,
    prompt: `Write a personalised AI readiness summary for ${v.employeeName}.

Overall score: ${Math.round(v.overallScore)}/100 (readiness level: ${v.tierLabel}).
Category scores:
${cats}
Strengths: ${v.strengths.join(", ") || "—"}
Areas to grow: ${v.gaps.join(", ") || "—"}
Recommended training: ${v.recommendations.map((r) => r.title).join(", ") || "—"}

Produce, in markdown:
1. **Executive summary** (2-3 sentences).
2. **What this means** — interpret the readiness level.
3. **Improvement roadmap** — 3 concrete, prioritised steps.
4. **Recommended next training** — tie the modules to the weakest areas.
Keep it under 300 words, warm and motivating.`,
  };
}

export interface OrgSummaryContext {
  orgName: string;
  completed: number;
  averageScore: number;
  tierDistribution: { label: string; count: number }[];
  categoryAverages: { name: string; score: number }[];
  lowestDepartments: { name: string; score: number }[];
}

export function orgSummaryPrompt(ctx: OrgSummaryContext): { system: string; prompt: string } {
  const cats = ctx.categoryAverages.map((c) => `- ${c.name}: ${c.score}/100`).join("\n");
  const tiers = ctx.tierDistribution.map((t) => `${t.label}: ${t.count}`).join(", ");
  const depts = ctx.lowestDepartments.map((d) => `${d.name} (${d.score})`).join(", ");
  return {
    system: SYSTEM,
    prompt: `Write an executive AI readiness report for ${ctx.orgName}.

Assessments completed: ${ctx.completed}
Average readiness: ${Math.round(ctx.averageScore)}/100
Readiness distribution: ${tiers}
Category averages:
${cats}
Lowest-readiness departments: ${depts || "—"}

Produce, in markdown:
1. **Executive summary** for leadership (3-4 sentences).
2. **Department & skill-gap analysis** — where to focus.
3. **AI adoption strategy** — a phased 3-step plan.
4. **Training recommendations** — org-wide priorities.
Keep it under 400 words, board-appropriate.`,
  };
}
