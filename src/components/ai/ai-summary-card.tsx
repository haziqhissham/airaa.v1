"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/glass-card";
import { NativeSelect } from "@/components/ui/native-select";
import { generateEmployeeSummary, generateOrgSummary } from "@/lib/actions/ai";
import type { AIProviderName } from "@/lib/ai";

interface Props {
  kind: "employee" | "org";
  sessionId?: string;
  initialSummary?: string | null;
}

export function AiSummaryCard({ kind, sessionId, initialSummary }: Props) {
  const [summary, setSummary] = React.useState(initialSummary ?? "");
  const [loading, setLoading] = React.useState(false);
  const [provider, setProvider] = React.useState<AIProviderName>("claude");

  const generate = async () => {
    setLoading(true);
    try {
      const res =
        kind === "employee" && sessionId
          ? await generateEmployeeSummary(sessionId, provider)
          : await generateOrgSummary(provider);
      if (!res.ok || !res.summary) {
        toast.error(res.error ?? "Could not generate the summary.");
        return;
      }
      setSummary(res.summary);
      toast.success("AI summary generated.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-brand-600" /> AI-generated summary
        </h2>
        <div className="no-print flex items-center gap-2">
          <NativeSelect
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProviderName)}
            className="h-9 w-32"
          >
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </NativeSelect>
          <Button size="sm" variant="gradient" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {summary ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>

      {summary ? (
        <div className="mt-4">
          <Markdown text={summary} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Generate a personalised narrative — executive summary, roadmap and
          training guidance — powered by your chosen AI provider.
        </p>
      )}
    </GlassCard>
  );
}

/** Minimal, safe markdown-ish renderer (headings, bold, bullets, paragraphs). */
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (/^#{1,6}\s/.test(t))
          return <h3 key={i} className="pt-2 font-semibold">{t.replace(/^#{1,6}\s/, "")}</h3>;
        if (/^[-*]\s/.test(t))
          return (
            <div key={i} className="flex gap-2">
              <span className="text-brand-600">•</span>
              <span>{inline(t.replace(/^[-*]\s/, ""))}</span>
            </div>
          );
        return <p key={i}>{inline(t)}</p>;
      })}
    </div>
  );
}

function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p) ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
  );
}
