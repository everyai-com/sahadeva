import { z } from "zod";
import { calculateChart, lahiriLongitudeAt } from "./jyotish";
import { jdToIso } from "./dashaCalendar";
import type { BirthInput, ChartResult, GrahaName } from "./schema";
import {
  safetyContract,
  scoreObservations,
  type ConsultationResult,
  type EvidenceObservation,
  type QuestionCategory,
} from "./consultation";
import { prashnaRuleProvenance } from "./prashnaRules";
import { matchRemedies } from "./remedies";
import {
  PRASHNA_CAPABILITIES,
  PRASHNA_HOUSES,
  PRASHNA_SOURCES,
  PRASHNA_TRADITIONS,
  PRASHNA_TOPIC_HOUSES,
  type PrashnaTradition,
} from "./prashnaRulebook";
import { calculateKpConjoinedPeriodCandidates, calculateKpOperatingPeriodActivation, calculateKpPreview, kpLongitudeFromLahiri, kpSeedSegment, kpSubdivision, type KpEventHouseRuleId } from "./kp";
import { tajakaCareerExchange, tajakaCareerKamboola, tajakaKamboola, tajakaObjectRealisationStanza113, tajakaRelation, tajakaTransferCandidates } from "./tajaka";
import { classicalLostObjectLocation } from "./classicalLocation";

export const prashnaRequestSchema = z.object({
  question: z.string().trim().min(3).max(500),
  category: z.enum([
    "career",
    "relationship",
    "money",
    "property",
    "travel",
    "lost-object",
    "health",
    "education",
    "litigation",
    "children",
    "missing-person",
    "general",
  ]),
  tradition: z.enum(PRASHNA_TRADITIONS).default("integrated"),
  seedNumber: z.number().int().min(1).max(249).optional(),
  referenceHouse: z.number().int().min(1).max(12).default(1),
  place: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z
    .string()
    .trim()
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Invalid IANA timezone"),
  language: z.enum(["en", "te"]).default("en"),
});
export type PrashnaRequest = z.infer<typeof prashnaRequestSchema>;
const LORDS: GrahaName[] = [
  "Mars",
  "Venus",
  "Mercury",
  "Moon",
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Saturn",
  "Jupiter",
];
const FIXED_BENEFICS = new Set<GrahaName>(["Jupiter", "Venus"]),
  FIXED_MALEFICS = new Set<GrahaName>(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);
const MOOLATRIKONA_SIGN: Partial<Record<GrahaName, number>> = {
  Sun: 4, Moon: 3, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10,
};
const CLASSICAL_PLANETS: GrahaName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const SIRSHODAYA_SIGNS = new Set([2, 4, 5, 6, 7, 10]);
const PRISHTODAYA_SIGNS = new Set([0, 1, 3, 8, 9]);
const MOVABLE_SIGNS = new Set([0, 3, 6, 9]);
const FIXED_SIGNS = new Set([1, 4, 7, 10]);
const UPACHAYA_HOUSES = new Set([3, 6, 10, 11]);
const houseFrom = (origin: number, target: number) =>
  ((target - origin + 12) % 12) + 1;

export function classicalUpachayaProsperity(
  chart: Pick<ChartResult, "placements">,
  lagnaSign: number,
  topic: "marriage" | "children",
) {
  const topicHouse = topic === "marriage" ? 7 : 5;
  const karaka: GrahaName = topic === "marriage" ? "Venus" : "Jupiter";
  const topicSign = (lagnaSign + topicHouse - 1) % 12;
  const topicLord = LORDS[topicSign];
  const karakaPlacement = chart.placements.find((item) => item.name === karaka);
  const lordPlacement = chart.placements.find((item) => item.name === topicLord);
  if (!karakaPlacement || !lordPlacement)
    return { matches: false, topicHouse, topicLord, karaka, karakaHouse: null, lordHouse: null };
  const karakaHouse = houseFrom(lagnaSign, karakaPlacement.sign);
  const lordHouse = houseFrom(lagnaSign, lordPlacement.sign);
  return {
    matches: UPACHAYA_HOUSES.has(karakaHouse) && UPACHAYA_HOUSES.has(lordHouse),
    topicHouse,
    topicLord,
    karaka,
    karakaHouse,
    lordHouse,
  };
}

const SILENT_QUERY_FAMILIES = {
  Dhatu: { signs: new Set([0, 4, 7]), planets: new Set<GrahaName>(["Sun", "Mars"]) },
  Moola: { signs: new Set([2, 5, 9, 10]), planets: new Set<GrahaName>(["Mercury", "Saturn"]) },
  Jeeva: { signs: new Set([1, 3, 6, 8, 11]), planets: new Set<GrahaName>(["Moon", "Jupiter", "Venus"]) },
} as const;

export const CLASSICAL_SILENT_QUERY_SIGN_LENGTHS = [
  "short", "short", "medium", "medium", "long", "long",
  "long", "long", "medium", "medium", "short", "short",
] as const;

export const CLASSICAL_SILENT_QUERY_PLANET_DESCRIPTORS = {
  Sun: { color: "red", shape: "square" },
  Moon: { color: "white", shape: "tall" },
  Mars: { color: "red", shape: "round" },
  Mercury: { color: "green", shape: "tall" },
  Jupiter: { color: "yellow", shape: "round" },
  Venus: { color: "white", shape: "thin" },
  Saturn: { color: "black", shape: "long" },
} as const;

type SilentQueryPlanet = keyof typeof CLASSICAL_SILENT_QUERY_PLANET_DESCRIPTORS;
const CLASSICAL_NATURAL_FRIENDS: Record<SilentQueryPlanet, readonly SilentQueryPlanet[]> = {
  Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"], Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"], Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"], Saturn: ["Mercury", "Venus"],
};
const CLASSICAL_NATURAL_ENEMIES: Record<SilentQueryPlanet, readonly SilentQueryPlanet[]> = {
  Sun: ["Venus", "Saturn"], Moon: [], Mars: ["Mercury"], Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"], Venus: ["Sun", "Moon"], Saturn: ["Sun", "Moon", "Mars"],
};

export function classicalSilentQueryVerses6To8(chart: ChartResult, lagnaSign: number) {
  if (!Number.isInteger(lagnaSign) || lagnaSign < 0 || lagnaSign > 11)
    throw new RangeError("lagnaSign must be an integer from 0 through 11");
  const d9 = chart.advanced.vargas.D9;
  const descriptorCandidates = CLASSICAL_PLANETS.map((rawPlanet) => {
    const planet = rawPlanet as SilentQueryPlanet;
    const d9Sign = d9.find((item) => item.name === planet)?.sign ?? null;
    const d9Lord = d9Sign === null ? null : LORDS[d9Sign] as SilentQueryPlanet;
    const relationship = d9Lord === null ? "unavailable" as const
      : d9Lord === planet ? "own" as const
        : CLASSICAL_NATURAL_FRIENDS[planet].includes(d9Lord) ? "friendly" as const
          : CLASSICAL_NATURAL_ENEMIES[planet].includes(d9Lord) ? "inimical" as const : "neutral" as const;
    const rank = relationship === "own" ? 3 : relationship === "friendly" ? 2 : relationship === "neutral" ? 1 : relationship === "inimical" ? 0 : null;
    return { planet, ...CLASSICAL_SILENT_QUERY_PLANET_DESCRIPTORS[planet], d9Sign, d9Lord, relationship, rank };
  });
  const complete = descriptorCandidates.every((item) => item.rank !== null);
  const bestRank = complete ? Math.max(...descriptorCandidates.map((item) => item.rank!)) : null;
  const leaders = bestRank === null ? [] : descriptorCandidates.filter((item) => item.rank === bestRank);
  const selected = leaders.length === 1 ? leaders[0] : null;
  return {
    lagnaSign,
    signLength: CLASSICAL_SILENT_QUERY_SIGN_LENGTHS[lagnaSign],
    descriptorCandidates,
    bestRank,
    leaders: leaders.map((item) => item.planet),
    selectedPlanet: selected?.planet ?? null,
    selectedDescriptor: selected ? { color: selected.color, shape: selected.shape } : null,
    selectionStatus: !complete ? "unavailable-d9" as const : selected ? "unique-local-navamsa-strength" as const : "tied-local-navamsa-strength" as const,
    notice: !complete
      ? "At least one classical planet lacks a D9 sign, so the Chapter X local-strength comparison abstains."
      : selected
        ? `${selected.planet} is the unique highest local Navamsa tier; no Shadbala tie-break was used.`
        : `Local Navamsa strength is tied between ${leaders.map((item) => item.planet).join(", ")}; no Shadbala tie-break is invented.`,
  };
}

export const CLASSICAL_SILENT_QUERY_SUBJECTS: Readonly<Record<number, readonly string[]>> = {
  1: ["self"],
  3: ["brother"],
  4: ["mother"],
  5: ["son"],
  6: ["sister", "enemy"],
  7: ["wife"],
  9: ["religion"],
  10: ["protector"],
};

export function classicalSilentQueryVerses3To4(chart: ChartResult, lagnaSign: number) {
  const strength = classicalSilentQueryVerses6To8(chart, lagnaSign);
  const selectedPlacement = strength.selectedPlanet
    ? chart.placements.find((item) => item.name === strength.selectedPlanet) ?? null
    : null;
  const selectedHouse = selectedPlacement ? houseFrom(lagnaSign, selectedPlacement.sign) : null;
  const subjectCandidates = selectedHouse === null ? [] : [...(CLASSICAL_SILENT_QUERY_SUBJECTS[selectedHouse] ?? [])];
  return {
    selectedPlanet: strength.selectedPlanet,
    strengthStatus: strength.selectionStatus,
    strengthLeaders: strength.leaders,
    selectedHouse,
    subjectCandidates,
    status: strength.selectedPlanet === null ? "unavailable-strength" as const
      : subjectCandidates.length === 0 ? "unmapped-house" as const
        : subjectCandidates.length > 1 ? "ambiguous-source-wording" as const : "classified" as const,
    sourceAmbiguity: selectedHouse === 6
      ? "The translation lists both sister and enemy after only one remaining house, the sixth; both are retained without invented precedence."
      : null,
  };
}

/** Daivajna Vallabha X.12–13, kept independent from Chappanna's Navamsa
 * sequence. The final mixed-kinds clause is exposed without forcing a winner. */
export function classicalSilentQueryVerses12To13(chart: ChartResult, lagnaSign: number) {
  const rows = (Object.entries(SILENT_QUERY_FAMILIES) as Array<[
    keyof typeof SILENT_QUERY_FAMILIES,
    (typeof SILENT_QUERY_FAMILIES)[keyof typeof SILENT_QUERY_FAMILIES],
  ]>).map(([classification, family]) => {
    const influencers = chart.placements
      .filter((item) => item.name !== "Lagna" && family.planets.has(item.name))
      .filter((item) => item.sign === lagnaSign || grahaAspectsSign(item, lagnaSign))
      .map((item) => ({ planet: item.name, mode: item.sign === lagnaSign ? "conjunction" as const : "graha-drishti" as const }));
    return {
      classification,
      signEligible: family.signs.has(lagnaSign),
      influencers,
      strictMatch: family.signs.has(lagnaSign) && influencers.length > 0,
    };
  });
  const strictMatches = rows.filter((row) => row.strictMatch).map((row) => row.classification);
  const influenceCandidates = rows.filter((row) => row.influencers.length > 0).map((row) => row.classification);
  return {
    lagnaSign,
    rows,
    strictMatches,
    influenceCandidates,
    mixedInfluence: influenceCandidates.length > 1,
    status: influenceCandidates.length > 1 ? "mixed" as const
      : strictMatches.length ? "strict-match" as const
        : influenceCandidates.length ? "influence-only" as const : "no-match" as const,
  };
}

const GRAHA_ASPECT_HOUSES: Readonly<Partial<Record<GrahaName, readonly number[]>>> = {
  Sun: [7], Moon: [7], Mars: [4, 7, 8], Mercury: [7], Jupiter: [5, 7, 9],
  Venus: [7], Saturn: [3, 7, 10], Rahu: [7], Ketu: [7],
};

function grahaAspectsSign(planet: { name: GrahaName; sign: number }, targetSign: number) {
  const distance = houseFrom(planet.sign, targetSign);
  return GRAHA_ASPECT_HOUSES[planet.name]?.includes(distance) ?? false;
}

function naturalNatureFor(chart: ChartResult, item: ChartResult["placements"][number]) {
  const mercuryAfflicted = item.name === "Mercury" && chart.placements.some(
    (other) => other.name !== "Mercury" && FIXED_MALEFICS.has(other.name) && other.sign === item.sign,
  );
  return classifyNaturalPrashnaNature(item.name, {
    lunarDayIndex: chart.panchanga.lunarDayIndex,
    mercuryAfflicted,
  });
}

export function classicalChildrenBirthCombinations(chart: ChartResult, lagnaSign: number) {
  const fifthSign = (lagnaSign + 4) % 12;
  const mars = chart.placements.find((item) => item.name === "Mars")!;
  const jupiter = chart.placements.find((item) => item.name === "Jupiter")!;
  const jupiterHouse = houseFrom(lagnaSign, jupiter.sign);
  const stanza18 = mars.sign === fifthSign
    && new Set([0, 4, 7, 11]).has(fifthSign)
    && grahaAspectsSign(jupiter, fifthSign);

  const jupiterStrong = [8, 11, 3].includes(jupiter.sign) || jupiterHouse === 1;
  const aspectingMalefics = chart.placements
    .filter((item) => item.name !== "Lagna" && item.name !== "Jupiter")
    .filter((item) => {
      const mercuryAfflicted = item.name === "Mercury" && chart.placements.some(
        (other) => other.name !== "Mercury" && FIXED_MALEFICS.has(other.name) && other.sign === item.sign,
      );
      return classifyNaturalPrashnaNature(item.name, {
        lunarDayIndex: chart.panchanga.lunarDayIndex,
        mercuryAfflicted,
      }) === "malefic" && grahaAspectsSign(item, jupiter.sign);
    })
    .map((item) => item.name);
  const stanza22 = [1, 5, 7].includes(jupiterHouse) && jupiterStrong && aspectingMalefics.length === 0;
  return {
    fifthSign,
    stanza18: { matches: stanza18, marsHouse: houseFrom(lagnaSign, mars.sign), jupiterHouse },
    stanza22: { matches: stanza22, jupiterHouse, jupiterStrong, aspectingMalefics },
  };
}

export function classicalLostPropertyVerse10(chart: ChartResult, lagnaSign: number) {
  const venus = chart.placements.find((item) => item.name === "Venus")!;
  const jupiter = chart.placements.find((item) => item.name === "Jupiter")!;
  const ascendantOccupants = chart.placements.filter((item) => item.name !== "Lagna" && item.sign === lagnaSign);
  const benefics = ascendantOccupants.filter((item) => {
    const mercuryAfflicted = item.name === "Mercury" && chart.placements.some(
      (other) => other.name !== "Mercury" && FIXED_MALEFICS.has(other.name) && other.sign === item.sign,
    );
    return classifyNaturalPrashnaNature(item.name, {
      lunarDayIndex: chart.panchanga.lunarDayIndex,
      mercuryAfflicted,
    }) === "benefic";
  }).map((item) => item.name);
  const venusHouse = houseFrom(lagnaSign, venus.sign);
  const jupiterHouse = houseFrom(lagnaSign, jupiter.sign);
  return {
    matches: venusHouse === 2 && jupiterHouse === 12 && benefics.length > 0,
    venusHouse,
    jupiterHouse,
    ascendantBenefics: benefics,
  };
}

export function classicalLostPropertyVerse14(chart: ChartResult, lagnaSign: number) {
  const nature = (item: ChartResult["placements"][number]) => {
    const mercuryAfflicted = item.name === "Mercury" && chart.placements.some(
      (other) => other.name !== "Mercury" && FIXED_MALEFICS.has(other.name) && other.sign === item.sign,
    );
    return classifyNaturalPrashnaNature(item.name, {
      lunarDayIndex: chart.panchanga.lunarDayIndex,
      mercuryAfflicted,
    });
  };
  const ascendantOccupants = chart.placements.filter((item) => item.name !== "Lagna" && item.sign === lagnaSign);
  const seventhSign = (lagnaSign + 6) % 12;
  const seventhBenefics = chart.placements
    .filter((item) => item.name !== "Lagna" && item.sign === seventhSign && nature(item) === "benefic")
    .map((item) => item.name);
  const ascendantQualifiers = ascendantOccupants.filter((item) =>
    item.name === "Jupiter"
      || item.name === "Venus"
      || (item.name === "Mercury" && nature(item) === "benefic")
      || (item.name === "Moon" && chart.panchanga.lunarDayIndex === 14),
  ).map((item) => item.name);
  return {
    matches: ascendantQualifiers.length > 0 || seventhBenefics.length > 0,
    ascendantQualifiers,
    seventhBenefics,
  };
}

