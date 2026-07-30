import { HR_ROLES, ORG_MANAGER_ROLES, UserRole } from "@/domain/enums";
import type { UserRole as Role } from "@/domain/enums";

export interface NavItem {
  title: string;
  href: string;
  icon: string; // lucide icon name
  roles: Role[];
}

const ALL_ROLES: Role[] = Object.values(UserRole);

/** Role-aware primary navigation. Rendered by the app shell. */
export const navItems: NavItem[] = [
  { title: "Home", href: "/dashboard", icon: "LayoutDashboard", roles: ALL_ROLES },
  { title: "Assessment", href: "/assessment", icon: "ClipboardList", roles: ALL_ROLES },
  { title: "My Result", href: "/result", icon: "Sparkles", roles: ALL_ROLES },
  { title: "HR Dashboard", href: "/hr", icon: "BarChart3", roles: HR_ROLES },
  { title: "Admin", href: "/admin", icon: "Settings", roles: ORG_MANAGER_ROLES },
];

export function navForRole(role: Role): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}
