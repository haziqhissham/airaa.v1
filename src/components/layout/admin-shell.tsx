import Link from "next/link";
import {
  Building,
  BrainCircuit,
  Gauge,
  GitBranch,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ListChecks,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { Badge } from "@/components/ui/badge";
import { cn, initials } from "@/lib/utils";
import type { UserRole } from "@/domain/enums";

interface AdminNavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { key: "overview", label: "Overview", href: "/admin", icon: LayoutDashboard },
  { key: "organization", label: "Organization", href: "/admin/organization", icon: Building },
  { key: "categories", label: "Categories", href: "/admin/categories", icon: Layers },
  { key: "questions", label: "Questions", href: "/admin/questions", icon: ListChecks },
  { key: "readinessLevels", label: "Readiness Levels", href: "/admin/readinessLevels", icon: Gauge },
  { key: "modules", label: "Training Modules", href: "/admin/modules", icon: GraduationCap },
  { key: "recommendations", label: "Recommendation Rules", href: "/admin/recommendations", icon: GitBranch },
  { key: "employees", label: "Employees", href: "/admin/employees", icon: Users },
];

interface AdminShellProps {
  orgName: string;
  displayName: string;
  role: UserRole;
  active: string;
  children: React.ReactNode;
}

export function AdminShell({
  orgName,
  displayName,
  role,
  active,
  children,
}: AdminShellProps) {
  return (
    <div className="brand-bg min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-brand-gradient text-white shadow">
              <BrainCircuit className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Admin Console</p>
              <p className="text-xs text-muted-foreground">{orgName}</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="grid size-8 place-items-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-700">
                {initials(displayName)}
              </div>
              <Badge variant="info">{role}</Badge>
            </div>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-1">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-brand-500/10 font-medium text-brand-700"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
