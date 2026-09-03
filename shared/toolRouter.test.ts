import { describe, expect, it } from "vitest";
import { recommendTools } from "./toolRouter";

describe("tool router", () => {
  const cases: Array<[string, string]> = [
    ["Are Ravi and I good business partners?", "relationship-nonmarital"],
    ["check our kundli match before marriage", "marriage-match"],
    ["When will I get married?", "marriage-timing"],
    ["Best date to start my company next month", "muhurta"],
    ["Will I get the job? yes or no", "prashna"],
    ["What's today's panchang and rahu kaal?", "daily-panchanga"],
    ["What remedies should I do for my career?", "remedies"],
    ["Tell me everything about my life", "full-report"],
    ["Am I manglik?", "dosha"],
    ["What is happening right now with saturn transit?", "transits-timing"],
    ["Some open-ended question about meaning", "general-consultation"],
  ];
  it.each(cases)("routes %j -> %s", (q, intent) => {
    expect(recommendTools(q).intent).toBe(intent);
  });

  it("always returns a non-empty ordered plan and a safety block", () => {
    const r = recommendTools("Are we compatible as co-founders?", {
      hasSecondPerson: true,
    });
    expect(r.plan.length).toBeGreaterThan(0);
    expect(r.plan[r.plan.length - 1].tool).toBe(
      "calculate_relationship_compatibility",
    );
    expect(r.safety.status).toBe("routing-hint");
  });

  it("flags a missing second person for two-person questions", () => {
    const r = recommendTools("business partner compatibility", {
      hasSecondPerson: false,
    });
    expect(r.notes.join(" ")).toMatch(/second person/i);
  });
});
