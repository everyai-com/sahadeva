import { SIGNS } from "./constants";
import type { ChartResult, GrahaName } from "./schema";
import { calculateJaimini } from "./jaimini";

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
const CLASSICAL = new Set<GrahaName>([
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
]);
const relative = (origin: number, target: number) =>
  ((target - origin + 12) % 12) + 1;

export function calculateFunctionalLordships(chart: ChartResult) {
  const lagna = chart.placements.find((p) => p.name === "Lagna")!,
    ownership = new Map<GrahaName, number[]>();
  for (let house = 1; house <= 12; house++) {
    const sign = (lagna.sign + house - 1) % 12,
      lord = LORDS[sign];
    ownership.set(lord, [...(ownership.get(lord) || []), house]);
  }
  const planets = [...ownership.entries()].map(([planet, houses]) => {
    const kendra = houses.filter((h) => [1, 4, 7, 10].includes(h)),
      trikona = houses.filter((h) => [1, 5, 9].includes(h)),
      dusthana = houses.filter((h) => [6, 8, 12].includes(h)),
      yogakaraka = kendra.some((h) => h !== 1) && trikona.some((h) => h !== 1);
    let functionalNature: "supportive" | "challenging" | "mixed" = "mixed";
    if (yogakaraka || trikona.some((h) => [5, 9].includes(h)))
      functionalNature = "supportive";
    if (dusthana.length && !trikona.length) functionalNature = "challenging";
    return {
      planet,
      houses,
      kendra,
      trikona,
      dusthana,
      yogakaraka,
      functionalNature,
      reason: yogakaraka
        ? `${planet} owns both a Kendra and a Trikona.`
        : `${planet} owns house(s) ${houses.join(", ")}.`,
    };
  });
  return {
    schemaVersion: "sahadeva-functional-lordship-1",
    lagnaSign: lagna.sign,
    lagnaSignName: SIGNS[lagna.sign],
    planets,
    notice:
      "Functional status is structural and Lagna-specific. Natural character, placement, dignity, relationships and topic context must still be judged.",
  };
}

export function calculateArgala(chart: ChartResult) {
  const lagna = chart.placements.find((p) => p.name === "Lagna")!,
    planets = chart.placements.filter((p) => p.name !== "Lagna"),
    naturalMalefics = new Set<GrahaName>([
      "Sun",
      "Mars",
      "Saturn",
      "Rahu",
      "Ketu",
    ]),
    pairs = [
      { argala: 2, virodha: 12, kind: "primary" },
      { argala: 4, virodha: 10, kind: "primary" },
      { argala: 11, virodha: 3, kind: "primary" },
      { argala: 5, virodha: 9, kind: "secondary" },
    ] as const,
    targets = Array.from({ length: 12 }, (_, index) => {
      const house = index + 1,
        targetSign = (lagna.sign + index) % 12,
        relationships = pairs.map((pair) => {
          const argalaSign = (targetSign + pair.argala - 1) % 12,
            virodhaSign = (targetSign + pair.virodha - 1) % 12,
            argalaPlanets = planets
              .filter((p) => p.sign === argalaSign)
              .map((p) => p.name),
            virodhaPlanets = planets
              .filter((p) => p.sign === virodhaSign)
              .map((p) => p.name),
            netCount = argalaPlanets.length - virodhaPlanets.length,
            status =
              argalaPlanets.length === 0
                ? "no-intervention"
                : virodhaPlanets.length === 0
                  ? "unobstructed"
                  : virodhaPlanets.length >= argalaPlanets.length
                    ? "fully-obstructed"
                    : "partially-obstructed";
          return {
            ...pair,
            argalaSign,
            virodhaSign,
            argalaPlanets,
            virodhaPlanets,
            netCount,
            status,
            natureComposition: {
              argalaNaturalMalefics: argalaPlanets.filter((p) =>
                naturalMalefics.has(p),
              ),
              argalaOtherPlanets: argalaPlanets.filter(
                (p) => !naturalMalefics.has(p),
              ),
              virodhaNaturalMalefics: virodhaPlanets.filter((p) =>
                naturalMalefics.has(p),
              ),
              contextualNatureUnresolved: (["Moon", "Mercury"] as GrahaName[]).filter(
                (p) => argalaPlanets.includes(p) || virodhaPlanets.includes(p),
              ),
            },
          };
        });
      return {
        house,
        targetSign,
        targetSignName: SIGNS[targetSign],
        relationships,
      };
    });
  return {
    schemaVersion: "sahadeva-argala-2",
    convention: {
      argalaToVirodha: { 2: 12, 4: 10, 11: 3, 5: 9 },
      scope: "D1 sign occupancy",
      nodeException: "not-applied-no-rule-found-in-current-three-book-extract",
      counting:
        "An existing intervention is fully obstructed when the opposing occupant count is equal or greater; zero intervention is reported separately.",
      sourceEvidence: [
        "book-larsen-fundamentals:L1093",
        "book-larsen-fundamentals:L5306-L5308",
        "book-larsen-fundamentals:L6762",
        "book-rath-remedies:L18475-L18511",
      ],
      reviewStatus: "draft",
    },
    targets,
    notice:
      "Argala and Virodha Argala are structural intervention relationships. Natural composition is shown separately and is not automatically favorable, harmful, or predictive.",
  };
}

