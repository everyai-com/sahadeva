import { describe, expect, it } from "vitest";
import { calculateKpConjoinedPeriodCandidates, calculateKpNodeRepresentatives, calculateKpNumberedHoraryCusps, calculateKpOperatingPeriodActivation, calculateKpOperatingPeriods, calculateKpPlacidusCusps, calculateKpPreview, calculateKpRulingPlanets, calculateNadiHouseSignifications, evaluateKpHouseCombination, evaluateKpTransitPinning, KP_249_SEGMENTS, KP_EVENT_HOUSE_RULES, KP_EVENT_TRANSIT_PATTERNS, KP_SOURCE_CONFLICTS, kpAyanamsaFromLahiri, kpLongitudeFromLahiri, kpSeedSegment, kpSubdivision, matchKpTransitRulerPattern, matchRegisteredKpTransitPattern, registeredKpTransitPattern, searchKpTransitRulerPattern, searchKpTransitRulerPatternBetween, searchRegisteredKpTransitPatternBetween } from "./kp";
import { calculateChart } from "./jyotish";

describe("KP 1-249 zodiac partition", () => {
  it("creates 249 continuous seed segments including sign-boundary splits", () => {
    expect(KP_249_SEGMENTS).toHaveLength(249);
    expect(KP_249_SEGMENTS[0].start).toBe(0);
    expect(KP_249_SEGMENTS.at(-1)?.end).toBe(360);
    for (let index = 1; index < KP_249_SEGMENTS.length; index++)
      expect(KP_249_SEGMENTS[index].start).toBeCloseTo(KP_249_SEGMENTS[index - 1].end, 8);
  });

  it("starts the zodiac in Ketu star and Ketu sub", () => {
    expect(kpSubdivision(0.0001)).toMatchObject({ starLord: "Ketu", subLord: "Ketu" });
    expect(kpSeedSegment(1)).toMatchObject({ number: 1, sign: 0, starLord: "Ketu", subLord: "Ketu" });
  });

  it("rejects seed numbers outside the installed table", () => {
    expect(() => kpSeedSegment(0)).toThrow();
    expect(() => kpSeedSegment(250)).toThrow();
  });
  it("reproduces Reader VI's printed number 203 interval", () => {
    expect(kpSeedSegment(203)).toMatchObject({
      sign: 9,
      starLord: "Moon",
      subLord: "Sun",
    });
    expect(kpSeedSegment(203).start).toBeCloseTo(270 + 22 + 40 / 60, 7);
    expect(kpSeedSegment(203).end).toBeCloseTo(270 + 23 + 20 / 60, 7);
  });
  it("reproduces Reader VI's printed number 184 start and rulers", () => {
    expect(kpSeedSegment(184)).toMatchObject({
      sign: 8,
      starLord: "Venus",
      subLord: "Ketu",
    });
    expect(kpSeedSegment(184).start).toBeCloseTo(240 + 25 + 53 / 60 + 20 / 3600, 7);
  });
  it("reproduces Reader VI's worked number 48 boundary and rulers", () => {
    expect(kpSeedSegment(48)).toMatchObject({ sign: 2, starLord: "Rahu", subLord: "Jupiter" });
    expect(kpSeedSegment(48).start).toBeCloseTo(60 + 8 + 40 / 60, 7);
  });
});

describe("KP New ayanamsa conversion recorded by the installed corpus", () => {
  it("adds exactly 6 arcminutes to Lahiri longitudes and subtracts it from the ayanamsa", () => {
    expect(kpLongitudeFromLahiri(123)).toBeCloseTo(123.1, 10);
    expect(kpAyanamsaFromLahiri(24)).toBeCloseTo(23.9, 10);
    expect(kpLongitudeFromLahiri(359.95)).toBeCloseTo(0.05, 10);
  });
  it("allows the correction to cross a KP subdivision boundary", () => {
    const boundary = KP_249_SEGMENTS[1].start;
    expect(kpSubdivision(boundary - 0.05).subLord).not.toBe(kpSubdivision(kpLongitudeFromLahiri(boundary - 0.05)).subLord);
  });
  it("recalculates Vimshottari periods when the 6′ Moon correction crosses a nakshatra boundary", () => {
    const boundaryChart = calculateChart({
      name: "KP Moon boundary", date: "2026-08-29", time: "18:04", latitude: 17.385, longitude: 78.4867,
      timezone: "Asia/Kolkata", timezoneOffset: 5.5, place: "Hyderabad", language: "en",
      methodology: "kp", focus: "general", birthTimeAccuracyMinutes: 1,
    });
    const moon = boundaryChart.placements.find((item) => item.name === "Moon")!;
    const span = 360 / 27;
    moon.longitude = span - 0.05;
    moon.sign = 0;
    moon.degree = moon.longitude;
    const periods = calculateKpOperatingPeriods(boundaryChart);
    expect(periods.kpMoonLongitude).toBeCloseTo(span + 0.05, 10);
    expect(periods.nakshatraIndex).toBe(1);
    expect(periods.birthLord).toBe("Venus");
    expect(periods.current.mahadasha).toBe("Venus");
  });
});

