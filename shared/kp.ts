import { NAKSHATRAS, SIGNS } from "./constants";
import type { ChartResult, GrahaName } from "./schema";
import { calculateVimshottariTimeline, periodsAt } from "./advanced";
import { jdToIso } from "./dashaCalendar";
import { lahiriLongitudeAt } from "./jyotish";

export const VIMSHOTTARI_LORDS = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
] as const satisfies readonly GrahaName[];
export const VIMSHOTTARI_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17] as const;

const NAKSHATRA_SPAN = 360 / 27;
const EPSILON = 1e-9;
const norm = (value: number) => ((value % 360) + 360) % 360;
const signed = (value: number) => ((value + 540) % 360) - 180;
const radians = (value: number) => value * Math.PI / 180;
const degrees = (value: number) => value * 180 / Math.PI;
const SIGN_LORDS: GrahaName[] = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const NADI_ASPECT_OFFSETS: Partial<Record<GrahaName, number[]>> = {
  Sun: [7], Moon: [7], Mercury: [7], Venus: [7], Mars: [4, 7, 8],
  Jupiter: [5, 7, 9], Saturn: [3, 7, 10], Rahu: [5, 9], Ketu: [5, 9],
};

export const KP_AYANAMSA_CONVENTION = {
  id: "kp-new-from-lahiri-plus-six-minutes",
  version: "1.0.0",
  longitudeCorrectionDegrees: 6 / 60,
  source: "Umang Taneja, Prashna Nadi Astrology, ayanamsa section: add 6′ to Lahiri ascendant and planetary positions",
  maturity: "source-located-unreproduced",
} as const;

export function kpLongitudeFromLahiri(longitude: number) {
  return norm(longitude + KP_AYANAMSA_CONVENTION.longitudeCorrectionDegrees);
}

export function kpAyanamsaFromLahiri(lahiriAyanamsaDegrees: number) {
  return lahiriAyanamsaDegrees - KP_AYANAMSA_CONVENTION.longitudeCorrectionDegrees;
}

export function calculateKpOperatingPeriods(chart: ChartResult) {
  const moon = chart.placements.find((item) => item.name === "Moon")!;
  const kpMoonLongitude = kpLongitudeFromLahiri(moon.longitude);
  const nakshatraIndex = Math.floor(kpMoonLongitude / NAKSHATRA_SPAN) % 27;
  const birthLord = VIMSHOTTARI_LORDS[nakshatraIndex % 9];
  const years = VIMSHOTTARI_YEARS[nakshatraIndex % 9];
  const progress = (kpMoonLongitude % NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
  const balanceYears = years * (1 - progress);
  const timeline = calculateVimshottariTimeline(chart.engine.julianDay, birthLord, balanceYears);
  return {
    kpMoonLongitude,
    nakshatraIndex,
    birthLord,
    balanceYears,
    timeline,
    current: periodsAt(timeline, chart.engine.julianDay),
    convention: "Vimshottari balance and operating periods recalculated from the KP-corrected Moon longitude",
  };
}

export type KpPlacidusCusps = {
  status: "computed-verified" | "unsupported-polar";
  cusps: Array<{ house: number; tropicalLongitude: number; kpSiderealLongitude: number }>;
  convention: string;
  notice: string;
};

/**
 * Computes the time-division (Placidus) cusps used by KP. Intermediate
 * eastern cusps divide the rising-to-culmination semi-arc into thirds;
 * western cusps use the corresponding post-culmination thirds. Opposite
 * cusps are exactly 180 degrees apart. Six independent Swiss Ephemeris
 * vectors lock the numerical implementation to sub-arcsecond tolerance.
 */
export function calculateKpPlacidusCusps(chart: ChartResult): KpPlacidusCusps {
  const jd = chart.engine.julianDay;
  const latitude = chart.input.latitude;
  const longitude = chart.input.longitude;
  const t = (jd - 2451545) / 36525;
  const meanSidereal = norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t);
  const meanEpsilon = 23.439291 - 0.0130042 * t;
  const omega = radians(norm(125.04452 - 1934.136261 * t));
  const solarMeanLongitude = radians(norm(280.4665 + 36000.7698 * t));
  const lunarMeanLongitude = radians(norm(218.3165 + 481267.8813 * t));
  const nutationLongitude = (
    -17.2 * Math.sin(omega)
    - 1.32 * Math.sin(2 * solarMeanLongitude)
    - 0.23 * Math.sin(2 * lunarMeanLongitude)
    + 0.21 * Math.sin(2 * omega)
  ) / 3600;
  const nutationObliquity = (
    9.2 * Math.cos(omega)
    + 0.57 * Math.cos(2 * solarMeanLongitude)
    + 0.1 * Math.cos(2 * lunarMeanLongitude)
    - 0.09 * Math.cos(2 * omega)
  ) / 3600;
  const epsilon = meanEpsilon + nutationObliquity;
  const theta = norm(meanSidereal + nutationLongitude * Math.cos(radians(epsilon)) + longitude);
  const kpAyanamsa = kpAyanamsaFromLahiri(chart.engine.ayanamsaDegrees);
  const thetaRadians = radians(theta);
  const ascTropical = norm(degrees(Math.atan2(
    -Math.cos(thetaRadians),
    Math.sin(thetaRadians) * Math.cos(radians(epsilon)) + Math.tan(radians(latitude)) * Math.sin(radians(epsilon)),
  )) + 180);
  const mcTropical = norm(degrees(Math.atan2(Math.sin(radians(theta)), Math.cos(radians(theta)) * Math.cos(radians(epsilon)))));
  const hourAngleResidual = (lambda: number, fraction: number) => {
    const l = radians(norm(lambda));
    const ra = norm(degrees(Math.atan2(Math.sin(l) * Math.cos(radians(epsilon)), Math.cos(l))));
    const declination = Math.asin(Math.sin(radians(epsilon)) * Math.sin(l));
    const acosInput = -Math.tan(radians(latitude)) * Math.tan(declination);
    if (acosInput < -1 || acosInput > 1) return null;
    const semiArc = degrees(Math.acos(acosInput));
    return signed(theta - ra) - fraction * semiArc;
  };
  const solve = (fraction: number, initial: number) => {
    let lambda = norm(initial);
    for (let iteration = 0; iteration < 30; iteration++) {
      const value = hourAngleResidual(lambda, fraction);
      if (value === null) return null;
      if (Math.abs(value) < 1e-10) return norm(lambda);
      const step = 1e-4;
      const before = hourAngleResidual(lambda - step, fraction);
      const after = hourAngleResidual(lambda + step, fraction);
      if (before === null || after === null) return null;
      const derivative = signed(after - before) / (2 * step);
      if (Math.abs(derivative) < 1e-8) return null;
      lambda = norm(lambda - value / derivative);
    }
    return Math.abs(hourAngleResidual(lambda, fraction) ?? Infinity) < 1e-6 ? lambda : null;
  };
  const forwardArc = (from: number, to: number) => norm(to - from);
  const upperArc = forwardArc(mcTropical, ascTropical);
  const cusp11 = solve(-1 / 3, mcTropical + upperArc / 3);
  const cusp12 = solve(-2 / 3, mcTropical + upperArc * 2 / 3);
  const cusp9 = solve(1 / 3, mcTropical - upperArc / 3);
  const cusp8 = solve(2 / 3, mcTropical - upperArc * 2 / 3);
  if ([cusp8, cusp9, cusp11, cusp12].some((value) => value === null)) return {
    status: "unsupported-polar", cusps: [],
    convention: "Placidus semi-arc time division",
    notice: "One or more Placidus semi-arcs do not exist at this latitude; no substitute house system was used.",
  };
  const tropical = [ascTropical, norm(cusp8! + 180), norm(cusp9! + 180), norm(mcTropical + 180), norm(cusp11! + 180), norm(cusp12! + 180), norm(ascTropical + 180), cusp8!, cusp9!, mcTropical, cusp11!, cusp12!];
  return {
    status: "computed-verified",
    cusps: tropical.map((tropicalLongitude, index) => ({
      house: index + 1,
      tropicalLongitude,
      kpSiderealLongitude: norm(tropicalLongitude - kpAyanamsa),
    })),
    convention: "Placidus semi-arc time division; KP sidereal longitude uses the corpus-specified Lahiri minus 6′ ayanamsa",
    notice: "Validated against six independent Swiss Ephemeris Placidus vectors across 1950–2026, both hemispheres, the equator, and 64° north; maximum allowed fixture error is 0.54 arcseconds.",
  };
}

