import { z } from "zod";
import type { ChartResult, GrahaName } from "./schema";
import { calculateArgala } from "./practitioner";
import { analyzeNatalPanchanga } from "./natalPanchanga";

const grahaSchema = z.enum([
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
  "Lagna",
]);
const operatorSchema = z.enum([
  "eq",
  "neq",
  "in",
  "not-in",
  "gte",
  "lte",
  "includes",
]);

export const factRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("planet-house"), planet: grahaSchema }),
  z.object({ kind: z.literal("planet-sign"), planet: grahaSchema }),
  z.object({ kind: z.literal("planet-dignity"), planet: grahaSchema }),
  z.object({ kind: z.literal("planet-combust"), planet: grahaSchema }),
  z.object({ kind: z.literal("planet-retrograde"), planet: grahaSchema }),
  z.object({ kind: z.literal("planet-nakshatra"), planet: grahaSchema }),
  z.object({ kind: z.literal("planet-balaadi-avastha"), planet: grahaSchema }),
  z.object({ kind: z.literal("planet-diptadi-avastha"), planet: grahaSchema }),
  z.object({
    kind: z.literal("planet-lajjitadi-avasthas"),
    planet: grahaSchema,
  }),
  z.object({
    kind: z.literal("avastha-state-count"),
    system: z.enum(["balaadi", "diptadi", "lajjitadi"]),
    states: z.array(z.string().min(1)).min(1),
  }),
  z.object({ kind: z.literal("planet-strength-ratio"), planet: grahaSchema }),
  z.object({
    kind: z.literal("house-lord"),
    house: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("house-lord-house"),
    house: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("house-lord-dignity"),
    house: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("house-lord-combust"),
    house: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("house-lord-strength-ratio"),
    house: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("house-lord-benefic-influence-count"),
    house: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("house-lord-malefic-influence-count"),
    house: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("house-occupants"),
    house: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("varga-planet-house"),
    varga: z.string().regex(/^D\d+$/),
    planet: grahaSchema,
  }),
  z.object({
    kind: z.literal("varga-planet-dignity"),
    varga: z.string().regex(/^D\d+$/),
    planet: grahaSchema,
  }),
  z.object({
    kind: z.literal("panchanga-limb"),
    limb: z.enum(["vara", "tithi", "paksha", "nakshatra", "yoga", "karana"]),
  }),
  z.object({ kind: z.literal("natal-panchanga-tithi-class") }),
  z.object({
    kind: z.literal("natal-panchanga-tattva-conflict"),
    first: z.enum(["Vara", "Tithi", "Nakshatra", "Karana"]),
    second: z.enum(["Vara", "Tithi", "Nakshatra", "Karana"]),
  }),
  z.object({
    kind: z.literal("sarvashtakavarga-sign"),
    sign: z.number().int().min(0).max(11),
  }),
  z.object({
    kind: z.literal("relationship-compound"),
    from: grahaSchema,
    to: grahaSchema,
  }),
  z.object({
    kind: z.literal("house-lord-sambandha-count"),
    firstHouse: z.number().int().min(1).max(12),
    secondHouse: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("graha-aspect"),
    from: grahaSchema,
    to: grahaSchema,
  }),
  z.object({
    kind: z.literal("graha-conjunction"),
    first: grahaSchema,
    second: grahaSchema,
  }),
  z.object({
    kind: z.literal("argala-net-count"),
    targetHouse: z.number().int().min(1).max(12),
    argalaHouse: z.union([
      z.literal(2),
      z.literal(4),
      z.literal(5),
      z.literal(11),
    ]),
  }),
  z.object({
    kind: z.literal("argala-status-count"),
    status: z.enum([
      "no-intervention",
      "unobstructed",
      "partially-obstructed",
      "fully-obstructed",
    ]),
  }),
  z.object({ kind: z.literal("kendra-trikona-lord-association-count") }),
  z.object({ kind: z.literal("yoga-detected"), yoga: z.string().min(1) }),
  z.object({ kind: z.literal("current-dasha-lords") }),
]);
export type FactRef = z.infer<typeof factRefSchema>;

const predicateSchema = z.object({
  type: z.literal("predicate"),
  fact: factRefSchema,
  operator: operatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});
export type RuleCondition =
  | z.infer<typeof predicateSchema>
  | { type: "all" | "any"; conditions: RuleCondition[] }
  | { type: "not"; condition: RuleCondition };
export const ruleConditionSchema: z.ZodType<RuleCondition> = z.lazy(() =>
  z.union([
    predicateSchema,
    z.object({
      type: z.enum(["all", "any"]),
      conditions: z.array(ruleConditionSchema).min(1),
    }),
    z.object({ type: z.literal("not"), condition: ruleConditionSchema }),
  ]),
);

