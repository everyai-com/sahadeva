import { NAKSHATRAS, SIGNS } from "./constants";
import { jdToIso } from "./dashaCalendar";
import { coreLongitudes, historicalTimezoneOffset, lahiriAyanamsa, TITHIS, YOGAS } from "./jyotish";
import { moonAltitude, sunAltitude } from "./panchanga";
import { ACTIVE_LUNAR_MODEL } from "./lunar";
import { vsop87ApparentPosition } from "./vsop87";

/*
 * Lean, calendar-scale panchanga. A full chart costs ~200 ms, so a month view
 * cannot build one per day. Everything here needs only the Sun and Moon:
 *
 *  - local-day sunrise / sunset (the Sun alone, ~0.1 ms per evaluation),
 *  - every tithi, nakshatra, yoga and karana span with exact start and end,
 *    found by sampling the Moon every 6 hours (no limb can be skipped at that
 *    step) and refining each boundary with a safeguarded secant solve,
 *  - the amanta lunar month with adhika detection, and Sankranti instants.
 *
 * Limbs are reported the traditional way: the one prevailing at sunrise
 * (udaya) names the day, followed by any that begin before the next sunrise.
 */

const norm = (n: number) => ((n % 360) + 360) % 360;
const signed = (n: number) => ((norm(n) + 180) % 360) - 180;
const HOUR = 1 / 24;
/*
 * Elongation and the Moon move at most ~15.4°/day, i.e. < 3.9° in 6 hours —
 * less than the smallest limb (a 6° karana) — so no boundary can be skipped.
 */
const SAMPLE_STEP = 6 * HOUR;
/** No limb lasts longer than ~27 h, so this always brackets the sunrise limb's start. */
const LOOKAROUND = 30 * HOUR;

export const MASAS = [
  "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
  "Ashvayuja", "Kartika", "Margashira", "Pushya", "Magha", "Phalguna",
] as const;
export const RITUS = ["Vasanta", "Grishma", "Varsha", "Sharad", "Hemanta", "Shishira"] as const;

/** Solar ritu from the Sun's sidereal sign: Mina+Mesha = Vasanta, Vrishabha+Mithuna = Grishma, … */
export function rituForSunSign(sign: number): (typeof RITUS)[number] {
  return RITUS[Math.floor(((sign + 1) % 12) / 2)];
}

export function ayanaForSunSign(sign: number): "Uttarayana" | "Dakshinayana" {
  return [9, 10, 11, 0, 1, 2].includes(sign) ? "Uttarayana" : "Dakshinayana";
}

export function karanaName(index: number): string {
  const recurring = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"];
  if (index === 0) return "Kimstughna";
  if (index >= 57) return ["Shakuni", "Chatushpada", "Naga"][index - 57];
  return recurring[(index - 1) % 7];
}

export type LimbKind = "tithi" | "nakshatra" | "yoga" | "karana";

export type LimbSpan = {
  /** 0-based segment index (tithi 0–29, nakshatra/yoga 0–26, karana 0–59). */
  index: number;
  name: string;
  startJulianDay: number;
  endJulianDay: number;
  startIso: string;
  endIso: string;
  /** Tithi only: 1–30 and paksha. */
  number?: number;
  paksha?: "Shukla" | "Krishna";
};

type Sidereal = { Sun: number; Moon: number };

const LIMBS: Record<LimbKind, { segments: number; value: (s: Sidereal) => number }> = {
  tithi: { segments: 30, value: (s) => norm(s.Moon - s.Sun) },
  nakshatra: { segments: 27, value: (s) => s.Moon },
  yoga: { segments: 27, value: (s) => norm(s.Moon + s.Sun) },
  karana: { segments: 60, value: (s) => norm(s.Moon - s.Sun) },
};

function limbName(kind: LimbKind, index: number): string {
  if (kind === "tithi") return index === 29 ? "Amavasya" : TITHIS[index % 15];
  if (kind === "nakshatra") return NAKSHATRAS[index];
  if (kind === "yoga") return YOGAS[index];
  return karanaName(index);
}

