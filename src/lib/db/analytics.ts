import "server-only";

import { prisma } from "@/lib/db/prisma";

export interface TierSlice { tier: string; label: string; color: string; count: number; pct: number }
export interface GroupStat { name: string; avg: number; count: number }
export interface HeatRow { department: string; cells: { category: string; score: number }[] }
export interface LeaderRow { name: string; department: string; score: number; tierLabel: string }
export interface ExportRow { name: string; email: string; department: string; overall: number; tier: string }

export interface OrgAnalytics {
  totalEmployees: number;
  completed: number;
  participationRate: number;
  averageScore: number;
  aiReadyCount: number;
  tierDistribution: TierSlice[];
  categoryAverages: { key: string; name: string; score: number }[];
  departmentScores: GroupStat[];
  lowestDepartments: GroupStat[];
  heatmap: HeatRow[];
  categoriesForHeat: string[];
  leaderboard: LeaderRow[];
  rows: ExportRow[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export async function loadOrgAnalytics(orgId: string): Promise<OrgAnalytics> {
  const [scores, categories, levels, totalEmployees] = await Promise.all([
    prisma.assessmentScore.findMany({
      where: { organizationId: orgId },
      include: {
        readinessLevel: true,
        employee: { include: { department: true } },
      },
    }),
    prisma.assessmentCategory.findMany({ where: { organizationId: orgId }, orderBy: { order: "asc" } }),
    prisma.readinessLevel.findMany({ where: { organizationId: orgId }, orderBy: { order: "asc" } }),
    prisma.employee.count({ where: { organizationId: orgId } }),
  ]);

  const completed = scores.length;
  const averageScore = mean(scores.map((s) => s.overallScore));

  // Tier distribution
  const tierCount = new Map<string, number>();
  for (const s of scores) {
    const t = s.readinessLevel?.tier ?? "UNKNOWN";
    tierCount.set(t, (tierCount.get(t) ?? 0) + 1);
  }
  const tierDistribution: TierSlice[] = levels.map((l) => {
    const count = tierCount.get(l.tier) ?? 0;
    return { tier: l.tier, label: l.label, color: l.color, count, pct: completed ? Math.round((count / completed) * 100) : 0 };
  });
  const aiReadyCount = tierCount.get("AI_READY") ?? 0;

  // Category averages
  const catAcc = new Map<string, number[]>();
  for (const s of scores) {
    const cs = (s.categoryScores ?? {}) as Record<string, number>;
    for (const c of categories) {
      const arr = catAcc.get(c.id) ?? [];
      if (cs[c.id] !== undefined) arr.push(cs[c.id]!);
      catAcc.set(c.id, arr);
    }
  }
  const categoryAverages = categories.map((c) => ({ key: c.key, name: c.name, score: mean(catAcc.get(c.id) ?? []) }));

  // Department rollups + heatmap
  const deptScores = new Map<string, number[]>();
  const deptCat = new Map<string, Map<string, number[]>>();
  for (const s of scores) {
    const dept = s.employee.department?.name ?? "Unassigned";
    (deptScores.get(dept) ?? deptScores.set(dept, []).get(dept)!).push(s.overallScore);
    const cs = (s.categoryScores ?? {}) as Record<string, number>;
    const cm = deptCat.get(dept) ?? new Map();
    for (const c of categories) {
      const arr = cm.get(c.id) ?? [];
      if (cs[c.id] !== undefined) arr.push(cs[c.id]!);
      cm.set(c.id, arr);
    }
    deptCat.set(dept, cm);
  }
  const departmentScores: GroupStat[] = [...deptScores.entries()]
    .map(([name, xs]) => ({ name, avg: mean(xs), count: xs.length }))
    .sort((a, b) => b.avg - a.avg);
  const lowestDepartments = [...departmentScores].sort((a, b) => a.avg - b.avg).slice(0, 5);

  const heatmap: HeatRow[] = [...deptCat.entries()].map(([department, cm]) => ({
    department,
    cells: categories.map((c) => ({ category: c.name, score: mean(cm.get(c.id) ?? []) })),
  }));

  // Leaderboard
  const leaderboard: LeaderRow[] = [...scores]
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 5)
    .map((s) => ({
      name: s.employee.name,
      department: s.employee.department?.name ?? "—",
      score: Math.round(s.overallScore),
      tierLabel: s.readinessLevel?.label ?? "—",
    }));

  const rows: ExportRow[] = scores.map((s) => ({
    name: s.employee.name,
    email: s.employee.email,
    department: s.employee.department?.name ?? "",
    overall: Math.round(s.overallScore),
    tier: s.readinessLevel?.label ?? "",
  }));

  return {
    totalEmployees,
    completed,
    participationRate: totalEmployees ? Math.round((completed / totalEmployees) * 100) : 0,
    averageScore,
    aiReadyCount,
    tierDistribution,
    categoryAverages,
    departmentScores,
    lowestDepartments,
    heatmap,
    categoriesForHeat: categories.map((c) => c.name),
    leaderboard,
    rows,
  };
}
