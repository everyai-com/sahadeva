import { describe, expect, it } from "vitest";
import { jplApproximateLongitudes, jplApproximatePositions } from "./jplApprox";

// NASA/JPL Horizons observer ecliptic longitudes for 2000-01-01 00:00 UTC.
// The analytic model is geometric and approximate, so tolerances include light-time
// and the nominal Table 1 fit error. These fixtures detect rotation/sign failures.
const HORIZONS = { Sun: 279.8592049, Mercury: 271.1117994, Venus: 240.9614017, Mars: 327.5754592, Jupiter: 25.2331086, Saturn: 40.4058374 };
const angularError = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

describe("JPL SSD 1800-2050 analytic planets", () => {
  const result = jplApproximateLongitudes(2451544.5);
  it.each(Object.entries(HORIZONS))("keeps %s close to the JPL Horizons fixture", (body, expected) => {
    const tolerance = body === "Jupiter" || body === "Saturn" ? 0.3 : 0.08;
    expect(angularError(result[body as keyof typeof result], expected)).toBeLessThan(tolerance);
  });
  it("retains finite geocentric ecliptic latitude for declination-sensitive calculations",()=>{
    for(const position of Object.values(jplApproximatePositions(2451544.5))){expect(Number.isFinite(position.latitude)).toBe(true);expect(Math.abs(position.latitude)).toBeLessThan(10);}
  });
  const epochs = [
    ["1900-01-01T00:00:00Z", { Sun:280.1532941, Mercury:258.9977026, Venus:306.3743725, Mars:283.8676754, Jupiter:241.1358830, Saturn:267.7167387 }],
    ["1950-01-01T00:00:00Z", { Sun:280.0048301, Mercury:299.4472523, Venus:316.9794775, Mars:182.2111967, Jupiter:306.5053249, Saturn:169.4374218 }],
    ["2020-01-01T00:00:00Z", { Sun:280.0094920, Mercury:274.3833145, Venus:314.4094923, Mars:238.3846079, Jupiter:276.6703386, Saturn:291.3949664 }],
    ["2049-01-01T00:00:00Z", { Sun:280.9928442, Mercury:299.1624787, Venus:328.1935343, Mars:344.0631455, Jupiter:83.9987846, Saturn:287.4991479 }],
  ] as const;
  it.each(epochs)("stays inside declared research tolerance at %s", (instant, expected) => {
    const jd = new Date(instant).getTime() / 86400000 + 2440587.5;
    const actual = jplApproximateLongitudes(jd);
    for (const body of Object.keys(expected) as Array<keyof typeof expected>) {
      const tolerance = body === "Jupiter" || body === "Saturn" ? 1 : body === "Mars" ? 0.2 : 0.1;
      expect(angularError(actual[body], expected[body]), body).toBeLessThan(tolerance);
    }
  });
});
