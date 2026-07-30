"use client";

import type { HeatRow } from "@/lib/db/analytics";

/** Department × category readiness heat map (0..100 → blue intensity). */
export function Heatmap({
  rows,
  categories,
}: {
  rows: HeatRow[];
  categories: string[];
}) {
  const cell = (score: number) => {
    const a = 0.12 + (Math.max(0, Math.min(100, score)) / 100) * 0.85;
    return `rgba(37, 99, 235, ${a.toFixed(2)})`;
  };
  const textColor = (score: number) => (score >= 55 ? "#fff" : "hsl(var(--foreground))");

  if (!rows.length) return <p className="text-sm text-muted-foreground">No data yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-card px-2 py-1 text-left font-medium text-muted-foreground">
              Department
            </th>
            {categories.map((c) => (
              <th key={c} className="px-1 py-1 text-center font-medium text-muted-foreground">
                <span className="inline-block max-w-16 truncate align-middle" title={c}>{c}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.department}>
              <td className="sticky left-0 bg-card px-2 py-1 font-medium">{r.department}</td>
              {r.cells.map((cellData) => (
                <td
                  key={cellData.category}
                  className="rounded px-2 py-2 text-center font-semibold tabular-nums"
                  style={{ backgroundColor: cell(cellData.score), color: textColor(cellData.score) }}
                  title={`${r.department} · ${cellData.category}: ${Math.round(cellData.score)}`}
                >
                  {Math.round(cellData.score)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
