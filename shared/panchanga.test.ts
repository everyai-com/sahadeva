import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import type { BirthInput } from "./schema";

const input: BirthInput = { name: "Event suite", date: "2000-01-01", time: "12:00", place: "Greenwich", latitude: 51.4779, longitude: 0, timezoneOffset: 0, language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 5 };

describe("Panchanga event solver", () => {
  const chart = calculateChart(input);
  const events = chart.panchanga.events;

  it("finds future angular transitions", () => {
    expect(events.nextTithiJulianDay).toBeGreaterThan(chart.engine.julianDay);
    expect(events.nextNakshatraJulianDay).toBeGreaterThan(chart.engine.julianDay);
    expect(events.nextYogaJulianDay).toBeGreaterThan(chart.engine.julianDay);
    expect(events.nextKaranaJulianDay).toBeGreaterThan(chart.engine.julianDay);
  });

  it("orders sunrise before sunset for Greenwich", () => {
    expect(events.sunriseJulianDay).not.toBeNull();
    expect(events.sunsetJulianDay).not.toBeNull();
    expect(events.sunriseJulianDay!).toBeLessThan(events.sunsetJulianDay!);
  });

  it("solves transitions to sub-second numerical precision", () => {
    expect(events.nextTithiJulianDay - chart.engine.julianDay).toBeLessThan(2);
    expect(events.nextKaranaJulianDay - chart.engine.julianDay).toBeLessThan(1.5);
  });
});
