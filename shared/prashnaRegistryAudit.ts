import type { EvidenceObservation } from "./consultation";
import type { PrashnaRuleDefinition } from "./prashnaRules";

export type PrashnaRegistryAuditIssue = {
  code: "duplicate-family" | "malformed-family" | "empty-field" | "unknown-source" | "unresolved-observation" | "provenance-drift" | "duplicate-observation";
  subject: string;
  detail: string;
};

export function auditPrashnaRegistry(
  rules: readonly PrashnaRuleDefinition[],
  knownSourceIds: ReadonlySet<string>,
  observations: readonly EvidenceObservation[] = [],
) {
  const issues: PrashnaRegistryAuditIssue[] = [];
  const families = new Map<string, number>();
  for (const rule of rules) {
    families.set(rule.family, (families.get(rule.family) ?? 0) + 1);
    if (!/^prashna:[a-z0-9][a-z0-9:-]*-?$/.test(rule.family))
      issues.push({ code: "malformed-family", subject: rule.family, detail: "Rule family must use the stable lowercase prashna namespace." });
    for (const [field, values] of [
      ["sourceIds", rule.sourceIds], ["locators", rule.locators], ["requiredInputs", rule.requiredInputs],
      ["exceptions", rule.exceptions], ["testObligations", rule.testObligations],
    ] as const) if (!values.length || values.some((value) => !value.trim()))
      issues.push({ code: "empty-field", subject: rule.family, detail: `${field} must contain non-empty values.` });
    if (!rule.statement.trim()) issues.push({ code: "empty-field", subject: rule.family, detail: "statement must be non-empty." });
    for (const sourceId of rule.sourceIds) if (!knownSourceIds.has(sourceId))
      issues.push({ code: "unknown-source", subject: rule.family, detail: `Unknown source ID: ${sourceId}.` });
  }
  for (const [family, count] of families) if (count > 1)
    issues.push({ code: "duplicate-family", subject: family, detail: `${count} definitions use the same family.` });

  const resolve = (id: string) => rules.filter((rule) => id === rule.family || id.startsWith(rule.family)).sort((a, b) => b.family.length - a.family.length)[0];
  const observationKeys = new Set<string>();
  for (const observation of observations) {
    const rule = resolve(observation.id);
    if (!rule) {
      issues.push({ code: "unresolved-observation", subject: observation.id, detail: "No executable rule family resolves this observation." });
      continue;
    }
    if (observation.provenance.ruleMaturity !== rule.maturity
      || !observation.provenance.sourceIds.length
      || observation.provenance.sourceIds.some((sourceId) => !rule.sourceIds.includes(sourceId))
      || (observation.provenance.sourceLocators ?? []).join("\0") !== rule.locators.join("\0"))
      issues.push({ code: "provenance-drift", subject: observation.id, detail: "Emitted maturity/locators differ, or source IDs are not a non-empty declared subset of the resolving rule." });
    const key = `${observation.id}\0${observation.facts.join("\0")}`;
    if (observationKeys.has(key)) issues.push({ code: "duplicate-observation", subject: observation.id, detail: "The same rule and facts were emitted more than once." });
    observationKeys.add(key);
  }
  return {
    valid: issues.length === 0,
    issues,
    summary: {
      rules: rules.length,
      sources: knownSourceIds.size,
      observations: observations.length,
      issueCounts: Object.fromEntries([...new Set(issues.map((item) => item.code))].map((code) => [code, issues.filter((item) => item.code === code).length])),
    },
  };
}
