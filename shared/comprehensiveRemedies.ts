import type { ChartResult, GrahaName } from "./schema";
import { LORDS } from "./compatibility";
import { calculateDoshas } from "./doshas";
import { detectAfflictions } from "./afflictionRemedies";
import {
  PLANET_REMEDIES,
  DOSHA_REMEDIES,
  type PlanetName,
} from "./remedyLibrary";

// Astrologer-style remedy engine. The principle that separates a real reading
// from a generic list: you STRENGTHEN a functional benefic that is weak (with a
// gemstone/mantra), but you PROPITIATE an afflicted or functionally malefic
// graha (mantra, charity, service — never a strengthening gemstone). This
// engine works out the functional nature of each graha for the ascendant, then
// selects the right remedy set from the classical library.

export interface ComprehensiveRemedyOptions {
  allowGemstones?: boolean; // default true
  allowMantras?: boolean; // default true
  allowCharity?: boolean; // default true
}

const NATURAL_MALEFICS = new Set<GrahaName>([
  "Sun",
  "Mars",
  "Saturn",
  "Rahu",
  "Ketu",
]);
const NODES = new Set<GrahaName>(["Rahu", "Ketu"]);

// Lord of the whole-sign house h (1..12) counted from the ascendant sign.
const houseLord = (lagnaSign: number, h: number): GrahaName =>
  LORDS[(lagnaSign + h - 1) % 12] as GrahaName;

function functionalNature(lagnaSign: number) {
  const lords = (houses: number[]) =>
    new Set(houses.map((h) => houseLord(lagnaSign, h)));
  const trikonaLords = lords([1, 5, 9]);
  const kendraLords = lords([4, 7, 10]);
  const yogakaraka = [...kendraLords].filter(
    (p) => trikonaLords.has(p) && p !== houseLord(lagnaSign, 1),
  );
  // Favourable to strengthen: trikona (1/5/9) lords + any yogakaraka.
  const favorable = new Set<GrahaName>([...trikonaLords, ...yogakaraka]);
  // Better propitiated than strengthened: 3/6/11 lords (dusthana/upachaya
  // malefic ownership), unless the same graha also earns trikona lordship.
  const avoidStrengthening = new Set<GrahaName>(
    [...lords([3, 6, 11])].filter((p) => !favorable.has(p)),
  );
  return { favorable, avoidStrengthening, yogakaraka };
}

export interface PlanetRemedyCard {
  planet: PlanetName;
  intent: "strengthen" | "propitiate" | "support";
  why: string[];
  significations: string;
  mantra?: { beej: string; count: number; vedic: string };
  gemstone?: {
    stone: string;
    substitutes: string[];
    metal: string;
    finger: string;
    day: string;
    guidance: string;
  };
  charity?: { items: string[]; day: string; recipient: string };
  vrata?: { day: string; method: string };
  stotra: string;
  conduct: string;
  lalKitab: string;
  supportive: { day: string; color: string; direction: string; deity: string };
}

