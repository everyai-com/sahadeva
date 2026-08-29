import type { ChartResult } from "./schema";
import { jdToIso } from "./dashaCalendar";
import { calculateAshtottariDasha } from "./ashtottari";
import { calculateCharaDasha, calculateNarayanaDasha } from "./rasiDashas";

const DAYS_PER_YEAR = 365.2425;
const YOGINIS = [
  { lord: "Mangala", planet: "Moon", years: 1 },
  { lord: "Pingala", planet: "Sun", years: 2 },
  { lord: "Dhanya", planet: "Jupiter", years: 3 },
  { lord: "Bhramari", planet: "Mars", years: 4 },
  { lord: "Bhadrika", planet: "Mercury", years: 5 },
  { lord: "Ulka", planet: "Saturn", years: 6 },
  { lord: "Siddha", planet: "Venus", years: 7 },
  { lord: "Sankata", planet: "Rahu", years: 8 },
] as const;
const VIMSHOTTARI = [
  { lord: "Ketu", planet: "Ketu", years: 7 },
  { lord: "Venus", planet: "Venus", years: 20 },
  { lord: "Sun", planet: "Sun", years: 6 },
  { lord: "Moon", planet: "Moon", years: 10 },
  { lord: "Mars", planet: "Mars", years: 7 },
  { lord: "Rahu", planet: "Rahu", years: 18 },
  { lord: "Jupiter", planet: "Jupiter", years: 16 },
  { lord: "Saturn", planet: "Saturn", years: 19 },
  { lord: "Mercury", planet: "Mercury", years: 17 },
] as const;
const SIGN_YEARS = [7, 16, 9, 21, 5, 9, 16, 7, 10, 4, 4, 10];
const KALA_TABLES: Record<
  "savya1" | "savya2" | "apasavya1" | "apasavya2",
  number[][]
> = {
  savya1: [
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
    [9, 10, 11, 7, 6, 5, 3, 4, 2],
    [1, 0, 11, 10, 9, 8, 0, 1, 2],
    [3, 4, 5, 6, 7, 8, 9, 10, 11],
  ],
  savya2: [
    [7, 6, 5, 3, 4, 2, 1, 0, 11],
    [10, 9, 8, 0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11, 7, 6, 5],
    [3, 4, 2, 1, 0, 11, 10, 9, 8],
  ],
  apasavya1: [
    [8, 9, 10, 11, 0, 1, 2, 4, 3],
    [5, 6, 7, 11, 10, 9, 8, 7, 6],
    [5, 4, 3, 2, 1, 0, 8, 9, 10],
    [11, 0, 1, 2, 4, 3, 5, 6, 7],
  ],
  apasavya2: [
    [11, 10, 9, 8, 7, 6, 5, 4, 3],
    [2, 1, 0, 8, 9, 10, 11, 0, 1],
    [2, 4, 3, 5, 6, 7, 11, 10, 9],
    [8, 7, 6, 5, 4, 3, 2, 1, 0],
  ],
};
const KALA_GROUPS = {
  savya1: new Set([0, 2, 6, 8, 12, 14, 18, 20, 24]),
  savya2: new Set([1, 7, 13, 19, 26]),
  apasavya1: new Set([3, 9, 15, 21]),
  apasavya2: new Set([4, 5, 10, 11, 16, 17, 22, 23]),
};
type Period = {
  lord: string;
  planet: string;
  startJulianDay: number;
  endJulianDay: number;
  years: number;
  subPeriods?: Period[];
};
function subdivide(
  parent: Period,
  sequence: readonly { lord: string; planet: string; years: number }[],
  totalYears: number,
  depth: number,
): Period[] {
  let cursor = parent.startJulianDay;
  return sequence.map((item) => {
    const duration =
        ((parent.endJulianDay - parent.startJulianDay) * item.years) /
        totalYears,
      p: Period = {
        lord: item.lord,
        planet: item.planet,
        years: duration / DAYS_PER_YEAR,
        startJulianDay: cursor,
        endJulianDay: cursor + duration,
      };
    cursor += duration;
    if (depth > 1) p.subPeriods = subdivide(p, sequence, totalYears, depth - 1);
    return p;
  });
}
export function calculateYoginiDasha(
  chart: ChartResult,
  cycles = 4,
  subdivisionDepth = 2,
) {
  const moon = chart.placements.find((p) => p.name === "Moon")!,
    nakIndex = Math.floor(moon.longitude / (360 / 27)),
    fraction = (moon.longitude % (360 / 27)) / (360 / 27),
    birthIndex = (nakIndex + 3) % 8,
    birth = YOGINIS[birthIndex],
    birthStart =
      chart.engine.julianDay - fraction * birth.years * DAYS_PER_YEAR,
    periods: Period[] = [];
  let cursor = birthStart;
  for (let i = 0; i < cycles * 8; i++) {
    const item = YOGINIS[(birthIndex + i) % 8],
      period: Period = {
        lord: item.lord,
        planet: item.planet,
        years: item.years,
        startJulianDay: cursor,
        endJulianDay: cursor + item.years * DAYS_PER_YEAR,
      };
    period.subPeriods = subdivide(period, YOGINIS, 36, subdivisionDepth);
    periods.push(period);
    cursor = period.endJulianDay;
  }
  return {
    schemaVersion: "sahadeva-yogini-dasha-1",
    status: "structural-research-preview",
    birth: {
      nakshatraIndex: nakIndex,
      yogini: birth.lord,
      planet: birth.planet,
      balanceYears: birth.years * (1 - fraction),
    },
    periods: periods.map((p) => ({
      ...p,
      startIso: jdToIso(p.startJulianDay),
      endIso: jdToIso(p.endJulianDay),
    })),
    convention: {
      cycleYears: 36,
      startRule: "(birth Nakshatra ordinal + 3) modulo 8",
      subdivision: "proportional Yogini years",
      version: "yogini-common-36@1.0.0",
    },
    notice:
      "Boundary calculation only. Interpretive results and lineage variants require reviewed rules.",
  };
}

