import { describe, expect, it } from "vitest";
import { calculateChart, julianDay, lahiriAyanamsa } from "./jyotish";
import type { BirthInput } from "./schema";

const input: BirthInput = { name: "Reference", date: "2000-01-01", time: "12:00", place: "Greenwich", latitude: 51.4779, longitude: 0, timezoneOffset: 0, language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 5 };

describe("clean-room Jyotish derivations", () => {
  it("converts the J2000 epoch to its Julian day", () => expect(julianDay(input)).toBeCloseTo(2451545, 8));
  it("keeps the certified Lahiri mean convention pinned at J2000", () => expect(lahiriAyanamsa(2451545)).toBeCloseTo(23.85709246, 7));
  it("returns normalized placements and antipodal nodes", () => {
    const chart = calculateChart(input);
    expect(chart.placements).toHaveLength(10);
    for (const body of chart.placements) expect(body.longitude).toBeGreaterThanOrEqual(0);
    for (const body of chart.placements) expect(body.longitude).toBeLessThan(360);
    const rahu = chart.placements.find((p) => p.name === "Rahu")!;
    const ketu = chart.placements.find((p) => p.name === "Ketu")!;
    expect(((ketu.longitude - rahu.longitude + 360) % 360)).toBeCloseTo(180, 8);
  });
  it("preserves the 120-year Vimshottari cycle", () => {
    const years = calculateChart(input).vimshottari.sequence.reduce((sum, period) => sum + period.years, 0);
    expect(years).toBe(120);
  });
});
