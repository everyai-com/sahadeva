import { describe, expect, it } from "vitest";
import { auditPredictionClaim, compareTraditionLedgers, validationReportFromCounts } from "./predictionQualityMcp";

describe("prediction quality MCP contracts", () => {
  it("keeps traditions separate", () => {
    const result = compareTraditionLedgers([{ tradition: "lal-kitab", status: "source-linked", supportingEvidence: [], opposingEvidence: [], unresolvedSources: ["x", "x"], limitations: [] }]);
    expect(result.traditions[0].unresolvedSources).toEqual(["x"]);
    expect(result.synthesisPolicy).toContain("never inferred by averaging");
  });
  it("abstains from prohibited claims and cautions unreviewed claims", () => {
    const prohibited = auditPredictionClaim({ claim: "certain death", harmClass: "prohibited-output" });
    expect(prohibited.decision.action).toBe("abstain");
    expect(prohibited.narration.mode).toBe("rewrite-unsafe-claim");
    expect(prohibited.narration.instruction).toContain("practical suggestion");
    const unreviewed = auditPredictionClaim({ claim: "career change", calculationCertified: true });
    expect(unreviewed.decision.action).toBe("caution");
    expect(unreviewed.narration.mode).toBe("suggestion-only");
  });
  it("does not call counts predictive validation", () => {
    const result = validationReportFromCounts({ resolvedOutcomes: 99, blindOutcomes: 99 });
    expect(result.outcomes.calibrated).toBe(false);
    expect(result.overallStatus).toBe("research-preview");
  });
});
