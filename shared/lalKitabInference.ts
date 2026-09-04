import type { ChartResult, GrahaName } from "./schema";

export const LAL_KITAB_PLANETS = [
  "Jupiter", "Sun", "Moon", "Venus", "Mars", "Mercury", "Saturn", "Rahu", "Ketu",
] as const satisfies readonly GrahaName[];
type LalKitabPlanet = (typeof LAL_KITAB_PLANETS)[number];

const FIXED_HOUSES: Record<LalKitabPlanet, number[]> = {
  Sun: [1], Jupiter: [2, 5, 9, 11], Mars: [3, 8], Moon: [4], Ketu: [6],
  Venus: [7], Mercury: [7], Saturn: [8, 10], Rahu: [12],
};
const OWN_SIGNS: Record<LalKitabPlanet, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11],
  Venus: [1, 6], Saturn: [9, 10], Rahu: [], Ketu: [],
};
const EXALTATION: Partial<Record<LalKitabPlanet, number>> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};
const DEBILITATION: Partial<Record<LalKitabPlanet, number>> = {
  Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0,
};
const ENEMIES: Record<LalKitabPlanet, LalKitabPlanet[]> = {
  Jupiter: ["Venus", "Mercury"], Sun: ["Venus", "Saturn", "Rahu"],
  Moon: ["Mercury", "Ketu"], Venus: ["Sun", "Moon", "Rahu"],
  Mars: ["Mercury", "Ketu"], Mercury: ["Moon"], Saturn: ["Moon"],
  Rahu: ["Sun", "Venus", "Mars"], Ketu: ["Moon", "Mars"],
};
const FRIENDS: Record<LalKitabPlanet, LalKitabPlanet[]> = {
  Jupiter: ["Sun", "Mars", "Moon"], Sun: ["Jupiter", "Mars", "Moon"],
  Moon: ["Sun", "Jupiter", "Mars"], Venus: ["Saturn", "Mercury", "Ketu"],
  Mars: ["Sun", "Moon", "Jupiter"], Mercury: ["Sun", "Venus", "Rahu"],
  Saturn: ["Mercury", "Venus", "Rahu"], Rahu: ["Mercury", "Saturn", "Ketu"],
  Ketu: ["Venus", "Rahu"],
};
const HOUSE_METHOD: Record<number, string> = {
  1: "body-worn support", 2: "faith-compatible donation", 3: "hand-worn support",
  4: "symbolic release", 5: "education-directed charity", 6: "symbolic relinquishment",
  7: "grounding or placement", 8: "ancestral remembrance", 9: "devotional donation",
  10: "service connected with father or public duty", 11: "no house-method remedy",
  12: "safe elevated placement",
};
const SOURCE = {
  fixedHouses: "book-gosvami-lal-kitab:L2060-L2075",
  relationships: "book-gosvami-lal-kitab:L2115-L2165",
  remediability: "book-gosvami-lal-kitab:L2279-L2310",
  remedyOfPlanet: "book-gosvami-lal-kitab:L4219-L4260",
  sequence: "book-gosvami-lal-kitab:L4340-L4355",
  houseMethod: "book-gosvami-lal-kitab:L4358-L4387",
  dormantBlind: "book-gosvami-lal-kitab:L2384-L2396;L3063-L3110",
  aspectGrammar: "book-gosvami-lal-kitab:L3296-L3385",
} as const;

const houseFromLagna = (lagnaSign: number, sign: number) => ((sign - lagnaSign + 12) % 12) + 1;
const ownersOfHouse = (house: number) => LAL_KITAB_PLANETS.filter((planet) => FIXED_HOUSES[planet].includes(house));

export type LalKitabExplanationStep = {
  order: number;
  rule: string;
  conclusion: string;
  facts: string[];
  sourceLocator: string;
};