/** KP Reader VI numbered horary: invert the selected first cusp to local
 * sidereal time, then calculate the remaining Placidus cusps for the latitude. */
export function calculateKpNumberedHoraryCusps(chart: ChartResult, kpSiderealAscendant: number): KpPlacidusCusps {
  const jd = chart.engine.julianDay;
  const latitude = chart.input.latitude;
  const t = (jd - 2451545) / 36525;
  const meanEpsilon = 23.439291 - 0.0130042 * t;
  const omega = radians(norm(125.04452 - 1934.136261 * t));
  const solarMeanLongitude = radians(norm(280.4665 + 36000.7698 * t));
  const lunarMeanLongitude = radians(norm(218.3165 + 481267.8813 * t));
  const nutationLongitude = (-17.2 * Math.sin(omega) - 1.32 * Math.sin(2 * solarMeanLongitude) - 0.23 * Math.sin(2 * lunarMeanLongitude) + 0.21 * Math.sin(2 * omega)) / 3600;
  const nutationObliquity = (9.2 * Math.cos(omega) + 0.57 * Math.cos(2 * solarMeanLongitude) + 0.1 * Math.cos(2 * lunarMeanLongitude) - 0.09 * Math.cos(2 * omega)) / 3600;
  const epsilon = meanEpsilon + nutationObliquity;
  const kpAyanamsa = kpAyanamsaFromLahiri(chart.engine.ayanamsaDegrees);
  const targetTropical = norm(kpSiderealAscendant + kpAyanamsa);
  const ascAt = (theta: number) => {
    const value = radians(theta);
    return norm(degrees(Math.atan2(
      -Math.cos(value),
      Math.sin(value) * Math.cos(radians(epsilon)) + Math.tan(radians(latitude)) * Math.sin(radians(epsilon)),
    )) + 180);
  };
  let theta = 0;
  let best = Infinity;
  for (let candidate = 0; candidate < 360; candidate += 1) {
    const error = Math.abs(signed(ascAt(candidate) - targetTropical));
    if (error < best) { best = error; theta = candidate; }
  }
  for (let iteration = 0; iteration < 20; iteration++) {
    const residual = signed(ascAt(theta) - targetTropical);
    if (Math.abs(residual) < 1e-10) break;
    const step = 1e-4;
    const derivative = signed(ascAt(theta + step) - ascAt(theta - step)) / (2 * step);
    if (Math.abs(derivative) < 1e-8) break;
    theta = norm(theta - residual / derivative);
  }
  const meanSidereal = norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t);
  const apparentGreenwich = norm(meanSidereal + nutationLongitude * Math.cos(radians(epsilon)));
  const result = calculateKpPlacidusCusps({
    ...chart,
    input: { ...chart.input, longitude: signed(theta - apparentGreenwich) },
  });
  if (result.status !== "computed-verified") return result;
  const firstError = Math.abs(signed(result.cusps[0].kpSiderealLongitude - norm(kpSiderealAscendant)));
  if (firstError > 1e-6) throw new Error(`Unable to reproduce numbered-horary ascendant; error ${firstError}°`);
  return {
    ...result,
    convention: `${result.convention}; local sidereal time inverted from the numbered-horary first cusp`,
    notice: "The numbered sub's beginning is the first cusp; the remaining Placidus cusps are calculated for the judgment latitude as prescribed in KP Reader VI.",
  };
}

export type KpSubdivision = {
  starLord: GrahaName;
  subLord: GrahaName;
  subSubLord: GrahaName;
  nakshatraIndex: number;
};

export type NadiHouseSignification = {
  planet: GrahaName;
  occupiedHouse: number;
  ownedHouses: number[];
  signifiedHouses: number[];
  representatives: Array<{ planet: GrahaName; reason: "conjoined" | "aspecting" | "sign-lord" }>;
  sourceSequence: string[];
};

export type KpNodeRepresentative = {
  planet: GrahaName;
  reason: "conjoined" | "star-lord" | "aspecting" | "sign-lord";
  precedence: number;
};

/** KP Reader VI node order; intentionally separate from Taneja's Nadi order. */
export function calculateKpNodeRepresentatives(
  node: "Rahu" | "Ketu",
  placements: Array<{ name: GrahaName; longitude: number; sign: number }>,
): KpNodeRepresentative[] {
  const nodePlacement = placements.find((item) => item.name === node);
  if (!nodePlacement) return [];
  const ordered: KpNodeRepresentative[] = [];
  const add = (planet: GrahaName, reason: KpNodeRepresentative["reason"], precedence: number) => {
    if (planet !== node && !ordered.some((item) => item.planet === planet)) ordered.push({ planet, reason, precedence });
  };
  placements.forEach((other) => {
    if (!["Lagna", "Rahu", "Ketu"].includes(other.name) && other.sign === nodePlacement.sign)
      add(other.name, "conjoined", 1);
  });
  add(detailedSubdivision(nodePlacement.longitude).starLord, "star-lord", 2);
  placements.forEach((other) => {
    if (["Lagna", "Rahu", "Ketu"].includes(other.name)) return;
    const offset = ((nodePlacement.sign - other.sign + 12) % 12) + 1;
    if (NADI_ASPECT_OFFSETS[other.name]?.includes(offset)) add(other.name, "aspecting", 3);
  });
  add(SIGN_LORDS[nodePlacement.sign], "sign-lord", 4);
  return ordered;
}

export const KP_EVENT_HOUSE_RULES = {
  "marriage:first": { required: [2, 7, 11], requiredMode: "all", adverse: [1, 6, 10], locator: "Reader VI, Marriage: houses 2, 7 and 11" },
  "children:birth": { required: [2, 5, 11], requiredMode: "all", adverse: [], locator: "Reader VI, Child Birth: houses 2, 5 and 11" },
  "education:competitive-success": { required: [4, 9, 11], requiredMode: "all", adverse: [], locator: "Reader VI, competitive examination: houses 4, 9 and 11" },
  "education:college-admission-cusp": { cusp: 4, required: [4, 11], requiredMode: "all", adverse: [], locator: "Reader VI, college admission: 4th-cusp sub-lord's constellation lord signifies 4 and 11" },
  "career:employment": { required: [2, 6, 10], requiredMode: "all", adverse: [3, 5, 9], locator: "Reader VI, employment: houses 2, 6 and 10; 3, 5 and 9 negate profession" },
  "career:employment-viswanath": { required: [2, 6, 10, 11], requiredMode: "all", adverse: [], locator: "Viswanath Nair Volume I, Astro Hints—Job: 2 money, 6 duty, 10 profession and 11 gains; conjoined periods of their significators offer employment if the Prashna does not negate" },
  "travel:foreign": { required: [3, 9, 12], requiredMode: "all", adverse: [4], locator: "Reader VI, foreign journey/change of environment: houses 3, 9 and 12; 4 is permanent residence" },
  "travel:foreign-cusp": { cusp: 12, required: [3, 9, 12], requiredMode: "any", adverse: [], locator: "Reader VI, foreign travel: direct 12th-cusp sub-lord must signify either 3, 9 or 12" },
  "litigation:success": { required: [6, 11], requiredMode: "all", adverse: [], locator: "Reader VI, competition/litigation/election success: houses 6 and 11" },
  "litigation:win-cusp": { cusp: 11, required: [2, 6, 11], requiredMode: "any", adverse: [], locator: "Reader VI, win: direct 11th-cusp sub-lord must signify either 2, 6 or 11" },
  "property:sale-cusp": { cusp: 10, required: [3, 10], requiredMode: "any", adverse: [], locator: "Reader VI, sale of property: direct 10th-cusp sub-lord signifies either 3 or 10" },
  "lost-property:recovery": { required: [2, 6, 11], requiredMode: "all", adverse: [5, 8, 12], locator: "Reader VI, Recovery of lost property: 2, 6 and 11; non-recovery 5, 8 and 12" },
  "health:disease": { required: [1, 6], requiredMode: "all", adverse: [], locator: "Reader VI, Health: disease connection through houses 1 and 6" },
  "health:cure": { required: [5, 11], requiredMode: "any", adverse: [6], locator: "Reader VI, Health: cure follows through a significator of 5 or 11 after disease-producing 6" },
} as const;