/** Safe location-only reading of Daivajna Vallabha Chapter IX. The verses'
 * thief-identity clauses are intentionally not returned. */
export function classicalLostPropertyVerses1To3Location(chart: ChartResult, lagnaSign: number) {
  const d9LagnaSign = chart.advanced.vargas.D9.find((item) => item.name === "Lagna")?.sign ?? null;
  const modality = (sign: number | null) => sign === null
    ? null : MOVABLE_SIGNS.has(sign) ? "movable" as const : FIXED_SIGNS.has(sign) ? "fixed" as const : "dual" as const;
  const d1Modality = modality(lagnaSign)!;
  const d9Modality = modality(d9LagnaSign);
  const vargottama = d9LagnaSign === lagnaSign;
  const testimonies: Array<{ verse: 1 | 2 | 3; location: "same-place" | "elsewhere" | "outside-house"; basis: string }> = [];
  if (d1Modality === "fixed") testimonies.push({ verse: 1, location: "same-place", basis: "fixed D1 ascendant" });
  if (d9Modality === "fixed") testimonies.push({ verse: 1, location: "same-place", basis: "fixed D9 ascendant" });
  if (vargottama) testimonies.push({ verse: 1, location: "same-place", basis: "Vargottama ascendant" });
  if (d1Modality === "movable") testimonies.push({ verse: 1, location: "elsewhere", basis: "movable D1 ascendant" });
  if (d9Modality === "movable") testimonies.push({ verse: 1, location: "elsewhere", basis: "movable D9 ascendant" });
  if (d1Modality === "fixed") testimonies.push({ verse: 2, location: "same-place", basis: "fixed D1 ascendant" });
  if (d1Modality === "movable") testimonies.push({ verse: 2, location: "elsewhere", basis: "movable D1 ascendant" });
  if (d1Modality === "dual") testimonies.push({ verse: 3, location: "outside-house", basis: "dual D1 ascendant" });
  const locationCandidates = [...new Set(testimonies.map((item) => item.location))];
  const directlyConflicting = locationCandidates.includes("same-place")
    && (locationCandidates.includes("elsewhere") || locationCandidates.includes("outside-house"));
  return {
    d1Sign: lagnaSign,
    d1Modality,
    d9Sign: d9LagnaSign,
    d9Modality,
    vargottama,
    testimonies,
    locationCandidates,
    status: directlyConflicting ? "conflicting" as const
      : locationCandidates.length > 1 ? "compatible-multiple" as const : "consistent" as const,
    excludedIdentityClauses: ["known person", "external person", "neighbour", "thief sex or form"],
  };
}

/** Remaining directly calculable clauses of Daivajna Vallabha chapter IX.
 * Highly correlated benefic-house recovery verses are returned as one cluster
 * so a consultation cannot count them as independent votes. */
export function classicalLostPropertyAdditionalRules(chart: ChartResult, lagnaSign: number) {
  const lagna = chart.placements.find((item) => item.name === "Lagna")!;
  const decanate = lagna.degree < 10 ? 1 : lagna.degree < 20 ? 2 : 3;
  const lossMode = decanate === 1
    ? "stolen" as const
    : decanate === 2 ? "fallen" as const : "forgotten-within-house" as const;
  const planets = chart.placements.filter((item) => item.name !== "Lagna");
  const benefics = planets.filter((item) => naturalNatureFor(chart, item) === "benefic");
  const malefics = planets.filter((item) => naturalNatureFor(chart, item) === "malefic");
  const beneficHouses = benefics.map((item) => ({ planet: item.name, house: houseFrom(lagnaSign, item.sign) }));
  const occupantsIn = (houses: readonly number[]) => beneficHouses.filter((item) => houses.includes(item.house));
  const verse12 = occupantsIn([2, 3, 4, 7, 10]);
  const quadrant = occupantsIn([1, 4, 7, 10]);
  const upachaya = occupantsIn([3, 6, 10, 11]);
  const second = occupantsIn([2]);
  const fullMoon = chart.panchanga.lunarDayIndex === 14;
  const moon = planets.find((item) => item.name === "Moon")!;
  // Verse 11 has two further alternatives whose predicates depend on an
  // undefined "very strong" threshold and ambiguous Sirshodaya grammar. The
  // fully explicit full-Moon-in-Lagna alternative is the only one activated.
  const verse11 = { fullMoonInAscendant: fullMoon && moon.sign === lagnaSign };
  const verse13FullMoonAspectors = fullMoon && moon.sign === lagnaSign
    ? planets.filter((item) => (item.name === "Jupiter" || item.name === "Venus") && grahaAspectsSign(item, lagnaSign)).map((item) => item.name)
    : [];
  const verse13 = {
    fullMoonAspected: verse13FullMoonAspectors,
    quadrantAndUpachaya: quadrant.length > 0 && upachaya.length > 0,
    secondAndUpachaya: second.length > 0 && upachaya.length > 0,
  };
  const verse15 = occupantsIn([2, 3, 5, 6]); // 2nd/3rd from Lagna or from the 4th.
  const matchedRecoveryVerses = [
    ...(verse11.fullMoonInAscendant ? [11] : []),
    ...(verse12.length ? [12] : []),
    ...(verse13.fullMoonAspected.length || verse13.quadrantAndUpachaya || verse13.secondAndUpachaya ? [13] : []),
    ...(verse15.length ? [15] : []),
  ];
  const ascendantSignLord = LORDS[lagnaSign];
  const adverseAspectors = FIXED_MALEFICS.has(ascendantSignLord)
    ? malefics.filter((item) => grahaAspectsSign(item, lagnaSign)).map((item) => item.name)
    : [];
  const ascendantBenefics = benefics.filter((item) => item.sign === lagnaSign);
  const supportivePairs = ascendantBenefics.flatMap((occupant) =>
    benefics
      .filter((aspecter) => aspecter.name !== occupant.name && grahaAspectsSign(aspecter, lagnaSign))
      .map((aspecter) => ({ occupant: occupant.name, aspecter: aspecter.name })),
  );
  const seventhSign = (lagnaSign + 6) % 12;
  const seventhNavamsaSign = Math.floor((((seventhSign * 30 + lagna.degree) * 9) % 360) / 30);
  const verse17Signs = new Set([4, 7, 10]); // Leo, Scorpio, Aquarius.
  const verse17Aspectors = verse17Signs.has(seventhSign) && seventhNavamsaSign === seventhSign
    ? malefics.filter((item) => grahaAspectsSign(item, seventhSign)).map((item) => item.name)
    : [];
  const mars = planets.find((item) => item.name === "Mars")!;
  const marsNavamsaSign = chart.advanced.vargas.D9.find((item) => item.name === "Mars")?.sign ?? null;
  const verse17MarsInEighthNamedNavamsa = houseFrom(lagnaSign, mars.sign) === 8
    && marsNavamsaSign !== null && verse17Signs.has(marsNavamsaSign);
  return {
    verse8: { decanate, lossMode },
    recoveryCluster: { matches: matchedRecoveryVerses.length > 0, matchedVerses: matchedRecoveryVerses, verse11, verse12, verse13, verse15 },
    verse16: {
      adverse: adverseAspectors.length > 0,
      supportive: supportivePairs.length > 0,
      ascendantSignLord,
      adverseAspectors,
      supportivePairs,
    },
    verse17: {
      opposesRecovery: verse17Aspectors.length > 0 || verse17MarsInEighthNamedNavamsa,
      seventhSign,
      seventhNavamsaSign,
      seventhOwnNavamsa: seventhNavamsaSign === seventhSign,
      maleficAspectors: verse17Aspectors,
      marsHouse: houseFrom(lagnaSign, mars.sign),
      marsNavamsaSign,
      marsInEighthNamedNavamsa: verse17MarsInEighthNamedNavamsa,
    },
  };
}

export function classicalTravelRisingMode(lagnaSign: number, degreeInSign: number) {
  const movable = new Set([0, 3, 6, 9]);
  const fixed = new Set([1, 4, 7, 10]);
  if (movable.has(lagnaSign)) return { mode: "movable-like" as const, supportsTravel: true, reason: "movable sign" };
  if (fixed.has(lagnaSign)) return { mode: "fixed-like" as const, supportsTravel: false, reason: "fixed sign" };
  return degreeInSign < 15
    ? { mode: "movable-like" as const, supportsTravel: true, reason: "first half of a dual sign" }
    : { mode: "fixed-like" as const, supportsTravel: false, reason: "second half of a dual sign" };
}

export function classicalTravelVerses2To4(chart: ChartResult, lagnaSign: number) {
  const movable = [0, 3, 6, 9].includes(lagnaSign);
  const fixed = [1, 4, 7, 10].includes(lagnaSign);
  const occupants = chart.placements.filter((item) => item.name !== "Lagna" && item.sign === lagnaSign);
  const verse2Planets = occupants.filter((item) => ["Sun", "Saturn", "Mercury", "Venus"].includes(item.name));
  const verse2Direct = verse2Planets.filter((item) => !item.retrograde).map((item) => item.name);
  const verse2Retrograde = verse2Planets.filter((item) => Boolean(item.retrograde)).map((item) => item.name);
  const verse3 = occupants.filter((item) => ["Jupiter", "Mercury", "Venus", "Sun"].includes(item.name)).map((item) => item.name);
  const inHouse = (house: number, names: readonly string[]) => chart.placements
    .filter((item) => item.name !== "Lagna" && names.includes(item.name) && houseFrom(lagnaSign, item.sign) === house)
    .map((item) => item.name);
  const verse4Names = ["Sun", "Jupiter", "Mercury", "Venus"] as const;
  return {
    verse2: {
      directEarlyTravel: movable ? verse2Direct : [],
      retrogradeNoTravel: movable ? verse2Retrograde : [],
    },
    verse3: { fixedReturn: fixed ? verse3 : [] },
    verse4: { earlyJourney: inHouse(11, verse4Names), breaksAndReturns: inHouse(12, verse4Names) },
  };
}

export function classicalTravelVerses5To9(chart: ChartResult, lagnaSign: number) {
  const planets = chart.placements.filter((item) => CLASSICAL_PLANETS.includes(item.name));
  const fixedAscendant = FIXED_SIGNS.has(lagnaSign);
  const jupiter = planets.find((item) => item.name === "Jupiter")!;
  const saturn = planets.find((item) => item.name === "Saturn")!;
  const verse5 = {
    noReturn: fixedAscendant && grahaAspectsSign(jupiter, lagnaSign) && grahaAspectsSign(saturn, lagnaSign),
    fixedAscendant,
    jupiterAspectsAscendant: grahaAspectsSign(jupiter, lagnaSign),
    saturnAspectsAscendant: grahaAspectsSign(saturn, lagnaSign),
  };
  const malefics = planets.filter((item) => naturalNatureFor(chart, item) === "malefic");
  const verse6Targets = [5, 6, 9].map((house) => ({
    house,
    planets: malefics.filter((item) => houseFrom(lagnaSign, item.sign) === house),
  }));
  const verse6 = {
    noTravel: fixedAscendant && verse6Targets.every((target) => target.planets.length > 0 && target.planets.every((planet) =>
      malefics.some((aspector) => aspector.name !== planet.name && grahaAspectsSign(aspector, planet.sign)))),
    targets: verse6Targets.map((target) => ({
      house: target.house,
      planets: target.planets.map((item) => item.name),
      unaspected: target.planets.filter((planet) => !malefics.some((aspector) => aspector.name !== planet.name && grahaAspectsSign(aspector, planet.sign))).map((item) => item.name),
    })),
  };
  const d9 = chart.advanced.vargas.D9;
  const timingCandidates = planets.map((planet) => {
    const distanceInSigns = houseFrom(lagnaSign, planet.sign);
    const navamsaSign = d9.find((item) => item.name === planet.name)?.sign ?? null;
    const navamsaModality = navamsaSign === null ? null : MOVABLE_SIGNS.has(navamsaSign) ? "movable" as const : FIXED_SIGNS.has(navamsaSign) ? "fixed" as const : "dual" as const;
    const multiplier = navamsaModality === "movable" ? 1 : navamsaModality === "fixed" ? 2 : navamsaModality === "dual" ? 3 : null;
    return {
      planet: planet.name,
      distanceInSigns,
      navamsaSign,
      navamsaModality,
      multiplier,
      months: multiplier === null ? null : distanceInSigns * multiplier,
    };
  });
  return {
    verse5,
    verse6,
    verses8To9: {
      candidates: timingCandidates,
      selected: null,
      notice: "The source requires the strongest planet. Sahadeva exposes every planet's candidate but does not select one until the applicable strength hierarchy is source-verified.",
    },
  };
}

export function searchClassicalSeventhLordRetrogradeBetween(
  lagnaSign: number,
  startJulianDay: number,
  endJulianDay: number,
  stepMinutes = 360,
) {
  if (!Number.isInteger(lagnaSign) || lagnaSign < 0 || lagnaSign > 11) throw new RangeError("Travel retrograde search requires a valid ascendant sign");
  if (!Number.isFinite(startJulianDay) || !Number.isFinite(endJulianDay) || endJulianDay < startJulianDay) throw new RangeError("Travel retrograde search requires a finite, ordered interval");
  if (!Number.isFinite(stepMinutes) || stepMinutes <= 0) throw new RangeError("Travel retrograde search resolution must be positive");
  const step = stepMinutes / 1440;
  const estimated = Math.floor((endJulianDay - startJulianDay) / step) + 2;
  if (estimated > 50_000) throw new RangeError("Travel retrograde search exceeds the 50,000-point audit limit");
  const seventhLord = LORDS[(lagnaSign + 6) % 12];
  const signedDelta = (value: number) => ((value + 540) % 360) - 180;
  const retrogradeAt = (jd: number) => signedDelta(lahiriLongitudeAt(seventhLord, jd + 1 / 48) - lahiriLongitudeAt(seventhLord, jd - 1 / 48)) < 0;
  const samples: Array<{ julianDay: number; iso: string; retrograde: boolean }> = [];
  for (let jd = startJulianDay; jd <= endJulianDay + 1e-9; jd += step) {
    const at = Math.min(jd, endJulianDay);
    samples.push({ julianDay: at, iso: jdToIso(at), retrograde: retrogradeAt(at) });
    if (at === endJulianDay) break;
  }
  const windows: Array<{ startJulianDay: number; endJulianDay: number; startIso: string; endIso: string; ingressBoundary: "interval-truncated" | "sampled"; egressBoundary: "interval-truncated" | "sampled" }> = [];
  let activeStart: typeof samples[number] | null = null;
  let activeEnd: typeof samples[number] | null = null;
  for (const sample of samples) {
    if (sample.retrograde) { activeStart ??= sample; activeEnd = sample; continue; }
    if (activeStart && activeEnd) windows.push({ startJulianDay: activeStart.julianDay, endJulianDay: activeEnd.julianDay, startIso: activeStart.iso, endIso: activeEnd.iso, ingressBoundary: activeStart.julianDay === startJulianDay ? "interval-truncated" : "sampled", egressBoundary: "sampled" });
    activeStart = null; activeEnd = null;
  }
  if (activeStart && activeEnd) windows.push({ startJulianDay: activeStart.julianDay, endJulianDay: activeEnd.julianDay, startIso: activeStart.iso, endIso: activeEnd.iso, ingressBoundary: activeStart.julianDay === startJulianDay ? "interval-truncated" : "sampled", egressBoundary: "interval-truncated" });
  const toleranceDays = Math.min(step, 1 / 1440);
  const refine = (leftInitial: number, rightInitial: number, leftRetrograde: boolean) => {
    let left = leftInitial, right = rightInitial;
    while (right - left > toleranceDays) {
      const middle = (left + right) / 2;
      if (retrogradeAt(middle) === leftRetrograde) left = middle;
      else right = middle;
    }
    return (left + right) / 2;
  };
  const refinedWindows = windows.map((window) => {
    const ingressTruncated = window.ingressBoundary === "interval-truncated";
    const egressTruncated = window.egressBoundary === "interval-truncated";
    const refinedStartJulianDay = ingressTruncated ? window.startJulianDay
      : refine(Math.max(startJulianDay, window.startJulianDay - step), window.startJulianDay, false);
    const refinedEndJulianDay = egressTruncated ? window.endJulianDay
      : refine(window.endJulianDay, Math.min(endJulianDay, window.endJulianDay + step), true);
    return {
      ...window,
      refinedStartJulianDay,
      refinedEndJulianDay,
      refinedStartIso: jdToIso(refinedStartJulianDay),
      refinedEndIso: jdToIso(refinedEndJulianDay),
      ingressBoundary: ingressTruncated ? "interval-truncated" as const : "refined" as const,
      egressBoundary: egressTruncated ? "interval-truncated" as const : "refined" as const,
    };
  });
  return {
    seventhLord, sampledPoints: samples.length, resolutionMinutes: stepMinutes, boundaryToleranceMinutes: toleranceDays * 1440, samples, windows: refinedWindows,
    status: refinedWindows.length ? "retrograde-windows-found" as const : "no-retrograde-window" as const,
    notice: "Daivajna Vallabha IV.10 links return with the seventh lord becoming retrograde. Bracketed station boundaries are refined to the declared tolerance and interval-edge windows remain truncated; these are astronomical research windows, not guaranteed return dates.",
  };
}

