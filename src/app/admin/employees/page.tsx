import type { Metadata } from "next";
import { AdminShell } from "@/components/layout/admin-shell";
import { EmployeesTable, type EmployeeRow } from "@/components/admin/employees-table";
import { requireRole } from "@/lib/auth/guards";
import { ORG_MANAGER_ROLES } from "@/domain/enums";
import { getActiveOrganization, getActiveOrganizationId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Employees" };

async function loadEmployees(orgId: string): Promise<EmployeeRow[]> {
  try {
    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      include: { department: true, sessions: { where: { status: "SUBMITTED" }, take: 1 } },
    });
    return employees.map((e) => ({
      uid: e.userId,
      name: e.name,
      email: e.email,
      department: e.department?.name ?? "—",
      role: e.role,
      completed: e.sessions.length > 0,
    }));
  } catch {
    return [];
  }
}

export default async function AdminEmployeesPage() {
  const user = await requireRole(...ORG_MANAGER_ROLES);
  const org = await getActiveOrganization();
  const orgId = await getActiveOrganizationId();
  const rows = await loadEmployees(orgId);

  return (
    <AdminShell orgName={org.name} displayName={user.displayName ?? user.email} role={user.role} active="employees">
      <EmployeesTable rows={rows} />
    </AdminShell>
  );
}
