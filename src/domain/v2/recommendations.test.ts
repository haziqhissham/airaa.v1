import { describe, it, expect } from "vitest";
import {
  matchRecommendations,
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
