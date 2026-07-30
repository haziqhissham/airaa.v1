/**
 * v2 assessment domain types — plain shapes decoupled from Prisma so the engine
 * stays pure and testable. Category-based (10 sections), readiness-tiered.
 */

export type QType = "LIKERT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "OPEN_TEXT";

export interface QOption {
  label: string;
  value: string;
  score: number;
}

export interface Question {
  id: string;
  categoryId: string;
  order: number;
  type: QType;
  text: string;
  helpText?: string | null;
  required: boolean;
  weight: number;
  maxScore: number;
  options: QOption[];
}

export interface Category {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  weight: number;
  order: number;
}

export interface CategoryWithQuestions {
  category: Category;
  questions: Question[];
}

export type AnswerValue = string | string[] | number;

export interface ReadinessTierConfig {
  id: string;
  tier: string;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
  description?: string | null;
}

/** categoryId → score (0..100). */
export type CategoryScores = Record<string, number>;
