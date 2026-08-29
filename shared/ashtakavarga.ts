import type { GrahaName, Placement } from "./schema";

const TARGETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
const CONTRIBUTORS = [...TARGETS, "Lagna"] as const;
type Target = typeof TARGETS[number];
type Contributor = typeof CONTRIBUTORS[number];

// Favorable house offsets (1-based) from each contributor. BPHS transmitted
// terminology for bindu/rekha varies; this engine names the semantic value.
const RULES: Record<Target, Record<Contributor, number[]>> = {
  Sun: {
    Sun:[1,2,4,7,8,9,10,11], Moon:[3,6,10,11], Mars:[1,2,4,7,8,9,10,11], Mercury:[3,5,6,9,10,11,12],
    Jupiter:[5,6,9,11], Venus:[6,7,12], Saturn:[1,2,4,7,8,9,10,11], Lagna:[3,4,6,10,11,12],
  },
  Moon: {
    Sun:[3,6,7,8,10,11], Moon:[1,3,6,7,10,11], Mars:[2,3,5,6,9,10,11], Mercury:[1,3,4,5,7,8,10,11],
    Jupiter:[1,2,4,7,8,10,11], Venus:[3,4,5,7,9,10,11], Saturn:[3,5,6,11], Lagna:[3,6,10,11],
  },
  Mars: {
    Sun:[3,5,6,10,11], Moon:[3,6,11], Mars:[1,2,4,7,8,10,11], Mercury:[3,5,6,11],
    Jupiter:[6,10,11,12], Venus:[6,8,11,12], Saturn:[1,4,7,8,9,10,11], Lagna:[1,3,6,10,11],
  },
  Mercury: {
    Sun:[5,6,9,11,12], Moon:[2,4,6,8,10,11], Mars:[1,2,4,7,8,9,10,11], Mercury:[1,3,5,6,9,10,11,12],
    Jupiter:[6,8,11,12], Venus:[1,2,3,4,5,8,9,11], Saturn:[1,2,4,7,8,9,10,11], Lagna:[1,2,4,6,8,10,11],
  },
  Jupiter: {
    Sun:[1,2,3,4,7,8,9,10,11], Moon:[2,5,7,9,11], Mars:[1,2,4,7,8,10,11], Mercury:[1,2,4,5,6,9,10,11],
    Jupiter:[1,2,3,4,7,8,10,11], Venus:[2,5,6,9,10,11], Saturn:[3,5,6,12], Lagna:[1,2,4,5,6,7,9,10,11],
  },
  Venus: {
    Sun:[8,11,12], Moon:[1,2,3,4,5,8,9,11,12], Mars:[3,5,6,9,11,12], Mercury:[3,5,6,9,11],
    Jupiter:[5,8,9,10,11], Venus:[1,2,3,4,5,8,9,10,11], Saturn:[3,4,5,8,9,10,11], Lagna:[1,2,3,4,5,8,9,11],
  },
  Saturn: {
    Sun:[1,2,4,7,8,10,11], Moon:[3,6,11], Mars:[3,5,6,10,11,12], Mercury:[6,8,9,10,11,12],
    Jupiter:[5,6,11,12], Venus:[6,11,12], Saturn:[3,5,6,11], Lagna:[1,3,4,6,10,11],
  },
};

export const EXPECTED_BAV_TOTALS: Record<Target, number> = { Sun:48, Moon:49, Mars:39, Mercury:54, Jupiter:56, Venus:52, Saturn:39 };

const TRINES = [[0,4,8],[1,5,9],[2,6,10],[3,7,11]] as const;
const CO_LORD_SIGNS = [[0,7],[2,5],[8,11],[1,6],[9,10]] as const;
const RASI_MULTIPLIERS = [7,10,8,4,10,6,7,8,9,5,11,12] as const;
const GRAHA_MULTIPLIERS: Record<Target, number> = { Sun:5, Moon:5, Mars:8, Mercury:5, Jupiter:10, Venus:7, Saturn:5 };

function trikonaShodhana(source: number[]) {
  const values = [...source];
  for (const group of TRINES) {
    const groupValues = group.map((sign) => values[sign]);
    if (groupValues.includes(0)) continue;
    const least = Math.min(...groupValues);
    for (const sign of group) values[sign] -= least;
  }
  return values;
}