export function classicalMarriageChapterRules(chart: ChartResult, lagnaSign: number) {
  const planets = chart.placements.filter((item) => item.name !== "Lagna");
  const moon = planets.find((item) => item.name === "Moon")!;
  const saturn = planets.find((item) => item.name === "Saturn")!;
  const moonHouse = houseFrom(lagnaSign, moon.sign);
  const aspectors = planets.filter((item) => item.name !== "Moon" && grahaAspectsSign(item, moon.sign));
  const aspectorNames = aspectors.map((item) => item.name);
  const requiredVerse1 = ["Sun", "Jupiter", "Mercury"] as const;
  const verse1MoonClause = [3, 5, 6, 7, 11].includes(moonHouse)
    && requiredVerse1.every((name) => aspectorNames.includes(name));
  const verse11MoonClause = verse1MoonClause
    && aspectors.every((item) => requiredVerse1.includes(item.name as (typeof requiredVerse1)[number]));
  const verse4Placement = [2, 3, 6, 7, 10, 11].includes(moonHouse);
  const verse4Jupiter = verse4Placement && aspectorNames.includes("Jupiter");
  const maleficContacts = planets.filter((item) => item.name !== "Moon")
    .filter((item) => naturalNatureFor(chart, item) === "malefic")
    .filter((item) => item.sign === moon.sign || grahaAspectsSign(item, moon.sign))
    .map((item) => ({ planet: item.name, mode: item.sign === moon.sign ? "associated" as const : "aspecting" as const }));
  const saturnHouse = houseFrom(lagnaSign, saturn.sign);
  const verse3 = saturnHouse === 7
    ? { active: true, polarity: saturn.sign % 2 === 1 ? "supportive" as const : "challenging" as const, saturnSignParity: saturn.sign % 2 === 1 ? "even" as const : "odd" as const }
    : { active: false, polarity: "neutral" as const, saturnSignParity: null };
  const venus = planets.find((item) => item.name === "Venus")!;
  const venusDignity = chart.advanced.dignities.find((item) => item.name === "Venus")?.dignity ?? "unknown";
  const venusStrong = venusDignity === "own-sign" || venusDignity === "exalted";
  const ascendantMoonOrMercury = planets.filter((item) => ["Moon", "Mercury"].includes(item.name) && item.sign === lagnaSign);
  const verse12Targets = ascendantMoonOrMercury.filter((item) => grahaAspectsSign(venus, item.sign)).map((item) => item.name);
  const verse12MaleficContacts = ascendantMoonOrMercury.flatMap((target) => planets
    .filter((item) => item.name !== target.name && naturalNatureFor(chart, item) === "malefic" && grahaAspectsSign(item, target.sign))
    .map((item) => ({ target: target.name, afflicter: item.name })));
  const angularMalefics = planets.filter((item) => naturalNatureFor(chart, item) === "malefic" && [1, 4, 7, 10].includes(houseFrom(lagnaSign, item.sign))).map((item) => item.name);
  const verse13 = {
    matches: MOVABLE_SIGNS.has(lagnaSign) && MOVABLE_SIGNS.has(moon.sign)
      && grahaAspectsSign(venus, lagnaSign) && grahaAspectsSign(venus, moon.sign)
      && angularMalefics.length > 0,
    lagnaMovable: MOVABLE_SIGNS.has(lagnaSign),
    moonMovable: MOVABLE_SIGNS.has(moon.sign),
    venusAspectsLagna: grahaAspectsSign(venus, lagnaSign),
    venusAspectsMoon: grahaAspectsSign(venus, moon.sign),
    angularMalefics,
  };
  const promiseClauses = [
    ...(verse1MoonClause ? ["verse 1 Moon-house and three-aspector clause"] : []),
    ...(verse4Jupiter ? ["verse 4 Moon placement with Jupiter aspect"] : []),
    ...(verse11MoonClause ? ["verse 11 immediate-marriage refinement"] : []),
    ...(venusStrong && verse12Targets.length > 0 ? ["verse 12 strong-Venus aspect to Moon or Mercury in the ascendant"] : []),
    ...(verse13.matches ? ["verse 13 movable Lagna/Moon with Venus aspects and angular malefic"] : []),
  ];
  const obstacleClauses = [
    ...(verse4Placement && maleficContacts.length ? ["verse 4 malefic contact"] : []),
    ...(verse11MoonClause === false && [3, 5, 6, 7, 11].includes(moonHouse) && maleficContacts.length ? ["verse 11 malefic obstacle"] : []),
    ...(verse12MaleficContacts.length ? ["verse 12 malefic aspect to Moon or Mercury in the ascendant"] : []),
  ];
  return {
    moonHouse,
    aspectorNames,
    promiseCluster: { matches: promiseClauses.length > 0, clauses: promiseClauses },
    obstacleCluster: { matches: obstacleClauses.length > 0, clauses: obstacleClauses, maleficContacts, verse12MaleficContacts },
    verse3,
    verse12: {
      support: venusStrong && verse12Targets.length > 0,
      obstacle: verse12MaleficContacts.length > 0,
      venusStrong,
      venusDignity,
      targets: verse12Targets,
      maleficContacts: verse12MaleficContacts,
    },
    verse13,
    unresolvedClause: "Verse 1's separate 'benefics in quadrants and trines' grammar does not specify a count and is not converted into an executable threshold.",
  };
}

export function classicalGainsAndLossesChapterRules(chart: ChartResult, lagnaSign: number) {
  const planets = chart.placements.filter((item) => item.name !== "Lagna");
  const rows = planets.map((planet) => ({
    planet: planet.name,
    house: houseFrom(lagnaSign, planet.sign),
    nature: naturalNatureFor(chart, planet),
  }));
  const benefics = rows.filter((item) => item.nature === "benefic");
  const malefics = rows.filter((item) => item.nature === "malefic");
  const moon = rows.find((item) => item.planet === "Moon")!;
  const moonPlacement = chart.placements.find((item) => item.name === "Moon")!;
  const moonBeneficAspectors = planets
    .filter((item) => item.name !== "Moon" && naturalNatureFor(chart, item) === "benefic" && grahaAspectsSign(item, moonPlacement.sign))
    .map((item) => item.name);
  const moonMaleficAspectors = planets
    .filter((item) => item.name !== "Moon" && naturalNatureFor(chart, item) === "malefic" && grahaAspectsSign(item, moonPlacement.sign))
    .map((item) => item.name);
  const verse1Gain = {
    supportive: benefics.filter((item) => [3, 5, 7, 11].includes(item.house)).map((item) => ({ planet: item.planet, house: item.house })),
    adverse: malefics.filter((item) => [3, 5, 7, 11].includes(item.house)).map((item) => ({ planet: item.planet, house: item.house })),
  };
  const verse1Prosperity = benefics
    .filter((item) => [1, 2, 5, 7, 10].includes(item.house))
    .map((item) => ({ planet: item.planet, house: item.house, indication: [7, 10].includes(item.house) ? "status-position" as const : "honour-wealth" as const }));
  const verse2 = {
    supportive: [2, 3, 6, 7, 10, 11].includes(moon.house) && moonBeneficAspectors.length > 0,
    adverse: [1, 3, 5, 8, 9].includes(moon.house) && moonMaleficAspectors.length > 0,
    moonHouse: moon.house,
    beneficAspectors: moonBeneficAspectors,
    maleficAspectors: moonMaleficAspectors,
    beneficsInAdverseListedHouses: benefics.filter((item) => [1, 3, 5, 8, 9].includes(item.house)).map((item) => ({ planet: item.planet, house: item.house })),
  };
  const verse3 = {
    quickGain: benefics.every((item) => [1, 4, 5, 7, 9, 10].includes(item.house))
      && malefics.every((item) => [3, 6, 11].includes(item.house)),
    misplacedBenefics: benefics.filter((item) => ![1, 4, 5, 7, 9, 10].includes(item.house)).map((item) => item.planet),
    misplacedMalefics: malefics.filter((item) => ![3, 6, 11].includes(item.house)).map((item) => item.planet),
  };
  const sunHouse = rows.find((item) => item.planet === "Sun")!.house;
  const verse4 = { immediateGain: [4, 7].includes(moon.house) && [1, 10].includes(sunHouse), moonHouse: moon.house, sunHouse };
  const modality = MOVABLE_SIGNS.has(lagnaSign) ? "movable" as const : FIXED_SIGNS.has(lagnaSign) ? "fixed" as const : "dual" as const;
  const verse5 = {
    modality,
    indication: modality === "fixed" ? "status-or-post" as const : modality === "movable" ? "no-status-or-post" as const : "mixed" as const,
  };
  return { verse1Gain, verse1Prosperity, verse2, verse3, verse4, verse5 };
}

export function classicalAbroadReturnChapterRules(chart: ChartResult, lagnaSign: number) {
  const classical = chart.placements.filter((item) => CLASSICAL_PLANETS.includes(item.name));
  const rows = classical.map((planet) => ({
    planet: planet.name,
    house: houseFrom(lagnaSign, planet.sign),
    nature: naturalNatureFor(chart, planet),
  }));
  const benefics = rows.filter((item) => item.nature === "benefic");
  const malefics = rows.filter((item) => item.nature === "malefic");
  const house = (planet: GrahaName) => rows.find((item) => item.planet === planet)!.house;
  const verse1 = {
    allPlanetsInReturnHouses: rows.every((item) => [2, 3, 5].includes(item.house)),
    quickReturnPlanets: (["Jupiter", "Venus"] as GrahaName[]).filter((planet) => [2, 3, 5].includes(house(planet))),
  };
  const planetInSixthOrSeventh = rows.filter((item) => [6, 7].includes(item.house)).map((item) => item.planet);
  const verse2 = {
    jupiterQuadrantWithPlanetSixOrSeven: [1, 4, 7, 10].includes(house("Jupiter")) && planetInSixthOrSeventh.length > 0,
    planetInSixthOrSeventh,
    mercuryOrVenusInFiveOrNine: (["Mercury", "Venus"] as GrahaName[]).filter((planet) => [5, 9].includes(house(planet))),
  };
  const maleficsInAngles = malefics.filter((item) => [1, 4, 7, 10].includes(item.house)).map((item) => item.planet);
  const beneficsInAngles = benefics.filter((item) => [1, 4, 7, 10].includes(item.house)).map((item) => item.planet);
  const verse3 = {
    moonInEighth: house("Moon") === 8,
    happyReturn: house("Moon") === 8 && maleficsInAngles.length === 0,
    returnWithGains: house("Moon") === 8 && maleficsInAngles.length === 0 && beneficsInAngles.length > 0,
    maleficsInAngles,
    beneficsInAngles,
  };
  const jupiterHouse = house("Jupiter"), venusHouse = house("Venus");
  const verse5 = {
    return: [2, 3].includes(jupiterHouse) && [2, 3].includes(venusHouse),
    entersHome: jupiterHouse === 4 && venusHouse === 4,
    jupiterHouse,
    venusHouse,
  };
  const verse6 = {
    return: malefics.length > 0 && benefics.length > 0
      && malefics.every((item) => [3, 11].includes(item.house))
      && benefics.every((item) => [1, 4, 5, 7, 9, 10].includes(item.house)),
    misplacedMalefics: malefics.filter((item) => ![3, 11].includes(item.house)).map((item) => item.planet),
    misplacedBenefics: benefics.filter((item) => ![1, 4, 5, 7, 9, 10].includes(item.house)).map((item) => item.planet),
  };
  const verse10 = {
    beneficsInNinth: benefics.filter((item) => item.house === 9).map((item) => item.planet),
    maleficsInAscendant: malefics.filter((item) => item.house === 1).map((item) => item.planet),
  };
  return { verse1, verse2, verse3, verse5, verse6, verse10 };
}

export function classicalDiseaseRecoveryChapterRules(chart: ChartResult, lagnaSign: number) {
  const classical = chart.placements.filter((item) => CLASSICAL_PLANETS.includes(item.name));
  const rows = classical.map((planet) => ({
    planet,
    house: houseFrom(lagnaSign, planet.sign),
    nature: naturalNatureFor(chart, planet),
  }));
  const benefics = rows.filter((item) => item.nature === "benefic");
  const malefics = rows.filter((item) => item.nature === "malefic");
  const lagnaTargets = rows.filter((item) => ["Moon", "Mercury"].includes(item.planet.name) && item.house === 1);
  const verse3Contacts = lagnaTargets.flatMap((target) => malefics
    .filter((afflicter) => grahaAspectsSign(afflicter.planet, target.planet.sign))
    .map((afflicter) => ({ target: target.planet.name, afflicter: afflicter.planet.name })));

  const beneficHouses = new Set(benefics.map((item) => item.house));
  const maleficsWithoutBeneficAspect = malefics.filter((target) => !benefics.some((afflicter) => grahaAspectsSign(afflicter.planet, target.planet.sign))).map((item) => item.planet.name);
  const moon = rows.find((item) => item.planet.name === "Moon")!;
  const moonRelativeBenefics = benefics.filter((item) => [3, 6, 10, 11].includes(houseFrom(moon.planet.sign, item.planet.sign))).map((item) => ({ planet: item.planet.name, houseFromMoon: houseFrom(moon.planet.sign, item.planet.sign) }));
  const verse4 = {
    recovery: [5, 7, 8].every((house) => beneficHouses.has(house))
      && maleficsWithoutBeneficAspect.length === 0
      && [3, 6, 10, 11].includes(moon.house)
      && moonRelativeBenefics.length > 0,
    populatedBeneficHouses: [5, 7, 8].filter((house) => beneficHouses.has(house)),
    maleficsWithoutBeneficAspect,
    moonHouse: moon.house,
    moonRelativeBenefics,
  };
  const verse6Benefics = benefics.filter((item) => item.planet.name !== "Moon");
  const beneficsInAllowedVerse6Houses = verse6Benefics.filter((item) => [1, 4, 5, 7, 8, 9, 10].includes(item.house));
  const beneficAscendantAspectors = benefics.filter((item) => grahaAspectsSign(item.planet, lagnaSign)).map((item) => item.planet.name);
  const verse6 = {
    moonUpachayaArrangement: [3, 6, 10, 11].includes(moon.house)
      && verse6Benefics.length > 0 && beneficsInAllowedVerse6Houses.length === verse6Benefics.length,
    beneficAscendantAspect: beneficAscendantAspectors.length > 0,
    recoveryAfterRelocation: ([3, 6, 10, 11].includes(moon.house)
      && verse6Benefics.length > 0 && beneficsInAllowedVerse6Houses.length === verse6Benefics.length) || beneficAscendantAspectors.length > 0,
    moonHouse: moon.house,
    beneficAscendantAspectors,
    misplacedBenefics: verse6Benefics.filter((item) => ![1, 4, 5, 7, 8, 9, 10].includes(item.house)).map((item) => item.planet.name),
  };
  const jupiter = rows.find((item) => item.planet.name === "Jupiter")!;
  const venus = rows.find((item) => item.planet.name === "Venus")!;
  const fullMoon = chart.panchanga.lunarDayIndex === 14;
  const verse7 = {
    fullMoonInAscendantAspectedByJupiter: fullMoon && moon.house === 1 && grahaAspectsSign(jupiter.planet, moon.planet.sign),
    jupiterVenusAngular: [1, 4, 7, 10].includes(jupiter.house) && [1, 4, 7, 10].includes(venus.house),
    fullMoon,
    moonHouse: moon.house,
    jupiterHouse: jupiter.house,
    venusHouse: venus.house,
  };
  return { verse3: { hardship: verse3Contacts.length > 0, contacts: verse3Contacts }, verse4, verse6, verse7 };
}
const localParts = (instant: Date, timezone: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};
const offsetHours = (instant: Date, timezone: string) => {
  const p = localParts(instant, timezone),
    local = Date.parse(`${p.date}T${p.time}:00Z`);
  return (local - instant.getTime()) / 3_600_000;
};

