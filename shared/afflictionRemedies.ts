import type { ChartResult, GrahaName } from "./schema";

// Chart-condition -> classical remedy mapping. This fills the gap where the
// remedy engine had a strong safety framework but almost no chart-specific
// content. It detects concrete afflictions from data the chart already computes
// (dignity, combustion, dusthana placement, running dasha) and maps each
// afflicted graha to LOW-RISK, gate-safe remedy families only: conduct
// (behavioural), charity (generic affordable giving, themed), and prayer
// (familiar, user-chosen orientation). Mantras, gemstones, fasting and costly
// ritual are intentionally NOT produced here — those stay gated behind review.

export interface AfflictionPreferences {
  beliefMode?: "hindu" | "spiritual" | "tradition-specific";
  maximumBurden?: "minimal" | "moderate";
  maximumCost?: "free" | "low";
  allowPrayer?: boolean;
  allowCharity?: boolean;
}

interface PlanetTheme {
  quality: string;
  conduct: string;
  charityTheme: string;
  deity: string;
  weekday: string;
  color: string;
  direction: string;
}

// All content here is widely-published, non-fear-based, free or low-cost, and
// framed as reflective conduct rather than a supernatural transaction.
const PLANET_THEMES: Record<string, PlanetTheme> = {
  Sun: {
    quality: "confidence, vitality and your relationship to authority",
    conduct:
      "Act with steady integrity and treat your father and people in authority with respect. Rise early and let the day start with a clear intention.",
    charityTheme: "wheat, jaggery or clean water for someone in need",
    deity: "Surya",
    weekday: "Sunday",
    color: "warm red or orange",
    direction: "east",
  },
  Moon: {
    quality: "emotional steadiness, comfort and inner nourishment",
    conduct:
      "Care for your mother and the elder women in your life, keep your living space and water clean, and hold to calming daily routines when feelings run high.",
    charityTheme: "rice, milk or white foods for someone in need",
    deity: "Parvati (Gauri)",
    weekday: "Monday",
    color: "white or silver",
    direction: "northwest",
  },
  Mars: {
    quality: "energy, courage and self-control",
    conduct:
      "Channel restless energy into disciplined effort or exercise, practise patience, and step back from reckless anger and needless conflict.",
    charityTheme: "red lentils, or support for protectors and the courageous",
    deity: "Hanuman (or Kartikeya)",
    weekday: "Tuesday",
    color: "red",
    direction: "south",
  },
  Mercury: {
    quality: "clear thinking, communication and learning",
    conduct:
      "Speak honestly and plainly, keep the promises you make, keep learning, and help students or those trying to study.",
    charityTheme: "green gram (moong) or support for books and education",
    deity: "Vishnu",
    weekday: "Wednesday",
    color: "green",
    direction: "north",
  },
  Jupiter: {
    quality: "wisdom, growth and good judgment",
    conduct:
      "Respect teachers and elders, share what you know generously, and let ethics guide your choices before advantage does.",
    charityTheme: "turmeric or chana dal, or support for teachers and learning",
    deity: "Brihaspati (or Dakshinamurthy)",
    weekday: "Thursday",
    color: "yellow",
    direction: "northeast",
  },
  Venus: {
    quality: "harmony, relationships and everyday comforts",
    conduct:
      "Treat partners and women with genuine respect, honour your commitments in relationships, and make room for balance, art and simple beauty.",
    charityTheme: "white sweets or rice, or support for the arts",
    deity: "Lakshmi",
    weekday: "Friday",
    color: "white or soft pastel",
    direction: "southeast",
  },
  Saturn: {
    quality: "discipline, responsibility and endurance",
    conduct:
      "Serve the elderly, labourers and people who are usually overlooked; practise patience and honest, unglamorous hard work rather than shortcuts.",
    charityTheme:
      "simple, service-oriented giving to labourers or those in need",
    deity: "Shani (or Hanuman)",
    weekday: "Saturday",
    color: "dark blue or black",
    direction: "west",
  },
  Rahu: {
    quality: "ambition and unconventional paths",
    conduct:
      "Avoid shortcuts and deception, keep clear boundaries, and ground yourself with honest routine when things feel scattered or over-ambitious.",
    charityTheme: "blankets or basic necessities for the marginalised",
    deity: "Durga",
    weekday: "Saturday",
    color: "smoky grey or mixed shades",
    direction: "southwest",
  },
  Ketu: {
    quality: "detachment, insight and spiritual focus",
    conduct:
      "Cultivate simplicity and letting go, reduce clutter and attachment, and give a little time to quiet spiritual practice that fits you.",
    charityTheme: "support for animals or a spiritual cause",
    deity: "Ganesha",
    weekday: "Tuesday or Saturday",
    color: "grey or mixed shades",
    direction: "southwest",
  },
};

