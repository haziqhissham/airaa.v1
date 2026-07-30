/**
 * v2 recommendation matcher — pure. Evaluates data-driven rules against a
 * score profile and returns ranked training-module recommendations.
 */

export interface RuleConditions {
  categories?: string[]; // category keys the rule targets
  minScore?: number;
  maxScore?: number;
  tiers?: string[]; // readiness tiers this applies to
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

export interface Recommendation {
  moduleId: string;
  title: string;
  level: string;
  durationHours?: number | null;
  skills: string[];
  reason: string;
}

export interface Profile {
  name: string;
  overall: number;
  tier?: string;
  /** category key → score */
  categoryScores: Record<string, number>;
  /** weakest category key (for reason text) */
  weakestCategory?: string;
}

function renderReason(template: string, module: ModuleLite, p: Profile): string {
  return template
    .replaceAll("{name}", p.name)
    .replaceAll("{module}", module.title)
    .replaceAll("{tier}", p.tier ?? "")
    .replaceAll("{score}", String(Math.round(p.overall)))
    .replaceAll("{weakest}", p.weakestCategory ?? "");
}

export function matchRecommendations(
  rules: Rule[],
  modules: ModuleLite[],
  profile: Profile,
  max = 4,
): Recommendation[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const chosen = new Map<string, Recommendation>();

  for (const rule of [...rules].sort((a, b) => a.priority - b.priority)) {
    const c = rule.conditions ?? {};
    if (c.minScore !== undefined && profile.overall < c.minScore) continue;
    if (c.maxScore !== undefined && profile.overall > c.maxScore) continue;
    if (c.tiers && c.tiers.length && (!profile.tier || !c.tiers.includes(profile.tier))) continue;

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

  // Fallback: if no rule matched, recommend modules tied to the weakest categories.
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
