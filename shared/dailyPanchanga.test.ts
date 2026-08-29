import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildDailyPanchanga } from "./dailyPanchanga";
const input = {
  name: "Day",
  date: "2026-08-29",
  time: "12:00",
  place: "Ravulapalem",
  latitude: 16.7607,
  longitude: 81.833,
  timezoneOffset: 5.5,
  timezone: "Asia/Kolkata",
  language: "en",
  methodology: "parashari",
  focus: "general",
  birthTimeAccuracyMinutes: 0,
} as const;
describe("daily panchanga", () => {
  it("builds complete day/night windows without overlaps in counts", () => {
    const result = buildDailyPanchanga(
      calculateChart(input),
      calculateChart({ ...input, date: "2026-08-30" }),
    );
    expect(result.status).toBe("computed");
    expect(result.choghadiya?.day).toHaveLength(8);
    expect(result.choghadiya?.night).toHaveLength(8);
    expect(result.hora).toHaveLength(24);
    expect(result.solar?.dayLengthHours).toBeGreaterThan(0);
    expect(result.solar?.moonrise.status).toMatch(/computed|no-event/);
    expect(result.solar?.moonset.status).toMatch(/computed|no-event/);
  });
});
