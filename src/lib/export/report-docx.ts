"use client";

/**
 * Word (.docx) report generation via `docx`, lazy-imported so it stays out of
 * the initial bundle. Employee result report + organization report.
 */

import type { ResultView } from "@/lib/db/result";
import type { OrgAnalytics } from "@/lib/db/analytics";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

export async function exportEmployeeDocx(view: ResultView, orgName: string) {
  const d = await import("docx");
  const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } = d;

  const row = (a: string, b: string) =>
    new TableRow({
      children: [
        new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, children: [new Paragraph(a)] }),
        new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph(b)] }),
      ],
    });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "AI Readiness Report", heading: HeadingLevel.TITLE }),
          new Paragraph({
            children: [
              new TextRun({ text: `${orgName}  ·  `, bold: true }),
              new TextRun(`${view.employeeName}  ·  ${new Date(view.computedAt).toLocaleDateString("en-GB")}`),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Overall readiness", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun({ text: `${Math.round(view.overallScore)} / 100  `, bold: true, size: 36 }),
              new TextRun({ text: `${view.tierLabel} · ${view.personaLabel}`, italics: true }),
            ],
          }),
          ...(view.tierDescription ? [new Paragraph(view.tierDescription)] : []),

          new Paragraph({ text: "Category scores", heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [row("Category", "Score"), ...view.categories.map((c) => row(c.name, `${c.score} / 100`))],
          }),

          new Paragraph({ text: "Strengths", heading: HeadingLevel.HEADING_2 }),
          ...(view.strengths.length ? view.strengths.map((s) => new Paragraph({ text: s, bullet: { level: 0 } })) : [new Paragraph("—")]),

          new Paragraph({ text: "Areas to grow", heading: HeadingLevel.HEADING_2 }),
          ...(view.gaps.length ? view.gaps.map((s) => new Paragraph({ text: s, bullet: { level: 0 } })) : [new Paragraph("—")]),

          new Paragraph({ text: "Recommended training", heading: HeadingLevel.HEADING_2 }),
          ...view.recommendations.flatMap((r) => [
            new Paragraph({ children: [new TextRun({ text: r.title, bold: true }), new TextRun(`  (${r.level})`)] }),
            new Paragraph({ text: r.reason }),
          ]),

          ...(view.aiSummary
            ? [
                new Paragraph({ text: "AI summary", heading: HeadingLevel.HEADING_2 }),
                ...view.aiSummary.split("\n").filter(Boolean).map((l) => new Paragraph(l.replace(/[#*]/g, ""))),
              ]
            : []),
        ],
      },
    ],
  });

  download(await Packer.toBlob(doc), `ai-readiness-${safe(view.employeeName)}.docx`);
}

export async function exportOrgDocx(a: OrgAnalytics, orgName: string, aiSummary?: string) {
  const d = await import("docx");
  const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } = d;

  const row = (x: string, y: string) =>
    new TableRow({
      children: [
        new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, children: [new Paragraph(x)] }),
        new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph(y)] }),
      ],
    });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Organization AI Readiness Report", heading: HeadingLevel.TITLE }),
          new Paragraph({ children: [new TextRun({ text: orgName, bold: true }), new TextRun(`  ·  ${new Date().toLocaleDateString("en-GB")}`)] }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              row("Average readiness", `${Math.round(a.averageScore)} / 100`),
              row("Completed", `${a.completed} of ${a.totalEmployees} (${a.participationRate}%)`),
              row("AI Ready", String(a.aiReadyCount)),
            ],
          }),

          new Paragraph({ text: "Category averages", heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [row("Category", "Average"), ...a.categoryAverages.map((c) => row(c.name, `${c.score} / 100`))],
          }),

          new Paragraph({ text: "Departments", heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [row("Department", "Average"), ...a.departmentScores.map((dpt) => row(dpt.name, `${Math.round(dpt.avg)} (${dpt.count})`))],
          }),

          ...(aiSummary
            ? [
                new Paragraph({ text: "AI executive summary", heading: HeadingLevel.HEADING_2 }),
                ...aiSummary.split("\n").filter(Boolean).map((l) => new Paragraph(l.replace(/[#*]/g, ""))),
              ]
            : []),
        ],
      },
    ],
  });

  download(await Packer.toBlob(doc), `ai-readiness-${safe(orgName)}.docx`);
}