export type KpEventHouseRuleId = keyof typeof KP_EVENT_HOUSE_RULES;

export function evaluateKpHouseCombination(ruleId: KpEventHouseRuleId, signifiedHouses: number[]) {
  const rule = KP_EVENT_HOUSE_RULES[ruleId];
  const houses = new Set(signifiedHouses);
  const matchedRequired = rule.required.filter((house) => houses.has(house));
  const matchedAdverse = rule.adverse.filter((house) => houses.has(house));
  const requirementMet = rule.requiredMode === "all"
    ? matchedRequired.length === rule.required.length
    : matchedRequired.length > 0;
  return {
    ruleId,
    status: requirementMet
      ? matchedAdverse.length ? "mixed" : "matched"
      : "not-matched",
    requiredMode: rule.requiredMode,
    matchedRequired,
    missingRequired: rule.required.filter((house) => !houses.has(house)),
    matchedAdverse,
    locator: rule.locator,
  } as const;
}

/** Umang Taneja, Prashna Nadi Astrology, node-signification worked procedure. */
export function calculateNadiHouseSignifications(
  placements: Array<{ name: GrahaName; longitude: number; sign: number }>,
  siderealCusps: Array<{ house: number; kpSiderealLongitude: number }>,
): NadiHouseSignification[] {
  if (siderealCusps.length !== 12) return [];
  const forwardArc = (from: number, to: number) => norm(to - from);
  const houseAt = (longitude: number) => {
    for (let index = 0; index < 12; index++) {
      const start = siderealCusps[index].kpSiderealLongitude;
      const end = siderealCusps[(index + 1) % 12].kpSiderealLongitude;
      if (forwardArc(start, longitude) < forwardArc(start, end)) return index + 1;
    }
    return 12;
  };
  const cuspOwned = (planet: GrahaName) => siderealCusps
    .filter((cusp) => SIGN_LORDS[Math.floor(cusp.kpSiderealLongitude / 30)] === planet)
    .map((cusp) => cusp.house);
  const direct = new Map<GrahaName, { occupiedHouse: number; ownedHouses: number[]; houses: number[] }>();
  for (const planet of placements) {
    if (planet.name === "Lagna") continue;
    const occupiedHouse = houseAt(planet.longitude);
    const ownedHouses = ["Rahu", "Ketu"].includes(planet.name) ? [] : cuspOwned(planet.name);
    direct.set(planet.name, { occupiedHouse, ownedHouses, houses: [...new Set([occupiedHouse, ...ownedHouses])].sort((a, b) => a - b) });
  }
  return placements.filter((planet) => planet.name !== "Lagna").map((planet) => {
    const base = direct.get(planet.name)!;
    if (planet.name !== "Rahu" && planet.name !== "Ketu") return {
      planet: planet.name, occupiedHouse: base.occupiedHouse, ownedHouses: base.ownedHouses,
      signifiedHouses: base.houses, representatives: [],
      sourceSequence: ["occupied house", "houses owned by cusp signs"],
    };
    const representatives: NadiHouseSignification["representatives"] = [];
    for (const other of placements) {
      if (["Lagna", "Rahu", "Ketu"].includes(other.name)) continue;
      if (other.sign === planet.sign) representatives.push({ planet: other.name, reason: "conjoined" });
    }
    for (const other of placements) {
      if (["Lagna", "Rahu", "Ketu"].includes(other.name)) continue;
      const offset = ((planet.sign - other.sign + 12) % 12) + 1;
      if (NADI_ASPECT_OFFSETS[other.name]?.includes(offset) && !representatives.some((item) => item.planet === other.name))
        representatives.push({ planet: other.name, reason: "aspecting" });
    }
    const signLord = SIGN_LORDS[planet.sign];
    if (!representatives.some((item) => item.planet === signLord)) representatives.push({ planet: signLord, reason: "sign-lord" });
    const houses = new Set<number>([base.occupiedHouse]);
    representatives.forEach(({ planet: representative }) => direct.get(representative)?.houses.forEach((house) => houses.add(house)));
    return {
      planet: planet.name, occupiedHouse: base.occupiedHouse, ownedHouses: [],
      signifiedHouses: [...houses].sort((a, b) => a - b), representatives,
      sourceSequence: ["conjoined planets", "aspecting planets", "sign lord", "node occupied house"],
    };
  });
}

function cycleFrom(lord: GrahaName) {
  const start = VIMSHOTTARI_LORDS.indexOf(lord as (typeof VIMSHOTTARI_LORDS)[number]);
  return Array.from({ length: 9 }, (_, offset) => (start + offset) % 9);
}

function rulerAt(offset: number, span: number, startLord: GrahaName) {
  let cursor = 0;
  const cycle = cycleFrom(startLord);
  for (const index of cycle) {
    const width = (span * VIMSHOTTARI_YEARS[index]) / 120;
    if (offset < cursor + width - EPSILON || index === cycle[cycle.length - 1]) {
      return { lord: VIMSHOTTARI_LORDS[index], start: cursor, width };
    }
    cursor += width;
  }
  throw new Error("KP subdivision could not be resolved");
}

export function kpSubdivision(longitude: number): KpSubdivision {
  const value = norm(longitude);
  const nakshatraIndex = Math.min(26, Math.floor(value / NAKSHATRA_SPAN));
  const nakshatraStart = nakshatraIndex * NAKSHATRA_SPAN;
  const starLord = VIMSHOTTARI_LORDS[nakshatraIndex % 9];
  const sub = rulerAt(value - nakshatraStart, NAKSHATRA_SPAN, starLord);
  const subSub = rulerAt(value - nakshatraStart - sub.start, sub.width, sub.lord);
  return { starLord, subLord: sub.lord, subSubLord: subSub.lord, nakshatraIndex };
}

function rawSubBoundaries() {
  const boundaries = new Set<number>([0, 360]);
  for (let nakshatraIndex = 0; nakshatraIndex < 27; nakshatraIndex++) {
    const start = nakshatraIndex * NAKSHATRA_SPAN;
    const starLord = VIMSHOTTARI_LORDS[nakshatraIndex % 9];
    let cursor = start;
    boundaries.add(cursor);
    for (const index of cycleFrom(starLord)) {
      cursor += (NAKSHATRA_SPAN * VIMSHOTTARI_YEARS[index]) / 120;
      boundaries.add(cursor);
    }
  }
  for (let sign = 1; sign < 12; sign++) boundaries.add(sign * 30);
  return [...boundaries]
    .map((value) => Math.abs(value - 360) < EPSILON ? 360 : Number(value.toFixed(10)))
    .sort((a, b) => a - b)
    .filter((value, index, values) => index === 0 || Math.abs(value - values[index - 1]) > EPSILON);
}

