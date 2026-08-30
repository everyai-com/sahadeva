import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildTopicJudgment } from "./judgment";

const input = {
  name: "Judgment fixture",
  date: "1990-05-17",
  time: "10:30",
  place: "Hyderabad",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
  timezoneOffset: 5.5,
  language: "en" as const,
  methodology: "parashari" as const,
  focus: "career" as const,
  birthTimeAccuracyMinutes: 5,
};

describe("topic judgment", () => {
  it("keeps support, opposition, varga, timing and source state explicit", () => {
    const result = buildTopicJudgment(
      calculateChart(input),
      "career",
      "2026-08-30T00:00:00.000Z",
    );
    expect(result.schemaVersion).toBe("sahadeva-judgment-1");
    expect(result.topic).toBe("career");
    expect(result.supportingEvidence.length).toBeGreaterThan(0);
    expect(result.vargaConfirmation.varga).toBe("D10");
    expect(result.timingActivation.notice).toContain("cannot create");
    expect(result.appliedRules.every((rule) => rule.status === "structural-unreviewed")).toBe(true);
    expect(result.unresolvedSourceKeys).toHaveLength(4);
    expect(result.citations).toEqual([]);
  });
});
