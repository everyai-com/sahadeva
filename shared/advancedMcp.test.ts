import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import {
  analyzeArudhaUpapada,
  analyzeBadhaka,
  analyzeTransitActivation,
  analyzeVarga,
  analyzeYogas,
  auditReadingEvidence,
  calculateAshtakavargaProfile,
  calculateDashaSystem,
  calculateStrengthProfile,
  compareReadingVersions,
  explainChartSources,
} from "./advancedMcp";
const chart = calculateChart({
  name: "A",
  date: "2000-01-28",
  time: "08:05",
  place: "Ravulapalem",
  latitude: 16.7607,
  longitude: 81.833,
  timezoneOffset: 5.5,
  timezone: "Asia/Kolkata",
  language: "en",
  methodology: "parashari",
  focus: "general",
  birthTimeAccuracyMinutes: 5,
});
describe("advanced MCP engines", () => {
  it("exposes calculated evidence without flattening the traditions", () => {
    const strength = calculateStrengthProfile(chart);
    expect(strength.schemaVersion).toBe("sahadeva-strength-profile-2");
    expect(strength.shadbala).toBeDefined();
    expect(strength.sourceRuleEvaluations).toHaveLength(3);
    expect(
      strength.sourceRuleEvaluations.every(
        (row) => row.sourceKey.startsWith("book-") && !row.publishable,
      ),
    ).toBe(true);
    expect(calculateAshtakavargaProfile(chart).signs).toHaveLength(12);
    expect(
      analyzeVarga(chart, "D9", "marriage").placements.length,
    ).toBeGreaterThan(0);
    const yogas = analyzeYogas(chart);
    expect(yogas.schemaVersion).toBe("sahadeva-yoga-analysis-4");
    expect(
      yogas.detected.every((row) => Array.isArray(row.cancellationCandidates)),
    ).toBe(true);
    expect(yogas.sourceRuleEvaluations).toHaveLength(7);
    expect(
      yogas.sourceRuleEvaluations.every(
        (row) => row.sourceKey.startsWith("book-") && !row.publishable,
      ),
    ).toBe(true);
    expect(
      yogas.sourceRuleEvaluations.some((row) =>
        row.ruleId.includes("d9-condition"),
      ),
    ).toBe(true);
    expect(
      calculateDashaSystem(chart, "vimshottari", "2026-08-31T00:00:00Z"),
    ).toHaveProperty("active");
    expect(analyzeArudhaUpapada(chart).upapadaLagna).toBeDefined();
    expect(analyzeBadhaka(chart).safety.prohibited).toContain("curse");
  });
  it("fuses transit timing and preserves a no-guarantee boundary", () => {
    const result = analyzeTransitActivation(
      chart,
      "career",
      "2026-08-31T00:00:00Z",
      "2026-01-01T00:00:00Z",
      "2027-01-01T00:00:00Z",
    );
    expect(result.transits).toHaveLength(9);
    expect(result.safety.notice).toContain("does not independently create");
  });
  it("supports provenance, safety audit and version diffs", () => {
    expect(explainChartSources("remedies").sources.length).toBeGreaterThan(0);
    expect(
      auditReadingEvidence(
        "Sun is in Atlantis and you will definitely win",
        chart,
      ).supported,
    ).toBe(false);
    expect(
      compareReadingVersions(
        {
          engineVersion: "1",
          conclusions: [{ id: "career", status: "mixed" }],
        },
        {
          engineVersion: "2",
          conclusions: [{ id: "career", status: "supported" }],
        },
      ).conclusions[0].changed,
    ).toBe(true);
  });
});
