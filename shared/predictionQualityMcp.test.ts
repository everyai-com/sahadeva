import { describe, expect, it } from "vitest";
import { auditPredictionClaim, compareTraditionLedgers, validationReportFromCounts } from "./predictionQualityMcp";

describe("prediction quality MCP contracts", () => {
  it("keeps traditions separate", () => {
    const result = compareTraditionLedgers([{ tradition: "lal-kitab", status: "source-linked", supportingEvidence: [], opposingEvidence: [], unresolvedSources: ["x", "x"], limitations: [] }]);
    expect(result.traditions[0].unresolvedSources).toEqual(["x"]);
    expect(result.synthesisPolicy).toContain("never inferred by averaging");
  });
  it("abstains from prohibited claims and cautions unreviewed claims", () => {
    expect(auditPredictionClaim({ claim: "certain death", harmClass: "prohibited-output" }).decision.action).toBe("abstain");
    expect(auditPredictionClaim({ claim: "career change", calculationCertified: true }).decision.action).toBe("caution");
  });
  it("does not call counts predictive validation", () => {
    const result = validationReportFromCounts({ resolvedOutcomes: 99, blindOutcomes: 99 });
    expect(result.outcomes.calibrated).toBe(false);
    expect(result.overallStatus).toBe("research-preview");
  });
});
