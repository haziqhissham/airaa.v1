/** Platform-level configuration (tenant-neutral). Client branding comes from the
 *  resolved Organization document — see lib/auth/tenant.ts. */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "MDEC AI Readiness Assessment",
  description:
    "Measure your AI readiness and discover the MDEC AI training programme that fits you best.",
  durationMinutes: 15,
  owner: "MDEC",
} as const;

export type SiteConfig = typeof siteConfig;
