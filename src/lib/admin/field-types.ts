/** Shared field/option types for the generic admin EntityForm. */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "tags"
  | "switch"
  | "color"
  | "optionlist"; // editor for [{ label, value, score }]

export interface Option {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: Option[];
  /** Resolve options at render time from a dynamic set (e.g. "categories", "modules"). */
  optionsFrom?: string;
  placeholder?: string;
  help?: string;
  colSpan?: 1 | 2;
}

/** A single answer option (question CMS). */
export interface OptionRow {
  label: string;
  value: string;
  score: number;
}
