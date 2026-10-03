import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { chartForWindow } from "./muhurta";
import { birthInputSchema } from "./schema";

const base = { name: "Day", place: "Hyderabad", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata", timezoneOffset: 5.5, language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 0 } as const;

describe("muhurta window chart", () => {
  it("re-casts the lagna for the window's own time", () => {
    const noon = calculateChart(birthInputSchema.parse({ ...base, date: "2026-10-20", time: "12:00" }));
    const at1530 = calculateChart(birthInputSchema.parse({ ...base, date: "2026-10-20", time: "15:30" }));
    const jd = at1530.engine.julianDay;
    const recast = chartForWindow(noon, { startJulianDay: jd - 0.01, endJulianDay: jd + 0.01 }, base.latitude, base.longitude);
    const lagna = (c: typeof noon) => c.placements.find((p) => p.name === "Lagna")!;
    expect(lagna(recast).sign).toBe(lagna(at1530).sign);
    expect(Math.abs(lagna(recast).longitude - lagna(at1530).longitude)).toBeLessThan(0.05);
    expect(lagna(recast).sign).not.toBe(lagna(noon).sign);
  });
});
