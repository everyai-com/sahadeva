import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { analyzeLalKitabInference } from "./lalKitabInference";

const chart = calculateChart({
  name: "Inference", date: "2000-01-28", time: "08:05", place: "Ravulapalem",
  latitude: 16.1026, longitude: 81.7634, timezone: "Asia/Kolkata", timezoneOffset: 5.5,
  language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 5,
});

describe("Lal Kitab inference kernel", () => {
  it("derives a fact graph and remedy decisions without retrieval", () => {
    const result = analyzeLalKitabInference(chart);
    expect(result.computation.retrievalRequired).toBe(false);
    expect(result.factGraph.placements).toHaveLength(9);
    expect(result.explanationTrace.map((step) => step.order)).toEqual([1, 2, 3, 4, 5]);
    expect(result.explanationTrace.every((step) => step.sourceLocator.includes("book-gosvami"))).toBe(true);
  });
  it("never selects a remedy for an adverse fixed planet-effect", () => {
    const result = analyzeLalKitabInference(chart);
    for (const state of result.diagnoses)
      if (state.effectClass === "planet-effect-fixed") {
        expect(state.remedyDecision.decision).toBe("remedy-not-indicated-for-fixed-effect");
        expect(state.remedyDecision.targetPlanets).toEqual([]);
      }
  });
  it("builds source-defined assistance, confrontation, foundation and deception edges", () => {
    const result = analyzeLalKitabInference(chart);
    const kinds = new Set(result.factGraph.relationshipEdges.flatMap((edge) => edge.kinds));
    expect([...kinds]).toEqual(expect.arrayContaining(["mutual-assistance", "confrontation", "foundation", "deception"]));
  });
});
