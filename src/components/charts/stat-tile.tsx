import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  hint?: string;
  className?: string;
}

export function StatTile({
  label,
  value,
  suffix,
  icon: Icon,
  hint,
  className,
}: StatTileProps) {
  return (
    <GlassCard className={cn("p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="grid size-9 place-items-center rounded-lg bg-brand-500/10 text-brand-600">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums">
        {value}
        {suffix && (
          <span className="ml-1 text-base font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </GlassCard>
  );
}
