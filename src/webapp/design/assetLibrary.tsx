import type { ImgHTMLAttributes } from "react";

const families = {
  graha: ["surya", "chandra", "mangala", "budha", "guru", "shukra", "shani", "rahu", "ketu"],
  rashi: ["mesha", "vrishabha", "mithuna", "karka", "simha", "kanya", "tula", "vrischika", "dhanus", "makara", "kumbha", "mina"],
  bhava: ["tanu", "dhana", "sahaja", "bandhu", "putra", "ari", "yuvati", "randhra", "dharma", "karma", "labha", "vyaya"],
  nakshatra: ["ashwini", "bharani", "krittika", "rohini", "mrigashirsha", "ardra", "punarvasu", "pushya", "ashlesha", "magha", "purva-phalguni", "uttara-phalguni", "hasta", "chitra", "swati", "vishakha", "anuradha", "jyeshtha", "mula", "purva-ashadha", "uttara-ashadha", "shravana", "dhanishtha", "shatabhisha", "purva-bhadrapada", "uttara-bhadrapada", "revati"],
  "life-area": ["career", "business", "money", "marriage", "love", "children", "family", "health", "education", "home", "property", "travel"],
  remedy: ["mantra", "puja", "temple", "dana", "vrata", "gemstone", "yantra", "homa", "seva"],
  timing: ["sunrise", "sunset", "rahu-kala", "yamagandam", "gulika", "abhijit", "durmuhurta"],
  tithi: Array.from({ length: 30 }, (_, index) => String(index + 1)),
  yoga: ["vishkambha", "priti", "ayushman", "saubhagya", "shobhana", "atiganda", "sukarma", "dhriti", "shula", "ganda", "vriddhi", "dhruva", "vyaghata", "harshana", "vajra", "siddhi", "vyatipata", "variyan", "parigha", "shiva", "siddha", "sadhya", "shubha", "shukla", "brahma", "indra", "vaidhriti"],
  karana: ["bava", "balava", "kaulava", "taitila", "gara", "vanija", "vishti", "shakuni", "chatushpada", "naga", "kimstughna"],
} as const;

export type SahadevaAssetFamily = keyof typeof families;
export type SahadevaAssetSize = 20 | 24 | 32 | 48 | 128;

const sizedFamilies: Record<SahadevaAssetFamily, readonly number[]> = {
  graha: [24, 48, 128], rashi: [24, 48, 128], bhava: [24, 48, 128],
  nakshatra: [24, 128], "life-area": [24, 48], remedy: [24, 48], timing: [24, 48],
  tithi: [], yoga: [], karana: [],
};

export const SAHADEVA_ASSET_FAMILIES = families;

export const GRAHA_ALIASES: Readonly<Record<string, string>> = {
  sun: "surya", surya: "surya", moon: "chandra", chandra: "chandra",
  mars: "mangala", mangala: "mangala", mercury: "budha", budha: "budha",
  jupiter: "guru", guru: "guru", venus: "shukra", shukra: "shukra",
  saturn: "shani", shani: "shani", rahu: "rahu", ketu: "ketu",
};

function closestSize(requested: SahadevaAssetSize, available: readonly number[]) {
  return available.reduce((best, candidate) =>
    Math.abs(candidate - requested) < Math.abs(best - requested) ? candidate : best,
  available[0]);
}

export function normalizeAssetId(family: SahadevaAssetFamily, id: string | number): string {
  if (family === "tithi") return String(Number(id));
  const normalized = String(id).trim().toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  return family === "graha" ? (GRAHA_ALIASES[normalized] ?? normalized) : normalized;
}

export function sahadevaAssetPath(family: SahadevaAssetFamily, id: string | number, size: SahadevaAssetSize = 24): string {
  const normalized = normalizeAssetId(family, id);
  const ids = families[family] as readonly string[];
  if (!ids.includes(normalized)) throw new Error(`Unknown Sahadeva asset: ${family}.${normalized}`);

  if (family === "tithi") return `/brand/sahadeva/panchanga/tithi/tithi-${normalized.padStart(2, "0")}.svg`;
  if (family === "yoga" || family === "karana") return `/brand/sahadeva/panchanga/${family}/${normalized}.svg`;

  const resolvedSize = closestSize(size, sizedFamilies[family]);
  return `/brand/sahadeva/${family}/${normalized}-${resolvedSize}.svg`;
}

function readableName(id: string | number) {
  return String(id).replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export type SahadevaIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  family: SahadevaAssetFamily;
  name: string | number;
  size?: SahadevaAssetSize;
  decorative?: boolean;
};

export function SahadevaIcon({ family, name, size = 24, decorative = false, alt, ...props }: SahadevaIconProps) {
  const normalized = normalizeAssetId(family, name);
  return (
    <img
      {...props}
      src={sahadevaAssetPath(family, normalized, size)}
      width={size}
      height={size}
      alt={decorative ? "" : (alt ?? `${readableName(normalized)} symbol`)}
      aria-hidden={decorative || undefined}
    />
  );
}

