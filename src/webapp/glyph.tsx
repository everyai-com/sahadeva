import type { CSSProperties } from "react";

/*
 * Canonical Sahadeva glyphs, vendored from everyai-com/sahadeva-asset-library
 * into /public/glyphs by `npm run assets:sync`. The micro glyphs are drawn in
 * `currentColor`, so they are rendered as a CSS mask and inherit text colour —
 * they tint correctly in light, dark and forced-colours modes.
 *
 * Design rule from the library: an unfamiliar symbol is always paired with a
 * visible name, so glyphs here are decorative unless a `label` is supplied.
 */

export type GlyphFamily =
  | "graha"
  | "rashi"
  | "bhava"
  | "nakshatra"
  | "life-area"
  | "remedy"
  | "timing"
  | "tithi"
  | "yoga"
  | "karana";

const GRAHA: Record<string, string> = {
  sun: "surya", moon: "chandra", mars: "mangala", mercury: "budha", jupiter: "guru",
  venus: "shukra", saturn: "shani", rahu: "rahu", ketu: "ketu",
  surya: "surya", chandra: "chandra", mangala: "mangala", kuja: "mangala", budha: "budha",
  guru: "guru", brihaspati: "guru", shukra: "shukra", sukra: "shukra", shani: "shani", sani: "shani",
};

export const RASHI_IDS = [
  "mesha", "vrishabha", "mithuna", "karka", "simha", "kanya",
  "tula", "vrischika", "dhanus", "makara", "kumbha", "mina",
] as const;

const RASHI_ALIASES: Record<string, string> = {
  vrisha: "vrishabha", vrishabh: "vrishabha", karkata: "karka", karkataka: "karka", kataka: "karka",
  vrishchika: "vrischika", vrisch: "vrischika", dhanu: "dhanus", meena: "mina",
};

export const BHAVA_IDS = [
  "tanu", "dhana", "sahaja", "bandhu", "putra", "ari",
  "yuvati", "randhra", "dharma", "karma", "labha", "vyaya",
] as const;

const NAKSHATRA_ALIASES: Record<string, string> = {
  mrigashira: "mrigashirsha", mrigasira: "mrigashirsha", aswini: "ashwini", aslesha: "ashlesha",
  moola: "mula", jyeshta: "jyeshtha", dhanishta: "dhanishtha", shatabhishak: "shatabhisha",
  satabhisha: "shatabhisha", sravana: "shravana", visakha: "vishakha", swathi: "swati",
  chitta: "chitra", purvabhadra: "purva-bhadrapada", uttarabhadra: "uttara-bhadrapada",
};

const YOGA_ALIASES: Record<string, string> = { variyana: "variyan", vyatipaata: "vyatipata" };
const KARANA_ALIASES: Record<string, string> = { garaja: "gara", kintughna: "kimstughna" };

const TITHI_NAMES = [
  "pratipada", "dwitiya", "tritiya", "chaturthi", "panchami", "shashthi", "saptami", "ashtami",
  "navami", "dashami", "ekadashi", "dwadashi", "trayodashi", "chaturdashi", "purnima",
];

function slug(raw: string): string {
  return raw.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s_]+/g, "-");
}

/**
 * Tithi number 1–30 (1–15 Shukla, 16–30 Krishna; 30 = Amavasya) from the
 * engine's name and paksha.
 */
export function tithiNumber(name: string, paksha?: string): number | null {
  const n = slug(name);
  if (n === "amavasya" || n === "amavasi") return 30;
  const i = TITHI_NAMES.indexOf(n);
  if (i < 0) return null;
  const krishna = /krishna|bahula|dark|waning/i.test(paksha ?? "");
  return krishna && i < 14 ? 16 + i : i + 1;
}

/** Public path of a glyph, or null if the library has no such entity. */
export function glyphSrc(family: GlyphFamily, id: string | number, paksha?: string): string | null {
  let key: string | undefined;
  switch (family) {
    case "graha":
      key = GRAHA[slug(String(id))];
      break;
    case "rashi":
      if (typeof id === "number") key = RASHI_IDS[((id % 12) + 12) % 12];
      else {
        const s = slug(id);
        key = (RASHI_IDS as readonly string[]).includes(s) ? s : RASHI_ALIASES[s];
      }
      break;
    case "bhava":
      key = typeof id === "number" ? BHAVA_IDS[(id - 1 + 12) % 12] : slug(id);
      break;
    case "nakshatra": {
      const s = slug(String(id));
      key = NAKSHATRA_ALIASES[s.replace(/-/g, "")] ?? NAKSHATRA_ALIASES[s] ?? s;
      break;
    }
    case "tithi": {
      const n = typeof id === "number" ? id : tithiNumber(id, paksha);
      if (!n || n < 1 || n > 30) return null;
      return `/glyphs/tithi/tithi-${String(n).padStart(2, "0")}.svg`;
    }
    case "yoga": {
      const s = slug(String(id));
      key = YOGA_ALIASES[s] ?? s;
      break;
    }
    case "karana": {
      const s = slug(String(id));
      key = KARANA_ALIASES[s] ?? s;
      break;
    }
    default:
      key = slug(String(id));
  }
  if (!key || !/^[a-z-]+$/.test(key)) return null;
  if (family === "nakshatra" && !NAKSHATRA_SET.has(key)) return null;
  if (family === "yoga" && !YOGA_SET.has(key)) return null;
  if (family === "karana" && !KARANA_SET.has(key)) return null;
  return `/glyphs/${family}/${key}.svg`;
}

const NAKSHATRA_SET = new Set([
  "ashwini", "bharani", "krittika", "rohini", "mrigashirsha", "ardra", "punarvasu", "pushya", "ashlesha",
  "magha", "purva-phalguni", "uttara-phalguni", "hasta", "chitra", "swati", "vishakha", "anuradha",
  "jyeshtha", "mula", "purva-ashadha", "uttara-ashadha", "shravana", "dhanishtha", "shatabhisha",
  "purva-bhadrapada", "uttara-bhadrapada", "revati",
]);
const YOGA_SET = new Set([
  "vishkambha", "priti", "ayushman", "saubhagya", "shobhana", "atiganda", "sukarma", "dhriti", "shula",
  "ganda", "vriddhi", "dhruva", "vyaghata", "harshana", "vajra", "siddhi", "vyatipata", "variyan",
  "parigha", "shiva", "siddha", "sadhya", "shubha", "shukla", "brahma", "indra", "vaidhriti",
]);
const KARANA_SET = new Set([
  "bava", "balava", "kaulava", "taitila", "gara", "vanija", "vishti", "shakuni", "chatushpada", "naga", "kimstughna",
]);

type GlyphProps = {
  family: GlyphFamily;
  id: string | number;
  paksha?: string;
  /** Pixel size of the square glyph (default 20). */
  size?: number;
  /** Accessible name. Omit when a visible label sits next to the glyph. */
  label?: string;
  className?: string;
};

/** A tintable Sahadeva glyph. Renders nothing for unknown entities. */
export function Glyph({ family, id, paksha, size = 20, label, className }: GlyphProps) {
  const src = glyphSrc(family, id, paksha);
  if (!src) return null;
  const style = { "--glyph": `url("${src}")`, width: size, height: size } as CSSProperties;
  return (
    <span
      className={`glyph glyph--${family}${family === "graha" ? ` glyph--${src.split("/").pop()!.replace(".svg", "")}` : ""}${className ? ` ${className}` : ""}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
