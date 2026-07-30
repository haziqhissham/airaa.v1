import type { DimensionScores } from "@/domain/types";

/** Human labels + display order for the five scored dimensions. */
export const DIMENSION_META: {
  key: keyof DimensionScores;
  label: string;
  short: string;
}[] = [
  { key: "awareness", label: "AI Awareness", short: "Awareness" },
  { key: "exposure", label: "AI Exposure", short: "Exposure" },
  { key: "confidence", label: "AI Confidence", short: "Confidence" },
  { key: "adoption", label: "AI Adoption", short: "Adoption" },
  { key: "mindset", label: "AI Mindset", short: "Mindset" },
];

export function scoreTone(score: number): {
  label: string;
  className: string;
} {
  if (score >= 80) return { label: "Excellent", className: "text-emerald-600" };
  if (score >= 60) return { label: "Strong", className: "text-brand-600" };
  if (score >= 40) return { label: "Developing", className: "text-amber-600" };
  return { label: "Emerging", className: "text-rose-600" };
}