export const KP_249_SEGMENTS = (() => {
  const boundaries = rawSubBoundaries();
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const midpoint = (start + end) / 2;
    return {
      number: index + 1,
      start,
      end,
      midpoint,
      sign: Math.floor(start / 30),
      ...kpSubdivision(midpoint),
    };
  });
})();

export function kpSeedSegment(seedNumber: number) {
  if (!Number.isInteger(seedNumber) || seedNumber < 1 || seedNumber > KP_249_SEGMENTS.length)
    throw new RangeError(`KP seed must be between 1 and ${KP_249_SEGMENTS.length}`);
  return KP_249_SEGMENTS[seedNumber - 1];
}

function detailedSubdivision(longitude: number) {
  const value = norm(longitude);
  const nakshatraIndex = Math.min(26, Math.floor(value / NAKSHATRA_SPAN));
  const base = nakshatraIndex * NAKSHATRA_SPAN;
  const starLord = VIMSHOTTARI_LORDS[nakshatraIndex % 9];
  const sub = rulerAt(value - base, NAKSHATRA_SPAN, starLord);
  const subSub = rulerAt(value - base - sub.start, sub.width, sub.lord);
  return {
    nakshatra: NAKSHATRAS[nakshatraIndex], nakshatraIndex, starLord,
    subLord: sub.lord, subSubLord: subSub.lord,
    boundaries: {
      sub: { startLongitude: base + sub.start, endLongitude: base + sub.start + sub.width },
      subSub: {
        startLongitude: base + sub.start + subSub.start,
        endLongitude: base + sub.start + subSub.start + subSub.width,
      },
    },
  };
}

export type KpTransitPinningScale = "date" | "day" | "clock-time";

/**
 * Exposes Reader VI's scale-dependent transit evidence without inventing a
 * universal exact-timing threshold that the worked examples do not state.
 */
export function evaluateKpTransitPinning(
  scale: KpTransitPinningScale,
  kpSiderealLongitude: number,
  eligibleLords: readonly GrahaName[],
) {
  const longitude = norm(kpSiderealLongitude);
  const subdivision = detailedSubdivision(longitude);
  const body = scale === "date" ? "Sun" : scale === "day" ? "Moon" : "Lagna";
  const eligible = new Set(eligibleLords);
  const levels = [
    { level: "sign", lord: SIGN_LORDS[Math.floor(longitude / 30)] },
    { level: "star", lord: subdivision.starLord },
    { level: "sub", lord: subdivision.subLord },
    { level: "sub-sub", lord: subdivision.subSubLord },
  ].map((item) => ({ ...item, eligible: eligible.has(item.lord) }));
  return {
    scale,
    body,
    kpSiderealLongitude: longitude,
    levels,
    matchedLevels: levels.filter((item) => item.eligible).map((item) => item.level),
    matchedLords: [...new Set(levels.filter((item) => item.eligible).map((item) => item.lord))],
    status: levels.some((item) => item.eligible) ? "alignment-evidence" as const : "no-alignment" as const,
    decision: "human-or-example-specific-review-required" as const,
    notice: "Reader VI varies the decisive transit pattern by worked example; this evidence must not be promoted to an exact event time by a universal match-count rule.",
  };
}

export type KpTransitRulerLevel = "sign" | "star" | "sub" | "sub-sub";
export type KpTransitRulerPattern = Partial<Record<KpTransitRulerLevel, GrahaName>>;

/** Match only an explicitly source-located ruler pattern; no implicit minimum
 * number of matches is accepted. */
export function matchKpTransitRulerPattern(
  scale: KpTransitPinningScale,
  kpSiderealLongitude: number,
  pattern: KpTransitRulerPattern,
) {
  const expected = Object.entries(pattern) as Array<[KpTransitRulerLevel, GrahaName]>;
  if (!expected.length) throw new RangeError("A KP transit pattern must constrain at least one ruler level");
  const evidence = evaluateKpTransitPinning(scale, kpSiderealLongitude, expected.map(([, lord]) => lord));
  const actual = Object.fromEntries(evidence.levels.map((item) => [item.level, item.lord])) as Record<KpTransitRulerLevel, GrahaName>;
  const checks = expected.map(([level, lord]) => ({ level, expectedLord: lord, actualLord: actual[level], matched: actual[level] === lord }));
  return {
    ...evidence,
    pattern,
    checks,
    status: checks.every((item) => item.matched) ? "pattern-matched" as const : "pattern-not-matched" as const,
    decision: "source-pattern-only" as const,
  };
}

export function searchKpTransitRulerPattern(
  scale: KpTransitPinningScale,
  samples: readonly { julianDay: number; kpSiderealLongitude: number }[],
  pattern: KpTransitRulerPattern,
) {
  const ordered = [...samples].sort((a, b) => a.julianDay - b.julianDay);
  const matches = ordered.flatMap((sample) => {
    const result = matchKpTransitRulerPattern(scale, sample.kpSiderealLongitude, pattern);
    return result.status === "pattern-matched" ? [{ ...sample, result }] : [];
  });
  return {
    scale,
    pattern,
    sampledPoints: ordered.length,
    matches,
    status: matches.length ? "sample-matches-found" as const : "no-sample-match" as const,
    notice: "Search resolution equals the supplied ephemeris sampling resolution; boundary refinement is still required before reporting an exact time.",
  };
}

