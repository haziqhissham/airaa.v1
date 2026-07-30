import "server-only";

/**
 * Supabase-backed session resolution. Identity, role and organization come from
 * the auth user's `app_metadata` (the same claims RLS policies read via
 * `auth.jwt()`), so no DB round-trip is needed to authorize a request.
 */

import { createClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@/domain/enums";
import type { User } from "@/domain/types";

export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;

    return {
      uid: user.id,
      email: user.email ?? "",
      role: (meta.role as UserRole) ?? UserRole.EMPLOYEE,
      organizationId: (meta.organization_id as string) ?? "",
      status: UserStatus.ACTIVE,
      profileComplete: Boolean(meta.profile_complete),
      displayName:
        (userMeta.name as string) ?? (userMeta.full_name as string) ?? user.email ?? undefined,
      lastLoginAt: user.last_sign_in_at ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function getSessionUid(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.uid ?? null;
}
