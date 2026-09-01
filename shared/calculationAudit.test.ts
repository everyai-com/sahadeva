import { describe, expect, it } from "vitest";
import { auditChartCalculation } from "./calculationAudit";
import { calculateChart } from "./jyotish";

describe("calculation audit", () => {
  it("does not promote a research-preview chart to certified prediction", () => {
    const chart = calculateChart({
      name: "Audit",
      date: "2000-01-28",
      time: "08:05",
      place: "Ravulapalem",
      latitude: 16.1026,
      longitude: 81.7634,
      timezone: "Asia/Kolkata",
      timezoneOffset: 5.5,
      language: "en",
      methodology: "parashari",
      focus: "general",
      birthTimeAccuracyMinutes: 5,
    });
    const result = auditChartCalculation(chart);
    expect(result.engine.productionCertified).toBe(false);
    expect(result.decision.chartFactsUsableForResearchPreview).toBe(true);
    expect(result.decision.safeForReviewedPrediction).toBe(false);
    expect(result.boundaryAudit).toHaveLength(4);
  });
});
