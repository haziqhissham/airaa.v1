import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { getActiveOrganizationId } from "@/lib/auth/tenant";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Create account" };

async function loadDepartments() {
  try {
    const orgId = await getActiveOrganizationId();
    const departments = await prisma.department.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    });
    return departments.map((d) => ({ id: d.id, name: d.name }));
  } catch {
    return [];
  }
}

export default async function RegisterPage() {
  const departments = await loadDepartments();
  return <RegisterForm departments={departments} />;
}
