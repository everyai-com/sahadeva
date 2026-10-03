import type { BirthInput, ChartResult, GrahaName, Placement } from "./schema";
import { buildGuidance } from "./guidance";
import { calculateAshtakavarga } from "./ashtakavarga";
import { calculatePlanetaryStates } from "./states";
import { calculateHouses } from "./houses";
import { detectStructuralYogas } from "./yogas";
import {
  boundaryWarnings,
  calculateAspects,
  calculateDignities,
  calculateVargas,
  calculateVimshottariTimeline,
  periodsAt,
} from "./advanced";
import { calculatePanchangaEvents, findSolarEvents } from "./panchanga";
import {
  VSOP87_MODEL,
  vsop87ApparentLongitudes,
  vsop87ApparentPosition,
  vsop87ApparentPositions,
} from "./vsop87";
import { ACTIVE_LUNAR_MODEL } from "./lunar";
import { NAKSHATRAS, SIGNS } from "./constants";
import { calculateLahiriAyanamsa, LAHIRI_CONVENTIONS } from "./ayanamsa";

const RAD = Math.PI / 180;
const DASHA_LORDS = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
];
const DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];
export const YOGAS = [
  "Vishkambha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shula",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyana",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Indra",
  "Vaidhriti",
];
export const TITHIS = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Purnima",
];
const VARAS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const norm = (n: number) => ((n % 360) + 360) % 360;

function zoneOffsetAt(instantMillis: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instantMillis));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return (
    (Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    ) -
      instantMillis) /
    3600000
  );
}

export function historicalTimezoneOffset(
  date: string,
  time: string,
  timezone: string,
) {
  const [year, month, day] = date.split("-").map(Number),
    [hour, minute] = time.split(":").map(Number);
  const localWallMillis = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcGuess = localWallMillis;
  for (let iteration = 0; iteration < 4; iteration++)
    utcGuess = localWallMillis - zoneOffsetAt(utcGuess, timezone) * 3600000;
  return zoneOffsetAt(utcGuess, timezone);
}

export function julianDay(input: BirthInput) {
  const [year0, month0, day] = input.date.split("-").map(Number);
  const [hour, minute] = input.time.split(":").map(Number);
  let year = year0;
  let month = month0;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  const effectiveOffset = input.timezone
    ? historicalTimezoneOffset(input.date, input.time, input.timezone)
    : input.timezoneOffset;
  const utcHours = hour + minute / 60 - effectiveOffset;
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5 +
    utcHours / 24
  );
}

function tropicalLongitudes(jd: number) {
  const d = jd - 2451543.5;
  const out: Record<string, number> = { ...vsop87ApparentLongitudes(jd) };
  const node = norm(125.1228 - 0.0529538083 * d);
  out.Moon = ACTIVE_LUNAR_MODEL.position(jd).longitude;
  out.Rahu = node;
  out.Ketu = norm(node + 180);
  return out;
}

function tropicalPositions(jd: number) {
  const planets = vsop87ApparentPositions(jd),
    moon = ACTIVE_LUNAR_MODEL.position(jd),
    d = jd - 2451543.5,
    node = norm(125.1228 - 0.0529538083 * d);
  return {
    ...planets,
    Moon: { longitude: moon.longitude, latitude: moon.latitude },
    Rahu: { longitude: node, latitude: 0 },
    Ketu: { longitude: norm(node + 180), latitude: 0 },
  };
}

function tropicalLongitudeAt(name: Exclude<GrahaName, "Lagna">, jd: number) {
  const d = jd - 2451543.5,
    node = norm(125.1228 - 0.0529538083 * d);
  if (name === "Moon") return ACTIVE_LUNAR_MODEL.position(jd).longitude;
  if (name === "Rahu") return node;
  if (name === "Ketu") return norm(node + 180);
  return vsop87ApparentPosition(name, jd).longitude;
}