export function queryVimshottariFiveLevels(
  chart: ChartResult,
  instantIso: string,
) {
  const jd = Date.parse(instantIso) / 86400000 + 2440587.5,
    maha = chart.advanced.vimshottariTimeline.find(
      (p) => jd >= p.startJulianDay && jd < p.endJulianDay,
    ),
    antar = maha?.subPeriods.find(
      (p) => jd >= p.startJulianDay && jd < p.endJulianDay,
    ),
    praty = antar?.pratyantarPeriods.find(
      (p) => jd >= p.startJulianDay && jd < p.endJulianDay,
    );
  if (!maha || !antar || !praty)
    return { status: "outside-timeline", instantIso };
  const ordered = (lord: string) => {
      const i = VIMSHOTTARI.findIndex((x) => x.lord === lord);
      return [...VIMSHOTTARI.slice(i), ...VIMSHOTTARI.slice(0, i)];
    },
    children = (start: number, end: number, parentLord: string) => {
      let cursor = start;
      return ordered(parentLord).map((item) => {
        const duration = ((end - start) * item.years) / 120,
          period = {
            lord: item.lord,
            startJulianDay: cursor,
            endJulianDay: cursor + duration,
          };
        cursor += duration;
        return period;
      });
    },
    sookshma = children(
      praty.startJulianDay,
      praty.endJulianDay,
      praty.lord,
    ).find((p) => jd >= p.startJulianDay && jd < p.endJulianDay)!,
    prana = children(
      sookshma.startJulianDay,
      sookshma.endJulianDay,
      sookshma.lord,
    ).find((p) => jd >= p.startJulianDay && jd < p.endJulianDay)!;
  return {
    status: "computed",
    instantIso,
    levels: {
      mahadasha: maha.lord,
      antardasha: antar.lord,
      pratyantardasha: praty.lord,
      sookshmadasha: sookshma.lord,
      pranadasha: prana.lord,
    },
    boundaries: {
      sookshma: {
        startIso: jdToIso(sookshma.startJulianDay),
        endIso: jdToIso(sookshma.endJulianDay),
      },
      prana: {
        startIso: jdToIso(prana.startJulianDay),
        endIso: jdToIso(prana.endJulianDay),
      },
    },
    convention:
      "Nested proportional Vimshottari sequence begins from each parent lord.",
  };
}

