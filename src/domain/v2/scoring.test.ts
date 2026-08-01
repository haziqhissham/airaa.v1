import { describe, it, expect } from "vitest";
import {
  analyzeGaps,
  classifyReadiness,
  computeCategoryScores,
  computeOverall,
  scoreCategory,
  scoreQuestion,
} from "@/domain/v2/scoring";
import type {
  CategoryWithQuestions,
  Question,
  ReadinessTierConfig,
} from "@/domain/v2/types";

const likertOpts = [1, 2, 3, 4, 5].map((n) => ({
  label: String(n),
  value: String(n),
  score: n,
}));

function likert(id: string): Question {
  return {
    id,
    categoryId: "c",
    order: 0,
    type: "LIKERT",
    text: "",
    required: true,
    weight: 1,
    maxScore: 5,
    options: likertOpts,
  };
}

const levels: ReadinessTierConfig[] = [
  { id: "1", tier: "BEGINNER", label: "Beginner", minScore: 0, maxScore: 20, color: "" },
  { id: "2", tier: "EMERGING", label: "Emerging", minScore: 21, maxScore: 40, color: "" },
  { id: "3", tier: "DEVELOPING", label: "Developing", minScore: 41, maxScore: 60, color: "" },
  { id: "4", tier: "ADVANCED", label: "Advanced", minScore: 61, maxScore: 80, color: "" },
  { id: "5", tier: "AI_READY", label: "AI Ready", minScore: 81, maxScore: 100, color: "" },
];

describe("scoreQuestion", () => {
  it("scores Likert as n/5 per the spec: 1→20, 3→60, 5→100", () => {
    const q = likert("q");
    expect(scoreQuestion(q, 1).score).toBe(20);
    expect(scoreQuestion(q, 3).score).toBe(60);
    expect(scoreQuestion(q, 5).score).toBe(100);
  });

  it("honours reverse-scored Likert options (value 5 → score 1)", () => {
    const reversed: Question = {
      ...likert("q"),
      options: [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: String(n), score: 6 - n })),
    };
    expect(scoreQuestion(reversed, 5).score).toBe(20); // strongly agree on a reverse item → low readiness
    expect(scoreQuestion(reversed, 3).score).toBe(60);
    expect(scoreQuestion(reversed, 1).score).toBe(100);
  });

  it("treats open text and blanks as unscored", () => {
    const open: Question = { ...likert("q"), type: "OPEN_TEXT" };
    expect(scoreQuestion(open, "hello").scored).toBe(false);
    expect(scoreQuestion(likert("q"), undefined).scored).toBe(false);
    expect(scoreQuestion(likert("q"), "").scored).toBe(false);
  });

  it("scores single choice by best option", () => {
    const q: Question = {
      ...likert("q"),
      type: "SINGLE_CHOICE",
      options: [
        { label: "a", value: "a", score: 0 },
        { label: "b", value: "b", score: 5 },
        { label: "c", value: "c", score: 10 },
      ],
    };
    expect(scoreQuestion(q, "c").score).toBe(100);
    expect(scoreQuestion(q, "b").score).toBe(50);
    expect(scoreQuestion(q, "a").score).toBe(0);
  });

  it("scores multiple choice proportionally", () => {
    const q: Question = {
      ...likert("q"),
      type: "MULTIPLE_CHOICE",
      options: [
        { label: "a", value: "a", score: 2 },
        { label: "b", value: "b", score: 3 },
        { label: "c", value: "c", score: 5 },
      ],
    };
    expect(scoreQuestion(q, ["a", "b", "c"]).score).toBe(100); // 10/10
    expect(scoreQuestion(q, ["c"]).score).toBe(50); // 5/10
  });
});

describe("scoreCategory + computeOverall", () => {
  it("averages scored questions and applies category weights", () => {
    const sections: CategoryWithQuestions[] = [
      { category: { id: "lead", key: "LEAD", name: "Lead", weight: 0.5, order: 0 }, questions: [likert("l1"), likert("l2")] },
      { category: { id: "data", key: "DATA", name: "Data", weight: 0.3, order: 1 }, questions: [likert("d1")] },
      { category: { id: "eth", key: "ETH", name: "Ethics", weight: 0.2, order: 2 }, questions: [likert("e1")] },
    ];
    const answers = { l1: 5, l2: 5, d1: 3, e1: 1 };
    expect(scoreCategory(sections[0]!.questions, answers)).toBe(100);
    const cat = computeCategoryScores(sections, answers);
    expect(cat).toEqual({ lead: 100, data: 60, eth: 20 });
    // 100*0.5 + 60*0.3 + 20*0.2 = 72
    expect(computeOverall(cat, sections.map((s) => s.category))).toBe(72);
  });

  it("ignores unscored (open text) questions in the average", () => {
    const open: Question = { ...likert("o"), type: "OPEN_TEXT" };
    expect(scoreCategory([likert("a"), open], { a: 5, o: "x" })).toBe(100);
  });
});

describe("classifyReadiness", () => {
  it("maps scores to the right tier", () => {
    expect(classifyReadiness(levels, 10)?.tier).toBe("BEGINNER");
    expect(classifyReadiness(levels, 65)?.tier).toBe("ADVANCED");
    expect(classifyReadiness(levels, 100)?.tier).toBe("AI_READY");
    expect(classifyReadiness(levels, 41)?.tier).toBe("DEVELOPING");
  });

  it("classifies fractional scores in the gap between integer bounds to the lower tier", () => {
    // 20.5 sits between BEGINNER max (20) and EMERGING min (21) — it must map to
    // the highest band whose min ≤ score, not default to the top tier.
    expect(classifyReadiness(levels, 20.5)?.tier).toBe("BEGINNER");
    expect(classifyReadiness(levels, 40.5)?.tier).toBe("EMERGING");
    expect(classifyReadiness(levels, 60.5)?.tier).toBe("DEVELOPING");
    expect(classifyReadiness(levels, 80.5)?.tier).toBe("ADVANCED");
  });
});

describe("analyzeGaps", () => {
  it("returns strengths ≥60 and gaps <50, never empty strengths", () => {
    const cats = [
      { id: "a", key: "A", name: "A", weight: 1, order: 0 },
      { id: "b", key: "B", name: "B", weight: 1, order: 1 },
      { id: "c", key: "C", name: "C", weight: 1, order: 2 },
    ];
    const r = analyzeGaps({ a: 90, b: 45, c: 10 }, cats);
    expect(r.strengths.map((s) => s.name)).toEqual(["A"]);
    expect(r.gaps.map((g) => g.name)).toEqual(["C", "B"]);
  });

  it("falls back to the top category when none clear the strong bar", () => {
    const cats = [{ id: "a", key: "A", name: "A", weight: 1, order: 0 }];
    expect(analyzeGaps({ a: 30 }, cats).strengths).toHaveLength(1);
  });
});
