import { describe, it, expect } from "vitest";
import {
  matchRecommendations,
  matchesConditions,
  recommendProgrammes,
  type ModuleLite,
  type Profile,
  type Rule,
} from "@/domain/v2/recommendations";

const modules: ModuleLite[] = [
  { id: "m1", title: "Data Course", level: "FOUNDATION", skills: ["data"] },
  { id: "m2", title: "Ethics Course", level: "FOUNDATION", skills: ["ethics"] },
  { id: "m3", title: "Advanced AI", level: "ADVANCED", skills: ["ai"] },
];

const profile = (overall: number, tier: string): Profile => ({
  name: "Ada",
  overall,
  tier,
  categoryScores: {},
});

describe("matchRecommendations", () => {
  it("applies min/max score conditions", () => {
    const rules: Rule[] = [
      { id: "r1", label: "low", priority: 10, conditions: { maxScore: 40 }, moduleIds: ["m1"], reasonTemplate: "{module}", stopOnMatch: false },
      { id: "r2", label: "high", priority: 20, conditions: { minScore: 80 }, moduleIds: ["m3"], reasonTemplate: "{module}", stopOnMatch: false },
    ];
    expect(matchRecommendations(rules, modules, profile(30, "EMERGING")).map((r) => r.moduleId)).toEqual(["m1"]);
    expect(matchRecommendations(rules, modules, profile(90, "AI_READY")).map((r) => r.moduleId)).toEqual(["m3"]);
  });

  it("filters by readiness tier", () => {
    const rules: Rule[] = [
      { id: "r1", label: "t", priority: 10, conditions: { tiers: ["ADVANCED"] }, moduleIds: ["m3"], reasonTemplate: "{module}", stopOnMatch: false },
    ];
    expect(matchRecommendations(rules, modules, profile(50, "DEVELOPING"))).toHaveLength(3); // fallback (no match)
    expect(matchRecommendations(rules, modules, profile(70, "ADVANCED")).map((r) => r.moduleId)).toEqual(["m3"]);
  });

  it("dedupes modules across rules and respects priority order", () => {
    const rules: Rule[] = [
      { id: "r2", label: "b", priority: 20, conditions: {}, moduleIds: ["m2"], reasonTemplate: "{module}", stopOnMatch: false },
      { id: "r1", label: "a", priority: 10, conditions: {}, moduleIds: ["m1", "m2"], reasonTemplate: "{module}", stopOnMatch: false },
    ];
    const out = matchRecommendations(rules, modules, profile(50, "DEVELOPING"));
    expect(out.map((r) => r.moduleId)).toEqual(["m1", "m2"]);
  });

  it("stops after the first matching rule when stopOnMatch is set", () => {
    const rules: Rule[] = [
      { id: "r1", label: "a", priority: 10, conditions: {}, moduleIds: ["m1"], reasonTemplate: "{module}", stopOnMatch: true },
      { id: "r2", label: "b", priority: 20, conditions: {}, moduleIds: ["m2"], reasonTemplate: "{module}", stopOnMatch: false },
    ];
    expect(matchRecommendations(rules, modules, profile(50, "DEVELOPING")).map((r) => r.moduleId)).toEqual(["m1"]);
  });

  it("renders reason templates", () => {
    const rules: Rule[] = [
      { id: "r1", label: "a", priority: 10, conditions: {}, moduleIds: ["m1"], reasonTemplate: "{name}: take {module} ({score})", stopOnMatch: true },
    ];
    expect(matchRecommendations(rules, modules, profile(42, "DEVELOPING"))[0]!.reason).toBe("Ada: take Data Course (42)");
  });

  it("falls back to catalogue when no rule matches", () => {
    expect(matchRecommendations([], modules, profile(50, "DEVELOPING"))).toHaveLength(3);
  });
});

