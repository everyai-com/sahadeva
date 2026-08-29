import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { calculateAshtottariDasha } from "./ashtottari";
import { calculateCharaDasha, calculateNarayanaDasha } from "./rasiDashas";
const chart = calculateChart({
  name: "Test",
  date: "1990-01-01",
  time: "12:00",
  latitude: 17.385,
  longitude: 78.4867,
  timezoneOffset: 5.5,
  timezone: "Asia/Kolkata",
  place: "Hyderabad",
  language: "en",
  methodology: "parashari",
  focus: "general",
  birthTimeAccuracyMinutes: 5,
  houseSystem: "whole-sign",
});
describe("versioned alternate Dasha systems", () => {
  it("uses the complete 108-year Ashtottari sequence and next-lord Antardasha order", () => {
    const result = calculateAshtottariDasha(chart, "universal", 1);
    expect(result.periods).toHaveLength(8);
    expect(result.periods.reduce((sum, p) => sum + Number(p.years), 0)).toBe(
      108,
    );
    const first = result.periods[0];
    expect((first.subPeriods as Array<{ lord: string }>)[0].lord).not.toBe(
      first.lord,
    );
    expect((first.subPeriods as Array<{ lord: string }>).at(-1)?.lord).toBe(
      first.lord,
    );
  });
  it("returns twelve unique Chara signs", () => {
    const result = calculateCharaDasha(chart);
    expect(new Set(result.periods.map((p) => p.sign)).size).toBe(12);
    expect(
      result.periods.every(
        (p) => Number(p.years) >= 1 && Number(p.years) <= 12,
      ),
    ).toBe(true);
  });
  it("applies Narayana seed evidence and a twelve-sign progression", () => {
    const result = calculateNarayanaDasha(chart, 1);
    expect(result.progression.signs).toHaveLength(12);
    expect(new Set(result.progression.signs).size).toBe(12);
    expect(result.seed.decidedBy).toBeTruthy();
    expect(
      result.periods.every(
        (p) => Number(p.years) >= 1 && Number(p.years) <= 13,
      ),
    ).toBe(true);
  });
});
