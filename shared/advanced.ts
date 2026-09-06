import type { GrahaName, Placement } from "./schema";

const norm = (n: number) => ((n % 360) + 360) % 360;
const LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const EXALTATION: Partial<Record<GrahaName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBILITATION: Partial<Record<GrahaName, number>> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const OWN_SIGNS: Partial<Record<GrahaName, number[]>> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
const COMBUST_ORB: Partial<Record<GrahaName, { direct: number; retrograde: number }>> = { Moon: { direct: 12, retrograde: 12 }, Mars: { direct: 17, retrograde: 17 }, Mercury: { direct: 14, retrograde: 12 }, Jupiter: { direct: 11, retrograde: 11 }, Venus: { direct: 10, retrograde: 8 }, Saturn: { direct: 15, retrograde: 15 } };
const DASHA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];
const DAYS_PER_DASHA_YEAR = 365.2425;

function angularDistance(a: number, b: number) { const d = Math.abs(norm(a - b)); return Math.min(d, 360 - d); }

function signAndDegree(longitude: number) {
  const value = norm(longitude);
  return { sign: Math.floor(value / 30), degree: value % 30 };
}

function sequentialVarga(longitude: number, division: number, start: (sign: number) => number) {
  const { sign, degree } = signAndDegree(longitude);
  const part = Math.min(division - 1, Math.floor(degree / (30 / division)));
  return (start(sign) + part) % 12;
}

function navamsa(longitude: number) { return Math.floor(norm(longitude * 9) / 30); }
function hora(longitude: number) {
  const { sign, degree } = signAndDegree(longitude);
  const firstHalf = degree < 15;
  return sign % 2 === 0 ? (firstHalf ? 4 : 3) : (firstHalf ? 3 : 4);
}
function drekkana(longitude: number) { const sign = Math.floor(norm(longitude) / 30); const part = Math.floor((norm(longitude) % 30) / 10); return (sign + part * 4) % 12; }
function chaturthamsa(longitude: number) { return sequentialVarga(longitude, 4, (sign) => sign); }
function saptamsa(longitude: number) { const sign = Math.floor(norm(longitude) / 30); const part = Math.floor((norm(longitude) % 30) / (30 / 7)); return (part + (sign % 2 === 0 ? sign : sign + 6)) % 12; }
function dasamsa(longitude: number) { const sign = Math.floor(norm(longitude) / 30); const part = Math.floor((norm(longitude) % 30) / 3); return (part + (sign % 2 === 0 ? sign : sign + 8)) % 12; }
function dwadasamsa(longitude: number) { const sign = Math.floor(norm(longitude) / 30); const part = Math.floor((norm(longitude) % 30) / 2.5); return (sign + part) % 12; }
function shodasamsa(longitude: number) { return sequentialVarga(longitude, 16, (sign) => [0, 4, 8][sign % 3]); }
function vimshamsa(longitude: number) { return sequentialVarga(longitude, 20, (sign) => [0, 8, 4][sign % 3]); }
function chaturvimshamsa(longitude: number) { return sequentialVarga(longitude, 24, (sign) => sign % 2 === 0 ? 4 : 3); }
function saptavimshamsa(longitude: number) { return sequentialVarga(longitude, 27, (sign) => [0, 3, 6, 9][sign % 4]); }
function trimsamsa(longitude: number) {
  const { sign, degree } = signAndDegree(longitude);
  if (sign % 2 === 0) {
    if (degree < 5) return 0;
    if (degree < 10) return 10;
    if (degree < 18) return 8;
    if (degree < 25) return 2;
    return 6;
  }
  if (degree < 5) return 1;
  if (degree < 12) return 5;
  if (degree < 20) return 11;
  if (degree < 25) return 9;
  return 7;
}
function khavedamsa(longitude: number) { return sequentialVarga(longitude, 40, (sign) => sign % 2 === 0 ? 0 : 6); }
function akshavedamsa(longitude: number) { return sequentialVarga(longitude, 45, (sign) => [0, 4, 8][sign % 3]); }
function shashtiamsa(longitude: number) { return Math.floor(norm(longitude * 60) / 30); }

