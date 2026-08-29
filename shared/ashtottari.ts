import type { ChartResult } from "./schema";
import { jdToIso } from "./dashaCalendar";
const YEAR = 365.2425,
  SEQUENCE = [
    { lord: "Sun", start: 200 / 3, end: 120, years: 6 },
    { lord: "Moon", start: 120, end: 160, years: 15 },
    { lord: "Mars", start: 160, end: 640 / 3, years: 8 },
    { lord: "Mercury", start: 640 / 3, end: 760 / 3, years: 17 },
    { lord: "Saturn", start: 760 / 3, end: 880 / 3, years: 10 },
    { lord: "Jupiter", start: 880 / 3, end: 1000 / 3, years: 19 },
    { lord: "Rahu", start: 1000 / 3, end: 1160 / 3, years: 12 },
    { lord: "Venus", start: 80 / 3, end: 200 / 3, years: 21 },
  ] as const;
const normalize = (x: number) => ((x % 360) + 360) % 360;
function arcPosition(longitude: number, item: (typeof SEQUENCE)[number]) {
  let value = normalize(longitude),
    start = item.start,
    end = item.end;
  if (end > 360 && value < start) value += 360;
  return value >= start && value < end ? { value, start, end } : null;
}
export function calculateAshtottariDasha(
  chart: ChartResult,
  applicability:
    | "universal"
    | "rahu-kendra-trikona"
    | "paksha-day-night" = "universal",
  cycles = 2,
) {
  const moon = chart.placements.find((p) => p.name === "Moon")!,
    lagna = chart.placements.find((p) => p.name === "Lagna")!,
    rahu = chart.placements.find((p) => p.name === "Rahu")!,
    lagnaLord = [
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
    ][lagna.sign],
    lord = chart.placements.find((p) => p.name === lagnaLord)!,
    rahuHouse = ((rahu.sign - lord.sign + 12) % 12) + 1,
    elongation = normalize(
      moon.longitude -
        chart.placements.find((p) => p.name === "Sun")!.longitude,
    ),
    shukla = elongation < 180,
    sunrise = chart.panchanga.events.sunriseJulianDay,
    sunset = chart.panchanga.events.sunsetJulianDay,
    daytime =
      sunrise !== null &&
      sunset !== null &&
      chart.engine.julianDay >= sunrise &&
      chart.engine.julianDay < sunset,
    tests = {
      universal: true,
      "rahu-kendra-trikona":
        rahu.sign !== lagna.sign && [1, 4, 5, 7, 9, 10].includes(rahuHouse),
      "paksha-day-night": (daytime && !shukla) || (!daytime && shukla),
    },
    applicable = tests[applicability],
    birthIndex = SEQUENCE.findIndex(
      (item) => arcPosition(moon.longitude, item) !== null,
    ),
    birth = SEQUENCE[birthIndex],
    position = arcPosition(moon.longitude, birth)!,
    fraction =
      (position.value - position.start) / (position.end - position.start),
    birthStart = chart.engine.julianDay - fraction * birth.years * YEAR,
    periods: Array<Record<string, unknown>> = [];
  let cursor = birthStart;
  for (let i = 0; i < cycles * 8; i++) {
    const item = SEQUENCE[(birthIndex + i) % 8],
      start = cursor,
      end = cursor + item.years * YEAR,
      subOrder = Array.from(
        { length: 8 },
        (_, j) => SEQUENCE[(birthIndex + i + 1 + j) % 8],
      ),
      subPeriods: Array<Record<string, unknown>> = [];
    let subCursor = start;
    for (const sub of subOrder) {
      const subEnd = subCursor + ((end - start) * sub.years) / 108;
      subPeriods.push({
        lord: sub.lord,
        startJulianDay: subCursor,
        endJulianDay: subEnd,
        startIso: jdToIso(subCursor),
        endIso: jdToIso(subEnd),
      });
      subCursor = subEnd;
    }
    periods.push({
      lord: item.lord,
      years: item.years,
      startJulianDay: start,
      endJulianDay: end,
      startIso: jdToIso(start),
      endIso: jdToIso(end),
      subPeriods,
    });
    cursor = end;
  }
  return {
    schemaVersion: "sahadeva-ashtottari-dasha-1",
    status: applicable
      ? "computed-applicable-under-selected-rule"
      : "computed-not-applicable-under-selected-rule",
    applicability: {
      selected: applicability,
      applicable,
      tests,
      evidence: {
        rahuHouseFromLagnaLord: rahuHouse,
        rahuInLagna: rahu.sign === lagna.sign,
        shukla,
        daytime,
      },
    },
    birth: {
      lord: birth.lord,
      balanceYears: birth.years * (1 - fraction),
      arcStart: position.start,
      arcEnd: position.end,
    },
    periods,
    convention: {
      id: "pvr-ashtottari-table-39@1.0.0",
      source: "Vedic Astrology: An Integrated Approach, Table 39 and §17.2",
      cycleYears: 108,
      antardasha:
        "Begins with next lord and ends with Mahadasha lord; proportional to 108-year lengths",
    },
    safety: {
      notice: "The 108-year cycle is never used as a lifespan inference.",
    },
  };
}
