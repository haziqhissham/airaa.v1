import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

/** /result → the user's latest completed result, else the dashboard. */
export default async function ResultIndexPage() {
  const user = await requireProfile();

  let sessionId: string | null = null;
  try {
    const employee = await prisma.employee.findUnique({ where: { userId: user.uid } });
    if (employee) {
      const session = await prisma.assessmentSession.findFirst({
        where: { employeeId: employee.id, status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
      });
      sessionId = session?.id ?? null;
    }
  } catch {
    sessionId = null;
  }

  redirect(sessionId ? `/result/${sessionId}` : "/dashboard");
}
