import { describe, expect, it } from "vitest";
import { prashnaChart, prashnaRequestSchema } from "./prashna";
import { PRASNA_TANTRA_SOURCE_CONFLICTS, tajakaKamboola, tajakaRelation } from "./tajaka";
import type { Placement } from "./schema";
import { installedPrasnaTantraConformanceReport, PRASNA_TANTRA_CONFORMANCE_FIXTURE } from "./prashnaConformance";

type RamanExample = {
  id: number;
  title: string;
  receivedAt: string;
  place: string;
  latitude: number;
  longitude: number;
  expectedLagna: number;
  category: "money" | "health" | "children" | "missing-person" | "relationship" | "litigation" | "lost-object" | "travel" | "career";
};

/**
 * B. V. Raman, Sri Neelakanta's Prasna Tantra, "Some Examples".
 * Longitudes are decimalized from the printed chart. These fixtures certify
 * chart reconstruction first; rule-by-rule verdict reproduction is tracked
 * separately because the source examples mix natal-style and Tajaka testimony.
 */
const RAMAN_EXAMPLES: RamanExample[] = [
  { id: 1, title: "Any likelihood of becoming rich?", receivedAt: "1950-10-20T15:30:00.000Z", place: "Bangalore", latitude: 12.9716, longitude: 77.5946, expectedLagna: 55 + 32 / 60, category: "money" },
  { id: 2, title: "Mother's longevity", receivedAt: "1950-03-01T14:30:00.000Z", place: "Bangalore", latitude: 12.9716, longitude: 77.5946, expectedLagna: 150 + 12 + 8 / 60, category: "health" },
  { id: 3, title: "Getting a child", receivedAt: "1947-09-09T06:55:00.000Z", place: "Bangalore", latitude: 12.9716, longitude: 77.5946, expectedLagna: 210 + 22 + 52 / 60, category: "children" },
  { id: 4, title: "Is the absent person alive or dead?", receivedAt: "1942-07-01T14:45:00.000Z", place: "Bombay", latitude: 19.076, longitude: 72.8777, expectedLagna: 270 + 9 + 13 / 60, category: "missing-person" },
  { id: 5, title: "Illness", receivedAt: "1964-05-27T00:50:00.000Z", place: "New Delhi", latitude: 28.6139, longitude: 77.209, expectedLagna: 30 + 19 + 19 / 60, category: "health" },
  { id: 6, title: "Marriage", receivedAt: "1962-11-06T03:50:00.000Z", place: "Bangalore", latitude: 12.9716, longitude: 77.5946, expectedLagna: 240 + 8, category: "relationship" },
  { id: 7, title: "End of a strike", receivedAt: "1968-09-02T08:40:00.000Z", place: "Madras", latitude: 13.0827, longitude: 80.2707, expectedLagna: 240 + 14, category: "litigation" },
  { id: 8, title: "Recovery of stolen property", receivedAt: "1942-03-14T02:45:00.000Z", place: "Bangalore", latitude: 13, longitude: 77 + 35 / 60 + 20 / 3600, expectedLagna: 2 + 21 / 60, category: "lost-object" },
  { id: 9, title: "Outcome of a lawsuit", receivedAt: "1963-12-01T04:45:00.000Z", place: "Bangalore", latitude: 12.9716, longitude: 77.5946, expectedLagna: 270 + 19 + 36 / 60, category: "litigation" },
  { id: 10, title: "Foreign travel", receivedAt: "1957-03-01T04:55:00.000Z", place: "Bangalore", latitude: 12.9716, longitude: 77.5946, expectedLagna: 24 + 40 / 60, category: "travel" },
  { id: 11, title: "Leaving the present job", receivedAt: "1968-12-10T04:55:00.000Z", place: "Bangalore", latitude: 12.9716, longitude: 77.5946, expectedLagna: 270 + 21 + 51 / 60, category: "career" },
  { id: 12, title: "Profession", receivedAt: "1949-05-05T08:30:00.000Z", place: "Bangalore", latitude: 12.9716, longitude: 77.5946, expectedLagna: 120 + 16 + 40 / 60, category: "career" },
];

