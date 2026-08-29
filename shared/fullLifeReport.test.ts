import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildFullLifeReport } from "./fullLifeReport";
import type { BirthInput } from "./schema";

const input: BirthInput = {
  name: "Full Report",
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
};
describe("full life report", () => {
  it("combines readable life areas, evidence, vargas, synthesis and multi-year timing", () => {
    const report = buildFullLifeReport(
      calculateChart(input),
      "2026-08-29T00:00:00.000Z",
      2,
    );
    expect(report.schemaVersion).toBe("sahadeva-full-life-report-1");
    expect(report.plainLanguageReading.sections.length).toBeGreaterThan(5);
    expect(
      report.plainLanguageReading.sections.some(
        (section) => section.id === "counsel",
      ),
    ).toBe(true);
    expect(
      report.placements.find((item) => item.name === "Lagna")?.signName,
    ).toBe("Kumbha");
    expect(report.currentTiming.periods.mahadasha).toBeTruthy();
    expect(report.divisionalAnalysis.D9.purpose).toContain("partnership");
    expect(report.futureTiming.yearByYear).toHaveLength(2);
    expect(report.synthesis.combinationRule).toContain("No single placement");
    expect(report.aspects.planetToHouse.length).toBeGreaterThan(0);
    expect(report.ashtakavarga.sarvaBySign).toHaveLength(12);
    expect(report.consultationDepth.targetedLagnas.values).toHaveLength(2);
    expect(
      report.consultationDepth.strengthLineage.vimsopaka.sets.shodashavarga,
    ).toHaveLength(7);
    expect(report.sourceCoverage.status).toBe("awaiting-reviewed-rules");
    expect(report.safety.interpretationsReviewed).toBe(false);
  });
});