export function classifyNaturalPrashnaNature(
  planet: GrahaName,
  context: { lunarDayIndex: number; mercuryAfflicted: boolean },
): "benefic" | "malefic" | "neutral" {
  if (FIXED_BENEFICS.has(planet)) return "benefic";
  if (FIXED_MALEFICS.has(planet)) return "malefic";
  // Prasna Marga defines the waning/weak Moon as Krishna 8 through
  // Shukla 7. The complementary interval, Shukla 8 through Krishna 7,
  // is therefore the waxing/strong Moon used as a natural benefic.
  if (planet === "Moon")
    return context.lunarDayIndex >= 7 && context.lunarDayIndex <= 21 ? "benefic" : "malefic";
  if (planet === "Mercury") return context.mercuryAfflicted ? "malefic" : "benefic";
  return "neutral";
}

export function systemsFunctionalNature(lagnaSign: number) {
  const functionalMalefics = new Set<GrahaName>(["Rahu", "Ketu"]);
  for (const [planet, sign] of Object.entries(MOOLATRIKONA_SIGN) as Array<[GrahaName, number]>)
    if ([6, 8, 12].includes(houseFrom(lagnaSign, sign))) functionalMalefics.add(planet);
  const lordWhoseMoolatrikonaOccupies = (house: number) =>
    (Object.entries(MOOLATRIKONA_SIGN) as Array<[GrahaName, number]>).find(([, sign]) => houseFrom(lagnaSign, sign) === house)?.[0];
  const mostMalefic = lordWhoseMoolatrikonaOccupies(8) ?? lordWhoseMoolatrikonaOccupies(12) ?? "Ketu";
  return {
    functionalMalefics: [...functionalMalefics],
    functionalBenefics: CLASSICAL_PLANETS.filter((planet) => !functionalMalefics.has(planet)),
    mostMalefic,
    precedence: mostMalefic === "Ketu"
      ? "No moolatrikona sign occupies the eighth or twelfth house; Ketu is MMP."
      : `The ${houseFrom(lagnaSign, MOOLATRIKONA_SIGN[mostMalefic]!)}th house contains ${mostMalefic}'s moolatrikona sign.`,
  };
}

export function systemsAfflictionInfluencePercent(longitudinalDifference: number) {
  return Math.max(0, Math.min(100, 100 - Math.abs(longitudinalDifference) * 20));
}

export function systemsAgePowerPercent(degreeInSign: number) {
  const degree = Math.max(0, Math.min(30, degreeInSign));
  if (degree < 5) return degree * 20;
  if (degree > 25) return (30 - degree) * 20;
  return 100;
}

export const SYSTEMS_ASPECT_HOUSES: Readonly<Record<GrahaName, readonly number[]>> = {
  Sun: [7], Moon: [7], Mars: [4, 7, 8], Mercury: [7], Jupiter: [5, 7, 9],
  Venus: [7], Saturn: [3, 7, 10], Rahu: [5, 7, 9], Ketu: [5, 7, 9], Lagna: [],
};

export function systemsCloseHouseInfluences(chart: ChartResult, lagnaSign: number, targetHouse: number, mep: number) {
  const malefics = new Set(systemsFunctionalNature(lagnaSign).functionalMalefics);
  return chart.placements.flatMap((planet) => {
    if (!malefics.has(planet.name) || planet.name === "Lagna") return [];
    const occupiedHouse = houseFrom(lagnaSign, planet.sign);
    const relativeTarget = ((targetHouse - occupiedHouse + 12) % 12) + 1;
    const mode = occupiedHouse === targetHouse
      ? "conjunction"
      : SYSTEMS_ASPECT_HOUSES[planet.name].includes(relativeTarget)
        ? `${relativeTarget}th aspect`
        : null;
    if (!mode) return [];
    const difference = Math.abs(planet.degree - mep);
    const influencePercent = systemsAfflictionInfluencePercent(difference);
    return influencePercent > 0 ? [{ planet: planet.name, occupiedHouse, targetHouse, mode, difference, influencePercent }] : [];
  });
}

export function systemsClosePlanetInfluences(chart: ChartResult, lagnaSign: number, targetPlanet: GrahaName) {
  const target = chart.placements.find((item) => item.name === targetPlanet);
  if (!target || targetPlanet === "Lagna") return [];
  const functional = systemsFunctionalNature(lagnaSign);
  const malefics = new Set(functional.functionalMalefics);
  return chart.placements.flatMap((afflicter) => {
    if (afflicter.name === "Lagna" || afflicter.name === targetPlanet || !malefics.has(afflicter.name)) return [];
    const relation = houseFrom(afflicter.sign, target.sign);
    const mode = afflicter.sign === target.sign
      ? "conjunction"
      : SYSTEMS_ASPECT_HOUSES[afflicter.name].includes(relation) ? `${relation}th aspect` : null;
    if (!mode) return [];
    const difference = Math.abs(afflicter.degree - target.degree);
    const influencePercent = systemsAfflictionInfluencePercent(difference);
    return influencePercent > 0 ? [{
      afflicter: afflicter.name,
      target: targetPlanet,
      mode,
      difference,
      influencePercent,
      mostMalefic: afflicter.name === functional.mostMalefic,
    }] : [];
  });
}

const DEBILITATION_SIGN: Partial<Record<GrahaName, number>> = {
  Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0,
};

export function systemsWeaknessProfile(chart: ChartResult, lagnaSign: number) {
  const rows = CLASSICAL_PLANETS.map((planet) => {
    const placement = chart.placements.find((item) => item.name === planet)!;
    const dignity = chart.advanced.dignities.find((item) => item.name === planet);
    const agePowerPercent = systemsAgePowerPercent(placement.degree);
    const divisionalDebilitations = Object.entries(chart.advanced.vargas)
      .filter(([varga]) => varga !== "D1")
      .filter(([, placements]) => placements.find((item) => item.name === planet)?.sign === DEBILITATION_SIGN[planet])
      .map(([varga]) => varga);
    const reasons = [
      ...(dignity?.dignity === "debilitated" ? ["D1 debilitation"] : []),
      ...(dignity?.combust ? ["combustion"] : []),
      ...(agePowerPercent < 100 ? [`age power ${agePowerPercent.toFixed(1)}%`] : []),
      ...([6, 8, 12].includes(houseFrom(lagnaSign, placement.sign)) ? [`dusthana house ${houseFrom(lagnaSign, placement.sign)}`] : []),
      ...divisionalDebilitations.map((varga) => `${varga} debilitation`),
    ];
    return { planet, agePowerPercent, reasons, weak: reasons.length > 0 };
  });
  const weak = new Set(rows.filter((row) => row.weak).map((row) => row.planet));
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (weak.has(row.planet)) continue;
      const sign = chart.placements.find((item) => item.name === row.planet)!.sign;
      const weakDispositor = (Object.entries(MOOLATRIKONA_SIGN) as Array<[GrahaName, number]>)
        .find(([planet, moolatrikona]) => moolatrikona === sign && weak.has(planet))?.[0];
      if (weakDispositor) {
        row.reasons.push(`occupies the moolatrikona sign of weak ${weakDispositor}`);
        row.weak = true;
        weak.add(row.planet);
        changed = true;
      }
    }
  }
  return rows;
}

export function systemsOperatingPeriodProfile(chart: ChartResult, lagnaSign: number) {
  const functional = systemsFunctionalNature(lagnaSign);
  const malefics = new Set(functional.functionalMalefics);
  const weakness = new Map(systemsWeaknessProfile(chart, lagnaSign).map((row) => [row.planet, row]));
  const profile = (value: string | null) => {
    const planet = value as GrahaName | null;
    if (!planet) return null;
    const placement = chart.placements.find((item) => item.name === planet);
    if (!placement) return null;
    const moolatrikonaSign = MOOLATRIKONA_SIGN[planet];
    return {
      planet,
      functionalNature: malefics.has(planet) ? "malefic" as const : "benefic" as const,
      occupiedHouse: houseFrom(lagnaSign, placement.sign),
      moolatrikonaHouse: moolatrikonaSign === undefined ? null : houseFrom(lagnaSign, moolatrikonaSign),
      weakness: weakness.get(planet) ?? null,
      activatedLayers: [
        "general significations",
        ...(moolatrikonaSign === undefined ? [] : [`moolatrikona-owned house ${houseFrom(lagnaSign, moolatrikonaSign)}`]),
        `occupied house ${houseFrom(lagnaSign, placement.sign)}`,
      ],
    };
  };
  return {
    mainPeriod: profile(chart.advanced.birthPeriods.mahadasha),
    subPeriod: profile(chart.advanced.birthPeriods.antardasha),
    subSubPeriod: profile(chart.advanced.birthPeriods.pratyantardasha),
  };
}

export function systemsPeriodTransitInteraction(
  radix: ChartResult,
  transit: ChartResult,
  lagnaSign: number,
  eventHouse: number,
) {
  const subPeriodLord = radix.advanced.birthPeriods.antardasha as GrahaName | null;
  if (!subPeriodLord) return { status: "unavailable" as const, subPeriodLord: null, contacts: [], capability: null };
  const radixSubLord = radix.placements.find((item) => item.name === subPeriodLord);
  const transitSubLord = transit.placements.find((item) => item.name === subPeriodLord);
  if (!radixSubLord || !transitSubLord) return { status: "unavailable" as const, subPeriodLord, contacts: [], capability: null };
  const lagna = radix.placements.find((item) => item.name === "Lagna")!;
  const eventSign = (lagnaSign + eventHouse - 1) % 12;
  const points = [
    { point: "event-house MEP" as const, longitude: eventSign * 30 + lagna.degree },
    { point: "natal sub-period lord" as const, longitude: radixSubLord.longitude },
    { point: "transit sub-period lord" as const, longitude: transitSubLord.longitude },
  ];
  const functional = systemsFunctionalNature(lagnaSign);
  const functionalMalefics = new Set(functional.functionalMalefics);
  const contacts = transit.placements.flatMap((afflicter) => {
    if (afflicter.name === "Lagna" || !functionalMalefics.has(afflicter.name)) return [];
    return points.flatMap(({ point, longitude }) => {
      if (point !== "event-house MEP" && afflicter.name === subPeriodLord) return [];
      const pointSign = Math.floor(((longitude % 360) + 360) % 360 / 30);
      const pointDegree = ((longitude % 30) + 30) % 30;
      const relation = houseFrom(afflicter.sign, pointSign);
      const mode = afflicter.sign === pointSign
        ? "conjunction"
        : SYSTEMS_ASPECT_HOUSES[afflicter.name].includes(relation) ? `${relation}th aspect` : null;
      if (!mode) return [];
      const difference = Math.abs(afflicter.degree - pointDegree);
      const influencePercent = systemsAfflictionInfluencePercent(difference);
      return influencePercent > 0 ? [{
        afflicter: afflicter.name, point, mode, difference, influencePercent,
        mostMalefic: afflicter.name === functional.mostMalefic,
      }] : [];
    });
  });
  const radixWeakness = systemsWeaknessProfile(radix, lagnaSign).find((item) => item.planet === subPeriodLord) ?? null;
  const transitWeakness = systemsWeaknessProfile(transit, lagnaSign).find((item) => item.planet === subPeriodLord) ?? null;
  const functionallyBenefic = functional.functionalBenefics.includes(subPeriodLord);
  return {
    status: contacts.length ? "close-functional-malefic-transit" as const : "no-close-functional-malefic-transit" as const,
    subPeriodLord,
    contacts,
    capability: {
      functionallyBenefic,
      strongInRadix: !radixWeakness?.weak,
      strongInTransit: !transitWeakness?.weak,
      canBlessSignifications: functionallyBenefic && !radixWeakness?.weak && !transitWeakness?.weak,
      radixWeakness,
      transitWeakness,
    },
    activatedPoints: points.map((item) => item.point),
    notice: "The sub-period sets the trend; close functional-malefic transit contacts activate pressure at the event-house MEP or the natal/transit sub-period lord. This snapshot is not a future transit calendar.",
  };
}

/** Searches for source-defined Systems' Approach transit contacts. The result
 * is a sampled research calendar, not a prediction or an exact ingress time. */
