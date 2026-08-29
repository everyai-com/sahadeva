import { describe, expect, it } from "vitest";
import { buildPrashnaConsultation, prashnaRequestSchema } from "./prashna";

const request = prashnaRequestSchema.parse({
  question: "Will this role move forward?",
  category: "career",
  place: "Hyderabad",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
  language: "en",
});
describe("Prashna consultation", () => {
  it("uses server receipt time and produces only auditable structural judgment", () => {
    const result = buildPrashnaConsultation(
      request,
      new Date("2026-08-29T12:34:56.000Z"),
    );
    expect(result.question.askedAt).toBe("2026-08-29T12:34:56.000Z");
    expect(result.methodSelection.method).toBe("prashna");
    expect(result.judgment.tier).toBe("structural-convention");
    expect(
      result.observations.every(
        (item) =>
          item.provenance.ruleId &&
          item.provenance.reviewStatus === "structural-unreviewed",
      ),
    ).toBe(true);
    expect(result.feedback.endpoint).toBe("/api/prashna/outcome");
    expect(result.feedback.confirmationToken).not.toBe(result.consultationId);
    expect(result.safety.prohibitedInferences).toContain("guaranteed event");
  });
  it("offers only optional low-risk structural remedies and can enforce publishable-only mode", () => {
    const result = buildPrashnaConsultation(
      request,
      new Date("2026-08-29T12:34:56.000Z"),
    );
    expect(result.remedies.length).toBeGreaterThan(0);
    expect(
      result.remedies.every(
        (item) =>
          item.optional &&
          item.timing &&
          item.reviewStatus === "structural-unreviewed",
      ),
    ).toBe(true);
    expect(
      buildPrashnaConsultation(request, new Date("2026-08-29T12:34:56.000Z"), {
        allowStructuralRemedies: false,
      }).remedies,
    ).toEqual([]);
  });
});