const angularError = (actual: number, expected: number) => {
  const raw = Math.abs(actual - expected) % 360;
  return Math.min(raw, 360 - raw);
};

const printedPlacement = (name: Placement["name"], sign: number, degree: number, minute: number): Placement => ({
  name,
  sign,
  degree: degree + minute / 60,
  longitude: sign * 30 + degree + minute / 60,
  nakshatra: "printed fixture",
  pada: 1,
});

describe("Raman Prasna Tantra worked-chart reconstruction", () => {
  it("locks the twelve-example conformance ledger to the installed source hash without using outcomes", () => {
    const report = installedPrasnaTantraConformanceReport();
    expect(PRASNA_TANTRA_CONFORMANCE_FIXTURE.records).toHaveLength(12);
    expect(report.sourceMarkdownSha256).toBe("e3f405bf218550635593937879ad87463f9044c31e9340cd9a634115298b1c1e");
    expect(report.summary).toMatchObject({
      cases: 12, exactInputCases: 0, signOnlyInputCases: 12,
      checks: 21, passedChecks: 17, failedChecks: 4, fullyConformantCases: 0,
    });
    expect(report.outcomeUse).toBe("prohibited");
  });
  for (const example of RAMAN_EXAMPLES) {
    it(`reconstructs the printed ascendant sign for example ${example.id}: ${example.title}`, () => {
      const request = prashnaRequestSchema.parse({
        question: example.title,
        category: example.category,
        tradition: "tajaka",
        place: example.place,
        latitude: example.latitude,
        longitude: example.longitude,
        timezone: "Asia/Kolkata",
        language: "en",
      });
      const chart = prashnaChart(request, new Date(example.receivedAt));
      const lagna = chart.placements.find((item) => item.name === "Lagna")!;
      const error = angularError(lagna.longitude, example.expectedLagna);
      expect(lagna.sign, `actual ${lagna.longitude.toFixed(4)}°, printed ${example.expectedLagna.toFixed(4)}°, error ${error.toFixed(4)}°`)
        .toBe(Math.floor(example.expectedLagna / 30));
      // This intentionally does not certify the printed degree. The twelve
      // current errors span roughly 1.3°–11.8° and require edition-specific
      // ayanamsa plus historical time/location-convention reconciliation.
      expect(error).toBeLessThan(12);
    });
  }

  it("reproduces the core Ithasala and Kamboola geometry in worked example VI (marriage)", () => {
    // South-Indian fixed-sign chart printed after “VI. Marriage”: Sagittarius
    // Lagna; Jupiter and Moon in Aquarius; Mercury and Sun in Libra.
    const current = [
      printedPlacement("Jupiter", 10, 11, 11),
      printedPlacement("Mercury", 6, 9, 50),
      printedPlacement("Moon", 10, 2, 20),
    ];
    // Short forward-step fixture using only the direction needed to verify the
    // source's explicitly stated applications; it is not an ephemeris claim.
    const future = [
      printedPlacement("Jupiter", 10, 11, 12),
      printedPlacement("Mercury", 6, 10, 48),
      printedPlacement("Moon", 10, 7, 0),
    ];
    expect(tajakaRelation(current, future, "Jupiter", "Mercury")).toMatchObject({
      aspect: "trine", direction: "9th", nature: "friendly", motion: "applying", withinDeepthamsa: true,
    });
    expect(tajakaRelation(current, future, "Moon", "Jupiter")).toMatchObject({
      aspect: "conjunction", motion: "applying", withinDeepthamsa: true,
    });
    expect(tajakaKamboola(current, future, "Jupiter", "Mercury", [
      { name: "Jupiter", dignity: "neutral" },
      { name: "Mercury", dignity: "neutral" },
      { name: "Moon", dignity: "neutral" },
    ])).toMatchObject({
      first: "Jupiter", second: "Mercury", moonRelationWith: "Jupiter", grade: "unresolved",
    });
  });

  it("reproduces worked example III's two favourable Ithasala links", () => {
    const current = [
      printedPlacement("Mars", 2, 25, 12),
      printedPlacement("Jupiter", 7, 0, 16),
      printedPlacement("Mercury", 4, 26, 5),
    ];
    const future = [
      printedPlacement("Mars", 2, 25, 13.2),
      printedPlacement("Jupiter", 7, 0, 16.18),
      printedPlacement("Mercury", 4, 26, 8.6),
    ];
    expect(tajakaRelation(current, future, "Mars", "Jupiter")).toMatchObject({ aspect: "trine", motion: "applying", withinDeepthamsa: true });
    expect(tajakaRelation(current, future, "Jupiter", "Mercury")).toMatchObject({ aspect: "sextile", motion: "applying", withinDeepthamsa: true });
  });

  it("reproduces worked example II's querent–mother applying conjunction", () => {
    const current = [printedPlacement("Mercury", 9, 28, 20), printedPlacement("Jupiter", 9, 28, 43)];
    const future = [printedPlacement("Mercury", 9, 28, 23.6), printedPlacement("Jupiter", 9, 28, 43.18)];
    expect(tajakaRelation(current, future, "Mercury", "Jupiter")).toMatchObject({
      aspect: "conjunction", completeness: "poorna", motion: "applying", withinDeepthamsa: true,
    });
  });

  it("reproduces worked example IV's Venus–Mars return Ithasala", () => {
    const current = [printedPlacement("Venus", 1, 12, 55), printedPlacement("Mars", 3, 19, 12)];
    const future = [printedPlacement("Venus", 1, 12, 58), printedPlacement("Mars", 3, 19, 13.2)];
    expect(tajakaRelation(current, future, "Venus", "Mars")).toMatchObject({
      aspect: "sextile", nature: "friendly", motion: "applying", withinDeepthamsa: true,
    });
  });

  it("reproduces worked example VIII's recovery and timing aspect geometry", () => {
    const current = [
      printedPlacement("Moon", 9, 25, 46),
      printedPlacement("Venus", 9, 20, 0),
      printedPlacement("Jupiter", 1, 21, 56),
      printedPlacement("Saturn", 1, 2, 14),
    ];
    const future = [
      printedPlacement("Moon", 9, 26, 19),
      printedPlacement("Venus", 9, 20, 3),
      printedPlacement("Jupiter", 1, 21, 56.18),
      printedPlacement("Saturn", 1, 2, 14.06),
    ];
    expect(tajakaRelation(current, future, "Venus", "Jupiter")).toMatchObject({ aspect: "trine", motion: "applying", withinDeepthamsa: true });
    expect(tajakaRelation(current, future, "Moon", "Saturn")).toMatchObject({ aspect: "square", motion: "applying", withinDeepthamsa: true });
  });

  it("reproduces the central applying/separating distinctions in examples V, VII and IX", () => {
    const illnessCurrent = [
      printedPlacement("Venus", 2, 14, 51), printedPlacement("Jupiter", 0, 18, 40), printedPlacement("Saturn", 10, 12, 50),
    ];
    const illnessFuture = [
      printedPlacement("Venus", 2, 14, 54), printedPlacement("Jupiter", 0, 18, 40.18), printedPlacement("Saturn", 10, 12, 50.06),
    ];
    expect(tajakaRelation(illnessCurrent, illnessFuture, "Jupiter", "Venus")).toMatchObject({ aspect: "sextile", motion: "applying", withinDeepthamsa: true });
    expect(tajakaRelation(illnessCurrent, illnessFuture, "Venus", "Saturn")).toMatchObject({ aspect: "trine", motion: "separating", withinDeepthamsa: true });

    const strikeCurrent = [
      printedPlacement("Moon", 8, 19, 25), printedPlacement("Jupiter", 4, 22, 57), printedPlacement("Sun", 4, 17, 58),
    ];
    const strikeFuture = [
      printedPlacement("Moon", 8, 19, 58), printedPlacement("Jupiter", 4, 22, 57.18), printedPlacement("Sun", 4, 18, 0.4),
    ];
    expect(tajakaRelation(strikeCurrent, strikeFuture, "Moon", "Jupiter")).toMatchObject({ aspect: "trine", motion: "applying", withinDeepthamsa: true });
    expect(tajakaRelation(strikeCurrent, strikeFuture, "Moon", "Sun")).toMatchObject({ aspect: "trine", motion: "separating", withinDeepthamsa: true });

    const lawsuitCurrent = [printedPlacement("Saturn", 9, 25, 53), printedPlacement("Moon", 1, 19, 12)];
    const lawsuitFuture = [printedPlacement("Saturn", 9, 25, 53.06), printedPlacement("Moon", 1, 19, 45)];
    expect(tajakaRelation(lawsuitCurrent, lawsuitFuture, "Saturn", "Moon")).toMatchObject({ aspect: "trine", motion: "applying", withinDeepthamsa: true });
  });

  it("reproduces example XI's strongest job-change links while leaving the wider claim separate", () => {
    const current = [
      printedPlacement("Saturn", 11, 26, 50),
      printedPlacement("Mars", 5, 26, 33),
      printedPlacement("Venus", 9, 8, 20),
      printedPlacement("Jupiter", 5, 11, 29),
    ];
    const future = [
      printedPlacement("Saturn", 11, 26, 49.7), // printed retrograde Saturn
      printedPlacement("Mars", 5, 26, 34.2),
      printedPlacement("Venus", 9, 8, 23),
      printedPlacement("Jupiter", 5, 11, 29.18),
    ];
    expect(tajakaRelation(current, future, "Saturn", "Mars")).toMatchObject({ aspect: "opposition", completeness: "poorna", motion: "applying" });
    expect(tajakaRelation(current, future, "Venus", "Jupiter")).toMatchObject({ aspect: "trine", motion: "applying", withinDeepthamsa: true });
  });

  it("reproduces example X's absence of a direct ascendant-lord/ninth-lord aspect", () => {
    const current = [printedPlacement("Mars", 0, 27, 45), printedPlacement("Jupiter", 7, 7, 9)];
    const future = [printedPlacement("Mars", 0, 27, 46.2), printedPlacement("Jupiter", 7, 7, 9.18)];
    expect(tajakaRelation(current, future, "Mars", "Jupiter")).toMatchObject({ withinDeepthamsa: false });
  });

  it("preserves examples I and XII as printed-motion conflicts instead of forcing Ithasala", () => {
    const wealthCurrent = [
      printedPlacement("Mars", 7, 25, 31),
      printedPlacement("Mercury", 5, 26, 57),
      printedPlacement("Venus", 5, 28, 45),
    ];
    const wealthFuture = [
      printedPlacement("Mars", 7, 25, 32.2),
      printedPlacement("Mercury", 5, 27, 0.6),
      printedPlacement("Venus", 5, 28, 48),
    ];
    expect(tajakaRelation(wealthCurrent, wealthFuture, "Venus", "Mercury")).toMatchObject({ motion: "applying", withinDeepthamsa: true });
    expect(tajakaRelation(wealthCurrent, wealthFuture, "Mars", "Venus")).toMatchObject({ motion: "separating", withinDeepthamsa: true });
    expect(tajakaRelation(wealthCurrent, wealthFuture, "Mars", "Mercury")).toMatchObject({ motion: "separating", withinDeepthamsa: true });

    const professionCurrent = [printedPlacement("Sun", 0, 22, 50), printedPlacement("Venus", 0, 27, 36)];
    const professionFuture = [printedPlacement("Sun", 0, 22, 52.4), printedPlacement("Venus", 0, 27, 39)];
    expect(tajakaRelation(professionCurrent, professionFuture, "Sun", "Venus")).toMatchObject({
      aspect: "conjunction", motion: "separating", withinDeepthamsa: true,
    });
    expect(PRASNA_TANTRA_SOURCE_CONFLICTS.map((item) => item.id)).toEqual([
      "example-i-mars-ithasala", "example-xii-sun-venus-ithasala",
    ]);
  });
});
