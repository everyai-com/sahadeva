import { jdToIso } from "./dashaCalendar";
import { NAKSHATRAS, SIGNS } from "./constants";
import type { ChartResult } from "./schema";
import { findLunarEvents } from "./panchanga";
import { ACTIVE_LUNAR_MODEL } from "./lunar";
import {
  amritaKalamWindows,
  ayanaForSunSign,
  durmuhurtamWindows,
  limbSpans,
  lunarMonthAt,
  MASAS,
  rituForSunSign,
  samvatsaraFor,
  varjyamWindows,
} from "./panchangaCalendar";

const VARAS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_CHOGHADIYA = [
  ["Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"],
  ["Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit"],
  ["Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog"],
  ["Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh"],
  ["Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh"],
  ["Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char"],
  ["Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal"],
];
const NIGHT_CHOGHADIYA = [
  ["Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh"],
  ["Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char"],
  ["Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal"],
  ["Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg"],
  ["Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit"],
  ["Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog"],
  ["Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh"],
];
const QUALITY: Record<string, "favorable" | "mixed" | "avoid"> = {
  Amrit: "favorable",
  Shubh: "favorable",
  Labh: "favorable",
  Char: "mixed",
  Udveg: "avoid",
  Kaal: "avoid",
  Rog: "avoid",
};
const RAHU = [8, 2, 7, 5, 6, 4, 3],
  YAMAGANDA = [5, 4, 3, 2, 1, 7, 6],
  GULIKA = [7, 6, 5, 4, 3, 2, 1];
const HORA_SEQUENCE = [
  "Saturn",
  "Jupiter",
  "Mars",
  "Sun",
  "Venus",
  "Mercury",
  "Moon",
];
const unavailable = (reason: string) => ({ status: "unavailable", reason });
const window = (start: number, end: number) => ({
  startJulianDay: start,
  endJulianDay: end,
  startIso: jdToIso(start),
  endIso: jdToIso(end),
});
const segment = (start: number, end: number, index: number, count: number) =>
  window(
    start + ((end - start) * (index - 1)) / count,
    start + ((end - start) * index) / count,
  );

