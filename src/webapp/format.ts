import { NAKSHATRAS, SIGNS } from "../../shared/constants";
import { TELUGU_NAKSHATRAS, TELUGU_SIGNS } from "../../shared/telugu";
import type { Lang } from "./api";

export const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MON_TE = ["జన", "ఫిబ్ర", "మార్చి", "ఏప్రి", "మే", "జూన్", "జూలై", "ఆగ", "సెప్టెం", "అక్టో", "నవం", "డిసెం"];

/** Parts of an ISO instant shifted into the profile's UTC offset (hours). */
function localParts(iso: string, tzOffset: number) {
  const d = new Date(new Date(iso).getTime() + tzOffset * 3_600_000);
  return {
    y: d.getUTCFullYear(),
    mo: d.getUTCMonth(),
    day: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
  };
}

/** "9:03 am" in local time. */
export function clock(iso: string | undefined, tzOffset: number): string {
  if (!iso) return "—";
  const { h, mi } = localParts(iso, tzOffset);
  const ap = h >= 12 ? "pm" : "am";
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr}:${String(mi).padStart(2, "0")} ${ap}`;
}

/** "9:03" (no am/pm) in local time — for range pairs sharing a suffix. */
export function clockBare(iso: string | undefined, tzOffset: number): string {
  if (!iso) return "—";
  const { h, mi } = localParts(iso, tzOffset);
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr}:${String(mi).padStart(2, "0")}`;
}

/** "9:03 – 10:36 am": bare start, full end. */
export function windowRange(startIso: string, endIso: string, tzOffset: number): string {
  return `${clockBare(startIso, tzOffset)} – ${clock(endIso, tzOffset)}`;
}

/** Minutes since local midnight for an ISO instant in the given offset. */
export function minutesOfDay(iso: string, tzOffset: number): number {
  const { h, mi } = localParts(iso, tzOffset);
  return h * 60 + mi;
}

