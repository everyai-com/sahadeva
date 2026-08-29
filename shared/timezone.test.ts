import { describe, expect, it } from "vitest";
import { historicalTimezoneOffset, julianDay } from "./jyotish";
import { birthInputSchema } from "./schema";

describe("historical IANA timezone resolution", () => {
  it("applies daylight-saving rules for the entered date", () => {
    expect(historicalTimezoneOffset("2020-01-15", "12:00", "America/New_York")).toBe(-5);
    expect(historicalTimezoneOffset("2020-07-15", "12:00", "America/New_York")).toBe(-4);
    expect(historicalTimezoneOffset("1992-10-08", "14:47", "Asia/Kolkata")).toBe(5.5);
  });
  it("uses IANA rules instead of a stale supplied offset", () => {
    const base = { name:"TZ", date:"2020-07-15", time:"12:00", place:"New York", latitude:40.7, longitude:-74, timezoneOffset:-5, timezone:"America/New_York", language:"en", methodology:"parashari", focus:"general", birthTimeAccuracyMinutes:0 } as const;
    const corrected = julianDay(base);
    expect(corrected).toBe(julianDay({ ...base, timezone:undefined, timezoneOffset:-4 }));
  });
  it("rejects invalid timezone identifiers", () => {
    expect(birthInputSchema.safeParse({ name:"Bad",date:"2020-01-01",time:"12:00",place:"X",latitude:0,longitude:0,timezoneOffset:0,timezone:"Mars/Olympus" }).success).toBe(false);
  });
});
