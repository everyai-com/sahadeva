import { SIGNS } from "./constants";
import type { ChartResult } from "./schema";
import { PROHIBITED_INFERENCES } from "./safety";
import {
  GANA,
  LORDS,
  YONI,
  YONI_ENEMIES,
  nakIndex,
  relation,
} from "./compatibility";

// Relationship types this tool supports. These are gender-neutral bonds, so the
// marriage-only Ashtakoota factors (Varna hierarchy, Nadi/fertility) are omitted
// and replaced with the classical Nakshatra factors used for any human bond:
// Tara (mutual star fortune), Graha Maitri (mental rapport), Gana (temperament),
// Yoni (instinct), Bhakoot (emotional flow) and Moon-sign element harmony.
export const RELATIONSHIP_TYPES = [
  "business_partner",
  "friend",
  "sibling",
  "colleague",
  "mentor_student",
  "parent_child",
  "roommate",
  "general",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

const TARA_NAMES = [
  "Janma",
  "Sampat",
  "Vipat",
  "Kshema",
  "Pratyak",
  "Sadhaka",
  "Vadha",
  "Mitra",
  "Ati-Mitra",
];
const TARA_MEANING: Record<string, string> = {
  Janma: "shared root/identity — mirror-like, intense",
  Sampat: "prosperity and wealth between them",
  Vipat: "obstacles and setbacks",
  Kshema: "well-being and protection",
  Pratyak: "friction and opposition",
  Sadhaka: "accomplishment of shared goals",
  Vadha: "harm or drain",
  Mitra: "friendship and ease",
  "Ati-Mitra": "deep, effortless friendship",
};
// Tara remainder (1..9) auspicious set. 0 maps to 9 (Ati-Mitra).
const TARA_GOOD = new Set([2, 4, 6, 8, 9]);
const TARA_BAD = new Set([3, 5, 7]);

const ELEMENTS = ["Fire", "Earth", "Air", "Water"] as const;
const elementOf = (sign: number) => ELEMENTS[sign % 4];
const MODALITIES = ["Movable", "Fixed", "Dual"] as const;
const modalityOf = (sign: number) => MODALITIES[sign % 3];

function taraFor(fromNak: number, toNak: number) {
  const count = ((toNak - fromNak + 27) % 27) + 1;
  const remainder = count % 9 || 9;
  const name = TARA_NAMES[remainder - 1];
  return { count, remainder, name };
}

function elementHarmony(a: number, b: number) {
  const ea = elementOf(a),
    eb = elementOf(b);
  if (ea === eb) return { score: 4, note: `Both ${ea} — instinctive resonance` };
  const compatible = new Set(["Fire:Air", "Air:Fire", "Earth:Water", "Water:Earth"]);
  const clashing = new Set(["Fire:Water", "Water:Fire", "Earth:Air", "Air:Earth"]);
  if (compatible.has(`${ea}:${eb}`))
    return { score: 3, note: `${ea} and ${eb} feed each other` };
  if (clashing.has(`${ea}:${eb}`))
    return { score: 1, note: `${ea} and ${eb} can dampen each other` };
  return { score: 2, note: `${ea} and ${eb} are workably neutral` };
}

// How much each relationship type weights each factor (0 = ignore).
const WEIGHTS: Record<RelationshipType, Record<string, number>> = {
  business_partner: { tara: 3, grahaMaitri: 3, bhakoot: 3, element: 2, gana: 1, yoni: 1 },
  friend: { tara: 3, gana: 3, yoni: 2, grahaMaitri: 2, element: 2, bhakoot: 1 },
  sibling: { gana: 3, bhakoot: 3, tara: 2, element: 2, yoni: 1, grahaMaitri: 1 },
  colleague: { grahaMaitri: 3, tara: 2, gana: 2, bhakoot: 2, element: 1, yoni: 1 },
  mentor_student: { tara: 3, grahaMaitri: 3, gana: 1, element: 1, bhakoot: 1, yoni: 1 },
  parent_child: { tara: 3, bhakoot: 3, gana: 2, grahaMaitri: 2, element: 2, yoni: 1 },
  roommate: { gana: 3, yoni: 2, bhakoot: 2, tara: 2, element: 1, grahaMaitri: 1 },
  general: { tara: 2, grahaMaitri: 2, gana: 2, yoni: 2, bhakoot: 2, element: 2 },
};
const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  business_partner: "Business partners",
  friend: "Friends",
  sibling: "Siblings / family",
  colleague: "Colleagues",
  mentor_student: "Mentor and student",
  parent_child: "Parent and child",
  roommate: "Housemates",
  general: "General bond",
};
const RELATIONSHIP_FOCUS: Record<RelationshipType, string> = {
  business_partner:
    "trust, shared prosperity (Sampat Tara), aligned decision-making and money flow (Bhakoot).",
  friend: "temperament (Gana), instinctive ease (Yoni) and mutual fortune (Tara).",
  sibling: "temperament and long-term emotional give-and-take within family.",
  colleague: "mental rapport (Graha Maitri) and smooth day-to-day working fortune.",
  mentor_student:
    "the guru-shishya flow of guidance — Tara direction and shared mental wavelength.",
  parent_child:
    "the nurturing bond — mutual fortune (Tara), emotional flow (Bhakoot) and temperament fit, read without hierarchy or destiny claims.",
  roommate: "living temperament, instinctive comfort and daily emotional flow.",
  general: "an even reading across all classical Nakshatra factors.",
};