export function buildPlanetaryRelationshipGraph(chart: ChartResult) {
  const placements = chart.placements.filter((p) => p.name !== "Lagna"),
    relationships = chart.advanced.planetaryStates.relationships,
    nodes = placements.map((p) => {
      const dispositor = LORDS[p.sign],
        state = chart.advanced.planetaryStates.avasthas.find(
          (a) => a.name === p.name,
        ),
        dignity = chart.advanced.dignities.find((d) => d.name === p.name);
      return {
        id: p.name,
        sign: p.sign,
        signName: SIGNS[p.sign],
        house: relative(
          chart.placements.find((x) => x.name === "Lagna")!.sign,
          p.sign,
        ),
        dispositor,
        dignity: dignity?.dignity || "unknown",
        combust: Boolean(dignity?.combust),
        retrograde: Boolean(p.retrograde),
        strengthRatio: state?.requiredStrengthRatio ?? null,
      };
    }),
    edges: Array<{
      from: string;
      to: string;
      kind: string;
      direction: "directed" | "mutual";
      detail: string;
    }> = [];
  for (const node of nodes)
    edges.push({
      from: node.id,
      to: node.dispositor,
      kind: "dispositor",
      direction: "directed",
      detail: `${node.id} occupies ${SIGNS[node.sign]}, ruled by ${node.dispositor}.`,
    });
  for (let i = 0; i < placements.length; i++)
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i],
        b = placements[j];
      if (a.sign === b.sign)
        edges.push({
          from: a.name,
          to: b.name,
          kind: "conjunction",
          direction: "mutual",
          detail: `${a.name} and ${b.name} share ${SIGNS[a.sign]}.`,
        });
      if (LORDS[a.sign] === b.name && LORDS[b.sign] === a.name)
        edges.push({
          from: a.name,
          to: b.name,
          kind: "exchange",
          direction: "mutual",
          detail: `${a.name} and ${b.name} occupy one another's signs.`,
        });
    }
  for (const aspect of chart.advanced.aspects)
    edges.push({
      from: aspect.from,
      to: aspect.to,
      kind: "graha-drishti",
      direction: "directed",
      detail: `${aspect.from} casts ${aspect.kind} to ${aspect.to}.`,
    });
  for (const aspect of calculateJaimini(chart).rashiDrishti.planetToPlanet)
    edges.push({
      from: aspect.from,
      to: aspect.to,
      kind: "rasi-drishti",
      direction: "directed",
      detail: `${aspect.from} has Jaimini Rasi Drishti to ${aspect.to}.`,
    });
  for (let i = 0; i < placements.length; i++)
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i],
        b = placements[j],
        distance = relative(a.sign, b.sign),
        pair =
          distance === 1
            ? "conjunction"
            : [4, 7, 10].includes(distance)
              ? "mutual-kendra"
              : [5, 9].includes(distance)
                ? "mutual-trikona"
                : [3, 11].includes(distance)
                  ? "mutual-3-11"
                  : [2, 12].includes(distance)
                    ? "mutual-2-12"
                    : "mutual-6-8";
      edges.push({
        from: a.name,
        to: b.name,
        kind: `bhava-sambandha-${pair}`,
        direction: "mutual",
        detail: `${a.name} and ${b.name} are in a ${pair.replace("mutual-", "")} Bhava Sambandha; this describes how they work together, not friendship or support.`,
      });
    }
  for (const relation of relationships.filter(
    (r) =>
      CLASSICAL.has(r.from as GrahaName) && CLASSICAL.has(r.to as GrahaName),
  ))
    edges.push({
      from: relation.from,
      to: relation.to,
      kind: `compound-${relation.compound}`,
      direction: "directed",
      detail: `Natural ${relation.natural}; temporary ${relation.temporary}; compound ${relation.compound}.`,
    });
  const chains = nodes.map((node) => {
    const path: string[] = [node.id];
    let next = node.dispositor;
    while (!path.includes(next) && path.length < 10) {
      path.push(next);
      next = nodes.find((item) => item.id === next)?.dispositor || next;
    }
    return {
      planet: node.id,
      path,
      terminatesAt: path.includes(next) ? next : null,
    };
  });
  return {
    schemaVersion: "sahadeva-relationship-graph-2",
    nodes,
    edges,
    dispositorChains: chains,
    functionalLordships: calculateFunctionalLordships(chart),
    argala: calculateArgala(chart),
    sourceModel: {
      sourceKey: "book-larsen-fundamentals:L4383-L4542",
      naisargika: "natural disposition for a stated purpose",
      bhava:
        "physical house-distance relationship; does not establish friendship",
      rajyaYogaTatkalika:
        "temporary support from houses 10, 11, 12, 2, 3 and 4",
      grahaSambandha: [
        "exchange",
        "conjunction",
        "mutual-graha-drishti",
        "mutual-rasi-drishti",
      ],
      reviewStatus: "draft",
    },
    notice:
      "Natural, Bhava, Rajya-Yoga temporary and Graha Sambandha are distinct evidence types and are never silently collapsed. Argala remains a separate intervention layer.",
  };
}

