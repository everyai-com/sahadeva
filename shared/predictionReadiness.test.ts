import { describe, expect, it } from "vitest";
import { assessPredictionReadiness } from "./predictionReadiness";

describe("prediction readiness", () => {
  it("blocks unsupported prediction claims and keeps Lal Kitab source-only", () => {
    const result = assessPredictionReadiness();
    expect(result.decision.reviewedTraditionalPrediction).toBe("blocked");
    expect(result.decision.calibratedEventProbability).toBe("blocked");
    expect(result.traditions.find((item) => item.id === "lal-kitab")).toMatchObject({
      status: "source-only",
      predictionPolicy: expect.stringContaining("do not infer"),
    });
    expect(result.recommendedMcpBuildOrder[0].priority).toBe(0);
    expect(result.safety.abstainWhen.length).toBeGreaterThanOrEqual(4);
  });
});
