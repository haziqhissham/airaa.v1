"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetMyAssessment } from "@/lib/actions/assessment";

/**
 * Demo-only control: clears the signed-in employee's assessment history so they
 * can retake it. Rendered solely when siteConfig.demoMode is on (see dashboard).
 */
export function ResetAssessmentButton() {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const reset = async () => {
    setBusy(true);
    try {
      const res = await resetMyAssessment();
      if (!res.ok) {
        toast.error(res.error ?? "Could not reset.");
        return;
      }
      toast.success("Assessment reset — you can take it again.");
      setConfirming(false);
      router.refresh();
    } catch {
      toast.error("Could not reset the assessment. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirming(true)}>
        <RotateCcw className="size-4" /> Reset assessment (demo)
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5">
      <span className="text-xs text-muted-foreground">Clear your answers &amp; result?</span>
      <Button variant="destructive" size="sm" onClick={reset} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Yes, reset
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        Cancel
      </Button>
    </div>
  );
}
