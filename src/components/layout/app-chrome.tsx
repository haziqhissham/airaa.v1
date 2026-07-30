import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/auth/roles";
import type { UserRole } from "@/domain/enums";

interface AppChromeProps {
  orgName: string;
  displayName: string;
  role: UserRole;
  children: React.ReactNode;
}

/** Shared shell for authenticated pages: sticky header + content container. */
export function AppChrome({ orgName, displayName, role, children }: AppChromeProps) {
  return (
    <div className="brand-bg min-h-dvh">
      <header className="no-print sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-brand-gradient text-white shadow">
              <BrainCircuit className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">MDEC AI Readiness</p>
              <p className="text-xs text-muted-foreground">{orgName}</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="grid size-8 place-items-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-700">
                {initials(displayName)}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium">{displayName}</p>
              </div>
              <Badge variant="info">{ROLE_LABEL[role]}</Badge>
            </div>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
