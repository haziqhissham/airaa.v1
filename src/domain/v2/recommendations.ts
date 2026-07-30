/**
 * v2 recommendation matcher — pure. Evaluates data-driven rules against a
 * score + role profile and returns ranked training-programme recommendations.
 *
 * The engine is deliberately role-aware: a recommendation must not depend on
 * the overall score alone. Rules can key off job grade, job function,
 * department and the workplace-application (Category C) score, so an executive
 * with a strong result is routed to leadership training while a data-team
 * member with strong workplace application is routed to analytics.
 */

export interface RuleConditions {
  categories?: string[]; // category keys the rule targets (reason context)
  minScore?: number; // overall score floor
  maxScore?: number; // overall score ceiling
  tiers?: string[]; // readiness tiers this applies to
  jobGrades?: string[]; // whole-word match vs profile.jobGrade (e.g. "Head", "Director")
  jobFunctions?: string[]; // whole-word match vs profile.jobFunction (e.g. "FINANCE", "SALES")
  departmentKeywords?: string[]; // whole-word match vs profile.department
  minWorkplaceScore?: number; // Category C (workplace application) floor
  /** Per-category floors keyed by category key, e.g. { A: 65, C: 65 }. All must pass. */
  minCategoryScores?: Record<string, number>;
}

export interface Rule {
  id: string;
  label: string;
  priority: number;
  conditions: RuleConditions;
  moduleIds: string[];
  reasonTemplate: string;
  stopOnMatch: boolean;
}

export interface ModuleLite {
  id: string;
  title: string;
  level: string;
  durationHours?: number | null;
  skills: string[];
  categoryId?: string | null;
}

export type RecommendationKind = "PRIMARY" | "SECONDARY";

export interface Recommendation {
  moduleId: string;
  title: string;
  level: string;
  durationHours?: number | null;
  skills: string[];
  reason: string;
  kind?: RecommendationKind;
}

export interface Profile {
  name: string;
  overall: number;
  tier?: string;
  /** category key → score */
  categoryScores: Record<string, number>;
  /** weakest category key (for reason text) */
  weakestCategory?: string;
  /** free-text job grade, e.g. "Senior Manager", "Executive". */
  jobGrade?: string;
  /** normalized job function, e.g. "SALES", "FINANCE". */
  jobFunction?: string;
  /** department name, e.g. "Business Intelligence", "Leasing". */
  department?: string;
  /** Category C (workplace application) score, 0..100. */
  workplaceScore?: number;
}

/** Space-pad a string's normalized word tokens, e.g. "Head of Dept" → " HEAD OF DEPT ". */
const wordPad = (s: string) => ` ${s.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim()} `;

/**
 * Whole-word / phrase match: true if any needle appears as a complete word (or
 * phrase) in the haystack. Avoids false positives like "IT" inside "DIGITAL"
 * while still matching "Head" in "Head of Department".
 */
const anyWholeWord = (haystack: string | undefined | null, needles: string[]): boolean => {
  if (!haystack) return false;
  const hay = wordPad(haystack);
  return needles.some((n) => hay.includes(wordPad(n)));
};

/** Evaluate a rule's conditions against a profile. All present dimensions must pass (AND). */
export function matchesConditions(c: RuleConditions, p: Profile): boolean {
  if (c.minScore !== undefined && p.overall < c.minScore) return false;
  if (c.maxScore !== undefined && p.overall > c.maxScore) return false;
  if (c.tiers?.length && (!p.tier || !c.tiers.includes(p.tier))) return false;
  if (c.jobGrades?.length && !anyWholeWord(p.jobGrade, c.jobGrades)) return false;
  if (c.jobFunctions?.length && !anyWholeWord(p.jobFunction, c.jobFunctions)) return false;
  if (c.departmentKeywords?.length && !anyWholeWord(p.department, c.departmentKeywords)) return false;
  if (c.minWorkplaceScore !== undefined && (p.workplaceScore ?? 0) < c.minWorkplaceScore) return false;
  if (c.minCategoryScores) {
    for (const [key, floor] of Object.entries(c.minCategoryScores)) {
      if ((p.categoryScores[key] ?? 0) < floor) return false;
    }
  }
  return true;
}

function renderReason(template: string, module: ModuleLite, p: Profile): string {
  return template
    .replaceAll("{name}", p.name)
    .replaceAll("{module}", module.title)
    .replaceAll("{tier}", p.tier ?? "")
    .replaceAll("{score}", String(Math.round(p.overall)))
    .replaceAll("{workplace}", String(Math.round(p.workplaceScore ?? 0)))
    .replaceAll("{grade}", p.jobGrade ?? "")
    .replaceAll("{department}", p.department ?? "")
    .replaceAll("{weakest}", p.weakestCategory ?? "");
}

/**
 * Rank recommendations by evaluating rules in priority order (ascending).
 * Returns deduped modules, capped at `max`. Falls back to the catalogue when no
 * rule matches so a result page is never empty.
 */
export function matchRecommendations(
  rules: Rule[],
  modules: ModuleLite[],
  profile: Profile,
  max = 4,
): Recommendation[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const chosen = new Map<string, Recommendation>();

  for (const rule of [...rules].sort((a, b) => a.priority - b.priority)) {
    if (!matchesConditions(rule.conditions ?? {}, profile)) continue;

    for (const mid of rule.moduleIds) {
      const m = byId.get(mid);
      if (m && !chosen.has(mid)) {
        chosen.set(mid, {
          moduleId: m.id,
          title: m.title,
          level: m.level,
          durationHours: m.durationHours,
          skills: m.skills,
          reason: renderReason(rule.reasonTemplate, m, profile),
        });
      }
    }
    if (rule.stopOnMatch && chosen.size) break;
  }

  // Fallback: if no rule matched, recommend modules from the catalogue.
  if (chosen.size === 0) {
    for (const m of modules.slice(0, max)) {
      chosen.set(m.id, {
        moduleId: m.id,
        title: m.title,
        level: m.level,
        durationHours: m.durationHours,
        skills: m.skills,
        reason: `${profile.name}, ${m.title} builds practical AI skills aligned to your results.`,
      });
    }
  }

  return [...chosen.values()].slice(0, max);
}

export interface ProgrammeRecommendation {
  primary?: Recommendation;
  /** Only generated when the overall score qualifies (see `secondaryFloor`). */
  secondary?: Recommendation;
  /** Full ranked list (primary first), for reference/debugging. */
  all: Recommendation[];
}

/**
 * Select a single primary programme and — for high performers — a complementary
 * secondary. Per spec, a secondary is only generated when the overall score is
 * at or above `secondaryFloor` (default 80).
 */
export function recommendProgrammes(
  rules: Rule[],
  modules: ModuleLite[],
  profile: Profile,
  secondaryFloor = 80,
): ProgrammeRecommendation {
  const all = matchRecommendations(rules, modules, profile, 4);
  const primary = all[0] ? { ...all[0], kind: "PRIMARY" as const } : undefined;
  const secondary =
    profile.overall >= secondaryFloor && all[1]
      ? { ...all[1], kind: "SECONDARY" as const }
      : undefined;
  return { primary, secondary, all };
}