export function coreLongitudes(jd: number) {
  const sun = vsop87ApparentPosition("Sun", jd).longitude,
    moon = ACTIVE_LUNAR_MODEL.position(jd).longitude,
    ayanamsa = lahiriAyanamsa(jd);
  return {
    tropical: { Sun: sun, Moon: moon },
    sidereal: { Sun: norm(sun - ayanamsa), Moon: norm(moon - ayanamsa) },
  };
}

export function lahiriAyanamsa(jd: number) {
  return calculateLahiriAyanamsa(jd, "mean").valueDegrees;
}

export function tropicalAscendant(
  jd: number,
  latitude: number,
  longitude: number,
) {
  const t = (jd - 2451545) / 36525;
  const gmst = norm(
    280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t,
  );
  const theta = norm(gmst + longitude) * RAD;
  const eps = (23.439291 - 0.0130042 * t) * RAD;
  const phi = latitude * RAD;
  return norm(
    Math.atan2(
      -Math.cos(theta),
      Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps),
    ) /
      RAD +
      180,
  );
}

function placement(
  name: GrahaName,
  tropical: number,
  ayanamsa: number,
  eclipticLatitude?: number,
): Placement {
  const longitude = norm(tropical - ayanamsa);
  const nakIndex = Math.floor(longitude / (360 / 27));
  const sign = Math.floor(longitude / 30);
  return {
    name,
    longitude,
    tropicalLongitude: tropical,
    eclipticLatitude,
    sign,
    signName: SIGNS[sign],
    degree: longitude % 30,
    nakshatra: NAKSHATRAS[nakIndex],
    pada: Math.floor((longitude % (360 / 27)) / (360 / 108)) + 1,
  };
}

function placementsAt(jd: number, latitude: number, longitude: number) {
  const ayanamsa = lahiriAyanamsa(jd),
    positions = tropicalPositions(jd),
    tropical = Object.fromEntries(
      Object.entries(positions).map(([name, value]) => [name, value.longitude]),
    ) as Record<string, number>;
  const names: GrahaName[] = [
    "Sun",
    "Moon",
    "Mars",
    "Mercury",
    "Jupiter",
    "Venus",
    "Saturn",
    "Rahu",
    "Ketu",
  ];
  const before = tropicalLongitudes(jd - 0.5),
    after = tropicalLongitudes(jd + 0.5);
  const dailyMotion = (name: GrahaName) =>
    ((after[name] - before[name] + 540) % 360) - 180;
  const placements = names.map((name) => ({
    ...placement(
      name,
      tropical[name],
      ayanamsa,
      positions[name as keyof typeof positions].latitude,
    ),
    retrograde:
      name === "Rahu" ||
      name === "Ketu" ||
      (!["Sun", "Moon"].includes(name) && dailyMotion(name) < 0),
  }));
  placements.push({
    ...placement("Lagna", tropicalAscendant(jd, latitude, longitude), ayanamsa),
    retrograde: false,
  });
  return placements;
}

export function calculateIngressTimeline(input: BirthInput, days = 30) {
  const startJulianDay = julianDay(input);
  const names: GrahaName[] = [
    "Sun",
    "Moon",
    "Mars",
    "Mercury",
    "Jupiter",
    "Venus",
    "Saturn",
    "Rahu",
    "Ketu",
  ];
  const signAt = (name: GrahaName, jd: number) =>
    Math.floor(
      norm(
        tropicalLongitudeAt(name as Exclude<GrahaName, "Lagna">, jd) -
          lahiriAyanamsa(jd),
      ) / 30,
    );
  const events: Array<{
    name: GrahaName;
    fromSign: number;
    toSign: number;
    julianDay: number;
    retrograde: boolean;
  }> = [];
  // A 24-hour scan cannot skip a 30-degree sign at the maximum lunar speed;
  // bisection below still resolves the exact crossing to sub-millisecond scale.
  const step = 1;
  for (const name of names) {
    let cursor = startJulianDay,
      currentSign = signAt(name, cursor);
    while (cursor < startJulianDay + days) {
      const next = Math.min(startJulianDay + days, cursor + step),
        nextSign = signAt(name, next);
      if (nextSign !== currentSign) {
        let low = cursor,
          high = next;
        for (let iteration = 0; iteration < 32; iteration++) {
          const mid = (low + high) / 2;
          if (signAt(name, mid) === currentSign) low = mid;
          else high = mid;
        }
        const tropical = tropicalLongitudeAt(
            name as Exclude<GrahaName, "Lagna">,
            high,
          ),
          placement = {
            ...placementForIngress(name, tropical, high),
            sign: signAt(name, high),
          };
        events.push({
          name,
          fromSign: currentSign,
          toSign: placement.sign,
          julianDay: high,
          retrograde: Boolean(placement.retrograde),
        });
        currentSign = placement.sign;
      }
      cursor = next;
    }
  }
  return {
    startJulianDay,
    endJulianDay: startJulianDay + days,
    stepHours: 24,
    events: events.sort((a, b) => a.julianDay - b.julianDay),
    precision: "research-preview; inherits chart astronomy validation",
  };
}

