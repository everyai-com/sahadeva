import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildRetrospectiveTimingOutlook, buildTimingOutlook, formatMonth } from "./chatTimingOutlook";

const input = {
  name: "Outlook fixture",
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

describe("chat timing outlook", () => {
  const chart = calculateChart(input);
  it("scans the horizon and explains every window with factors", () => {
    const outlook = buildTimingOutlook(chart, "career", "2026-09-01T00:00:00.000Z", 3);
    expect(outlook.topicAnatomy.house).toBe(10);
    expect(outlook.topicAnatomy.activators).toContain(outlook.topicAnatomy.lord);
    expect(outlook.dashaSequence.length).toBeGreaterThan(0);
    for (const step of outlook.dashaSequence) expect(step.endIso > step.startIso).toBe(true);
    for (const window of outlook.windows) {
      expect(window.reasons.length).toBeGreaterThan(0);
      expect(window.endIso > window.startIso).toBe(true);
      expect(window.peakScore).toBeGreaterThanOrEqual(38);
    }
    expect(outlook.windows.length).toBeLessThanOrEqual(4);
    expect(outlook.headline).toContain("career");
    expect(outlook.now.band).toMatch(/strong|moderate|quiet/);
    expect([12, 1, 2].includes(outlook.sadeSati.saturnHouseFromMoon)).toBe(outlook.sadeSati.active);
  });
  it("orders windows chronologically and keeps health and general topics available", () => {
    for (const topic of ["health", "general", "marriage"] as const) {
      const outlook = buildTimingOutlook(chart, topic, "2026-09-01T00:00:00.000Z", 2);
      const starts = outlook.windows.map((w) => w.startIso);
      expect([...starts].sort()).toEqual(starts);
      expect(outlook.natalPromise === null).toBe(topic === "health" || topic === "general");
    }
  });
  it("formats months in UTC", () => {
    expect(formatMonth("2027-03-15T00:00:00.000Z")).toBe("Mar 2027");
  });
  it("uses one primary-house convention throughout education timing", () => {
    const outlook = buildTimingOutlook(chart, "education", "2026-09-01T00:00:00.000Z", 2);
    expect(outlook.topicAnatomy.house).toBe(4);
    expect(outlook.natalPromise?.supporting.join(" ")).toMatch(/house 4|D24/);
  });
  it("calculates bounded retrospective relationship periods with their Dashas", () => {
    const past = buildRetrospectiveTimingOutlook(
      chart,
      "marriage",
      "2018-01-01T00:00:00.000Z",
      "2025-12-31T23:59:59.000Z",
    );
    expect(past.range.label).toBe("Jan 2018 – Dec 2025");
    expect(past.dashaSequence.length).toBeGreaterThan(0);
    expect(past.windows.length).toBeLessThanOrEqual(4);
    for (const window of past.windows) {
      expect(window.periods.length).toBeGreaterThan(0);
      expect(window.reasons.length).toBeGreaterThan(0);
      expect(window.startIso >= past.range.startIso).toBe(true);
      expect(window.endIso <= "2026-02-01T00:00:00.000Z").toBe(true);
    }
  });
  it("supports retrospective timing across every consultation area", () => {
    for (const topic of ["career", "education", "marriage", "property", "spirituality", "wealth", "health", "children", "general"] as const) {
      const past = buildRetrospectiveTimingOutlook(
        chart,
        topic,
        "2020-01-01T00:00:00.000Z",
        "2025-12-31T23:59:59.000Z",
      );
      expect(past.topic).toBe(topic);
      expect(past.dashaSequence.length).toBeGreaterThan(0);
      expect(past.notice).toContain("not proof");
    }
  });
});
