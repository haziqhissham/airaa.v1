"use client";

import * as React from "react";
import { FileSpreadsheet, FileText, Loader2, Presentation, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ResultView } from "@/lib/db/result";
import type { OrgAnalytics } from "@/lib/db/analytics";

type Props = { orgName: string } & (
  | { kind: "employee"; view: ResultView }
  | { kind: "org"; analytics: OrgAnalytics; aiSummary?: string }
);

export function ExportButtons(props: Props) {
  const [busy, setBusy] = React.useState<string | null>(null);

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  const word = () =>
    run("word", async () => {
      const m = await import("@/lib/export/report-docx");
      if (props.kind === "employee") await m.exportEmployeeDocx(props.view, props.orgName);
      else await m.exportOrgDocx(props.analytics, props.orgName, props.aiSummary);
    });

  const ppt = () =>
    run("ppt", async () => {
      const m = await import("@/lib/export/report-pptx");
      if (props.kind === "employee") await m.exportEmployeePptx(props.view, props.orgName);
      else await m.exportOrgPptx(props.analytics, props.orgName);
    });

  const excel = () =>
    run("excel", async () => {
      const m = await import("@/lib/export/org-export");
      if (props.kind === "org") await m.exportOrgAnalyticsToExcel(props.analytics, props.orgName);
    });

  const Icon = ({ name, fallback: F }: { name: string; fallback: React.ElementType }) =>
    busy === name ? <Loader2 className="size-4 animate-spin" /> : <F className="size-4" />;

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={word} disabled={!!busy}>
        <Icon name="word" fallback={FileText} /> Word
      </Button>
      <Button variant="outline" size="sm" onClick={ppt} disabled={!!busy}>
        <Icon name="ppt" fallback={Presentation} /> PowerPoint
      </Button>
      {props.kind === "org" && (
        <Button variant="outline" size="sm" onClick={excel} disabled={!!busy}>
          <Icon name="excel" fallback={FileSpreadsheet} /> Excel
        </Button>
      )}
    </div>
  );
}
