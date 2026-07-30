"use client";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AnswerValue, Question } from "@/domain/v2/types";

interface Props {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  invalid?: boolean;
}

export function QuestionField({ question, value, onChange, invalid }: Props) {
  switch (question.type) {
    case "LIKERT":
      return <Likert question={question} value={value} onChange={onChange} />;
    case "MULTIPLE_CHOICE":
      return <MultiChoice question={question} value={value} onChange={onChange} />;
    case "OPEN_TEXT":
      return (
        <Textarea
          value={typeof value === "string" ? value : ""}
          placeholder="Type your answer…"
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "SINGLE_CHOICE":
    default:
      return <SingleChoice question={question} value={value} onChange={onChange} />;
  }
}

function SingleChoice({ question, value, onChange }: Props) {
  return (
    <RadioGroup value={typeof value === "string" ? value : ""} onValueChange={onChange}>
      {question.options.map((o) => {
        const selected = value === o.value;
        return (
          <label
            key={o.value}
            htmlFor={`${question.id}-${o.value}`}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition-colors",
              selected ? "border-primary bg-brand-500/5 ring-1 ring-primary/40" : "border-border hover:bg-accent/50",
            )}
          >
            <RadioGroupItem id={`${question.id}-${o.value}`} value={o.value} />
            <span>{o.label}</span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

function MultiChoice({ question, value, onChange }: Props) {
  const selected: string[] = Array.isArray(value) ? value : [];
  const toggle = (v: string, checked: boolean) =>
    onChange(checked ? [...selected, v] : selected.filter((x) => x !== v));
  return (
    <div className="grid gap-2.5">
      {question.options.map((o) => {
        const isChecked = selected.includes(o.value);
        return (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition-colors",
              isChecked ? "border-primary bg-brand-500/5 ring-1 ring-primary/40" : "border-border hover:bg-accent/50",
            )}
          >
            <Checkbox checked={isChecked} onCheckedChange={(c) => toggle(o.value, Boolean(c))} />
            <span>{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function Likert({ question, value, onChange }: Props) {
  const current = typeof value === "number" ? value : Number(value) || 0;
  const low = question.options[0]?.label ?? "Strongly disagree";
  const high = question.options.at(-1)?.label ?? "Strongly agree";
  return (
    <div className="max-w-xl">
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = current === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={active}
              className={cn(
                "flex h-14 items-center justify-center rounded-xl border text-sm font-semibold transition-all",
                active
                  ? "border-primary bg-brand-gradient text-white shadow-md"
                  : "border-border bg-background/60 hover:border-primary/50 hover:bg-accent/50",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
