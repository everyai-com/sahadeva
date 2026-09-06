import { describe, expect, it } from "vitest";
import { buildPrashnaConsultation, prashnaRequestSchema } from "./prashna";
import { PRASHNA_SOURCES } from "./prashnaRulebook";
import { PRASHNA_RULES, type PrashnaRuleDefinition } from "./prashnaRules";
import { auditPrashnaRegistry } from "./prashnaRegistryAudit";

const sourceIds = new Set(Object.values(PRASHNA_SOURCES).map((source) => source.id));
const baseRule = structuredClone(PRASHNA_RULES[0]) as PrashnaRuleDefinition;
const request = prashnaRequestSchema.parse({
  question: "Will this matter move forward?", category: "career", tradition: "classical",
  place: "Hyderabad", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata", language: "en",
});

describe("Prashna rule registry audit", () => {
  it("passes the installed registry and a broad emitted-observation matrix", () => {
    const consultations = (["career", "relationship", "money", "property", "travel", "lost-object", "health", "education", "litigation", "children", "missing-person", "general"] as const)
      .flatMap((category) => (["classical", "tajaka", "systems-approach"] as const).flatMap((tradition) =>
        [buildPrashnaConsultation({ ...request, category, tradition }, new Date("2026-08-29T12:34:56.000Z")).observations]));
    const registry = auditPrashnaRegistry(PRASHNA_RULES, sourceIds);
    expect(registry.issues).toEqual([]);
    expect(registry.summary.rules).toBe(PRASHNA_RULES.length);
    expect(consultations.flat().length).toBeGreaterThan(50);
    for (const observations of consultations) expect(auditPrashnaRegistry(PRASHNA_RULES, sourceIds, observations).issues).toEqual([]);
  }, 30_000);

  it.each([
    ["duplicate-family", [{ ...baseRule }, { ...baseRule }], sourceIds],
    ["malformed-family", [{ ...baseRule, family: "Prashna Bad ID" }], sourceIds],
    ["empty-field", [{ ...baseRule, exceptions: [] }], sourceIds],
    ["unknown-source", [{ ...baseRule, sourceIds: ["book-not-installed"] }], sourceIds],
  ] as const)("detects %s registry mutations", (code, rules, sources) => {
    expect(auditPrashnaRegistry(rules as unknown as readonly PrashnaRuleDefinition[], sources).issues.some((issue) => issue.code === code)).toBe(true);
  });

  it("detects unresolved observations, provenance drift, and duplicate evidence", () => {
    const observation = buildPrashnaConsultation(request, new Date("2026-08-29T12:34:56.000Z")).observations[0];
    expect(auditPrashnaRegistry(PRASHNA_RULES, sourceIds, [{ ...observation, id: "prashna:does-not-exist" }]).issues[0]?.code).toBe("unresolved-observation");
    expect(auditPrashnaRegistry(PRASHNA_RULES, sourceIds, [{ ...observation, provenance: { ...observation.provenance, sourceIds: ["book-not-declared-by-rule"] } }]).issues.some((issue) => issue.code === "provenance-drift")).toBe(true);
    expect(auditPrashnaRegistry(PRASHNA_RULES, sourceIds, [observation, observation]).issues.some((issue) => issue.code === "duplicate-observation")).toBe(true);
  });
});