export function searchSystemsTransitContactsBetween(
  radix: ChartResult,
  lagnaSign: number,
  eventHouse: number,
  startJulianDay: number,
  endJulianDay: number,
  stepMinutes = 1440,
) {
  if (!Number.isFinite(startJulianDay) || !Number.isFinite(endJulianDay) || endJulianDay < startJulianDay)
    throw new RangeError("Systems transit search requires a finite, ordered Julian-day interval");
  if (!Number.isFinite(stepMinutes) || stepMinutes <= 0)
    throw new RangeError("Systems transit search resolution must be positive");
  if (!Number.isInteger(eventHouse) || eventHouse < 1 || eventHouse > 12)
    throw new RangeError("Systems transit search event house must be from 1 through 12");
  const step = stepMinutes / 1440;
  const estimatedPoints = Math.floor((endJulianDay - startJulianDay) / step) + 2;
  if (estimatedPoints > 50_000)
    throw new RangeError("Systems transit search exceeds the 50,000-point audit limit; narrow the period or use a coarser resolution");
  const subPeriodLord = radix.advanced.birthPeriods.antardasha as GrahaName | null;
  const radixSubLord = subPeriodLord && radix.placements.find((item) => item.name === subPeriodLord);
  if (!subPeriodLord || !radixSubLord) return {
    status: "unavailable" as const, subPeriodLord, sampledPoints: 0, samples: [], windows: [],
    notice: "A valid radix sub-period lord is required before a Systems transit calendar can be searched.",
  };
  const lagna = radix.placements.find((item) => item.name === "Lagna")!;
  const eventLongitude = ((lagnaSign + eventHouse - 1) % 12) * 30 + lagna.degree;
  const functional = systemsFunctionalNature(lagnaSign);
  const bodies = functional.functionalMalefics;
  type Contact = {
    afflicter: GrahaName; point: "event-house MEP" | "natal sub-period lord" | "transit sub-period lord";
    mode: string; difference: number; influencePercent: number; mostMalefic: boolean;
  };
  const contactsAt = (at: number): Contact[] => {
    const transitSubLongitude = lahiriLongitudeAt(subPeriodLord, at);
    const points = [
      { point: "event-house MEP" as const, longitude: eventLongitude },
      { point: "natal sub-period lord" as const, longitude: radixSubLord.longitude },
      { point: "transit sub-period lord" as const, longitude: transitSubLongitude },
    ];
    return bodies.flatMap((afflicter) => {
      const afflicterLongitude = lahiriLongitudeAt(afflicter, at);
      const afflicterSign = Math.floor(afflicterLongitude / 30);
      const afflicterDegree = afflicterLongitude % 30;
      return points.flatMap(({ point, longitude }) => {
        if (point !== "event-house MEP" && afflicter === subPeriodLord) return [];
        const pointSign = Math.floor(((longitude % 360) + 360) % 360 / 30);
        const pointDegree = ((longitude % 30) + 30) % 30;
        const relation = houseFrom(afflicterSign, pointSign);
        const mode = afflicterSign === pointSign ? "conjunction"
          : SYSTEMS_ASPECT_HOUSES[afflicter].includes(relation) ? `${relation}th aspect` : null;
        if (!mode) return [];
        const difference = Math.abs(afflicterDegree - pointDegree);
        const influencePercent = systemsAfflictionInfluencePercent(difference);
        return influencePercent > 0 ? [{
          afflicter, point, mode, difference, influencePercent,
          mostMalefic: afflicter === functional.mostMalefic,
        }] : [];
      });
    });
  };
  const samples: Array<{
    julianDay: number; iso: string; contacts: Contact[];
  }> = [];
  for (let jd = startJulianDay; jd <= endJulianDay + 1e-9; jd += step) {
    const at = Math.min(jd, endJulianDay);
    samples.push({ julianDay: at, iso: jdToIso(at), contacts: contactsAt(at) });
    if (at === endJulianDay) break;
  }
  const active = new Map<string, { start: typeof samples[number]; end: typeof samples[number]; peak: typeof samples[number]; contact: Contact }>();
  const windows: Array<{ key: string; startJulianDay: number; endJulianDay: number; startIso: string; endIso: string; peakJulianDay: number; peakIso: string; contact: Contact }> = [];
  for (const sample of samples) {
    const present = new Set<string>();
    for (const contact of sample.contacts) {
      const key = `${contact.afflicter}|${contact.point}|${contact.mode}`;
      present.add(key);
      const current = active.get(key);
      if (!current) active.set(key, { start: sample, end: sample, peak: sample, contact });
      else {
        current.end = sample;
        const peakContact = current.peak.contacts.find((item) => `${item.afflicter}|${item.point}|${item.mode}` === key)!;
        if (contact.influencePercent > peakContact.influencePercent) { current.peak = sample; current.contact = contact; }
      }
    }
    for (const [key, current] of active) {
      if (present.has(key)) continue;
      windows.push({ key, startJulianDay: current.start.julianDay, endJulianDay: current.end.julianDay, startIso: current.start.iso, endIso: current.end.iso, peakJulianDay: current.peak.julianDay, peakIso: current.peak.iso, contact: current.contact });
      active.delete(key);
    }
  }
  for (const [key, current] of active) windows.push({ key, startJulianDay: current.start.julianDay, endJulianDay: current.end.julianDay, startIso: current.start.iso, endIso: current.end.iso, peakJulianDay: current.peak.julianDay, peakIso: current.peak.iso, contact: current.contact });
  const hasKeyAt = (key: string, at: number) => contactsAt(at).some((contact) => `${contact.afflicter}|${contact.point}|${contact.mode}` === key);
  const contactForKeyAt = (key: string, at: number) =>
    contactsAt(at).find((contact) => `${contact.afflicter}|${contact.point}|${contact.mode}` === key) ?? null;
  const toleranceDays = Math.min(step, 1 / 1440); // refine to one minute or the supplied resolution
  const refineTransition = (key: string, left: number, right: number, leftActive: boolean) => {
    while ((right - left) > toleranceDays) {
      const middle = (left + right) / 2;
      if (hasKeyAt(key, middle) === leftActive) left = middle;
      else right = middle;
    }
    return (left + right) / 2;
  };
  const refinedWindows = windows.map((window) => {
    const ingressTruncated = window.startJulianDay <= startJulianDay + 1e-9;
    const egressTruncated = window.endJulianDay >= endJulianDay - 1e-9;
    const refinedStartJulianDay = ingressTruncated ? window.startJulianDay
      : refineTransition(window.key, Math.max(startJulianDay, window.startJulianDay - step), window.startJulianDay, false);
    const refinedEndJulianDay = egressTruncated ? window.endJulianDay
      : refineTransition(window.key, window.endJulianDay, Math.min(endJulianDay, window.endJulianDay + step), true);
    const sampledPeakJulianDay = window.peakJulianDay;
    const sampledPeakIso = window.peakIso;
    const sampledPeakContact = window.contact;
    let left = Math.max(refinedStartJulianDay, sampledPeakJulianDay - step);
    let right = Math.min(refinedEndJulianDay, sampledPeakJulianDay + step);
    const phi = (Math.sqrt(5) - 1) / 2;
    let x1 = right - phi * (right - left);
    let x2 = left + phi * (right - left);
    const differenceAt = (at: number) => contactForKeyAt(window.key, at)?.difference ?? 5;
    let f1 = differenceAt(x1);
    let f2 = differenceAt(x2);
    while (right - left > toleranceDays) {
      if (f1 <= f2) {
        right = x2; x2 = x1; f2 = f1;
        x1 = right - phi * (right - left); f1 = differenceAt(x1);
      } else {
        left = x1; x1 = x2; f1 = f2;
        x2 = left + phi * (right - left); f2 = differenceAt(x2);
      }
    }
    const peakCandidates = [sampledPeakJulianDay, left, (left + right) / 2, right]
      .map((julianDay) => ({ julianDay, contact: contactForKeyAt(window.key, julianDay) }))
      .filter((item): item is { julianDay: number; contact: Contact } => item.contact !== null)
      .sort((a, b) => a.contact.difference - b.contact.difference);
    const refinedPeak = peakCandidates[0] ?? { julianDay: sampledPeakJulianDay, contact: sampledPeakContact };
    return {
      ...window,
      sampledPeakJulianDay,
      sampledPeakIso,
      sampledPeakContact,
      peakJulianDay: refinedPeak.julianDay,
      peakIso: jdToIso(refinedPeak.julianDay),
      contact: refinedPeak.contact,
      peakBoundaryToleranceMinutes: toleranceDays * 1440,
      peakRefinement: "golden-section-within-best-sample-bracket" as const,
      refinedStartJulianDay,
      refinedEndJulianDay,
      refinedStartIso: jdToIso(refinedStartJulianDay),
      refinedEndIso: jdToIso(refinedEndJulianDay),
      ingressBoundary: ingressTruncated ? "interval-truncated" as const : "refined" as const,
      egressBoundary: egressTruncated ? "interval-truncated" as const : "refined" as const,
    };
  });
  return {
    status: refinedWindows.length ? "contact-windows-found" as const : "no-contact-window" as const,
    subPeriodLord, startJulianDay, endJulianDay, resolutionMinutes: stepMinutes,
    boundaryToleranceMinutes: toleranceDays * 1440,
    sampledPoints: samples.length, samples, windows: refinedWindows,
    astronomy: "Sahadeva apparent planetary longitudes with mean Lahiri ayanamsa",
    notice: "Bracketed ingress and egress are refined to the declared boundary tolerance; interval-edge windows remain explicitly truncated. Each sampled peak is retained and its local bracket is continuously refined to minimum degree difference at the same tolerance. Contacts are traditional pressure testimony, not an event promise or calibrated probability.",
  };
}

