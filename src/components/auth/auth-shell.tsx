import Link from "next/link";
import { BrainCircuit, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { siteConfig } from "@/config/site";
import type { OrganizationTheme } from "@/domain/types";

interface AuthShellProps {
  orgName: string;
  logoUrl?: string;
  theme?: OrganizationTheme;
  children: React.ReactNode;
}

/** Split-screen auth layout: branded panel + form column (white-label). */
export function AuthShell({ orgName, logoUrl, theme, children }: AuthShellProps) {
  const panelStyle = {
    background: theme
      ? `linear-gradient(150deg, ${theme.gradientFrom} 0%, ${theme.primary} 55%, ${theme.gradientTo} 100%)`
      : "linear-gradient(150deg, #005352 0%, #008988 55%, #00b6b5 100%)",
  } as React.CSSProperties;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between p-10 text-white lg:flex"
        style={panelStyle}
      >
        <div className="pointer-events-none absolute -right-16 top-20 size-72 rounded-full bg-white/10 blur-3xl" />
        <Link href="/" className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${orgName} logo`}
              className="size-10 rounded-xl bg-white/10 object-contain p-1"
            />
          ) : (
            <div className="grid size-10 place-items-center rounded-xl bg-white/15">
              <BrainCircuit className="size-6" />
            </div>
          )}
          <div className="leading-tight">
            <p className="font-semibold">AI Readiness</p>
            <p className="text-sm text-white/70">{orgName}</p>
          </div>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Understand your AI readiness. Grow with the right training.
          </h2>
          <ul className="mt-8 space-y-4 text-white/85">
            <li className="flex items-center gap-3">
              <Sparkles className="size-5" /> 45-question, three-category
              assessment
            </li>
            <li className="flex items-center gap-3">
              <BrainCircuit className="size-5" /> Instant AI persona + readiness
              score
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-5" /> Confidential — training guidance
              only
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} {orgName} · {siteConfig.name}
        </p>
      </div>

      {/* Form column */}
      <div className="brand-bg relative flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium lg:invisible"
          >
            <BrainCircuit className="size-5 text-brand-600" /> AI Readiness
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
