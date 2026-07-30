"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CloudOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/glass-card";
import { QuestionField } from "@/components/assessment/question-field";
import { useAutosave } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";
import { saveAnswers, submitAssessment } from "@/lib/actions/assessment";
import type { AnswerValue, CategoryWithQuestions } from "@/domain/v2/types";

interface Props {
  sessionId: string;
  sections: CategoryWithQuestions[];
  initialAnswers: Record<string, AnswerValue>;
  initialCategoryId?: string | null;
}

const blank = (v: AnswerValue | undefined) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

export function AssessmentRunner({
  sessionId,
  sections,
  initialAnswers,
  initialCategoryId,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = React.useState(initialAnswers);
  const startIndex = Math.max(
    0,
    sections.findIndex((s) => s.category.id === initialCategoryId),
  );
  const [index, setIndex] = React.useState(startIndex === -1 ? 0 : startIndex);
  const [attempted, setAttempted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const section = sections[index]!;
  const isLast = index === sections.length - 1;

  const total = React.useMemo(
    () => sections.reduce((n, s) => n + s.questions.length, 0),
    [sections],
  );
  const answered = React.useMemo(
    () =>
      sections.reduce(
        (n, s) => n + s.questions.filter((q) => !blank(answers[q.id])).length,
        0,
      ),
    [sections, answers],
  );
  const progress = total ? Math.round((answered / total) * 100) : 0;

  const onSave = React.useCallback(async () => {
    await saveAnswers({
      sessionId,
      answers,
      currentCategoryId: section.category.id,
      progress,
    });
  }, [sessionId, answers, section.category.id, progress]);
  const { status, flush } = useAutosave(answers, onSave);

  const setAnswer = (qid: string, v: AnswerValue) =>
    setAnswers((prev) => ({ ...prev, [qid]: v }));

  const missingIn = (s: CategoryWithQuestions) =>
    s.questions.filter(
      (q) => q.required && q.type !== "OPEN_TEXT" && blank(answers[q.id]),
    );

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const next = async () => {
    if (missingIn(section).length) {
      setAttempted(true);
      toast.error("Please answer all required questions in this section.");
      return;
    }
    setAttempted(false);
    await flush();
    setIndex((i) => Math.min(i + 1, sections.length - 1));
    scrollTop();
  };

  const back = async () => {
    setAttempted(false);
    await flush();
    setIndex((i) => Math.max(i - 1, 0));
    scrollTop();
  };

  const submit = async () => {
    const gap = sections.findIndex((s) => missingIn(s).length);
    if (gap >= 0) {
      setAttempted(true);
      setIndex(gap);
      scrollTop();
      toast.error("Some required questions are still unanswered.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitAssessment({
        sessionId,
        answers,
        currentCategoryId: section.category.id,
        progress: 100,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not submit.");
        return;
      }
      toast.success(`Assessment complete — ${res.tierLabel}!`);
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            AI Readiness Assessment
          </p>
          <SaveIndicator status={status} />
        </div>
        <div className="mt-3 flex items-center gap-1">
          {sections.map((s, i) => (
            <div
              key={s.category.id}
              title={s.category.name}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < index ? "bg-primary" : i === index ? "bg-primary/60" : "bg-secondary",
              )}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Section {index + 1} of {sections.length}</span>
          <span>{progress}% complete</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section.category.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {section.category.key.replace(/_/g, " ")}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {section.category.name}
            </h1>
            {section.category.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {section.category.description}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {section.questions.map((q, qi) => {
              const invalid =
                attempted && q.required && q.type !== "OPEN_TEXT" && blank(answers[q.id]);
              return (
                <GlassCard key={q.id} className={cn("p-5", invalid && "ring-1 ring-destructive/50")}>
                  <div className="mb-3 flex gap-2">
                    <span className="text-sm font-semibold text-brand-600">{qi + 1}.</span>
                    <div>
                      <p className="text-sm font-medium">
                        {q.text}
                        {q.required && q.type !== "OPEN_TEXT" && (
                          <span className="ml-1 text-destructive">*</span>
                        )}
                      </p>
                      {q.helpText && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{q.helpText}</p>
                      )}
                    </div>
                  </div>
                  <QuestionField
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                    invalid={invalid}
                  />
                  {invalid && (
                    <p className="mt-2 text-xs text-destructive">This question is required.</p>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={index === 0 || submitting}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {isLast ? (
          <Button variant="gradient" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit assessment
          </Button>
        ) : (
          <Button variant="gradient" onClick={next} disabled={submitting}>
            Next <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: string }) {
  if (status === "saving")
    return <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Saving…</span>;
  if (status === "saved")
    return <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Check className="size-3.5" /> Saved</span>;
  if (status === "error")
    return <span className="flex items-center gap-1.5 text-xs text-destructive"><CloudOff className="size-3.5" /> Not saved</span>;
  return <span className="text-xs text-muted-foreground">Progress auto-saves</span>;
}