describe("Prashna Nadi house significations", () => {
  it("applies the source node sequence without assigning sign lordship to Rahu or Ketu", () => {
    const cusps = Array.from({ length: 12 }, (_, index) => ({ house: index + 1, kpSiderealLongitude: index * 30 }));
    const values = calculateNadiHouseSignifications([
      { name: "Rahu", longitude: 65, sign: 2 },
      { name: "Mercury", longitude: 70, sign: 2 },
      { name: "Jupiter", longitude: 305, sign: 10 },
    ], cusps);
    expect(values.find((item) => item.planet === "Mercury")).toMatchObject({ occupiedHouse: 3, ownedHouses: [3, 6] });
    expect(values.find((item) => item.planet === "Rahu")).toMatchObject({
      occupiedHouse: 3,
      ownedHouses: [],
      signifiedHouses: [3, 6, 9, 11, 12],
      representatives: [
        { planet: "Mercury", reason: "conjoined" },
        { planet: "Jupiter", reason: "aspecting" },
      ],
    });
  });
});

describe("KP Reader VI ruling planets", () => {
  it("includes node agents, rejects candidates in a retrograde planet's star, and never treats a node as retrograde", () => {
    const rows = [
      { name: "Sun", longitude: 110, sign: 3 },
      { name: "Moon", longitude: 10, sign: 0 },
      { name: "Mars", longitude: 40, sign: 1 },
      { name: "Mercury", longitude: 80, sign: 2, retrograde: true },
      { name: "Jupiter", longitude: 130, sign: 4 },
      { name: "Venus", longitude: 160, sign: 5 },
      { name: "Saturn", longitude: 200, sign: 6 },
      { name: "Rahu", longitude: 125, sign: 4, retrograde: true },
      { name: "Ketu", longitude: 305, sign: 10, retrograde: true },
      { name: "Lagna", longitude: 20, sign: 0 },
    ] as const;
    const result = calculateKpRulingPlanets([...rows], "Sunday");
    expect(result.find((item) => item.planet === "Sun")).toMatchObject({ status: "rejected-retrograde-star-lord", starLord: "Mercury" });
    expect(result.find((item) => item.planet === "Rahu")).toMatchObject({
      status: "selected",
      includedAsNodeAgentOf: ["Sun"],
    });
    expect(result.flatMap((item) => item.roles)).not.toContain("Lagna sub lord");
    expect(result.flatMap((item) => item.roles)).not.toContain("Moon sub lord");
  });
  it("reproduces the trunk-call core roles while exposing the example's omitted node agents", () => {
    const result = calculateKpRulingPlanets([
      { name: "Sun", longitude: 154 + 28 / 60, sign: 5 },
      { name: "Moon", longitude: 271 + 52 / 60, sign: 9 },
      { name: "Mars", longitude: 246 + 29 / 60, sign: 8 },
      { name: "Mercury", longitude: 170, sign: 5, retrograde: true },
      { name: "Jupiter", longitude: 160 + 17 / 60, sign: 5 },
      { name: "Venus", longitude: 124 + 14 / 60, sign: 4 },
      { name: "Saturn", longitude: 14 + 40 / 60, sign: 0, retrograde: true },
      { name: "Rahu", longitude: 322 + 55 / 60, sign: 10 },
      { name: "Ketu", longitude: 123 + 20 / 60, sign: 4 },
      { name: "Lagna", longitude: 200 + 22 / 60, sign: 6 },
    ], "Sunday");
    const core = result.filter((item) => item.roles.some((role) => !role.includes("node agent"))).map((item) => item.planet);
    expect(new Set(core)).toEqual(new Set(["Sun", "Saturn", "Venus", "Jupiter"]));
    expect(result.find((item) => item.planet === "Rahu")?.includedAsNodeAgentOf).toContain("Saturn");
    expect(result.find((item) => item.planet === "Ketu")?.includedAsNodeAgentOf).toContain("Sun");
    expect(KP_SOURCE_CONFLICTS).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "reader-vi-trunk-call-node-agent-omission" }),
      expect.objectContaining({ id: "reader-vi-number-203-ayanamsa-ocr" }),
    ]));
  });
});

describe("KP Reader VI node representation", () => {
  it("preserves conjunct → star-lord → aspecting → sign-lord precedence", () => {
    const result = calculateKpNodeRepresentatives("Rahu", [
      { name: "Rahu", longitude: 65, sign: 2 },
      { name: "Venus", longitude: 70, sign: 2 },
      { name: "Mars", longitude: 40, sign: 1 },
      { name: "Jupiter", longitude: 305, sign: 10 },
      { name: "Mercury", longitude: 170, sign: 5 },
    ]);
    expect(result).toEqual([
      { planet: "Venus", reason: "conjoined", precedence: 1 },
      { planet: "Mars", reason: "star-lord", precedence: 2 },
      { planet: "Jupiter", reason: "aspecting", precedence: 3 },
      { planet: "Mercury", reason: "sign-lord", precedence: 4 },
    ]);
  });
  it("deduplicates a planet at its strongest applicable precedence", () => {
    const result = calculateKpNodeRepresentatives("Rahu", [
      { name: "Rahu", longitude: 65, sign: 2 },
      { name: "Mercury", longitude: 70, sign: 2 },
      { name: "Mars", longitude: 40, sign: 1 },
    ]);
    expect(result.filter((item) => item.planet === "Mercury")).toEqual([
      { planet: "Mercury", reason: "conjoined", precedence: 1 },
    ]);
  });
});

