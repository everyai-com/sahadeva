import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { calculateVargas } from "./advanced";
import type { BirthInput } from "./schema";

const input: BirthInput = { name: "Boundary suite", date: "2000-01-01", time: "12:00", place: "Greenwich", latitude: 51.4779, longitude: 0, timezoneOffset: 0, language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 5 };

describe("advanced Jyotish derivations", () => {
  const chart = calculateChart(input);

  it("emits the complete Parashari Shodashavarga set", () => {
    expect(Object.keys(chart.advanced.vargas)).toEqual(["D1", "D2", "D3", "D4", "D7", "D9", "D10", "D12", "D16", "D20", "D24", "D27", "D30", "D40", "D45", "D60"]);
    for (const varga of Object.values(chart.advanced.vargas)) {
      expect(varga).toHaveLength(10);
      expect(varga.every((p) => p.sign >= 0 && p.sign < 12)).toBe(true);
    }
  });

  it("applies special Hora and Trimsamsa mappings", () => {
    const synthetic = (longitude: number) => [{ name: "Sun" as const, longitude, sign: Math.floor(longitude / 30), degree: longitude % 30, nakshatra: "", pada: 1 }];
    expect(calculateChart(input).advanced.vargas.D2).toHaveLength(10);
    expect(calculateVargas(synthetic(4)).D2[0].sign).toBe(4);
    expect(calculateVargas(synthetic(16)).D2[0].sign).toBe(3);
    expect(calculateVargas(synthetic(34)).D2[0].sign).toBe(3);
    expect(calculateVargas(synthetic(4.9)).D30[0].sign).toBe(0);
    expect(calculateVargas(synthetic(5)).D30[0].sign).toBe(10);
    expect(calculateVargas(synthetic(41.9)).D30[0].sign).toBe(5);
    expect(calculateVargas(synthetic(42)).D30[0].sign).toBe(11);
  });

  it("keeps every antardasha inside its mahadasha", () => {
    for (const period of chart.advanced.vimshottariTimeline) {
      expect(period.subPeriods[0].startJulianDay).toBeCloseTo(period.startJulianDay, 8);
      expect(period.subPeriods.at(-1)!.endJulianDay).toBeCloseTo(period.endJulianDay, 8);
      for (const subPeriod of period.subPeriods) {
        expect(subPeriod.pratyantarPeriods[0].startJulianDay).toBeCloseTo(subPeriod.startJulianDay, 8);
        expect(subPeriod.pratyantarPeriods.at(-1)!.endJulianDay).toBeCloseTo(subPeriod.endJulianDay, 8);
      }
    }
  });

  it("preserves elapsed birth mahadasha time and identifies three levels", () => {
    expect(chart.advanced.vimshottariTimeline[0].startJulianDay).toBeLessThan(chart.engine.julianDay);
    expect(chart.advanced.birthPeriods.mahadasha).toBe(chart.vimshottari.birthLord);
    expect(chart.advanced.birthPeriods.antardasha).toBeTruthy();
    expect(chart.advanced.birthPeriods.pratyantardasha).toBeTruthy();
  });

  it("provides one dignity record per placement", () => expect(chart.advanced.dignities).toHaveLength(chart.placements.length));
});
