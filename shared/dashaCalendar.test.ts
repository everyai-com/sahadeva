import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildDashaCalendar, compactChartEvidence, dashaCalendarIcs, queryDashaAt } from "./dashaCalendar";
import type { BirthInput } from "./schema";

const input: BirthInput = { name:"Dasha",date:"2000-01-01",time:"12:00",place:"Greenwich",latitude:51.4779,longitude:0,timezoneOffset:0,timezone:"Etc/UTC",language:"en",methodology:"parashari",focus:"career",birthTimeAccuracyMinutes:5 };
describe("AI-compatible dasha calendar", () => {
  const chart = calculateChart(input), calendar = buildDashaCalendar(chart);
  it("preserves three-level boundaries and ages", () => {
    expect(calendar).toHaveLength(9); expect(calendar.every((maha) => maha.antardashas.length === 9)).toBe(true);
    expect(calendar.every((maha) => maha.antardashas.every((antar) => antar.pratyantardashas.length === 9))).toBe(true);
    expect(queryDashaAt(chart,new Date((chart.engine.julianDay - 2440587.5) * 86400000).toISOString()).mahadasha).toBe(chart.advanced.birthPeriods.mahadasha);
  });
  it("exports valid calendar events", () => { const ics=dashaCalendarIcs(chart); expect(ics).toContain("BEGIN:VCALENDAR"); expect((ics.match(/BEGIN:VEVENT/g)||[]).length).toBe(81); });
  it("returns a compact versioned AI evidence packet", () => { const evidence=compactChartEvidence(chart); expect(evidence.schemaVersion).toBe("sahadeva-evidence-2"); expect(evidence.placements).toHaveLength(10); expect(evidence.houses.sripati.status).toBe("supported"); expect(evidence.safety.interpretiveOnly).toBe(true); });
  it("carries the explicit planet-to-house aspect matrix", () => { const evidence=compactChartEvidence(chart) as unknown as { aspectMatrix: { system: string; houses: Array<{ planet: string; occupiedHouse: number; aspectedHouses: number[] }> } }; expect(evidence.aspectMatrix.system).toBe("whole-sign"); expect(evidence.aspectMatrix.houses.length).toBeGreaterThanOrEqual(9); const mars=evidence.aspectMatrix.houses.find((r) => r.planet==="Mars")!; expect(mars.aspectedHouses).toContain(mars.occupiedHouse); expect(mars.aspectedHouses.length).toBe(4); });
});
