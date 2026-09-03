import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import {
  calculateRelationshipCompatibility,
  RELATIONSHIP_TYPES,
} from "./relationshipCompatibility";

const first = {
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
} as const;
const second = {
  ...first,
  name: "B",
  date: "2001-06-10",
  time: "12:15",
} as const;

describe("relationship compatibility", () => {
  const chartA = calculateChart(first),
    chartB = calculateChart(second);

  it("returns six weighted, gender-neutral factors and a bounded harmony index", () => {
    const result = calculateRelationshipCompatibility(
      chartA,
      chartB,
      "business_partner",
    );
    expect(result.schemaVersion).toBe("sahadeva-relationship-compatibility-1");
    expect(result.relationship.type).toBe("business_partner");
    expect(result.factors.map((f) => f.id)).toEqual([
      "tara",
      "grahaMaitri",
      "gana",
      "yoni",
      "bhakoot",
      "element",
    ]);
    for (const f of result.factors) {
      expect(f.score).toBeGreaterThanOrEqual(0);
      expect(f.score).toBeLessThanOrEqual(f.maximum);
    }
    expect(result.harmony.index).toBeGreaterThanOrEqual(0);
    expect(result.harmony.index).toBeLessThanOrEqual(100);
    expect(result.safety.status).toBe("research-preview");
  });

  it("weights the same pair differently by relationship type", () => {
    const indices = RELATIONSHIP_TYPES.map(
      (type) =>
        calculateRelationshipCompatibility(chartA, chartB, type).harmony.index,
    );
    expect(indices.every((i) => Number.isFinite(i))).toBe(true);
    // Different weightings should not all collapse to one number.
    expect(new Set(indices).size).toBeGreaterThan(1);
  });
});
