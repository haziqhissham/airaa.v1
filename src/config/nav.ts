import { HR_ROLES, ORG_MANAGER_ROLES, UserRole } from "@/domain/enums";
import type { UserRole as Role } from "@/domain/enums";

export interface NavItem {
  title: string;
  href: string;
  roles: Role[];
}

const ALL_ROLES: Role[] = Object.values(UserRole);

/** Role-aware primary navigation. Rendered by the app header. */
export const navItems: NavItem[] = [
  { title: "Home", href: "/dashboard", roles: ALL_ROLES },
  { title: "Assessment", href: "/assessment", roles: ALL_ROLES },
  { title: "My Result", href: "/result", roles: ALL_ROLES },
  { title: "HR", href: "/hr", roles: HR_ROLES },
  { title: "Admin", href: "/admin", roles: ORG_MANAGER_ROLES },
  { title: "Super", href: "/super", roles: [UserRole.SUPER_ADMIN] },
];

export function navForRole(role: Role): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}
