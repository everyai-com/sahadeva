import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { getLalKitabSourceCatalog, inspectLalKitabStructure } from "./lalKitab";

const chart = calculateChart({
  name: "Lal Kitab structure",
  date: "2000-01-28",
  time: "08:05",
  place: "Ravulapalem, Andhra Pradesh, India",
  latitude: 16.1026,
  longitude: 81.7634,
  timezone: "Asia/Kolkata",
  timezoneOffset: 5.5,
  language: "en",
  methodology: "parashari",
  focus: "general",
  birthTimeAccuracyMinutes: 5,
});

describe("Lal Kitab structural source inspection", () => {
  it("exposes complete source-family coverage without source body text", () => {
    const catalog = getLalKitabSourceCatalog();
    expect(catalog.families).toHaveLength(23);
    expect(catalog.coverage.planetHouseSections).toBe(108);
    expect(catalog.policy.retentionPolicy).toContain("Preserve");
    expect(catalog).not.toHaveProperty("body");
  });
  it("locates all nine planet-house sections without publishing predictions", () => {
    const result = inspectLalKitabStructure(chart);
    expect(result.placements).toHaveLength(9);
    expect(result.placements.every((item) => item.source.locator.startsWith("book-gosvami-lal-kitab:"))).toBe(true);
    expect(result.placements.every((item) => item.interpretation.status === "withheld-source-only")).toBe(true);
    expect(result.tradition.mixingAllowed).toBe(false);
    expect(result.sourceCoverage.reviewedExecutableRules).toBe(0);
    expect(result.controlledDisclosurePolicy.retention).toContain(
      "All source claims are retained",
    );
    expect(result.blockedOutputs).toContain("animal harm");
  });
});
