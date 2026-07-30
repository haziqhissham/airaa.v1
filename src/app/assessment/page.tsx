import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppChrome } from "@/components/layout/app-chrome";
import { ComingSoon } from "@/components/shared/coming-soon";
import { AssessmentRunner } from "@/components/assessment/assessment-runner";
import { requireProfile } from "@/lib/auth/guards";
import { getActiveOrganization, getActiveOrganizationId } from "@/lib/auth/tenant";
import { loadAssessmentForm } from "@/lib/assessment/v2-loader";
import { startOrResumeAssessment } from "@/lib/actions/assessment";

export const metadata: Metadata = { title: "Assessment" };

export default async function AssessmentPage() {
  const user = await requireProfile();
  const org = await getActiveOrganization();
  const orgId = await getActiveOrganizationId();

  const start = await startOrResumeAssessment();
  if (start.ok && start.status === "SUBMITTED") redirect("/dashboard");

  const sections = (await loadAssessmentForm(orgId)).filter(
    (s) => s.questions.length > 0,
  );

  const chrome = (children: React.ReactNode) => (
    <AppChrome orgName={org.name} displayName={user.displayName ?? user.email} role={user.role}>
      {children}
    </AppChrome>
  );

  if (!start.ok || !start.sessionId || sections.length === 0) {
    return chrome(
      <ComingSoon
        module="Assessment"
        title="No assessment is available yet"
        description={
          start.error ??
          "This organization hasn't published an assessment. Please check back soon or contact your administrator."
        }
      />,
    );
  }

  return chrome(
    <AssessmentRunner
      sessionId={start.sessionId}
      sections={sections}
      initialAnswers={start.answers ?? {}}
      initialCategoryId={start.currentCategoryId}
    />,
  );
}