export const executableRuleSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  sourceKey: z.string().min(1),
  tradition: z.string().min(1),
  topic: z.string().min(1),
  effect: z.enum(["support", "oppose", "qualify", "abstain"]),
  weight: z.number().min(-100).max(100),
  condition: ruleConditionSchema,
  exceptions: z
    .array(
      z.object({
        id: z.string(),
        condition: ruleConditionSchema,
        effect: z.enum(["cancel", "reduce", "reverse"]),
        factor: z.number().min(0).max(1).default(0.5),
      }),
    )
    .default([]),
  interpretation: z.string().min(1),
  harmClass: z.enum([
    "general-cultural",
    "sensitive-reflective",
    "high-impact-restricted",
    "prohibited-output",
  ]),
  reviewStatus: z.enum(["draft", "approved", "rejected"]),
});
export type ExecutableRule = z.infer<typeof executableRuleSchema>;

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
const relative = (origin: number, target: number) =>
  ((target - origin + 12) % 12) + 1;

export function resolveRuleFact(
  chart: ChartResult,
  ref: FactRef,
  asOfIso: string,
): unknown {
  const lagna = chart.placements.find((item) => item.name === "Lagna")!;
  const houseLord = (house: number) => LORDS[(lagna.sign + house - 1) % 12],
    placement = (name: GrahaName) =>
      chart.placements.find((item) => item.name === name)!;
  if (ref.kind === "panchanga-limb") return chart.panchanga[ref.limb];
  if (ref.kind === "natal-panchanga-tithi-class")
    return analyzeNatalPanchanga(chart).nandadi.class;
  if (ref.kind === "natal-panchanga-tattva-conflict")
    return Boolean(
      analyzeNatalPanchanga(chart).tattvaRelationships.conflicts.find(
        (row) => row.first === ref.first && row.second === ref.second,
      )?.present,
    );
  if (ref.kind === "sarvashtakavarga-sign")
    return chart.advanced.ashtakavarga.sarva.signs[ref.sign];
  if (ref.kind === "relationship-compound")
    return (
      chart.advanced.planetaryStates.relationships.find(
        (item) => item.from === ref.from && item.to === ref.to,
      )?.compound ?? null
    );
  if (ref.kind === "house-lord-sambandha-count") {
    const first = houseLord(ref.firstHouse),
      second = houseLord(ref.secondHouse);
    if (first === second) return 1;
    const a = placement(first),
      b = placement(second),
      types = new Set<string>();
    if (a.sign === b.sign) types.add("conjunction");
    if (LORDS[a.sign] === second && LORDS[b.sign] === first)
      types.add("exchange");
    if (
      chart.advanced.aspects.some(
        (row) => row.from === first && row.to === second,
      ) &&
      chart.advanced.aspects.some(
        (row) => row.from === second && row.to === first,
      )
    )
      types.add("mutual-graha-drishti");
    const movable = new Set([0, 3, 6, 9]),
      fixed = new Set([1, 4, 7, 10]),
      dual = new Set([2, 5, 8, 11]),
      rasiAspect = (from: number, to: number) =>
        movable.has(from)
          ? fixed.has(to) && to !== (from + 1) % 12
          : fixed.has(from)
            ? movable.has(to) && to !== (from + 11) % 12
            : dual.has(from) && dual.has(to) && from !== to;
    if (rasiAspect(a.sign, b.sign) && rasiAspect(b.sign, a.sign))
      types.add("mutual-rasi-drishti");
    return types.size;
  }
  if (ref.kind === "graha-aspect")
    return chart.advanced.aspects.some(
      (item) => item.from === ref.from && item.to === ref.to,
    );
  if (ref.kind === "graha-conjunction")
    return placement(ref.first).sign === placement(ref.second).sign;
  if (ref.kind === "argala-net-count")
    return (
      calculateArgala(chart)
        .targets.find((item) => item.house === ref.targetHouse)
        ?.relationships.find((item) => item.argala === ref.argalaHouse)
        ?.netCount ?? null
    );
  if (ref.kind === "argala-status-count")
    return calculateArgala(chart).targets
      .flatMap((item) => item.relationships)
      .filter((item) => item.status === ref.status).length;
  if (ref.kind === "yoga-detected")
    return chart.advanced.yogas.some(
      (item) => item.yoga === ref.yoga && item.detected,
    );
  if (ref.kind === "kendra-trikona-lord-association-count") {
    const kendras = [1, 4, 7, 10],
      trikonas = [1, 5, 9],
      pairs = new Set<string>();
    for (const k of kendras)
      for (const t of trikonas) {
        if (k === t) continue;
        const first = houseLord(k),
          second = houseLord(t);
        if (first === second) {
          pairs.add(first);
          continue;
        }
        const a = placement(first),
          b = placement(second),
          conjunct = a.sign === b.sign,
          mutualAspect =
            chart.advanced.aspects.some(
              (row) => row.from === first && row.to === second,
            ) &&
            chart.advanced.aspects.some(
              (row) => row.from === second && row.to === first,
            ),
          exchange =
            a.sign === (lagna.sign + t - 1) % 12 &&
            b.sign === (lagna.sign + k - 1) % 12;
        if (conjunct || mutualAspect || exchange)
          pairs.add([first, second].sort().join("-"));
      }
    return pairs.size;
  }
  if (ref.kind === "avastha-state-count")
    return chart.advanced.planetaryStates.avasthas.filter((item) =>
      ref.system === "balaadi"
        ? ref.states.includes(item.balaadiAvastha)
        : ref.system === "diptadi"
          ? ref.states.includes(item.diptadiAvastha)
          : item.lajjitadiAvasthas.some((state) => ref.states.includes(state)),
    ).length;
  if (ref.kind === "house-lord")
    return LORDS[(lagna.sign + ref.house - 1) % 12];
  if (
    ref.kind === "house-lord-house" ||
    ref.kind === "house-lord-dignity" ||
    ref.kind === "house-lord-combust" ||
    ref.kind === "house-lord-strength-ratio" ||
    ref.kind === "house-lord-benefic-influence-count" ||
    ref.kind === "house-lord-malefic-influence-count"
  ) {
    const lord = houseLord(ref.house),
      lordPlacement = placement(lord),
      dignity = chart.advanced.dignities.find((item) => item.name === lord),
      state = chart.advanced.planetaryStates.avasthas.find(
        (item) => item.name === lord,
      );
    if (ref.kind === "house-lord-house")
      return relative(lagna.sign, lordPlacement.sign);
    if (ref.kind === "house-lord-dignity") return dignity?.dignity ?? null;
    if (ref.kind === "house-lord-combust") return Boolean(dignity?.combust);
    if (ref.kind === "house-lord-strength-ratio")
      return state?.requiredStrengthRatio ?? null;
    const natural =
      ref.kind === "house-lord-benefic-influence-count"
        ? new Set<GrahaName>(["Moon", "Mercury", "Jupiter", "Venus"])
        : new Set<GrahaName>(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);
    return chart.placements.filter(
      (item) =>
        item.name !== lord &&
        natural.has(item.name) &&
        (item.sign === lordPlacement.sign ||
          chart.advanced.aspects.some(
            (aspect) => aspect.from === item.name && aspect.to === lord,
          )),
    ).length;
  }
  if (ref.kind === "house-occupants") {
    const sign = (lagna.sign + ref.house - 1) % 12;
    return chart.placements
      .filter((item) => item.name !== "Lagna" && item.sign === sign)
      .map((item) => item.name);
  }
  if (ref.kind === "current-dasha-lords") {
    const jd = 2440587.5 + new Date(asOfIso).getTime() / 86400000,
      maha = chart.advanced.vimshottariTimeline.find(
        (item) => jd >= item.startJulianDay && jd < item.endJulianDay,
      ),
      antar = maha?.subPeriods.find(
        (item) => jd >= item.startJulianDay && jd < item.endJulianDay,
      );
    return [maha?.lord, antar?.lord].filter(Boolean);
  }
  if (ref.kind === "varga-planet-house") {
    const placements = chart.advanced.vargas[ref.varga],
      vLagna = placements?.find((item) => item.name === "Lagna"),
      vPlanet = placements?.find((item) => item.name === ref.planet);
    return vLagna && vPlanet ? relative(vLagna.sign, vPlanet.sign) : null;
  }
  if (ref.kind === "varga-planet-dignity") {
    const sign = chart.advanced.vargas[ref.varga]?.find(
      (item) => item.name === ref.planet,
    )?.sign;
    if (sign == null) return null;
    const own: Partial<Record<GrahaName, number[]>> = {
        Sun: [4],
        Moon: [3],
        Mars: [0, 7],
        Mercury: [2, 5],
        Jupiter: [8, 11],
        Venus: [1, 6],
        Saturn: [9, 10],
      },
      exalted: Partial<Record<GrahaName, number>> = {
        Sun: 0,
        Moon: 1,
        Mars: 9,
        Mercury: 5,
        Jupiter: 3,
        Venus: 11,
        Saturn: 6,
      },
      debilitated: Partial<Record<GrahaName, number>> = {
        Sun: 6,
        Moon: 7,
        Mars: 3,
        Mercury: 11,
        Jupiter: 9,
        Venus: 5,
        Saturn: 0,
      };
    return exalted[ref.planet] === sign
      ? "exalted"
      : debilitated[ref.planet] === sign
        ? "debilitated"
        : own[ref.planet]?.includes(sign)
          ? "own"
          : "neutral";
  }
  const planet = chart.placements.find((item) => item.name === ref.planet);
  if (!planet) return null;
  if (ref.kind === "planet-house") return relative(lagna.sign, planet.sign);
  if (ref.kind === "planet-sign") return planet.sign;
  if (ref.kind === "planet-retrograde") return Boolean(planet.retrograde);
  if (ref.kind === "planet-nakshatra") return planet.nakshatra;
  if (ref.kind === "planet-balaadi-avastha")
    return (
      chart.advanced.planetaryStates.avasthas.find(
        (item) => item.name === ref.planet,
      )?.balaadiAvastha ?? null
    );
  if (ref.kind === "planet-diptadi-avastha")
    return (
      chart.advanced.planetaryStates.avasthas.find(
        (item) => item.name === ref.planet,
      )?.diptadiAvastha ?? null
    );
  if (ref.kind === "planet-lajjitadi-avasthas")
    return (
      chart.advanced.planetaryStates.avasthas.find(
        (item) => item.name === ref.planet,
      )?.lajjitadiAvasthas ?? []
    );
  if (ref.kind === "planet-dignity")
    return (
      chart.advanced.dignities.find((item) => item.name === ref.planet)
        ?.dignity ?? null
    );
  if (ref.kind === "planet-combust")
    return (
      chart.advanced.dignities.find((item) => item.name === ref.planet)
        ?.combust ?? null
    );
  if (ref.kind === "planet-strength-ratio")
    return (
      chart.advanced.planetaryStates.avasthas.find(
        (item) => item.name === ref.planet,
      )?.requiredStrengthRatio ?? null
    );
  return null;
}

