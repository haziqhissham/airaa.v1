"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CloudOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/glass-card";
import { QuestionField } from "@/components/assessment/question-field";
import { cn } from "@/lib/utils";
import { saveAnswers, submitAssessment } from "@/lib/actions/assessment";
import type { AnswerValue, CategoryWithQuestions } from "@/domain/v2/types";

interface Props {
  sessionId: string;
  sections: CategoryWithQuestions[];
  initialAnswers: Record<string, AnswerValue>;
  initialCategoryId?: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const blank = (v: AnswerValue | undefined) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

export function AssessmentRunner({
  sessionId,
  sections,
  initialAnswers,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = React.useState(initialAnswers);
  const [submitting, setSubmitting] = React.useState(false);
  const [attempted, setAttempted] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");

  // Flatten every question (keeping its category) — one question per step.
  const flat = React.useMemo(
    () =>
      sections.flatMap((s) =>
        s.questions.map((q) => ({ q, category: s.category })),
      ),
    [sections],
  );
  const total = flat.length;

  // Resume on the first unanswered question (or the last, if all answered).
  const firstUnanswered = flat.findIndex((f) => blank(initialAnswers[f.q.id]));
  const [step, setStep] = React.useState(
    firstUnanswered === -1 ? Math.max(0, total - 1) : firstUnanswered,
  );

  const current = flat[step]!;
  const isLast = step === total - 1;
  const isFirstInCategory =
    step === 0 || flat[step - 1]!.category.id !== current.category.id;

  const answeredCount = React.useMemo(
    () => flat.filter((f) => !blank(answers[f.q.id])).length,
    [flat, answers],
  );
  const progress = total ? Math.round((answeredCount / total) * 100) : 0;

  const currentRequired =
    current.q.required && current.q.type !== "OPEN_TEXT";
  const currentAnswered = !blank(answers[current.q.id]);

  // Persist immediately on each answer so the "saved" confirmation is prompt.
  const persist = React.useCallback(
    async (nextAnswers: Record<string, AnswerValue>) => {
      setSaveStatus("saving");
      const answered = flat.filter((f) => !blank(nextAnswers[f.q.id])).length;
      try {
        const res = await saveAnswers({
          sessionId,
          answers: nextAnswers,
          currentCategoryId: current.category.id,
          progress: total ? Math.round((answered / total) * 100) : 0,
        });
        setSaveStatus(res.ok ? "saved" : "error");
      } catch {
        setSaveStatus("error");
      }
    },
    [sessionId, current.category.id, flat, total],
  );

  const setAnswer = (qid: string, v: AnswerValue) => {
    setAttempted(false);
    const next = { ...answers, [qid]: v };
    setAnswers(next);
    void persist(next);
  };

  const scrollTop = () =>
    typeof window !== "undefined" && window.scrollTo({ top: 0, behavior: "smooth" });

  const goNext = async () => {
    if (currentRequired && !currentAnswered) {
      setAttempted(true);
      toast.error("Please answer this question to continue.");
      return;
    }
    await persist(answers);
    setAttempted(false);
    setStep((i) => Math.min(i + 1, total - 1));
    scrollTop();
  };

  const goBack = () => {
    setAttempted(false);
    setStep((i) => Math.max(i - 1, 0));
    scrollTop();
  };

  const submit = async () => {
    if (currentRequired && !currentAnswered) {
      setAttempted(true);
      toast.error("Please answer this question to continue.");
      return;
    }
    const gap = flat.findIndex(
      (f) => f.q.required && f.q.type !== "OPEN_TEXT" && blank(answers[f.q.id]),
    );
    if (gap >= 0) {
      setStep(gap);
      setAttempted(true);
      scrollTop();
      toast.error("One question is still unanswered — jumped you to it.");
      return;
    }
    setSubmitting(true);
    try {
      await persist(answers);
      const res = await submitAssessment({
        sessionId,
        answers,
        currentCategoryId: current.category.id,
        progress: 100,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not submit.");
        return;
      }
      toast.success(`Assessment complete — ${res.tierLabel}!`);
      router.replace("/result");
      router.refresh();
    } catch (err) {
      console.error("submitAssessment failed", err);
      toast.error(
        "Something went wrong submitting your assessment. Your answers are saved — please try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const invalid = attempted && currentRequired && !currentAnswered;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header + progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            AI Readiness Assessment
          </p>
          <span className="text-xs text-muted-foreground">
            Question {step + 1} of {total}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-brand-gradient transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span className="font-medium text-brand-600">
            {current.category.key.replace(/_/g, " ")} · {current.category.name}
          </span>
          <span>{progress}% complete</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.q.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {isFirstInCategory && current.category.description && (
            <p className="mb-3 rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 text-sm text-muted-foreground">
              {current.category.name} — {current.category.description}
            </p>
          )}

          <GlassCard className={cn("p-6", invalid && "ring-1 ring-destructive/50")}>
            <p className="text-base font-medium leading-relaxed">
              {current.q.text}
              {currentRequired && <span className="ml-1 text-destructive">*</span>}
            </p>
            <div className="mt-5">
              <QuestionField
                question={current.q}
                value={answers[current.q.id]}
                onChange={(v) => setAnswer(current.q.id, v)}
                invalid={invalid}
              />
            </div>
            {invalid && (
              <p className="mt-3 text-xs text-destructive">
                This question is required.
              </p>
            )}
          </GlassCard>
        </motion.div>
      </AnimatePresence>

      {/* Save notification */}
      <div className="mt-4 flex min-h-6 items-center justify-center">
        <SaveNotice status={saveStatus} answered={currentAnswered} />
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={goBack} disabled={step === 0 || submitting}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {isLast ? (
          <Button variant="gradient" onClick={submit} disabled={submitting || !currentAnswered}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit assessment
          </Button>
        ) : (
          <Button variant="gradient" onClick={goNext} disabled={submitting || !currentAnswered}>
            Next <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SaveNotice({ status, answered }: { status: SaveStatus; answered: boolean }) {
  if (status === "saving")
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Saving your answer…
      </span>
    );
  if (status === "error")
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <CloudOff className="size-3.5" /> Couldn&apos;t save — check your connection and try again.
      </span>
    );
  if (status === "saved")
    return (
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600"
      >
        <Check className="size-3.5" /> Answer saved — continue when ready
      </motion.span>
    );
  if (!answered)
    return (
      <span className="text-xs text-muted-foreground">
        Select an answer to continue
      </span>
    );
  return null;
}