export function buildDailyPanchanga(
  chart: ChartResult,
  nextDay: ChartResult,
  natal?: ChartResult,
) {
  const sunrise = chart.panchanga.events.sunriseJulianDay,
    sunset = chart.panchanga.events.sunsetJulianDay,
    nextSunrise = nextDay.panchanga.events.sunriseJulianDay;
  if (sunrise === null || sunset === null || nextSunrise === null)
    return {
      schemaVersion: "sahadeva-panchanga-1",
      status: "unavailable-polar",
      reason: "Sunrise and sunset are required for daily windows.",
    };
  const weekday = Math.max(0, VARAS.indexOf(chart.panchanga.vara)),
    dayLengthHours = (sunset - sunrise) * 24,
    nightLengthHours = (nextSunrise - sunset) * 24;
  const named = (ordinal: number) => segment(sunrise, sunset, ordinal, 8);
  const dayChoghadiya = DAY_CHOGHADIYA[weekday].map((name, index) => ({
    ...segment(sunrise, sunset, index + 1, 8),
    name,
    quality: QUALITY[name],
  }));
  const nightChoghadiya = NIGHT_CHOGHADIYA[weekday].map((name, index) => ({
    ...segment(sunset, nextSunrise, index + 1, 8),
    name,
    quality: QUALITY[name],
  }));
  const weekdayLord = [
      "Sun",
      "Moon",
      "Mars",
      "Mercury",
      "Jupiter",
      "Venus",
      "Saturn",
    ][weekday],
    startHora = HORA_SEQUENCE.indexOf(weekdayLord),
    dayHoras = Array.from({ length: 12 }, (_, index) => ({
      ...segment(sunrise, sunset, index + 1, 12),
      number: index + 1,
      period: "day",
      lord: HORA_SEQUENCE[(startHora + index) % 7],
    })),
    nightStart = (startHora + 12) % 7,
    nightHoras = Array.from({ length: 12 }, (_, index) => ({
      ...segment(sunset, nextSunrise, index + 1, 12),
      number: index + 13,
      period: "night",
      lord: HORA_SEQUENCE[(nightStart + index) % 7],
    }));
  const noon = (sunrise + sunset) / 2,
    abhijitHalf = (sunset - sunrise) / 30,
    brahmaEnd = sunrise - 48 / 1440,
    moon = chart.placements.find((item) => item.name === "Moon")!,
    sun = chart.placements.find((item) => item.name === "Sun")!,
    nextSun = nextDay.placements.find((item) => item.name === "Sun")!;
  const festivalFlags = [
    ...(chart.panchanga.tithi === "Ekadashi" ? ["Ekadashi"] : []),
    ...(chart.panchanga.tithi === "Amavasya" ? ["Amavasya"] : []),
    ...(chart.panchanga.tithi === "Purnima" ? ["Purnima"] : []),
    ...(sun.sign !== nextSun.sign ? ["Sankranti"] : []),
  ];
  const personalized = natal
    ? (() => {
        const natalMoon = natal.placements.find(
            (item) => item.name === "Moon",
          )!,
          birthIndex = NAKSHATRAS.indexOf(
            natalMoon.nakshatra as (typeof NAKSHATRAS)[number],
          ),
          todayIndex = NAKSHATRAS.indexOf(
            moon.nakshatra as (typeof NAKSHATRAS)[number],
          ),
          tara = ((todayIndex - birthIndex + 27) % 27) + 1,
          taraCycle = ((tara - 1) % 9) + 1,
          chandraHouse = ((moon.sign - natalMoon.sign + 12) % 12) + 1;
        return {
          taraBala: {
            birthNakshatra: natalMoon.nakshatra,
            todayNakshatra: moon.nakshatra,
            count: tara,
            cyclePosition: taraCycle,
            favorable: [2, 4, 6, 8, 9].includes(taraCycle),
          },
          chandraBala: {
            natalMoonSign: natalMoon.sign,
            natalMoonSignName: SIGNS[natalMoon.sign],
            transitMoonSign: moon.sign,
            transitMoonSignName: SIGNS[moon.sign],
            houseFromNatalMoon: chandraHouse,
            favorable: [1, 3, 6, 7, 10, 11].includes(chandraHouse),
          },
        };
      })()
    : null;
  // Muhurta windows and the lunar month need the Moon's nakshatra spans
  // between this sunrise and the next.
  const nakshatraSpans = limbSpans("nakshatra", sunrise, nextSunrise);
  const lunarMonth = lunarMonthAt(sunrise);
  const lunar = findLunarEvents(
    chart.engine.julianDay,
    chart.input.latitude,
    chart.input.longitude,
    (at) => ACTIVE_LUNAR_MODEL.position(at),
  );
  const lunarEvent = (instant: number | null) =>
    instant === null
      ? { status: "no-event-on-utc-day", validation: lunar.validation }
      : {
          status: "computed",
          instantJulianDay: instant,
          instantIso: jdToIso(instant),
          validation: lunar.validation,
        };
  return {
    schemaVersion: "sahadeva-panchanga-1",
    status: "computed",
    date: chart.input.date,
    location: {
      place: chart.input.place,
      latitude: chart.input.latitude,
      longitude: chart.input.longitude,
      timezone: chart.engine.timezone,
    },
    fiveLimbs: {
      vara: chart.panchanga.vara,
      tithi: chart.panchanga.tithi,
      paksha: chart.panchanga.paksha,
      nakshatra: chart.panchanga.nakshatra,
      yoga: chart.panchanga.yoga,
      karana: chart.panchanga.karana,
    },
    solar: {
      sunrise: jdToIso(sunrise),
      sunset: jdToIso(sunset),
      nextSunrise: jdToIso(nextSunrise),
      dayLengthHours,
      nightLengthHours,
      moonrise: lunarEvent(lunar.moonriseJulianDay),
      moonset: lunarEvent(lunar.moonsetJulianDay),
    },
    inauspicious: {
      rahuKaal: named(RAHU[weekday]),
      yamaganda: named(YAMAGANDA[weekday]),
      gulikaKaal: named(GULIKA[weekday]),
      bhadraVishti: {
        active: /vishti|bhadra/i.test(chart.panchanga.karana),
        karana: chart.panchanga.karana,
      },
      durmuhurtam: { status: "computed", windows: durmuhurtamWindows(weekday, sunrise, sunset, nextSunrise) },
      varjyam: { status: "computed", windows: varjyamWindows(nakshatraSpans, sunrise, nextSunrise) },
    },
    auspicious: {
      abhijitMuhurta: window(noon - abhijitHalf, noon + abhijitHalf),
      brahmaMuhurta: window(sunrise - 96 / 1440, brahmaEnd),
      amritKaal: { status: "computed", windows: amritaKalamWindows(nakshatraSpans, sunrise, nextSunrise) },
    },
    choghadiya: { day: dayChoghadiya, night: nightChoghadiya },
    hora: [...dayHoras, ...nightHoras],
    calendar: {
      masa: {
        amanta: { status: "computed", name: lunarMonth.name, adhika: lunarMonth.adhika, startIso: lunarMonth.startIso, endIso: lunarMonth.endIso },
        purnimanta: lunarMonth.adhika
          ? unavailable("Purnimanta naming of an adhika month is regional.")
          : {
              status: "computed",
              name:
                chart.panchanga.paksha === "Krishna"
                  ? MASAS[(MASAS.indexOf(lunarMonth.name) + 1) % 12]
                  : lunarMonth.name,
            },
      },
      ritu: rituForSunSign(sun.sign),
      ayana: ayanaForSunSign(sun.sign),
      samvatsara: {
        status: "computed",
        name: samvatsaraFor(chart.input.date, lunarMonth.name),
        convention: "Telugu/Kannada chandramana cycle, turning at Ugadi",
      },
    },
    personalized,
    festivalFlags,
    sourceCoverage: {
      status: "calculation-conventions; activity rules unreviewed",
      sourceKeys: [],
    },
    safety: {
      status: "research-preview",
      notice:
        "Traditional calendar windows are planning aids, not guarantees. Unavailable fields are never estimated silently.",
    },
  };
}
