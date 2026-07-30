import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { AdminShell, ADMIN_NAV } from "@/components/layout/admin-shell";
import { GlassCard } from "@/components/shared/glass-card";
import { requireRole } from "@/lib/auth/guards";
import { ORG_MANAGER_ROLES } from "@/domain/enums";
import { getActiveOrganization, getActiveOrganizationId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Admin" };

async function loadCounts(orgId: string) {
  try {
    const [categories, questions, modules, levels, recommendations, employees, completed] =
      await Promise.all([
        prisma.assessmentCategory.count({ where: { organizationId: orgId } }),
        prisma.assessmentQuestion.count({ where: { organizationId: orgId } }),
        prisma.trainingModule.count({ where: { organizationId: orgId } }),
        prisma.readinessLevel.count({ where: { organizationId: orgId } }),
        prisma.recommendation.count({ where: { organizationId: orgId } }),
        prisma.employee.count({ where: { organizationId: orgId } }),
        prisma.assessmentScore.count({ where: { organizationId: orgId } }),
      ]);
    return { categories, questions, modules, levels, recommendations, employees, completed };
  } catch {
    return { categories: 0, questions: 0, modules: 0, levels: 0, recommendations: 0, employees: 0, completed: 0 };
  }
}

export default async function AdminOverviewPage() {
  const user = await requireRole(...ORG_MANAGER_ROLES);
  const org = await getActiveOrganization();
  const orgId = await getActiveOrganizationId();
  const c = await loadCounts(orgId);

  const health = [
    { ok: c.categories >= 1, label: `Assessment categories configured (${c.categories})` },
    { ok: c.questions >= 1, label: `Questions configured (${c.questions})` },
    { ok: c.levels === 5, label: `Five readiness levels defined (${c.levels})` },
    { ok: c.modules >= 1, label: `Training modules exist (${c.modules})` },
    { ok: c.recommendations >= 1, label: `Recommendation rules exist (${c.recommendations})` },
  ];

  const stats = [
    { label: "Employees", value: c.employees, href: "/admin/employees" },
    { label: "Completed assessments", value: c.completed, href: "/hr" },
    { label: "Categories", value: c.categories, href: "/admin/categories" },
    { label: "Questions", value: c.questions, href: "/admin/questions" },
    { label: "Training modules", value: c.modules, href: "/admin/modules" },
    { label: "Recommendation rules", value: c.recommendations, href: "/admin/recommendations" },
  ];

  return (
    <AdminShell orgName={org.name} displayName={user.displayName ?? user.email} role={user.role} active="overview">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">Manage the assessment content, catalogue and people for {org.name}.</p>
        </div>

        <GlassCard className="p-6">
          <h2 className="mb-4 font-semibold">Configuration health</h2>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {health.map((h) => (
              <li key={h.label} className="flex items-center gap-2 text-sm">
                {h.ok ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="size-4 shrink-0 text-amber-600" />}
                <span className={h.ok ? "" : "text-amber-700"}>{h.label}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <Link key={s.label} href={s.href}>
              <GlassCard className="p-5 transition-shadow hover:shadow-md">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
              </GlassCard>
            </Link>
          ))}
        </div>

        <GlassCard className="p-6">
          <h2 className="mb-3 font-semibold">Manage</h2>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {ADMIN_NAV.filter((n) => n.key !== "overview").map((n) => {
              const Icon = n.icon;
              return (
                <Link key={n.key} href={n.href} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent">
                  <span className="flex items-center gap-2.5"><Icon className="size-4 text-brand-600" /> {n.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </AdminShell>
  );
}
