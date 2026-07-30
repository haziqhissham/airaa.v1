"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type { FieldDef, Option, OptionRow } from "@/lib/admin/field-types";

type Values = Record<string, unknown>;

interface EntityFormProps {
  fields: FieldDef[];
  initial: Values;
  submitting?: boolean;
  onSubmit: (values: Values) => void;
  submitLabel?: string;
  /** Dynamic option sets resolved by `field.optionsFrom` (e.g. categories). */
  dynamicOptions?: Record<string, Option[]>;
}

export function EntityForm({
  fields,
  initial,
  submitting,
  onSubmit,
  submitLabel = "Save",
  dynamicOptions,
}: EntityFormProps) {
  const [values, setValues] = React.useState<Values>(initial);
  const set = (name: string, v: unknown) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const resolve = (f: FieldDef): FieldDef =>
    f.optionsFrom && dynamicOptions
      ? { ...f, options: f.options ?? dynamicOptions[f.optionsFrom] ?? [] }
      : f;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="grid grid-cols-2 gap-4"
    >
      {fields.map((f0) => {
        const f = resolve(f0);
        return (
          <div key={f.name} className={cn("space-y-1.5", f.colSpan === 2 && "col-span-2")}>
            <Label htmlFor={f.name}>{f.label}</Label>
            <FieldControl field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} />
            {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          </div>
        );
      })}
      <div className="col-span-2 flex justify-end pt-2">
        <Button type="submit" variant="gradient" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          id={field.name}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <Input
          id={field.name}
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          placeholder={field.placeholder}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      );
    case "select":
      return (
        <NativeSelect
          id={field.name}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            Select…
          </option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      );
    case "switch":
      return (
        <div className="flex h-11 items-center">
          <Switch
            id={field.name}
            checked={Boolean(value)}
            onCheckedChange={onChange}
          />
        </div>
      );
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(value as string) || "#2563eb"}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-14 cursor-pointer rounded-lg border border-input bg-background"
          />
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
        </div>
      );
    case "multiselect":
      return (
        <MultiToggle
          options={field.options ?? []}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
        />
      );
    case "tags":
      return (
        <TagInput
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
        />
      );
    case "optionlist":
      return (
        <OptionListEditor
          value={Array.isArray(value) ? (value as OptionRow[]) : []}
          onChange={onChange}
        />
      );
    default:
      return (
        <Input
          id={field.name}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function MultiToggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function OptionListEditor({
  value,
  onChange,
}: {
  value: OptionRow[];
  onChange: (v: OptionRow[]) => void;
}) {
  const update = (i: number, patch: Partial<OptionRow>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () =>
    onChange([...value, { label: "", value: String(value.length + 1), score: value.length + 1 }]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-[1fr_5rem_4rem_2rem] gap-2 text-xs text-muted-foreground">
          <span>Label</span>
          <span>Value</span>
          <span>Score</span>
          <span />
        </div>
      )}
      {value.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_5rem_4rem_2rem] items-center gap-2">
          <Input value={row.label} placeholder="Option label" onChange={(e) => update(i, { label: e.target.value })} className="h-9" />
          <Input value={row.value} onChange={(e) => update(i, { value: e.target.value })} className="h-9" />
          <Input type="number" value={row.score} onChange={(e) => update(i, { score: Number(e.target.value) })} className="h-9" />
          <button type="button" onClick={() => remove(i)} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        + Add option
      </Button>
    </div>
  );
}

function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs"
          >
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        placeholder="Type and press Enter…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
}
