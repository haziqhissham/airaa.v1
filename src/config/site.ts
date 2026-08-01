/** Platform-level configuration (tenant-neutral). Client branding comes from the
 *  resolved Organization document — see lib/auth/tenant.ts. */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "AI Readiness Assessment",
  description:
    "Measure your AI readiness and discover the training that fits you best.",
  durationMinutes: 15,
  owner: "AI Readiness",
  /** Demo build: enables sample-only tools like "Reset my assessment". Never set in production. */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
} as const;

export type SiteConfig = typeof siteConfig;