export function analyzeVargaDomain(
  chart: ChartResult,
  varga: string,
  house: number,
  karakas: GrahaName[],
) {
  const placements =
      varga === "D1" ? chart.placements : chart.advanced.vargas[varga],
    lagna = placements?.find((p) => p.name === "Lagna");
  if (!placements || !lagna)
    return {
      varga,
      status: "unavailable",
      house,
      lord: null,
      lagna: null,
      evidence: [],
    };
  const houseSign = (lagna.sign + house - 1) % 12,
    lord = LORDS[houseSign],
    lordPlacement = placements.find((p) => p.name === lord),
    occupants = placements.filter(
      (p) => p.name !== "Lagna" && p.sign === houseSign,
    ),
    karakaRows = karakas.flatMap((name) => {
      const p = placements.find((item) => item.name === name);
      return p
        ? [{ name, sign: p.sign, house: relative(lagna.sign, p.sign) }]
        : [];
    }),
    lordHouse = lordPlacement ? relative(lagna.sign, lordPlacement.sign) : null,
    support = lordHouse !== null && [1, 4, 5, 7, 9, 10, 11].includes(lordHouse);
  return {
    varga,
    status: support ? "supporting" : "challenging",
    house,
    lagna: { sign: lagna.sign, signName: SIGNS[lagna.sign] },
    houseSign,
    houseSignName: SIGNS[houseSign],
    lord,
    lordPlacement: lordPlacement
      ? { sign: lordPlacement.sign, house: lordHouse }
      : null,
    occupants: occupants.map((p) => p.name),
    karakas: karakaRows,
    evidence: [
      `${varga} Lagna is ${SIGNS[lagna.sign]}.`,
      `${varga} house ${house} is ${SIGNS[houseSign]}, ruled by ${lord}.`,
      lordHouse
        ? `${lord} occupies house ${lordHouse} in ${varga}.`
        : `${lord} placement is unavailable.`,
    ],
  };
}