/** Memoised sidereal Sun/Moon for one calculation. */
function siderealSampler() {
  const cache = new Map<number, Sidereal>();
  return (jd: number): Sidereal => {
    let hit = cache.get(jd);
    if (!hit) {
      hit = coreLongitudes(jd).sidereal;
      cache.set(jd, hit);
    }
    return hit;
  };
}

/**
 * Instant where `value` crosses `boundary` inside [lo, hi]. The value grows
 * monotonically and almost linearly over a 6-hour bracket, so an Illinois
 * secant converges to well under a second in a handful of Moon evaluations.
 */
function solveCrossing(
  lo: number,
  hi: number,
  boundary: number,
  value: (jd: number) => number,
): number {
  let a = lo,
    b = hi,
    fa = signed(value(a) - boundary),
    fb = signed(value(b) - boundary),
    side = 0;
  for (let i = 0; i < 12; i++) {
    const c = fb === fa ? (a + b) / 2 : (a * fb - b * fa) / (fb - fa);
    const fc = signed(value(c) - boundary);
    if (Math.abs(fc) < 2e-6 || b - a < 1 / 86400) return c;
    if (fc * fb > 0) {
      b = c;
      fb = fc;
      if (side === -1) fa /= 2;
      side = -1;
    } else {
      a = c;
      fa = fc;
      if (side === 1) fb /= 2;
      side = 1;
    }
  }
  return (a + b) / 2;
}

/** Every span of one limb that overlaps [fromJd, toJd], with exact boundaries. */
export function limbSpans(
  kind: LimbKind,
  fromJd: number,
  toJd: number,
  sample: (jd: number) => Sidereal = siderealSampler(),
): LimbSpan[] {
  const { segments, value } = LIMBS[kind];
  const width = 360 / segments;
  const indexAt = (jd: number) => Math.floor(value(sample(jd)) / width) % segments;
  const start = fromJd - LOOKAROUND,
    end = toJd + LOOKAROUND;
  const boundaries: Array<{ jd: number; next: number }> = [];
  let prevJd = start,
    prevIndex = indexAt(start);
  for (let jd = start + SAMPLE_STEP; jd <= end + 1e-9; jd += SAMPLE_STEP) {
    const index = indexAt(jd);
    if (index !== prevIndex) {
      const next = (prevIndex + 1) % segments;
      const at = solveCrossing(prevJd, jd, next * width, (t) => value(sample(t)));
      boundaries.push({ jd: at, next });
    }
    prevJd = jd;
    prevIndex = index;
  }
  const spans: LimbSpan[] = [];
  for (let i = 0; i + 1 < boundaries.length; i++) {
    const s = boundaries[i].jd,
      e = boundaries[i + 1].jd;
    if (e <= fromJd || s > toJd) continue;
    const index = boundaries[i].next;
    spans.push({
      index,
      name: limbName(kind, index),
      startJulianDay: s,
      endJulianDay: e,
      startIso: jdToIso(s),
      endIso: jdToIso(e),
      ...(kind === "tithi" ? { number: index + 1, paksha: index < 15 ? ("Shukla" as const) : ("Krishna" as const) } : {}),
    });
  }
  return spans;
}

/** Julian Day of local midnight starting `date` (YYYY-MM-DD). */
export function localMidnightJd(date: string, offsetHours: number) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000 + 2440587.5 - offsetHours / 24;
}

export function offsetFor(date: string, timezone: string | undefined, fallbackOffset: number) {
  if (!timezone) return fallbackOffset;
  try {
    return historicalTimezoneOffset(date, "12:00", timezone);
  } catch {
    return fallbackOffset;
  }
}

/**
 * Sunrise and sunset on a local civil day (−0.833° upper-limb convention,
 * matching the chart engine). Searching the local day rather than the UTC day
 * keeps far-east and far-west time zones on the correct date.
 */