describe("KP Reader VI event-house combinations", () => {
  it("keeps promise houses and adverse houses distinct", () => {
    expect(Object.keys(KP_EVENT_HOUSE_RULES)).toHaveLength(14);
    expect(evaluateKpHouseCombination("marriage:first", [2, 7, 11])).toMatchObject({ status: "matched", missingRequired: [], matchedAdverse: [] });
    expect(evaluateKpHouseCombination("marriage:first", [2, 7, 10, 11])).toMatchObject({ status: "mixed", matchedAdverse: [10] });
    expect(evaluateKpHouseCombination("marriage:first", [2, 11])).toMatchObject({ status: "not-matched", missingRequired: [7] });
    expect(evaluateKpHouseCombination("career:employment-viswanath", [2, 6, 10, 11])).toMatchObject({ status: "matched", missingRequired: [] });
    expect(evaluateKpHouseCombination("career:employment-viswanath", [2, 6, 10])).toMatchObject({ status: "not-matched", missingRequired: [11] });
  });
  it("distinguishes explicit either/or cuspal predicates from all-house event sets", () => {
    expect(evaluateKpHouseCombination("travel:foreign-cusp", [12])).toMatchObject({ status: "matched", requiredMode: "any" });
    expect(evaluateKpHouseCombination("health:cure", [5, 6])).toMatchObject({ status: "mixed", matchedRequired: [5], matchedAdverse: [6] });
    expect(evaluateKpHouseCombination("education:college-admission-cusp", [4])).toMatchObject({ status: "not-matched", missingRequired: [11] });
  });
  it("encodes recovery and non-recovery as opposing axes rather than duplicate votes", () => {
    expect(evaluateKpHouseCombination("lost-property:recovery", [2, 6, 11])).toMatchObject({ status: "matched" });
    expect(evaluateKpHouseCombination("lost-property:recovery", [2, 5, 6, 8, 11, 12])).toMatchObject({
      status: "mixed", matchedAdverse: [5, 8, 12],
    });
  });
  it("evaluates operating Dasa-Bhukti-Antara as a collective event portfolio", () => {
    const periodChart = calculateChart({
      name: "KP periods", date: "2026-08-29", time: "18:04", latitude: 17.385, longitude: 78.4867,
      timezone: "Asia/Kolkata", timezoneOffset: 5.5, place: "Hyderabad", language: "en",
      methodology: "kp", focus: "general", birthTimeAccuracyMinutes: 1,
    });
    const preview = calculateKpPreview(periodChart, 203);
    preview.operatingPeriods.current = { mahadasha: "Sun", antardasha: "Moon", pratyantardasha: "Mars" };
    preview.significators.find((item) => item.planet === "Sun")!.signifiedHouses = [3];
    preview.significators.find((item) => item.planet === "Moon")!.signifiedHouses = [9];
    preview.significators.find((item) => item.planet === "Mars")!.signifiedHouses = [12];
    expect(calculateKpOperatingPeriodActivation(periodChart, preview, "travel:foreign")).toMatchObject({
      status: "active-candidate", combinedHouses: [3, 9, 12], timingStatus: "current-period-structure-only",
      levels: [
        { level: "dasa", planet: "Sun", contributesRequired: true },
        { level: "bhukti", planet: "Moon", contributesRequired: true },
        { level: "antara", planet: "Mars", contributesRequired: true },
      ],
    });
    preview.significators.find((item) => item.planet === "Mars")!.signifiedHouses = [4, 12];
    expect(calculateKpOperatingPeriodActivation(periodChart, preview, "travel:foreign").status).toBe("active-mixed");
    preview.significators.find((item) => item.planet === "Mars")!.signifiedHouses = [4];
    expect(calculateKpOperatingPeriodActivation(periodChart, preview, "travel:foreign").status).toBe("not-active");
    preview.significators.find((item) => item.planet === "Mars")!.signifiedHouses = [12];
    preview.planets.find((item) => item.name === "Mars")!.starLord = "Sun";
    preview.planets.find((item) => item.name === "Mars")!.retrograde = true;
    const delayed = calculateKpOperatingPeriodActivation(periodChart, preview, "travel:foreign");
    expect(delayed.status).toBe("active-candidate");
    expect(delayed.levels.find((item) => item.planet === "Mars")?.retrogradeGate).toBe("delayed-period-lord-retrograde");
    preview.planets.find((item) => item.name === "Mars")!.retrograde = false;
    preview.planets.find((item) => item.name === "Sun")!.starLord = "Saturn";
    preview.planets.find((item) => item.name === "Saturn")!.retrograde = true;
    expect(calculateKpOperatingPeriodActivation(periodChart, preview, "travel:foreign").status).toBe("blocked-retrograde-star-lord");
  });
  it("finds only future conjoined periods common to ruling planets and event significators", () => {
    const periodChart = calculateChart({
      name: "KP future periods", date: "2026-08-29", time: "18:04", latitude: 17.385, longitude: 78.4867,
      timezone: "Asia/Kolkata", timezoneOffset: 5.5, place: "Hyderabad", language: "en",
      methodology: "kp", focus: "general", birthTimeAccuracyMinutes: 1,
    });
    const preview = calculateKpPreview(periodChart, 203);
    preview.rulingPlanets = (["Sun", "Moon", "Mars"] as const).map((planet) => ({
      planet, roles: ["fixture"], includedAsNodeAgentOf: [], status: "selected" as const, starLord: "Sun" as const,
    }));
    preview.planets.forEach((item) => { item.retrograde = false; });
    preview.significators.find((item) => item.planet === "Sun")!.signifiedHouses = [3];
    preview.significators.find((item) => item.planet === "Moon")!.signifiedHouses = [9];
    preview.significators.find((item) => item.planet === "Mars")!.signifiedHouses = [12];
    const from = preview.operatingPeriods.timeline[0].startJulianDay;
    const result = calculateKpConjoinedPeriodCandidates(preview, "travel:foreign", from);
    expect(result.status).toBe("period-candidates-found");
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.every((candidate) =>
      Object.values(candidate.lords).every((lord) => ["Sun", "Moon", "Mars"].includes(lord))
      && candidate.levels.every((level) => level.contributesRequired && level.isRulingPlanet)
      && candidate.transitPinning === "required"
      && candidate.startJulianDay >= from,
    )).toBe(true);
    preview.rulingPlanets = preview.rulingPlanets.filter((item) => item.planet !== "Mars");
    expect(calculateKpConjoinedPeriodCandidates(preview, "travel:foreign", from).candidates).toEqual([]);
  });
});

