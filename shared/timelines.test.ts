import { describe, expect, it } from "vitest";
import { calculateIngressTimeline, simulateBirthTimeUncertainty } from "./jyotish";
import type { BirthInput } from "./schema";

const input: BirthInput = { name:"Timeline", date:"2020-01-01", time:"00:00", place:"Greenwich", latitude:51.4779, longitude:0, timezoneOffset:0, language:"en", methodology:"parashari", focus:"general", birthTimeAccuracyMinutes:10 };
describe("timelines and uncertainty", () => {
  it("finds ordered ingress events with valid sign transitions", () => {
    const result = calculateIngressTimeline(input, 35);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.every((event) => event.fromSign >= 0 && event.fromSign < 12 && event.toSign >= 0 && event.toSign < 12)).toBe(true);
    expect(result.events.every((event, index) => index === 0 || event.julianDay >= result.events[index - 1].julianDay)).toBe(true);
  });
  it("samples the full declared uncertainty interval", () => {
    const result = simulateBirthTimeUncertainty(input);
    expect(result.samples).toHaveLength(9);
    expect(result.samples[0].offsetMinutes).toBe(-10);
    expect(result.samples[8].offsetMinutes).toBe(10);
    expect(result.stability.lagnaSigns.length).toBeGreaterThan(0);
  });
});