export function placementForIngress(
  name: GrahaName,
  tropical: number,
  jd: number,
) {
  const value = placement(name, tropical, lahiriAyanamsa(jd)),
    before = tropicalLongitudeAt(name as Exclude<GrahaName, "Lagna">, jd - 0.5),
    after = tropicalLongitudeAt(name as Exclude<GrahaName, "Lagna">, jd + 0.5),
    motion = ((after - before + 540) % 360) - 180;
  return {
    ...value,
    retrograde:
      name === "Rahu" ||
      name === "Ketu" ||
      (!["Sun", "Moon"].includes(name) && motion < 0),
  };
}

export function siderealPlacementAt(
  name: Exclude<GrahaName, "Lagna">,
  jd: number,
) {
  return placementForIngress(name, tropicalLongitudeAt(name, jd), jd);
}
export function siderealSignAt(name: Exclude<GrahaName, "Lagna">, jd: number) {
  return Math.floor(
    norm(tropicalLongitudeAt(name, jd) - lahiriAyanamsa(jd)) / 30,
  );
}

export function simulateBirthTimeUncertainty(
  input: BirthInput,
  samples = nineSampleCount(input.birthTimeAccuracyMinutes),
) {
  const center = julianDay(input),
    span = input.birthTimeAccuracyMinutes;
  const offsets =
    samples <= 1 || span === 0
      ? [0]
      : Array.from(
          { length: samples },
          (_, index) => -span + index * ((2 * span) / (samples - 1)),
        );
  const snapshots = offsets.map((offsetMinutes) => {
    const placements = placementsAt(
      center + offsetMinutes / 1440,
      input.latitude,
      input.longitude,
    );
    const lagna = placements.find((p) => p.name === "Lagna")!,
      moon = placements.find((p) => p.name === "Moon")!;
    const d9Lagna = calculateVargas(placements).D9.find(
      (p) => p.name === "Lagna",
    )!.sign;
    return {
      offsetMinutes,
      lagnaSign: lagna.sign,
      lagnaDegree: lagna.degree,
      moonNakshatra: moon.nakshatra,
      moonPada: moon.pada,
      navamsaLagnaSign: d9Lagna,
    };
  });
  const unique = <T>(values: T[]) => [...new Set(values)];
  return {
    requestedAccuracyMinutes: span,
    samples: snapshots,
    stability: {
      lagnaSigns: unique(snapshots.map((s) => s.lagnaSign)),
      moonNakshatras: unique(snapshots.map((s) => s.moonNakshatra)),
      moonPadas: unique(
        snapshots.map((s) => `${s.moonNakshatra}-${s.moonPada}`),
      ),
      navamsaLagnaSigns: unique(snapshots.map((s) => s.navamsaLagnaSign)),
    },
    notice:
      "Sampling detects boundary sensitivity but is not birth-time rectification.",
  };
}

function nineSampleCount(minutes: number) {
  return minutes === 0 ? 1 : 9;
}

