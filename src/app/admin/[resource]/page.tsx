import { notFound } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { ResourceManager } from "@/components/admin/resource-manager";
import { requireRole } from "@/lib/auth/guards";
import { ORG_MANAGER_ROLES } from "@/domain/enums";
import { getActiveOrganization, getActiveOrganizationId } from "@/lib/auth/tenant";
import { RESOURCES } from "@/lib/admin/resources";
import { delegate, loadDynamicOptions } from "@/lib/admin/prisma-crud";

export default async function AdminResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource: resourceKey } = await params;
  const resource = RESOURCES[resourceKey];
  if (!resource) notFound();

  const user = await requireRole(...ORG_MANAGER_ROLES);
  const org = await getActiveOrganization();
  const orgId = await getActiveOrganizationId();

  const del = delegate(resource.model);
  if (!del) notFound();

  let rows: (Record<string, unknown> & { id: string })[] = [];
  let dynamicOptions: Record<string, { value: string; label: string }[]> = {};
  try {
    [rows, dynamicOptions] = await Promise.all([
      del.list(orgId),
      loadDynamicOptions(orgId, resource.dynamicSources),
    ]);
  } catch {
    rows = [];
  }

  return (
    <AdminShell orgName={org.name} displayName={user.displayName ?? user.email} role={user.role} active={resourceKey}>
      <ResourceManager resourceKey={resourceKey} rows={rows} dynamicOptions={dynamicOptions} />
    </AdminShell>
  );
}