/** Current wall-clock minutes since midnight in the given offset. */
export function nowMinutes(tzOffset: number): number {
  const d = new Date(Date.now() + tzOffset * 3_600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** "May 2028" / "మే 2028" (from an ISO date, UTC parts). */
export function monthYear(iso: string, lang: Lang): string {
  const p = iso.slice(0, 10).split("-");
  const mon = (lang === "te" ? MON_TE : MON_EN)[Number(p[1]) - 1];
  return `${mon} ${p[0]}`;
}

/** "26 May 2028" / "26 మే 2028". */
export function dayMonthYear(iso: string, lang: Lang): string {
  const p = iso.slice(0, 10).split("-");
  const mon = (lang === "te" ? MON_TE : MON_EN)[Number(p[1]) - 1];
  return `${Number(p[2])} ${mon} ${p[0]}`;
}

/** Decimal degrees-in-sign → `18°18′`. */
export function dms(degree: number): string {
  const d = Math.floor(degree);
  const mi = Math.round((degree - d) * 60);
  const dd = mi === 60 ? d + 1 : d;
  const mm = mi === 60 ? 0 : mi;
  return `${dd}°${String(mm).padStart(2, "0")}′`;
}

export function signName(index: number, lang: Lang): string {
  if (index < 0 || index > 11) return "";
  return lang === "te" ? TELUGU_SIGNS[index] : SIGNS[index];
}

export function nakIndex(name: string): number {
  return NAKSHATRAS.indexOf(name as (typeof NAKSHATRAS)[number]);
}

export function nakName(name: string, lang: Lang): string {
  const i = nakIndex(name);
  if (i < 0) return name;
  return lang === "te" ? TELUGU_NAKSHATRAS[i] : NAKSHATRAS[i];
}

/* ── graha display names (English · Telugu · Tamil transliteration) ─────── */

type GrahaInfo = { en: string; te: string; tr: string; abbr: string };
export const GRAHA: Record<string, GrahaInfo> = {
  Sun: { en: "Sun", te: "సూర్యుడు", tr: "Surya · సూర్యుడు · சூரியன்", abbr: "Su" },
  Moon: { en: "Moon", te: "చంద్రుడు", tr: "Chandra · చంద్రుడు · சந்திரன்", abbr: "Mo" },
  Mars: { en: "Mars", te: "కుజుడు", tr: "Kuja · కుజుడు · செவ்வாய்", abbr: "Ma" },
  Mercury: { en: "Mercury", te: "బుధుడు", tr: "Budha · బుధుడు · புதன்", abbr: "Bu" },
  Jupiter: { en: "Jupiter", te: "గురువు", tr: "Guru · గురువు · குரு", abbr: "Gu" },
  Venus: { en: "Venus", te: "శుక్రుడు", tr: "Shukra · శుక్రుడు · சுக்கிரன்", abbr: "Sk" },
  Saturn: { en: "Saturn", te: "శని", tr: "Shani · శని · சனி", abbr: "Sa" },
  Rahu: { en: "Rahu", te: "రాహువు", tr: "Rahu · రాహువు · ராகு", abbr: "Ra" },
  Ketu: { en: "Ketu", te: "కేతువు", tr: "Ketu · కేతువు · கேது", abbr: "Ke" },
  Lagna: { en: "Lagna", te: "లగ్నం", tr: "Lagna · లగ్నం · லக்னம்", abbr: "Lg" },
};

/** One-word traditional "character" of each planet's period (dasha screen). */
export const GRAHA_CHAR: Record<string, { en: string; te: string }> = {
  Mars: { en: "Driven", te: "చురుకు" },
  Rahu: { en: "Unsettled", te: "అస్థిరం" },
  Jupiter: { en: "Expansive", te: "విస్తరణ" },
  Saturn: { en: "Demanding", te: "కఠినం" },
  Mercury: { en: "Busy", te: "బిజీ" },
  Ketu: { en: "Detaching", te: "వైరాగ్యం" },
  Venus: { en: "Comfortable", te: "సౌఖ్యం" },
  Sun: { en: "Exposed", te: "బహిర్గతం" },
  Moon: { en: "Changeable", te: "మార్పు" },
};

export function grahaChar(name: string, lang: Lang): string {
  const c = GRAHA_CHAR[name];
  return c ? (lang === "te" ? c.te : c.en) : "";
}

export function grahaTr(name: string): string {
  return GRAHA[name]?.tr ?? name;
}

export function grahaName(name: string, lang: Lang): string {
  const g = GRAHA[name];
  if (!g) return name;
  return lang === "te" ? g.te : g.en;
}
export function grahaAbbr(name: string): string {
  return GRAHA[name]?.abbr ?? name.slice(0, 2);
}

/** Whole-sign lords, index 0 = Mesha … 11 = Meena. */
export const SIGN_LORDS = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];

/* ── tara bala / chandra bala (computed client-side) ───────────────────── */

const TARA_NAMES_EN = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhaka", "Naidhana", "Mitra", "Parama Mitra"];
const TARA_NAMES_TE = ["జన్మ", "సంపత్", "విపత్", "క్షేమ", "ప్రత్యక్", "సాధక", "నైధన", "మిత్ర", "పరమ మిత్ర"];
const TARA_FAVORABLE = new Set([2, 4, 6, 8, 9]); // cyclePosition
const CHANDRA_FAVORABLE = new Set([1, 3, 6, 7, 10, 11]);

export function taraBala(birthNak: string, todayNak: string) {
  const b = nakIndex(birthNak);
  const t = nakIndex(todayNak);
  if (b < 0 || t < 0) return null;
  const count = ((t - b + 27) % 27) + 1;
  const cyclePosition = ((count - 1) % 9) + 1;
  return {
    count,
    cyclePosition,
    nameEn: TARA_NAMES_EN[cyclePosition - 1],
    nameTe: TARA_NAMES_TE[cyclePosition - 1],
    favorable: TARA_FAVORABLE.has(cyclePosition),
  };
}

export function chandraBala(natalMoonSign: number, transitMoonSign: number) {
  const house = ((transitMoonSign - natalMoonSign + 12) % 12) + 1;
  return { house, favorable: CHANDRA_FAVORABLE.has(house) };
}