export function calculateVargas(placements: Placement[]) {
  const map = (fn: (longitude: number) => number) => placements.map((p) => ({ name: p.name, sign: fn(p.longitude) }));
  return {
    D1: placements.map((p) => ({ name: p.name, sign: p.sign })),
    D2: map(hora), D3: map(drekkana), D4: map(chaturthamsa), D7: map(saptamsa),
    D9: map(navamsa), D10: map(dasamsa), D12: map(dwadasamsa), D16: map(shodasamsa),
    D20: map(vimshamsa), D24: map(chaturvimshamsa), D27: map(saptavimshamsa),
    D30: map(trimsamsa), D40: map(khavedamsa), D45: map(akshavedamsa), D60: map(shashtiamsa),
  };
}

export function calculateDignities(placements: Placement[]) {
  const sun = placements.find((p) => p.name === "Sun")!;
  return placements.map((p) => {
    let dignity = "neutral";
    if (EXALTATION[p.name] === p.sign) dignity = "exalted";
    else if (DEBILITATION[p.name] === p.sign) dignity = "debilitated";
    else if (OWN_SIGNS[p.name]?.includes(p.sign)) dignity = "own-sign";
    const orb = COMBUST_ORB[p.name];
    const activeOrb = orb?.[p.retrograde ? "retrograde" : "direct"];
    return { name: p.name, sign: p.sign, signLord: LORDS[p.sign], dignity, combust: activeOrb !== undefined && angularDistance(p.longitude, sun.longitude) <= activeOrb };
  });
}

export function calculateAspects(placements: Placement[]) {
  const aspects: Array<{ from: GrahaName; to: GrahaName; kind: string; separation: number }> = [];
  const special: Partial<Record<GrahaName, number[]>> = { Mars: [4, 8], Jupiter: [5, 9], Saturn: [3, 10] };
  for (const from of placements) for (const to of placements) {
    if (from === to || from.name === "Lagna") continue;
    const houseDistance = ((to.sign - from.sign + 12) % 12) + 1;
    const houses = [7, ...(special[from.name] || [])];
    if (houses.includes(houseDistance)) aspects.push({ from: from.name, to: to.name, kind: `${houseDistance}th-house graha drishti`, separation: angularDistance(from.longitude, to.longitude) });
  }
  return aspects;
}

// Explicit planet-to-house Graha Drishti matrix (whole-sign, from Lagna).
// Additive public evidence: every classical planet lists the whole-sign
// houses it aspects (7th + Mars 4/8, Jupiter 5/9, Saturn 3/10 from its own
// sign, plus its occupied house by conjunction). Rahu/Ketu cast no classical
// Parashari drishti; only their occupied house is listed, with the method
// stated so clients never mistake absence for a missing calculation.
export function calculatePlanetHouseAspectMatrix(placements: Placement[]) {
  const lagna = placements.find((p) => p.name === "Lagna");
  const lagnaSign = lagna?.sign ?? 0;
  const specialOffsets: Partial<Record<string, number[]>> = {
    Mars: [3, 6, 7],
    Jupiter: [4, 6, 8],
    Saturn: [2, 6, 9],
  };
  const classical = new Set([
    "Sun",
    "Moon",
    "Mars",
    "Mercury",
    "Jupiter",
    "Venus",
    "Saturn",
  ]);
  const rows = placements
    .filter((p) => p.name !== "Lagna")
    .map((p) => {
      const occupiedHouse = ((p.sign - lagnaSign + 12) % 12) + 1;
      if (!classical.has(p.name))
        return {
          planet: p.name,
          occupiedHouse,
          aspectedHouses: [occupiedHouse],
          classicalDrishti: false,
        };
      const offsets = specialOffsets[p.name] ?? [6];
      const aspectedHouses = [
        occupiedHouse,
        ...offsets.map((off) => ((p.sign + off - lagnaSign + 24) % 12) + 1),
      ];
      return {
        planet: p.name,
        occupiedHouse,
        aspectedHouses: [...new Set(aspectedHouses)].sort((a, b) => a - b),
        classicalDrishti: true,
      };
    });
  return {
    system: "whole-sign",
    method:
      "Parashari Graha Drishti: all aspect 7th from own sign; Mars adds 4th/8th, Jupiter 5th/9th, Saturn 3rd/10th; Rahu/Ketu conjunction only",
    houses: rows,
  };
}