export function prashnaChart(request: PrashnaRequest, receivedAt: Date) {
  const local = localParts(receivedAt, request.timezone),
    input: BirthInput = {
      name: "Prashna",
      ...local,
      place: request.place,
      latitude: request.latitude,
      longitude: request.longitude,
      timezone: request.timezone,
      timezoneOffset: offsetHours(receivedAt, request.timezone),
      language: request.language,
      methodology: "parashari",
      focus: "general",
      birthTimeAccuracyMinutes: 1,
      houseSystem: "whole-sign",
    };
  return calculateChart(input);
}
export function evaluateChartFitness(
  chart: ChartResult,
  effectiveLagnaLongitude?: number,
): ConsultationResult["chartFitness"] {
  const chartLagna = chart.placements.find((p) => p.name === "Lagna")!,
    lagna = effectiveLagnaLongitude === undefined
      ? chartLagna
      : { ...chartLagna, degree: effectiveLagnaLongitude % 30 },
    moon = chart.placements.find((p) => p.name === "Moon")!,
    reasons: string[] = [];
  if (lagna.degree < 0.5 || lagna.degree > 29.5)
    reasons.push("Lagna is within 0.5° of a sign boundary.");
  if (moon.degree < 0.25 || moon.degree > 29.75)
    reasons.push("Moon is within 0.25° of a sign boundary.");
  if (chart.advanced.uncertainty.boundaryWarnings.length)
    reasons.push(...chart.advanced.uncertainty.boundaryWarnings);
  return {
    status: (reasons.length ? "sensitive" : "fit") as "fit" | "sensitive",
    reasons,
    unavailableChecks: [
      "Tradition-specific radicality conditions beyond numerical boundary sensitivity remain under source review.",
    ],
  };
}
export function prashnaObservations(
  chart: ChartResult,
  category: QuestionCategory,
  tradition: PrashnaTradition = "integrated",
  options: { effectiveLagnaLongitude?: number; futureChart?: ChartResult; seedNumber?: number; referenceHouse?: number } = {},
) {
  const chartLagna = chart.placements.find((p) => p.name === "Lagna")!,
    lagna = options.effectiveLagnaLongitude === undefined
      ? chartLagna
      : {
          ...chartLagna,
          longitude: options.effectiveLagnaLongitude,
          sign: Math.floor(options.effectiveLagnaLongitude / 30),
          degree: options.effectiveLagnaLongitude % 30,
        },
    targetHouse = PRASHNA_HOUSES[category],
    referenceHouse = requestReferenceHouse(options),
    targetSign = (lagna.sign + referenceHouse - 1 + targetHouse - 1) % 12,
    targetLord = LORDS[targetSign],
    lord = chart.placements.find((p) => p.name === targetLord)!,
    dignity = chart.advanced.dignities.find((d) => d.name === targetLord),
    occupants = chart.placements.filter(
      (p) => p.name !== "Lagna" && p.sign === targetSign,
    ),
    items: EvidenceObservation[] = [];
  const add = (
    id: string,
    label: string,
    polarity: EvidenceObservation["polarity"],
    weight: number,
    facts: string[],
    explicitSourceIds?: string[],
  ) => {
    const provenance = prashnaRuleProvenance(id, `sahadeva-prashna-${tradition}-3`);
    items.push({
      id,
      label,
      polarity,
      weight,
      facts,
      provenance: explicitSourceIds ? { ...provenance, sourceIds: explicitSourceIds } : provenance,
    });
  };
  const lordHouse = houseFrom(lagna.sign, lord.sign);
  if (referenceHouse !== 1)
    add("prashna:derived-house", "Question is judged from a derived ascendant", "neutral", 0, [
      `House ${referenceHouse} is treated as the other person's first house; their topic house is ${targetHouse}.`,
    ]);
  if (tradition === "classical" || tradition === "integrated") {
    const navamsaIndex = Math.min(8, Math.floor(lagna.degree / (30 / 9)));
    const oddSignSequence = ["Dhatu", "Moola", "Jeeva"];
    const evenSignSequence = ["Jeeva", "Moola", "Dhatu"];
    const classification = (lagna.sign % 2 === 0 ? oddSignSequence : evenSignSequence)[navamsaIndex % 3];
    add("prashna:classical-dhatu-moola-jeeva", "Classical Navamsa classification of the question", "neutral", 0, [
      `Lagna Navamsa ${navamsaIndex + 1} in a ${lagna.sign % 2 === 0 ? "classed odd" : "classed even"} sign gives ${classification}.`,
    ], [PRASHNA_SOURCES.chappanna.id]);
    const silentQuery = classicalSilentQueryVerses12To13(chart, lagna.sign);
    add("prashna:classical-silent-query-verses-12-13", "Classical Lagna-sign and planetary-influence classification", "neutral", 0, [
      `Strict sign-and-influence match(es): ${silentQuery.strictMatches.join(", ") || "none"}.`,
      `All influencing families: ${silentQuery.influenceCandidates.join(", ") || "none"}; status ${silentQuery.status}.`,
      ...silentQuery.rows.flatMap((row) => row.influencers.map((item) => `${row.classification}: ${item.planet} by ${item.mode}; sign gate ${row.signEligible ? "satisfied" : "not satisfied"}.`)),
      "Daivajna Vallabha, Chapter X, verses 12–13. Mixed planetary families remain mixed and do not override the separate Chappanna Navamsa classification.",
    ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
    const objectDescriptors = classicalSilentQueryVerses6To8(chart, lagna.sign);
    add("prashna:classical-silent-query-verses-6-8", "Classical silent-query size, color and shape candidates", "neutral", 0, [
      `Rising sign index ${lagna.sign} classifies the object's size/length as ${objectDescriptors.signLength}.`,
      `Planet candidates: ${objectDescriptors.descriptorCandidates.map((item) => `${item.planet} (${item.color}, ${item.shape}; D9 ${item.d9Sign ?? "unavailable"}, ${item.relationship})`).join("; ")}.`,
      objectDescriptors.selectedPlanet
        ? `Selected descriptor: ${objectDescriptors.selectedPlanet} — ${objectDescriptors.selectedDescriptor!.color}, ${objectDescriptors.selectedDescriptor!.shape}.`
        : `No descriptor selected; leaders: ${objectDescriptors.leaders.join(", ") || "unavailable"}.`,
      objectDescriptors.notice,
      "Daivajna Vallabha, Chapter X, verses 6–8. These symbolic descriptors do not identify a person or prove an object's properties.",
    ], [PRASHNA_SOURCES.daivajnaVallabha.id, PRASHNA_SOURCES.marga.id]);
    const silentSubject = classicalSilentQueryVerses3To4(chart, lagna.sign);
    add("prashna:classical-silent-query-verses-3-4", "Classical silent-query subject candidates", "neutral", 0, [
      `Local-strength status: ${silentSubject.strengthStatus}; leader(s): ${silentSubject.strengthLeaders.join(", ") || "none"}.`,
      silentSubject.selectedPlanet
        ? `Selected planet ${silentSubject.selectedPlanet} occupies house ${silentSubject.selectedHouse}; subject candidate(s): ${silentSubject.subjectCandidates.join(", ") || "none"}; status ${silentSubject.status}.`
        : "No unique strongest planet; no subject is inferred.",
      ...(silentSubject.sourceAmbiguity ? [silentSubject.sourceAmbiguity] : []),
      "Daivajna Vallabha, Chapter X, verses 3–4, using the independently source-located Prasna Marga natural-friendship table. This symbolic classification does not establish facts about another person.",
    ], [PRASHNA_SOURCES.daivajnaVallabha.id, PRASHNA_SOURCES.marga.id]);
    const risingMode = SIRSHODAYA_SIGNS.has(lagna.sign)
      ? "Sirshodaya (head-rising)"
      : PRISHTODAYA_SIGNS.has(lagna.sign)
        ? "Prishtodaya (back-rising)"
        : "Ubhayodaya (both-rising)";
    add(
      "prashna:classical-rising-mode",
      `Classical ascendant is ${risingMode}`,
      SIRSHODAYA_SIGNS.has(lagna.sign)
        ? "supportive"
        : PRISHTODAYA_SIGNS.has(lagna.sign)
          ? "challenging"
          : "neutral",
      SIRSHODAYA_SIGNS.has(lagna.sign) || PRISHTODAYA_SIGNS.has(lagna.sign) ? 2 : 0,
      [
        `Ascendant sign index ${lagna.sign} is classified as ${risingMode}.`,
        "Daivajna Vallabha, Chapter II, verses 20–21: head-rising versus contrary rising conditions are general success testimony; mixed conditions remain mixed.",
      ],
      [PRASHNA_SOURCES.daivajnaVallabha.id],
    );
    if (category === "relationship" || category === "children") {
      const topic = category === "relationship" ? "marriage" : "children";
      const prosperity = classicalUpachayaProsperity(chart, lagna.sign, topic);
      if (prosperity.matches)
        add(
          `prashna:classical-upachaya-${topic}`,
          topic === "marriage"
            ? "Venus and the seventh lord occupy Upachayas"
            : "Jupiter and the fifth lord occupy Upachayas",
          "supportive",
          3,
          [
            `${prosperity.karaka} occupies house ${prosperity.karakaHouse}; ${prosperity.topicLord}, lord of house ${prosperity.topicHouse}, occupies house ${prosperity.lordHouse}.`,
            topic === "marriage"
              ? "Prasna Marga Part II, Chapter XVII, stanza 27 associates this with happiness after marriage and children."
              : "Raman's note immediately following Chapter XVII, stanza 27 extends the karaka-and-lord principle to prosperity after a child's birth.",
          ],
          [PRASHNA_SOURCES.marga.id],
        );
    }
    if (category === "relationship") {
      const marriage = classicalMarriageChapterRules(chart, lagna.sign);
      if (marriage.promiseCluster.matches)
        add("prashna:classical-marriage-promise-cluster", "Daivajna Vallabha marriage-promise clauses are present", "supportive", 3, [
          `Moon occupies house ${marriage.moonHouse}; aspectors: ${marriage.aspectorNames.join(", ") || "none"}.`,
          `Matched clauses: ${marriage.promiseCluster.clauses.join("; ")}.`,
          "Overlapping promise clauses from verses 1, 4 and 11–13 are aggregated into one observation and one weight.",
          marriage.unresolvedClause,
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (marriage.obstacleCluster.matches)
        add("prashna:classical-marriage-obstacle-cluster", "Daivajna Vallabha marriage-obstacle clauses are present", "challenging", 3, [
          `Matched clauses: ${marriage.obstacleCluster.clauses.join("; ")}.`,
          `Moon contacts from natural malefics: ${marriage.obstacleCluster.maleficContacts.map((item) => `${item.planet} ${item.mode}`).join(", ")}.`,
          ...(marriage.obstacleCluster.verse12MaleficContacts.length ? [`Verse 12 ascendant-target contacts: ${marriage.obstacleCluster.verse12MaleficContacts.map((item) => `${item.afflicter} aspects ${item.target}`).join(", ")}.`] : []),
          "Overlapping malefic-contact clauses in verses 4, 11 and 12 are aggregated into one observation and one weight.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (marriage.verse3.active)
        add("prashna:classical-marriage-saturn-seventh-parity", "Saturn in the seventh activates the source's sign-parity clause", marriage.verse3.polarity, 2, [
          `Saturn occupies the seventh in an ${marriage.verse3.saturnSignParity} sign.`,
          "Daivajna Vallabha, Marriage chapter, verse 3; this is one traditional testimony, not a guarantee or denial.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
    }
    if (category === "money") {
      const gains = classicalGainsAndLossesChapterRules(chart, lagna.sign);
      if (gains.verse1Gain.supportive.length)
        add("prashna:classical-gains-verse-1-support", "Benefics occupy gain-producing houses", "supportive", 2, [
          `Qualifying placements: ${gains.verse1Gain.supportive.map((item) => `${item.planet} in house ${item.house}`).join(", ")}.`,
          "Daivajna Vallabha, Chapter III, verse 1; simultaneous qualifying benefics form one testimony.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (gains.verse1Gain.adverse.length)
        add("prashna:classical-gains-verse-1-obstacle", "Malefics occupy the same gain-sensitive houses", "challenging", 2, [
          `Qualifying placements: ${gains.verse1Gain.adverse.map((item) => `${item.planet} in house ${item.house}`).join(", ")}.`,
          "Daivajna Vallabha, Chapter III, verse 1; this opposing axis remains separate from benefic testimony.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (gains.verse1Prosperity.length)
        add("prashna:classical-gains-verse-1-prosperity", "Benefics occupy status, honour, or wealth houses", "supportive", 2, [
          `Qualifying placements: ${gains.verse1Prosperity.map((item) => `${item.planet} in house ${item.house} (${item.indication})`).join(", ")}.`,
          "Daivajna Vallabha, Chapter III, verse 1; overlapping status and wealth clauses are aggregated once.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (gains.verse2.supportive)
        add("prashna:classical-gains-verse-2-woman", "Moon receives benefic aspect in a woman-linked gain house", "supportive", 2, [
          `Moon occupies house ${gains.verse2.moonHouse}; benefic aspectors: ${gains.verse2.beneficAspectors.join(", ")}.`,
          "Daivajna Vallabha, Chapter III, verse 2.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (gains.verse2.adverse)
        add("prashna:classical-gains-verse-2-fear-loss", "Moon receives malefic aspect in a loss-sensitive house", "challenging", 2, [
          `Moon occupies house ${gains.verse2.moonHouse}; malefic aspectors: ${gains.verse2.maleficAspectors.join(", ")}.`,
          "Daivajna Vallabha, Chapter III, verse 2.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (gains.verse2.beneficsInAdverseListedHouses.length)
        add("prashna:classical-gains-verse-2-benefic-reversal", "Benefics occupy the verse's otherwise loss-sensitive houses", "supportive", 1, [
          `Qualifying placements: ${gains.verse2.beneficsInAdverseListedHouses.map((item) => `${item.planet} in house ${item.house}`).join(", ")}.`,
          "Daivajna Vallabha, Chapter III, verse 2; all matches are one correlated reversal testimony.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (gains.verse3.quickGain)
        add("prashna:classical-gains-verse-3-quick", "Benefics and malefics occupy the complete quick-gain arrangement", "supportive", 3, [
          "Every calculated natural benefic is in a quadrant or trine and every calculated natural malefic is in house 3, 6, or 11.",
          "Daivajna Vallabha, Chapter III, verse 3; the complete arrangement is required rather than matching a single planet.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (gains.verse4.immediateGain)
        add("prashna:classical-gains-verse-4-immediate", "Sun–Moon house combination for immediate monetary gain is present", "supportive", 3, [
          `Moon occupies house ${gains.verse4.moonHouse}; Sun occupies house ${gains.verse4.sunHouse}.`,
          "Daivajna Vallabha, Chapter III, verse 4; ‘immediate’ is retained as source wording but not converted into a date.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      add("prashna:classical-gains-verse-5-modality", "Rising modality classifies status-or-post testimony", gains.verse5.indication === "status-or-post" ? "supportive" : gains.verse5.indication === "no-status-or-post" ? "challenging" : "neutral", gains.verse5.indication === "mixed" ? 0 : 2, [
        `The ascendant is ${gains.verse5.modality}; the source indication is ${gains.verse5.indication}.`,
        "Daivajna Vallabha, Chapter III, verse 5; dual signs explicitly carry both results.",
      ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
    }
    if (category === "missing-person") {
      const abroad = classicalAbroadReturnChapterRules(chart, lagna.sign);
      const returnClauses = [
        ...(abroad.verse1.allPlanetsInReturnHouses ? ["verse 1: all seven classical planets occupy houses 2, 3 or 5"] : []),
        ...(abroad.verse2.jupiterQuadrantWithPlanetSixOrSeven ? [`verse 2: Jupiter is angular and ${abroad.verse2.planetInSixthOrSeventh.join(", ")} occupies house 6 or 7`] : []),
        ...(abroad.verse2.mercuryOrVenusInFiveOrNine.length ? [`verse 2: ${abroad.verse2.mercuryOrVenusInFiveOrNine.join(", ")} occupies house 5 or 9`] : []),
        ...(abroad.verse3.happyReturn ? ["verse 3: Moon is in house 8 without a natural malefic in an angle"] : []),
        ...(abroad.verse5.return ? ["verse 5: Jupiter and Venus both occupy houses 2 or 3"] : []),
        ...(abroad.verse5.entersHome ? ["verse 5: Jupiter and Venus both occupy house 4"] : []),
        ...(abroad.verse6.return ? ["verse 6: all natural malefics occupy houses 3 or 11 and all natural benefics occupy quadrants or trines"] : []),
      ];
      if (returnClauses.length)
        add("prashna:classical-abroad-return-cluster", "Daivajna Vallabha return combinations are present", "supportive", 3, [
          `Matched clauses: ${returnClauses.join("; ")}.`,
          ...(abroad.verse1.quickReturnPlanets.length ? [`Verse 1 quick-return refinement: ${abroad.verse1.quickReturnPlanets.join(", ")}.`] : []),
          ...(abroad.verse3.returnWithGains ? [`Verse 3 return-with-gains refinement: angular benefics ${abroad.verse3.beneficsInAngles.join(", ")}.`] : []),
          "Daivajna Vallabha, Chapter VI, verses 1–3, 5–6; overlapping return conclusions are aggregated into one observation and one weight.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (abroad.verse10.beneficsInNinth.length)
        add("prashna:classical-abroad-verse-10-safe", "Benefic ninth-house testimony supports an untroubled journey", "supportive", 2, [
          `Natural benefics in house 9: ${abroad.verse10.beneficsInNinth.join(", ")}.`,
          "Daivajna Vallabha, Chapter VI, verse 10.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (abroad.verse10.maleficsInAscendant.length)
        add("prashna:classical-abroad-verse-10-trouble", "Malefic ascendant testimony indicates difficulty on the journey", "challenging", 2, [
          `Natural malefics in the ascendant: ${abroad.verse10.maleficsInAscendant.join(", ")}.`,
          "Daivajna Vallabha, Chapter VI, verse 10; this does not imply death, detention, or a specific event.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
    }
    if (category === "health") {
      const disease = classicalDiseaseRecoveryChapterRules(chart, lagna.sign);
      if (disease.verse3.hardship)
        add("prashna:classical-disease-verse-3-hardship", "Moon or Mercury in the ascendant receives natural-malefic aspect", "challenging", 2, [
          `Contacts: ${disease.verse3.contacts.map((item) => `${item.afflicter} aspects ${item.target}`).join(", ")}.`,
          "Daivajna Vallabha, Chapter VIII, verse 3. This is traditional hardship testimony, not a medical diagnosis.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      const recoveryClauses = [
        ...(disease.verse4.recovery ? ["verse 4 multi-gate recovery arrangement"] : []),
        ...(disease.verse6.moonUpachayaArrangement ? ["verse 6 Moon-Upachaya and benefic-house arrangement"] : []),
        ...(disease.verse6.beneficAscendantAspect ? [`verse 6 benefic aspect to the ascendant from ${disease.verse6.beneficAscendantAspectors.join(", ")}`] : []),
        ...(disease.verse7.fullMoonInAscendantAspectedByJupiter ? ["verse 7 full Moon in ascendant aspected by Jupiter"] : []),
        ...(disease.verse7.jupiterVenusAngular ? ["verse 7 Jupiter and Venus both angular"] : []),
      ];
      if (recoveryClauses.length)
        add("prashna:classical-disease-recovery-cluster", "Daivajna Vallabha recovery combinations are present", "supportive", 3, [
          `Matched clauses: ${recoveryClauses.join("; ")}.`,
          "Chapter VIII verses 4, 6 and 7 are aggregated into one observation because they share the same recovery conclusion.",
          "This records traditional symbolic testimony only; it is not medical advice, diagnosis, prognosis, or a reason to delay care.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
    }
    if (category === "children") {
      const combinations = classicalChildrenBirthCombinations(chart, lagna.sign);
      if (combinations.stanza18.matches)
        add("prashna:classical-children-stanza-18", "Mars in the specified fifth house receives Jupiter's aspect", "supportive", 3, [
          `Mars occupies the fifth house in sign index ${combinations.fifthSign}; Jupiter aspects that sign by classical graha drishti.`,
          "Prasna Marga Part II, Chapter XVIII, stanza 18.",
        ], [PRASHNA_SOURCES.marga.id]);
      if (combinations.stanza22.matches)
        add("prashna:classical-children-stanza-22", "Strong Jupiter occupies an indicated house without malefic aspect", "supportive", 3, [
          `Jupiter occupies house ${combinations.stanza22.jupiterHouse}, is own-sign, exalted, or in the ascendant with directional strength, and receives no calculated natural-malefic graha drishti.`,
          "Prasna Marga Part II, Chapter XVIII, stanza 22 and its immediately following strength note.",
        ], [PRASHNA_SOURCES.marga.id]);
    }
    if (category === "lost-object") {
      const earlyLocation = classicalLostPropertyVerses1To3Location(chart, lagna.sign);
      add("prashna:classical-lost-property-verses-1-3-location", "Classical sign and Navamsa location testimony", "neutral", 0, [
        `D1 sign index ${earlyLocation.d1Sign} is ${earlyLocation.d1Modality}; D9 Lagna sign index ${earlyLocation.d9Sign ?? "unavailable"} is ${earlyLocation.d9Modality ?? "unavailable"}; Vargottama ${earlyLocation.vargottama ? "yes" : "no"}.`,
        `Location candidates: ${earlyLocation.locationCandidates.join(", ") || "none"}; evidence status: ${earlyLocation.status}.`,
        ...earlyLocation.testimonies.map((item) => `Verse ${item.verse}: ${item.location} from ${item.basis}.`),
        "Identity, sex, caste, age, disability and bodily-mark clauses are excluded; this evidence cannot identify or accuse a person.",
      ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      const location = classicalLostObjectLocation(
        chart.placements,
        lagna.longitude,
        Object.fromEntries(chart.advanced.planetaryStates.avasthas.map((item) => [item.name, item.shadbalaTotalVirupas])),
      );
      add("prashna:classical-lost-property-location-verse-9", "Classical lost-property direction and Navamsa-distance evidence", "neutral", 0, [
        ...(location.direction
          ? [`Direction: ${location.direction}; basis ${location.directionBasis}${location.selectedPlanet ? ` (${location.selectedPlanet})` : ""}.`]
          : [`Direction unresolved; basis ${location.directionBasis}. Angular candidates: ${location.angularCandidates.map((item) => `${item.planet} (${item.direction ?? "unmapped"}, strength ${item.shadbalaTotalVirupas ?? "unavailable"})`).join(", ") || "none"}.`]),
        `Rising Navamsa ordinal ${location.navamsaOrdinal}; completed divisions ${location.completedNavamsas}; fifth-Navamsa country marker ${location.fifthNavamsaCountryMarker ? "present" : "absent"}.`,
        location.distanceNotice,
        ...(location.lagnaComparisonStatus === "whole-sign-bhava-bala-unavailable" ? ["A planet-to-Lagna strength comparison remains unavailable on the default whole-sign chart."] : []),
        "Daivajna Vallabha, Lost Articles verse 9; independently expanded by Chappanna/Prasana Sastra stanza 41.",
      ], [PRASHNA_SOURCES.daivajnaVallabha.id, PRASHNA_SOURCES.chappanna.id]);
      const additional = classicalLostPropertyAdditionalRules(chart, lagna.sign);
      add("prashna:classical-lost-property-verse-8", "Classical lost-property rising-decanate classification", "neutral", 0, [
        `Rising decanate ${additional.verse8.decanate}: the source classifies the matter as ${additional.verse8.lossMode}.`,
        "Daivajna Vallabha, Lost Articles chapter, verse 8; this is a classification, not proof of theft or culpability.",
      ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      const recovery = classicalLostPropertyVerse10(chart, lagna.sign);
      if (recovery.matches)
        add("prashna:classical-lost-property-verse-10", "Classical lost-property recovery combination is present", "supportive", 3, [
          `Venus occupies house ${recovery.venusHouse}, Jupiter occupies house ${recovery.jupiterHouse}, and ${recovery.ascendantBenefics.join(", ")} supplies benefic occupancy of the ascendant.`,
          "Daivajna Vallabha, Lost Property chapter, verse 10.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      const verse14 = classicalLostPropertyVerse14(chart, lagna.sign);
      if (verse14.matches)
        add("prashna:classical-lost-property-verse-14", "Classical lost-property recovery alternatives are present", "supportive", 2, [
          ...(verse14.ascendantQualifiers.length ? [`Qualifying ascendant occupants: ${verse14.ascendantQualifiers.join(", ")}.`] : []),
          ...(verse14.seventhBenefics.length ? [`Natural benefics in the seventh: ${verse14.seventhBenefics.join(", ")}.`] : []),
          "Daivajna Vallabha, Lost Property chapter, verse 14; simultaneous alternatives are aggregated into one observation.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (additional.recoveryCluster.matches)
        add("prashna:classical-lost-property-benefic-recovery-cluster", "Correlated benefic recovery clauses are present", "supportive", 2, [
          `Matched Daivajna Vallabha Lost Articles verse(s): ${additional.recoveryCluster.matchedVerses.join(", ")}.`,
          ...(additional.recoveryCluster.verse11.fullMoonInAscendant ? ["Verse 11 explicit clause: full Moon occupies the ascendant; its undefined ‘very strong benefic’ and grammatically ambiguous Sirshodaya alternatives remain inactive."] : []),
          ...(additional.recoveryCluster.verse12.length ? [`Verse 12 qualifying occupants: ${additional.recoveryCluster.verse12.map((item) => `${item.planet} in ${item.house}`).join("; ")}.`] : []),
          ...(additional.recoveryCluster.verse13.fullMoonAspected.length ? [`Verse 13 full Moon in Lagna is aspected by ${additional.recoveryCluster.verse13.fullMoonAspected.join(", ")}.`] : []),
          ...(additional.recoveryCluster.verse13.quadrantAndUpachaya ? ["Verse 13 has benefic testimony in both quadrant and Upachaya sets."] : []),
          ...(additional.recoveryCluster.verse13.secondAndUpachaya ? ["Verse 13 has benefic testimony in both the second and Upachaya sets."] : []),
          ...(additional.recoveryCluster.verse15.length ? [`Verse 15 qualifying occupants: ${additional.recoveryCluster.verse15.map((item) => `${item.planet} in ${item.house}`).join("; ")}.`] : []),
          "Verses 11–15 are deliberately aggregated into one observation and one weight because their recovery predicates overlap.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (additional.verse16.adverse || additional.verse16.supportive)
        add(
          "prashna:classical-lost-property-verse-16",
          "Classical ascendant recovery testimony",
          additional.verse16.adverse && additional.verse16.supportive
            ? "neutral"
            : additional.verse16.supportive ? "supportive" : "challenging",
          additional.verse16.adverse && additional.verse16.supportive ? 0 : 3,
          [
            ...(additional.verse16.adverse ? [`The ascendant sign is ruled by natural malefic ${additional.verse16.ascendantSignLord} and receives natural-malefic aspect from ${additional.verse16.adverseAspectors.join(", ")}.`] : []),
            ...(additional.verse16.supportive ? [`Benefic ascendant/aspector pair(s): ${additional.verse16.supportivePairs.map((item) => `${item.occupant}–${item.aspecter}`).join(", ")}.`] : []),
            "Daivajna Vallabha, Lost Articles chapter, verse 16; simultaneous opposing clauses remain mixed rather than being counted twice.",
          ],
          [PRASHNA_SOURCES.daivajnaVallabha.id],
        );
      if (additional.verse17.opposesRecovery)
        add("prashna:classical-lost-property-verse-17", "Classical non-recovery combination is present", "challenging", 3, [
          ...(additional.verse17.maleficAspectors.length ? [`The seventh is sign index ${additional.verse17.seventhSign} in its own Navamsa and receives natural-malefic aspect from ${additional.verse17.maleficAspectors.join(", ")}.`] : []),
          ...(additional.verse17.marsInEighthNamedNavamsa ? [`Mars occupies the eighth and its D9 sign ${additional.verse17.marsNavamsaSign} is one of the verse's named Leo/Scorpio/Aquarius Navamsas.`] : []),
          "Daivajna Vallabha, Lost Articles chapter, verse 17; both alternatives are correlated into one non-recovery observation, not a guarantee.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
    }
    if (category === "travel") {
      const travelMode = classicalTravelRisingMode(lagna.sign, lagna.degree);
      add("prashna:classical-travel-rising-mode", "Classical travel rising-sign mode", travelMode.supportsTravel ? "supportive" : "challenging", 3, [
        `The ascendant is in the ${travelMode.reason}, treated as ${travelMode.mode} for this travel question.`,
        "Daivajna Vallabha, Chapter IV, verse 1.",
      ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      const travel = classicalTravelVerses2To4(chart, lagna.sign);
      if (travel.verse2.directEarlyTravel.length)
        add("prashna:classical-travel-verse-2-direct", "Direct planet in a movable ascendant supports early travel", "supportive", 2, [
          `${travel.verse2.directEarlyTravel.join(", ")} occupies the movable ascendant without retrograde motion.`,
          "Daivajna Vallabha, Chapter IV, verse 2.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (travel.verse2.retrogradeNoTravel.length)
        add("prashna:classical-travel-verse-2-retrograde", "Retrograde occupant reverses the verse-2 travel testimony", "challenging", 2, [
          `${travel.verse2.retrogradeNoTravel.join(", ")} occupies the movable ascendant in retrograde motion.`,
          "Daivajna Vallabha, Chapter IV, verse 2 retrograde exception.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (travel.verse3.fixedReturn.length)
        add("prashna:classical-travel-verse-3", "Fixed-ascendant occupant supports breaking the journey and returning", "challenging", 2, [
          `${travel.verse3.fixedReturn.join(", ")} occupies the fixed ascendant.`,
          "Daivajna Vallabha, Chapter IV, verse 3.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (travel.verse4.earlyJourney.length)
        add("prashna:classical-travel-verse-4-eleventh", "Specified planet in the eleventh supports an early journey", "supportive", 2, [
          `${travel.verse4.earlyJourney.join(", ")} occupies house 11.`,
          "Daivajna Vallabha, Chapter IV, verse 4.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (travel.verse4.breaksAndReturns.length)
        add("prashna:classical-travel-verse-4-twelfth", "Specified planet in the twelfth supports breaking the journey and returning", "challenging", 2, [
          `${travel.verse4.breaksAndReturns.join(", ")} occupies house 12.`,
          "Daivajna Vallabha, Chapter IV, verse 4.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      const laterTravel = classicalTravelVerses5To9(chart, lagna.sign);
      if (laterTravel.verse5.noReturn)
        add("prashna:classical-travel-verse-5-no-return", "Fixed ascendant receives both Jupiter and Saturn aspects", "challenging", 3, [
          "Both Jupiter and Saturn aspect the fixed ascendant.",
          "Daivajna Vallabha, Chapter IV, verse 5; this is traditional non-return testimony, not certainty.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      if (laterTravel.verse6.noTravel)
        add("prashna:classical-travel-verse-6-no-travel", "All literal malefic-house and malefic-aspect gates oppose travel", "challenging", 3, [
          `House targets: ${laterTravel.verse6.targets.map((item) => `${item.house}: ${item.planets.join(", ")}`).join("; ")}.`,
          "Daivajna Vallabha, Chapter IV, verse 6; houses 5, 6 and 9 are each required to contain an independently malefic-aspected natural malefic.",
        ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
      add("prashna:classical-travel-verses-8-9-timing-candidates", "Return-month candidates await strongest-planet selection", "neutral", 0, [
        ...laterTravel.verses8To9.candidates.map((item) => `${item.planet}: ${item.distanceInSigns} sign-count × ${item.multiplier ?? "unavailable"} (${item.navamsaModality ?? "unknown"} Navamsa) = ${item.months ?? "unavailable"} month(s).`),
        laterTravel.verses8To9.notice,
      ], [PRASHNA_SOURCES.daivajnaVallabha.id]);
    }
  }
  if (tradition === "systems-approach" || tradition === "integrated") {
    const mep = lagna.degree;
    const systemsNature = systemsFunctionalNature(lagna.sign);
    const functionalMalefics = new Set(systemsNature.functionalMalefics);
    add("prashna:systems-mep", "Most Effective Point", "neutral", 0, [
      `The rising degree ${mep.toFixed(2)}° is projected as the MEP of every house.`,
    ], [PRASHNA_SOURCES.systems.id]);
    add("prashna:systems-functional-nature", "Ascendant-specific functional nature", "neutral", 0, [
      `Functional malefics: ${[...functionalMalefics].join(", ")}.`,
      `Functional benefics: ${systemsNature.functionalBenefics.join(", ")}.`,
    ], [PRASHNA_SOURCES.systems.id]);
    add("prashna:systems-mmp", "Most Malefic Planet precedence", "neutral", 0, [
      `MMP: ${systemsNature.mostMalefic}.`,
      systemsNature.precedence,
    ], [PRASHNA_SOURCES.systems.id]);
    const operatingPeriods = systemsOperatingPeriodProfile(chart, lagna.sign);
    const periodFacts = [
      ["main", operatingPeriods.mainPeriod],
      ["sub", operatingPeriods.subPeriod],
      ["sub-sub", operatingPeriods.subSubPeriod],
    ].flatMap(([level, profile]) => profile && typeof profile !== "string"
      ? [`${level} period ${profile.planet}: ${profile.functionalNature}; activates ${profile.activatedLayers.join(", ")}${profile.weakness?.weak ? `; weak through ${profile.weakness.reasons.join("; ")}` : ""}.`]
      : []);
    if (periodFacts.length)
      add("prashna:systems-operating-period-profile", "Systems' Approach operating-period activation profile", "neutral", 0, [
        ...periodFacts,
        "This profile identifies activated layers only; the OCR-corrupt favorable/adverse synthesis is not inferred.",
      ], [PRASHNA_SOURCES.systems.id]);
    if (options.futureChart) {
      const interaction = systemsPeriodTransitInteraction(chart, options.futureChart, lagna.sign, targetHouse);
      if (interaction.subPeriodLord)
        add("prashna:systems-period-transit-interaction", "Systems' Approach sub-period/transit interaction snapshot", "neutral", 0, [
          `Sub-period lord ${interaction.subPeriodLord}; status ${interaction.status}; ability to bless while strong in both radix and transit: ${interaction.capability?.canBlessSignifications ? "yes" : "no"}.`,
          ...(interaction.contacts.map((contact) => `${contact.afflicter} reaches ${contact.point} by ${contact.mode}; ${contact.difference.toFixed(2)}° difference, ${contact.influencePercent.toFixed(1)}% close influence${contact.mostMalefic ? "; MMP" : ""}.`) as string[]),
          interaction.notice ?? "Transit interaction inputs are unavailable.",
        ], [PRASHNA_SOURCES.systems.id]);
    }
    const eventLordWeakness = systemsWeaknessProfile(chart, lagna.sign).find((row) => row.planet === targetLord)!;
    if (eventLordWeakness.weak)
      add("prashna:systems-weak-event-lord", "Systems' Approach event lord is weak", "challenging", 3, [
        `${targetLord}: ${eventLordWeakness.reasons.join("; ")}.`,
      ], [PRASHNA_SOURCES.systems.id]);
    for (const influence of systemsClosePlanetInfluences(chart, lagna.sign, targetLord))
      add(`prashna:systems-close-planet-affliction-${influence.afflicter.toLowerCase()}`, "Functional malefic closely afflicts the event lord", "challenging", 4 * influence.influencePercent / 100, [
        `${influence.afflicter} reaches ${targetLord} by ${influence.mode}; longitudinal difference ${influence.difference.toFixed(2)}° gives ${influence.influencePercent.toFixed(1)}% source-defined close influence${influence.mostMalefic ? "; it is the MMP" : ""}.`,
      ], [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.systemsTerminology.id]);
    for (const influence of systemsCloseHouseInfluences(chart, lagna.sign, targetHouse, mep))
      add("prashna:systems-close-affliction-" + influence.planet.toLowerCase(), "Functional malefic closely influences the event-house MEP", "challenging", 4 * influence.influencePercent / 100, [
        `${influence.planet} in house ${influence.occupiedHouse} reaches house ${targetHouse} by ${influence.mode}; longitudinal difference ${influence.difference.toFixed(2)}° gives ${influence.influencePercent.toFixed(1)}% source-defined close-affliction influence${influence.planet === systemsNature.mostMalefic ? "; it is the Most Malefic Planet for this ascendant" : ""}.`,
      ], [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.systemsTerminology.id]);
  }
  // These natural-benefic, dignity and whole-sign house testimonies belong to
  // the Classical/Tajaka source family. They must not leak into standalone
  // Systems' Approach or KP/Nadi verdicts, whose lordship and house semantics
  // are independently defined.
  if (["classical", "tajaka", "integrated"].includes(tradition) && [1, 4, 7, 10].includes(lordHouse))
    add(
      "prashna:lord-angular",
      `${targetHouse}th-house lord is angular`,
      "supportive",
      3,
      [`${targetLord} occupies house ${lordHouse}`],
    );
  if (["classical", "tajaka", "integrated"].includes(tradition) && [6, 8, 12].includes(lordHouse))
    add(
      "prashna:lord-dusthana",
      `${targetHouse}th-house lord is in a difficult house`,
      "challenging",
      3,
      [`${targetLord} occupies house ${lordHouse}`],
    );
  if (["classical", "tajaka", "integrated"].includes(tradition) && dignity && ["exalted", "own-sign"].includes(dignity.dignity))
    add(
      "prashna:lord-dignity",
      "Relevant lord has sign dignity",
      "supportive",
      3,
      [`${targetLord} is ${dignity.dignity}`],
    );
  if (["classical", "tajaka", "integrated"].includes(tradition) && dignity?.dignity === "debilitated")
    add(
      "prashna:lord-debilitated",
      "Relevant lord is debilitated",
      "challenging",
      3,
      [`${targetLord} is debilitated`],
    );
  if (["classical", "tajaka", "integrated"].includes(tradition) && dignity?.combust)
    add("prashna:lord-combust", "Relevant lord is combust", "challenging", 2, [
      `${targetLord} is marked combust`,
    ]);
  if (["classical", "tajaka", "integrated"].includes(tradition)) for (const p of occupants) {
    const mercuryAfflicted = p.name === "Mercury" && chart.placements.some(
      (other) => other.name !== "Mercury" && FIXED_MALEFICS.has(other.name) && other.sign === p.sign,
    );
    const nature = classifyNaturalPrashnaNature(p.name, { lunarDayIndex: chart.panchanga.lunarDayIndex, mercuryAfflicted });
    if (nature === "benefic")
      add(
        `prashna:benefic-${p.name.toLowerCase()}`,
        "Benefic occupies the relevant house",
        "supportive",
        2,
        [
          `${p.name} occupies house ${targetHouse}`,
          ...(p.name === "Moon" ? [`Moon is at ${chart.panchanga.paksha} tithi ${chart.panchanga.tithiNumberInPaksha}, classified by the Prasna Marga phase interval.`] : []),
          ...(p.name === "Mercury" ? ["Mercury is not associated by sign with a natural malefic."] : []),
        ],
      );
    if (nature === "malefic")
      add(
        p.name === "Saturn"
          ? "prashna:saturn-pressure"
          : `prashna:malefic-${p.name.toLowerCase()}`,
        "Malefic occupies the relevant house",
        "challenging",
        2,
        [
          `${p.name} occupies house ${targetHouse}`,
          ...(p.name === "Moon" ? [`Moon is at ${chart.panchanga.paksha} tithi ${chart.panchanga.tithiNumberInPaksha}, classified by the Prasna Marga phase interval.`] : []),
          ...(p.name === "Mercury" ? ["Mercury is associated by sign with a natural malefic."] : []),
        ],
      );
  }
  if (["classical", "tajaka", "integrated"].includes(tradition)) {
    const moonHouse = houseFrom(
      lagna.sign,
      chart.placements.find((p) => p.name === "Moon")!.sign,
    );
    add(
      "prashna:moon-position",
      "Moon describes the question's immediate movement",
      [1, 4, 7, 10].includes(moonHouse)
        ? "supportive"
        : [6, 8, 12].includes(moonHouse)
          ? "challenging"
          : "neutral",
      2,
      [`Moon occupies house ${moonHouse}`],
    );
  }
  if ((tradition === "tajaka" || tradition === "integrated") && options.futureChart) {
    const lagnaLord = LORDS[lagna.sign];
    const objectRealisation = tajakaObjectRealisationStanza113(
      chart.placements,
      lagna.sign,
      chart.advanced.dignities,
    );
    if (objectRealisation.activeClauses.length)
      add("prashna:tajaka-object-realisation-stanza-113", "Tajaka object-realisation obstruction testimony", "challenging", objectRealisation.dusthanaDispositor ? 4 : 3, [
        ...objectRealisation.activeClauses,
        "All active clauses are aggregated as one stanza-level observation to prevent correlated evidence inflation.",
        "Prasna Tantra, Bhava Prasna, stanza 113 and note; this testimony does not erase independent supportive yogas.",
      ], [PRASHNA_SOURCES.tantra.id]);
    if (category === "career") {
      const exchange = tajakaCareerExchange(chart.placements, options.futureChart.placements, lagna.sign);
      if (exchange?.qualifies)
        add("prashna:tajaka-career-exchange-stanza-109", "Ascendant and tenth lords form the unafflicted career exchange", "supportive", 4, [
          `${exchange.lagnaLord} occupies the tenth house and ${exchange.tenthLord} occupies the ascendant.`,
          exchange.basis,
          "Prasna Tantra, Bhava Prasna, tenth-house questions, stanza 109; the result is retained as supporting testimony, not certainty.",
        ], [PRASHNA_SOURCES.tantra.id]);
    }
    if (lagnaLord === targetLord) {
      add("prashna:tajaka-shared-lord", "Querent and event share the same planetary lord", "supportive", 3, [
        `${lagnaLord} rules both the ascendant and house ${targetHouse}`,
      ]);
    } else {
      const relation = tajakaRelation(chart.placements, options.futureChart.placements, lagnaLord, targetLord);
      if (relation?.withinDeepthamsa) {
        add(
          relation.motion === "applying" ? "prashna:tajaka-ithasala-candidate" : "prashna:tajaka-easarapha-candidate",
          relation.motion === "applying" ? "Querent and event lords form an applying Tajaka aspect candidate" : "Querent and event lords form a separating Tajaka aspect candidate",
          relation.motion === "applying" ? "supportive" : "challenging",
          4,
          [`${relation.first}–${relation.second} ${relation.aspect} (${relation.nature}, ${relation.strength}%); orb ${relation.orb.toFixed(2)}° of ${relation.allowedOrb.toFixed(2)}° allowed; ${relation.motion}; ${relation.completeness}`],
          [PRASHNA_SOURCES.tantra.id],
        );
        const kamboola = tajakaKamboola(
          chart.placements,
          options.futureChart.placements,
          lagnaLord,
          targetLord,
          chart.advanced.dignities,
          {
            D3: chart.advanced.vargas.D3,
            D9: chart.advanced.vargas.D9,
            D12: chart.advanced.vargas.D12,
          },
        );
        const careerKamboola = category === "career" && kamboola
          ? tajakaCareerKamboola(
              chart.placements,
              options.futureChart.placements,
              lagna.sign,
              chart.advanced.dignities,
              { D3: chart.advanced.vargas.D3, D9: chart.advanced.vargas.D9, D12: chart.advanced.vargas.D12 },
            )
          : null;
        if (kamboola)
          add(careerKamboola ? "prashna:tajaka-career-kamboola-stanza-112" : "prashna:tajaka-kamboola-candidate", careerKamboola ? "Career Kamboola joins the ascendant lord, tenth lord, and an angular Moon" : "Moon participates in the applying significator pattern", "supportive", careerKamboola ? 4 : 2, [
            `Kamboola joins ${lagnaLord}, ${targetLord}, and the Moon; source grade: ${kamboola.grade}.`,
            kamboola.gradeBasis,
            ...(careerKamboola ? [
              `Moon occupies angular house ${careerKamboola.moonHouse}.`,
              careerKamboola.topicBasis,
              `Source result scale: ${careerKamboola.resultScale}; this is testimony, not a certainty claim.`,
            ] : []),
            ...kamboola.evidence,
            ...(kamboola.unavailableGradeInputs.length
              ? [`Grade still requires: ${kamboola.unavailableGradeInputs.join(", ")}.`]
              : []),
          ], [PRASHNA_SOURCES.tantra.id]);
      }
      const transfers = tajakaTransferCandidates(chart.placements, options.futureChart.placements, lagnaLord, targetLord);
      for (const transfer of transfers)
        add(
          `prashna:tajaka-${transfer.yoga}-candidate-${transfer.intermediary.toLowerCase()}`,
          `${transfer.yoga === "nakta" ? "Nakta" : "Yamaya"} light-transfer candidate through ${transfer.intermediary}`,
          "supportive",
          2,
          [
            `No direct in-orb relation joins ${lagnaLord} and ${targetLord}; ${transfer.intermediary} is within deepthamsa of both.`,
            transfer.applicationEvidence,
            `Perfection order in the supplied motion sample: ${transfer.perfectionOrder.join(" → ")}.`,
            `Prasna Tantra, Chapter IV, stanza ${transfer.yoga === "nakta" ? "57" : "60"}; topic-specific effects and dignity exceptions remain separate.`,
          ],
          [PRASHNA_SOURCES.tantra.id],
        );
    }
  }
  if ((tradition === "prashna-nadi" || tradition === "integrated") && options.effectiveLagnaLongitude !== undefined) {
    const seed = kpSeedSegment(options.seedNumber!);
    const kpTargetLongitude = kpLongitudeFromLahiri(lord.longitude);
    const targetSubdivision = kpSubdivision(kpTargetLongitude);
    add("prashna:nadi-seed-ascendant", "KP seed establishes the effective horary ascendant", "neutral", 0, [
      `Seed ${seed.number}: ${seed.start.toFixed(6)}°–${seed.end.toFixed(6)}°; Reader VI effective ascendant ${seed.start.toFixed(6)}° (beginning of the selected sub)`,
      `Ascendant star ${seed.starLord}; sub ${seed.subLord}; sub-sub ${seed.subSubLord}`,
      `${targetLord}: KP longitude ${kpTargetLongitude.toFixed(6)}°; star ${targetSubdivision.starLord}; sub ${targetSubdivision.subLord}; sub-sub ${targetSubdivision.subSubLord}`,
    ], [PRASHNA_SOURCES.nadi.id, PRASHNA_SOURCES.kpReaderVi.id]);
    const preview = calculateKpPreview(chart, seed.number);
    const categoryRules: Partial<Record<QuestionCategory, string[]>> = {
      education: ["education:college-admission-cusp"],
      travel: ["travel:foreign-cusp"],
      litigation: ["litigation:win-cusp"],
      property: ["property:sale-cusp"],
    };
    for (const ruleId of categoryRules[category] ?? []) {
      const row = preview.cuspalEventEvaluations.values.find((item) => item.evaluation.ruleId === ruleId);
      if (!row) continue;
      const blocked = row.retrogradeGate !== "clear";
      const matched = row.evaluation.status === "matched";
      add(
        `prashna:kp-event-house-${ruleId.replaceAll(":", "-")}`,
        `KP numbered-horary cusp ${row.cusp} event predicate`,
        blocked ? "challenging" : matched ? "supportive" : "neutral",
        blocked || matched ? 3 : 0,
        [
          `Cusp ${row.cusp}: sub-lord ${row.cuspSubLord}; its star lord ${row.cuspSubLordStarLord}; retrograde gate ${row.retrogradeGate}.`,
          `Required (${row.evaluation.requiredMode}): ${row.evaluation.matchedRequired.join(", ") || "none"}; missing: ${row.evaluation.missingRequired.join(", ") || "none"}; adverse: ${row.evaluation.matchedAdverse.join(", ") || "none"}.`,
          row.evaluation.locator,
        ],
        [PRASHNA_SOURCES.kpReaderVi.id],
      );
    }
    const periodRules: Partial<Record<QuestionCategory, KpEventHouseRuleId[]>> = {
      relationship: ["marriage:first"],
      children: ["children:birth"],
      education: ["education:competitive-success", "education:college-admission-cusp"],
      career: ["career:employment", "career:employment-viswanath"],
      travel: ["travel:foreign", "travel:foreign-cusp"],
      litigation: ["litigation:success", "litigation:win-cusp"],
      property: ["property:sale-cusp"],
      "lost-object": ["lost-property:recovery"],
      health: ["health:disease", "health:cure"],
    };
    for (const ruleId of periodRules[category] ?? []) {
      const periodSourceIds = ruleId === "career:employment-viswanath"
        ? [PRASHNA_SOURCES.viswanathVolI.id]
        : [PRASHNA_SOURCES.kpReaderVi.id];
      const synthesisSourceIds = ruleId === "career:employment-viswanath"
        ? [PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.kpReaderVi.id]
        : [PRASHNA_SOURCES.kpReaderVi.id];
      const activation = calculateKpOperatingPeriodActivation(chart, preview, ruleId);
      add(`prashna:kp-operating-period-${ruleId.replaceAll(":", "-")}`, "KP operating Dasa-Bhukti-Antara event activation", "neutral", 0, [
        ...activation.levels.map((level) => `${level.level} ${level.planet ?? "unavailable"}: houses ${level.houses.join(", ") || "none"}; contributes ${level.contributesRequired ? "yes" : "no"}; gate ${level.retrogradeGate}.`),
        `Combined houses ${activation.combinedHouses.join(", ") || "none"}; event evaluation ${activation.combinedEvaluation.status}; current activation ${activation.status}.`,
        activation.notice,
      ], periodSourceIds);
      const futurePeriods = calculateKpConjoinedPeriodCandidates(preview, ruleId, chart.engine.julianDay);
      add(`prashna:kp-conjoined-period-${ruleId.replaceAll(":", "-")}`, "KP future conjoined-period candidates awaiting transit pinning", "neutral", 0, [
        `${futurePeriods.candidates.length} candidate Antara interval(s) found after the question moment from planets common to ruling planets and event significators.`,
        ...futurePeriods.candidates.slice(0, 3).map((candidate) =>
          `${candidate.lords.dasa}–${candidate.lords.bhukti}–${candidate.lords.antara}: ${candidate.startIso} to ${candidate.endIso}; ${candidate.status}; transit pinning ${candidate.transitPinning}.`),
        futurePeriods.notice,
      ], synthesisSourceIds);
    }
    const registeredTransitPatterns = preview.transitPinning.registeredPatterns.filter((item) => item.category === category);
    add(`prashna:kp-transit-pinning-${category}`, "KP event-specific transit-pattern registry", "neutral", 0, [
      `Date scale: ${preview.transitPinning.scaleBodies.date}; day scale: ${preview.transitPinning.scaleBodies.day}; clock-time scale: ${preview.transitPinning.scaleBodies["clock-time"]}.`,
      `Searchable ruler levels: ${preview.transitPinning.rulerLevels.join(", ")}.`,
      ...registeredTransitPatterns.map((item) => `${item.id}: ${item.event}; ${item.scale}; reproduction ${item.reproductionStatus}${item.conflictId ? ` (${item.conflictId})` : ""}.`),
      `${preview.transitPinning.astronomyConflicts.length} registered dated astronomy conflict(s) are preserved instead of forcing reproduction.`,
      preview.transitPinning.notice,
    ], [PRASHNA_SOURCES.kpReaderVi.id]);
  }
  return items;
}

function requestReferenceHouse(options: { referenceHouse?: number }) {
  return options.referenceHouse ?? 1;
}

const SCHOOL_TRADITIONS = ["classical", "tajaka", "systems-approach", "prashna-nadi"] as const;

function uniqueObservations(observations: EvidenceObservation[]) {
  const seen = new Set<string>();
  return observations.filter((observation) => {
    const key = `${observation.provenance.ruleId}\u0000${observation.facts.join("\u0000")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function observationDirection(observations: EvidenceObservation[], usable: boolean) {
  if (!usable) return "chart-unfit" as const;
  const scored = observations.filter((item) => item.polarity !== "neutral");
  if (!scored.length) return "indeterminate" as const;
  const score = scoreObservations(observations);
  return score >= 25 ? "supportive" as const : score <= -25 ? "challenging" as const : "mixed" as const;
}

const MATURITY_ORDER = ["structural", "located", "reproduced", "reviewed", "calibrated"] as const;
function weakestMaturity(observations: EvidenceObservation[]) {
  return observations.reduce<(typeof MATURITY_ORDER)[number]>((weakest, observation) => {
    const maturity = observation.provenance.ruleMaturity ?? "structural";
    return MATURITY_ORDER.indexOf(maturity) < MATURITY_ORDER.indexOf(weakest) ? maturity : weakest;
  }, "calibrated");
}

export function buildPrashnaConsultation(
  request: PrashnaRequest,
  receivedAt = new Date(),
  options: { allowStructuralRemedies?: boolean } = {},
): ConsultationResult {
  const chart = prashnaChart(request, receivedAt),
    seedSegment = (request.tradition === "prashna-nadi" || request.tradition === "integrated") && request.seedNumber
      ? kpSeedSegment(request.seedNumber)
      : null,
    futureChart = prashnaChart(request, new Date(receivedAt.getTime() + 3_600_000)),
    fitness = evaluateChartFitness(chart, seedSegment?.start),
    capability = PRASHNA_CAPABILITIES[request.tradition],
    rawObservations = prashnaObservations(chart, request.category, request.tradition, {
      effectiveLagnaLongitude: request.tradition === "prashna-nadi" ? seedSegment?.start : undefined,
      futureChart,
      seedNumber: request.seedNumber,
      referenceHouse: request.referenceHouse,
    }),
    observations = uniqueObservations(rawObservations),
    traditionResults = request.tradition === "integrated"
      ? SCHOOL_TRADITIONS
          .filter((tradition) => tradition !== "prashna-nadi" || Boolean(request.seedNumber))
          .map((tradition) => {
            const schoolObservations = uniqueObservations(prashnaObservations(chart, request.category, tradition, {
              effectiveLagnaLongitude: tradition === "prashna-nadi" ? seedSegment?.start : undefined,
              futureChart,
              seedNumber: request.seedNumber,
              referenceHouse: request.referenceHouse,
            }));
            return {
              tradition,
              observations: schoolObservations,
              direction: observationDirection(schoolObservations, fitness.status !== "unfit"),
              score: fitness.status !== "unfit" ? scoreObservations(schoolObservations) : null,
              maturity: weakestMaturity(schoolObservations),
            };
          })
      : [],
    score = scoreObservations(observations),
    direction = observationDirection(observations, fitness.status !== "unfit"),
    id = crypto.randomUUID(),
    confirmationToken = crypto.randomUUID(),
    days =
      request.category === "lost-object"
        ? 7
        : request.category === "travel"
          ? 30
          : 90;
  return {
    schemaVersion: "sahadeva-consultation-1",
    consultationId: id,
    question: {
      text: request.question,
      category: request.category,
      askedAt: receivedAt.toISOString(),
      timestampConvention:
        "Server receipt time: when the question reached Sahadeva",
      location: {
        place: request.place,
        latitude: request.latitude,
        longitude: request.longitude,
        timezone: request.timezone,
      },
    },
    methodSelection: {
      method: "prashna",
      chartTypes: ["D1 Prashna", ...(seedSegment ? ["KP 1-249 seed ascendant"] : [])],
      reason:
        `No natal chart was supplied; the question is judged from its server-received moment using the ${request.tradition} rule namespace${request.referenceHouse === 1 ? "" : ` and house ${request.referenceHouse} as the derived ascendant`}.`,
      tradition: request.tradition,
      capabilityStatus: capability.status,
      unavailableCapabilities: capability.missing,
    },
    questionStructure: {
      referenceHouse: request.referenceHouse,
      roles: PRASHNA_TOPIC_HOUSES[request.category].map((role) => ({
        role: role.role,
        radicalHouse: role.house,
        derivedHouse: ((request.referenceHouse - 1 + role.house - 1) % 12) + 1,
        status: role.status,
        sourceIds: role.sourceIds,
        locator: role.locator,
      })),
    },
    chartFitness: fitness,
    observations,
    traditionResults,
    confirmations: observations
      .filter((i) => i.polarity === "supportive")
      .map((i) => i.label),
    contradictions: observations
      .filter((i) => i.polarity === "challenging")
      .map((i) => i.label),
    // Outcome follow-up belongs in `feedback`; no astrological timing is emitted
    // until a source-located timing rule has reproduced its worked examples.
    timingWindows: [],
    judgment: {
      direction,
      score: fitness.status === "unfit" ? null : score,
      tier: "structural-convention",
      confidence:
        fitness.status !== "fit" || direction === "indeterminate"
          ? "low"
          : "moderate",
      rationale:
        fitness.status === "unfit"
          ? [
              "A source-defined chart-fitness condition prevents judgment.",
            ]
          : observations.map((i) => `${i.polarity}: ${i.label}`),
    },
    judgmentDimensions: {
      promise: {
        direction,
        score: fitness.status === "unfit" ? null : score,
        evidenceRuleIds: observations
          .filter((item) => item.polarity !== "neutral")
          .map((item) => item.provenance.ruleId),
      },
      quality: {
        status: "unavailable",
        summary: null,
        evidenceRuleIds: [],
      },
      timing: {
        status: "unavailable",
        windows: [],
        reason: "No source-located timing rule has yet reproduced its worked example for this question.",
      },
    },
    remedies: matchRemedies(
      request.category,
      observations,
      options.allowStructuralRemedies === false,
    ),
    citations: observations.map((observation) => ({
      ruleId: observation.provenance.ruleId,
      sourceIds: observation.provenance.sourceIds,
    })),
    uncertainty: [
      "Structural-convention rules are auditable but not yet lineage-reviewed.",
      "Question outcomes are not scientifically validated.",
      "Astrological event timing is unavailable; the follow-up date is for outcome evaluation only.",
      ...capability.missing.map((item) => `Not yet calculated: ${item}.`),
      ...fitness.unavailableChecks,
    ],
    feedback: {
      confirmationToken,
      status: "awaiting-outcome",
      endpoint: "/api/prashna/outcome",
      suggestedFollowUpAt:
        fitness.status !== "unfit"
          ? new Date(receivedAt.getTime() + days * 86400000).toISOString()
          : null,
    },
    safety: safetyContract(),
  };
}