describe("matchesConditions (role-aware)", () => {
  const base: Profile = { name: "Ada", overall: 65, categoryScores: {} };

  it("matches job grade case-insensitively by contains", () => {
    const c = { jobGrades: ["Senior Manager", "Director", "Head", "C-Level"] };
    expect(matchesConditions(c, { ...base, jobGrade: "Senior Manager" })).toBe(true);
    expect(matchesConditions(c, { ...base, jobGrade: "Head of Finance" })).toBe(true);
    expect(matchesConditions(c, { ...base, jobGrade: "Executive Director" })).toBe(true);
    expect(matchesConditions(c, { ...base, jobGrade: "Executive" })).toBe(false);
    expect(matchesConditions(c, { ...base })).toBe(false);
  });

  it("matches job function by exact (case-insensitive) equality", () => {
    const c = { jobFunctions: ["SALES", "MARKETING"] };
    expect(matchesConditions(c, { ...base, jobFunction: "sales" })).toBe(true);
    expect(matchesConditions(c, { ...base, jobFunction: "FINANCE" })).toBe(false);
  });

  it("matches department by keyword contains", () => {
    const c = { departmentKeywords: ["Leasing", "Business Development", "Corporate Communication"] };
    expect(matchesConditions(c, { ...base, department: "Retail Leasing" })).toBe(true);
    expect(matchesConditions(c, { ...base, department: "Corporate Communication" })).toBe(true);
    expect(matchesConditions(c, { ...base, department: "Finance" })).toBe(false);
  });

  it("gates on the workplace (Category C) score", () => {
    const c = { minWorkplaceScore: 70 };
    expect(matchesConditions(c, { ...base, workplaceScore: 72 })).toBe(true);
    expect(matchesConditions(c, { ...base, workplaceScore: 68 })).toBe(false);
    expect(matchesConditions(c, { ...base })).toBe(false); // missing → treated as 0
  });

  it("requires ALL present dimensions to pass (AND across dimensions)", () => {
    const c = { jobFunctions: ["FINANCE"], minWorkplaceScore: 70, minScore: 60 };
    expect(matchesConditions(c, { ...base, overall: 65, jobFunction: "FINANCE", workplaceScore: 75 })).toBe(true);
    expect(matchesConditions(c, { ...base, overall: 65, jobFunction: "FINANCE", workplaceScore: 60 })).toBe(false);
    expect(matchesConditions(c, { ...base, overall: 50, jobFunction: "FINANCE", workplaceScore: 75 })).toBe(false);
  });
});

describe("recommendProgrammes (primary + conditional secondary)", () => {
  const catalogue: ModuleLite[] = [
    { id: "lead", title: "AI Executive Leadership", level: "ADVANCED", skills: [] },
    { id: "data", title: "AI Data Analytics", level: "INTERMEDIATE", skills: [] },
    { id: "office", title: "AI for Office Management", level: "FOUNDATION", skills: [] },
  ];
  const rules: Rule[] = [
    { id: "r1", label: "exec", priority: 10, conditions: { jobGrades: ["Director"], minScore: 60 }, moduleIds: ["lead"], reasonTemplate: "{module}", stopOnMatch: false },
    { id: "r2", label: "data", priority: 20, conditions: { jobFunctions: ["FINANCE"], minWorkplaceScore: 70 }, moduleIds: ["data"], reasonTemplate: "{module}", stopOnMatch: false },
    { id: "r4", label: "catch-all", priority: 99, conditions: {}, moduleIds: ["office"], reasonTemplate: "{module}", stopOnMatch: false },
  ];

  it("returns a primary and no secondary below the floor", () => {
    const p: Profile = { name: "Ada", overall: 66, categoryScores: {}, jobGrade: "Director", jobFunction: "FINANCE", workplaceScore: 75 };
    const out = recommendProgrammes(rules, catalogue, p);
    expect(out.primary?.moduleId).toBe("lead");
    expect(out.primary?.kind).toBe("PRIMARY");
    expect(out.secondary).toBeUndefined();
  });

  it("generates a secondary when overall >= 80", () => {
    const p: Profile = { name: "Ada", overall: 85, categoryScores: {}, jobGrade: "Director", jobFunction: "FINANCE", workplaceScore: 75 };
    const out = recommendProgrammes(rules, catalogue, p);
    expect(out.primary?.moduleId).toBe("lead");
    expect(out.secondary?.moduleId).toBe("data");
    expect(out.secondary?.kind).toBe("SECONDARY");
  });

  it("routes non-matching roles to the catch-all office programme", () => {
    const p: Profile = { name: "Ada", overall: 45, categoryScores: {}, jobGrade: "Executive", jobFunction: "HR", workplaceScore: 40 };
    const out = recommendProgrammes(rules, catalogue, p);
    expect(out.primary?.moduleId).toBe("office");
    expect(out.secondary).toBeUndefined();
  });
});
