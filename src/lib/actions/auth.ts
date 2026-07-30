"use server";

/**
 * Supabase auth Server Actions. Registration writes the auth user's role/org to
 * `app_metadata` (read by RLS) via the service-role client, and upserts the
 * Prisma employee profile. Login resolves the post-auth destination by role.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/db/prisma";
import { getActiveOrganizationId } from "@/lib/auth/tenant";
import { homeForRole } from "@/lib/auth/roles";
import {
  employeeProfileSchema,
  type EmployeeProfileInput,
} from "@/lib/validation/auth";
import { UserRole } from "@/domain/enums";

export interface ActionResult {
  ok: boolean;
  error?: string;
  role?: UserRole;
}

export async function completeRegistration(
  raw: EmployeeProfileInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };

  const parsed = employeeProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form" };
  }
  const profile = parsed.data;

  const organizationId = await getActiveOrganizationId();
  const role = UserRole.EMPLOYEE;
  const name =
    profile.name || (user.user_metadata?.name as string) || user.email || "";

  // Authoritative role/org/profile claims → app_metadata (read by RLS).
  const admin = createAdminClient();
  const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      role,
      organization_id: organizationId,
      profile_complete: true,
    },
    user_metadata: { name },
  });
  if (metaErr) return { ok: false, error: metaErr.message };

  // Rich profile row (best-effort — requires the org row to exist; Step 4 seed).
  try {
    await prisma.employee.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        organizationId,
        departmentId: profile.departmentId || null,
        name,
        email: user.email ?? "",
        jobPosition: profile.jobPosition,
        jobGrade: profile.jobGrade,
        yearsOfService: profile.yearsOfService,
        ageGroup: profile.ageGroup,
        officeLocation: profile.officeLocation,
        role,
      },
      update: {
        departmentId: profile.departmentId || null,
        name,
        jobPosition: profile.jobPosition,
        jobGrade: profile.jobGrade,
        yearsOfService: profile.yearsOfService,
        ageGroup: profile.ageGroup,
        officeLocation: profile.officeLocation,
      },
    });
  } catch (err) {
    // Non-fatal until the database is provisioned + seeded (Step 4).
    console.error("employee profile upsert deferred:", err);
  }

  return { ok: true, role };
}

export async function afterLogin(): Promise<{ redirect: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { redirect: "/login" };

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (!meta.profile_complete) return { redirect: "/register" };

  return { redirect: homeForRole((meta.role as UserRole) ?? UserRole.EMPLOYEE) };
}