export function vimshottariBirthState(moonLongitude: number) {
  const nakIndex = Math.floor(norm(moonLongitude) / (360 / 27)),
    fraction = (norm(moonLongitude) % (360 / 27)) / (360 / 27),
    birthLordIndex = nakIndex % 9;
  return {
    nakIndex,
    fraction,
    birthLordIndex,
    birthLord: DASHA_LORDS[birthLordIndex],
    balanceYears: DASHA_YEARS[birthLordIndex] * (1 - fraction),
  };
}

export function calculateChart(input: BirthInput): ChartResult {
  const suppliedOffset = input.timezoneOffset;
  const resolvedOffset = input.timezone
    ? historicalTimezoneOffset(input.date, input.time, input.timezone)
    : suppliedOffset;
  input = {
    ...input,
    timezoneOffset: resolvedOffset,
    houseSystem: input.houseSystem || "whole-sign",
  };
  const jd = julianDay(input),
    ayanamsa = lahiriAyanamsa(jd),
    tropical = tropicalLongitudes(jd);
  const placements = placementsAt(jd, input.latitude, input.longitude);
  const moon = placements.find((p) => p.name === "Moon")!;
  const sun = placements.find((p) => p.name === "Sun")!;
  const elongation = norm(moon.longitude - sun.longitude);
  const tithiIndex = Math.floor(elongation / 12);
  const yogaIndex = Math.floor(
    norm(moon.longitude + sun.longitude) / (360 / 27),
  );
  const { nakIndex, birthLordIndex, birthLord, balanceYears } =
    vimshottariBirthState(moon.longitude);
  const utcMillis = (jd - 2440587.5) * 86400000;
  const karanaIndex = Math.floor(elongation / 6);
  const recurringKaranas = [
    "Bava",
    "Balava",
    "Kaulava",
    "Taitila",
    "Garaja",
    "Vanija",
    "Vishti",
  ];
  const karana =
    karanaIndex === 0
      ? "Kimstughna"
      : karanaIndex >= 57
        ? ["Shakuni", "Chatushpada", "Naga"][karanaIndex - 57]
        : recurringKaranas[(karanaIndex - 1) % 7];
  const longitudeCache = new Map<number, ReturnType<typeof coreLongitudes>>(),
    longitudeAt = (at: number) => {
      const cached = longitudeCache.get(at);
      if (cached) return cached;
      const value = coreLongitudes(at);
      longitudeCache.set(at, value);
      return value;
    };
  const solarLongitudeAt = (at: number) => ({
    Sun: vsop87ApparentPosition("Sun", at).longitude,
    Moon: 0,
  });
  const events = calculatePanchangaEvents(
    jd,
    input.latitude,
    input.longitude,
    (at) => longitudeAt(at).sidereal,
    solarLongitudeAt,
  );
  const neighboringSolarEvents = [-1, 0, 1].map((offset) =>
    offset === 0
      ? events
      : findSolarEvents(
          jd + offset,
          input.latitude,
          input.longitude,
          solarLongitudeAt,
        ),
  );
  const solarWindow = {
    sunrises: neighboringSolarEvents
      .map((event) => event.sunriseJulianDay)
      .filter((value): value is number => value !== null),
    sunsets: neighboringSolarEvents
      .map((event) => event.sunsetJulianDay)
      .filter((value): value is number => value !== null),
  };
  let governingSunrise = events.sunriseJulianDay;
  if (governingSunrise !== null && governingSunrise > jd)
    governingSunrise = findSolarEvents(
      jd - 1,
      input.latitude,
      input.longitude,
      solarLongitudeAt,
    ).sunriseJulianDay;
  const sunriseSunLongitude =
    governingSunrise === null
      ? undefined
      : norm(
          vsop87ApparentPosition("Sun", governingSunrise).longitude -
            lahiriAyanamsa(governingSunrise),
        );
  const uncertainty = boundaryWarnings(
    placements,
    input.birthTimeAccuracyMinutes,
  );
  const vimshottariTimeline = calculateVimshottariTimeline(
    jd,
    birthLord,
    balanceYears,
  );
  const planetaryStates = calculatePlanetaryStates(
    placements,
    jd,
    input.longitude,
    solarWindow,
  );
  return {
    input,
    engine: {
      version: "cleanroom-0.15.0",
      precision: "research-preview",
      astronomyModel: `${VSOP87_MODEL.id} ${VSOP87_MODEL.version} apparent planets plus ${ACTIVE_LUNAR_MODEL.id} ${ACTIVE_LUNAR_MODEL.version}`,
      validRange: "1800-2050",
      ayanamsa: "Lahiri IAE 1985 mean",
      ayanamsaDegrees: ayanamsa,
      zodiac: {
        type: "sidereal",
        signIndexBase: 0,
        signIndexRange: "0-11",
        signNames: [...SIGNS],
      },
      ayanamsaConvention: {
        ...LAHIRI_CONVENTIONS.mean,
        convention: "mean",
        precessionModel: "Lieske IAU 1976",
        nutationModel: "removed (mean equinox compatibility)",
      },
      julianDay: jd,
      timezone: {
        id: input.timezone || null,
        suppliedOffsetHours: suppliedOffset,
        resolvedOffsetHours: resolvedOffset,
        source: input.timezone
          ? "IANA historical rules via Intl"
          : "explicit fixed offset",
      },
      validation: {
        planets:
          "Full VSOP87D apparent geocentric positions; the existing NASA/JPL Horizons suite passes, with expanded publication vectors still required for production certification",
        moon: "ELP/MPP02: six epochs across 1800-2050 plus all 108 Pada boundaries; DE441 maximum vector angular error 0.050 arcsec and position error 0.128 km",
        ayanamsa:
          "IAE 1985 corrected anchor; six 1800-2050 reference values within 1 arcsecond; versioned mean/true conventions",
        lagna:
          "four independent Meeus/IAU-1982 mean-sidereal vectors within 1 arcsecond",
        solarEvents:
          "three independent Meeus apparent-Sun rise/set vectors within 3 minutes, including opposite hemispheres and UTC-date crossing",
        productionCertified: false,
      },
      notice:
        "Planetary, lunar, Lahiri ayanamsa, Lagna, and solar-event astronomy have independent validation gates. Complete-strength reference charts and practitioner review remain pending before professional use.",
    },
    placements,
    navamsa: placements.map((p) => {
      const sign = Math.floor(norm(p.longitude * 9) / 30);
      return { name: p.name, sign, signName: SIGNS[sign] };
    }),
    panchanga: {
      vara: VARAS[new Date(utcMillis).getUTCDay()],
      tithi: tithiIndex === 29 ? "Amavasya" : TITHIS[tithiIndex % 15],
      paksha: tithiIndex < 15 ? "Shukla" : "Krishna",
      nakshatra: moon.nakshatra,
      yoga: YOGAS[yogaIndex],
      karana,
      events,
    },
    vimshottari: {
      birthLord,
      balanceYears,
      sequence: Array.from({ length: 9 }, (_, i) => {
        const index = (birthLordIndex + i) % 9;
        return { lord: DASHA_LORDS[index], years: DASHA_YEARS[index] };
      }),
    },
    advanced: {
      vargas: calculateVargas(placements),
      dignities: calculateDignities(placements),
      aspects: calculateAspects(placements),
      vimshottariTimeline,
      birthPeriods: periodsAt(vimshottariTimeline, jd),
      uncertainty,
      guidance: buildGuidance(input, placements, uncertainty.boundaryWarnings),
      ashtakavarga: calculateAshtakavarga(placements),
      planetaryStates,
      houses: calculateHouses(
        placements,
        jd,
        governingSunrise,
        sunriseSunLongitude,
        input.latitude,
        input.longitude,
        ayanamsa,
        input.houseSystem,
        planetaryStates.avasthas,
      ),
      yogas: detectStructuralYogas(placements),
    },
  };
}

export { SIGNS, NAKSHATRAS } from "./constants";
