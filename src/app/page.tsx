import { LandingHero } from "@/components/marketing/landing-hero";
import { getActiveOrganization } from "@/lib/auth/tenant";

/** Module 1 — Landing Page (public, white-label per resolved tenant). */
export default async function HomePage() {
  const org = await getActiveOrganization();
  return (
    <LandingHero orgName={org.name} logoUrl={org.logoUrl} theme={org.theme} />
  );
}
