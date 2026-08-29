import type { ChartResult, GrahaName, Placement } from "./schema";
import { jdToIso } from "./dashaCalendar";

const YEAR = 365.2425;
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
const ODD_FOOTED = new Set([0, 1, 2, 6, 7, 8]);
const MOVABLE = new Set([0, 3, 6, 9]),
  FIXED = new Set([1, 4, 7, 10]),
  DUAL = new Set([2, 5, 8, 11]);
const EXALTATION: Partial<Record<GrahaName, number>> = {
  Sun: 0,
  Moon: 1,
  Mars: 9,
  Mercury: 5,
  Jupiter: 3,
  Venus: 11,
  Saturn: 6,
};
const DEBILITATION: Partial<Record<GrahaName, number>> = {
  Sun: 6,
  Moon: 7,
  Mars: 3,
  Mercury: 11,
  Jupiter: 9,
  Venus: 5,
  Saturn: 0,
};
const rashiAspect = (from: number, to: number) =>
  MOVABLE.has(from)
    ? FIXED.has(to) && to !== (from + 1) % 12
    : FIXED.has(from)
      ? MOVABLE.has(to) && to !== (from + 11) % 12
      : DUAL.has(from) && DUAL.has(to) && from !== to;
const distance = (from: number, to: number, forward: boolean) =>
  forward ? ((to - from + 12) % 12) + 1 : ((from - to + 12) % 12) + 1;
const modality = (sign: number) =>
  DUAL.has(sign) ? 3 : FIXED.has(sign) ? 2 : 1;

function coLordCandidates(sign: number): GrahaName[] {
  return sign === 7
    ? ["Mars", "Ketu"]
    : sign === 10
      ? ["Saturn", "Rahu"]
      : [LORDS[sign]];
}
function influences(chart: ChartResult, planet: Placement) {
  const dispositor = LORDS[planet.sign];
  return ["Jupiter", "Mercury", dispositor].filter((name) => {
    const p = chart.placements.find((x) => x.name === name)!;
    return p.sign === planet.sign || rashiAspect(p.sign, planet.sign);
  }).length;
}
function strongerPlanet(
  chart: ChartResult,
  names: GrahaName[],
  forSign: number,
) {
  if (names.length === 1) return names[0];
  const rows = names.map((name) => {
    const p = chart.placements.find((x) => x.name === name)!,
      companions = chart.placements.filter(
        (x) => x.name !== "Lagna" && x.name !== name && x.sign === p.sign,
      ).length,
      aspectSupport = influences(chart, p),
      exalted = EXALTATION[name] === p.sign ? 1 : 0,
      duration = distance(forSign, p.sign, ODD_FOOTED.has(forSign)) - 1,
      advancement =
        name === "Rahu" || name === "Ketu" ? 30 - p.degree : p.degree;
    return {
      name,
      p,
      companions,
      aspectSupport,
      exalted,
      modality: modality(p.sign),
      duration,
      advancement,
    };
  });
  const resident = rows.find((r) => r.p.sign === forSign);
  if (resident) return rows.find((r) => r !== resident)!.name;
  rows.sort(
    (a, b) =>
      b.companions - a.companions ||
      b.aspectSupport - a.aspectSupport ||
      b.exalted - a.exalted ||
      b.modality - a.modality ||
      b.duration - a.duration ||
      b.advancement - a.advancement,
  );
  return rows[0].name;
}
function primaryLord(chart: ChartResult, sign: number) {
  return strongerPlanet(chart, coLordCandidates(sign), sign);
}
function signStrength(chart: ChartResult, sign: number) {
  const lord = primaryLord(chart, sign),
    lordPlacement = chart.placements.find((p) => p.name === lord)!,
    occupants = chart.placements.filter(
      (p) => p.name !== "Lagna" && p.sign === sign,
    ),
    support = ["Jupiter", "Mercury", lord].filter((name) => {
      const p = chart.placements.find((x) => x.name === name)!;
      return p.sign === sign || rashiAspect(p.sign, sign);
    }).length,
    exalted = occupants.some((p) => EXALTATION[p.name] === sign) ? 1 : 0,
    differentOddity = sign % 2 !== lordPlacement.sign % 2 ? 1 : 0,
    advancement =
      lord === "Rahu" || lord === "Ketu"
        ? 30 - lordPlacement.degree
        : lordPlacement.degree;
  return {
    sign,
    lord,
    occupants: occupants.length,
    support,
    exalted,
    differentOddity,
    modality: modality(sign),
    advancement,
    evidence: [
      `occupants=${occupants.length}`,
      `Jupiter/Mercury/lord support=${support}`,
      `exalted occupant=${Boolean(exalted)}`,
      `lord oddity differs=${Boolean(differentOddity)}`,
      `lord advancement=${advancement.toFixed(4)}°`,
    ],
  };
}
function strongerSign(chart: ChartResult, a: number, b: number) {
  const x = signStrength(chart, a),
    y = signStrength(chart, b),
    fields = [
      "occupants",
      "support",
      "exalted",
      "differentOddity",
      "modality",
      "advancement",
    ] as const;
  for (const field of fields)
    if (x[field] !== y[field])
      return {
        x: x,
        y: y,
        winner: x[field] > y[field] ? a : b,
        decidedBy: field,
      };
  return { x, y, winner: a, decidedBy: "stable-first-sign-tie-break" };
}
function narayanaSequence(seed: number, chart: ChartResult) {
  const saturn = chart.placements.find((p) => p.name === "Saturn")!,
    ketu = chart.placements.find((p) => p.name === "Ketu")!,
    saturnException = saturn.sign === seed,
    ketuException = !saturnException && ketu.sign === seed;
  let forward = ODD_FOOTED.has((seed + 8) % 12);
  if (ketuException) forward = !forward;
  if (saturnException)
    return {
      signs: Array.from({ length: 12 }, (_, i) => (seed + i) % 12),
      direction: "forward" as const,
      progression: "regular-Saturn-exception",
      saturnException,
      ketuException,
    };
  const step = (n: number) => (forward ? n : -n),
    offsets = MOVABLE.has(seed)
      ? Array.from({ length: 12 }, (_, i) => i)
      : FIXED.has(seed)
        ? Array.from({ length: 12 }, (_, i) => (i * 5) % 12)
        : [0, 4, 8, 9, 1, 5, 6, 10, 2, 3, 7, 11];
  return {
    signs: offsets.map((n) => (seed + step(n) + 120) % 12),
    direction: forward ? ("forward" as const) : ("backward" as const),
    progression: MOVABLE.has(seed)
      ? "Brahma-regular"
      : FIXED.has(seed)
        ? "Shiva-every-sixth"
        : "Vishnu-trinal",
    saturnException,
    ketuException,
  };
}
function signYears(chart: ChartResult, sign: number) {
  const lord = primaryLord(chart, sign),
    placement = chart.placements.find((p) => p.name === lord)!,
    count = distance(sign, placement.sign, ODD_FOOTED.has(sign)),
    base = count === 1 ? 12 : count - 1,
    adjustment =
      EXALTATION[lord] === placement.sign
        ? 1
        : DEBILITATION[lord] === placement.sign
          ? -1
          : 0;
  return {
    lord,
    count,
    base,
    adjustment,
    years: Math.max(1, base + adjustment),
    direction: ODD_FOOTED.has(sign) ? "forward" : "backward",
  };
}

