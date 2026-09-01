import { describe, expect, it } from "vitest";
import { BOOK_RULE_CATALOG } from "./bookRuleCatalog";
import fixtureArtifact from "./bookRuleFixtures.json";
import { calculateChart } from "./jyotish";
import { executeRule } from "./ruleDsl";
import { birthInputSchema } from "./schema";

const dates = [
    "2016-02-15",
    "2016-05-15",
    "1988-01-15",
    "1988-04-15",
    "1988-07-15",
    "1994-02-15",
  ],
  times = ["00:15", "02:15", "04:15", "06:15", "08:15", "10:15", "12:15"],
  fixtureInput = (date: string, time: string) => ({
    name: `Fixture ${date} ${time}`,
    date,
    time,
    place: "Hyderabad",
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
    language: "en" as const,
    methodology: "parashari" as const,
    focus: "general" as const,
    birthTimeAccuracyMinutes: 5,
  }),
  candidates = [
    ...dates.flatMap((date) => times.map((time) => fixtureInput(date, time))),
    fixtureInput("1980-01-04", "18:15"),
    fixtureInput("1980-01-10", "06:15"),
  ],
  discoverFixtures =
    (globalThis as unknown as { process?: { env?: Record<string, string> } })
      .process?.env?.DISCOVER_BOOK_RULE_FIXTURES === "1";

describe("book rule regression fixtures", () => {
  it.runIf(!discoverFixtures)(
    "replays one worked example and counterexample for every runtime rule",
    () => {
      const rules = new Map(BOOK_RULE_CATALOG.map((rule) => [rule.id, rule])),
        grouped = new Map<string, typeof fixtureArtifact.fixtures>();
      for (const fixture of fixtureArtifact.fixtures)
        grouped.set(fixture.ruleId, [
          ...(grouped.get(fixture.ruleId) || []),
          fixture,
        ]);
      expect([...grouped.keys()].sort()).toEqual([...rules.keys()].sort());
      const chartCache = new Map<string, ReturnType<typeof calculateChart>>();
      for (const [ruleId, rule] of rules) {
        const fixtures = grouped.get(ruleId) || [];
        expect(fixtures.map((row) => row.kind).sort()).toEqual([
          "counterexample",
          "worked-example",
        ]);
        for (const fixture of fixtures) {
          const cacheKey = JSON.stringify(fixture.chart);
          let chart = chartCache.get(cacheKey);
          if (!chart) {
            chart = calculateChart(birthInputSchema.parse(fixture.chart));
            chartCache.set(cacheKey, chart);
          }
          const result = executeRule(chart, rule, fixture.asOfIso);
          expect(result.matched, fixture.id).toBe(fixture.expectedMatch);
          expect(
            result.appliedExceptions.map((row) => row.id),
            fixture.id,
          ).toEqual(fixture.expectedExceptionIds);
          expect(fixture.sourceLocator).toBe(rule.sourceKey);
        }
      }
    },
    60000,
  );

  it.runIf(discoverFixtures)(
    "discovers and snapshots fixtures only when explicitly requested",
    () => {
      const evaluated = [] as Array<{
        input: (typeof candidates)[number];
        results: Map<string, ReturnType<typeof executeRule>>;
      }>;
      for (const input of candidates) {
        const chart = calculateChart(input);
        evaluated.push({
          input,
          results: new Map(
            BOOK_RULE_CATALOG.map((rule) => [
              rule.id,
              executeRule(chart, rule, "2026-08-30T00:00:00.000Z"),
            ]),
          ),
        });
      }
      const uncovered = new Set(
          BOOK_RULE_CATALOG.flatMap((rule) => [
            `${rule.id}:true`,
            `${rule.id}:false`,
          ]),
        ),
        selected: typeof evaluated = [];
      while (uncovered.size) {
        const best = evaluated
          .filter((row) => !selected.includes(row))
          .map((row) => ({
            row,
            covers: [...row.results].filter(([ruleId, result]) =>
              uncovered.has(`${ruleId}:${result.matched}`),
            ).length,
          }))
          .sort((a, b) => b.covers - a.covers)[0];
        if (!best?.covers) break;
        selected.push(best.row);
        for (const [ruleId, result] of best.row.results)
          uncovered.delete(`${ruleId}:${result.matched}`);
      }
      expect([...uncovered]).toEqual([]);
      const fixtures = BOOK_RULE_CATALOG.flatMap((rule) => {
        const worked = selected.find(
            (row) => row.results.get(rule.id)!.matched,
          )!,
          counter = selected.find((row) => !row.results.get(rule.id)!.matched)!,
          workedResult = worked.results.get(rule.id)!;
        return [
          {
            id: `${rule.id}-worked-1`,
            ruleId: rule.id,
            kind: "worked-example",
            chart: worked.input,
            asOfIso: "2026-08-30T00:00:00.000Z",
            expectedMatch: true,
            expectedExceptionIds: workedResult.appliedExceptions.map(
              (row) => row.id,
            ),
            sourceLocator: rule.sourceKey,
          },
          {
            id: `${rule.id}-counter-1`,
            ruleId: rule.id,
            kind: "counterexample",
            chart: counter.input,
            asOfIso: "2026-08-30T00:00:00.000Z",
            expectedMatch: false,
            expectedExceptionIds: [],
            sourceLocator: rule.sourceKey,
          },
        ];
      });
      expect(
        new Set(fixtures.map((row) => JSON.stringify(row.chart))).size,
      ).toBeLessThanOrEqual(10);
      expect(fixtures).toMatchSnapshot();
    },
    300000,
  );
});
