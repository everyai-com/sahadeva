import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { southIndianChartSvg } from "./shareableChart";
import { buildServerReportPdf } from "../worker/serverReport";
import { buildFullLifeReport } from "./fullLifeReport";

const input = {
  name: "Shareable",
  date: "2000-01-01",
  time: "12:00",
  place: "Greenwich",
  latitude: 51.4779,
  longitude: 0,
  timezoneOffset: 0,
  timezone: "Etc/UTC",
  language: "en",
  methodology: "parashari",
  focus: "general",
  birthTimeAccuracyMinutes: 5,
} as const;
describe("shareable output", () => {
  it("renders a complete South Indian SVG with state flags", () => {
    const chart = calculateChart(input),
      svg = southIndianChartSvg(chart);
    expect(svg).toContain("<svg");
    expect(svg.match(/class=\"cell\"/g)).toHaveLength(12);
    expect(svg).toContain("Shareable");
    expect(svg).toContain("Lahiri sidereal");
  });
  it("creates a valid multi-page server PDF", async () => {
    const chart = calculateChart(input),
      report = buildFullLifeReport(chart, "2026-08-29", 2),
      pdf = await buildServerReportPdf(
        chart,
        report as unknown as Record<string, any>,
      );
    expect(new TextDecoder().decode(pdf.slice(0, 8))).toContain("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(5000);
  });
});