function compare(
  actual: unknown,
  operator: z.infer<typeof operatorSchema>,
  expected: unknown,
) {
  if (operator === "eq") return actual === expected;
  if (operator === "neq") return actual !== expected;
  if (operator === "gte")
    return (
      typeof actual === "number" &&
      typeof expected === "number" &&
      actual >= expected
    );
  if (operator === "lte")
    return (
      typeof actual === "number" &&
      typeof expected === "number" &&
      actual <= expected
    );
  if (operator === "in" || operator === "not-in") {
    const hit = Array.isArray(expected) && expected.includes(actual as never);
    return operator === "in" ? hit : !hit;
  }
  return Array.isArray(actual) && actual.includes(expected as never);
}

export function evaluateRuleCondition(
  chart: ChartResult,
  condition: RuleCondition,
  asOfIso: string,
): { matched: boolean; facts: Array<{ ref: FactRef; value: unknown }> } {
  if (condition.type === "predicate") {
    const value = resolveRuleFact(chart, condition.fact, asOfIso);
    return {
      matched: compare(value, condition.operator, condition.value),
      facts: [{ ref: condition.fact, value }],
    };
  }
  if (condition.type === "not") {
    const result = evaluateRuleCondition(chart, condition.condition, asOfIso);
    return { ...result, matched: !result.matched };
  }
  const results = condition.conditions.map((item) =>
    evaluateRuleCondition(chart, item, asOfIso),
  );
  return {
    matched:
      condition.type === "all"
        ? results.every((item) => item.matched)
        : results.some((item) => item.matched),
    facts: results.flatMap((item) => item.facts),
  };
}

