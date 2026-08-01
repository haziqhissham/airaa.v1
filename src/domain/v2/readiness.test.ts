import { describe, it, expect } from "vitest";
import { bandForScore, personaForScore, READINESS_BANDS } from "@/domain/v2/readiness";

describe("readiness bands", () => {
  it("covers 0..100 with no gaps or overlaps", () => {
    for (let s = 0; s <= 100; s++) {
      const band = bandForScore(s);
      expect(band).toBeDefined();
      expect(s).toBeGreaterThanOrEqual(band.min);
      expect(s).toBeLessThanOrEqual(band.max);
    }
    // Four contiguous bands.
    expect(READINESS_BANDS).toHaveLength(4);
    for (let i = 1; i < READINESS_BANDS.length; i++) {
      expect(READINESS_BANDS[i]!.min).toBe(READINESS_BANDS[i - 1]!.max + 1);
    }
  });

  it("maps the spec boundaries to the right tier + persona", () => {
    expect(bandForScore(39).tier).toBe("BEGINNER");
    expect(personaForScore(0).label).toBe("AI Observer");
    expect(personaForScore(39).label).toBe("AI Observer");

    expect(bandForScore(40).tier).toBe("EMERGING");
    expect(personaForScore(59).label).toBe("AI Explorer");

    expect(bandForScore(60).tier).toBe("AI_READY");
    expect(personaForScore(79).label).toBe("AI Practitioner");

    expect(bandForScore(80).tier).toBe("AI_ADVANCED");
    expect(personaForScore(100).label).toBe("AI Champion");
  });

  it("classifies fractional scores that fall in the gap between integer bounds", () => {
    // Scores are round1 (one decimal), so a value like 39.3 sits between the
    // Beginner max (39) and Emerging min (40) — it must not default to the top.
    expect(bandForScore(39.3).tier).toBe("BEGINNER");
    expect(bandForScore(39.9).tier).toBe("BEGINNER");
    expect(bandForScore(59.5).tier).toBe("EMERGING");
    expect(bandForScore(79.4).tier).toBe("AI_READY");
    expect(bandForScore(79.9).tier).toBe("AI_READY");
    expect(bandForScore(80.1).tier).toBe("AI_ADVANCED");
  });

  it("clamps out-of-range scores", () => {
    expect(personaForScore(-10).label).toBe("AI Observer");
    expect(personaForScore(150).label).toBe("AI Champion");
  });
});
