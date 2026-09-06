import { describe, expect, it } from "vitest";
import { buildPrashnaConsultation, CLASSICAL_SILENT_QUERY_PLANET_DESCRIPTORS, CLASSICAL_SILENT_QUERY_SIGN_LENGTHS, CLASSICAL_SILENT_QUERY_SUBJECTS, classicalAbroadReturnChapterRules, classicalChildrenBirthCombinations, classicalDiseaseRecoveryChapterRules, classicalGainsAndLossesChapterRules, classicalLostPropertyAdditionalRules, classicalLostPropertyVerse10, classicalLostPropertyVerse14, classicalLostPropertyVerses1To3Location, classicalMarriageChapterRules, classicalSilentQueryVerses3To4, classicalSilentQueryVerses6To8, classicalSilentQueryVerses12To13, classicalTravelRisingMode, classicalTravelVerses2To4, classicalTravelVerses5To9, classicalUpachayaProsperity, classifyNaturalPrashnaNature, evaluateChartFitness, prashnaChart, prashnaObservations, prashnaRequestSchema, searchClassicalSeventhLordRetrogradeBetween, searchSystemsTransitContactsBetween, SYSTEMS_ASPECT_HOUSES, systemsAfflictionInfluencePercent, systemsAgePowerPercent, systemsCloseHouseInfluences, systemsClosePlanetInfluences, systemsFunctionalNature, systemsOperatingPeriodProfile, systemsPeriodTransitInteraction, systemsWeaknessProfile } from "./prashna";
import type { ChartResult } from "./schema";
import { PRASHNA_NON_EXECUTABLE_RULES, PRASHNA_RULES, resolvePrashnaRule } from "./prashnaRules";
import { PRASHNA_HOUSES, PRASHNA_TOPIC_HOUSES } from "./prashnaRulebook";

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
  it("reproduces all Chapter X verses 6–8 sign, color and shape tables", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    expect(CLASSICAL_SILENT_QUERY_SIGN_LENGTHS).toEqual([
      "short", "short", "medium", "medium", "long", "long",
      "long", "long", "medium", "medium", "short", "short",
    ]);
    expect(CLASSICAL_SILENT_QUERY_PLANET_DESCRIPTORS).toEqual({
      Sun: { color: "red", shape: "square" },
      Moon: { color: "white", shape: "tall" },
      Mars: { color: "red", shape: "round" },
      Mercury: { color: "green", shape: "tall" },
      Jupiter: { color: "yellow", shape: "round" },
      Venus: { color: "white", shape: "thin" },
      Saturn: { color: "black", shape: "long" },
    });
    for (let sign = 0; sign < 12; sign += 1)
      expect(classicalSilentQueryVerses6To8(chart, sign)).toMatchObject({
        signLength: CLASSICAL_SILENT_QUERY_SIGN_LENGTHS[sign],
        descriptorCandidates: expect.arrayContaining([
          expect.objectContaining({ planet: "Sun", color: "red", shape: "square" }),
          expect.objectContaining({ planet: "Saturn", color: "black", shape: "long" }),
        ]),
      });
    expect(classicalSilentQueryVerses6To8(chart, 0).descriptorCandidates).toHaveLength(7);
    expect(() => classicalSilentQueryVerses6To8(chart, -1)).toThrow(RangeError);
    expect(() => classicalSilentQueryVerses6To8(chart, 12)).toThrow(RangeError);
    expect(() => classicalSilentQueryVerses6To8(chart, 1.5)).toThrow(RangeError);
  });
  it("ranks local Navamsa relationships and selects only a unique highest planet", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const d9 = chart.advanced.vargas.D9;
    const setD9 = (name: string, sign: number) => { d9.find((item) => item.name === name)!.sign = sign; };
    const sunRelationship = (sign: number) => {
      setD9("Sun", sign);
      return classicalSilentQueryVerses6To8(chart, 0).descriptorCandidates.find((item) => item.planet === "Sun")?.relationship;
    };
    expect(sunRelationship(4)).toBe("own");
    expect(sunRelationship(3)).toBe("friendly");
    expect(sunRelationship(2)).toBe("neutral");
    expect(sunRelationship(1)).toBe("inimical");

    for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]) setD9(name, 4);
    expect(classicalSilentQueryVerses6To8(chart, 0)).toMatchObject({
      leaders: ["Sun"], selectedPlanet: "Sun",
      selectedDescriptor: { color: "red", shape: "square" },
      selectionStatus: "unique-local-navamsa-strength",
    });
    setD9("Moon", 3); // Moon's own Navamsa ties Sun's own Navamsa.
    const sunStrength = chart.advanced.planetaryStates.avasthas.find((item) => item.name === "Sun")!;
    const moonStrength = chart.advanced.planetaryStates.avasthas.find((item) => item.name === "Moon")!;
    sunStrength.shadbalaTotalVirupas = 9999; moonStrength.shadbalaTotalVirupas = 1;
    expect(classicalSilentQueryVerses6To8(chart, 0)).toMatchObject({
      leaders: ["Sun", "Moon"], selectedPlanet: null, selectedDescriptor: null,
      selectionStatus: "tied-local-navamsa-strength",
    });

    d9.splice(d9.findIndex((item) => item.name === "Mercury"), 1);
    expect(classicalSilentQueryVerses6To8(chart, 0)).toMatchObject({
      selectedPlanet: null, selectionStatus: "unavailable-d9",
    });
  });
  it("emits Chapter X verses 6–8 once as neutral, visibly unselected evidence", () => {
    const result = buildPrashnaConsultation(
      { ...request, tradition: "classical" }, new Date("2026-08-29T12:34:56.000Z"),
    );
    const rows = result.observations.filter((item) => item.id === "prashna:classical-silent-query-verses-6-8");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ polarity: "neutral", weight: 0 });
    expect(rows[0].facts.join(" ")).toMatch(/no Shadbala tie-break/i);
    expect(rows[0].provenance.sourceIds).toEqual(["book-daivajna-vallabha", "book-prasna-marga-raman"]);
  });
  it("maps every stated Chapter X verses 3–4 house and retains the house-6 ambiguity", () => {
    expect(CLASSICAL_SILENT_QUERY_SUBJECTS).toEqual({
      1: ["self"], 3: ["brother"], 4: ["mother"], 5: ["son"],
      6: ["sister", "enemy"], 7: ["wife"], 9: ["religion"], 10: ["protector"],
    });
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"])
      chart.advanced.vargas.D9.find((item) => item.name === name)!.sign = 4;
    const sun = chart.placements.find((item) => item.name === "Sun")!;
    for (const [house, subjects] of Object.entries(CLASSICAL_SILENT_QUERY_SUBJECTS)) {
      sun.sign = Number(house) - 1; sun.longitude = sun.sign * 30 + 10;
      const result = classicalSilentQueryVerses3To4(chart, 0);
      expect(result.selectedPlanet).toBe("Sun");
      expect(result.selectedHouse).toBe(Number(house));
      expect(result.subjectCandidates).toEqual(subjects);
      expect(result.status).toBe(Number(house) === 6 ? "ambiguous-source-wording" : "classified");
    }
    sun.sign = 1; sun.longitude = 40;
    expect(classicalSilentQueryVerses3To4(chart, 0)).toMatchObject({
      selectedHouse: 2, subjectCandidates: [], status: "unmapped-house",
    });
  });
  it("abstains from Chapter X subject inference on a strength tie or missing D9", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"])
      chart.advanced.vargas.D9.find((item) => item.name === name)!.sign = 4;
    chart.advanced.vargas.D9.find((item) => item.name === "Moon")!.sign = 3;
    expect(classicalSilentQueryVerses3To4(chart, 0)).toMatchObject({
      selectedPlanet: null, selectedHouse: null, subjectCandidates: [], status: "unavailable-strength",
    });
    chart.advanced.vargas.D9.splice(chart.advanced.vargas.D9.findIndex((item) => item.name === "Mercury"), 1);
    expect(classicalSilentQueryVerses3To4(chart, 0)).toMatchObject({
      selectedPlanet: null, strengthStatus: "unavailable-d9", status: "unavailable-strength",
    });
  });
  it("emits Chapter X verses 3–4 once as neutral dual-source evidence", () => {
    const result = buildPrashnaConsultation(
      { ...request, tradition: "classical" }, new Date("2026-08-29T12:34:56.000Z"),
    );
    const rows = result.observations.filter((item) => item.id === "prashna:classical-silent-query-verses-3-4");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ polarity: "neutral", weight: 0 });
    expect(rows[0].provenance.sourceIds).toEqual(["book-daivajna-vallabha", "book-prasna-marga-raman"]);
    expect(PRASHNA_NON_EXECUTABLE_RULES).toContainEqual(expect.objectContaining({
      locator: "Chapter X, verses 1–2",
      contentClass: expect.stringContaining("sex, age, caste"),
    }));
  });
  it("reproduces every Chapter X verses 12–13 sign and planet family", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    const reset = (lagnaSign: number) => {
      for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"])
        set(name, (lagnaSign + 1) % 12);
    };
    for (const [classification, signs, planets] of [
      ["Dhatu", [0, 4, 7], ["Sun", "Mars"]],
      ["Moola", [2, 5, 9, 10], ["Mercury", "Saturn"]],
      ["Jeeva", [1, 3, 6, 8, 11], ["Moon", "Jupiter", "Venus"]],
    ] as const) {
      for (const sign of signs) {
        for (const planet of planets) {
          reset(sign); set(planet, sign);
          expect(classicalSilentQueryVerses12To13(chart, sign).strictMatches, `${classification} ${sign} ${planet}`).toContain(classification);
        }
      }
    }
  });
  it("separates strict, influence-only, absent, aspect, and mixed silent-query evidence", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) set(name, 1);
    expect(classicalSilentQueryVerses12To13(chart, 0)).toMatchObject({
      strictMatches: [], influenceCandidates: [], status: "no-match",
    });
    set("Jupiter", 0);
    expect(classicalSilentQueryVerses12To13(chart, 0)).toMatchObject({
      strictMatches: [], influenceCandidates: ["Jeeva"], status: "influence-only",
    });
    set("Jupiter", 1); set("Sun", 6);
    expect(classicalSilentQueryVerses12To13(chart, 0)).toMatchObject({
      strictMatches: ["Dhatu"], influenceCandidates: ["Dhatu"], status: "strict-match",
    });
    set("Mercury", 6); set("Jupiter", 8);
    expect(classicalSilentQueryVerses12To13(chart, 0)).toMatchObject({
      strictMatches: ["Dhatu"], influenceCandidates: ["Dhatu", "Moola", "Jeeva"],
      mixedInfluence: true, status: "mixed",
    });
  });
  it("keeps Chapter X and Chappanna classification as separate neutral evidence", () => {
    const result = buildPrashnaConsultation(
      { ...request, tradition: "classical" }, new Date("2026-08-29T12:34:56.000Z"),
    );
    const chapterX = result.observations.filter((item) => item.id === "prashna:classical-silent-query-verses-12-13");
    expect(chapterX).toHaveLength(1);
    expect(chapterX[0]).toMatchObject({ polarity: "neutral", weight: 0 });
    expect(chapterX[0].provenance.sourceIds).toEqual(["book-daivajna-vallabha"]);
    expect(result.observations.filter((item) => item.id === "prashna:classical-dhatu-moola-jeeva")).toHaveLength(1);
  });
  it("implements the two narrowly sourced Prasna Marga Upachaya predicates", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setSign = (name: string, sign: number) => {
      const placement = chart.placements.find((item) => item.name === name)!;
      placement.sign = sign; placement.degree = 10; placement.longitude = sign * 30 + 10;
    };
    // Aries Lagna: Venus is the seventh lord. Its placement in house 3 satisfies
    // both explicitly named factors without requiring two different planets.
    setSign("Venus", 2);
    expect(classicalUpachayaProsperity(chart, 0, "marriage")).toMatchObject({
      matches: true, karaka: "Venus", topicLord: "Venus", karakaHouse: 3, lordHouse: 3,
    });
    setSign("Venus", 3);
    expect(classicalUpachayaProsperity(chart, 0, "marriage").matches).toBe(false);

    // Aries Lagna: fifth lord Sun; both Jupiter and Sun must independently be
    // in one of houses 3, 6, 10 or 11.
    setSign("Jupiter", 5); setSign("Sun", 9);
    expect(classicalUpachayaProsperity(chart, 0, "children")).toMatchObject({
      matches: true, karakaHouse: 6, lordHouse: 10, topicLord: "Sun",
    });
    setSign("Sun", 8);
    expect(classicalUpachayaProsperity(chart, 0, "children").matches).toBe(false);
  });
  it("aggregates Daivajna Vallabha marriage verses 1, 4 and 11 without multiplying evidence", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    set("Moon", 2); // third house
    set("Sun", 8); set("Mercury", 8); // seventh aspects to Gemini
    set("Jupiter", 10); // fifth aspect to Gemini
    set("Venus", 1); set("Mars", 1); set("Saturn", 1); set("Rahu", 1); set("Ketu", 1);
    const clean = classicalMarriageChapterRules(chart, 0);
    expect(clean.promiseCluster).toMatchObject({
      matches: true,
      clauses: [
        "verse 1 Moon-house and three-aspector clause",
        "verse 4 Moon placement with Jupiter aspect",
        "verse 11 immediate-marriage refinement",
      ],
    });
    set("Mars", 2);
    expect(classicalMarriageChapterRules(chart, 0).obstacleCluster).toMatchObject({
      matches: true,
      maleficContacts: expect.arrayContaining([expect.objectContaining({ planet: "Mars", mode: "associated" })]),
    });
    const result = buildPrashnaConsultation({ ...request, category: "relationship", tradition: "classical" }, new Date("2026-08-29T12:34:56.000Z"));
    expect(result.observations.filter((item) => item.id === "prashna:classical-marriage-promise-cluster").length).toBeLessThanOrEqual(1);
  });
  it("reproduces the marriage verse-3 Saturn seventh-house parity and catalogs excluded high-impact claims", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const saturn = chart.placements.find((item) => item.name === "Saturn")!;
    for (let lagnaSign = 0; lagnaSign < 12; lagnaSign++) {
      saturn.sign = (lagnaSign + 6) % 12;
      const expected = saturn.sign % 2 === 1 ? "supportive" : "challenging";
      expect(classicalMarriageChapterRules(chart, lagnaSign).verse3).toMatchObject({ active: true, polarity: expected });
    }
    saturn.sign = 0;
    expect(classicalMarriageChapterRules(chart, 0).verse3.active).toBe(false);
    expect(PRASHNA_NON_EXECUTABLE_RULES).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: "book-daivajna-vallabha", locator: expect.stringContaining("Marriage chapter") }),
      expect.objectContaining({ contentClass: expect.stringContaining("thief identity") }),
    ]));
  });
  it("reproduces Chapter XII verse 12 with a narrow Venus-strength gate", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    set("Moon", 0); set("Mercury", 0); set("Venus", 6); set("Mars", 6);
    const venusDignity = chart.advanced.dignities.find((item) => item.name === "Venus")!;
    venusDignity.dignity = "own-sign";
    let verse12 = classicalMarriageChapterRules(chart, 0).verse12;
    expect(verse12).toMatchObject({ support: true, obstacle: true, venusStrong: true, targets: expect.arrayContaining(["Moon", "Mercury"]) });
    expect(verse12.maleficContacts).toEqual(expect.arrayContaining([
      { target: "Moon", afflicter: "Mars" }, { target: "Mercury", afflicter: "Mars" },
    ]));
    venusDignity.dignity = "neutral";
    verse12 = classicalMarriageChapterRules(chart, 0).verse12;
    expect(verse12).toMatchObject({ support: false, obstacle: true, venusStrong: false });
    set("Moon", 1); set("Mercury", 1);
    expect(classicalMarriageChapterRules(chart, 0).verse12).toMatchObject({ support: false, obstacle: false, targets: [] });
  });
  it("requires every conjunctive gate in Chapter XII verse 13", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    set("Moon", 0); set("Venus", 6); set("Mars", 3);
    expect(classicalMarriageChapterRules(chart, 0).verse13).toMatchObject({
      matches: true, lagnaMovable: true, moonMovable: true,
      venusAspectsLagna: true, venusAspectsMoon: true, angularMalefics: expect.arrayContaining(["Mars"]),
    });
    set("Mars", 1);
    expect(classicalMarriageChapterRules(chart, 0).verse13.matches).toBe(false);
    set("Mars", 3); set("Venus", 5);
    expect(classicalMarriageChapterRules(chart, 0).verse13.matches).toBe(false);
    set("Venus", 6); set("Moon", 1);
    expect(classicalMarriageChapterRules(chart, 0).verse13.matches).toBe(false);
    expect(classicalMarriageChapterRules(chart, 1).verse13.lagnaMovable).toBe(false);
  });
  it("aggregates Chapter XII verses 12–13 into the existing promise and obstacle clusters", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    lagna.sign = 0; lagna.degree = 10; lagna.longitude = 10;
    set("Moon", 0); set("Mercury", 0); set("Venus", 6); set("Mars", 3); set("Saturn", 6);
    chart.advanced.dignities.find((item) => item.name === "Venus")!.dignity = "own-sign";
    const rules = classicalMarriageChapterRules(chart, 0);
    expect(rules.promiseCluster.clauses).toEqual(expect.arrayContaining([
      "verse 12 strong-Venus aspect to Moon or Mercury in the ascendant",
      "verse 13 movable Lagna/Moon with Venus aspects and angular malefic",
    ]));
    expect(rules.obstacleCluster.clauses).toContain("verse 12 malefic aspect to Moon or Mercury in the ascendant");
    const observations = prashnaObservations(chart, "relationship", "classical", { futureChart: chart });
    expect(observations.filter((item) => item.id === "prashna:classical-marriage-promise-cluster")).toHaveLength(1);
    expect(observations.filter((item) => item.id === "prashna:classical-marriage-obstacle-cluster")).toHaveLength(1);
    expect(observations.find((item) => item.id === "prashna:classical-marriage-promise-cluster")?.facts.join(" ")).toMatch(/verses 1, 4 and 11–13/);
  });
  it("reproduces all modality and Sun-Moon branches in Daivajna Vallabha gains verses 4-5", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    for (let lagnaSign = 0; lagnaSign < 12; lagnaSign++) {
      const expected = [0, 3, 6, 9].includes(lagnaSign) ? "no-status-or-post"
        : [1, 4, 7, 10].includes(lagnaSign) ? "status-or-post" : "mixed";
      expect(classicalGainsAndLossesChapterRules(chart, lagnaSign).verse5.indication).toBe(expected);
    }
    for (const moonHouse of [4, 7]) for (const sunHouse of [1, 10]) {
      set("Moon", moonHouse - 1); set("Sun", sunHouse - 1);
      expect(classicalGainsAndLossesChapterRules(chart, 0).verse4.immediateGain).toBe(true);
    }
    set("Moon", 2); set("Sun", 0);
    expect(classicalGainsAndLossesChapterRules(chart, 0).verse4.immediateGain).toBe(false);
    set("Moon", 3); set("Sun", 1);
    expect(classicalGainsAndLossesChapterRules(chart, 0).verse4.immediateGain).toBe(false);
  });
  it("preserves simultaneous supportive and adverse Chapter III verse-2 axes", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    chart.panchanga.lunarDayIndex = 7;
    set("Moon", 2); // house 3, present in both source lists
    set("Jupiter", 10); // fifth aspect to Gemini
    set("Mars", 11); // fourth aspect to Gemini
    const verse2 = classicalGainsAndLossesChapterRules(chart, 0).verse2;
    expect(verse2).toMatchObject({ supportive: true, adverse: true, moonHouse: 3 });
    expect(verse2.beneficAspectors).toContain("Jupiter");
    expect(verse2.maleficAspectors).toContain("Mars");
    set("Jupiter", 9); set("Mars", 9);
    const cleared = classicalGainsAndLossesChapterRules(chart, 0).verse2;
    expect(cleared.supportive).toBe(false);
    expect(cleared.adverse).toBe(false);
  });
  it("requires the complete Chapter III verse-3 quick-gain arrangement", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    chart.panchanga.lunarDayIndex = 7;
    set("Jupiter", 0); set("Venus", 4); set("Mercury", 6); set("Moon", 8);
    set("Sun", 2); set("Mars", 5); set("Saturn", 10); set("Rahu", 2); set("Ketu", 5);
    expect(classicalGainsAndLossesChapterRules(chart, 0).verse3).toMatchObject({ quickGain: true, misplacedBenefics: [], misplacedMalefics: [] });
    set("Jupiter", 1);
    expect(classicalGainsAndLossesChapterRules(chart, 0).verse3).toMatchObject({ quickGain: false, misplacedBenefics: expect.arrayContaining(["Jupiter"]) });
    set("Jupiter", 0); set("Sun", 3);
    expect(classicalGainsAndLossesChapterRules(chart, 0).verse3).toMatchObject({ quickGain: false, misplacedMalefics: expect.arrayContaining(["Sun"]) });
  });
  it("aggregates Chapter III placements once and retains source provenance in money consultations", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    chart.panchanga.lunarDayIndex = 7;
    set("Jupiter", 2); set("Venus", 4); set("Mars", 2);
    const rules = classicalGainsAndLossesChapterRules(chart, 0);
    expect(rules.verse1Gain.supportive).toEqual(expect.arrayContaining([expect.objectContaining({ planet: "Jupiter", house: 3 }), expect.objectContaining({ planet: "Venus", house: 5 })]));
    expect(rules.verse1Gain.adverse).toEqual(expect.arrayContaining([expect.objectContaining({ planet: "Mars", house: 3 })]));
    expect(rules.verse1Prosperity).toEqual(expect.arrayContaining([expect.objectContaining({ planet: "Venus", indication: "honour-wealth" })]));
    const consultation = buildPrashnaConsultation({ ...request, category: "money", tradition: "classical" }, new Date("2026-08-29T12:34:56.000Z"));
    const chapterRules = consultation.observations.filter((item) => item.id.startsWith("prashna:classical-gains-"));
    expect(new Set(chapterRules.map((item) => item.id)).size).toBe(chapterRules.length);
    expect(chapterRules.every((item) => item.provenance.sourceIds.includes("book-daivajna-vallabha"))).toBe(true);
    expect(consultation.timingWindows).toEqual([]);
  });
  it("reproduces Chapter VI verses 1, 2 and 5 return alternatives", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setHouse = (name: string, house: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = house - 1; row.degree = 10; row.longitude = row.sign * 30 + 10;
    };
    for (const [index, name] of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].entries()) setHouse(name, [2, 3, 5][index % 3]);
    let rules = classicalAbroadReturnChapterRules(chart, 0);
    expect(rules.verse1).toMatchObject({ allPlanetsInReturnHouses: true, quickReturnPlanets: expect.arrayContaining(["Jupiter", "Venus"]) });
    setHouse("Saturn", 6);
    expect(classicalAbroadReturnChapterRules(chart, 0).verse1.allPlanetsInReturnHouses).toBe(false);

    setHouse("Jupiter", 4); setHouse("Saturn", 6); setHouse("Mercury", 5); setHouse("Venus", 9);
    rules = classicalAbroadReturnChapterRules(chart, 0);
    expect(rules.verse2).toMatchObject({ jupiterQuadrantWithPlanetSixOrSeven: true, mercuryOrVenusInFiveOrNine: expect.arrayContaining(["Mercury", "Venus"]) });
    setHouse("Jupiter", 2); setHouse("Mercury", 2); setHouse("Venus", 3);
    expect(classicalAbroadReturnChapterRules(chart, 0).verse5.return).toBe(true);
    setHouse("Jupiter", 4); setHouse("Venus", 4);
    expect(classicalAbroadReturnChapterRules(chart, 0).verse5).toMatchObject({ return: false, entersHome: true });
  });
  it("applies Chapter VI verse-3 gates and verse-6 complete arrangement", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setHouse = (name: string, house: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = house - 1; row.degree = 10; row.longitude = row.sign * 30 + 10;
    };
    chart.panchanga.lunarDayIndex = 7;
    setHouse("Moon", 8); setHouse("Jupiter", 1); setHouse("Venus", 5); setHouse("Mercury", 9);
    setHouse("Sun", 3); setHouse("Mars", 11); setHouse("Saturn", 3);
    let rules = classicalAbroadReturnChapterRules(chart, 0);
    expect(rules.verse3).toMatchObject({ moonInEighth: true, happyReturn: true, returnWithGains: true, maleficsInAngles: [] });
    setHouse("Mars", 4);
    expect(classicalAbroadReturnChapterRules(chart, 0).verse3).toMatchObject({ happyReturn: false, returnWithGains: false, maleficsInAngles: ["Mars"] });

    setHouse("Moon", 9); setHouse("Mars", 11);
    rules = classicalAbroadReturnChapterRules(chart, 0);
    expect(rules.verse6).toMatchObject({ return: true, misplacedMalefics: [], misplacedBenefics: [] });
    setHouse("Venus", 2);
    expect(classicalAbroadReturnChapterRules(chart, 0).verse6).toMatchObject({ return: false, misplacedBenefics: expect.arrayContaining(["Venus"]) });
  });
  it("preserves Chapter VI verse-10 safe and trouble axes and deduplicates return testimony", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setHouse = (name: string, house: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = house - 1; row.degree = 10; row.longitude = row.sign * 30 + 10;
    };
    chart.panchanga.lunarDayIndex = 7;
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    lagna.sign = 0; lagna.degree = 10; lagna.longitude = 10;
    for (const [index, name] of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].entries()) setHouse(name, [2, 3, 5][index % 3]);
    setHouse("Jupiter", 9); setHouse("Mars", 1);
    const rules = classicalAbroadReturnChapterRules(chart, 0);
    expect(rules.verse10.beneficsInNinth).toContain("Jupiter");
    expect(rules.verse10.maleficsInAscendant).toContain("Mars");
    const observations = prashnaObservations(chart, "missing-person", "classical", { futureChart: chart });
    expect(observations.filter((item) => item.id === "prashna:classical-abroad-return-cluster")).toHaveLength(1);
    expect(observations.filter((item) => item.id === "prashna:classical-abroad-verse-10-safe")).toHaveLength(1);
    expect(observations.filter((item) => item.id === "prashna:classical-abroad-verse-10-trouble")).toHaveLength(1);
    expect(observations.filter((item) => item.id.startsWith("prashna:classical-abroad-")).every((item) => item.provenance.sourceIds.includes("book-daivajna-vallabha"))).toBe(true);
    expect(PRASHNA_NON_EXECUTABLE_RULES).toEqual(expect.arrayContaining([
      expect.objectContaining({ locator: "Chapter VI, verses 4 and 7–9", contentClass: expect.stringContaining("death, imprisonment") }),
    ]));
  });
  it("reproduces Chapter VIII verse-3 Moon/Mercury hardship contacts", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    chart.panchanga.lunarDayIndex = 7;
    set("Moon", 0); set("Mercury", 0); set("Mars", 9); // Mars fourth aspect to Aries
    const active = classicalDiseaseRecoveryChapterRules(chart, 0).verse3;
    expect(active.hardship).toBe(true);
    expect(active.contacts).toEqual(expect.arrayContaining([
      { target: "Moon", afflicter: "Mars" }, { target: "Mercury", afflicter: "Mars" },
    ]));
    set("Mars", 8);
    expect(classicalDiseaseRecoveryChapterRules(chart, 0).verse3.contacts.some((item) => item.afflicter === "Mars")).toBe(false);
    set("Moon", 1); set("Mercury", 1);
    expect(classicalDiseaseRecoveryChapterRules(chart, 0).verse3.hardship).toBe(false);
  });
  it("requires every literal gate in Chapter VIII verse 4", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setHouse = (name: string, house: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = house - 1; row.degree = 10; row.longitude = row.sign * 30 + 10;
    };
    chart.panchanga.lunarDayIndex = 7;
    setHouse("Moon", 3); setHouse("Jupiter", 5); setHouse("Venus", 7); setHouse("Mercury", 8);
    setHouse("Sun", 1); setHouse("Mars", 1); setHouse("Saturn", 1);
    let verse4 = classicalDiseaseRecoveryChapterRules(chart, 0).verse4;
    expect(verse4).toMatchObject({ recovery: true, populatedBeneficHouses: [5, 7, 8], maleficsWithoutBeneficAspect: [], moonHouse: 3 });
    expect(verse4.moonRelativeBenefics).toEqual(expect.arrayContaining([expect.objectContaining({ planet: "Jupiter", houseFromMoon: 3 })]));
    setHouse("Venus", 6);
    expect(classicalDiseaseRecoveryChapterRules(chart, 0).verse4.recovery).toBe(false);
    setHouse("Venus", 7); setHouse("Mars", 4);
    verse4 = classicalDiseaseRecoveryChapterRules(chart, 0).verse4;
    expect(verse4.recovery).toBe(false);
    expect(verse4.maleficsWithoutBeneficAspect).toContain("Mars");
    setHouse("Mars", 1); setHouse("Moon", 2);
    expect(classicalDiseaseRecoveryChapterRules(chart, 0).verse4.recovery).toBe(false);
  });
  it("reproduces both Chapter VIII verses 6 and 7 alternatives", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setHouse = (name: string, house: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = house - 1; row.degree = 10; row.longitude = row.sign * 30 + 10;
    };
    chart.panchanga.lunarDayIndex = 7;
    setHouse("Moon", 3); setHouse("Jupiter", 5); setHouse("Venus", 4); setHouse("Mercury", 9);
    let rules = classicalDiseaseRecoveryChapterRules(chart, 0);
    expect(rules.verse6).toMatchObject({ moonUpachayaArrangement: true, recoveryAfterRelocation: true, misplacedBenefics: [] });
    setHouse("Mercury", 2);
    expect(classicalDiseaseRecoveryChapterRules(chart, 0).verse6).toMatchObject({ moonUpachayaArrangement: false, misplacedBenefics: ["Mercury"] });

    setHouse("Mercury", 9); setHouse("Jupiter", 7); // Jupiter aspects ascendant
    expect(classicalDiseaseRecoveryChapterRules(chart, 0).verse6.beneficAscendantAspect).toBe(true);
    chart.panchanga.lunarDayIndex = 14; setHouse("Moon", 1);
    rules = classicalDiseaseRecoveryChapterRules(chart, 0);
    expect(rules.verse7.fullMoonInAscendantAspectedByJupiter).toBe(true);
    chart.panchanga.lunarDayIndex = 13;
    expect(classicalDiseaseRecoveryChapterRules(chart, 0).verse7.fullMoonInAscendantAspectedByJupiter).toBe(false);
    setHouse("Jupiter", 4); setHouse("Venus", 10);
    expect(classicalDiseaseRecoveryChapterRules(chart, 0).verse7.jupiterVenusAngular).toBe(true);
    setHouse("Venus", 11);
    expect(classicalDiseaseRecoveryChapterRules(chart, 0).verse7.jupiterVenusAngular).toBe(false);
  });
  it("deduplicates Chapter VIII recovery evidence and excludes deterministic medical claims", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setHouse = (name: string, house: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = house - 1; row.degree = 10; row.longitude = row.sign * 30 + 10;
    };
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    lagna.sign = 0; lagna.degree = 10; lagna.longitude = 10;
    chart.panchanga.lunarDayIndex = 14;
    setHouse("Moon", 1); setHouse("Jupiter", 7); setHouse("Venus", 4); setHouse("Mercury", 9);
    const observations = prashnaObservations(chart, "health", "classical", { futureChart: chart });
    expect(observations.filter((item) => item.id === "prashna:classical-disease-recovery-cluster")).toHaveLength(1);
    const recovery = observations.find((item) => item.id === "prashna:classical-disease-recovery-cluster")!;
    expect(recovery.facts.join(" ")).toMatch(/not medical advice, diagnosis, prognosis/);
    expect(recovery.provenance.sourceIds).toContain("book-daivajna-vallabha");
    expect(PRASHNA_NON_EXECUTABLE_RULES).toEqual(expect.arrayContaining([
      expect.objectContaining({ locator: "Chapter VIII, verses 1–2, verse 5 death branch, and verse 8", contentClass: expect.stringContaining("deterministic death") }),
    ]));
  });
  it("implements Prasna Marga XVIII stanza 18 with exact fifth-sign and Jupiter-aspect gates", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setSign = (name: string, sign: number) => {
      const placement = chart.placements.find((item) => item.name === name)!;
      placement.sign = sign; placement.degree = 10; placement.longitude = sign * 30 + 10;
    };
    // Exercise every source-listed fifth sign. Jupiter is placed four signs
    // behind it so its fifth graha drishti reaches the fifth house.
    for (const fifthSign of [0, 4, 7, 11]) {
      const lagnaSign = (fifthSign + 8) % 12;
      setSign("Mars", fifthSign); setSign("Jupiter", (fifthSign + 8) % 12);
      expect(classicalChildrenBirthCombinations(chart, lagnaSign).stanza18.matches, `fifth sign ${fifthSign}`).toBe(true);
    }
    setSign("Mars", 0); setSign("Jupiter", 9);
    expect(classicalChildrenBirthCombinations(chart, 8).stanza18.matches).toBe(false);
    setSign("Mars", 1); setSign("Jupiter", 9);
    expect(classicalChildrenBirthCombinations(chart, 9).stanza18.matches).toBe(false); // Taurus fifth is disallowed.
  });
  it("implements Prasna Marga XVIII stanza 22 strength and malefic-aspect gates", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setSign = (name: string, sign: number) => {
      const placement = chart.placements.find((item) => item.name === name)!;
      placement.sign = sign; placement.degree = 10; placement.longitude = sign * 30 + 10;
    };
    // Pisces Lagna with Jupiter in Pisces: strong, in house 1. Put every fixed
    // malefic where none of its declared graha drishtis reaches Pisces.
    setSign("Jupiter", 11);
    setSign("Sun", 0); setSign("Mars", 1); setSign("Saturn", 3); setSign("Rahu", 4); setSign("Ketu", 4);
    setSign("Moon", 1); setSign("Mercury", 2); setSign("Venus", 2);
    expect(classicalChildrenBirthCombinations(chart, 11).stanza22).toMatchObject({ matches: true, jupiterStrong: true, aspectingMalefics: [] });
    setSign("Sun", 5); // Seventh aspect to Pisces.
    expect(classicalChildrenBirthCombinations(chart, 11).stanza22).toMatchObject({ matches: false, aspectingMalefics: expect.arrayContaining(["Sun"]) });
    setSign("Sun", 0); setSign("Jupiter", 10); // House 12 and ordinary dignity.
    expect(classicalChildrenBirthCombinations(chart, 11).stanza22.matches).toBe(false);
  });
  it("implements Daivajna Vallabha lost-property verse 10 as a three-clause predicate", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const setSign = (name: string, sign: number) => {
      const placement = chart.placements.find((item) => item.name === name)!;
      placement.sign = sign; placement.degree = 10; placement.longitude = sign * 30 + 10;
    };
    // Aries Lagna; keep Jupiter as the sole ascendant benefic while Venus and
    // a second copy of Jupiter cannot coexist, so use a waxing Moon in Lagna.
    setSign("Venus", 1); setSign("Jupiter", 11); setSign("Moon", 0);
    chart.panchanga.lunarDayIndex = 7;
    for (const name of ["Sun", "Mars", "Mercury", "Saturn", "Rahu", "Ketu"]) setSign(name, 4);
    expect(classicalLostPropertyVerse10(chart, 0)).toMatchObject({ matches: true, venusHouse: 2, jupiterHouse: 12, ascendantBenefics: ["Moon"] });
    chart.panchanga.lunarDayIndex = 6;
    expect(classicalLostPropertyVerse10(chart, 0).matches).toBe(false);
    chart.panchanga.lunarDayIndex = 7; setSign("Venus", 2);
    expect(classicalLostPropertyVerse10(chart, 0).matches).toBe(false);
    setSign("Venus", 1); setSign("Jupiter", 10);
    expect(classicalLostPropertyVerse10(chart, 0).matches).toBe(false);
  });
  it("preserves every D1/D9 modality branch and conflicts in lost-property verses 1–3", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const d9Lagna = chart.advanced.vargas.D9.find((item) => item.name === "Lagna")!;
    d9Lagna.sign = 2; // dual, so D1 alone drives fixed/movable branches.
    for (const sign of [0, 3, 6, 9])
      expect(classicalLostPropertyVerses1To3Location(chart, sign)).toMatchObject({
        d1Modality: "movable", locationCandidates: ["elsewhere"], status: "consistent",
      });
    for (const sign of [1, 4, 7, 10])
      expect(classicalLostPropertyVerses1To3Location(chart, sign)).toMatchObject({
        d1Modality: "fixed", locationCandidates: ["same-place"], status: "consistent",
      });
    for (const sign of [2, 5, 8, 11]) {
      d9Lagna.sign = sign === 2 ? 5 : 2;
      expect(classicalLostPropertyVerses1To3Location(chart, sign)).toMatchObject({
        d1Modality: "dual", locationCandidates: ["outside-house"], status: "consistent",
      });
    }

    d9Lagna.sign = 1;
    expect(classicalLostPropertyVerses1To3Location(chart, 0)).toMatchObject({
      d1Modality: "movable", d9Modality: "fixed",
      locationCandidates: ["same-place", "elsewhere"], status: "conflicting",
    });
    d9Lagna.sign = 0;
    expect(classicalLostPropertyVerses1To3Location(chart, 1)).toMatchObject({
      d1Modality: "fixed", d9Modality: "movable",
      locationCandidates: ["same-place", "elsewhere"], status: "conflicting",
    });
    d9Lagna.sign = 2;
    expect(classicalLostPropertyVerses1To3Location(chart, 2)).toMatchObject({
      vargottama: true, locationCandidates: ["same-place", "outside-house"], status: "conflicting",
    });
  });
  it("emits verses 1–3 once as neutral location evidence and excludes profiling", () => {
    const result = buildPrashnaConsultation(
      { ...request, category: "lost-object", tradition: "classical" },
      new Date("2026-08-29T12:34:56.000Z"),
    );
    const rows = result.observations.filter((item) => item.id === "prashna:classical-lost-property-verses-1-3-location");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ polarity: "neutral", weight: 0 });
    expect(rows[0].provenance.sourceIds).toEqual(["book-daivajna-vallabha"]);
    expect(rows[0].facts.join(" ")).toMatch(/cannot identify or accuse/);
  });
  it("aggregates all matching alternatives in lost-property verse 14 into one predicate", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const placement = chart.placements.find((item) => item.name === name)!;
      placement.sign = sign; placement.degree = 10; placement.longitude = sign * 30 + 10;
    };
    for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) set(name, 4);
    set("Jupiter", 0); set("Venus", 0); set("Moon", 0); set("Mercury", 0);
    chart.panchanga.lunarDayIndex = 14;
    expect(classicalLostPropertyVerse14(chart, 0)).toMatchObject({
      matches: true,
      ascendantQualifiers: expect.arrayContaining(["Moon", "Mercury", "Jupiter", "Venus"]),
      seventhBenefics: [],
    });
    // Mercury becomes ineligible when a fixed malefic shares the sign.
    set("Jupiter", 4); set("Venus", 4); set("Moon", 4); set("Mars", 0);
    chart.panchanga.lunarDayIndex = 13;
    expect(classicalLostPropertyVerse14(chart, 0)).toMatchObject({ matches: false, ascendantQualifiers: [] });
    set("Venus", 6);
    expect(classicalLostPropertyVerse14(chart, 0)).toMatchObject({ matches: true, seventhBenefics: ["Venus"] });
    const result = buildPrashnaConsultation({ ...request, category: "lost-object", tradition: "classical" }, new Date("2026-08-29T12:34:56.000Z"));
    expect(result.observations.filter((item) => item.id === "prashna:classical-lost-property-verse-14").length).toBeLessThanOrEqual(1);
  });
  it("classifies all three rising decanates in lost-property verse 8", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    for (const [degree, decanate, lossMode] of [
      [0, 1, "stolen"], [9.999, 1, "stolen"], [10, 2, "fallen"],
      [19.999, 2, "fallen"], [20, 3, "forgotten-within-house"], [29.999, 3, "forgotten-within-house"],
    ] as const) {
      lagna.degree = degree;
      expect(classicalLostPropertyAdditionalRules(chart, 0).verse8).toEqual({ decanate, lossMode });
    }
  });
  it("emits one neutral, dual-source lost-property location observation", () => {
    const result = buildPrashnaConsultation(
      { ...request, category: "lost-object", tradition: "classical" },
      new Date("2026-08-29T12:34:56.000Z"),
    );
    const observations = result.observations.filter((item) => item.id === "prashna:classical-lost-property-location-verse-9");
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({ polarity: "neutral", weight: 0 });
    expect(observations[0].provenance.sourceIds).toEqual([
      "book-daivajna-vallabha", "book-chappanna-prasana-sastra",
    ]);
    expect(observations[0].facts.join(" ")).toContain("No single Yojana value is selected");
  });
  it("aggregates the explicit verse-11 clause with overlapping recovery verses 12, 13 and 15", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const placement = chart.placements.find((item) => item.name === name)!;
      placement.sign = sign; placement.degree = 10; placement.longitude = sign * 30 + 10;
    };
    for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) set(name, 7);
    chart.panchanga.lunarDayIndex = 6;
    set("Jupiter", 1); // house 2: verses 12 and 15
    set("Venus", 2); // house 3: verses 12, 13 Upachaya and 15
    expect(classicalLostPropertyAdditionalRules(chart, 0).recoveryCluster).toMatchObject({
      matches: true, matchedVerses: [12, 13, 15],
      verse13: { secondAndUpachaya: true },
    });
    set("Jupiter", 8); set("Venus", 8); set("Mercury", 7);
    expect(classicalLostPropertyAdditionalRules(chart, 0).recoveryCluster.matches).toBe(false);
    set("Moon", 0); set("Jupiter", 8); chart.panchanga.lunarDayIndex = 14;
    expect(classicalLostPropertyAdditionalRules(chart, 0).recoveryCluster).toMatchObject({
      matchedVerses: expect.arrayContaining([11, 13]),
      verse11: { fullMoonInAscendant: true },
    });
    expect(classicalLostPropertyAdditionalRules(chart, 0).recoveryCluster.verse13.fullMoonAspected).toContain("Jupiter");
    chart.panchanga.lunarDayIndex = 13;
    expect(classicalLostPropertyAdditionalRules(chart, 0).recoveryCluster.verse11.fullMoonInAscendant).toBe(false);
  });
  it("preserves both opposing clauses of lost-property verse 16 without double voting", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const placement = chart.placements.find((item) => item.name === name)!;
      placement.sign = sign; placement.degree = 10; placement.longitude = sign * 30 + 10;
    };
    chart.panchanga.lunarDayIndex = 7;
    for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) set(name, 2);
    set("Saturn", 3); // tenth aspect to Aries
    expect(classicalLostPropertyAdditionalRules(chart, 0).verse16).toMatchObject({ adverse: true, supportive: false, adverseAspectors: ["Saturn"] });
    set("Jupiter", 0); set("Venus", 6); // Venus seventh-aspects Jupiter in Lagna
    expect(classicalLostPropertyAdditionalRules(chart, 0).verse16).toMatchObject({
      adverse: true, supportive: true,
      supportivePairs: expect.arrayContaining([expect.objectContaining({ occupant: "Jupiter", aspecter: "Venus" })]),
    });
    const consultation = buildPrashnaConsultation({ ...request, category: "lost-object", tradition: "classical" }, new Date("2026-08-29T12:34:56.000Z"));
    expect(consultation.observations.filter((item) => item.id === "prashna:classical-lost-property-benefic-recovery-cluster")).toHaveLength(1);
  });
  it("reproduces both alternatives and boundaries of lost-property verse 17", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number, degree = 10) => {
      const placement = chart.placements.find((item) => item.name === name)!;
      placement.sign = sign; placement.degree = degree; placement.longitude = sign * 30 + degree;
    };
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    // Seventh signs Leo, Scorpio and Aquarius in their own Navamsas. A planet
    // in Lagna reaches the seventh by ordinary graha drishti.
    for (const [lagnaSign, degree, seventhSign] of [[10, 15, 4], [1, 15, 7], [4, 15, 10]] as const) {
      lagna.sign = lagnaSign; lagna.degree = degree; lagna.longitude = lagnaSign * 30 + degree;
      set("Sun", lagnaSign);
      const result = classicalLostPropertyAdditionalRules(chart, lagnaSign).verse17;
      expect(result, `seventh sign ${seventhSign}`).toMatchObject({
        opposesRecovery: true, seventhSign, seventhNavamsaSign: seventhSign,
        seventhOwnNavamsa: true, maleficAspectors: expect.arrayContaining(["Sun"]),
      });
    }
    lagna.sign = 10; lagna.degree = 13 + 1 / 3 - 1e-7; lagna.longitude = 300 + lagna.degree;
    set("Sun", 10);
    expect(classicalLostPropertyAdditionalRules(chart, 10).verse17.maleficAspectors).toEqual([]);
    lagna.degree = 13 + 1 / 3; lagna.longitude = 300 + lagna.degree;
    expect(classicalLostPropertyAdditionalRules(chart, 10).verse17.maleficAspectors).toContain("Sun");

    lagna.sign = 0; lagna.degree = 10; lagna.longitude = 10;
    set("Mars", 7);
    const marsD9 = chart.advanced.vargas.D9.find((item) => item.name === "Mars")!;
    for (const d9Sign of [4, 7, 10]) {
      marsD9.sign = d9Sign;
      expect(classicalLostPropertyAdditionalRules(chart, 0).verse17).toMatchObject({
        opposesRecovery: true, marsHouse: 8, marsNavamsaSign: d9Sign,
        marsInEighthNamedNavamsa: true,
      });
    }
    marsD9.sign = 3;
    expect(classicalLostPropertyAdditionalRules(chart, 0).verse17.marsInEighthNamedNavamsa).toBe(false);
    set("Mars", 6); marsD9.sign = 4;
    expect(classicalLostPropertyAdditionalRules(chart, 0).verse17.marsInEighthNamedNavamsa).toBe(false);
    // Both alternatives remain fields of one rule result and one registry
    // family; they cannot become two independent votes.
    lagna.sign = 10; lagna.degree = 15; lagna.longitude = 315;
    set("Sun", 10); set("Mars", 5); marsD9.sign = 4;
    expect(classicalLostPropertyAdditionalRules(chart, 10).verse17).toMatchObject({
      opposesRecovery: true,
      maleficAspectors: expect.arrayContaining(["Sun"]),
      marsInEighthNamedNavamsa: true,
    });
    expect(PRASHNA_RULES.filter((item) => item.family === "prashna:classical-lost-property-verse-17")).toHaveLength(1);
  });
  it("reproduces every branch and the 15-degree boundary of the Classical travel rising-mode rule", () => {
    for (const sign of [0, 3, 6, 9])
      expect(classicalTravelRisingMode(sign, 20)).toMatchObject({ mode: "movable-like", supportsTravel: true });
    for (const sign of [1, 4, 7, 10])
      expect(classicalTravelRisingMode(sign, 10)).toMatchObject({ mode: "fixed-like", supportsTravel: false });
    for (const sign of [2, 5, 8, 11]) {
      expect(classicalTravelRisingMode(sign, 14.999999)).toMatchObject({ mode: "movable-like", supportsTravel: true });
      expect(classicalTravelRisingMode(sign, 15)).toMatchObject({ mode: "fixed-like", supportsTravel: false });
    }
  });
  it("reproduces Daivajna Vallabha travel verses 2 through 4 without merging conflicting clauses", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number, retrograde = false) => {
      const placement = chart.placements.find((item) => item.name === name)!;
      placement.sign = sign; placement.degree = 10; placement.longitude = sign * 30 + 10; placement.retrograde = retrograde;
    };
    for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) set(name, 5);
    for (const name of ["Sun", "Saturn", "Mercury", "Venus"]) {
      set(name, 0);
      expect(classicalTravelVerses2To4(chart, 0).verse2.directEarlyTravel).toContain(name);
      set(name, 5);
    }
    for (const name of ["Saturn", "Mercury", "Venus"]) {
      set(name, 0, true);
      expect(classicalTravelVerses2To4(chart, 0).verse2.retrogradeNoTravel).toContain(name);
      set(name, 5);
    }
    for (const name of ["Jupiter", "Mercury", "Venus", "Sun"]) {
      set(name, 1);
      expect(classicalTravelVerses2To4(chart, 1).verse3.fixedReturn).toContain(name);
      set(name, 5);
    }
    for (const name of ["Sun", "Jupiter", "Mercury", "Venus"]) {
      set(name, 10);
      expect(classicalTravelVerses2To4(chart, 0).verse4.earlyJourney).toContain(name);
      set(name, 11);
      expect(classicalTravelVerses2To4(chart, 0).verse4.breaksAndReturns).toContain(name);
      set(name, 5);
    }
  });
  it("requires both verse-5 aspects and every literal verse-6 target gate", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const set = (name: string, sign: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = 10; row.longitude = sign * 30 + 10;
    };
    set("Jupiter", 9); set("Saturn", 11);
    expect(classicalTravelVerses5To9(chart, 1).verse5).toMatchObject({ noReturn: true, jupiterAspectsAscendant: true, saturnAspectsAscendant: true });
    set("Saturn", 10);
    expect(classicalTravelVerses5To9(chart, 1).verse5.noReturn).toBe(false);
    expect(classicalTravelVerses5To9(chart, 0).verse5.fixedAscendant).toBe(false);

    set("Sun", 5); set("Mars", 6); set("Saturn", 9); set("Mercury", 11); set("Rahu", 11);
    let verse6 = classicalTravelVerses5To9(chart, 1).verse6;
    expect(verse6.noTravel).toBe(true);
    expect(verse6.targets).toEqual([
      { house: 5, planets: ["Sun"], unaspected: [] },
      { house: 6, planets: ["Mars"], unaspected: [] },
      { house: 9, planets: ["Saturn"], unaspected: [] },
    ]);
    set("Sun", 4);
    expect(classicalTravelVerses5To9(chart, 1).verse6.noTravel).toBe(false);
    set("Sun", 5); set("Mercury", 10); set("Rahu", 10);
    verse6 = classicalTravelVerses5To9(chart, 1).verse6;
    expect(verse6.noTravel).toBe(false);
    expect(verse6.targets.find((item) => item.house === 5)?.unaspected).toContain("Sun");
  });
  it("calculates every verses 8-9 timing candidate without selecting a strongest planet", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const sun = chart.placements.find((item) => item.name === "Sun")!;
    sun.sign = 4; sun.degree = 10; sun.longitude = 130;
    const sunD9 = chart.advanced.vargas.D9.find((item) => item.name === "Sun")!;
    for (const [d9Sign, modality, multiplier, months] of [[0, "movable", 1, 5], [1, "fixed", 2, 10], [2, "dual", 3, 15]] as const) {
      sunD9.sign = d9Sign;
      expect(classicalTravelVerses5To9(chart, 0).verses8To9.candidates.find((item) => item.planet === "Sun")).toMatchObject({ distanceInSigns: 5, navamsaModality: modality, multiplier, months });
    }
    const timing = classicalTravelVerses5To9(chart, 0).verses8To9;
    expect(timing.candidates).toHaveLength(7);
    expect(timing.selected).toBeNull();
    expect(timing.notice).toMatch(/does not select one/);
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    lagna.sign = 0; lagna.degree = 10; lagna.longitude = 10;
    const observations = prashnaObservations(chart, "travel", "classical", { futureChart: chart });
    expect(observations.filter((item) => item.id === "prashna:classical-travel-verses-8-9-timing-candidates")).toHaveLength(1);
  });
  it("searches actual seventh-lord retrograde windows for travel verse 10", () => {
    const start = Date.parse("2026-01-01T00:00:00.000Z") / 86400000 + 2440587.5;
    const mercury = searchClassicalSeventhLordRetrogradeBetween(11, start, start + 365, 1440);
    expect(mercury.seventhLord).toBe("Mercury");
    expect(mercury.status).toBe("retrograde-windows-found");
    expect(mercury.windows.length).toBeGreaterThan(0);
    expect(mercury.samples.filter((item) => item.retrograde).length).toBeGreaterThan(0);
    expect(mercury.boundaryToleranceMinutes).toBe(1);
    const complete = mercury.windows.find((window) => window.ingressBoundary === "refined" && window.egressBoundary === "refined")!;
    expect(complete).toBeDefined();
    expect(complete.refinedStartJulianDay).toBeLessThanOrEqual(complete.startJulianDay);
    expect(complete.refinedEndJulianDay).toBeGreaterThanOrEqual(complete.endJulianDay);
    const ingressProbe = searchClassicalSeventhLordRetrogradeBetween(11, complete.refinedStartJulianDay - 2 / 1440, complete.refinedStartJulianDay + 2 / 1440, 1);
    expect(ingressProbe.samples.some((item) => !item.retrograde)).toBe(true);
    expect(ingressProbe.samples.some((item) => item.retrograde)).toBe(true);
    const clipped = searchClassicalSeventhLordRetrogradeBetween(11, complete.startJulianDay, complete.startJulianDay + 1, 60);
    expect(clipped.windows[0]?.ingressBoundary).toBe("interval-truncated");
    expect(mercury.notice).toMatch(/not guaranteed return dates/);
    const sun = searchClassicalSeventhLordRetrogradeBetween(10, start, start + 365, 1440);
    expect(sun).toMatchObject({ seventhLord: "Sun", status: "no-retrograde-window", windows: [] });
    expect(() => searchClassicalSeventhLordRetrogradeBetween(12, start, start + 1)).toThrow(/valid ascendant/);
    expect(() => searchClassicalSeventhLordRetrogradeBetween(0, start + 1, start)).toThrow(/ordered/);
    expect(() => searchClassicalSeventhLordRetrogradeBetween(0, start, start + 1, 0)).toThrow(/positive/);
    expect(() => searchClassicalSeventhLordRetrogradeBetween(0, start, start + 100, 1)).toThrow(/50,000/);
  });
  it("reproduces the Systems' Approach functional-malefic and MMP tables for all ascendants", () => {
    const malefics = [
      ["Mercury","Rahu","Ketu"], ["Venus","Jupiter","Mars","Rahu","Ketu"], ["Rahu","Ketu"],
      ["Jupiter","Saturn","Rahu","Ketu"], ["Moon","Rahu","Ketu"], ["Saturn","Mars","Sun","Rahu","Ketu"],
      ["Mercury","Rahu","Ketu"], ["Mars","Venus","Rahu","Ketu"], ["Moon","Rahu","Ketu"],
      ["Sun","Jupiter","Rahu","Ketu"], ["Moon","Mercury","Rahu","Ketu"], ["Sun","Venus","Saturn","Rahu","Ketu"],
    ];
    const mmp = ["Ketu","Jupiter","Ketu","Saturn","Moon","Mars","Mercury","Venus","Moon","Sun","Mercury","Venus"];
    for (let sign = 0; sign < 12; sign++) {
      const result = systemsFunctionalNature(sign);
      expect(new Set(result.functionalMalefics), `malefics sign ${sign}`).toEqual(new Set(malefics[sign]));
      expect(result.mostMalefic, `MMP sign ${sign}`).toBe(mmp[sign]);
      expect(new Set([...result.functionalMalefics.filter((p) => p !== "Rahu" && p !== "Ketu"), ...result.functionalBenefics])).toEqual(new Set(["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]));
    }
  });
  it("reproduces the Systems' Approach close-affliction influence scale", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(systemsAfflictionInfluencePercent)).toEqual([100, 80, 60, 40, 20, 0, 0]);
    expect(systemsAfflictionInfluencePercent(2.5)).toBe(50);
    expect(systemsAfflictionInfluencePercent(-1)).toBe(80);
  });
  it("reproduces the Systems' Approach infancy and old-age power scale", () => {
    expect([0, 1, 2, 3, 4, 5, 25, 26, 27, 28, 29, 30].map(systemsAgePowerPercent))
      .toEqual([0, 20, 40, 60, 80, 100, 100, 80, 60, 40, 20, 0]);
    expect(systemsAgePowerPercent(2.5)).toBe(50);
  });
  it("reports calculable Systems weakness causes without collapsing them into one flag", () => {
    const chart = prashnaChart(request, new Date("2026-08-29T12:34:56.000Z"));
    const profile = systemsWeaknessProfile(chart, chart.placements.find((item) => item.name === "Lagna")!.sign);
    expect(profile).toHaveLength(7);
    expect(profile.every((row) => row.agePowerPercent >= 0 && row.agePowerPercent <= 100)).toBe(true);
    expect(profile.filter((row) => row.weak).every((row) => row.reasons.length > 0)).toBe(true);
  });
  it("isolates direct and transitive Systems weakness causes in a controlled chart", () => {
    const base = prashnaChart(request, new Date("2026-08-29T12:34:56.000Z"));
    const chart = structuredClone(base);
    const classical = new Set(["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]);
    chart.placements.forEach((item) => {
      if (!classical.has(item.name)) return;
      item.sign = 1;
      item.longitude = 40;
      item.degree = 10;
    });
    chart.placements.find((item) => item.name === "Lagna")!.sign = 0;
    chart.placements.find((item) => item.name === "Sun")!.sign = 4;
    chart.placements.find((item) => item.name === "Sun")!.longitude = 121;
    chart.placements.find((item) => item.name === "Sun")!.degree = 1;
    chart.placements.find((item) => item.name === "Mercury")!.sign = 4;
    chart.placements.find((item) => item.name === "Mercury")!.longitude = 130;
    chart.placements.find((item) => item.name === "Mars")!.sign = 3;
    chart.placements.find((item) => item.name === "Mars")!.longitude = 100;
    chart.placements.find((item) => item.name === "Saturn")!.sign = 5;
    chart.placements.find((item) => item.name === "Saturn")!.longitude = 160;
    chart.advanced.dignities.forEach((item) => {
      if (classical.has(item.name)) { item.dignity = "neutral"; item.combust = false; }
    });
    const marsDignity = chart.advanced.dignities.find((item) => item.name === "Mars")!;
    marsDignity.dignity = "debilitated";
    marsDignity.combust = true;
    Object.values(chart.advanced.vargas).forEach((placements) => placements.forEach((item) => {
      if (classical.has(item.name)) item.sign = 2;
    }));
    chart.advanced.vargas.D9.find((item) => item.name === "Venus")!.sign = 5;
    const byPlanet = new Map(systemsWeaknessProfile(chart, 0).map((row) => [row.planet, row]));
    expect(byPlanet.get("Sun")?.reasons).toContain("age power 20.0%");
    expect(byPlanet.get("Mars")?.reasons).toEqual(expect.arrayContaining(["D1 debilitation", "combustion"]));
    expect(byPlanet.get("Saturn")?.reasons).toContain("dusthana house 6");
    expect(byPlanet.get("Venus")?.reasons).toContain("D9 debilitation");
    expect(byPlanet.get("Mercury")?.reasons).toContain("occupies the moolatrikona sign of weak Sun");
  });
  it("projects the Systems' Approach full aspects to a house MEP", () => {
    expect(SYSTEMS_ASPECT_HOUSES).toMatchObject({
      Sun: [7], Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10], Rahu: [5, 7, 9], Ketu: [5, 7, 9],
    });
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    lagna.sign = 0; lagna.degree = 10; lagna.longitude = 10;
    const mercury = chart.placements.find((item) => item.name === "Mercury")!;
    mercury.sign = 6; mercury.degree = 10; mercury.longitude = 190;
    const rahu = chart.placements.find((item) => item.name === "Rahu")!;
    rahu.sign = 8; rahu.degree = 12; rahu.longitude = 252;
    const influences = systemsCloseHouseInfluences(chart, 0, 1, 10);
    expect(influences).toEqual(expect.arrayContaining([
      expect.objectContaining({ planet: "Mercury", mode: "7th aspect", influencePercent: 100 }),
      expect.objectContaining({ planet: "Rahu", mode: "5th aspect", influencePercent: 60 }),
    ]));
  });
  it("reproduces the worked Chart 36 Ketu-to-Moon aspect topology and close-planet gates", () => {
    const chart = structuredClone(prashnaChart(request, new Date("1995-06-14T01:00:00.000Z")));
    const set = (name: string, sign: number, degree: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = degree; row.longitude = sign * 30 + degree;
    };
    // The printed chart supplies Gemini Lagna, Ketu in Aries and Moon in
    // Sagittarius. Its OCR does not safely preserve every degree, so the
    // source topology is reproduced while the closeness boundary is tested
    // with controlled equal-degree fixtures.
    set("Lagna", 2, 11);
    set("Ketu", 0, 11);
    set("Moon", 8, 11);
    expect(new Set(systemsFunctionalNature(2).functionalMalefics)).toEqual(new Set(["Rahu", "Ketu"]));
    expect(systemsClosePlanetInfluences(chart, 2, "Moon")).toEqual(expect.arrayContaining([
      expect.objectContaining({ afflicter: "Ketu", target: "Moon", mode: "9th aspect", influencePercent: 100 }),
    ]));

    set("Ketu", 0, 16); // exact five-degree boundary has zero influence
    expect(systemsClosePlanetInfluences(chart, 2, "Moon").some((item) => item.afflicter === "Ketu")).toBe(false);
    set("Ketu", 8, 13); // conjunction uses the same graded scale
    expect(systemsClosePlanetInfluences(chart, 2, "Moon")).toEqual(expect.arrayContaining([
      expect.objectContaining({ afflicter: "Ketu", mode: "conjunction", influencePercent: 60 }),
    ]));
    expect(systemsClosePlanetInfluences(chart, 2, "Ketu").some((item) => item.afflicter === "Ketu")).toBe(false);
    expect(systemsClosePlanetInfluences(chart, 2, "Moon").some((item) => item.afflicter === "Jupiter")).toBe(false);
  });
  it("retains operating-period activation layers without inventing an outcome synthesis", () => {
    const chart = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    chart.placements.find((item) => item.name === "Jupiter")!.sign = 4;
    chart.advanced.birthPeriods = { mahadasha: "Jupiter", antardasha: "Rahu", pratyantardasha: "Venus" };
    const profile = systemsOperatingPeriodProfile(chart, 0);
    expect(profile.mainPeriod).toMatchObject({ planet: "Jupiter", occupiedHouse: 5, moolatrikonaHouse: 9 });
    expect(profile.mainPeriod?.activatedLayers).toEqual(expect.arrayContaining(["general significations", "moolatrikona-owned house 9", "occupied house 5"]));
    expect(profile.subPeriod).toMatchObject({ planet: "Rahu", moolatrikonaHouse: null });
    expect(profile.subSubPeriod?.weakness).not.toBeUndefined();
  });
  it("synthesizes the Systems sub-period trend with all three source-listed transit contact points", () => {
    const radix = structuredClone(prashnaChart(request, new Date("2026-08-29T12:34:56.000Z")));
    const transit = structuredClone(radix);
    const set = (chart: ChartResult, name: string, sign: number, degree: number) => {
      const row = chart.placements.find((item) => item.name === name)!;
      row.sign = sign; row.degree = degree; row.longitude = sign * 30 + degree;
    };
    set(radix, "Lagna", 0, 10);
    radix.advanced.birthPeriods = { mahadasha: "Jupiter", antardasha: "Venus", pratyantardasha: "Moon" };
    set(radix, "Venus", 9, 10);
    set(transit, "Venus", 9, 10);
    set(transit, "Rahu", 5, 12); // fifth aspect to Capricorn, two degrees from all three points
    const result = systemsPeriodTransitInteraction(radix, transit, 0, 10);
    expect(result.status).toBe("close-functional-malefic-transit");
    expect(result.subPeriodLord).toBe("Venus");
    expect(result.contacts.filter((item) => item.afflicter === "Rahu")).toEqual(expect.arrayContaining([
      expect.objectContaining({ point: "event-house MEP", mode: "5th aspect", influencePercent: 60 }),
      expect.objectContaining({ point: "natal sub-period lord", influencePercent: 60 }),
      expect.objectContaining({ point: "transit sub-period lord", influencePercent: 60 }),
    ]));
    set(transit, "Rahu", 5, 15);
    expect(systemsPeriodTransitInteraction(radix, transit, 0, 10).contacts.filter((item) => item.afflicter === "Rahu")).toEqual([]);
  });
  it("builds a bounded Systems forward transit calendar from the shared ephemeris", () => {
    const radix = structuredClone(prashnaChart(request, new Date("2026-01-01T00:00:00.000Z")));
    const lagna = radix.placements.find((item) => item.name === "Lagna")!;
    lagna.sign = 0; lagna.degree = 10; lagna.longitude = 10;
    radix.advanced.birthPeriods = { mahadasha: "Jupiter", antardasha: "Venus", pratyantardasha: "Moon" };
    const start = Date.parse("2026-01-01T00:00:00.000Z") / 86400000 + 2440587.5;
    const result = searchSystemsTransitContactsBetween(radix, 0, 10, start, start + 365, 1440);
    expect(result.status).toBe("contact-windows-found");
    expect(result.sampledPoints).toBe(366);
    expect(result.windows.length).toBeGreaterThan(0);
    expect(result.windows.every((window) => window.startJulianDay <= window.sampledPeakJulianDay && window.sampledPeakJulianDay <= window.endJulianDay)).toBe(true);
    expect(result.boundaryToleranceMinutes).toBe(1);
    expect(result.windows.every((window) => window.refinedStartJulianDay <= window.peakJulianDay && window.peakJulianDay <= window.refinedEndJulianDay)).toBe(true);
    expect(result.windows.every((window) => window.refinedStartJulianDay <= window.startJulianDay && window.refinedEndJulianDay >= window.endJulianDay)).toBe(true);
    expect(result.windows.some((window) => window.ingressBoundary === "refined" && window.egressBoundary === "refined")).toBe(true);
    expect(result.windows.every((window) => window.contact.influencePercent > 0 && window.contact.influencePercent <= 100)).toBe(true);
    expect(result.windows.every((window) => window.peakRefinement === "golden-section-within-best-sample-bracket")).toBe(true);
    expect(result.windows.every((window) => window.peakBoundaryToleranceMinutes === 1)).toBe(true);
    expect(result.windows.every((window) => window.contact.difference <= window.sampledPeakContact.difference + 1e-8)).toBe(true);
    expect(result.windows.some((window) => window.contact.difference < window.sampledPeakContact.difference - 1e-4)).toBe(true);
    expect(result.windows.some((window) => window.contact.mode !== "conjunction")).toBe(true);
    expect(result.windows.every((window) => !(window.contact.afflicter === "Venus" && window.contact.point !== "event-house MEP"))).toBe(true);
    expect(result.notice).toMatch(/continuously refined.*not an event promise or calibrated probability/);

    const clipped = searchSystemsTransitContactsBetween(radix, 0, 10, result.windows[0].peakJulianDay, result.windows[0].peakJulianDay + 0.25, 60);
    expect(clipped.windows.some((window) => window.ingressBoundary === "interval-truncated")).toBe(true);

    radix.advanced.birthPeriods.antardasha = null;
    expect(searchSystemsTransitContactsBetween(radix, 0, 10, start, start + 10).status).toBe("unavailable");
    expect(() => searchSystemsTransitContactsBetween(radix, 0, 10, start + 1, start)).toThrow(/ordered/);
    expect(() => searchSystemsTransitContactsBetween(radix, 0, 10, start, start + 1, 0)).toThrow(/positive/);
    expect(() => searchSystemsTransitContactsBetween(radix, 0, 13, start, start + 1)).toThrow(/1 through 12/);
    expect(() => searchSystemsTransitContactsBetween(radix, 0, 10, start, start + 100, 1)).toThrow(/50,000/);
  });
  it("conditions the Moon and Mercury instead of treating their natural character as static", () => {
    expect(classifyNaturalPrashnaNature("Moon", { lunarDayIndex: 6, mercuryAfflicted: false })).toBe("malefic"); // Shukla 7
    expect(classifyNaturalPrashnaNature("Moon", { lunarDayIndex: 7, mercuryAfflicted: false })).toBe("benefic"); // Shukla 8
    expect(classifyNaturalPrashnaNature("Moon", { lunarDayIndex: 21, mercuryAfflicted: false })).toBe("benefic"); // Krishna 7
    expect(classifyNaturalPrashnaNature("Moon", { lunarDayIndex: 22, mercuryAfflicted: false })).toBe("malefic"); // Krishna 8
    expect(classifyNaturalPrashnaNature("Mercury", { lunarDayIndex: 7, mercuryAfflicted: false })).toBe("benefic");
    expect(classifyNaturalPrashnaNature("Mercury", { lunarDayIndex: 7, mercuryAfflicted: true })).toBe("malefic");
    expect(classifyNaturalPrashnaNature("Jupiter", { lunarDayIndex: 22, mercuryAfflicted: true })).toBe("benefic");
    expect(classifyNaturalPrashnaNature("Saturn", { lunarDayIndex: 7, mercuryAfflicted: false })).toBe("malefic");
  });
  it("reports sign-boundary sensitivity without inventing a chart-fitness veto", () => {
    const chart = {
      placements: [
        { name: "Lagna", longitude: 0.1, sign: 0, degree: 0.1 },
        { name: "Moon", longitude: 29.9, sign: 0, degree: 29.9 },
      ],
      advanced: { uncertainty: { boundaryWarnings: [] } },
    } as unknown as ChartResult;
    expect(evaluateChartFitness(chart)).toMatchObject({
      status: "sensitive",
      reasons: expect.arrayContaining([
        "Lagna is within 0.5° of a sign boundary.",
        "Moon is within 0.25° of a sign boundary.",
      ]),
    });
  });
  it("uses server receipt time and produces only auditable structural judgment", () => {
    const result = buildPrashnaConsultation(
      request,
      new Date("2026-08-29T12:34:56.000Z"),
    );
    expect(result.question.askedAt).toBe("2026-08-29T12:34:56.000Z");
    expect(result.methodSelection.method).toBe("prashna");
    expect(result.methodSelection.tradition).toBe("integrated");
    expect(result.methodSelection.capabilityStatus).toBe("partial");
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
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations.every((citation) => citation.sourceIds.length > 0)).toBe(true);
    expect(result.traditionResults?.map((item) => item.tradition)).toEqual([
      "classical", "tajaka", "systems-approach",
    ]);
    expect(result.traditionResults?.every((item) => item.score !== null)).toBe(true);
    expect(result.timingWindows).toEqual([]);
    expect(result.judgmentDimensions).toMatchObject({
      promise: { direction: result.judgment.direction },
      quality: { status: "unavailable", summary: null },
      timing: { status: "unavailable", windows: [] },
    });
    expect(result.feedback.suggestedFollowUpAt).not.toBeNull();
    expect(result.uncertainty).toContain(
      "Astrological event timing is unavailable; the follow-up date is for outcome evaluation only.",
    );
  });
  it("keeps tradition namespaces separate and records unsupported Nadi seed inputs", () => {
    const nadi = buildPrashnaConsultation(
      { ...request, category: "education", tradition: "prashna-nadi", seedNumber: 147 },
      new Date("2026-08-29T12:34:56.000Z"),
    );
    expect(nadi.methodSelection.tradition).toBe("prashna-nadi");
    expect(nadi.methodSelection.chartTypes).toContain("KP 1-249 seed ascendant");
    expect(nadi.observations.some((item) => item.id === "prashna:nadi-seed-ascendant")).toBe(true);
    const seedFact = nadi.observations.find((item) => item.id === "prashna:nadi-seed-ascendant")!.facts[0];
    expect(seedFact).toContain("beginning of the selected sub");
    expect(seedFact).not.toContain("midpoint");
    expect(nadi.observations.some((item) => item.id === "prashna:kp-event-house-education-college-admission-cusp")).toBe(true);
    expect(nadi.observations.some((item) => item.id === "prashna:kp-operating-period-education-competitive-success")).toBe(true);
    expect(nadi.observations.some((item) => item.id === "prashna:kp-conjoined-period-education-competitive-success")).toBe(true);
    const transitProtocols = nadi.observations.filter((item) => item.id.startsWith("prashna:kp-transit-pinning-"));
    expect(transitProtocols).toHaveLength(1);
    expect(transitProtocols[0].id).toBe("prashna:kp-transit-pinning-education");
    expect(nadi.observations.every((item) => item.provenance.convention.includes("prashna-nadi"))).toBe(true);
    expect(nadi.observations.every((item) => item.id.startsWith("prashna:nadi-") || item.id.startsWith("prashna:kp-"))).toBe(true);
  });
  it("keeps Viswanath Volume I employment evidence source-located and independent from Reader VI", () => {
    const nadi = buildPrashnaConsultation(
      { ...request, category: "career", tradition: "prashna-nadi", seedNumber: 147 },
      new Date("2026-08-29T12:34:56.000Z"),
    );
    const viswanath = nadi.observations.find((item) => item.id === "prashna:kp-operating-period-career-employment-viswanath");
    const reader = nadi.observations.find((item) => item.id === "prashna:kp-operating-period-career-employment");
    expect(viswanath?.provenance.sourceIds).toEqual(["book-viswanath-prashna-remedies-vol-1"]);
    expect(reader?.provenance.sourceIds).toEqual(["book-kp-reader-vi-horary"]);
    expect(viswanath?.provenance.sourceLocators?.join(" ") ?? "").toContain("Venus-Rahu-Jupiter");
  });
  it("does not contaminate standalone Systems verdicts with Classical/Tajaka heuristics", () => {
    const systems = buildPrashnaConsultation(
      { ...request, tradition: "systems-approach" },
      new Date("2026-08-29T12:34:56.000Z"),
    );
    expect(systems.observations.length).toBeGreaterThan(0);
    expect(systems.observations.every((item) => item.id.startsWith("prashna:systems-"))).toBe(true);
  });
  it("adds KP/Nadi as an independent integrated result only when a seed is supplied", () => {
    const result = buildPrashnaConsultation(
      { ...request, tradition: "integrated", seedNumber: 147 },
      new Date("2026-08-29T12:34:56.000Z"),
    );
    const nadi = result.traditionResults?.find((item) => item.tradition === "prashna-nadi");
    expect(nadi).toBeDefined();
    expect(nadi?.observations.some((item) => item.id === "prashna:nadi-seed-ascendant")).toBe(true);
  });
  it("does not let a KP seed alter Classical or Systems integrated results", () => {
    const instant = new Date("2026-08-29T12:34:56.000Z");
    const withoutSeed = buildPrashnaConsultation({ ...request, tradition: "integrated" }, instant);
    const withSeed = buildPrashnaConsultation({ ...request, tradition: "integrated", seedNumber: 249 }, instant);
    for (const tradition of ["classical", "systems-approach"] as const) {
      const baseline = withoutSeed.traditionResults?.find((item) => item.tradition === tradition);
      const seeded = withSeed.traditionResults?.find((item) => item.tradition === tradition);
      expect(seeded?.score).toBe(baseline?.score);
      expect(seeded?.observations).toEqual(baseline?.observations);
    }
    expect(withSeed.observations.some((item) => item.id === "prashna:nadi-seed-ascendant")).toBe(false);
    expect(withSeed.traditionResults?.find((item) => item.tradition === "prashna-nadi")).toBeDefined();
  });
  it("deduplicates identical rule facts before scoring and citation output", () => {
    const result = buildPrashnaConsultation(request, new Date("2026-08-29T12:34:56.000Z"));
    const keys = result.observations.map((item) => `${item.provenance.ruleId}:${item.facts.join("|")}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("rotates the event house from an explicitly selected relative", () => {
    const result = buildPrashnaConsultation(
      { ...request, category: "health", referenceHouse: 4 },
      new Date("2026-08-29T12:34:56.000Z"),
    );
    expect(result.observations.find((item) => item.id === "prashna:derived-house")?.facts[0])
      .toContain("House 4 is treated as the other person's first house");
    expect(result.questionStructure?.roles.find((role) => role.role === "disease")?.derivedHouse).toBe(9);
  });
  it("keeps one declared primary house consistent with each source-located topic topology", () => {
    for (const [category, roles] of Object.entries(PRASHNA_TOPIC_HOUSES)) {
      const primaries = roles.filter((role) => role.status === "primary");
      expect(primaries, category).toHaveLength(1);
      expect(primaries[0].house, category).toBe(PRASHNA_HOUSES[category as keyof typeof PRASHNA_HOUSES]);
      for (const role of roles) {
        expect(role.sourceIds.length, `${category}:${role.role}`).toBeGreaterThan(0);
        expect(role.locator.length, `${category}:${role.role}`).toBeGreaterThan(10);
      }
    }
  });
  it("uses the property and opponent houses as the primary lost-object and litigation houses", () => {
    expect(PRASHNA_HOUSES["lost-object"]).toBe(4);
    expect(PRASHNA_HOUSES.litigation).toBe(7);
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
  it("adds the source-scoped Daivajna Vallabha rising-sign testimony only to classical modes", () => {
    const instant = new Date("2026-08-29T12:34:56.000Z");
    const classical = buildPrashnaConsultation({ ...request, tradition: "classical" }, instant);
    const tajaka = buildPrashnaConsultation({ ...request, tradition: "tajaka" }, instant);
    const testimony = classical.observations.find((item) => item.id === "prashna:classical-rising-mode");
    expect(testimony).toBeDefined();
    expect(testimony?.provenance.sourceIds).toEqual(["book-daivajna-vallabha"]);
    expect(testimony?.facts.join(" ")).toContain("Chapter II");
    expect(tajaka.observations.some((item) => item.id === "prashna:classical-rising-mode")).toBe(false);
  });
  it("requires every emitted observation to resolve to a constructed rule definition", () => {
    for (const tradition of ["integrated", "classical", "tajaka", "systems-approach"] as const) {
      const result = buildPrashnaConsultation({ ...request, tradition }, new Date("2026-08-29T12:34:56.000Z"));
      for (const observation of result.observations) {
        const rule = resolvePrashnaRule(observation.id);
        expect(rule, observation.id).toBeDefined();
        expect(observation.provenance.sourceLocators?.length, observation.id).toBeGreaterThan(0);
        expect(observation.provenance.ruleMaturity, observation.id).toBe(rule?.maturity);
      }
    }
  });
  it("does not admit empty rule definitions into the executable registry", () => {
    expect(PRASHNA_RULES.length).toBeGreaterThan(15);
    for (const rule of PRASHNA_RULES) {
      expect(rule.sourceIds.length, rule.family).toBeGreaterThan(0);
      expect(rule.locators.length, rule.family).toBeGreaterThan(0);
      expect(rule.requiredInputs.length, rule.family).toBeGreaterThan(0);
      expect(rule.testObligations.length, rule.family).toBeGreaterThan(0);
      expect(rule.statement.length, rule.family).toBeGreaterThan(20);
    }
  });
});