export function calculateKalachakraDasha(chart: ChartResult, padaCycles = 3) {
  const moon = chart.placements.find((p) => p.name === "Moon")!,
    nakSpan = 360 / 27,
    padaSpan = nakSpan / 4,
    nakshatraIndex = Math.floor(moon.longitude / nakSpan),
    pada = Math.floor((moon.longitude % nakSpan) / padaSpan),
    padaFraction = (moon.longitude % padaSpan) / padaSpan,
    group = (Object.entries(KALA_GROUPS).find(([, set]) =>
      set.has(nakshatraIndex),
    )?.[0] || "savya1") as keyof typeof KALA_TABLES,
    table = KALA_TABLES[group],
    birthSequence = [...table[pada]],
    paramayush = birthSequence.reduce((s, sign) => s + SIGN_YEARS[sign], 0),
    elapsed = padaFraction * paramayush;
  let cumulative = 0,
    birthPeriodIndex = 0;
  for (let i = 0; i < 9; i++) {
    if (elapsed < cumulative + SIGN_YEARS[birthSequence[i]]) {
      birthPeriodIndex = i;
      break;
    }
    cumulative += SIGN_YEARS[birthSequence[i]];
  }
  const birthSign = birthSequence[birthPeriodIndex],
    birthPeriodStart =
      chart.engine.julianDay - (elapsed - cumulative) * DAYS_PER_YEAR,
    periods: Array<{
      sign: number;
      years: number;
      startJulianDay: number;
      endJulianDay: number;
      pada: number;
      group: string;
    }> = [];
  let cursor = birthPeriodStart,
    currentPada = pada,
    currentIndex = birthPeriodIndex;
  for (let cycle = 0; cycle < padaCycles * 4 * 9; cycle++) {
    const sequence = table[currentPada],
      sign = sequence[currentIndex],
      years = SIGN_YEARS[sign];
    periods.push({
      sign,
      years,
      startJulianDay: cursor,
      endJulianDay: cursor + years * DAYS_PER_YEAR,
      pada: currentPada + 1,
      group,
    });
    cursor += years * DAYS_PER_YEAR;
    currentIndex++;
    if (currentIndex === 9) {
      currentIndex = 0;
      currentPada = (currentPada + 1) % 4;
    }
  }
  return {
    schemaVersion: "sahadeva-kalachakra-dasha-1",
    status: "structural-research-preview",
    birth: {
      nakshatraIndex,
      pada: pada + 1,
      padaFraction,
      group,
      dehaSign: group.startsWith("savya") ? birthSequence[0] : birthSequence[8],
      jeevaSign: group.startsWith("savya")
        ? birthSequence[8]
        : birthSequence[0],
      paramayush,
      birthSign,
      balanceYears: SIGN_YEARS[birthSign] - (elapsed - cumulative),
    },
    periods: periods.map((p) => ({
      ...p,
      startIso: jdToIso(p.startJulianDay),
      endIso: jdToIso(p.endJulianDay),
    })),
    convention: {
      id: "kalachakra-pvr-table-43-48",
      source: "Vedic Astrology: An Integrated Approach, Tables 43–48",
      signYears: SIGN_YEARS,
    },
    notice:
      "Timing boundaries only. Paramayush is a sequence total and is never interpreted as lifespan.",
  };
}

export function additionalDashaStatus(chart: ChartResult) {
  return {
    schemaVersion: "sahadeva-additional-dashas-2",
    yogini: calculateYoginiDasha(chart),
    ashtottari: calculateAshtottariDasha(chart, "universal"),
    kalachakra: calculateKalachakraDasha(chart),
    chara: calculateCharaDasha(chart),
    narayana: calculateNarayanaDasha(chart),
    precision: {
      vimshottariLevels: ["maha", "antar", "pratyantar", "sookshma", "prana"],
      current: queryVimshottariFiveLevels(chart, new Date().toISOString()),
    },
    notice:
      "Each system carries its own selected convention. Cross-confirmation must preserve disagreement rather than blending timelines.",
  };
}
