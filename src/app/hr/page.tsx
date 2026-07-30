import type { Metadata } from "next";
import { AppChrome } from "@/components/layout/app-chrome";
import { HrDashboardV2 } from "@/components/hr/hr-dashboard-v2";
import { requireRole } from "@/lib/auth/guards";
import { HR_ROLES } from "@/domain/enums";
import { getActiveOrganization, getActiveOrganizationId } from "@/lib/auth/tenant";
import { loadOrgAnalytics, type OrgAnalytics } from "@/lib/db/analytics";

export const metadata: Metadata = { title: "HR Dashboard" };
/** Allow up to 60s for on-page AI report generation. */
export const maxDuration = 60;

const EMPTY: OrgAnalytics = {
  totalEmployees: 0, completed: 0, participationRate: 0, averageScore: 0, aiReadyCount: 0,
  tierDistribution: [], categoryAverages: [], departmentScores: [], lowestDepartments: [],
  heatmap: [], categoriesForHeat: [], leaderboard: [], rows: [],
};

export default async function HrPage() {
  const user = await requireRole(...HR_ROLES);
  const org = await getActiveOrganization();
  const orgId = await getActiveOrganizationId();

  let analytics = EMPTY;
  try {
    analytics = await loadOrgAnalytics(orgId);
  } catch {
    analytics = EMPTY;
  }

  return (
    <AppChrome orgName={org.name} displayName={user.displayName ?? user.email} role={user.role}>
      <HrDashboardV2 orgName={org.name} analytics={analytics} />
    </AppChrome>
  );
}
