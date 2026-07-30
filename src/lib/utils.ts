import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fallback organization used only for public/unauthenticated contexts (e.g. the
 * marketing landing) when no tenant can be resolved from the host or session.
 * Authenticated flows always use the org resolved from the user's session.
 */
export const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "org-jlg";

export function formatScore(n: number): string {
  return `${Math.round(n)}`;
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Small helper for building initials from a name. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
