import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildEverydayReading } from "./everydayReading";
import type { BirthInput } from "./schema";

const input: BirthInput = {
  name: "Reader",
  date: "2000-01-01",
  time: "12:00",
  place: "Greenwich",
  latitude: 51.4779,
  longitude: 0,
  timezoneOffset: 0,
  language: "en",
  methodology: "parashari",
  focus: "career",
  birthTimeAccuracyMinutes: 5,
};

describe("everyday reading", () => {
  it("turns chart facts into an evidence-linked plain-language reading", () => {
    const reading = buildEverydayReading(calculateChart(input), {
      mahadasha: "Saturn",
      antardasha: "Mercury",
    });
    expect(reading.sections.map((section) => section.id)).toEqual([
      "self",
      "focus",
      "strength",
      "routines",
      "career",
      "community",
      "timing",
      "counsel",
    ]);
    expect(
      reading.sections.every((section) => section.evidence.length > 0),
    ).toBe(true);
    expect(
      reading.sections.find((section) => section.id === "timing")?.message,
    ).toContain("not as a guaranteed event prediction");
    expect(reading.notice).toContain("unreviewed");
  });

  it("provides a Telugu presentation without changing the evidence", () => {
    const chart = calculateChart({ ...input, language: "te" });
    const reading = buildEverydayReading(
      chart,
      { mahadasha: "Jupiter", antardasha: "Venus" },
      "te",
    );
    expect(reading.title).toContain("సాధారణ జాతక వివరణ");
    expect(reading.sections).toHaveLength(8);
  });
});