export function calculateNarayanaDasha(chart: ChartResult, cycles = 2) {
  const lagna = chart.placements.find((p) => p.name === "Lagna")!.sign,
    seventh = (lagna + 6) % 12,
    comparison = strongerSign(chart, lagna, seventh),
    seed = comparison.winner,
    progression = narayanaSequence(seed, chart),
    first = Object.fromEntries(
      progression.signs.map((sign) => [sign, signYears(chart, sign)]),
    ),
    periods: Array<Record<string, unknown>> = [];
  let cursor = chart.engine.julianDay;
  for (let cycle = 1; cycle <= cycles; cycle++)
    for (const sign of progression.signs) {
      const detail = first[sign],
        years = cycle === 1 ? detail.years : 12 - detail.years;
      if (years <= 0) continue;
      const start = cursor,
        end = cursor + years * YEAR;
      periods.push({
        cycle,
        sign,
        years,
        startJulianDay: start,
        endJulianDay: end,
        startIso: jdToIso(start),
        endIso: jdToIso(end),
        lord: detail.lord,
        direction: detail.direction,
        firstCycleEvidence: detail,
      });
      cursor = end;
    }
  return {
    schemaVersion: "sahadeva-narayana-dasha-1",
    status: "structural-research-preview",
    seed: {
      lagna,
      seventh,
      selected: seed,
      decidedBy: comparison.decidedBy,
      lagnaEvidence: comparison.x.sign === lagna ? comparison.x : comparison.y,
      seventhEvidence:
        comparison.x.sign === seventh ? comparison.x : comparison.y,
    },
    progression,
    periods,
    convention: {
      id: "pvr-narayana-d1@1.0.0",
      source: "Vedic Astrology: An Integrated Approach, §§15.5.2 and 18.2",
      oddFootedSigns: [0, 1, 2, 6, 7, 8],
      dualLordship:
        "Scorpio Mars/Ketu; Aquarius Saturn/Rahu; resident co-lord yields to the other",
      secondCycle: "12 minus first-cycle years",
    },
    notice:
      "Structural sign-period boundaries only. No deterministic outcome is inferred.",
  };
}

export function calculateCharaDasha(chart: ChartResult, cycles = 1) {
  const lagna = chart.placements.find((p) => p.name === "Lagna")!.sign,
    forward = lagna % 2 === 0,
    signs = Array.from(
      { length: 12 },
      (_, i) => (lagna + (forward ? i : -i) + 120) % 12,
    ),
    periods: Array<Record<string, unknown>> = [];
  let cursor = chart.engine.julianDay;
  for (let cycle = 1; cycle <= cycles; cycle++)
    for (const sign of signs) {
      const detail = signYears(chart, sign),
        years = cycle === 1 ? detail.years : Math.max(1, 12 - detail.years),
        start = cursor,
        end = cursor + years * YEAR;
      periods.push({
        cycle,
        sign,
        years,
        lord: detail.lord,
        startJulianDay: start,
        endJulianDay: end,
        startIso: jdToIso(start),
        endIso: jdToIso(end),
        evidence: detail,
      });
      cursor = end;
    }
  return {
    schemaVersion: "sahadeva-chara-dasha-1",
    status: "selected-convention-research-preview",
    periods,
    convention: {
      id: "jaimini-lagna-odd-even@1.0.0",
      start: "D1 Lagna",
      sequence: forward
        ? "zodiacal from odd-numbered Lagna"
        : "anti-zodiacal from even-numbered Lagna",
      duration:
        "Sign-to-primary-lord directional count minus one; own sign gives twelve",
      notice:
        "This selected convention remains separate from Narayana progression and other Chara-Dasha schools.",
    },
    notice:
      "Structural sign periods only; interpretive rules remain review-gated.",
  };
}
