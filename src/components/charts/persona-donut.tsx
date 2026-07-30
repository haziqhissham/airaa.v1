"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface PersonaSlice {
  key: string;
  label: string;
  count: number;
  pct: number;
  color: string;
}

export function PersonaDonut({ data }: { data: PersonaSlice[] }) {
  const active = data.filter((d) => d.count > 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={active}
              dataKey="count"
              nameKey="label"
              innerRadius="58%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {active.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                `${value} employee${value === 1 ? "" : "s"}`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend (identity is never color-alone). */}
      <ul className="flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="flex-1">{d.label}</span>
            <span className="tabular-nums font-medium">{d.count}</span>
            <span className="w-10 text-right tabular-nums text-xs text-muted-foreground">
              {d.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
