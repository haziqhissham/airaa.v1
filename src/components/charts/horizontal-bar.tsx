"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarDatum {
  name: string;
  value: number;
}

interface HorizontalBarProps {
  data: BarDatum[];
  /** Fixed domain max (e.g. 100 for scores). Omit to auto-scale. */
  domainMax?: number;
  valueSuffix?: string;
  /** Highlight the lowest bars in a warning tone (for "lowest readiness"). */
  lowestHighlight?: number;
  color?: string;
}

export function HorizontalBar({
  data,
  domainMax,
  valueSuffix = "",
  lowestHighlight = 0,
  color = "#2563eb",
}: HorizontalBarProps) {
  const height = Math.max(120, data.length * 44);
  // Lowest N by value get a warning tone.
  const lowSet = new Set(
    [...data]
      .sort((a, b) => a.value - b.value)
      .slice(0, lowestHighlight)
      .map((d) => d.name),
  );

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 8 }}
          barCategoryGap={10}
        >
          <XAxis
            type="number"
            domain={[0, domainMax ?? "dataMax"]}
            hide
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}${valueSuffix}`, "Score"]}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 4, 4]}
            isAnimationActive={false}
            maxBarSize={22}
          >
            {data.map((d) => (
              <Cell
                key={d.name}
                fill={lowSet.has(d.name) ? "#d03b3b" : color}
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => `${v}${valueSuffix}`}
              style={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
