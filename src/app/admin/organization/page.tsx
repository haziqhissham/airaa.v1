import type { Metadata } from "next";
import { AdminShell } from "@/components/layout/admin-shell";
import { OrgEditor } from "@/components/admin/org-editor";
import { requireRole } from "@/lib/auth/guards";
import { ORG_MANAGER_ROLES } from "@/domain/enums";
import { getActiveOrganization } from "@/lib/auth/tenant";

export const metadata: Metadata = { title: "Organization" };

export default async function AdminOrganizationPage() {
  const user = await requireRole(...ORG_MANAGER_ROLES);
  const org = await getActiveOrganization();

  return (
    <AdminShell orgName={org.name} displayName={user.displayName ?? user.email} role={user.role} active="organization">
      <OrgEditor org={org} />
    </AdminShell>
  );
}