describe("KP Reader VI transit pinning evidence", () => {
  const historicalChart = (date: string, time: string) => calculateChart({
    name: "Reader VI transit", date, time, latitude: 19.076, longitude: 72.8777,
    timezone: "Asia/Kolkata", timezoneOffset: 5.5, place: "Bombay", language: "en",
    methodology: "kp", focus: "general", birthTimeAccuracyMinutes: 1,
  });
  it("uses Sun, Moon and Lagna at date, day and clock-time scales", () => {
    expect(evaluateKpTransitPinning("date", 0, []).body).toBe("Sun");
    expect(evaluateKpTransitPinning("day", 0, []).body).toBe("Moon");
    expect(evaluateKpTransitPinning("clock-time", 0, []).body).toBe("Lagna");
  });
  it("registers unique, non-empty worked-example patterns and named conflicts", () => {
    expect(new Set(KP_EVENT_TRANSIT_PATTERNS.map((item) => item.id)).size).toBe(KP_EVENT_TRANSIT_PATTERNS.length);
    expect(KP_EVENT_TRANSIT_PATTERNS).toHaveLength(8);
    for (const entry of KP_EVENT_TRANSIT_PATTERNS) expect(Object.keys(entry.pattern).length).toBeGreaterThan(0);
    for (const entry of KP_EVENT_TRANSIT_PATTERNS.filter((item) => item.reproductionStatus === "astronomy-conflict"))
      expect(KP_SOURCE_CONFLICTS.some((conflict) => conflict.id === entry.conflictId)).toBe(true);
    expect(() => registeredKpTransitPattern("not-installed")).toThrow(/Unknown KP event/);
  });
  it("reproduces the vehicle example's Venus-sign, Mars-star, Ketu-sub transit pattern as evidence", () => {
    const segment = KP_249_SEGMENTS.find((item) =>
      item.sign === 6 && item.starLord === "Mars" && item.subLord === "Ketu",
    )!;
    const result = evaluateKpTransitPinning("date", segment.midpoint, ["Venus", "Mars", "Ketu"]);
    expect(result.levels.slice(0, 3)).toMatchObject([
      { level: "sign", lord: "Venus", eligible: true },
      { level: "star", lord: "Mars", eligible: true },
      { level: "sub", lord: "Ketu", eligible: true },
    ]);
    expect(result).toMatchObject({ status: "alignment-evidence", decision: "human-or-example-specific-review-required" });
  });
  it("does not turn absence of eligible rulers into a transit match", () => {
    expect(evaluateKpTransitPinning("date", 0, ["Venus"])).toMatchObject({
      status: "no-alignment", matchedLevels: [], matchedLords: [],
    });
  });
  it("reproduces the dated vehicle-disposal Moon and ascendant refinements", () => {
    const noon = historicalChart("1969-06-23", "12:00");
    const moon = noon.placements.find((item) => item.name === "Moon")!;
    expect(matchKpTransitRulerPattern("day", kpLongitudeFromLahiri(moon.longitude), { star: "Moon" }).status).toBe("pattern-matched");

    const handover = historicalChart("1969-06-23", "15:30");
    const lagna = handover.placements.find((item) => item.name === "Lagna")!;
    const result = matchKpTransitRulerPattern("clock-time", kpLongitudeFromLahiri(lagna.longitude), {
      sign: "Venus", star: "Rahu", sub: "Sun",
    });
    expect(result.status).toBe("pattern-matched");
    expect(result.kpSiderealLongitude).toBeCloseTo(180 + 18, 0);
    expect(matchRegisteredKpTransitPattern(
      "reader-vi-vehicle-disposal-1969-clock",
      kpLongitudeFromLahiri(lagna.longitude),
    ).match.status).toBe("pattern-matched");
  });
  it("checks the registered medicine-receipt Moon pattern at its printed instant", () => {
    const chart = historicalChart("1969-09-15", "14:39");
    const moon = chart.placements.find((item) => item.name === "Moon")!;
    const result = matchRegisteredKpTransitPattern(
      "reader-vi-medicine-receipt-1969-moon",
      kpLongitudeFromLahiri(moon.longitude),
    );
    expect(result.match.checks).toMatchObject([
      { level: "sign", expectedLord: "Venus", matched: true },
      { level: "star", expectedLord: "Rahu", matched: true },
      { level: "sub", expectedLord: "Jupiter", actualLord: "Saturn", matched: false },
      { level: "sub-sub", expectedLord: "Venus", matched: true },
    ]);
    expect(result.match.status).toBe("pattern-not-matched");
    expect(KP_SOURCE_CONFLICTS).toContainEqual(expect.objectContaining({ id: "reader-vi-medicine-1969-moon-sub" }));
  });
  it("preserves the trunk-call printed longitude and civil-time astronomy conflict", () => {
    const pattern = { sign: "Venus", star: "Jupiter", sub: "Sun", "sub-sub": "Venus" } as const;
    expect(matchRegisteredKpTransitPattern(
      "reader-vi-trunk-call-1969-clock", 180 + 29 + 20 / 60,
    ).match.status).toBe("pattern-matched");
    const chart = calculateChart({
      name: "Reader VI trunk call", date: "1969-09-21", time: "09:41",
      latitude: 7 + 28 / 60, longitude: 80 + 27 / 60, timezone: "Asia/Colombo",
      timezoneOffset: 5.5, place: "Matale", language: "en", methodology: "kp",
      focus: "general", birthTimeAccuracyMinutes: 1,
    });
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    expect(matchRegisteredKpTransitPattern(
      "reader-vi-trunk-call-1969-clock", kpLongitudeFromLahiri(lagna.longitude),
    ).match).toMatchObject({
      status: "pattern-not-matched",
      checks: [
        { level: "sign", expectedLord: "Venus", actualLord: "Venus", matched: true },
        { level: "star", expectedLord: "Jupiter", actualLord: "Jupiter", matched: true },
        { level: "sub", expectedLord: "Sun", actualLord: "Moon", matched: false },
        { level: "sub-sub", expectedLord: "Venus", actualLord: "Rahu", matched: false },
      ],
    });
    const search = searchRegisteredKpTransitPatternBetween(
      "reader-vi-trunk-call-1969-clock", chart.engine.julianDay - 6 / 1440,
      chart.engine.julianDay + 4 / 1440,
      { latitude: 7 + 28 / 60, longitude: 80 + 27 / 60 }, 0.25,
    );
    expect(search.search.windows).toHaveLength(1);
    expect(search.search.windows[0]).toMatchObject({ ingress: "refined", egress: "refined" });
    expect(search.search.windows[0].refinedEndJulianDay).toBeLessThan(chart.engine.julianDay);
    expect(search.search.boundaryToleranceMinutes).toBe(0.25);
    expect(KP_SOURCE_CONFLICTS).toContainEqual(expect.objectContaining({ id: "reader-vi-trunk-call-1969-lagna-timing" }));
    expect(matchKpTransitRulerPattern("clock-time", 180 + 29 + 20 / 60, pattern).status).toBe("pattern-matched");
  });
  it("reproduces the friend-arrival printed longitude and 1:48 PM Bombay window", () => {
    const printed = matchRegisteredKpTransitPattern(
      "reader-vi-friend-arrival-1969-clock", 30 + 22 + 50 / 60,
    );
    expect(printed.match).toMatchObject({
      status: "pattern-matched",
      checks: [
        { level: "sign", expectedLord: "Venus", actualLord: "Venus", matched: true },
        { level: "star", expectedLord: "Moon", actualLord: "Moon", matched: true },
        { level: "sub", expectedLord: "Sun", actualLord: "Sun", matched: true },
        { level: "sub-sub", expectedLord: "Rahu", actualLord: "Rahu", matched: true },
      ],
    });
    const chart = historicalChart("1969-02-09", "13:48");
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    expect(matchRegisteredKpTransitPattern(
      "reader-vi-friend-arrival-1969-clock", kpLongitudeFromLahiri(lagna.longitude),
    ).match.status).toBe("pattern-matched");
    const search = searchRegisteredKpTransitPatternBetween(
      "reader-vi-friend-arrival-1969-clock", chart.engine.julianDay - 5 / 1440,
      chart.engine.julianDay + 5 / 1440, { latitude: 19.076, longitude: 72.8777 }, 0.25,
    );
    expect(search.search.windows).toHaveLength(1);
    expect(search.search.windows[0]).toMatchObject({ ingress: "refined", egress: "refined" });
    expect(search.search.windows[0].refinedStartJulianDay).toBeLessThanOrEqual(chart.engine.julianDay);
    expect(search.search.windows[0].refinedEndJulianDay).toBeGreaterThanOrEqual(chart.engine.julianDay);
    expect(search.search.boundaryToleranceMinutes).toBe(0.25);
  });
  it("reproduces the messenger-return civil time while preserving its printed-longitude mismatch", () => {
    expect(matchRegisteredKpTransitPattern(
      "reader-vi-messenger-return-1968-clock", 30 + 2.5,
    ).match).toMatchObject({
      status: "pattern-not-matched",
      checks: expect.arrayContaining([
        expect.objectContaining({ level: "sub", expectedLord: "Saturn", actualLord: "Jupiter", matched: false }),
        expect.objectContaining({ level: "sub-sub", expectedLord: "Mercury", actualLord: "Moon", matched: false }),
      ]),
    });
    const chart = calculateChart({
      name: "Reader VI messenger", date: "1968-12-13", time: "16:00",
      latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata", timezoneOffset: 5.5,
      place: "Madras", language: "en", methodology: "kp", focus: "general", birthTimeAccuracyMinutes: 1,
    });
    const lagna = chart.placements.find((item) => item.name === "Lagna")!;
    expect(matchRegisteredKpTransitPattern(
      "reader-vi-messenger-return-1968-clock", kpLongitudeFromLahiri(lagna.longitude),
    ).match.status).toBe("pattern-matched");
    const search = searchRegisteredKpTransitPatternBetween(
      "reader-vi-messenger-return-1968-clock", chart.engine.julianDay - 5 / 1440,
      chart.engine.julianDay + 5 / 1440, { latitude: 13.0827, longitude: 80.2707 }, 0.25,
    );
    expect(search.search.windows).toHaveLength(1);
    expect(search.search.windows[0].refinedStartJulianDay).toBeLessThanOrEqual(chart.engine.julianDay);
    expect(search.search.windows[0].refinedEndJulianDay).toBeGreaterThanOrEqual(chart.engine.julianDay);
    expect(KP_SOURCE_CONFLICTS).toContainEqual(expect.objectContaining({ id: "reader-vi-messenger-1968-printed-longitude" }));
  });
  it("records rather than conceals the two dated Sun-pattern astronomy conflicts", () => {
    const purchase = historicalChart("1974-10-18", "12:00").placements.find((item) => item.name === "Sun")!;
    expect(matchKpTransitRulerPattern("date", kpLongitudeFromLahiri(purchase.longitude), {
      sign: "Venus", star: "Mars", sub: "Ketu",
    })).toMatchObject({
      status: "pattern-not-matched",
      checks: expect.arrayContaining([expect.objectContaining({ level: "sub", expectedLord: "Ketu", actualLord: "Mercury", matched: false })]),
    });
    const foreign = historicalChart("1971-04-28", "12:00").placements.find((item) => item.name === "Sun")!;
    expect(matchKpTransitRulerPattern("date", kpLongitudeFromLahiri(foreign.longitude), {
      sign: "Mars", star: "Ketu", sub: "Saturn",
    }).status).toBe("pattern-not-matched");
    expect(KP_SOURCE_CONFLICTS).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "reader-vi-vehicle-1974-sun-sub" }),
      expect.objectContaining({ id: "reader-vi-foreign-1971-sun-star" }),
    ]));
  });
  it("searches only explicit patterns and reports sample resolution", () => {
    const segment = KP_249_SEGMENTS.find((item) => item.sign === 6 && item.starLord === "Mars" && item.subLord === "Ketu")!;
    const search = searchKpTransitRulerPattern("date", [
      { julianDay: 2, kpSiderealLongitude: 0 },
      { julianDay: 1, kpSiderealLongitude: segment.midpoint },
    ], { sign: "Venus", star: "Mars", sub: "Ketu" });
    expect(search).toMatchObject({ status: "sample-matches-found", sampledPoints: 2 });
    expect(search.matches.map((item) => item.julianDay)).toEqual([1]);
    expect(() => matchKpTransitRulerPattern("date", 0, {})).toThrow();
  });
  it("searches the shared historical ephemeris and recovers the 1969 disposal refinements", () => {
    const day = historicalChart("1969-06-23", "00:00").engine.julianDay;
    const moonSearch = searchKpTransitRulerPatternBetween("day", day, day + 1, { star: "Moon" }, undefined, 60);
    expect(moonSearch.matches.length).toBeGreaterThan(0);
    expect(moonSearch.resolutionMinutes).toBe(60);

    const hourStart = historicalChart("1969-06-23", "15:00").engine.julianDay;
    const lagnaSearch = searchKpTransitRulerPatternBetween(
      "clock-time", hourStart, hourStart + 1 / 24,
      { sign: "Venus", star: "Rahu", sub: "Sun" },
      { latitude: 19.076, longitude: 72.8777 }, 1,
    );
    expect(lagnaSearch.matches.some((item) => Math.abs(item.julianDay - historicalChart("1969-06-23", "15:30").engine.julianDay) < 2 / 1440)).toBe(true);
    expect(lagnaSearch.boundaryToleranceMinutes).toBe(1);
    const completeWindow = lagnaSearch.windows.find((window) => window.ingress === "refined" && window.egress === "refined")!;
    expect(completeWindow).toBeDefined();
    const before = searchKpTransitRulerPatternBetween(
      "clock-time", completeWindow.refinedStartJulianDay - 2 / 1440, completeWindow.refinedStartJulianDay + 2 / 1440,
      { sign: "Venus", star: "Rahu", sub: "Sun" }, { latitude: 19.076, longitude: 72.8777 }, 1,
    );
    expect(before.matches.length).toBeGreaterThan(0);
    expect(before.sampledPoints).toBeGreaterThan(before.matches.length);
    const inside = (completeWindow.refinedStartJulianDay + completeWindow.refinedEndJulianDay) / 2;
    const clipped = searchKpTransitRulerPatternBetween(
      "clock-time", inside, completeWindow.refinedEndJulianDay + 2 / 1440,
      { sign: "Venus", star: "Rahu", sub: "Sun" }, { latitude: 19.076, longitude: 72.8777 }, 1,
    );
    expect(clipped.windows[0]).toMatchObject({ ingress: "interval-truncated", egress: "refined" });
    const registered = searchRegisteredKpTransitPatternBetween(
      "reader-vi-vehicle-disposal-1969-clock", hourStart, hourStart + 1 / 24,
      { latitude: 19.076, longitude: 72.8777 }, 1,
    );
    expect(registered.entry.reproductionStatus).toBe("reproduced");
    expect(registered.search.windows.length).toBeGreaterThan(0);
    expect(() => searchKpTransitRulerPatternBetween("clock-time", day, day + 1 / 24, { sub: "Sun" })).toThrow();
    expect(() => searchKpTransitRulerPatternBetween("date", day, day + 100, { star: "Moon" }, undefined, 1)).toThrow(/50,000/);
  });
});

