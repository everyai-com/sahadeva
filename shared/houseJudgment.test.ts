import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { analyzeAllHouses, analyzeHouse } from "./houseJudgment";
const chart = calculateChart({
  name: "H",
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
});
describe("house judgment", () => {
  it("covers all houses with lord, support and source-located executable rules", () => {
    const result = analyzeAllHouses(chart);
    expect(result.houses).toHaveLength(12);
    expect(
      result.houses.every(
        (h) =>
          h.lord &&
          h.sourceCoverage.sourceKeys.length &&
          h.ruleEvaluations.length >= 2,
      ),
    ).toBe(true);
    expect(result.houses.find((h) => h.house === 9)?.ruleEvaluations).toHaveLength(4);
    expect(
      result.houses
        .flatMap((h) => h.ruleEvaluations)
        .every((row) => row.sourceKey.startsWith("book-") && !row.publishable),
    ).toBe(true);
  });
  it("restricts high-impact inference for sensitive houses", () => {
    expect(analyzeHouse(chart, 8).safety.restricted).toBe(true);
    expect(analyzeHouse(chart, 8).safety.prohibitedConclusions).toContain(
      "death or lifespan",
    );
    expect(analyzeHouse(chart, 10).safety.restricted).toBe(false);
  });
});
