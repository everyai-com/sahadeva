import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import {
  analyzeVargaDomain,
  buildPlanetaryRelationshipGraph,
  calculateArgala,
  calculateFunctionalLordships,
} from "./practitioner";
const chart = calculateChart({
  name: "P",
  date: "1990-05-17",
  time: "10:30",
  place: "Hyderabad",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
  timezoneOffset: 5.5,
  language: "en",
  methodology: "parashari",
  focus: "career",
  birthTimeAccuracyMinutes: 5,
});
describe("practitioner structures", () => {
  it("returns Lagna-specific ownership without collapsing roles", () => {
    const result = calculateFunctionalLordships(chart);
    expect(result.planets.length).toBe(7);
    expect(
      result.planets.flatMap((p) => p.houses).sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it("builds typed relationship edges and chains", () => {
    const graph = buildPlanetaryRelationshipGraph(chart);
    expect(graph.nodes).toHaveLength(9);
    expect(graph.edges.some((e) => e.kind === "dispositor")).toBe(true);
    expect(graph.edges.some((e) => e.kind.startsWith("bhava-sambandha-"))).toBe(true);
    expect(graph.edges.some((e) => e.kind === "rasi-drishti")).toBe(true);
    expect(graph.sourceModel.grahaSambandha).toEqual([
      "exchange",
      "conjunction",
      "mutual-graha-drishti",
      "mutual-rasi-drishti",
    ]);
    expect(graph.dispositorChains).toHaveLength(9);
    expect(graph.argala.targets).toHaveLength(12);
  });
  it("keeps Argala and its paired obstruction visible", () => {
    const result = calculateArgala(chart);
    expect(result.schemaVersion).toBe("sahadeva-argala-2");
    expect(
      result.targets.every((target) => target.relationships.length === 4),
    ).toBe(true);
    expect(
      result.targets[0].relationships.map((row) => [row.argala, row.virodha]),
    ).toEqual([
      [2, 12],
      [4, 10],
      [11, 3],
      [5, 9],
    ]);
    expect(
      result.targets.flatMap((target) => target.relationships).every((row) =>
        [
          "no-intervention",
          "unobstructed",
          "partially-obstructed",
          "fully-obstructed",
        ].includes(row.status),
      ),
    ).toBe(true);
    expect(
      result.targets
        .flatMap((target) => target.relationships)
        .filter((row) => row.argalaPlanets.length > 0 && row.netCount === 0)
        .every((row) => row.status === "fully-obstructed"),
    ).toBe(true);
    expect(result.convention.nodeException).toContain("no-rule-found");
  });
  it("judges the full D10 domain structure", () => {
    const result = analyzeVargaDomain(chart, "D10", 10, [
      "Sun",
      "Saturn",
      "Mercury",
    ]);
    expect(result.lagna).toBeTruthy();
    expect(result.lord).toBeTruthy();
    expect(result.karakas).toHaveLength(3);
  });
});