const ADVERSE_DIGNITIES = new Set(["debilitated", "enemy", "great-enemy"]);
const DUSTHANA = new Set([6, 8, 12]);
const REMEDY_PLANETS: GrahaName[] = [
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

export interface AfflictionIndication {
  planet: GrahaName;
  reasons: string[];
  severity: "low" | "moderate" | "high";
  activeInDasha: boolean;
}

export function detectAfflictions(chart: ChartResult): AfflictionIndication[] {
  const lagna = chart.placements.find((p) => p.name === "Lagna");
  const lagnaSign = lagna ? lagna.sign : 0;
  const periods = chart.advanced.birthPeriods;
  const indications: AfflictionIndication[] = [];

  for (const planet of REMEDY_PLANETS) {
    const placement = chart.placements.find((p) => p.name === planet);
    if (!placement) continue;
    const dignity = chart.advanced.dignities.find((d) => d.name === planet);
    const house = ((placement.sign - lagnaSign + 12) % 12) + 1;
    const reasons: string[] = [];

    if (dignity && ADVERSE_DIGNITIES.has(dignity.dignity))
      reasons.push(
        dignity.dignity === "debilitated"
          ? "is debilitated (in its sign of weakness)"
          : "sits in a difficult (enemy) sign",
      );
    if (dignity?.combust)
      reasons.push("is combust (too close to the Sun to express freely)");
    if (DUSTHANA.has(house))
      reasons.push(`falls in a challenging house (the ${house}th from Lagna)`);

    const activeInDasha =
      periods.mahadasha === planet || periods.antardasha === planet;

    if (reasons.length === 0) continue;
    if (activeInDasha)
      reasons.push(
        periods.mahadasha === planet
          ? "is running its Mahadasha now, so its themes are active"
          : "is running its Antardasha now, so its themes are active",
      );

    const coreCount = reasons.length - (activeInDasha ? 1 : 0);
    const severity: AfflictionIndication["severity"] =
      coreCount >= 2 || (coreCount >= 1 && activeInDasha)
        ? "high"
        : coreCount >= 2
          ? "moderate"
          : "moderate";
    indications.push({ planet, reasons, severity, activeInDasha });
  }

  // Priority: dasha-active first, then by number of reasons.
  return indications.sort(
    (a, b) =>
      Number(b.activeInDasha) - Number(a.activeInDasha) ||
      b.reasons.length - a.reasons.length,
  );
}

export interface AfflictionRemedy {
  family: "conduct" | "charity" | "prayer";
  eligibility: "automatic";
  label: string;
  instruction: string;
  timing: string;
  cost: "free";
  burden: "minimal";
  boundary?: string;
}

export interface PlanetRemedySet {
  planet: GrahaName;
  quality: string;
  indication: string[];
  severity: AfflictionIndication["severity"];
  activeInDasha: boolean;
  remedies: AfflictionRemedy[];
  supportiveThemes: { weekday: string; color: string; direction: string };
}

export function buildAfflictionRemedyPlan(
  chart: ChartResult,
  preferences: AfflictionPreferences = {},
) {
  const allowCharity = preferences.allowCharity !== false;
  const allowPrayer = preferences.allowPrayer !== false;
  const indications = detectAfflictions(chart);

  const planets: PlanetRemedySet[] = indications.map((ind) => {
    const theme = PLANET_THEMES[ind.planet];
    const remedies: AfflictionRemedy[] = [
      {
        family: "conduct",
        eligibility: "automatic",
        label: `Conduct that steadies ${ind.planet}`,
        instruction: theme.conduct,
        timing: `Any day, but ${theme.weekday} is the traditional day to give it a little extra attention.`,
        cost: "free",
        burden: "minimal",
      },
    ];
    if (allowCharity)
      remedies.push({
        family: "charity",
        eligibility: "automatic",
        label: `Themed voluntary giving`,
        instruction: `If you wish, make a small, affordable act of giving in the spirit of ${ind.planet} — traditionally ${theme.charityTheme}.`,
        timing: `On a ${theme.weekday}, or whenever it is practical.`,
        cost: "free",
        burden: "minimal",
        boundary:
          "Keep it modest and never financially burdensome. The specific item is a traditional association, not a required prescription.",
      });
    if (allowPrayer)
      remedies.push({
        family: "prayer",
        eligibility: "automatic",
        label: `Optional devotional orientation`,
        instruction: `If it fits your own tradition, a few quiet minutes of prayer or reflection oriented to ${theme.deity} (classically linked to ${ind.planet}) can help you hold ${theme.quality} in mind.`,
        timing: "Before a relevant step; no special astrological hour is needed.",
        cost: "free",
        burden: "minimal",
        boundary:
          "Orientation only. Do not begin an initiation-only mantra from this; discuss any formal practice with a qualified teacher in your own tradition.",
      });

    return {
      planet: ind.planet,
      quality: theme.quality,
      indication: ind.reasons,
      severity: ind.severity,
      activeInDasha: ind.activeInDasha,
      remedies,
      supportiveThemes: {
        weekday: theme.weekday,
        color: theme.color,
        direction: theme.direction,
      },
    };
  });

  return {
    schemaVersion: "sahadeva-affliction-remedies-1",
    status:
      planets.length > 0
        ? "chart-specific-low-risk-candidates"
        : "no-strong-affliction-flagged",
    planets,
    convention:
      "Afflictions detected from calculated dignity, combustion, house placement and running dasha; mapped only to gate-safe conduct, generic charity and optional prayer families.",
    withheldFamilies: [
      "mantra",
      "gemstone",
      "fasting",
      "costly ritual",
      "specific materials, quantities and recipients",
    ],
    notice:
      "These are optional, low-cost reflective practices, not guaranteed fixes. Specific mantras, gemstones, fasting and exact ritual materials are deliberately withheld until a reviewed source rule and qualified guidance are in place. Nothing here replaces medical, legal, financial or psychological care.",
  };
}
