import fixtureArtifact from "./bookRuleFixtures.json";
import { BOOK_RULE_CATALOG } from "./bookRuleCatalog";
import { calculateChart } from "./jyotish";
import { executeRule } from "./ruleDsl";
import { birthInputSchema } from "./schema";

export function listWorkedExampleIds() {
  return fixtureArtifact.fixtures.map((fixture) => fixture.id);
}

export function reconstructWorkedExample(fixtureId: string) {
  const fixture = fixtureArtifact.fixtures.find((item) => item.id === fixtureId);
  if (!fixture) return null;
  const rule = BOOK_RULE_CATALOG.find((item) => item.id === fixture.ruleId);
  if (!rule) throw new Error(`Fixture ${fixtureId} references a missing rule`);
  const input = birthInputSchema.parse(fixture.chart);
  const chart = calculateChart(input);
  const execution = executeRule(chart, rule, fixture.asOfIso);
  const actualExceptionIds = execution.appliedExceptions.map((item) => item.id);
  const matchAgreement = execution.matched === fixture.expectedMatch;
  const exceptionAgreement =
    JSON.stringify(actualExceptionIds) ===
    JSON.stringify(fixture.expectedExceptionIds);
  const locatorAgreement = fixture.sourceLocator === rule.sourceKey;
  return {
    schemaVersion: "sahadeva-worked-example-reconstruction-1",
    fixture: {
      id: fixture.id,
      kind: fixture.kind,
      ruleId: fixture.ruleId,
      sourceLocator: fixture.sourceLocator,
      asOfIso: fixture.asOfIso,
    },
    recalculatedFacts: {
      engineVersion: chart.engine.version,
      lagnaSign: chart.placements.find((item) => item.name === "Lagna")?.sign,
      ruleFacts: execution.facts,
    },
    expected: {
      matched: fixture.expectedMatch,
      exceptionIds: fixture.expectedExceptionIds,
    },
    actual: {
      matched: execution.matched,
      exceptionIds: actualExceptionIds,
      effectiveEffect: execution.effectiveEffect,
    },
    comparison: {
      matchAgreement,
      exceptionAgreement,
      locatorAgreement,
      passed: matchAgreement && exceptionAgreement && locatorAgreement,
    },
    adjudication: {
      status: "local-regression-unreviewed",
      publishableExample: false,
      limitation:
        "This fixture checks deterministic replay. It is not yet an independently recalculated, scan-adjudicated classical worked example with two reviewer approvals.",
    },
    safety: {
      status: "review-tool",
      notice:
        "A passing local fixture validates software consistency only; it does not validate astrology or authorize a user prediction.",
    },
  };
}
