import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { BOOK_RULE_CATALOG, BOOK_RULE_CATALOG_META } from "./bookRuleCatalog";
import { executeRule, executableRuleSchema, resolveRuleFact } from "./ruleDsl";
const inputs = [
  {
    name: "A",
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
  },
  {
    name: "B",
    date: "2000-01-28",
    time: "08:05",
    place: "Ravulapalem",
    latitude: 16.7607,
    longitude: 81.833,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
    language: "en",
    methodology: "parashari",
    focus: "general",
    birthTimeAccuracyMinutes: 5,
  },
] as const;
describe("source-located Bhava and Yoga rule catalog", () => {
  it("contains versioned, valid, non-publishable source-located rules", () => {
    expect(BOOK_RULE_CATALOG_META.ruleCount).toBe(43);
    for (const rule of BOOK_RULE_CATALOG) {
      expect(executableRuleSchema.parse(rule)).toEqual(rule);
      expect(rule.sourceKey).toMatch(/^book-.+:L\d+/);
      expect(rule.reviewStatus).toBe("draft");
    }
  });
  it("executes each rule against worked charts and retains both matches and counterexamples", () => {
    const results = inputs.flatMap((input) => {
      const chart = calculateChart(input);
      return BOOK_RULE_CATALOG.map((rule) =>
        executeRule(chart, rule, "2026-08-30T00:00:00.000Z"),
      );
    });
    expect(results.some((row) => row.matched)).toBe(true);
    expect(results.some((row) => !row.matched)).toBe(true);
    expect(
      results
        .filter((row) => row.matched)
        .every((row) => row.publishable === false),
    ).toBe(true);
  });
  it("resolves dynamic house-lord, Avastha and Yoga association facts", () => {
    const chart = calculateChart(inputs[0]);
    for (const kind of [
      "house-lord-house",
      "house-lord-dignity",
      "house-lord-combust",
      "house-lord-strength-ratio",
      "house-lord-benefic-influence-count",
      "house-lord-malefic-influence-count",
    ] as const)
      expect(
        resolveRuleFact(chart, { kind, house: 10 }, "2026-08-30T00:00:00.000Z"),
      ).not.toBeUndefined();
    expect(
      resolveRuleFact(
        chart,
        { kind: "kendra-trikona-lord-association-count" },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toEqual(expect.any(Number));
    expect(
      resolveRuleFact(
        chart,
        { kind: "natal-panchanga-akasha-resolution-count" },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toEqual(expect.any(Number));
    expect(
      resolveRuleFact(
        chart,
        { kind: "argala-status-count", status: "fully-obstructed" },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toEqual(expect.any(Number));
    expect(
      resolveRuleFact(
        chart,
        { kind: "varga-planet-dignity", varga: "D9", planet: "Mercury" },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toMatch(/own|exalted|debilitated|neutral/);
    expect(
      resolveRuleFact(
        chart,
        { kind: "graha-conjunction", first: "Jupiter", second: "Rahu" },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toEqual(expect.any(Boolean));
    expect(
      resolveRuleFact(
        chart,
        {
          kind: "avastha-state-count",
          system: "lajjitadi",
          states: ["lajjita"],
        },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toEqual(expect.any(Number));
    expect(
      resolveRuleFact(
        chart,
        { kind: "house-lord-sambandha-count", firstHouse: 6, secondHouse: 9 },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toEqual(expect.any(Number));
  });
});
