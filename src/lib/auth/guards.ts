import "server-only";

/**
 * Route guards for server components / server actions. Complements middleware
 * (session refresh + coarse gate) with authoritative role + profile checks.
 * RLS remains the hard boundary; these drive routing/UX.
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/roles";
import type { UserRole } from "@/domain/enums";
import type { User } from "@/domain/types";

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireProfile(): Promise<User> {
  const user = await requireUser();
  if (!user.profileComplete) redirect("/register");
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<User> {
  const user = await requireProfile();
  if (!roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

export { homeForRole };
