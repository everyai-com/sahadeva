import { describe, expect, it } from "vitest";
import { birthInputSchema } from "./schema";
import { calculateChart } from "./jyotish";
import { buildEverydayReading } from "./everydayReading";
import { buildTopicJudgment } from "./judgment";
import { composeEvidenceAnswer } from "./evidenceAnswer";

const input = birthInputSchema.parse({
  name: "Ananya", date: "1992-10-08", time: "14:47", place: "Chennai",
  latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata", timezoneOffset: 5.5,
  language: "en", methodology: "parashari", focus: "career", birthTimeAccuracyMinutes: 30,
});

describe("evidence-only assistant answer", () => {
  const chart = calculateChart(input);

  it("leads with the calculated judgment and cites its evidence", () => {
    const judgment = buildTopicJudgment(chart, "career", "2026-10-03T00:00:00Z");
    const text = composeEvidenceAnswer({
      language: "en",
      reading: buildEverydayReading(chart, null, "en"),
      focusedJudgment: judgment,
      currentTiming: { mahadasha: "Saturn", antardasha: "Mercury" },
    });
    expect(text.startsWith(judgment.conclusion)).toBe(true);
    expect(text).toContain("### Practical next steps");
    expect(text).toContain("Saturn / Mercury");
    expect(text).toMatch(/assistant is unavailable/);
  });

  it("stays in Telugu for Telugu readers and never mixes in English judgments", () => {
    const reading = buildEverydayReading(chart, null, "te");
    const text = composeEvidenceAnswer({
      language: "te",
      reading,
      focusedJudgment: buildTopicJudgment(chart, "career", "2026-10-03T00:00:00Z"),
      currentTiming: { mahadasha: "Saturn", antardasha: "Venus" },
    });
    expect(text.startsWith(reading.dailyLife.summary)).toBe(true);
    expect(text).not.toContain("Why Sahadeva says this");
    expect(text).toMatch(/[ఀ-౿]/);
  });
});