export function executeRule(
  chart: ChartResult,
  rawRule: unknown,
  asOfIso: string,
) {
  const rule = executableRuleSchema.parse(rawRule),
    base = evaluateRuleCondition(chart, rule.condition, asOfIso);
  if (!base.matched)
    return {
      rule,
      matched: false,
      effectiveEffect: rule.effect,
      effectiveWeight: 0,
      facts: base.facts,
      appliedExceptions: [],
    };
  const appliedExceptions = rule.exceptions.flatMap((exception) => {
    const result = evaluateRuleCondition(chart, exception.condition, asOfIso);
    return result.matched ? [{ ...exception, facts: result.facts }] : [];
  });
  let effectiveEffect = rule.effect,
    effectiveWeight = rule.weight;
  for (const exception of appliedExceptions) {
    if (exception.effect === "cancel") effectiveWeight = 0;
    if (exception.effect === "reduce") effectiveWeight *= exception.factor;
    if (exception.effect === "reverse") {
      effectiveWeight *= -1;
      effectiveEffect =
        rule.effect === "support"
          ? "oppose"
          : rule.effect === "oppose"
            ? "support"
            : rule.effect;
    }
  }
  const publishable =
    rule.reviewStatus === "approved" &&
    rule.harmClass !== "high-impact-restricted" &&
    rule.harmClass !== "prohibited-output";
  return {
    rule,
    matched: true,
    publishable,
    effectiveEffect,
    effectiveWeight,
    facts: base.facts,
    appliedExceptions,
  };
}
