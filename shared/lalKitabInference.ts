import type { ChartResult, GrahaName } from "./schema";
import type { JudgmentTopic } from "./judgmentTopics";

export const LAL_KITAB_PLANETS = [
  "Jupiter", "Sun", "Moon", "Venus", "Mars", "Mercury", "Saturn", "Rahu", "Ketu",
] as const satisfies readonly GrahaName[];
type LalKitabPlanet = (typeof LAL_KITAB_PLANETS)[number];
export type LalKitabPredictionTopic = JudgmentTopic | "general";

const HOUSE_THEMES: Record<number, string[]> = {
  1: ["body", "identity", "life direction"], 2: ["family resources", "speech", "stored wealth"],
  3: ["effort", "siblings", "initiative"], 4: ["home", "property", "emotional foundation"],
  5: ["children", "learning", "creative judgment"], 6: ["health routines", "service", "conflict"],
  7: ["relationships", "agreements", "partnership"], 8: ["disruption", "shared obligations", "transformation"],
  9: ["fortune", "teachers", "belief"], 10: ["career", "status", "responsibility"],
  11: ["gains", "networks", "fulfilment"], 12: ["expenses", "withdrawal", "closure"],
};
const PLANET_THEMES: Record<LalKitabPlanet, string[]> = {
  Sun: ["authority", "vitality", "father figures"], Moon: ["mind", "mother figures", "home"],
  Mars: ["action", "conflict", "property"], Mercury: ["speech", "trade", "learning"],
  Jupiter: ["judgment", "children", "teachers"], Venus: ["relationships", "comfort", "resources"],
  Saturn: ["work", "delay", "endurance"], Rahu: ["ambition", "disruption", "unconventional paths"],
  Ketu: ["separation", "insight", "closure"],
};
const TOPIC_FACTORS: Record<LalKitabPredictionTopic, { houses: number[]; planets: LalKitabPlanet[] }> = {
  general: { houses: [1, 4, 7, 10], planets: ["Sun", "Moon", "Jupiter", "Saturn"] },
  career: { houses: [2, 6, 10, 11], planets: ["Sun", "Mercury", "Jupiter", "Saturn"] },
  education: { houses: [2, 4, 5, 9], planets: ["Mercury", "Jupiter", "Moon"] },
  property: { houses: [2, 4, 8, 11], planets: ["Mars", "Moon", "Saturn", "Venus"] },
  relationships: { houses: [2, 4, 7, 8, 11], planets: ["Venus", "Moon", "Mars", "Jupiter"] },
  spirituality: { houses: [5, 8, 9, 12], planets: ["Jupiter", "Ketu", "Saturn", "Moon"] },
  wealth: { houses: [2, 6, 10, 11, 12], planets: ["Jupiter", "Venus", "Mercury", "Saturn"] },
  health: { houses: [1, 6, 8, 12], planets: ["Sun", "Moon", "Mars", "Saturn"] },
  children: { houses: [2, 5, 9, 11], planets: ["Jupiter", "Moon", "Sun"] },
};

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
const ARTIFICIAL_COMBINATIONS: Array<{
  pair: [LalKitabPlanet, LalKitabPlanet];
  produces: LalKitabPlanet | "Mars-positive" | "Mars-negative";
  disposition: "neutral" | "exalted" | "debilitated" | "hollow" | "ketu-like" | "rahu-like";
}> = [
  { pair: ["Sun", "Venus"], produces: "Jupiter", disposition: "hollow" },
  { pair: ["Mercury", "Venus"], produces: "Sun", disposition: "neutral" },
  { pair: ["Sun", "Jupiter"], produces: "Moon", disposition: "neutral" },
  { pair: ["Rahu", "Ketu"], produces: "Venus", disposition: "neutral" },
  { pair: ["Sun", "Mercury"], produces: "Mars-positive", disposition: "neutral" },
  { pair: ["Sun", "Saturn"], produces: "Mars-negative", disposition: "neutral" },
  { pair: ["Jupiter", "Rahu"], produces: "Mercury", disposition: "neutral" },
  { pair: ["Venus", "Jupiter"], produces: "Saturn", disposition: "ketu-like" },
  { pair: ["Mercury", "Mars"], produces: "Saturn", disposition: "rahu-like" },
  { pair: ["Mars", "Saturn"], produces: "Rahu", disposition: "exalted" },
  { pair: ["Sun", "Saturn"], produces: "Rahu", disposition: "debilitated" },
  { pair: ["Venus", "Saturn"], produces: "Ketu", disposition: "exalted" },
  { pair: ["Moon", "Saturn"], produces: "Ketu", disposition: "debilitated" },
];
const SOURCE = {
  fixedHouses: "book-gosvami-lal-kitab:L2060-L2075",
  relationships: "book-gosvami-lal-kitab:L2115-L2165",
  remediability: "book-gosvami-lal-kitab:L2279-L2310",
  remedyOfPlanet: "book-gosvami-lal-kitab:L4219-L4260",
  sequence: "book-gosvami-lal-kitab:L4340-L4355",
  houseMethod: "book-gosvami-lal-kitab:L4358-L4387",
  dormantBlind: "book-gosvami-lal-kitab:L2384-L2396;L3063-L3110",
  aspectGrammar: "book-gosvami-lal-kitab:L3296-L3385",
  artificialPlanets: "book-gosvami-lal-kitab:L2025-L2045;L4480-L4535",
  speakingPlanets: "book-gosvami-lal-kitab:L3296-L3310",
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

export function analyzeLalKitabInference(chart: ChartResult, topic: LalKitabPredictionTopic = "general") {
  const lagna = chart.placements.find((item) => item.name === "Lagna");
  if (!lagna) throw new Error("Lagna is required for Lal Kitab inference");
  const placements = LAL_KITAB_PLANETS.map((planet) => {
    const raw = chart.placements.find((item) => item.name === planet);
    if (!raw) throw new Error(`Missing ${planet}`);
    return { planet, house: houseFromLagna(lagna.sign, raw.sign), sign: raw.sign };
  });
  const byHouse = new Map<number, LalKitabPlanet[]>();
  for (const item of placements) byHouse.set(item.house, [...(byHouse.get(item.house) ?? []), item.planet]);
  const birthPeriodLords = new Set([chart.advanced.birthPeriods.mahadasha, chart.advanced.birthPeriods.antardasha]);
  const artificialPlanets = [...byHouse].flatMap(([house, planets]) => ARTIFICIAL_COMBINATIONS.flatMap((rule) =>
    rule.pair.every((planet) => planets.includes(planet))
      ? [{
          id: `${rule.pair.join("+")}=>${rule.produces}@H${house}`,
          house,
          inputs: rule.pair,
          produces: rule.produces,
          disposition: rule.disposition,
          effectClass: "sign-effect-remediable" as const,
          adverse: rule.disposition === "debilitated" || rule.produces === "Mars-negative",
          sourceLocator: SOURCE.artificialPlanets,
        }]
      : [],
  ));
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
    const direction = from.house === 8 && to.house === 2
      ? "inverse-backward" as const
      : from.house < to.house ? "prior-to-latter" as const : "cyclic-forward" as const;
    return kinds.length ? [{ from: from.planet, fromHouse: from.house, to: to.planet, toHouse: to.house, kinds, mutualFriends, enemies, direction }] : [];
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
    const activation = birthPeriodLords.has(item.planet) ? "birth-period-lord" as const : "natal-background" as const;
    const expressionState = ["Jupiter", "Sun", "Mars"].includes(item.planet)
      ? item.house % 2 === 0 ? "speaking" as const : "conditional" as const
      : ["Moon", "Venus"].includes(item.planet)
        ? item.house % 2 === 1 ? "speaking" as const : "conditional" as const
        : item.planet === "Mercury"
          ? [3, 6].includes(item.house) ? "speaking" as const : "conditional" as const
          : item.house === 2 ? "silent" as const : "conditional" as const;
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
      expressionState,
      remedyDecision: {
        decision,
        targetPlanets,
        houseMethod: HOUSE_METHOD[item.house],
        instructionStatus: "principle-only-no-procedure" as const,
      },
    };
  });

  const diagnoses = states.filter((state) => state.adverseSignals.length).sort((a, b) =>
    Number(b.activation === "birth-period-lord") - Number(a.activation === "birth-period-lord") ||
    b.adverseSignals.length - a.adverseSignals.length,
  );
  const artificialDiagnoses = artificialPlanets.filter((state) => state.adverse).map((state) => ({
    id: state.id,
    planet: state.produces,
    house: state.house,
    cause: `${state.inputs.join("+")} forms ${state.produces} in ${state.disposition} condition`,
    effectClass: state.effectClass,
    remedyDecision: {
      decision: "candidate-remedy-principle-found" as const,
      targetPlanets: ownersOfHouse(state.house),
      houseMethod: HOUSE_METHOD[state.house],
      instructionStatus: "principle-only-no-procedure" as const,
    },
  }));
  const topicFactors = TOPIC_FACTORS[topic];
  const predictions = states.map((state) => {
    const houseRelevant = topicFactors.houses.includes(state.house);
    const planetRelevant = topicFactors.planets.includes(state.planet);
    const relevance = (houseRelevant ? 3 : 0) + (planetRelevant ? 2 : 0) +
      (state.activation === "birth-period-lord" ? 2 : 0) + (state.condition !== "unresolved" ? 1 : 0);
    const direction = state.condition === "supported" ? "supportive" as const
      : state.condition === "adverse" ? "challenging" as const
        : state.condition === "mixed" ? "mixed" as const : "unclear" as const;
    const theme = houseRelevant ? HOUSE_THEMES[state.house][0] : PLANET_THEMES[state.planet][0];
    const tendency = direction === "supportive" ? "may receive steadier support"
      : direction === "challenging" ? "may face pressure, delay, or uneven expression"
        : direction === "mixed" ? "may alternate between support and obstruction"
          : "does not yield a clear direction from the calculated rules";
    return {
      id: `lk-${topic}-${state.planet.toLowerCase()}-h${state.house}`,
      topic, planet: state.planet, house: state.house, theme, direction,
      activation: state.activation,
      horizon: state.activation === "birth-period-lord" ? "natal-birth-period-emphasis" as const : "natal-background" as const,
      relevance,
      statement: `In ${topic === "general" ? "general life matters" : topic}, ${theme} ${tendency} through ${state.planet} in house ${state.house}.`,
      logic: [
        `${state.planet} occupies fixed house ${state.house}.`,
        `Its calculated condition is ${state.condition}.`,
        state.activation === "birth-period-lord" ? "It is emphasized by the calculated birth-period context." : "It remains a natal background tendency.",
        state.effectClass === "planet-effect-fixed" ? "The effect is treated as fixed, so a remedy is not used to erase it." : "The sign-effect is eligible for a remedy principle when adverse.",
      ],
      supportingEvidence: state.supportiveSignals,
      opposingEvidence: state.adverseSignals,
      confidence: houseRelevant && planetRelevant ? "structural-high" as const
        : houseRelevant || planetRelevant ? "structural-medium" as const : "low" as const,
      remedyLink: { decision: state.remedyDecision.decision, targetPlanets: state.remedyDecision.targetPlanets },
      sourceLocators: [SOURCE.fixedHouses, SOURCE.aspectGrammar, SOURCE.remediability],
    };
  }).filter((prediction) => prediction.relevance >= 3).sort((a, b) =>
    Number(b.activation === "birth-period-lord") - Number(a.activation === "birth-period-lord") ||
    b.relevance - a.relevance || b.opposingEvidence.length - a.opposingEvidence.length,
  );
  const directional = predictions.filter((prediction) => prediction.direction !== "unclear");
  const supportiveCount = directional.filter((prediction) => prediction.direction === "supportive").length;
  const challengingCount = directional.filter((prediction) => prediction.direction === "challenging").length;
  const mixedCount = directional.filter((prediction) => prediction.direction === "mixed").length;
  const overall = !directional.length ? "insufficient" as const
    : mixedCount || (supportiveCount && challengingCount) ? "mixed" as const
      : challengingCount ? "challenging" as const : "supportive" as const;
  const primaryPrediction = predictions.find((prediction) => prediction.activation === "birth-period-lord" && prediction.direction !== "unclear") ??
    predictions.find((prediction) => prediction.direction !== "unclear") ?? predictions[0];
  const trace: LalKitabExplanationStep[] = [
    { order: 1, rule: "fixed-house conversion", conclusion: "The natal placements were converted once into fixed houses.", facts: placements.map((p) => `${p.planet}=H${p.house}`), sourceLocator: SOURCE.fixedHouses },
    { order: 2, rule: "expression state", conclusion: "Planet type and house parity determine which planets actively speak in the chart.", facts: states.map((s) => `${s.planet} H${s.house}: ${s.expressionState}`), sourceLocator: SOURCE.speakingPlanets },
    { order: 3, rule: "relationship resolution", conclusion: `${diagnoses.length} planets have calculated adverse relationships after support is retained as contrary evidence.`, facts: diagnoses.flatMap((d) => d.adverseSignals.map((signal) => `${d.planet}: ${signal}`)), sourceLocator: SOURCE.aspectGrammar },
    { order: 4, rule: "artificial-planet synthesis", conclusion: `${artificialPlanets.length} artificial planet states were formed from same-house combinations.`, facts: artificialPlanets.map((item) => `${item.inputs.join("+")} -> ${item.produces} (${item.disposition}) in H${item.house}`), sourceLocator: SOURCE.artificialPlanets },
    { order: 5, rule: "planet-effect versus sign-effect", conclusion: "Only sign-effect cases proceed to a remedy principle; fixed planet-effect cases stop.", facts: states.map((s) => `${s.planet}: ${s.effectClass}`), sourceLocator: SOURCE.remediability },
    { order: 6, rule: "fixed-house-lord remedy selection", conclusion: "For an adverse remediable placement, the fixed owner of the occupied house becomes the first remedy target.", facts: diagnoses.map((d) => `${d.planet} H${d.house} -> ${d.remedyDecision.targetPlanets.join("+") || "no automatic target"}`), sourceLocator: SOURCE.remedyOfPlanet },
    { order: 7, rule: "topic prediction synthesis", conclusion: `${predictions.length} ${topic} natal tendencies were derived from relevant houses, planets, conditions, and birth-period context.`, facts: predictions.map((prediction) => `${prediction.planet} H${prediction.house}: ${prediction.direction} (${prediction.horizon})`), sourceLocator: SOURCE.aspectGrammar },
    { order: 8, rule: "remedy order", conclusion: "Resolve diagnosed/dormant planets, then period context, enmity, and only then fallback stages.", facts: diagnoses.map((d) => `${d.planet}: ${d.activation}`), sourceLocator: SOURCE.sequence },
  ];
  return {
    schemaVersion: "sahadeva-lal-kitab-inference-2",
    tradition: "lal-kitab-gosvami-1952",
    certification: {
      status: "structural-preview",
      convention: "gosvami-1952-fixed-houses",
      predictions: "withheld-pending-extraction-and-review",
      reviewStatus: "draft-unreviewed",
      notice: "Source-linked structural inspection only; unreviewed personalized claims remain withheld and must never be presented as certain.",
    },
    computation: { retrievalRequired: false, sourceLookupUsedForReasoning: false, chartCalculatedOnce: true },
    factGraph: {
      placements: states,
      occupiedHouses: [...byHouse].map(([house, planets]) => ({ house, planets })),
      relationshipEdges,
      artificialPlanets,
      chartStates: { blindChart, halfBlindChart, priorSideBlank, latterSideBlank },
    },
    diagnoses,
    artificialDiagnoses,
    topicPrediction: {
      topic, overall,
      primaryPredictionId: primaryPrediction?.id ?? null,
      primaryStatement: primaryPrediction?.statement ?? `The calculated Lal Kitab rules do not provide enough ${topic} evidence for a bounded prediction.`,
      counts: { supportive: supportiveCount, challenging: challengingCount, mixed: mixedCount, unclear: predictions.length - directional.length },
      calculationBasis: "Fixed houses + planet condition + Lal Kitab relationship grammar + birth-period context; no text retrieval or paragraph matching.",
    },
    predictions,
    remedyPlan: {
      outcome: diagnoses.length || artificialDiagnoses.length ? "conditional-principles" : "no-remedy-indicated",
      ordered: [
        ...diagnoses.map((state) => ({ planet: state.planet as string, house: state.house, basis: "natal-planet" as const, predictionIds: predictions.filter((prediction) => prediction.planet === state.planet && prediction.direction !== "supportive").map((prediction) => prediction.id), ...state.remedyDecision })),
        ...artificialDiagnoses.map((state) => ({ planet: state.planet as string, house: state.house, basis: "artificial-planet" as const, ...state.remedyDecision })),
      ].map((item, index) => ({ priority: index + 1, ...item })),
      sequencingRule: "One remedy principle at a time; do not combine simultaneous 40/43-day remedy courses.",
      fallbackOrder: ["diagnosed or dormant planet", "active-period planet", "enemy relationship", "sign-effect support", "Sun", "Rahu-Ketu-Saturn", "Mercury"],
    },
    explanationTrace: trace,
    unresolved: [
      "Annual-chart state is not inferred from natal astronomy.",
      "Quantitative confrontation fractions require a separately verified rule table.",
      "Artificial planets are synthesized structurally; their full house-specific outcome prose remains unexecuted.",
      "A remedy principle is not a publishable ritual instruction.",
    ],
    safety: {
      instructionPolicy: "Return logic and harmless principles; never auto-execute animal harm, ingestion/contact hazards, costly donation, medical claims, or initiation-dependent practice.",
      sourceLocators: SOURCE,
    },
  };
}
