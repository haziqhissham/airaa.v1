/** Role hierarchy, labels and home routing (v2, six roles). Framework-free. */

import { UserRole } from "@/domain/enums";

export const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Organization Admin",
  HR_ADMIN: "HR Admin",
  TRAINER: "Trainer",
  EMPLOYEE: "Employee",
  GUEST: "Guest",
};

/** Higher number = more privilege. */
const RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 50,
  ORG_ADMIN: 40,
  HR_ADMIN: 30,
  TRAINER: 20,
  EMPLOYEE: 10,
  GUEST: 0,
};

export function roleAtLeast(role: UserRole, min: UserRole): boolean {
  return RANK[role] >= RANK[min];
}

/** Landing route after login, by role. (Super/Org dashboards land in Step 6.) */
export function homeForRole(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super";
    case "ORG_ADMIN":
      return "/admin";
    case "HR_ADMIN":
      return "/hr";
    default:
      return "/dashboard";
  }
}
