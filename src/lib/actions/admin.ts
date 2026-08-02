"use server";

/** Admin Server Actions (v2, Prisma + Supabase). Org profile + role management. */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getActiveOrganizationId } from "@/lib/auth/tenant";
import { RESOURCES } from "@/lib/admin/resources";
import { delegate } from "@/lib/admin/prisma-crud";
import { ORG_MANAGER_ROLES, UserRole } from "@/domain/enums";
import type { OrgStatus, Role } from "@prisma/client";

export interface AdminActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function audit(organizationId: string, actorId: string, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
  await prisma.auditLog
    .create({ data: { organizationId, actorId, action, targetType, targetId, metadata: metadata as never } })
    .catch(() => {});
}

export async function adminSave(
  resourceKey: string,
  id: string | null,
  values: Record<string, unknown>,
): Promise<AdminActionResult> {
  const resource = RESOURCES[resourceKey];
  if (!resource) return { ok: false, error: "Unknown resource." };
  const del = delegate(resource.model);
  if (!del) return { ok: false, error: "Resource is not manageable." };

  const parsed = resource.schema.safeParse(values);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };

  const doc = resource.toDoc
    ? resource.toDoc(parsed.data as Record<string, unknown>)
    : (parsed.data as Record<string, unknown>);

  const { user, organizationId } = await ctx();
  try {
    const saved = id ? await del.update(id, doc) : await del.create(organizationId, doc);
    await audit(organizationId, user.uid, id ? "CONTENT_UPDATED" : "CONTENT_CREATED", resource.key, saved.id);
    return { ok: true, id: saved.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function adminDelete(
  resourceKey: string,
  id: string,
): Promise<AdminActionResult> {
  const resource = RESOURCES[resourceKey];
  if (!resource) return { ok: false, error: "Unknown resource." };
  const del = delegate(resource.model);
  if (!del) return { ok: false, error: "Resource is not manageable." };

  const { user, organizationId } = await ctx();
  try {
    await del.remove(id);
    await audit(organizationId, user.uid, "CONTENT_DELETED", resource.key, id);
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed." };
  }
}

async function ctx() {
  const user = await requireRole(...ORG_MANAGER_ROLES);
  const organizationId = await getActiveOrganizationId();
  return { user, organizationId };
}

const orgSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  status: z.string().min(1),
  logoUrl: z.string().optional().default(""),
  // Branding theme is optional here: it is only ever persisted for super
  // admins (see below), so non-super-admin saves omit these fields entirely.
  themePrimary: z.string().min(1).optional(),
  themeGradFrom: z.string().min(1).optional(),
  themeGradTo: z.string().min(1).optional(),
});

export async function saveOrganization(
  values: Record<string, unknown>,
): Promise<AdminActionResult> {
  const { user, organizationId } = await ctx();
  const parsed = orgSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  const v = parsed.data;

  // Only SUPER_ADMIN may change the white-label branding theme. Any theme
  // fields sent by a lower role are ignored so the columns can't drift.
  const canEditBranding = user.role === UserRole.SUPER_ADMIN;
  const brandingData =
    canEditBranding && v.themePrimary && v.themeGradFrom && v.themeGradTo
      ? {
          themePrimary: v.themePrimary,
          themeGradFrom: v.themeGradFrom,
          themeGradTo: v.themeGradTo,
        }
      : {};

  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: v.name,
        slug: v.slug,
        status: v.status as OrgStatus,
        logoUrl: v.logoUrl || null,
        ...brandingData,
      },
    });
    await audit(organizationId, user.uid, "CONTENT_UPDATED", "organization", organizationId, {
      brandingChanged: Object.keys(brandingData).length > 0,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function setEmployeeRole(
  uid: string,
  role: string,
): Promise<AdminActionResult> {
  if (!Object.values(UserRole).includes(role as UserRole))
    return { ok: false, error: "Invalid role." };

  const { user, organizationId } = await ctx();

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(uid, {
    app_metadata: { role, organization_id: organizationId },
  });
  if (error) return { ok: false, error: error.message };

  try {
    await prisma.employee.update({
      where: { userId: uid },
      data: { role: role as Role },
    });
  } catch {
    // profile row not present yet — non-fatal
  }

  await prisma.auditLog
    .create({
      data: {
        organizationId,
        actorId: user.uid,
        action: "ROLE_CHANGED",
        targetType: "user",
        targetId: uid,
        metadata: { role },
      },
    })
    .catch(() => {});

  return { ok: true };
}
