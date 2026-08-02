import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  stroke?: number;
  className?: string;
  accent?: string;
}

/** Circular overall-score gauge (pure SVG — prints cleanly). */
export function ScoreRing({
  score,
  size = 160,
  stroke = 12,
  className,
  accent = "#00b6b5",
}: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-4xl font-bold tabular-nums">
            {Math.round(clamped)}
          </div>
          <div className="text-xs text-muted-foreground">out of 100</div>
        </div>
      </div>
    </div>
  );
}
