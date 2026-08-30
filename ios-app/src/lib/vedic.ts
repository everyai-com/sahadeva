// Vedic naming constants, mirrored from shared/constants.ts and shared/telugu.ts
// (the mobile bundle stays self-contained; the worker remains the source of truth
// for every calculation).
export const SIGNS = ["Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya","Tula","Vrischika","Dhanu","Makara","Kumbha","Meena"] as const;
export const TELUGU_SIGNS = ["మేషం","వృషభం","మిథునం","కర్కాటకం","సింహం","కన్య","తుల","వృశ్చికం","ధనుస్సు","మకరం","కుంభం","మీనం"] as const;
export const NAKSHATRAS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"] as const;
export const TELUGU_NAKSHATRAS = ["అశ్విని","భరణి","కృత్తిక","రోహిణి","మృగశిర","ఆరుద్ర","పునర్వసు","పుష్యమి","ఆశ్లేష","మఖ","పూర్వ ఫల్గుణి","ఉత్తర ఫల్గుణి","హస్త","చిత్త","స్వాతి","విశాఖ","అనూరాధ","జ్యేష్ఠ","మూల","పూర్వాషాఢ","ఉత్తరాషాఢ","శ్రవణం","ధనిష్ఠ","శతభిషం","పూర్వాభాద్ర","ఉత్తరాభాద్ర","రేవతి"] as const;
export const TELUGU_GRAHAS: Record<string, string> = { Sun: "సూర్యుడు", Moon: "చంద్రుడు", Mars: "కుజుడు", Mercury: "బుధుడు", Jupiter: "గురువు", Venus: "శుక్రుడు", Saturn: "శని", Rahu: "రాహువు", Ketu: "కేతువు", Lagna: "లగ్నం" };
export const TELUGU_VARAS: Record<string, string> = { Sunday: "ఆదివారం", Monday: "సోమవారం", Tuesday: "మంగళవారం", Wednesday: "బుధవారం", Thursday: "గురువారం", Friday: "శుక్రవారం", Saturday: "శనివారం" };
export const TELUGU_TITHIS: Record<string, string> = { Pratipada: "పాడ్యమి", Dwitiya: "విదియ", Tritiya: "తదియ", Chaturthi: "చవితి", Panchami: "పంచమి", Shashthi: "షష్ఠి", Saptami: "సప్తమి", Ashtami: "అష్టమి", Navami: "నవమి", Dashami: "దశమి", Ekadashi: "ఏకాదశి", Dwadashi: "ద్వాదశి", Trayodashi: "త్రయోదశి", Chaturdashi: "చతుర్దశి", Purnima: "పౌర్ణమి", Amavasya: "అమావాస్య" };
export const TELUGU_PAKSHAS: Record<string, string> = { Shukla: "శుక్ల పక్షం", Krishna: "కృష్ణ పక్షం" };

const SIGN_INDEX: Record<string, number> = Object.fromEntries(SIGNS.map((sign, index) => [sign, index]));
const NAK_INDEX: Record<string, number> = Object.fromEntries(NAKSHATRAS.map((name, index) => [name, index]));

export function signLabel(sign: number | string | undefined, te: boolean): string {
  if (sign === undefined) return "";
  const index = typeof sign === "number" ? sign : SIGN_INDEX[sign] ?? -1;
  if (index < 0 || index > 11) return String(sign);
  return te ? TELUGU_SIGNS[index] : SIGNS[index];
}

export function nakshatraLabel(name: string | undefined, te: boolean): string {
  if (!name) return "";
  const index = NAK_INDEX[name];
  return te && index !== undefined ? TELUGU_NAKSHATRAS[index] : name;
}

export function grahaLabel(name: string | undefined, te: boolean): string {
  if (!name) return "";
  return te ? TELUGU_GRAHAS[name] || name : name;
}

export function localizeMap(value: string | null | undefined, te: boolean, map: Record<string, string>): string {
  if (!value) return "";
  return te ? map[value] || value : value;
}

// Vimshottari helpers (same arithmetic as the web workspace)
export const VIM_YEARS: Record<string, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
export const VIM_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"] as const;
export const jdToDate = (jd: number) => new Date((jd - 2440587.5) * 86400000);
export const nowJd = () => Date.now() / 86400000 + 2440587.5;

// Short graha tokens used inside chart cells.
export function grahaShort(name: string, te: boolean): string {
  if (name === "Lagna") return te ? "ల" : "Lg";
  if (te) {
    const map: Record<string, string> = { Sun: "సూ", Moon: "చం", Mars: "కు", Mercury: "బు", Jupiter: "గు", Venus: "శు", Saturn: "శ", Rahu: "రా", Ketu: "కే" };
    return map[name] || name.slice(0, 2);
  }
  return name.slice(0, 2);
}
