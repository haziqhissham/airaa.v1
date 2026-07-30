import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppChrome } from "@/components/layout/app-chrome";
import { ResultView } from "@/components/result/result-view";
import { requireProfile } from "@/lib/auth/guards";
import { getActiveOrganization } from "@/lib/auth/tenant";
import { loadResultView } from "@/lib/db/result";
import { HR_ROLES } from "@/domain/enums";

export const metadata: Metadata = { title: "Your Result" };
/** Allow up to 60s for on-page AI report generation. */
export const maxDuration = 60;

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireProfile();
  const org = await getActiveOrganization();

  const view = await loadResultView(id);
  if (!view) notFound();

  const isOwner = view.employeeUserId === user.uid;
  const isStaff = HR_ROLES.includes(user.role);
  if (!isOwner && !isStaff) redirect("/dashboard");

  return (
    <AppChrome orgName={org.name} displayName={user.displayName ?? user.email} role={user.role}>
      <ResultView view={view} orgName={org.name} />
    </AppChrome>
  );
}
