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
    expect(result.explanationTrace.map((step) => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.explanationTrace.every((step) => step.sourceLocator.includes("book-gosvami"))).toBe(true);
  });
  it("predicts each remedy topic from calculated Lal Kitab factors and links remedies", () => {
    for (const topic of ["career", "education", "property", "relationships", "spirituality", "wealth", "health", "children"] as const) {
      const result = analyzeLalKitabInference(chart, topic);
      expect(result.topicPrediction.topic).toBe(topic);
      expect(result.predictions.length).toBeGreaterThan(0);
      expect(result.predictions.every((prediction) => prediction.topic === topic && prediction.logic.length >= 4)).toBe(true);
      expect(result.remedyPlan.ordered.every((item) => item.basis === "artificial-planet" || Array.isArray(item.predictionIds))).toBe(true);
      expect(JSON.stringify(result.predictions)).not.toMatch(/guaranteed|certain death|medical diagnosis|fertility certainty/i);
    }
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
  it("synthesizes artificial planets and speaking states as calculated facts", () => {
    const result = analyzeLalKitabInference(chart);
    expect(result.factGraph.placements.every((state) => ["speaking", "silent", "conditional"].includes(state.expressionState))).toBe(true);
    expect(result.factGraph.artificialPlanets.every((state) => state.effectClass === "sign-effect-remediable")).toBe(true);
  });
});

describe("Lal Kitab certification quarantine", () => {
  it("labels inference structural with predictions withheld pending review", () => {
    const result = analyzeLalKitabInference(chart);
    expect(result.certification).toMatchObject({
      status: "structural-preview",
      predictions: "withheld-pending-extraction-and-review",
      reviewStatus: "draft-unreviewed",
    });
  });
  it("never emits certainty language in the serialized inference", () => {
    const text = JSON.stringify(analyzeLalKitabInference(chart)).toLowerCase();
    for (const banned of ["guaranteed", "certain outcome", "will happen", "definitely", "100%"])
      expect(text).not.toContain(banned);
  });
});
