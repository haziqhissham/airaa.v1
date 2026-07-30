import type { Metadata } from "next";
import { Building2, CheckCircle2, Target, Users } from "lucide-react";
import { AppChrome } from "@/components/layout/app-chrome";
import { GlassCard } from "@/components/shared/glass-card";
import { StatTile } from "@/components/charts/stat-tile";
import { requireRole } from "@/lib/auth/guards";
import { UserRole } from "@/domain/enums";
import { getActiveOrganization } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Super Admin" };

interface OrgStat { id: string; name: string; employees: number; completed: number; avg: number }

async function loadPlatform() {
  try {
    const orgs = await prisma.organization.findMany({ orderBy: { name: "asc" } });
    const stats: OrgStat[] = [];
    let totalEmployees = 0;
    let totalCompleted = 0;
    const allScores: number[] = [];
    for (const o of orgs) {
      const [employees, scores] = await Promise.all([
        prisma.employee.count({ where: { organizationId: o.id } }),
        prisma.assessmentScore.findMany({ where: { organizationId: o.id }, select: { overallScore: true } }),
      ]);
      const avg = scores.length ? Math.round(scores.reduce((a, s) => a + s.overallScore, 0) / scores.length) : 0;
      totalEmployees += employees;
      totalCompleted += scores.length;
      allScores.push(...scores.map((s) => s.overallScore));
      stats.push({ id: o.id, name: o.name, employees, completed: scores.length, avg });
    }
    const platformAvg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    return { orgs: stats, totalOrgs: orgs.length, totalEmployees, totalCompleted, platformAvg };
  } catch {
    return { orgs: [], totalOrgs: 0, totalEmployees: 0, totalCompleted: 0, platformAvg: 0 };
  }
}

export default async function SuperAdminPage() {
  const user = await requireRole(UserRole.SUPER_ADMIN);
  const org = await getActiveOrganization();
  const p = await loadPlatform();

  return (
    <AppChrome orgName={org.name} displayName={user.displayName ?? user.email} role={user.role}>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
          <p className="mt-1 text-muted-foreground">Platform-wide overview across all organizations.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Organizations" value={p.totalOrgs} icon={Building2} />
          <StatTile label="Employees" value={p.totalEmployees} icon={Users} />
          <StatTile label="Completed" value={p.totalCompleted} icon={CheckCircle2} />
          <StatTile label="Platform average" value={p.platformAvg} suffix="/ 100" icon={Target} />
        </div>

        <GlassCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Employees</th>
                  <th className="px-4 py-3 font-medium">Completed</th>
                  <th className="px-4 py-3 font-medium">Avg score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {p.orgs.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No organizations yet.</td></tr>
                ) : p.orgs.map((o) => (
                  <tr key={o.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">{o.name}</td>
                    <td className="px-4 py-3 tabular-nums">{o.employees}</td>
                    <td className="px-4 py-3 tabular-nums">{o.completed}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{o.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppChrome>
  );
}