export function calculateVimshottariTimeline(jd: number, birthLord: string, balanceYears: number) {
  const startIndex = DASHA_LORDS.indexOf(birthLord);
  let cursor = jd - (DASHA_YEARS[startIndex] - balanceYears) * DAYS_PER_DASHA_YEAR;
  return Array.from({ length: 9 }, (_, order) => {
    const index = (startIndex + order) % 9;
    const years = DASHA_YEARS[index];
    const startJulianDay = cursor, endJulianDay = cursor + years * DAYS_PER_DASHA_YEAR;
    let subCursor = startJulianDay;
    const subStart = index;
    const subPeriods = Array.from({ length: 9 }, (_, subOrder) => {
      const subIndex = (subStart + subOrder) % 9;
      const duration = years * DASHA_YEARS[subIndex] / 120 * DAYS_PER_DASHA_YEAR;
      const subStartJulianDay = subCursor, subEndJulianDay = subCursor + duration;
      let pratyCursor = subStartJulianDay;
      const pratyantarPeriods = Array.from({ length: 9 }, (_, pratyOrder) => {
        const pratyIndex = (subIndex + pratyOrder) % 9;
        const pratyDuration = duration * DASHA_YEARS[pratyIndex] / 120;
        const period = { lord: DASHA_LORDS[pratyIndex], startJulianDay: pratyCursor, endJulianDay: pratyCursor + pratyDuration };
        pratyCursor += pratyDuration;
        return period;
      });
      const period = { lord: DASHA_LORDS[subIndex], startJulianDay: subStartJulianDay, endJulianDay: subEndJulianDay, pratyantarPeriods };
      subCursor += duration;
      return period;
    });
    cursor = endJulianDay;
    return { lord: DASHA_LORDS[index], startJulianDay, endJulianDay, subPeriods };
  });
}

export function periodsAt(timeline: ReturnType<typeof calculateVimshottariTimeline>, jd: number) {
  const mahadasha = timeline.find((period) => jd >= period.startJulianDay && jd < period.endJulianDay);
  const antardasha = mahadasha?.subPeriods.find((period) => jd >= period.startJulianDay && jd < period.endJulianDay);
  const pratyantardasha = antardasha?.pratyantarPeriods.find((period) => jd >= period.startJulianDay && jd < period.endJulianDay);
  return { mahadasha: mahadasha?.lord || null, antardasha: antardasha?.lord || null, pratyantardasha: pratyantardasha?.lord || null };
}

export function boundaryWarnings(placements: Placement[], birthTimeMinutes = 5) {
  const warnings: string[] = [];
  for (const p of placements) {
    const signEdge = Math.min(p.degree, 30 - p.degree);
    const nakOffset = p.longitude % (360 / 27);
    const nakEdge = Math.min(nakOffset, 360 / 27 - nakOffset);
    if (signEdge < 0.25) warnings.push(`${p.name} is within 0.25 degrees of a rashi boundary.`);
    if (nakEdge < 0.1) warnings.push(`${p.name} is within 0.10 degrees of a nakshatra boundary.`);
  }
  return { birthTimeMinutes, boundaryWarnings: warnings };
}