export function analyzeLalKitabInference(chart: ChartResult) {
  const lagna = chart.placements.find((item) => item.name === "Lagna");
  if (!lagna) throw new Error("Lagna is required for Lal Kitab inference");
  const placements = LAL_KITAB_PLANETS.map((planet) => {
    const raw = chart.placements.find((item) => item.name === planet);
    if (!raw) throw new Error(`Missing ${planet}`);
    return { planet, house: houseFromLagna(lagna.sign, raw.sign), sign: raw.sign };
  });
  const byHouse = new Map<number, LalKitabPlanet[]>();
  for (const item of placements) byHouse.set(item.house, [...(byHouse.get(item.house) ?? []), item.planet]);
  const currentDasha = new Set([chart.advanced.birthPeriods.mahadasha, chart.advanced.birthPeriods.antardasha]);
  const occupied = [...byHouse.keys()];
  const priorSideBlank = !occupied.some((house) => house <= 6);
  const latterSideBlank = !occupied.some((house) => house >= 7);
  const suddenPairs = new Set(["1:3", "3:1", "2:4", "4:1", "4:6", "6:4", "5:7", "7:5", "7:9", "9:7", "8:10", "10:8", "10:12", "12:10", "11:1", "1:11", "1:7", "7:1", "4:10", "10:4"]);
  const relationshipEdges = placements.flatMap((from) => placements.flatMap((to) => {
    if (from.planet === to.planet) return [];
    const delta = ((to.house - from.house + 12) % 12) + 1;
    const mutualFriends = FRIENDS[from.planet].includes(to.planet) || FRIENDS[to.planet].includes(from.planet);
    const enemies = ENEMIES[from.planet].includes(to.planet) || ENEMIES[to.planet].includes(from.planet);
    const kinds: string[] = [];
    if (delta === 5) kinds.push("mutual-assistance");
    if (delta === 7) kinds.push("general-condition");
    if (delta === 8) kinds.push("confrontation");
    if (delta === 9) kinds.push("foundation");
    if (delta === 10) kinds.push("deception");
    if ((delta === 2 || delta === 12) && mutualFriends) kinds.push("joint-wall-companion");
    if (from.house === 8 && to.house === 2) kinds.push("inverse-aspect");
    if (suddenPairs.has(`${from.house}:${to.house}`)) kinds.push("sudden-strike-candidate");
    return kinds.length ? [{ from: from.planet, fromHouse: from.house, to: to.planet, toHouse: to.house, kinds, mutualFriends, enemies }] : [];
  }));
  const halfBlindChart = byHouse.get(4)?.includes("Sun") === true && byHouse.get(7)?.includes("Saturn") === true;
  const blindChart = (byHouse.get(10) ?? []).some((planet) =>
    (byHouse.get(10) ?? []).some((other) => other !== planet && ENEMIES[planet].includes(other)),
  ) || placements.some((item) => item.house === 10 && DEBILITATION[item.planet] === item.sign);

  const states = placements.map((item) => {
    const companions = (byHouse.get(item.house) ?? []).filter((planet) => planet !== item.planet);
    const enemyCompanions = companions.filter((planet) => ENEMIES[item.planet].includes(planet));
    const friendlyCompanions = companions.filter((planet) => FRIENDS[item.planet].includes(planet));
    const dormantByConjunction = (item.planet === "Mercury" && companions.includes("Sun")) ||
      (item.planet === "Rahu" && companions.includes("Mars"));
    const dormantByEmptySide = !FIXED_HOUSES[item.planet].includes(item.house) &&
      ((priorSideBlank && item.house >= 7) || (latterSideBlank && item.house <= 6));
    const dormant = dormantByConjunction || dormantByEmptySide;
    const eclipse = (item.planet === "Sun" && companions.includes("Rahu")) ||
      (item.planet === "Rahu" && companions.includes("Sun")) ||
      (item.planet === "Moon" && companions.includes("Ketu")) ||
      (item.planet === "Ketu" && companions.includes("Moon"));
    const fixedReasons = [
      ...(FIXED_HOUSES[item.planet].includes(item.house) ? [`occupies fixed house ${item.house}`] : []),
      ...(OWN_SIGNS[item.planet].includes(item.sign) ? ["occupies its own zodiac sign"] : []),
      ...(EXALTATION[item.planet] === item.sign ? ["occupies its exaltation sign"] : []),
      ...(DEBILITATION[item.planet] === item.sign ? ["occupies its debilitation sign"] : []),
    ];
    const effectClass = fixedReasons.length ? "planet-effect-fixed" as const : "sign-effect-remediable" as const;
    const edges = relationshipEdges.filter((edge) => edge.from === item.planet || edge.to === item.planet);
    const relationalAdverse = edges.flatMap((edge) => [
      ...(edge.kinds.includes("confrontation") ? [`confrontation H${edge.fromHouse}-H${edge.toHouse}`] : []),
      ...(edge.kinds.includes("general-condition") && edge.enemies ? [`enemy general-condition H${edge.fromHouse}-H${edge.toHouse}`] : []),
    ]);
    const relationalSupport = edges.flatMap((edge) => [
      ...(edge.kinds.includes("mutual-assistance") ? [`mutual assistance H${edge.fromHouse}-H${edge.toHouse}`] : []),
      ...(edge.kinds.includes("foundation") ? [`shared foundation H${edge.fromHouse}-H${edge.toHouse}`] : []),
      ...(edge.kinds.includes("joint-wall-companion") ? [`friendly joint wall H${edge.fromHouse}-H${edge.toHouse}`] : []),
      ...(edge.kinds.includes("general-condition") && edge.mutualFriends ? [`friendly general-condition H${edge.fromHouse}-H${edge.toHouse}`] : []),
    ]);
    const adverseSignals = [...new Set([
      ...enemyCompanions.map((planet) => `conjoined enemy ${planet}`),
      ...(dormantByConjunction ? ["dormant through conjunction"] : []),
      ...(dormantByEmptySide ? ["dormant because the opposite half of the chart is empty"] : []),
      ...(eclipse ? ["eclipse relationship"] : []),
      ...relationalAdverse,
    ])];
    const supportiveSignals = [...new Set([
      ...friendlyCompanions.map((planet) => `conjoined friend ${planet}`),
      ...relationalSupport,
    ])];
    const activation = currentDasha.has(item.planet) ? "active-dasha" as const : "background" as const;
    const condition = adverseSignals.length && supportiveSignals.length ? "mixed" as const
      : adverseSignals.length ? "adverse" as const
        : supportiveSignals.length ? "supported" as const : "unresolved" as const;
    const targetPlanets = effectClass === "sign-effect-remediable" && adverseSignals.length
      ? ownersOfHouse(item.house) : [];
    const decision = !adverseSignals.length
      ? "no-remedy-indicated" as const
      : effectClass === "planet-effect-fixed"
        ? "remedy-not-indicated-for-fixed-effect" as const
        : targetPlanets.length
          ? "candidate-remedy-principle-found" as const
          : "requires-rule-resolution" as const;
    return {
      ...item, companions, enemyCompanions, friendlyCompanions, dormant, dormantByConjunction, dormantByEmptySide, eclipse,
      chartStates: { blindChart, halfBlindChart },
      effectClass, fixedReasons, adverseSignals, supportiveSignals, activation, condition,
      remedyDecision: {
        decision,
        targetPlanets,
        houseMethod: HOUSE_METHOD[item.house],
        instructionStatus: "principle-only-no-procedure" as const,
      },
    };
  });

  const diagnoses = states.filter((state) => state.adverseSignals.length).sort((a, b) =>
    Number(b.activation === "active-dasha") - Number(a.activation === "active-dasha") ||
    b.adverseSignals.length - a.adverseSignals.length,
  );
  const trace: LalKitabExplanationStep[] = [
    { order: 1, rule: "fixed-house conversion", conclusion: "The natal placements were converted once into fixed houses.", facts: placements.map((p) => `${p.planet}=H${p.house}`), sourceLocator: SOURCE.fixedHouses },
    { order: 2, rule: "relationship resolution", conclusion: `${diagnoses.length} planets have an explicit same-house adverse relationship.`, facts: diagnoses.flatMap((d) => d.adverseSignals.map((signal) => `${d.planet}: ${signal}`)), sourceLocator: SOURCE.relationships },
    { order: 3, rule: "planet-effect versus sign-effect", conclusion: "Only sign-effect cases proceed to a remedy principle; fixed planet-effect cases stop.", facts: states.map((s) => `${s.planet}: ${s.effectClass}`), sourceLocator: SOURCE.remediability },
    { order: 4, rule: "fixed-house-lord remedy selection", conclusion: "For an adverse remediable placement, the fixed owner of the occupied house becomes the first remedy target.", facts: diagnoses.map((d) => `${d.planet} H${d.house} -> ${d.remedyDecision.targetPlanets.join("+") || "no automatic target"}`), sourceLocator: SOURCE.remedyOfPlanet },
    { order: 5, rule: "remedy order", conclusion: "Resolve diagnosed/dormant planets, then active-period planets, enmity, and only then fallback stages.", facts: diagnoses.map((d) => `${d.planet}: ${d.activation}`), sourceLocator: SOURCE.sequence },
  ];
  return {
    schemaVersion: "sahadeva-lal-kitab-inference-1",
    tradition: "lal-kitab-gosvami-1952",
    computation: { retrievalRequired: false, sourceLookupUsedForReasoning: false, chartCalculatedOnce: true },
    factGraph: {
      placements: states,
      occupiedHouses: [...byHouse].map(([house, planets]) => ({ house, planets })),
      relationshipEdges,
      chartStates: { blindChart, halfBlindChart, priorSideBlank, latterSideBlank },
    },
    diagnoses,
    remedyPlan: {
      outcome: diagnoses.length ? "conditional-principles" : "no-remedy-indicated",
      ordered: diagnoses.map((state, index) => ({ priority: index + 1, planet: state.planet, house: state.house, ...state.remedyDecision })),
      sequencingRule: "One remedy principle at a time; do not combine simultaneous 40/43-day remedy courses.",
      fallbackOrder: ["diagnosed or dormant planet", "active-period planet", "enemy relationship", "sign-effect support", "Sun", "Rahu-Ketu-Saturn", "Mercury"],
    },
    explanationTrace: trace,
    unresolved: [
      "Annual-chart state is not inferred from natal astronomy.",
      "Quantitative confrontation fractions and artificial-planet transformations require separately verified rule tables.",
      "A remedy principle is not a publishable ritual instruction.",
    ],
    safety: {
      instructionPolicy: "Return logic and harmless principles; never auto-execute animal harm, ingestion/contact hazards, costly donation, medical claims, or initiation-dependent practice.",
      sourceLocators: SOURCE,
    },
  };
}
