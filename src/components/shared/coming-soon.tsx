import Link from "next/link";
import { Construction } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";

export function ComingSoon({
  title,
  module,
  description,
}: {
  title: string;
  module: string;
  description: string;
}) {
  return (
    <GlassCard className="animate-fade-in flex flex-col items-center gap-4 p-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
        <Construction className="size-7" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
          {module}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </GlassCard>
  );
}
