"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

/** Generic N-category readiness radar (0..100). */
export function CategoryRadar({
  data,
  height = 300,
}: {
  data: { label: string; score: number }[];
  height?: number;
}) {
  const shaped = data.map((d) => ({ dimension: d.label, score: Math.round(d.score) }));
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={shaped} outerRadius="72%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            dataKey="score"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.45}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
