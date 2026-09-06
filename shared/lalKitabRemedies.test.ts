import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildLalKitabRemedyCandidates, getLalKitabRemedyCatalog } from "./lalKitabRemedies";

const chart = calculateChart({
  name: "Remedy engine", date: "1990-05-14", time: "09:30", place: "Hyderabad",
  latitude: 17.385, longitude: 78.4867, timezoneOffset: 5.5, timezone: "Asia/Kolkata",
  language: "en", methodology: "parashari", focus: "general", birthTimeAccuracyMinutes: 5,
});

describe("Lal Kitab remedy candidate engine", () => {
  it("indexes the whole source while keeping OCR candidates unpublished", () => {
    const catalog = getLalKitabRemedyCatalog();
    expect(catalog.source.parsedPages).toBe(778);
    expect(catalog.coverage.candidates).toBeGreaterThan(100);
    expect(catalog.policy.automaticPublicationAllowed).toBe(false);
  });
  it("matches house-specific candidates for all nine placements without exposing instructions", () => {
    const result = buildLalKitabRemedyCandidates(chart);
    expect(result.placements).toHaveLength(9);
    expect(result.publication.reviewedExecutableRules).toBe(0);
    for (const placement of result.placements)
      for (const candidate of placement.candidates) {
        expect(candidate.locator).toMatch(/^book-gosvami-lal-kitab:L\d+-L\d+$/);
        expect(candidate.executionStatus).toBe("withheld-pending-atomic-review");
        expect(candidate).not.toHaveProperty("instruction");
      }
  });
});