describe("KP Placidus cusp calculation", () => {
  const chart = calculateChart({
    name: "KP cusp fixture", date: "2026-08-29", time: "18:04",
    latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata", timezoneOffset: 5.5,
    place: "Hyderabad", language: "en", methodology: "kp", focus: "general", birthTimeAccuracyMinutes: 1,
  });
  it("returns twelve finite cusps with exact oppositions and the chart ascendant anchor", () => {
    const result = calculateKpPlacidusCusps(chart);
    expect(result.status).toBe("computed-verified");
    expect(result.cusps).toHaveLength(12);
    expect(result.cusps[0].kpSiderealLongitude).toBeCloseTo((result.cusps[0].tropicalLongitude - kpAyanamsaFromLahiri(chart.engine.ayanamsaDegrees) + 360) % 360, 9);
    for (let index = 0; index < 6; index++)
      expect((result.cusps[index + 6].tropicalLongitude - result.cusps[index].tropicalLongitude + 360) % 360).toBeCloseTo(180, 7);
    expect(result.cusps.every((cusp) => Number.isFinite(cusp.kpSiderealLongitude) && cusp.kpSiderealLongitude >= 0 && cusp.kpSiderealLongitude < 360)).toBe(true);
  });
  it("reproduces an independent Swiss Ephemeris Placidus vector", () => {
    const result = calculateKpPlacidusCusps(chart);
    const swissTropical = [
      328.8001202301, 5.6543291505, 38.6370877002, 66.5740525692,
      91.9478038409, 118.1319600458, 148.8001202301, 185.6543291505,
      218.6370877002, 246.5740525692, 271.9478038409, 298.1319600458,
    ];
    result.cusps.forEach((cusp, index) =>
      expect(Math.abs(cusp.tropicalLongitude - swissTropical[index]), `cusp ${index + 1}`).toBeLessThan(0.0001),
    );
  });
  it("reproduces Reader VI number 203 cusps from the beginning of the selected sub", () => {
    const sourceChart = structuredClone(chart);
    sourceChart.input.latitude = 18 + 55 / 60;
    // The OCR near this example reads 25°20′, but Reader VI's preceding 1970
    // convention and the printed Aquarius 16° ascendant both require 23°20′.
    // The engine stores Lahiri, from which the installed KP convention subtracts 6′.
    sourceChart.engine.ayanamsaDegrees = 23 + 26 / 60;
    const result = calculateKpNumberedHoraryCusps(sourceChart, kpSeedSegment(203).start);
    expect(result.status).toBe("computed-verified");
    expect(result.cusps[0].kpSiderealLongitude).toBeCloseTo(270 + 22 + 40 / 60, 7);
    const printedTropical = [
      316,
      330 + 22 + 25 / 60,
      27 + 25 / 60,
      30 + 26 + 25 / 60,
      60 + 22 + 25 / 60,
      90 + 17 + 25 / 60,
    ];
    result.cusps.slice(0, 6).forEach((cusp, index) => {
      const error = Math.abs(((cusp.tropicalLongitude - printedTropical[index] + 540) % 360) - 180);
      expect(error, `Reader VI number 203 cusp ${index + 1}`).toBeLessThan(0.5);
    });
  });
  it.each([
    // Generated independently with pyswisseph 2.10.03 (Python package
    // build 20230604), swe.houses_ex(..., b"P", swe.FLG_SWIEPH).
    {
      name: "London J2000", date: "2000-01-01", time: "12:00", latitude: 51.5074, longitude: -0.1278,
      expected: [24.0145904408,61.01297153,81.9114215731,99.4932253032,118.9135352235,147.485487315,204.0145904408,241.01297153,261.9114215731,279.4932253032,298.9135352235,327.485487315],
    },
    {
      name: "Sydney 1985", date: "1985-06-15", time: "03:30", latitude: -33.8688, longitude: 151.2093,
      expected: [205.7012027063,238.6633677303,263.2653324605,285.7365912862,310.5235663895,342.6511320601,25.7012027063,58.6633677303,83.2653324605,105.7365912862,130.5235663895,162.6511320601],
    },
    {
      name: "Quito equator 2020", date: "2020-03-20", time: "18:00", latitude: -0.1807, longitude: -78.4678,
      expected: [99.3538070703,127.8030900491,158.6246036611,191.1550122435,222.6853287605,251.7261289158,279.3538070703,307.8030900491,338.6246036611,11.1550122435,42.6853287605,71.7261289158],
    },
    {
      name: "Reykjavik high latitude 2010", date: "2010-12-01", time: "06:00", latitude: 64.1466, longitude: -21.9426,
      expected: [207.4112141171,231.9002074448,267.2019092642,315.5905583644,349.9828737905,12.3006529999,27.4112141171,51.9002074448,87.2019092642,135.5905583644,169.9828737905,192.3006529999],
    },
    {
      name: "New York 1950", date: "1950-07-04", time: "22:00", latitude: 40.7128, longitude: -74.006,
      expected: [249.7321449613,283.0597689929,321.746222284,358.1823599031,27.2340281247,50.1022384391,69.7321449613,103.0597689929,141.746222284,178.1823599031,207.2340281247,230.1022384391],
    },
  ])("matches Swiss Ephemeris across $name", ({ name, date, time, latitude, longitude, expected }) => {
    const referenceChart = calculateChart({
      name, date, time, latitude, longitude, timezone: "UTC", timezoneOffset: 0,
      place: name, language: "en", methodology: "kp", focus: "general", birthTimeAccuracyMinutes: 1,
    });
    const result = calculateKpPlacidusCusps(referenceChart);
    expect(result.status).toBe("computed-verified");
    result.cusps.forEach((cusp, index) => {
      const error = Math.abs(((cusp.tropicalLongitude - expected[index] + 540) % 360) - 180);
      expect(error, `${name} cusp ${index + 1}`).toBeLessThan(0.00015);
    });
  });
  it("abstains when Placidus semi-arcs do not exist at a polar latitude", () => {
    const polar = { ...chart, input: { ...chart.input, latitude: 89 } };
    expect(calculateKpPlacidusCusps(polar)).toMatchObject({ status: "unsupported-polar", cusps: [] });
  });
  it("binds only explicitly sourced cuspal predicates to their required cusps", () => {
    const preview = calculateKpPreview(chart);
    expect(preview.cuspalEventEvaluations.status).toBe("computed-source-located");
    expect(preview.cuspalEventEvaluations.values.map((item) => item.cusp).sort((a, b) => a - b)).toEqual([4, 10, 11, 12]);
    for (const row of preview.cuspalEventEvaluations.values) {
      expect(row.cuspSubLord).toBeTruthy();
      expect(row.cuspSubLordStarLord).toBeTruthy();
      expect(["clear", "blocked-sub-lord-retrograde", "blocked-star-lord-retrograde"]).toContain(row.retrogradeGate);
      expect(row.evaluation.locator).toContain("Reader VI");
    }
  });
  it("anchors a numbered-horary preview to the beginning of the selected sub", () => {
    const preview = calculateKpPreview(chart, 203);
    expect(preview.horary).toMatchObject({ ascendantAnchor: "beginning-of-selected-sub", selectedSeed: { number: 203 } });
    expect(preview.cusps.values[0].kpSiderealLongitude).toBeCloseTo(kpSeedSegment(203).start, 7);
    expect(preview.planets.find((item) => item.name === "Lagna")?.longitude).toBeCloseTo(kpSeedSegment(203).start, 7);
  });
});

describe("KP certification quarantine", () => {
  const quarantineChart = calculateChart({
    name: "Quarantine", date: "2000-01-28", time: "08:05",
    latitude: 16.1026, longitude: 81.7634, timezone: "Asia/Kolkata", timezoneOffset: 5.5,
    place: "Ravulapalem", language: "en", methodology: "kp", focus: "general", birthTimeAccuracyMinutes: 5,
  });
  it("labels every preview structural and never certified", () => {
    const preview = calculateKpPreview(quarantineChart);
    expect(preview.certification).toMatchObject({
      status: "structural-preview",
      systemCertification: "pending-independent-certification",
      reviewStatus: "draft-unreviewed",
    });
    expect(preview.rulebook.reviewStatus).toBe("draft-unreviewed");
    expect(preview.safety.status).toBe("research-preview");
  });
  it("never emits certainty language in the serialized preview", () => {
    const text = JSON.stringify(calculateKpPreview(quarantineChart)).toLowerCase();
    for (const banned of ["guaranteed", "certain outcome", "will happen", "definitely", "100%"])
      expect(text).not.toContain(banned);
  });
});
