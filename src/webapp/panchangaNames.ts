// Bilingual names for the panchanga calendar.
import { TELUGU_KARANAS, TELUGU_TITHIS, TELUGU_VARAS, TELUGU_YOGAS } from "../../shared/telugu";
import type { Lang } from "./api";
import { nakName } from "./format";

const MASA_TE: Record<string, string> = {
  Chaitra: "చైత్రం", Vaishakha: "వైశాఖం", Jyeshtha: "జ్యేష్ఠం", Ashadha: "ఆషాఢం",
  Shravana: "శ్రావణం", Bhadrapada: "భాద్రపదం", Ashvayuja: "ఆశ్వయుజం", Kartika: "కార్తీకం",
  Margashira: "మార్గశిరం", Pushya: "పుష్యం", Magha: "మాఘం", Phalguna: "ఫాల్గుణం",
};
const RITU_TE: Record<string, string> = {
  Vasanta: "వసంత ఋతువు", Grishma: "గ్రీష్మ ఋతువు", Varsha: "వర్ష ఋతువు",
  Sharad: "శరద్ ఋతువు", Hemanta: "హేమంత ఋతువు", Shishira: "శిశిర ఋతువు",
};
const RITU_EN: Record<string, string> = {
  Vasanta: "Vasanta (spring)", Grishma: "Grishma (summer)", Varsha: "Varsha (monsoon)",
  Sharad: "Sharad (autumn)", Hemanta: "Hemanta (pre-winter)", Shishira: "Shishira (winter)",
};
const AYANA_TE: Record<string, string> = { Uttarayana: "ఉత్తరాయణం", Dakshinayana: "దక్షిణాయనం" };
const CHOGHADIYA_TE: Record<string, string> = {
  Amrit: "అమృత", Shubh: "శుభ", Labh: "లాభ", Char: "చర", Udveg: "ఉద్వేగ", Kaal: "కాల", Rog: "రోగ",
};
const CHOGHADIYA_EN: Record<string, string> = {
  Amrit: "Amrit · nectar", Shubh: "Shubh · auspicious", Labh: "Labh · gain", Char: "Char · moving",
  Udveg: "Udveg · anxious", Kaal: "Kaal · loss", Rog: "Rog · illness",
};

export const WEEKDAY_SHORT = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  te: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
};
export const MONTH_LONG = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  te: ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్"],
};

export function masaName(name: string, adhika: boolean, lang: Lang): string {
  const base = lang === "te" ? MASA_TE[name] || name : name;
  return adhika ? (lang === "te" ? `అధిక ${base}` : `Adhika ${base}`) : base;
}
export function rituName(name: string, lang: Lang) {
  return (lang === "te" ? RITU_TE : RITU_EN)[name] || name;
}
export function ayanaName(name: string, lang: Lang) {
  return lang === "te" ? AYANA_TE[name] || name : name;
}
export function varaName(name: string, lang: Lang) {
  return lang === "te" ? TELUGU_VARAS[name] || name : name;
}
export function pakshaName(paksha: string, lang: Lang) {
  if (lang === "te") return paksha === "Krishna" ? "కృష్ణ పక్షం" : "శుక్ల పక్షం";
  return paksha === "Krishna" ? "Krishna paksha (waning)" : "Shukla paksha (waxing)";
}
export function tithiName(name: string, lang: Lang) {
  if (lang !== "te") return name;
  return name === "Amavasya" ? "అమావాస్య" : TELUGU_TITHIS[name] || name;
}
export function yogaName(name: string, lang: Lang) {
  return lang === "te" ? TELUGU_YOGAS[name] || name : name;
}
export function karanaName(name: string, lang: Lang) {
  return lang === "te" ? TELUGU_KARANAS[name] || name : name;
}
export function limbName(kind: "tithi" | "nakshatra" | "yoga" | "karana", name: string, lang: Lang) {
  if (kind === "tithi") return tithiName(name, lang);
  if (kind === "nakshatra") return nakName(name, lang);
  if (kind === "yoga") return yogaName(name, lang);
  return karanaName(name, lang);
}
export function choghadiyaName(name: string, lang: Lang) {
  return (lang === "te" ? CHOGHADIYA_TE : CHOGHADIYA_EN)[name] || name;
}
