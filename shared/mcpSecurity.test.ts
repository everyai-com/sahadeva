import { describe, expect, it } from "vitest";
import { crossTraditionRemedySummary, MCP_SECURITY_CONTRACT, safeProfileProjection } from "./mcpSecurity";

describe("MCP security and cross-tradition remedy contract", () => {
  it("does not project raw birth secrets into a reusable profile", () => {
    const projected = safeProfileProjection({ name: "A", place: "B", question: "C" });
    expect(projected).not.toHaveProperty("date");
    expect(projected.privateFieldsExcluded).toContain("coordinates");
  });
  it("never invents unavailable tradition remedies", () => {
    const result = crossTraditionRemedySummary(["parashari", "lal-kitab"], { eligiblePractices: [] });
    expect(result.traditions[1].protocol).toBeNull();
    expect(result.traditions[1].status).toContain("withheld");
    expect(MCP_SECURITY_CONTRACT.architecture).toContain("zero-source-export");
  });
});
