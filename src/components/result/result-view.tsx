"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock,
  GraduationCap,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/shared/glass-card";
import { ScoreRing } from "@/components/result/score-ring";
import { CategoryRadar } from "@/components/charts/category-radar";
import { AiSummaryCard } from "@/components/ai/ai-summary-card";
import { ExportButtons } from "@/components/export/export-buttons";
import { scoreTone } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ResultView as RV } from "@/lib/db/result";

export function ResultView({ view, orgName }: { view: RV; orgName: string }) {
  const date = new Date(view.computedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="no-print flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard"><ArrowLeft className="size-4" /> Dashboard</Link>
        </Button>
        <ExportButtons kind="employee" view={view} orgName={orgName} />
      </div>

      <div className="flex items-start justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-brand-gradient text-white shadow">
            <BrainCircuit className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI Readiness Report</p>
            <p className="text-xs text-muted-foreground">{orgName}</p>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p className="text-sm font-medium text-foreground">{view.employeeName}</p>
          <p>{date}</p>
        </div>
      </div>

      {/* Hero */}
      <GlassCard className="flex flex-col items-center gap-6 p-8 sm:flex-row">
        <ScoreRing score={view.overallScore} accent={view.tierColor} />
        <div className="flex-1 text-center sm:text-left">
          <Badge variant="info" className="mb-2" style={{ backgroundColor: `${view.tierColor}22`, color: view.tierColor }}>
            {view.tierLabel}
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">Your AI Readiness Level</h1>
          {view.tierDescription && (
            <p className="mt-2 text-sm text-muted-foreground">{view.tierDescription}</p>
          )}
        </div>
      </GlassCard>

      {/* Radar + bars */}
      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><Target className="size-4 text-brand-600" /> Category profile</h2>
          <p className="mb-2 text-xs text-muted-foreground">Readiness across the assessment sections.</p>
          <CategoryRadar data={view.categories.map((c) => ({ label: c.name, score: c.score }))} />
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><TrendingUp className="size-4 text-brand-600" /> Category scores</h2>
          <div className="space-y-3">
            {view.categories.map((c) => {
              const tone = scoreTone(c.score);
              return (
                <div key={c.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="tabular-nums"><span className="font-semibold">{c.score}</span><span className={cn("ml-2 text-xs", tone.className)}>{tone.label}</span></span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Strengths & gaps */}
      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-emerald-600"><CheckCircle2 className="size-4" /> Strengths</h2>
          <ul className="space-y-2 text-sm">
            {view.strengths.length ? view.strengths.map((s) => (
              <li key={s} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-500" /> {s}</li>
            )) : <li className="text-muted-foreground">—</li>}
          </ul>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-amber-600"><Target className="size-4" /> Areas to grow</h2>
          {view.gaps.length ? (
            <ul className="space-y-2 text-sm">
              {view.gaps.map((s) => <li key={s} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-amber-500" /> {s}</li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Strong across every category — keep it up.</p>}
        </GlassCard>
      </div>

      {/* Recommendations */}
      <GlassCard className="p-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><GraduationCap className="size-4 text-brand-600" /> Recommended training</h2>
        <p className="mb-4 text-xs text-muted-foreground">Matched to your readiness and gaps.</p>
        <div className="space-y-3">
          {view.recommendations.map((r, i) => (
            <div key={r.moduleId} className="rounded-xl border bg-background/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-700">{i + 1}</div>
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{r.reason}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="secondary">{r.level}</Badge>
                  {r.durationHours ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" /> {r.durationHours}h</span> : null}
                </div>
              </div>
              {r.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.skills.map((s) => <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{s}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* AI summary */}
      <AiSummaryCard kind="employee" sessionId={view.sessionId} initialSummary={view.aiSummary} />
    </div>
  );
}
