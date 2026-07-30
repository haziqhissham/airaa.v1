"use client";

import {
  BarChart3,
  Building2,
  Grid3x3,
  Target,
  TrendingDown,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/shared/glass-card";
import { StatTile } from "@/components/charts/stat-tile";
import { PersonaDonut } from "@/components/charts/persona-donut";
import { HorizontalBar } from "@/components/charts/horizontal-bar";
import { CategoryRadar } from "@/components/charts/category-radar";
import { Heatmap } from "@/components/charts/heatmap";
import { AiSummaryCard } from "@/components/ai/ai-summary-card";
import { ExportButtons } from "@/components/export/export-buttons";
import { scoreTone } from "@/lib/labels";
import type { OrgAnalytics } from "@/lib/db/analytics";

function ChartCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <GlassCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-brand-600" /> {title}</h2>
      {subtitle && <p className="mb-4 mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </GlassCard>
  );
}

export function HrDashboardV2({ orgName, analytics }: { orgName: string; analytics: OrgAnalytics }) {
  if (analytics.completed === 0) {
    return (
      <GlassCard className="flex flex-col items-center gap-4 p-12 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-600"><BarChart3 className="size-7" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">No results yet</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Analytics appear here once employees complete the assessment.</p>
        </div>
      </GlassCard>
    );
  }

  const tierSlices = analytics.tierDistribution.map((t) => ({ key: t.tier, label: t.label, count: t.count, pct: t.pct, color: t.color }));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
          <p className="mt-1 text-muted-foreground">AI readiness across {orgName}.</p>
        </div>
        <ExportButtons kind="org" analytics={analytics} orgName={orgName} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Average readiness" value={Math.round(analytics.averageScore)} suffix="/ 100" icon={Target} hint={scoreTone(analytics.averageScore).label} />
        <StatTile label="Completed" value={analytics.completed} icon={Users} hint={`${analytics.participationRate}% of ${analytics.totalEmployees}`} />
        <StatTile label="AI Ready" value={analytics.aiReadyCount} icon={Trophy} hint="Top tier" />
        <StatTile label="Departments" value={analytics.departmentScores.length} icon={Building2} hint="Assessed" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Readiness distribution" subtitle="Employees per readiness level." icon={Users}>
          <PersonaDonut data={tierSlices} />
        </ChartCard>
        <ChartCard title="Category profile" subtitle="Average across the assessment sections." icon={Target}>
          <CategoryRadar data={analytics.categoryAverages.map((c) => ({ label: c.name, score: c.score }))} />
        </ChartCard>
      </div>

      <ChartCard title="Department comparison" subtitle="Average readiness score by department." icon={BarChart3}>
        <HorizontalBar data={analytics.departmentScores.map((d) => ({ name: d.name, value: d.avg }))} domainMax={100} />
      </ChartCard>

      <ChartCard title="Readiness heat map" subtitle="Department × category — spot where to focus." icon={Grid3x3}>
        <Heatmap rows={analytics.heatmap} categories={analytics.categoriesForHeat} />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Leaderboard" icon={Trophy}>
          <ul className="divide-y divide-border">
            {analytics.leaderboard.map((c, i) => (
              <li key={c.name + i} className="flex items-center gap-3 py-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-700">{i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.department}</p></div>
                <Badge variant="info">{c.tierLabel}</Badge>
                <span className="w-8 text-right text-sm font-semibold tabular-nums">{c.score}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
        <ChartCard title="Lowest-readiness departments" subtitle="Where targeted training helps most." icon={TrendingDown}>
          <ul className="divide-y divide-border">
            {analytics.lowestDepartments.map((d) => {
              const tone = scoreTone(d.avg);
              return (
                <li key={d.name} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-xs text-muted-foreground">{d.count} assessed</span>
                  <span className={`w-10 text-right font-semibold tabular-nums ${tone.className}`}>{Math.round(d.avg)}</span>
                </li>
              );
            })}
          </ul>
        </ChartCard>
      </div>

      <AiSummaryCard kind="org" />
    </div>
  );
}
