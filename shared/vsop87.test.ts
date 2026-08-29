import { describe, expect, it } from "vitest";
import {
  VSOP87_MODEL,
  vsop87ApparentLongitudes,
  vsop87ApparentPositions,
} from "./vsop87";

const angularErrorArcsec = (actual: number, expected: number) =>
  Math.abs(((actual - expected + 540) % 360) - 180) * 3600;
const fixtures = [
  [
    "1900-01-01T00:00:00Z",
    {
      Sun: 280.1532941,
      Mercury: 258.9977026,
      Venus: 306.3743725,
      Mars: 283.8676754,
      Jupiter: 241.135883,
      Saturn: 267.7167387,
    },
  ],
  [
    "1950-01-01T00:00:00Z",
    {
      Sun: 280.0048301,
      Mercury: 299.4472523,
      Venus: 316.9794775,
      Mars: 182.2111967,
      Jupiter: 306.5053249,
      Saturn: 169.4374218,
    },
  ],
  [
    "2000-01-01T00:00:00Z",
    {
      Sun: 279.8592049,
      Mercury: 271.1117994,
      Venus: 240.9614017,
      Mars: 327.5754592,
      Jupiter: 25.2331086,
      Saturn: 40.4058374,
    },
  ],
  [
    "2020-01-01T00:00:00Z",
    {
      Sun: 280.009492,
      Mercury: 274.3833145,
      Venus: 314.4094923,
      Mars: 238.3846079,
      Jupiter: 276.6703386,
      Saturn: 291.3949664,
    },
  ],
  [
    "2049-01-01T00:00:00Z",
    {
      Sun: 280.9928442,
      Mercury: 299.1624787,
      Venus: 328.1935343,
      Mars: 344.0631455,
      Jupiter: 83.9987846,
      Saturn: 287.4991479,
    },
  ],
] as const;

describe("full VSOP87D planetary model", () => {
  it.each(fixtures)(
    "matches NASA/JPL Horizons observer longitude at %s within five arcseconds",
    (instant, expected) => {
      const jd = new Date(instant).getTime() / 86400000 + 2440587.5,
        actual = vsop87ApparentLongitudes(jd);
      for (const body of Object.keys(expected) as Array<keyof typeof expected>)
        expect(
          angularErrorArcsec(actual[body], expected[body]),
          body,
        ).toBeLessThan(5);
    },
  );
  it("retains finite apparent latitude and versioned provenance", () => {
    for (const value of Object.values(vsop87ApparentPositions(2451544.5))) {
      expect(Number.isFinite(value.latitude)).toBe(true);
      expect(Math.abs(value.latitude)).toBeLessThan(10);
    }
    expect(VSOP87_MODEL.coefficientThreshold).toBe(0);
  });
});