export function searchKpTransitRulerPatternBetween(
  scale: KpTransitPinningScale,
  startJulianDay: number,
  endJulianDay: number,
  pattern: KpTransitRulerPattern,
  location?: { latitude: number; longitude: number },
  stepMinutes?: number,
) {
  if (!Number.isFinite(startJulianDay) || !Number.isFinite(endJulianDay) || endJulianDay < startJulianDay)
    throw new RangeError("KP transit search requires a finite, ordered Julian-day interval");
  if (scale === "clock-time" && !location) throw new RangeError("Clock-time transit search requires latitude and longitude");
  const resolutionMinutes = stepMinutes ?? (scale === "date" ? 1440 : scale === "day" ? 60 : 1);
  if (!Number.isFinite(resolutionMinutes) || resolutionMinutes <= 0) throw new RangeError("KP transit search resolution must be positive");
  const step = resolutionMinutes / 1440;
  const estimatedPoints = Math.floor((endJulianDay - startJulianDay) / step) + 2;
  if (estimatedPoints > 50_000) throw new RangeError("KP transit search exceeds the 50,000-point audit limit; narrow the period or use a coarser resolution");
  const body: GrahaName = scale === "date" ? "Sun" : scale === "day" ? "Moon" : "Lagna";
  const samples: Array<{ julianDay: number; kpSiderealLongitude: number }> = [];
  for (let jd = startJulianDay; jd <= endJulianDay + EPSILON; jd += step) {
    const at = Math.min(jd, endJulianDay);
    samples.push({
      julianDay: at,
      kpSiderealLongitude: kpLongitudeFromLahiri(lahiriLongitudeAt(body, at, location?.latitude, location?.longitude)),
    });
    if (at === endJulianDay) break;
  }
  const result = searchKpTransitRulerPattern(scale, samples, pattern);
  const isMatchAt = (julianDay: number) => {
    const longitude = kpLongitudeFromLahiri(lahiriLongitudeAt(body, julianDay, location?.latitude, location?.longitude));
    return matchKpTransitRulerPattern(scale, longitude, pattern).status === "pattern-matched";
  };
  const matched = samples.map((sample) =>
    matchKpTransitRulerPattern(scale, sample.kpSiderealLongitude, pattern).status === "pattern-matched");
  const groups: Array<{ first: number; last: number }> = [];
  for (let index = 0; index < matched.length; index++) {
    if (!matched[index]) continue;
    const first = index;
    while (index + 1 < matched.length && matched[index + 1]) index++;
    groups.push({ first, last: index });
  }
  const boundaryToleranceDays = Math.min(step, 1 / 1440);
  const refine = (left: number, right: number, rightIsMatch: boolean) => {
    let lo = left;
    let hi = right;
    while (hi - lo > boundaryToleranceDays) {
      const mid = (lo + hi) / 2;
      if (isMatchAt(mid) === rightIsMatch) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  };
  const windows = groups.map(({ first, last }) => {
    const sampledStartJulianDay = samples[first].julianDay;
    const sampledEndJulianDay = samples[last].julianDay;
    const ingress = first === 0 ? "interval-truncated" as const : "refined" as const;
    const egress = last === samples.length - 1 ? "interval-truncated" as const : "refined" as const;
    const refinedStartJulianDay = first === 0
      ? startJulianDay
      : refine(samples[first - 1].julianDay, sampledStartJulianDay, true);
    const refinedEndJulianDay = last === samples.length - 1
      ? endJulianDay
      : refine(sampledEndJulianDay, samples[last + 1].julianDay, false);
    return {
      sampledStartJulianDay,
      sampledEndJulianDay,
      refinedStartJulianDay,
      refinedEndJulianDay,
      sampledStartIso: jdToIso(sampledStartJulianDay),
      sampledEndIso: jdToIso(sampledEndJulianDay),
      refinedStartIso: jdToIso(refinedStartJulianDay),
      refinedEndIso: jdToIso(refinedEndJulianDay),
      ingress,
      egress,
    };
  });
  return {
    ...result,
    startJulianDay,
    endJulianDay,
    resolutionMinutes,
    boundaryToleranceMinutes: boundaryToleranceDays * 1440,
    windows,
    matches: result.matches.map((item) => ({ ...item, iso: jdToIso(item.julianDay) })),
    astronomy: "Sahadeva VSOP87 apparent Sun / active lunar model / sidereal-time ascendant with mean Lahiri ayanamsa and the corpus-specified KP +6′ longitude correction",
  };
}

export type KpRegisteredTransitPattern = {
  id: string;
  event: string;
  category: "property" | "travel" | "general";
  scale: KpTransitPinningScale;
  pattern: KpTransitRulerPattern;
  locator: string;
  workedInstant: string;
  reproductionStatus: "reproduced" | "astronomy-conflict" | "pending";
  conflictId?: string;
};

/** Exact worked-example patterns only; this is not a universal KP threshold. */
export const KP_EVENT_TRANSIT_PATTERNS: readonly KpRegisteredTransitPattern[] = [
  {
    id: "reader-vi-vehicle-purchase-1974-date", event: "vehicle purchase", category: "property", scale: "date",
    pattern: { sign: "Venus", star: "Mars", sub: "Ketu" },
    locator: "Reader VI, When can I have a vehicle?, 18 October 1974",
    workedInstant: "1974-10-18", reproductionStatus: "astronomy-conflict", conflictId: "reader-vi-vehicle-1974-sun-sub",
  },
  {
    id: "reader-vi-vehicle-disposal-1969-day", event: "vehicle disposal", category: "property", scale: "day",
    pattern: { star: "Moon" },
    locator: "Reader VI, When can I dispose my vehicle?, 23 June 1969: Moon in Hasta",
    workedInstant: "1969-06-23", reproductionStatus: "reproduced",
  },
  {
    id: "reader-vi-vehicle-disposal-1969-clock", event: "vehicle disposal handover", category: "property", scale: "clock-time",
    pattern: { sign: "Venus", star: "Rahu", sub: "Sun" },
    locator: "Reader VI, When can I dispose my vehicle?, 23 June 1969 3:30 PM Bombay",
    workedInstant: "1969-06-23T15:30:00+05:30", reproductionStatus: "reproduced",
  },
  {
    id: "reader-vi-foreign-travel-1971-date", event: "foreign travel", category: "travel", scale: "date",
    pattern: { sign: "Mars", star: "Ketu", sub: "Saturn" },
    locator: "Reader VI, foreign travel, 28 April 1971",
    workedInstant: "1971-04-28", reproductionStatus: "astronomy-conflict", conflictId: "reader-vi-foreign-1971-sun-star",
  },
  {
    id: "reader-vi-medicine-receipt-1969-moon", event: "receipt of medicines", category: "general", scale: "day",
    pattern: { sign: "Venus", star: "Rahu", sub: "Jupiter", "sub-sub": "Venus" },
    locator: "Reader VI, receipt of drugs, 15 September 1969 2:39 PM",
    workedInstant: "1969-09-15T14:39:00+05:30", reproductionStatus: "astronomy-conflict", conflictId: "reader-vi-medicine-1969-moon-sub",
  },
  {
    id: "reader-vi-trunk-call-1969-clock", event: "telephone trunk-call materialisation", category: "general", scale: "clock-time",
    pattern: { sign: "Venus", star: "Jupiter", sub: "Sun", "sub-sub": "Venus" },
    locator: "Reader VI, When Will the Trunk-Call Materialise?, 21 September 1969 9:41 AM, Matale/Kandy example",
    workedInstant: "1969-09-21T09:41:00+05:30", reproductionStatus: "astronomy-conflict", conflictId: "reader-vi-trunk-call-1969-lagna-timing",
  },
  {
    id: "reader-vi-friend-arrival-1969-clock", event: "friend's arrival", category: "general", scale: "clock-time",
    pattern: { sign: "Venus", star: "Moon", sub: "Sun", "sub-sub": "Rahu" },
    locator: "Reader VI, Friends' Arrival!, 9 February 1969, a few seconds before 1:48 PM LST at Bharatiya Vidya Bhavan, Bombay; Taurus 22°50′",
    workedInstant: "1969-02-09T13:48:00+05:30", reproductionStatus: "reproduced",
  },
  {
    id: "reader-vi-messenger-return-1968-clock", event: "cash messenger's return", category: "general", scale: "clock-time",
    pattern: { sign: "Venus", star: "Sun", sub: "Saturn", "sub-sub": "Mercury" },
    locator: "Reader VI, servant/cashier messenger return, 13 December 1968 4:00 PM Madras; printed Taurus 2°30′",
    workedInstant: "1968-12-13T16:00:00+05:30", reproductionStatus: "reproduced", conflictId: "reader-vi-messenger-1968-printed-longitude",
  },
] as const;

export function registeredKpTransitPattern(id: string) {
  const entry = KP_EVENT_TRANSIT_PATTERNS.find((item) => item.id === id);
  if (!entry) throw new RangeError(`Unknown KP event transit pattern: ${id}`);
  return entry;
}

export function matchRegisteredKpTransitPattern(id: string, kpSiderealLongitude: number) {
  const entry = registeredKpTransitPattern(id);
  return { entry, match: matchKpTransitRulerPattern(entry.scale, kpSiderealLongitude, entry.pattern) };
}

export function searchRegisteredKpTransitPatternBetween(
  id: string,
  startJulianDay: number,
  endJulianDay: number,
  location?: { latitude: number; longitude: number },
  stepMinutes?: number,
) {
  const entry = registeredKpTransitPattern(id);
  return {
    entry,
    search: searchKpTransitRulerPatternBetween(entry.scale, startJulianDay, endJulianDay, entry.pattern, location, stepMinutes),
  };
}

const DAY_LORD: Record<string, GrahaName> = {
  Sunday: "Sun", Monday: "Moon", Tuesday: "Mars", Wednesday: "Mercury",
  Thursday: "Jupiter", Friday: "Venus", Saturday: "Saturn",
};

export type KpRulingPlanetCandidate = {
  planet: GrahaName;
  roles: string[];
  includedAsNodeAgentOf: GrahaName[];
  status: "selected" | "rejected-retrograde-star-lord" | "delayed-retrograde";
  starLord: GrahaName;
};

export const KP_SOURCE_CONFLICTS = [
  {
    id: "reader-vi-trunk-call-node-agent-omission",
    generalRuleLocator: "Reader VI, Ruling Planets: include Rahu/Ketu occupying a sign owned by a ruling lord",
    exampleLocator: "Reader VI, 21-9-1969 trunk-call example",
    conflict: "The worked chart places Rahu in Aquarius and Ketu in Leo but its printed ruling-planet list contains Saturn and Sun without their node agents.",
    enginePolicy: "Return the five core roles and rule-driven node agents with role labels; never erase the core lord or silently imitate the example omission.",
  },
  {
    id: "reader-vi-number-203-ayanamsa-ocr",
    generalRuleLocator: "Reader VI, numbered-horary discussion: 1 January 1970 ayanamsa 23°20′",
    exampleLocator: "Reader VI, number 203 cusp construction",
    conflict: "The OCR reads 25°20′ near the example, but the printed Aquarius 16° tropical ascendant and following cusps require 23°20′ when added to Capricorn 22°40′.",
    enginePolicy: "Preserve the OCR discrepancy, use the internally consistent 23°20′ value for this conformance fixture, and do not treat it as independent certification of the modern 6′ correction.",
  },
  {
    id: "reader-vi-vehicle-1974-sun-sub",
    generalRuleLocator: "Reader VI, When can I have a vehicle?: use Sun transit to pinpoint the date",
    exampleLocator: "Reader VI vehicle purchase: 18 October 1974, Venus sign, Mars star, Ketu sub",
    conflict: "Sahadeva's historical KP-corrected sidereal Sun is about Libra 1°06′ on that date: Venus sign and Mars star reproduce, but the sub is Mercury rather than Ketu.",
    enginePolicy: "Retain the printed Ketu-sub claim as source data and the computed Mercury-sub result as astronomy evidence; do not alter the ephemeris or certify the exact date from this example.",
  },
  {
    id: "reader-vi-foreign-1971-sun-star",
    generalRuleLocator: "Reader VI foreign-travel example: use Sun transit to pinpoint the date",
    exampleLocator: "Reader VI foreign travel: 28 April 1971, Aries, Ketu star, Saturn sub",
    conflict: "Sahadeva's historical KP-corrected sidereal Sun is about Aries 13°59′ on that date, already in Venus's Bharani rather than Ketu's Aswini.",
    enginePolicy: "Preserve the printed pattern and computed astronomy separately; do not shift the date or longitude to force reproduction.",
  },
  {
    id: "reader-vi-medicine-1969-moon-sub",
    generalRuleLocator: "Reader VI receipt-of-drugs example: use the Moon when the Sun does not enter a significator star",
    exampleLocator: "Reader VI receipt of medicines: 15 September 1969, 2:39 PM; Libra, Rahu star, Jupiter sub, Venus sub-sub",
    conflict: "At the printed instant Sahadeva's historical KP-corrected Moon reproduces Libra, Rahu star and Venus sub-sub, but occupies Saturn sub rather than Jupiter sub.",
    enginePolicy: "Retain all four printed ruler levels and the computed Saturn-sub mismatch; do not downgrade the exact matcher to three-of-four or move the timestamp to force agreement.",
  },
  {
    id: "reader-vi-trunk-call-1969-lagna-timing",
    generalRuleLocator: "Reader VI, short events within minutes or hours: use transit of the ascendant",
    exampleLocator: "Reader VI trunk-call example: 21 September 1969, 9:41 AM, 7°28′N 80°27′E; printed KP Lagna Libra 29°20′ in Venus sign, Jupiter star, Sun sub, Venus sub-sub",
    conflict: "The printed longitude itself reproduces all four ruler levels. At the printed civil instant Sahadeva obtains KP-corrected Libra 29°36′55″: sign and star reproduce, but Moon sub and Rahu sub-sub replace the printed Sun and Venus. The engine's matching window is approximately 9:39:52–9:40:22 AM local, ending before 9:41.",
    enginePolicy: "Preserve the exact printed longitude, time, location and computed window separately; do not alter timezone, ayanamsa, ascendant geometry or match threshold to force the claimed minute.",
  },
  {
    id: "reader-vi-messenger-1968-printed-longitude",
    generalRuleLocator: "Reader VI, minor events within hours: use the ascendant position governed by ruling planets",
    exampleLocator: "Reader VI cash-messenger example: 13 December 1968 4:00 PM Madras; Venus sign, Sun star, Saturn sub, Mercury sub-sub; printed Taurus 2°30′",
    conflict: "The stated 4:00 PM civil instant reproduces all four rulers and lies inside the calculated window. The separately printed Taurus 2°30′ does not: under the installed KP subdivision it is Jupiter sub and Moon sub-sub rather than Saturn and Mercury.",
    enginePolicy: "Retain the successful civil-time reproduction and the printed-longitude mismatch independently; do not move subdivision boundaries or discard the conflicting coordinate.",
  },
] as const;

/** KP Reader VI, “Ruling Planets”, including node agents and retrograde filters. */
export function calculateKpRulingPlanets(
  placements: Array<{ name: GrahaName; longitude: number; sign: number; retrograde?: boolean }>,
  vara: string,
): KpRulingPlanetCandidate[] {
  const lagna = placements.find((item) => item.name === "Lagna")!;
  const moon = placements.find((item) => item.name === "Moon")!;
  const lagnaLevels = detailedSubdivision(lagna.longitude);
  const moonLevels = detailedSubdivision(moon.longitude);
  const roles: Array<{ role: string; planet: GrahaName }> = [
    { role: "Day lord", planet: DAY_LORD[vara] },
    { role: "Lagna star lord", planet: lagnaLevels.starLord },
    { role: "Lagna sign lord", planet: SIGN_LORDS[lagna.sign] },
    { role: "Moon star lord", planet: moonLevels.starLord },
    { role: "Moon sign lord", planet: SIGN_LORDS[moon.sign] },
  ];
  const candidates = new Map<GrahaName, { roles: string[]; agents: GrahaName[] }>();
  const add = (planet: GrahaName, role: string, agentOf?: GrahaName) => {
    const row = candidates.get(planet) ?? { roles: [], agents: [] };
    if (!row.roles.includes(role)) row.roles.push(role);
    if (agentOf && !row.agents.includes(agentOf)) row.agents.push(agentOf);
    candidates.set(planet, row);
  };
  for (const role of roles) {
    add(role.planet, role.role);
    for (const node of placements.filter((item) => item.name === "Rahu" || item.name === "Ketu"))
      if (SIGN_LORDS[node.sign] === role.planet) add(node.name, `${role.role} node agent`, role.planet);
  }
  return [...candidates].map(([planet, evidence]) => {
    const placement = placements.find((item) => item.name === planet)!;
    const starLord = detailedSubdivision(placement.longitude).starLord;
    const starLordPlacement = placements.find((item) => item.name === starLord);
    const starLordRetrograde = !["Sun", "Moon", "Rahu", "Ketu"].includes(starLord) && Boolean(starLordPlacement?.retrograde);
    const candidateRetrograde = !["Sun", "Moon", "Rahu", "Ketu"].includes(planet) && Boolean(placement.retrograde);
    return {
      planet,
      roles: evidence.roles,
      includedAsNodeAgentOf: evidence.agents,
      status: starLordRetrograde ? "rejected-retrograde-star-lord" : candidateRetrograde ? "delayed-retrograde" : "selected",
      starLord,
    };
  });
}

/** Existing public KP chart preview, retained while sharing the same subdivision core as horary. */
export function calculateKpPreview(chart: ChartResult, seedNumber?: number) {
  const seed = seedNumber === undefined ? null : kpSeedSegment(seedNumber);
  const placidus = seed
    ? calculateKpNumberedHoraryCusps(chart, seed.start)
    : calculateKpPlacidusCusps(chart);
  const kpPlacements = chart.placements.map((item) => {
    const longitude = item.name === "Lagna" && placidus.status === "computed-verified"
      ? placidus.cusps[0].kpSiderealLongitude
      : kpLongitudeFromLahiri(item.longitude);
    return { ...item, longitude, sign: Math.floor(longitude / 30), degree: longitude % 30 };
  });
  const lagna = kpPlacements.find((item) => item.name === "Lagna")!;
  const moon = kpPlacements.find((item) => item.name === "Moon")!;
  const planetRows = kpPlacements.map((item) => ({
    name: item.name, longitude: item.longitude, sign: item.sign,
    signName: SIGNS[item.sign], degree: item.degree, retrograde: Boolean(item.retrograde),
    ...detailedSubdivision(item.longitude),
  }));
  const byName = new Map(planetRows.map((item) => [item.name, item]));
  const nadiHouseSignifications = calculateNadiHouseSignifications(kpPlacements, placidus.cusps);
  const nadiByName = new Map(nadiHouseSignifications.map((item) => [item.planet, item]));
  const houseOf = (name: GrahaName) => nadiByName.get(name)?.occupiedHouse ?? null;
  const ownedHouses = (name: GrahaName) => nadiByName.get(name)?.ownedHouses ?? [];
  const basePortfolio = (name: GrahaName) => {
    const row = nadiByName.get(name);
    return row ? [...new Set([row.occupiedHouse, ...row.ownedHouses])] : [];
  };
  const kpPortfolio = (name: GrahaName) => {
    const result = new Set(basePortfolio(name));
    const placement = kpPlacements.find((item) => item.name === name);
    if (!placement) return [];
    if (name === "Rahu" || name === "Ketu") {
      calculateKpNodeRepresentatives(name, kpPlacements).forEach(({ planet }) =>
        basePortfolio(planet).forEach((house) => result.add(house)),
      );
    } else {
      const starLord = detailedSubdivision(placement.longitude).starLord;
      if (starLord === "Rahu" || starLord === "Ketu") {
        basePortfolio(starLord).forEach((house) => result.add(house));
        calculateKpNodeRepresentatives(starLord, kpPlacements).forEach(({ planet }) =>
          basePortfolio(planet).forEach((house) => result.add(house)),
        );
      } else basePortfolio(starLord).forEach((house) => result.add(house));
    }
    return [...result].sort((a, b) => a - b);
  };
  const significators = planetRows.filter((item) => item.name !== "Lagna").map((item) => {
    const star = byName.get(item.starLord)!;
    return {
      planet: item.name, occupiedHouse: houseOf(item.name), ownedHouses: ownedHouses(item.name),
      signifiedHouses: kpPortfolio(item.name),
      starLord: item.starLord, starLordOccupiedHouse: houseOf(item.starLord),
      starLordOwnedHouses: ownedHouses(item.starLord), subLord: item.subLord,
      evidenceOrder: [
        `Star lord ${item.starLord}: occupies ${houseOf(item.starLord)}, owns ${ownedHouses(item.starLord).join(",") || "none"}`,
        `${item.name}: occupies ${houseOf(item.name)}, owns ${ownedHouses(item.name).join(",") || "none"}`,
        `Sub lord ${item.subLord} qualifies delivery`,
      ],
      starLongitude: star.longitude,
    };
  });
  const cuspValues = placidus.cusps.map((cusp) => ({ ...cusp, ...detailedSubdivision(cusp.kpSiderealLongitude) }));
  const cuspalEventEvaluations = (Object.entries(KP_EVENT_HOUSE_RULES) as Array<[KpEventHouseRuleId, (typeof KP_EVENT_HOUSE_RULES)[KpEventHouseRuleId]]>)
    .flatMap(([ruleId, rule]) => {
      if (!("cusp" in rule)) return [];
      const cuspNumber = rule.cusp;
      const cusp = cuspValues.find((item) => item.house === cuspNumber)!;
      const subLordPlacement = kpPlacements.find((item) => item.name === cusp.subLord)!;
      const subLordStarLord = detailedSubdivision(subLordPlacement.longitude).starLord;
      const starLordPlacement = kpPlacements.find((item) => item.name === subLordStarLord);
      const subLordRetrograde = !["Sun", "Moon", "Rahu", "Ketu"].includes(cusp.subLord) && Boolean(subLordPlacement.retrograde);
      const starLordRetrograde = !["Sun", "Moon", "Rahu", "Ketu"].includes(subLordStarLord) && Boolean(starLordPlacement?.retrograde);
      return [{
        cusp: cuspNumber,
        cuspSubLord: cusp.subLord,
        cuspSubLordStarLord: subLordStarLord,
        retrogradeGate: subLordRetrograde ? "blocked-sub-lord-retrograde" : starLordRetrograde ? "blocked-star-lord-retrograde" : "clear",
        evaluation: evaluateKpHouseCombination(ruleId, kpPortfolio(cusp.subLord)),
      }];
    });
  const rulingPlanets = calculateKpRulingPlanets(kpPlacements, chart.panchanga.vara);
  const operatingPeriods = calculateKpOperatingPeriods(chart);
  return {
    schemaVersion: "sahadeva-kp-preview-1", status: "partial-research-preview",
    certification: {
      status: "structural-preview",
      cuspMath: "reference-checked-6-vectors-max-error-0.54-arcsec",
      ayanamsaMaturity: KP_AYANAMSA_CONVENTION.maturity,
      systemCertification: "pending-independent-certification",
      reviewStatus: "draft-unreviewed",
      notice: "Placidus cusp math is cross-checked against six reference vectors in tests; the KP ayanamsa, rulers, significators and event logic are not independently certified and must never be presented as certain.",
    },
    subject: { name: chart.input.name, place: chart.input.place },
    zodiac: {
      positions: "KP sidereal positions derived by adding 6′ to Sahadeva's Lahiri longitudes",
      requestedConvention: "KP New Ayanamsa",
      kpAyanamsa: {
        status: "source-located-unreproduced",
        degrees: kpAyanamsaFromLahiri(chart.engine.ayanamsaDegrees),
        convention: KP_AYANAMSA_CONVENTION,
        notice: "The corpus-specified 6′ Lahiri correction is implemented; Reader VI example reproduction is still required for certification.",
      },
    },
    cusps: {
      ...placidus,
      values: cuspValues,
      requiredSystem: "Placidus",
    },
    planets: planetRows, rulingPlanets, significators, operatingPeriods,
    prashnaNadiHouseSignifications: {
      status: placidus.status === "computed-verified" ? "computed-source-located" : "unavailable",
      values: nadiHouseSignifications,
      convention: "Taneja sequence for nodes: conjoined planets, aspecting planets, sign lord, then occupied house; ordinary planets expose occupied and cusp-sign-owned houses.",
      source: "Umang Taneja, Prashna Nadi Astrology, node house-coordinate procedure and worked Rahu/Ketu example",
    },
    kpNodeRepresentatives: {
      status: "computed-source-located",
      values: (["Rahu", "Ketu"] as const).map((node) => ({ node, representatives: calculateKpNodeRepresentatives(node, kpPlacements) })),
      convention: "KP Reader VI order: conjoined planets, node's star lord, aspecting planets, sign lord; duplicate planets retain their earliest/strongest precedence.",
    },
    cuspalEventEvaluations: {
      status: placidus.status === "computed-verified" ? "computed-source-located" : "unavailable",
      values: cuspalEventEvaluations,
      notice: "These are explicit cuspal predicates only. A clear static match is not converted into timing or certainty without the source's period and transit conditions.",
    },
    transitPinning: {
      status: "source-pattern-search-available",
      scaleBodies: { date: "Sun", day: "Moon", "clock-time": "Lagna" },
      rulerLevels: ["sign", "star", "sub", "sub-sub"] as const,
      registeredPatterns: KP_EVENT_TRANSIT_PATTERNS.map((item) => ({
        id: item.id, event: item.event, category: item.category, scale: item.scale,
        reproductionStatus: item.reproductionStatus, conflictId: item.conflictId ?? null,
      })),
      astronomyConflicts: KP_SOURCE_CONFLICTS.filter((conflict) =>
        KP_EVENT_TRANSIT_PATTERNS.some((pattern) => pattern.conflictId === conflict.id)),
      notice: "Bounded ephemeris search is available only for an explicit ruler pattern. The preview does not infer a universal pattern or exact event time from overlap alone.",
    },
    sourceConflicts: KP_SOURCE_CONFLICTS,
    horary: {
      status: "partial",
      seedSegments: KP_249_SEGMENTS.length,
      selectedSeed: seed,
      ascendantAnchor: seed ? "beginning-of-selected-sub" : "question-time-ascendant",
      notice: seed
        ? "The numbered sub beginning fixes cusp 1 and the other Placidus cusps are calculated for the judgment latitude."
        : "No horary seed was supplied; cusps use the question-time ascendant.",
    },
    rulebook: { id: "sahadeva-kp-structural-preview", version: "0.2.0", reviewStatus: "draft-unreviewed", sourceKeys: [] },
    safety: { status: "research-preview", notice: "Star/sub-lord subdivision is deterministic, but this is not a complete KP judgment. No event is promised." },
  };
}

export function calculateKpOperatingPeriodActivation(
  chart: ChartResult,
  preview: ReturnType<typeof calculateKpPreview>,
  ruleId: KpEventHouseRuleId,
) {
  const rule = KP_EVENT_HOUSE_RULES[ruleId];
  const periodValues = [
    ["dasa", preview.operatingPeriods.current.mahadasha],
    ["bhukti", preview.operatingPeriods.current.antardasha],
    ["antara", preview.operatingPeriods.current.pratyantardasha],
  ] as const;
  const levels = periodValues.map(([level, value]) => {
    const planet = value as GrahaName | null;
    const significator = planet ? preview.significators.find((item) => item.planet === planet) : null;
    const placement = planet ? preview.planets.find((item) => item.name === planet) : null;
    const starLordPlacement = placement ? preview.planets.find((item) => item.name === placement.starLord) : null;
    const planetRetrograde = planet && !["Sun", "Moon", "Rahu", "Ketu"].includes(planet) && Boolean(placement?.retrograde);
    const starLordRetrograde = placement
      && !["Sun", "Moon", "Rahu", "Ketu"].includes(placement.starLord)
      && Boolean(starLordPlacement?.retrograde);
    const houses = significator?.signifiedHouses ?? [];
    return {
      level,
      planet,
      houses,
      contributesRequired: rule.required.some((house) => houses.includes(house)),
      matchedAdverse: rule.adverse.filter((house) => houses.includes(house)),
      retrogradeGate: starLordRetrograde
        ? "blocked-star-lord-retrograde" as const
        : planetRetrograde
          ? "delayed-period-lord-retrograde" as const
          : "clear" as const,
    };
  });
  const combinedHouses = [...new Set(levels.flatMap((item) => item.houses))].sort((a, b) => a - b);
  const combinedEvaluation = evaluateKpHouseCombination(ruleId, combinedHouses);
  const complete = levels.every((item) => item.planet && item.contributesRequired);
  const blocked = levels.some((item) => item.retrogradeGate === "blocked-star-lord-retrograde");
  return {
    ruleId,
    levels,
    combinedHouses,
    combinedEvaluation,
    status: blocked
      ? "blocked-retrograde-star-lord" as const
      : complete && combinedEvaluation.status !== "not-matched"
        ? combinedEvaluation.status === "mixed" ? "active-mixed" as const : "active-candidate" as const
        : "not-active" as const,
    timingStatus: "current-period-structure-only" as const,
    notice: "The operating Dasa-Bhukti-Antara portfolios are evaluated collectively. This does not search or promise a future event date.",
  };
}

export function calculateKpConjoinedPeriodCandidates(
  preview: ReturnType<typeof calculateKpPreview>,
  ruleId: KpEventHouseRuleId,
  fromJulianDay: number,
) {
  const rule = KP_EVENT_HOUSE_RULES[ruleId];
  const ruling = new Set(preview.rulingPlanets
    .filter((item) => item.status !== "rejected-retrograde-star-lord")
    .map((item) => item.planet));
  const levelFor = (level: "dasa" | "bhukti" | "antara", planet: GrahaName) => {
    const significator = preview.significators.find((item) => item.planet === planet);
    const placement = preview.planets.find((item) => item.name === planet)!;
    const starLordPlacement = preview.planets.find((item) => item.name === placement.starLord);
    const starLordRetrograde = !["Sun", "Moon", "Rahu", "Ketu"].includes(placement.starLord)
      && Boolean(starLordPlacement?.retrograde);
    const planetRetrograde = !["Sun", "Moon", "Rahu", "Ketu"].includes(planet) && Boolean(placement.retrograde);
    const houses = significator?.signifiedHouses ?? [];
    return {
      level, planet, houses,
      isRulingPlanet: ruling.has(planet),
      contributesRequired: rule.required.some((house) => houses.includes(house)),
      retrogradeGate: starLordRetrograde
        ? "blocked-star-lord-retrograde" as const
        : planetRetrograde
          ? "delayed-period-lord-retrograde" as const
          : "clear" as const,
    };
  };
  const candidates = preview.operatingPeriods.timeline.flatMap((maha) => maha.subPeriods.flatMap((bhukti) =>
    bhukti.pratyantarPeriods.flatMap((antara) => {
      if (antara.endJulianDay <= fromJulianDay) return [];
      const levels = [
        levelFor("dasa", maha.lord as GrahaName),
        levelFor("bhukti", bhukti.lord as GrahaName),
        levelFor("antara", antara.lord as GrahaName),
      ];
      if (!levels.every((item) => item.isRulingPlanet && item.contributesRequired)) return [];
      if (levels.some((item) => item.retrogradeGate === "blocked-star-lord-retrograde")) return [];
      const combinedHouses = [...new Set(levels.flatMap((item) => item.houses))].sort((a, b) => a - b);
      const evaluation = evaluateKpHouseCombination(ruleId, combinedHouses);
      if (evaluation.status === "not-matched") return [];
      const startJulianDay = Math.max(fromJulianDay, antara.startJulianDay);
      return [{
        ruleId,
        lords: { dasa: maha.lord as GrahaName, bhukti: bhukti.lord as GrahaName, antara: antara.lord as GrahaName },
        levels,
        combinedHouses,
        evaluation,
        startJulianDay,
        endJulianDay: antara.endJulianDay,
        startIso: jdToIso(startJulianDay),
        endIso: jdToIso(antara.endJulianDay),
        status: levels.some((item) => item.retrogradeGate === "delayed-period-lord-retrograde")
          ? "candidate-delayed" as const
          : evaluation.status === "mixed" ? "candidate-mixed" as const : "candidate" as const,
        transitPinning: "required" as const,
      }];
    }),
  ));
  return {
    ruleId,
    rulingPlanets: [...ruling],
    candidates,
    status: candidates.length ? "period-candidates-found" as const : "no-conjoined-period-candidate" as const,
    notice: "These are broad conjoined Dasa-Bhukti-Antara candidates common to ruling planets and event significators. Reader VI still requires transit to pinpoint fructification.",
  };
}
