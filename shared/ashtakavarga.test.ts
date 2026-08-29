import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { EXPECTED_BAV_TOTALS } from "./ashtakavarga";
import type { BirthInput } from "./schema";

const input: BirthInput = { name:"AV", date:"2000-01-01", time:"12:00", place:"Greenwich", latitude:51.4779, longitude:0, timezoneOffset:0, language:"en", methodology:"parashari", focus:"general", birthTimeAccuracyMinutes:5 };

describe("Ashtakavarga", () => {
  const av = calculateChart(input).advanced.ashtakavarga;
  it("preserves the classical invariant totals", () => {
    for (const [planet, expected] of Object.entries(EXPECTED_BAV_TOTALS)) expect(av.bhinna[planet].total).toBe(expected);
    expect(av.sarva.total).toBe(337);
  });
  it("returns twelve valid sign scores", () => {
    expect(av.sarva.signs).toHaveLength(12);
    expect(av.sarva.signs.every((score) => score >= 0 && score <= 56)).toBe(true);
  });
  it("applies both reductions without creating or increasing marks", () => {
    expect(av.reductions.status).toBe("applied");
    for (const planet of Object.keys(EXPECTED_BAV_TOTALS)) {
      const original = av.bhinna[planet].signs;
      const reduced = av.reductions.bhinna[planet];
      expect(reduced.afterTrikona).toHaveLength(12);
      expect(reduced.afterEkadhipatya).toHaveLength(12);
      reduced.afterEkadhipatya.forEach((value, sign) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(original[sign]);
      });
    }
  });
  it("computes nonnegative Rasi, Graha and Yoga Pindas after reduction", () => {
    for (const value of Object.values(av.pinda.values)) {
      expect(value.rasiPinda).toBeGreaterThanOrEqual(0);
      expect(value.grahaPinda).toBeGreaterThanOrEqual(0);
      expect(value.yogaPinda).toBe(value.rasiPinda + value.grahaPinda);
    }
  });
});