export function buildComprehensiveRemedies(
  chart: ChartResult,
  options: ComprehensiveRemedyOptions = {},
) {
  const allowGemstones = options.allowGemstones !== false;
  const allowMantras = options.allowMantras !== false;
  const allowCharity = options.allowCharity !== false;

  const lagna = chart.placements.find((p) => p.name === "Lagna");
  const lagnaSign = lagna ? lagna.sign : 0;
  const nature = functionalNature(lagnaSign);
  const periods = chart.advanced.birthPeriods;

  // Collect the grahas worth addressing: afflicted ones + the running dasha
  // lords (their themes are live), de-duplicated.
  const afflictions = detectAfflictions(chart);
  const reasonsByPlanet = new Map<GrahaName, string[]>();
  for (const a of afflictions) reasonsByPlanet.set(a.planet, [...a.reasons]);
  for (const lord of [periods.mahadasha, periods.antardasha]) {
    if (!lord) continue;
    const g = lord as GrahaName;
    if (!PLANET_REMEDIES[g as PlanetName]) continue;
    const existing = reasonsByPlanet.get(g) ?? [];
    const label =
      periods.mahadasha === g
        ? "is running its Mahadasha now (its results are being delivered)"
        : "is running its Antardasha now (its themes are active)";
    if (!existing.some((r) => r.includes("Mahadasha") || r.includes("Antardasha")))
      existing.push(label);
    reasonsByPlanet.set(g, existing);
  }

  const cards: PlanetRemedyCard[] = [];
  for (const [planet, why] of reasonsByPlanet) {
    const lib = PLANET_REMEDIES[planet as PlanetName];
    if (!lib) continue;

    const favorable = nature.favorable.has(planet);
    const node = NODES.has(planet);
    // Strengthen only a functional-benefic graha that is not a node.
    const intent: PlanetRemedyCard["intent"] = node
      ? "propitiate"
      : favorable
        ? "strengthen"
        : NATURAL_MALEFICS.has(planet) || nature.avoidStrengthening.has(planet)
          ? "propitiate"
          : "support";

    const card: PlanetRemedyCard = {
      planet: planet as PlanetName,
      intent,
      why,
      significations: lib.bodyAndLife,
      stotra: lib.stotra,
      conduct: lib.conduct,
      lalKitab: lib.lalKitab,
      supportive: {
        day: lib.weekday,
        color: lib.color,
        direction: lib.direction,
        deity: lib.deity,
      },
    };
    if (allowMantras)
      card.mantra = {
        beej: lib.beejMantra,
        count: lib.beejCount,
        vedic: lib.vedicMantra,
      };
    if (allowCharity)
      card.charity = { ...lib.daana };
    // Only recommend a strengthening gemstone when the intent is to strengthen.
    if (allowGemstones && intent === "strengthen")
      card.gemstone = {
        stone: lib.gemstone.primary,
        substitutes: lib.gemstone.substitutes,
        metal: lib.gemstone.metal,
        finger: lib.gemstone.finger,
        day: lib.gemstone.day,
        guidance: lib.gemstone.wearingNote,
      };
    // Propitiation leans on observance rather than strengthening.
    if (intent !== "strengthen") card.vrata = { ...lib.vrata };
    cards.push(card);
  }

  // Priority: running dasha first, then strengthen a weak yogakaraka/benefic,
  // then propitiate the heaviest afflictions.
  const dashaSet = new Set([periods.mahadasha, periods.antardasha]);
  cards.sort(
    (a, b) =>
      Number(dashaSet.has(b.planet)) - Number(dashaSet.has(a.planet)) ||
      b.why.length - a.why.length,
  );

  // Fold in detected natal doshas.
  const doshaReport = calculateDoshas(chart);
  const doshaRemedies = doshaReport.patterns
    .filter((p) => p.detected && DOSHA_REMEDIES[p.id])
    .map((p) => ({
      id: p.id,
      severity: p.severity,
      ...DOSHA_REMEDIES[p.id],
    }));

  return {
    schemaVersion: "sahadeva-comprehensive-remedies-1",
    approach:
      "Astrologer-style: strengthen a weak functional benefic (gemstone + mantra), propitiate an afflicted or malefic graha (mantra, charity, service, observance). Nodes are always propitiated, never strengthened.",
    functionalNature: {
      lagnaSign,
      favorableToStrengthen: [...nature.favorable],
      betterPropitiated: [...nature.avoidStrengthening],
      yogakaraka: nature.yogakaraka,
    },
    priority: cards.map((c) => c.planet),
    planetRemedies: cards,
    doshaRemedies,
    howToUse: [
      "Pick ONE or two remedies you can actually sustain — consistency matters more than quantity.",
      "Conduct and charity are the safest and are always appropriate; mantra japa suits most people.",
      "A gemstone is a bigger commitment: wear one only after a qualified astrologer confirms it suits your chart, and a gemologist confirms quality and weight.",
      "Give the practice time (a full dasha sub-period or several weeks) rather than expecting an instant change.",
    ],
    safety: {
      status: "traditional-repertoire",
      notice:
        "These are traditional practices drawn from classical Jyotisha, offered as options — not guarantees, and not a substitute for medical, psychological, legal or financial help. Remedies should never be a source of fear or financial strain: if any remedy is being sold to you under pressure or at high cost, that is a red flag, not a requirement.",
      neverClaims: [
        "guaranteed outcomes",
        "that a graha or deity is angry with you",
        "medical, fertility or lifespan effects",
        "that skipping a remedy causes harm",
      ],
    },
  };
}
