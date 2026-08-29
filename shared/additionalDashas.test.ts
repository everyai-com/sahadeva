import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import {
  additionalDashaStatus,
  calculateKalachakraDasha,
  calculateYoginiDasha,
  queryVimshottariFiveLevels,
} from "./additionalDashas";
import { calculateRestrictedAyushyaContext } from "./ayushyaInternal";
const chart = calculateChart({
  name: "Test",
  date: "1990-01-01",
  time: "12:00",
  latitude: 17.385,
  longitude: 78.4867,
  timezoneOffset: 5.5,
  timezone: "Asia/Kolkata",
  place: "Hyderabad",
  language: "en",
  methodology: "parashari",
  focus: "general",
  birthTimeAccuracyMinutes: 5,
  houseSystem: "whole-sign",
});
describe("additional dashas and restricted context", () => {
  it("builds a 36-year Yogini sequence with proportional subperiods", () => {
    const result = calculateYoginiDasha(chart, 1, 2);
    expect(result.periods).toHaveLength(8);
    expect(result.periods.reduce((s, p) => s + p.years, 0)).toBe(36);
    expect(result.periods.every((p) => p.subPeriods?.length === 8)).toBe(true);
  });
  it("computes Kalachakra from an explicit Savya/Apasavya pada table", () => {
    const result = calculateKalachakraDasha(chart, 1);
    expect(result.periods).toHaveLength(36);
    expect([83, 85, 86, 100]).toContain(result.birth.paramayush);
    expect(result.notice).toContain("never interpreted as lifespan");
  });
  it("computes Sookshma and Prana boundaries", () => {
    const result = queryVimshottariFiveLevels(
      chart,
      "2026-08-29T00:00:00.000Z",
    );
    expect(result.status).toBe("computed");
    expect(result.levels?.sookshmadasha).toBeTruthy();
    expect(result.levels?.pranadasha).toBeTruthy();
  });
  it("returns explicit Ashtottari, Chara and Narayana conventions", () => {
    const result = additionalDashaStatus(chart);
    expect(result.schemaVersion).toBe("sahadeva-additional-dashas-2");
    expect(result.ashtottari.periods).toHaveLength(16);
    expect(result.chara.periods).toHaveLength(12);
    expect(result.narayana.periods.length).toBeGreaterThanOrEqual(12);
    expect(result.narayana.progression.signs).toHaveLength(12);
  });
  it("never emits lifespan units from restricted Ayushya context", () => {
    const result = calculateRestrictedAyushyaContext(
      chart,
      "internal-research",
    );
    expect(result.publicSerialization.status).toContain("withheld");
    expect(JSON.stringify(result.publicSerialization)).not.toMatch(
      /years|age range|death date/,
    );
  });
});
