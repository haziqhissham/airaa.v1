"use client";

import type { OrgAnalytics } from "@/lib/db/analytics";

/** Multi-sheet Excel workbook from org analytics. `xlsx` is lazy-imported. */
export async function exportOrgAnalyticsToExcel(
  a: OrgAnalytics,
  orgName: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const summary = [
    ["Organization", orgName],
    ["Generated", new Date().toISOString().slice(0, 10)],
    [],
    ["Employees", a.totalEmployees],
    ["Completed", a.completed],
    ["Participation (%)", a.participationRate],
    ["Average score", a.averageScore],
    ["AI Ready", a.aiReadyCount],
    [],
    ["Category", "Average"],
    ...a.categoryAverages.map((c) => [c.name, c.score]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      a.rows.map((r) => ({
        Name: r.name,
        Email: r.email,
        Department: r.department,
        "Overall Score": r.overall,
        "Readiness Level": r.tier,
      })),
    ),
    "Employees",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      a.departmentScores.map((d) => ({ Department: d.name, "Average Score": d.avg, Assessed: d.count })),
    ),
    "Departments",
  );

  const safe = orgName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  XLSX.writeFile(wb, `ai-readiness-${safe}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
