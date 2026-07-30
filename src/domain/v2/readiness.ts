/**
 * AIRA readiness bands — the single source of truth for the four score bands.
 * The readiness tier, the AI persona, the band colour and the score range all
 * derive from one place so the seed (DB `readiness_levels`), the scoring engine
 * and the UI can never drift apart.
 *
 *   0–39   Beginner    · AI Observer     · red
 *   40–59  Emerging    · AI Explorer     · orange
 *   60–79  AI Ready    · AI Practitioner · blue
 *   80–100 AI Advanced · AI Champion     · green
 */

export interface ReadinessBand {
  /** Enum value stored on readiness_levels.tier. */
  tier: "BEGINNER" | "EMERGING" | "AI_READY" | "AI_ADVANCED";
  /** Human label for the readiness level. */
  label: string;
  /** Enum-style persona key. */
  personaKey: "OBSERVER" | "EXPLORER" | "PRACTITIONER" | "CHAMPION";
  /** Human label for the AI persona. */
  persona: string;
  /** Inclusive score range (0..100). */
  min: number;
  max: number;
  /** Band colour (hex). */
  color: string;
  /** Readiness-level description. */
  description: string;
  /** Persona description. */
  personaDescription: string;
}

export const READINESS_BANDS: readonly ReadinessBand[] = [
  {
    tier: "BEGINNER",
    label: "Beginner",
    personaKey: "OBSERVER",
    persona: "AI Observer",
    min: 0,
    max: 39,
    color: "#ef4444", // red
    description: "Early awareness of AI; foundational upskilling needed to begin adoption.",
    personaDescription:
      "Watches AI from the sidelines. Building the vocabulary and confidence to take a first step.",
  },
  {
    tier: "EMERGING",
    label: "Emerging",
    personaKey: "EXPLORER",
    persona: "AI Explorer",
    min: 40,
    max: 59,
    color: "#f97316", // orange
    description: "Growing understanding and openness; experimenting with AI in pockets of work.",
    personaDescription:
      "Actively trying AI tools and forming habits. Ready for guided, hands-on practice.",
  },
  {
    tier: "AI_READY",
    label: "AI Ready",
    personaKey: "PRACTITIONER",
    persona: "AI Practitioner",
    min: 60,
    max: 79,
    color: "#3b82f6", // blue
    description: "Confident, capable and applying AI to real workplace tasks with good judgement.",
    personaDescription:
      "Uses AI reliably in daily work and helps peers. Ready to deepen and specialise.",
  },
  {
    tier: "AI_ADVANCED",
    label: "AI Advanced",
    personaKey: "CHAMPION",
    persona: "AI Champion",
    min: 80,
    max: 100,
    color: "#22c55e", // green
    description: "Leading practice; drives responsible AI adoption and lifts the wider team.",
    personaDescription:
      "A role model for AI at work — sets direction, mentors others and champions responsible use.",
  },
] as const;

const clampScore = (n: number) => Math.min(100, Math.max(0, n));

/** Resolve the readiness band for an overall score (0..100). */
export function bandForScore(score: number): ReadinessBand {
  const s = clampScore(score);
  return (
    READINESS_BANDS.find((b) => s >= b.min && s <= b.max) ??
    READINESS_BANDS[READINESS_BANDS.length - 1]!
  );
}

export interface PersonaResult {
  key: ReadinessBand["personaKey"];
  label: string;
  description: string;
}

/** Map an overall score to its AI persona. */
export function personaForScore(score: number): PersonaResult {
  const b = bandForScore(score);
  return { key: b.personaKey, label: b.persona, description: b.personaDescription };
}