function ekadhipatyaShodhana(source: number[], occupied: Set<number>) {
  const values = [...source];
  for (const [first, second] of CO_LORD_SIGNS) {
    const a = values[first], b = values[second];
    if (a === 0 || b === 0) continue;
    const firstOccupied = occupied.has(first), secondOccupied = occupied.has(second);
    if (firstOccupied && secondOccupied) continue;
    if (!firstOccupied && !secondOccupied) {
      if (a === b) values[first] = values[second] = 0;
      else values[first] = values[second] = Math.min(a, b);
      continue;
    }
    const occupiedSign = firstOccupied ? first : second;
    const emptySign = firstOccupied ? second : first;
    values[emptySign] = values[occupiedSign] < values[emptySign] ? values[emptySign] - values[occupiedSign] : 0;
  }
  return values;
}

export function calculateAshtakavarga(placements: Placement[]) {
  const signOf = (name: GrahaName) => placements.find((p) => p.name === name)?.sign;
  const bhinna = Object.fromEntries(TARGETS.map((target) => {
    const signs = Array(12).fill(0) as number[];
    const contributions: Record<string, number[]> = {};
    for (const contributor of CONTRIBUTORS) {
      const origin = signOf(contributor);
      if (origin === undefined) throw new Error(`Missing ${contributor} for Ashtakavarga`);
      const marked = RULES[target][contributor].map((house) => (origin + house - 1) % 12);
      contributions[contributor] = marked;
      for (const sign of marked) signs[sign] += 1;
    }
    return [target, { signs, total: signs.reduce((sum, value) => sum + value, 0), contributions }];
  })) as Record<Target, { signs: number[]; total: number; contributions: Record<string, number[]> }>;
  const sarva = Array.from({ length: 12 }, (_, sign) => TARGETS.reduce((sum, target) => sum + bhinna[target].signs[sign], 0));
  // Classical-planet occupancy only: nodes and Lagna do not participate in
  // Ekadhipatya occupancy in this explicitly selected convention.
  const occupied = new Set(TARGETS.map((name) => signOf(name)!));
  const reducedBhinna = Object.fromEntries(TARGETS.map((target) => {
    const afterTrikona = trikonaShodhana(bhinna[target].signs);
    const afterEkadhipatya = ekadhipatyaShodhana(afterTrikona, occupied);
    return [target, { afterTrikona, afterEkadhipatya, total: afterEkadhipatya.reduce((sum, value) => sum + value, 0) }];
  })) as Record<Target, { afterTrikona: number[]; afterEkadhipatya: number[]; total: number }>;
  const pinda = Object.fromEntries(TARGETS.map((target) => {
    const reduced = reducedBhinna[target].afterEkadhipatya;
    const rasiPinda = reduced.reduce((sum, value, sign) => sum + value * RASI_MULTIPLIERS[sign], 0);
    const grahaPinda = TARGETS.reduce((sum, occupant) => sum + reduced[signOf(occupant)!] * GRAHA_MULTIPLIERS[occupant], 0);
    return [target, { rasiPinda, grahaPinda, yogaPinda: rasiPinda + grahaPinda }];
  })) as Record<Target, { rasiPinda: number; grahaPinda: number; yogaPinda: number }>;
  return {
    convention: "favorable-mark counts; bindu/rekha naming intentionally neutralized",
    bhinna,
    sarva: { signs: sarva, total: sarva.reduce((sum, value) => sum + value, 0) },
    reductions: {
      status: "applied",
      order: ["Trikona Shodhana", "Ekadhipatya Shodhana"],
      occupancyConvention: "Sun through Saturn only; Rahu, Ketu and Lagna excluded",
      bhinna: reducedBhinna,
      notice: "Reduced BAV is kept separate from the unreduced SAV.",
    },
    pinda: { status: "applied", rasiMultipliers: [...RASI_MULTIPLIERS], grahaMultipliers: GRAHA_MULTIPLIERS, values: pinda, convention: "BPHS Rasimana and Grahamana Chakra applied after both reductions; classical planets only." },
  };
}
