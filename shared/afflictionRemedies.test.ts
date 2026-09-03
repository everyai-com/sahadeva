import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import {
  buildAfflictionRemedyPlan,
  detectAfflictions,
} from "./afflictionRemedies";

const person = {
  name: "A",
  date: "1990-05-14",
  time: "09:30",
  place: "Hyderabad",
  latitude: 17.385,
  longitude: 78.4867,
  timezoneOffset: 5.5,
  timezone: "Asia/Kolkata",
  language: "en",
  methodology: "parashari",
  focus: "general",
  birthTimeAccuracyMinutes: 5,
} as const;

describe("affliction remedies", () => {
  const chart = calculateChart(person);

  it("detects afflictions only from real chart conditions", () => {
    const found = detectAfflictions(chart);
    for (const ind of found) {
      expect(ind.reasons.length).toBeGreaterThan(0);
      expect(["low", "moderate", "high"]).toContain(ind.severity);
    }
  });

  it("only ever emits gate-safe families and withholds the risky ones", () => {
    const plan = buildAfflictionRemedyPlan(chart, {});
    const families = new Set(
      plan.planets.flatMap((p) => p.remedies.map((r) => r.family)),
    );
    for (const fam of families)
      expect(["conduct", "charity", "prayer"]).toContain(fam);
    expect(plan.withheldFamilies).toContain("mantra");
    expect(plan.withheldFamilies).toContain("gemstone");
    // Every remedy is free and low burden.
    for (const p of plan.planets)
      for (const r of p.remedies) {
        expect(r.cost).toBe("free");
        expect(r.burden).toBe("minimal");
      }
  });

  it("respects charity/prayer preferences", () => {
    const plan = buildAfflictionRemedyPlan(chart, {
      allowCharity: false,
      allowPrayer: false,
    });
    const families = new Set(
      plan.planets.flatMap((p) => p.remedies.map((r) => r.family)),
    );
    expect(families.has("charity")).toBe(false);
    expect(families.has("prayer")).toBe(false);
    // Conduct is always available (automatic-eligibility, no preference gate).
    if (plan.planets.length > 0) expect(families.has("conduct")).toBe(true);
  });
});