export function localSolarDay(
  midnightJd: number,
  latitude: number,
  longitude: number,
  previous?: { sunrise: number | null; sunset: number | null },
) {
  const altitude = (jd: number) =>
    sunAltitude(jd, latitude, longitude, vsop87ApparentPosition("Sun", jd).longitude) + 0.833;
  // Consecutive days move rise/set by a few minutes: bracket ±30 min around
  // yesterday's times and bisect, instead of scanning the whole day.
  const near = (hint: number | null, rising: boolean) => {
    if (hint === null) return undefined;
    let lo = hint + 1 - 1 / 48,
      hi = hint + 1 + 1 / 48,
      flo = altitude(lo);
    const fhi = altitude(hi);
    if (flo * fhi >= 0 || (fhi > flo) !== rising) return undefined;
    for (let k = 0; k < 13; k++) {
      const mid = (lo + hi) / 2,
        fm = altitude(mid);
      if (flo * fm <= 0) hi = mid;
      else {
        lo = mid;
        flo = fm;
      }
    }
    return (lo + hi) / 2;
  };
  const quickRise = near(previous?.sunrise ?? null, true),
    quickSet = near(previous?.sunset ?? null, false);
  if (quickRise !== undefined && quickSet !== undefined) return { sunrise: quickRise, sunset: quickSet };
  let sunrise: number | null = null,
    sunset: number | null = null;
  let prevJd = midnightJd,
    prev = altitude(prevJd);
  for (let i = 1; i <= 48 && (sunrise === null || sunset === null); i++) {
    const jd = midnightJd + i / 48,
      current = altitude(jd);
    if (prev * current < 0) {
      let lo = prevJd,
        hi = jd,
        flo = prev;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2,
          fm = altitude(mid);
        if (flo * fm <= 0) hi = mid;
        else {
          lo = mid;
          flo = fm;
        }
      }
      if (current > prev) sunrise ??= (lo + hi) / 2;
      else sunset ??= (lo + hi) / 2;
    }
    prevJd = jd;
    prev = current;
  }
  return { sunrise, sunset };
}

/**
 * Moonrise and moonset within one local civil day (midnight to midnight),
 * using the chart engine's parallax and refraction convention. Either can be
 * absent: the Moon rises ~50 minutes later each day, so one day a month has
 * no rise and another no set.
 */
export function localLunarDay(midnightJd: number, nextMidnightJd: number, latitude: number, longitude: number) {
  const altitude = (jd: number) => {
    const position = ACTIVE_LUNAR_MODEL.position(jd),
      parallax = Math.asin(Math.min(1, 6378.14 / position.distanceKm)) * (180 / Math.PI);
    return moonAltitude(jd, latitude, longitude, position) - (0.7275 * parallax - 0.5667);
  };
  let rise: number | null = null,
    set: number | null = null;
  const steps = 48,
    step = (nextMidnightJd - midnightJd) / steps;
  let prevJd = midnightJd,
    prev = altitude(prevJd);
  for (let i = 1; i <= steps; i++) {
    const jd = midnightJd + i * step,
      current = altitude(jd);
    if (prev * current < 0) {
      let lo = prevJd,
        hi = jd,
        flo = prev;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2,
          fm = altitude(mid);
        if (flo * fm <= 0) hi = mid;
        else {
          lo = mid;
          flo = fm;
        }
      }
      if (current > prev) rise ??= (lo + hi) / 2;
      else set ??= (lo + hi) / 2;
    }
    prevJd = jd;
    prev = current;
  }
  return {
    moonrise: rise === null ? null : jdToIso(rise),
    moonset: set === null ? null : jdToIso(set),
  };
}

const siderealSun = (jd: number) => norm(vsop87ApparentPosition("Sun", jd).longitude - lahiriAyanamsa(jd));