function grahaMaitriScore(aLord: string, bLord: string) {
  const ab = relation(aLord, bLord),
    ba = relation(bLord, aLord);
  const score =
    aLord === bLord
      ? 5
      : ab === "friend" && ba === "friend"
        ? 5
        : [ab, ba].includes("enemy")
          ? [ab, ba].includes("friend")
            ? 1
            : 0
          : [ab, ba].includes("friend")
            ? 4
            : 3;
  return { score, aToB: ab, bToA: ba };
}

function ganaScorePair(gi: string, gj: string) {
  if (gi === gj) return 6;
  const set = new Set([gi, gj]);
  if (set.has("Rakshasa")) return set.has("Manushya") ? 0 : 1;
  return 5; // Deva-Manushya
}

export function calculateRelationshipCompatibility(
  personA: ChartResult,
  personB: ChartResult,
  relationship: RelationshipType,
) {
  const a = personA.placements.find((item) => item.name === "Moon")!,
    b = personB.placements.find((item) => item.name === "Moon")!,
    ai = nakIndex(a.nakshatra),
    bi = nakIndex(b.nakshatra);
  if (ai < 0 || bi < 0) throw new Error("Moon Nakshatra unavailable");

  const taraAB = taraFor(ai, bi),
    taraBA = taraFor(bi, ai);
  const taraDirScore = (rem: number) =>
    TARA_GOOD.has(rem) ? 2 : TARA_BAD.has(rem) ? 0 : 1; // Janma = 1
  const taraScore = taraDirScore(taraAB.remainder) + taraDirScore(taraBA.remainder);

  const aLord = LORDS[a.sign],
    bLord = LORDS[b.sign],
    maitri = grahaMaitriScore(aLord, bLord);

  const gana = ganaScorePair(GANA[ai], GANA[bi]);

  const aY = YONI[ai],
    bY = YONI[bi],
    yoni = aY === bY ? 4 : YONI_ENEMIES.has(`${aY}:${bY}`) ? 0 : 2;

  const distanceAB = ((b.sign - a.sign + 12) % 12) + 1,
    distanceBA = ((a.sign - b.sign + 12) % 12) + 1;
  const bhakootScore =
    distanceAB === 1
      ? 7
      : [6, 8].includes(distanceAB)
        ? 2 // Shashtashtaka — friction
        : [2, 12].includes(distanceAB)
          ? 3 // Dwirdwadash — give and take
          : [5, 9].includes(distanceAB)
            ? 5 // Navapancham — creative but karmic
            : 7;
  const bhakootLabel =
    distanceAB === 1
      ? "same sign"
      : [6, 8].includes(distanceAB)
        ? "6/8 Shashtashtaka (friction, health/finance strain)"
        : [2, 12].includes(distanceAB)
          ? "2/12 Dwirdwadash (unequal give-and-take)"
          : [5, 9].includes(distanceAB)
            ? "5/9 Navapancham (creative, karmic)"
            : "supportive spacing";

  const element = elementHarmony(a.sign, b.sign);

  const factors = [
    {
      id: "tara",
      label: "Tara (mutual fortune)",
      score: taraScore,
      maximum: 4,
      evidence: {
        aToB: { tara: taraAB.name, meaning: TARA_MEANING[taraAB.name] },
        bToA: { tara: taraBA.name, meaning: TARA_MEANING[taraBA.name] },
      },
    },
    {
      id: "grahaMaitri",
      label: "Graha Maitri (mental rapport)",
      score: maitri.score,
      maximum: 5,
      evidence: {
        aMoonLord: aLord,
        bMoonLord: bLord,
        aToB: maitri.aToB,
        bToA: maitri.bToA,
      },
    },
    {
      id: "gana",
      label: "Gana (temperament)",
      score: gana,
      maximum: 6,
      evidence: { a: GANA[ai], b: GANA[bi] },
    },
    {
      id: "yoni",
      label: "Yoni (instinctive nature)",
      score: yoni,
      maximum: 4,
      evidence: {
        a: aY,
        b: bY,
        naturalEnemies: YONI_ENEMIES.has(`${aY}:${bY}`),
      },
    },
    {
      id: "bhakoot",
      label: "Bhakoot (emotional flow)",
      score: bhakootScore,
      maximum: 7,
      evidence: {
        distanceAToB: distanceAB,
        distanceBToA: distanceBA,
        pattern: bhakootLabel,
      },
    },
    {
      id: "element",
      label: "Moon element harmony",
      score: element.score,
      maximum: 4,
      evidence: {
        a: elementOf(a.sign),
        b: elementOf(b.sign),
        aModality: modalityOf(a.sign),
        bModality: modalityOf(b.sign),
        note: element.note,
      },
    },
  ];

  const weights = WEIGHTS[relationship];
  const weightedTotal = factors.reduce(
    (sum, f) => sum + (weights[f.id] ?? 0) * (f.score / f.maximum),
    0,
  );
  const weightSum = factors.reduce((sum, f) => sum + (weights[f.id] ?? 0), 0);
  const harmonyIndex = Number(((weightedTotal / weightSum) * 100).toFixed(1));

  const emphasised = factors
    .filter((f) => (weights[f.id] ?? 0) >= 3)
    .map((f) => f.label);
  const strengths = factors
    .filter((f) => f.score / f.maximum >= 0.75)
    .map((f) => f.label);
  const frictions = factors
    .filter((f) => f.score / f.maximum <= 0.34)
    .map((f) => f.label);

  const band =
    harmonyIndex >= 70
      ? "strong"
      : harmonyIndex >= 45
        ? "workable"
        : "needs-conscious-effort";

  return {
    schemaVersion: "sahadeva-relationship-compatibility-1",
    relationship: {
      type: relationship,
      label: RELATIONSHIP_LABEL[relationship],
      weightedTowards: RELATIONSHIP_FOCUS[relationship],
      emphasisedFactors: emphasised,
    },
    subjects: {
      personA: {
        name: personA.input.name,
        moon: {
          sign: a.sign,
          signName: SIGNS[a.sign],
          nakshatra: a.nakshatra,
          pada: a.pada,
        },
      },
      personB: {
        name: personB.input.name,
        moon: {
          sign: b.sign,
          signName: SIGNS[b.sign],
          nakshatra: b.nakshatra,
          pada: b.pada,
        },
      },
    },
    harmony: {
      index: harmonyIndex,
      band,
      note: "Weighted blend of the factors most relevant to this bond, on a 0-100 cultural-framework scale. Not a verdict.",
    },
    factors,
    reading: {
      strengths,
      frictions,
      guidance:
        frictions.length === 0
          ? "The classical factors mostly support this bond; keep communication concrete."
          : `Watch the friction points (${frictions.join(", ")}); these describe tendencies to name openly, not fixed fates.`,
    },
    convention:
      "Gender-neutral Nakshatra compatibility (Tara, Graha Maitri, Gana, Yoni, Bhakoot, element) weighted per relationship type. Research preview.",
    sourceCoverage: {
      status: "calculation-convention-only",
      reviewedRuleCitations: [],
    },
    safety: {
      status: "research-preview",
      prohibitedInferences: [...PROHIBITED_INFERENCES],
      notice:
        "This is a traditional cultural framework for reflecting on a relationship, not proof of how any partnership, friendship, or family bond will turn out. Real communication, consent, and shared values matter more than any score.",
    },
  };
}
