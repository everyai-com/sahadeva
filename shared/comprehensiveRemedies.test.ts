import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildComprehensiveRemedies } from "./comprehensiveRemedies";

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

describe("comprehensive remedies", () => {
  const chart = calculateChart(person);

  it("withholds Lal Kitab remedies and requires explicit opt-in for mantra and gemstones", () => {
    const plan = buildComprehensiveRemedies(chart, {});
    expect(plan.lalKitabCoverage.reviewedExecutableRules).toBe(0);
    expect(plan.lalKitabCoverage.automaticRemedyAllowed).toBe(false);
    expect(
      plan.planetRemedies.every(
        (item) =>
          item.lalKitab.status === "withheld-source-only" &&
          item.mantra === undefined &&
          item.gemstone === undefined &&
          item.stotra === undefined &&
          item.vrata === undefined,
      ),
    ).toBe(true);
  });

  it("never recommends a strengthening gemstone for a node or a propitiated graha", () => {
    const plan = buildComprehensiveRemedies(chart, {});
    for (const card of plan.planetRemedies) {
      if (card.gemstone) {
        expect(card.intent).toBe("strengthen");
        expect(["Rahu", "Ketu"]).not.toContain(card.planet);
      }
      if (card.planet === "Rahu" || card.planet === "Ketu")
        expect(card.intent).toBe("propitiate");
    }
  });

  it("only strengthens grahas it classifies as functional benefics", () => {
    const plan = buildComprehensiveRemedies(chart, {});
    const favorable = new Set(plan.functionalNature.favorableToStrengthen);
    for (const card of plan.planetRemedies)
      if (card.intent === "strengthen")
        expect(favorable.has(card.planet)).toBe(true);
  });

  it("honours the gemstone/mantra/charity toggles", () => {
    const plan = buildComprehensiveRemedies(chart, {
      allowGemstones: false,
      allowMantras: false,
      allowCharity: false,
    });
    for (const card of plan.planetRemedies) {
      expect(card.gemstone).toBeUndefined();
      expect(card.mantra).toBeUndefined();
      expect(card.charity).toBeUndefined();
      expect(card.stotra).toBeUndefined();
      expect(card.vrata).toBeUndefined();
      // Conduct always survives — it is the safest remedy.
      expect(card.conduct.length).toBeGreaterThan(0);
    }
  });

  it("requires both fasting consent and a completed health screen", () => {
    const consentOnly = buildComprehensiveRemedies(chart, { allowFasting: true });
    expect(consentOnly.planetRemedies.every((card) => card.vrata === undefined)).toBe(true);
    const screened = buildComprehensiveRemedies(chart, {
      allowFasting: true,
      healthScreenedForFasting: true,
    });
    expect(screened.planetRemedies.some((card) => card.vrata)).toBe(true);
  });

  it("carries the anti-fear safety contract", () => {
    const plan = buildComprehensiveRemedies(chart, {});
    expect(plan.safety.neverClaims).toContain("guaranteed outcomes");
    expect(plan.safety.neverClaims.join(" ")).toMatch(/angry/i);
  });
});