/** The new moon (elongation 0°) at or before `jd`. */
export function newMoonBefore(jd: number, sample: (jd: number) => Sidereal = siderealSampler()): number {
  const elongation = (t: number) => norm(sample(t).Moon - sample(t).Sun);
  // Mean synodic motion ≈ 12.19°/day gives a close first guess; bracket ±1.5 d.
  const guess = jd - elongation(jd) / 12.19;
  let lo = guess - 1.5,
    hi = Math.min(jd, guess + 1.5);
  // Walk the bracket until it holds the 360°→0° wrap.
  while (elongation(lo) < 180) lo -= 1;
  while (elongation(hi) > 180) hi -= 0.5;
  // Now elongation(lo) is in (180,360) and elongation(hi) in [0,180): find the wrap.
  for (let i = 0; i < 40 && hi - lo > 1 / 86400; i++) {
    const mid = (lo + hi) / 2;
    if (elongation(mid) > 180) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export type LunarMonth = {
  name: (typeof MASAS)[number];
  adhika: boolean;
  startJulianDay: number;
  endJulianDay: number;
  startIso: string;
  endIso: string;
};

/**
 * Amanta lunar month (new moon to new moon) containing `jd`. It is named by
 * the Sun's sidereal sign at the opening new moon (Sun in Mina → Chaitra).
 * When no Sankranti falls between two new moons the month is adhika and
 * shares its name with the regular (nija) month that follows.
 */
export function lunarMonthAt(jd: number, sample: (jd: number) => Sidereal = siderealSampler()): LunarMonth {
  const start = newMoonBefore(jd, sample);
  const end = newMoonBefore(start + 31, sample);
  const startSign = Math.floor(siderealSun(start) / 30),
    endSign = Math.floor(siderealSun(end) / 30);
  return {
    name: MASAS[(startSign + 1) % 12],
    adhika: startSign === endSign,
    startJulianDay: start,
    endJulianDay: end,
    startIso: jdToIso(start),
    endIso: jdToIso(end),
  };
}

export type Observance = {
  id: string;
  kind: "festival" | "vrata" | "lunar" | "solar";
  en: string;
  te: string;
  /** Festivals: the time-of-day rule that dated it. */
  rule?: Karmakala;
};

/*
 * Observances fixed by (amanta month, tithi) and the part of the day in which
 * the tithi must prevail (karmakala): sunrise (udaya), madhyahna (midday),
 * aparahna (afternoon), pradosha (dusk) or nishita (midnight). The first day
 * whose karmakala falls inside the tithi wins; if none does, the udaya / kshaya
 * assignment is used. Sectarian refinements (e.g. Vaishnava Ekadashi, bhadra
 * avoidance) are not applied, and every observance is published with its rule.
 */
export type Karmakala = "udaya" | "madhyahna" | "aparahna" | "pradosha" | "nishita";
const TITHI_FESTIVALS: Array<{ masa: (typeof MASAS)[number]; tithi: number; rule: Karmakala; id: string; en: string; te: string }> = [
  { masa: "Chaitra", tithi: 1, rule: "udaya", id: "ugadi", en: "Ugadi — Telugu New Year", te: "ఉగాది" },
  { masa: "Chaitra", tithi: 9, rule: "madhyahna", id: "rama-navami", en: "Sri Rama Navami", te: "శ్రీరామ నవమి" },
  { masa: "Ashadha", tithi: 15, rule: "udaya", id: "guru-purnima", en: "Guru Purnima", te: "గురు పౌర్ణమి" },
  { masa: "Shravana", tithi: 15, rule: "udaya", id: "raksha-bandhan", en: "Raksha Bandhan", te: "రాఖీ పౌర్ణమి" },
  { masa: "Shravana", tithi: 23, rule: "nishita", id: "krishna-janmashtami", en: "Krishna Janmashtami", te: "శ్రీకృష్ణ జన్మాష్టమి" },
  { masa: "Bhadrapada", tithi: 4, rule: "madhyahna", id: "vinayaka-chavithi", en: "Vinayaka Chavithi", te: "వినాయక చవితి" },
  { masa: "Bhadrapada", tithi: 30, rule: "aparahna", id: "mahalaya-amavasya", en: "Mahalaya Amavasya", te: "మహాలయ అమావాస్య" },
  { masa: "Ashvayuja", tithi: 1, rule: "udaya", id: "navaratri", en: "Navaratri begins", te: "దేవీ నవరాత్రులు ప్రారంభం" },
  { masa: "Ashvayuja", tithi: 10, rule: "aparahna", id: "vijaya-dashami", en: "Vijaya Dashami (Dasara)", te: "విజయ దశమి" },
  { masa: "Ashvayuja", tithi: 29, rule: "udaya", id: "naraka-chaturdashi", en: "Naraka Chaturdashi", te: "నరక చతుర్దశి" },
  { masa: "Ashvayuja", tithi: 30, rule: "pradosha", id: "deepavali", en: "Deepavali", te: "దీపావళి" },
  { masa: "Kartika", tithi: 15, rule: "udaya", id: "kartika-purnima", en: "Kartika Purnima", te: "కార్తీక పౌర్ణమి" },
  { masa: "Magha", tithi: 29, rule: "nishita", id: "maha-shivaratri", en: "Maha Shivaratri", te: "మహా శివరాత్రి" },
];

export const OBSERVANCE_BASIS =
  "Festivals are dated by the amanta month and the tithi prevailing at each festival's traditional time of day (sunrise, midday, afternoon, dusk or midnight). Ekadashi, Purnima and Amavasya follow the sunrise tithi. Sectarian and regional refinements are not applied, so local practice can differ by a day — confirm important dates with your family priest or temple.";

/** The instant in local day `i` at which a karmakala rule is tested. */
function karmakalaMoment(rule: Karmakala, sunrise: number, sunset: number, nextSunrise: number) {
  const day = sunset - sunrise,
    night = nextSunrise - sunset;
  if (rule === "madhyahna") return sunrise + day * 0.5; // middle fifth of daytime
  if (rule === "aparahna") return sunrise + day * 0.7; // fourth fifth of daytime
  if (rule === "pradosha") return sunset + night * 0.05; // first muhurtas after sunset
  if (rule === "nishita") return sunset + night * 0.5; // the night's middle muhurta
  return sunrise;
}

export type CalendarDay = {
  date: string;
  vara: string;
  offsetHours: number;
  sunrise: string | null;
  sunset: string | null;
  nextSunrise: string | null;
  /** Limbs overlapping sunrise → next sunrise; the first one prevails at sunrise. */
  tithi: LimbSpan[];
  nakshatra: LimbSpan[];
  yoga?: LimbSpan[];
  karana?: LimbSpan[];
  /** Detailed view only: moonrise / moonset within the local date. */
  moon?: { moonrise: string | null; moonset: string | null };
  masa: { amanta: string; adhika: boolean; purnimanta: string | null };
  ritu: string;
  ayana: string;
  sunSign: string;
  sankranti: { sign: string; instantIso: string } | null;
  observances: Observance[];
};

const VARAS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export type CalendarRangeInput = {
  startDate: string;
  days: number;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
  /** Yoga and karana are only needed for the detailed day view. */
  detailed?: boolean;
};

/**
 * A run of consecutive local days. Sunrise anchors each day; limbs come from
 * one continuous transition list so neighbouring days always agree.
 */
export function buildCalendarRange(input: CalendarRangeInput): CalendarDay[] {
  const sample = siderealSampler();
  // One padding day on each side (index −1 and days, days+1) so a single-day
  // request assigns tithis and festivals exactly as the month view does.
  const dates = Array.from({ length: input.days + 3 }, (_, i) => addDays(input.startDate, i - 1));
  const padded: Array<{ date: string; offset: number; midnight: number; sunrise: number | null; sunset: number | null }> = [];
  for (const date of dates) {
    const offset = offsetFor(date, input.timezone, input.timezoneOffset);
    const midnight = localMidnightJd(date, offset);
    padded.push({ date, offset, midnight, ...localSolarDay(midnight, input.latitude, input.longitude, padded[padded.length - 1]) });
  }
  const solarAt = (i: number) => padded[i + 1];
  // Polar days without a sunrise fall back to local midnight as the day anchor.
  const anchor = (i: number) => solarAt(i).sunrise ?? solarAt(i).midnight;
  const from = anchor(-1),
    to = anchor(input.days + 1);
  const kinds: LimbKind[] = input.detailed ? ["tithi", "nakshatra", "yoga", "karana"] : ["tithi", "nakshatra"];
  const spans = Object.fromEntries(kinds.map((kind) => [kind, limbSpans(kind, from, to, sample)])) as Record<
    LimbKind,
    LimbSpan[]
  >;
  const within = (list: LimbSpan[], a: number, b: number) =>
    list.filter((span) => span.endJulianDay > a && span.startJulianDay < b);

  // Lunar months: new moons are the ends of the Amavasya spans already found;
  // only the months' outer edges need a separate search.
  const newMoons = [
    newMoonBefore(spans.tithi[0].startJulianDay, sample),
    ...spans.tithi.filter((span) => span.index === 29).map((span) => span.endJulianDay),
  ];
  const lastNewMoon = newMoons[newMoons.length - 1];
  newMoons.push(newMoonBefore(lastNewMoon + 31, sample));
  const months: LunarMonth[] = [];
  for (let i = 0; i + 1 < newMoons.length; i++) {
    if (newMoons[i + 1] - newMoons[i] < 1) continue; // duplicate of the same new moon
    const startSign = Math.floor(siderealSun(newMoons[i]) / 30),
      endSign = Math.floor(siderealSun(newMoons[i + 1]) / 30);
    months.push({
      name: MASAS[(startSign + 1) % 12],
      adhika: startSign === endSign,
      startJulianDay: newMoons[i],
      endJulianDay: newMoons[i + 1],
      startIso: jdToIso(newMoons[i]),
      endIso: jdToIso(newMoons[i + 1]),
    });
  }
  const monthAt = (jd: number) => months.find((m) => jd >= m.startJulianDay && jd < m.endJulianDay) ?? months[months.length - 1];

  // Each tithi is assigned to the day where it prevails at sunrise; a kshaya
  // tithi (never at a sunrise) is assigned to the day it falls within.
  const tithiDay = new Map<LimbSpan, number>();
  for (const span of spans.tithi) {
    let day: number | null = null;
    for (let i = -1; i <= input.days; i++) {
      const a = anchor(i);
      if (span.startJulianDay <= a && span.endJulianDay > a) {
        day = i;
        break;
      }
    }
    if (day === null)
      for (let i = -1; i <= input.days; i++)
        if (span.startJulianDay >= anchor(i) && span.startJulianDay < anchor(i + 1)) day = i;
    if (day !== null) tithiDay.set(span, day);
  }

  // Festivals: first day whose karmakala lies inside the tithi, else the udaya day.
  const festivalsByDay = new Map<number, Observance[]>();
  for (const span of spans.tithi) {
    const month = monthAt((span.startJulianDay + span.endJulianDay) / 2);
    if (month.adhika) continue;
    for (const f of TITHI_FESTIVALS) {
      if (f.masa !== month.name || f.tithi !== span.number) continue;
      let day: number | null = null;
      for (let i = -1; i <= input.days && day === null; i++) {
        const rise = solarAt(i).sunrise,
          set = solarAt(i).sunset,
          next = solarAt(i + 1).sunrise;
        if (rise === null || set === null || next === null) continue;
        const moment = karmakalaMoment(f.rule, rise, set, next);
        if (span.startJulianDay <= moment && span.endJulianDay > moment) day = i;
      }
      day ??= tithiDay.get(span) ?? null;
      if (day === null || day < 0 || day >= input.days) continue;
      const list = festivalsByDay.get(day) ?? [];
      list.push({ id: f.id, kind: "festival", en: f.en, te: f.te, rule: f.rule });
      festivalsByDay.set(day, list);
    }
  }

  return dates.slice(1, input.days + 1).map((date, i) => {
    const a = anchor(i),
      b = anchor(i + 1);
    const sunNow = siderealSun(a),
      sunNext = siderealSun(b),
      signNow = Math.floor(sunNow / 30),
      signNext = Math.floor(sunNext / 30);
    let sankranti: CalendarDay["sankranti"] = null;
    if (signNow !== signNext) {
      const boundary = signNext * 30;
      let lo = a,
        hi = b;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        if (signed(siderealSun(mid) - boundary) < 0) lo = mid;
        else hi = mid;
      }
      sankranti = { sign: SIGNS[signNext], instantIso: jdToIso((lo + hi) / 2) };
    }
    const month = monthAt(a);
    const tithis = within(spans.tithi, a, b);
    const udaya = tithis[0];
    const observances: Observance[] = [...(festivalsByDay.get(i) ?? [])];
    for (const [span, day] of tithiDay)
      if (day === i) {
        const n = span.number!;
        if (n === 11 || n === 26)
          observances.push({
            id: "ekadashi",
            kind: "vrata",
            en: `${n === 11 ? "Shukla" : "Krishna"} Ekadashi`,
            te: `${n === 11 ? "శుక్ల" : "కృష్ణ"} ఏకాదశి`,
          });
        if (n === 15) observances.push({ id: "purnima", kind: "lunar", en: "Purnima — full moon", te: "పౌర్ణమి" });
        if (n === 30) observances.push({ id: "amavasya", kind: "lunar", en: "Amavasya — new moon", te: "అమావాస్య" });
      }
    if (sankranti) {
      const makara = sankranti.sign === "Makara";
      observances.push({
        id: makara ? "makara-sankranti" : "sankranti",
        kind: "solar",
        en: makara ? "Makara Sankranti" : `${sankranti.sign} Sankranti`,
        te: makara ? "మకర సంక్రాంతి" : `${sankranti.sign} సంక్రమణం`,
      });
    }
    const purnimanta = month.adhika
      ? null
      : udaya && udaya.paksha === "Krishna"
        ? MASAS[(MASAS.indexOf(month.name) + 1) % 12]
        : month.name;
    const [y, m, d] = date.split("-").map(Number);
    return {
      date,
      vara: VARAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
      offsetHours: solarAt(i).offset,
      sunrise: solarAt(i).sunrise === null ? null : jdToIso(solarAt(i).sunrise!),
      sunset: solarAt(i).sunset === null ? null : jdToIso(solarAt(i).sunset!),
      nextSunrise: solarAt(i + 1).sunrise === null ? null : jdToIso(solarAt(i + 1).sunrise!),
      ...(input.detailed ? { moon: localLunarDay(solarAt(i).midnight, solarAt(i + 1).midnight, input.latitude, input.longitude) } : {}),
      tithi: tithis,
      nakshatra: within(spans.nakshatra, a, b),
      ...(input.detailed ? { yoga: within(spans.yoga, a, b), karana: within(spans.karana, a, b) } : {}),
      masa: { amanta: month.name, adhika: month.adhika, purnimanta },
      ritu: rituForSunSign(signNow),
      ayana: ayanaForSunSign(signNow),
      sunSign: SIGNS[signNow],
      sankranti,
      observances,
    };
  });
}

/** Month grid (all days of a Gregorian month) for a location. */
export function buildCalendarMonth(input: Omit<CalendarRangeInput, "startDate" | "days" | "detailed"> & { year: number; month: number }) {
  const days = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
  const startDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
  return {
    schemaVersion: "sahadeva-panchanga-month-1",
    year: input.year,
    month: input.month,
    location: { latitude: input.latitude, longitude: input.longitude, timezone: input.timezone ?? null },
    conventions: {
      ayanamsa: "Lahiri (mean)",
      sunrise: "upper limb, −0.833° with refraction",
      limbs: "udaya — the limb at local sunrise names the day; later limbs list their start",
      masa: "amanta (new moon to new moon), named by the Sun's sidereal sign at the opening new moon; adhika when no Sankranti falls inside",
      observances: OBSERVANCE_BASIS,
    },
    days: buildCalendarRange({ ...input, startDate, days }),
  };
}
