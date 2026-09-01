import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { analyzeNatalPanchanga } from "./natalPanchanga";
describe("natal Panchanga", () => {
  it("keeps all five limbs and source review state explicit", () => {
    const result = analyzeNatalPanchanga(
      calculateChart({
        name: "N",
        date: "1990-05-17",
        time: "10:30",
        place: "Hyderabad",
        latitude: 17.385,
        longitude: 78.4867,
        timezone: "Asia/Kolkata",
        timezoneOffset: 5.5,
        language: "en",
        methodology: "parashari",
        focus: "general",
        birthTimeAccuracyMinutes: 5,
      }),
    );
    expect(result.limbs).toHaveLength(5);
    expect(result.limbs.every((limb) => limb.lord)).toBe(true);
    expect(result.schemaVersion).toBe("sahadeva-natal-panchanga-3");
    expect(result.limbs.every((limb) => limb.lifeArea)).toBe(true);
    expect(
      result.limbs.every((limb) => limb.tattvaDevataStudyAssociation),
    ).toBe(true);
    expect(result.paksha.proximity).toMatch(/closer-to-(full|new)-moon/);
    expect(result.paksha.looseStrongInterval).toEqual(expect.any(Boolean));
    expect(result.paksha.moonPakshaBalaVirupas).toBeGreaterThanOrEqual(0);
    expect(["Nanda", "Bhadra", "Jaya", "Rikta", "Purna"]).toContain(
      result.nandadi.class,
    );
    expect(result.tattvaRelationships.conflicts).toHaveLength(4);
    expect(result.tattvaRelationships.supports).toHaveLength(2);
    expect(
      result.boundaries.sankranti.sunDegreesFromNearestSignBoundary,
    ).toBeGreaterThanOrEqual(0);
    expect(result.safety.prohibited).toContain("death or lifespan inference");
    expect(result.interpretation.status).toBe("structural-unreviewed");
    expect(result.interpretation.sourceKeys.every((key) => key.startsWith("book-"))).toBe(true);
    expect(result.interpretation.devataBoundary).toContain("not personalized");
  });
});
