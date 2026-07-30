"use client";

/**
 * PowerPoint (.pptx) report generation via `pptxgenjs`, lazy-imported.
 * Employee result deck + organization deck.
 */

import type { ResultView } from "@/lib/db/result";
import type { OrgAnalytics } from "@/lib/db/analytics";

const BRAND = "2563EB";
const DARK = "1E3A8A";
const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

export async function exportEmployeePptx(view: ResultView, orgName: string) {
  const { default: Pptx } = await import("pptxgenjs");
  const p = new Pptx();
  p.layout = "LAYOUT_WIDE";

  // Title
  const t = p.addSlide();
  t.background = { color: DARK };
  t.addText("AI Readiness Report", { x: 0.6, y: 2.0, w: 12, fontSize: 40, bold: true, color: "FFFFFF" });
  t.addText(`${orgName}  ·  ${view.employeeName}`, { x: 0.6, y: 3.1, w: 12, fontSize: 20, color: "DBEAFE" });
  t.addText(new Date(view.computedAt).toLocaleDateString("en-GB"), { x: 0.6, y: 3.7, w: 12, fontSize: 14, color: "93C5FD" });

  // Overall
  const s = p.addSlide();
  s.addText("Overall readiness", { x: 0.6, y: 0.4, fontSize: 24, bold: true, color: DARK });
  s.addText(`${Math.round(view.overallScore)}`, { x: 0.6, y: 1.6, w: 4, h: 2.5, fontSize: 96, bold: true, color: BRAND });
  s.addText("/ 100", { x: 4.3, y: 3.0, fontSize: 24, color: "64748B" });
  s.addText(`${view.tierLabel} · ${view.personaLabel}`, { x: 6, y: 2.2, w: 6.5, fontSize: 28, bold: true, color: DARK });
  if (view.tierDescription) s.addText(view.tierDescription, { x: 6, y: 3.0, w: 6.5, fontSize: 14, color: "334155" });

  // Category scores
  const c = p.addSlide();
  c.addText("Category scores", { x: 0.6, y: 0.4, fontSize: 24, bold: true, color: DARK });
  c.addTable(
    [
      [
        { text: "Category", options: { bold: true, color: "FFFFFF", fill: { color: BRAND } } },
        { text: "Score", options: { bold: true, color: "FFFFFF", fill: { color: BRAND } } },
      ],
      ...view.categories.map((cat) => [{ text: cat.name }, { text: `${cat.score} / 100` }]),
    ],
    { x: 0.6, y: 1.2, w: 8, fontSize: 14, border: { type: "solid", color: "E2E8F0", pt: 1 } },
  );

  // Recommendations
  const r = p.addSlide();
  r.addText("Recommended training", { x: 0.6, y: 0.4, fontSize: 24, bold: true, color: DARK });
  r.addText(
    view.recommendations.map((rec) => ({ text: `${rec.title} (${rec.level})\n${rec.reason}\n`, options: { bullet: true, fontSize: 14, breakLine: true } })),
    { x: 0.6, y: 1.2, w: 12, h: 5, color: "334155" },
  );

  await p.writeFile({ fileName: `ai-readiness-${safe(view.employeeName)}.pptx` });
}

export async function exportOrgPptx(a: OrgAnalytics, orgName: string) {
  const { default: Pptx } = await import("pptxgenjs");
  const p = new Pptx();
  p.layout = "LAYOUT_WIDE";

  const t = p.addSlide();
  t.background = { color: DARK };
  t.addText("Organization AI Readiness", { x: 0.6, y: 2.1, w: 12, fontSize: 40, bold: true, color: "FFFFFF" });
  t.addText(`${orgName}  ·  ${new Date().toLocaleDateString("en-GB")}`, { x: 0.6, y: 3.2, w: 12, fontSize: 20, color: "DBEAFE" });

  const k = p.addSlide();
  k.addText("At a glance", { x: 0.6, y: 0.4, fontSize: 24, bold: true, color: DARK });
  const kpis: [string, string][] = [
    ["Average readiness", `${Math.round(a.averageScore)} / 100`],
    ["Completed", `${a.completed} / ${a.totalEmployees} (${a.participationRate}%)`],
    ["AI Ready", String(a.aiReadyCount)],
    ["Departments", String(a.departmentScores.length)],
  ];
  kpis.forEach(([label, val], i) => {
    const x = 0.6 + (i % 2) * 6.3;
    const y = 1.4 + Math.floor(i / 2) * 2.2;
    k.addText(val, { x, y, w: 5.8, fontSize: 40, bold: true, color: BRAND });
    k.addText(label, { x, y: y + 0.9, w: 5.8, fontSize: 16, color: "64748B" });
  });

  const c = p.addSlide();
  c.addText("Category averages", { x: 0.6, y: 0.4, fontSize: 24, bold: true, color: DARK });
  c.addTable(
    [
      [
        { text: "Category", options: { bold: true, color: "FFFFFF", fill: { color: BRAND } } },
        { text: "Average", options: { bold: true, color: "FFFFFF", fill: { color: BRAND } } },
      ],
      ...a.categoryAverages.map((cat) => [{ text: cat.name }, { text: `${cat.score} / 100` }]),
    ],
    { x: 0.6, y: 1.2, w: 8, fontSize: 13, border: { type: "solid", color: "E2E8F0", pt: 1 } },
  );

  const d = p.addSlide();
  d.addText("Department comparison", { x: 0.6, y: 0.4, fontSize: 24, bold: true, color: DARK });
  d.addTable(
    [
      [
        { text: "Department", options: { bold: true, color: "FFFFFF", fill: { color: BRAND } } },
        { text: "Average", options: { bold: true, color: "FFFFFF", fill: { color: BRAND } } },
        { text: "Assessed", options: { bold: true, color: "FFFFFF", fill: { color: BRAND } } },
      ],
      ...a.departmentScores.map((dpt) => [{ text: dpt.name }, { text: `${Math.round(dpt.avg)}` }, { text: String(dpt.count) }]),
    ],
    { x: 0.6, y: 1.2, w: 10, fontSize: 13, border: { type: "solid", color: "E2E8F0", pt: 1 } },
  );

  await p.writeFile({ fileName: `ai-readiness-${safe(orgName)}.pptx` });
}
