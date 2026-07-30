/**
 * Admin resource registry (v2) — declarative field/column/validation configs
 * driving the Prisma-backed generic CRUD. Shared client + server; no server-only
 * imports. `model` maps to a Prisma delegate in lib/admin/prisma-crud.ts.
 */

import { z } from "zod";
import type { ColumnDef } from "@/lib/admin/columns";
import type { FieldDef } from "@/lib/admin/field-types";

export interface ResourceConfig {
  key: string;
  model: string;
  singular: string;
  plural: string;
  icon: string;
  description: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  schema: z.ZodType;
  toDoc?: (v: Record<string, unknown>) => Record<string, unknown>;
  fromDoc?: (d: Record<string, unknown>) => Record<string, unknown>;
  /** Dynamic option sets the page must load (e.g. "categories", "modules"). */
  dynamicSources?: string[];
}

const num = z.coerce.number();
const optNum = z.union([num, z.literal("")]).optional();
const strArr = z.array(z.string()).default([]);

const QUESTION_TYPES = ["LIKERT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "OPEN_TEXT"].map((v) => ({ value: v, label: v }));
const MODULE_LEVELS = ["FOUNDATION", "INTERMEDIATE", "ADVANCED"].map((v) => ({ value: v, label: v }));
const TIERS = ["BEGINNER", "EMERGING", "DEVELOPING", "ADVANCED", "AI_READY"].map((v) => ({ value: v, label: v }));

const optionRow = z.object({ label: z.string(), value: z.string(), score: num });

function recToDoc(v: Record<string, unknown>) {
  const conditions: Record<string, unknown> = {};
  if (v.minScore !== "" && v.minScore != null) conditions.minScore = Number(v.minScore);
  if (v.maxScore !== "" && v.maxScore != null) conditions.maxScore = Number(v.maxScore);
  if ((v.tiers as string[])?.length) conditions.tiers = v.tiers;
  return {
    label: v.label,
    priority: Number(v.priority),
    conditions,
    moduleIds: v.moduleIds ?? [],
    reasonTemplate: v.reasonTemplate,
    stopOnMatch: Boolean(v.stopOnMatch),
  };
}
function recFromDoc(d: Record<string, unknown>) {
  const c = (d.conditions ?? {}) as Record<string, unknown>;
  return {
    label: d.label ?? "",
    priority: d.priority ?? 50,
    moduleIds: d.moduleIds ?? [],
    minScore: c.minScore ?? "",
    maxScore: c.maxScore ?? "",
    tiers: c.tiers ?? [],
    reasonTemplate: d.reasonTemplate ?? "",
    stopOnMatch: d.stopOnMatch ?? false,
  };
}

export const RESOURCES: Record<string, ResourceConfig> = {
  categories: {
    key: "categories",
    model: "assessmentCategory",
    singular: "Category",
    plural: "Assessment Categories",
    icon: "Layers",
    description: "The assessment sections and their weighted scoring.",
    columns: [
      { name: "name", label: "Name" },
      { name: "key", label: "Key", kind: "badge" },
      { name: "weight", label: "Weight", kind: "number" },
      { name: "order", label: "Order", kind: "number" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "key", label: "Key", type: "text", help: "e.g. LEADERSHIP" },
      { name: "weight", label: "Weight (0–1)", type: "number" },
      { name: "order", label: "Order", type: "number" },
      { name: "active", label: "Active", type: "switch" },
      { name: "description", label: "Description", type: "textarea", colSpan: 2 },
    ],
    schema: z.object({
      name: z.string().min(1),
      key: z.string().min(1),
      weight: num.min(0).max(1),
      order: num,
      active: z.boolean().default(true),
      description: z.string().optional().default(""),
    }),
  },

  questions: {
    key: "questions",
    model: "assessmentQuestion",
    singular: "Question",
    plural: "Questions",
    icon: "ListChecks",
    description: "Assessment questions and their answer options.",
    dynamicSources: ["categories"],
    columns: [
      { name: "text", label: "Question" },
      { name: "type", label: "Type", kind: "badge" },
      { name: "order", label: "#", kind: "number" },
    ],
    fields: [
      { name: "categoryId", label: "Category", type: "select", optionsFrom: "categories" },
      { name: "type", label: "Type", type: "select", options: QUESTION_TYPES },
      { name: "order", label: "Order", type: "number" },
      { name: "maxScore", label: "Max score", type: "number" },
      { name: "weight", label: "Weight", type: "number" },
      { name: "required", label: "Required", type: "switch" },
      { name: "text", label: "Question text", type: "textarea", colSpan: 2 },
      { name: "helpText", label: "Help text", type: "text", colSpan: 2 },
      { name: "options", label: "Answer options (choice/Likert)", type: "optionlist", colSpan: 2 },
    ],
    schema: z.object({
      categoryId: z.string().min(1),
      type: z.string().min(1),
      order: num,
      maxScore: num,
      weight: num,
      required: z.boolean().default(true),
      text: z.string().min(1),
      helpText: z.string().optional().default(""),
      options: z.array(optionRow).default([]),
    }),
  },

  readinessLevels: {
    key: "readinessLevels",
    model: "readinessLevel",
    singular: "Readiness Level",
    plural: "Readiness Levels",
    icon: "Gauge",
    description: "Score bands mapping to readiness tiers.",
    columns: [
      { name: "label", label: "Label" },
      { name: "tier", label: "Tier", kind: "badge" },
      { name: "minScore", label: "Min", kind: "number" },
      { name: "maxScore", label: "Max", kind: "number" },
    ],
    fields: [
      { name: "tier", label: "Tier", type: "select", options: TIERS },
      { name: "label", label: "Label", type: "text" },
      { name: "minScore", label: "Min score", type: "number" },
      { name: "maxScore", label: "Max score", type: "number" },
      { name: "order", label: "Order", type: "number" },
      { name: "color", label: "Colour", type: "color" },
      { name: "description", label: "Description", type: "textarea", colSpan: 2 },
    ],
    schema: z.object({
      tier: z.string().min(1),
      label: z.string().min(1),
      minScore: num.min(0).max(100),
      maxScore: num.min(0).max(100),
      order: num,
      color: z.string().min(1),
      description: z.string().optional().default(""),
    }),
  },

  modules: {
    key: "modules",
    model: "trainingModule",
    singular: "Training Module",
    plural: "Training Modules",
    icon: "GraduationCap",
    description: "The training catalogue used for recommendations.",
    dynamicSources: ["categories"],
    columns: [
      { name: "title", label: "Title" },
      { name: "level", label: "Level", kind: "badge" },
      { name: "code", label: "Code" },
    ],
    fields: [
      { name: "code", label: "Code", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "level", label: "Level", type: "select", options: MODULE_LEVELS },
      { name: "durationHours", label: "Duration (hours)", type: "number" },
      { name: "categoryId", label: "Category", type: "select", optionsFrom: "categories" },
      { name: "active", label: "Active", type: "switch" },
      { name: "description", label: "Description", type: "textarea", colSpan: 2 },
      { name: "skills", label: "Skills", type: "tags", colSpan: 2 },
    ],
    schema: z.object({
      code: z.string().min(1),
      title: z.string().min(1),
      level: z.string().min(1),
      durationHours: optNum,
      categoryId: z.string().optional().default(""),
      active: z.boolean().default(true),
      description: z.string().optional().default(""),
      skills: strArr,
    }),
    toDoc: (v) => ({
      code: v.code,
      title: v.title,
      level: v.level,
      durationHours: v.durationHours === "" || v.durationHours == null ? null : Number(v.durationHours),
      categoryId: v.categoryId || null,
      active: Boolean(v.active),
      description: v.description ?? "",
      skills: v.skills ?? [],
    }),
  },

  recommendations: {
    key: "recommendations",
    model: "recommendation",
    singular: "Recommendation Rule",
    plural: "Recommendation Rules",
    icon: "GitBranch",
    description: "Rules mapping readiness → training modules.",
    dynamicSources: ["modules"],
    columns: [
      { name: "priority", label: "Priority", kind: "number" },
      { name: "label", label: "Label" },
    ],
    fields: [
      { name: "label", label: "Label", type: "text", colSpan: 2 },
      { name: "priority", label: "Priority (lower first)", type: "number" },
      { name: "moduleIds", label: "Recommend modules", type: "multiselect", optionsFrom: "modules" },
      { name: "minScore", label: "If score ≥", type: "number" },
      { name: "maxScore", label: "If score ≤", type: "number" },
      { name: "tiers", label: "If tier in", type: "multiselect", options: TIERS },
      { name: "reasonTemplate", label: "Reason template", type: "textarea", colSpan: 2, placeholder: "{name}: take {module} …" },
      { name: "stopOnMatch", label: "Stop on match", type: "switch" },
    ],
    schema: z.object({
      label: z.string().min(1),
      priority: num,
      moduleIds: strArr,
      minScore: optNum,
      maxScore: optNum,
      tiers: strArr,
      reasonTemplate: z.string().min(1),
      stopOnMatch: z.boolean().default(false),
    }),
    toDoc: recToDoc,
    fromDoc: recFromDoc,
  },
};

export const RESOURCE_KEYS = Object.keys(RESOURCES);
