import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import type { BirthInput } from "./schema";

const base: BirthInput = { name: "Guidance", date: "2000-01-01", time: "12:00", place: "Greenwich", latitude: 51.4779, longitude: 0, timezoneOffset: 0, language: "en", methodology: "parashari", focus: "career", birthTimeAccuracyMinutes: 1 };

describe("layered guidance", () => {
  it("maps a question domain to its house, karakas and varga", () => {
    const guidance = calculateChart(base).advanced.guidance;
    expect(guidance.focus).toMatchObject({ relevantHouse: 10, recommendedVarga: "D10", karakas: ["Sun", "Saturn"] });
    expect(guidance.methodology.status).toBe("available-preview");
    expect(guidance.evidence.relevantHouseLord).toBeTruthy();
  });

  it("reduces confidence for unsupported methods and uncertain fine vargas", () => {
    const supported = calculateChart(base).advanced.guidance.confidence.score;
    const uncertain = calculateChart({ ...base, methodology: "kp", focus: "health", birthTimeAccuracyMinutes: 30 }).advanced.guidance;
    expect(uncertain.methodology.status).toBe("not-implemented");
    expect(uncertain.confidence.score).toBeLessThan(supported);
    expect(uncertain.confidence.factors.join(" ")).toContain("D27");
  });
});
