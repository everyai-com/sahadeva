import { NAKSHATRAS, SIGNS } from "./constants";
import type { ChartResult, GrahaName } from "./schema";
import { PROHIBITED_INFERENCES } from "./safety";

export const LORDS = [
  "Mars",
  "Venus",
  "Mercury",
  "Moon",
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Saturn",
  "Jupiter",
] as const;
const VARNA = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4] as const; // Shudra=1, Vaishya=2, Kshatriya=3, Brahmin=4
const VARNA_NAMES = ["", "Shudra", "Vaishya", "Kshatriya", "Brahmin"];
export const GANA = [
  "Deva",
  "Manushya",
  "Rakshasa",
  "Manushya",
  "Deva",
  "Manushya",
  "Deva",
  "Deva",
  "Rakshasa",
  "Rakshasa",
  "Manushya",
  "Manushya",
  "Deva",
  "Rakshasa",
  "Deva",
  "Rakshasa",
  "Deva",
  "Rakshasa",
  "Rakshasa",
  "Manushya",
  "Manushya",
  "Deva",
  "Rakshasa",
  "Rakshasa",
  "Manushya",
  "Manushya",
  "Deva",
];
export const NADI = [
  "Aadi",
  "Madhya",
  "Antya",
  "Antya",
  "Madhya",
  "Aadi",
  "Aadi",
  "Madhya",
  "Antya",
  "Antya",
  "Manushya",
  "Aadi",
  "Aadi",
  "Madhya",
  "Antya",
  "Antya",
  "Madhya",
  "Aadi",
  "Aadi",
  "Madhya",
  "Antya",
  "Antya",
  "Madhya",
  "Aadi",
  "Aadi",
  "Madhya",
  "Antya",
].map((value) => (value === "Manushya" ? "Madhya" : value));
export const YONI = [
  "Horse",
  "Elephant",
  "Sheep",
  "Serpent",
  "Serpent",
  "Dog",
  "Cat",
  "Sheep",
  "Cat",
  "Rat",
  "Rat",
  "Cow",
  "Buffalo",
  "Tiger",
  "Buffalo",
  "Tiger",
  "Deer",
  "Deer",
  "Dog",
  "Monkey",
  "Mongoose",
  "Monkey",
  "Lion",
  "Horse",
  "Lion",
  "Cow",
  "Elephant",
];
export const YONI_ENEMIES = new Set(
  [
    "Horse:Buffalo",
    "Elephant:Lion",
    "Sheep:Monkey",
    "Serpent:Mongoose",
    "Dog:Deer",
    "Cat:Rat",
    "Cow:Tiger",
  ].flatMap((pair) => {
    const [a, b] = pair.split(":");
    return [`${a}:${b}`, `${b}:${a}`];
  }),
);
const FRIENDS: Record<string, string[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};
const ENEMIES: Record<string, string[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};
const MANGAL_HOUSES = new Set([1, 2, 4, 7, 8, 12]);
const SOUTH_DINA_GOOD = new Set([2, 4, 6, 8, 0]);
const MAHENDRA_GOOD = new Set([4, 7, 10, 13, 16, 19, 22, 25]);
const RAJJU = [
  "Pada",
  "Kati",
  "Nabhi",
  "Kantha",
  "Siro",
  "Kantha",
  "Nabhi",
  "Kati",
  "Pada",
  "Pada",
  "Kati",
  "Nabhi",
  "Kantha",
  "Siro",
  "Kantha",
  "Nabhi",
  "Kati",
  "Pada",
  "Pada",
  "Kati",
  "Nabhi",
  "Kantha",
  "Siro",
  "Kantha",
  "Nabhi",
  "Kati",
  "Pada",
] as const;
const VEDHA_PAIRS = new Set(
  [
    [0, 17],
    [1, 16],
    [2, 15],
    [3, 14],
    [4, 13],
    [5, 21],
    [6, 20],
    [7, 19],
    [8, 18],
    [9, 26],
    [10, 25],
    [11, 24],
    [12, 23],
  ].flatMap(([a, b]) => [`${a}:${b}`, `${b}:${a}`]),
);

export const nakIndex = (name: string) =>
  NAKSHATRAS.indexOf(name as (typeof NAKSHATRAS)[number]);
export const relation = (from: string, to: string) =>
  FRIENDS[from]?.includes(to)
    ? "friend"
    : ENEMIES[from]?.includes(to)
      ? "enemy"
      : "neutral";
const taraGood = (from: number, to: number) =>
  [0, 2, 4, 6, 8].includes((((to - from + 27) % 27) + 1) % 9);
function vashya(sign: number, degree: number) {
  if (sign === 4) return "Vanachara";
  if (sign === 7) return "Keeta";
  if (
    [0, 1].includes(sign) ||
    (sign === 8 && degree >= 15) ||
    (sign === 9 && degree < 15)
  )
    return "Chatushpada";
  if ([2, 5, 6, 10].includes(sign) || (sign === 8 && degree < 15))
    return "Manava";
  return "Jalachara";
}

function kuja(chart: ChartResult) {
  const mars = chart.placements.find((item) => item.name === "Mars")!,
    references = (["Lagna", "Moon", "Venus"] as GrahaName[]).map((name) => {
      const origin = chart.placements.find((item) => item.name === name)!;
      const house = ((mars.sign - origin.sign + 12) % 12) + 1;
      return { reference: name, house, affected: MANGAL_HOUSES.has(house) };
    }),
    hits = references.filter((item) => item.affected).length,
    dignity =
      chart.advanced.dignities.find((item) => item.name === "Mars")?.dignity ||
      "neutral";
  return {
    present: hits > 0,
    severity:
      hits === 0
        ? "none"
        : hits === 1
          ? "low"
          : hits === 2
            ? "moderate"
            : "high",
    references,
    dignity,
    mitigations: [
      ...(dignity === "own-sign" || dignity === "exalted"
        ? [
            `Mars is ${dignity}; recorded as mitigation, not automatic cancellation.`,
          ]
        : []),
    ],
    convention: "Mars in houses 1, 2, 4, 7, 8 or 12 from Lagna, Moon and Venus",
  };
}

function calculatePorutham(
  a: ChartResult["placements"][number],
  b: ChartResult["placements"][number],
  ai: number,
  bi: number,
) {
  const starDistance = ((bi - ai + 27) % 27) + 1;
  const signDistance = ((b.sign - a.sign + 12) % 12) + 1;
  const aLord = LORDS[a.sign],
    bLord = LORDS[b.sign];
  const lordRelations = [relation(aLord, bLord), relation(bLord, aLord)];
  const aV = vashya(a.sign, a.degree),
    bV = vashya(b.sign, b.degree);
  const checks = [
    {
      id: "dina",
      label: "Dina",
      compatible: SOUTH_DINA_GOOD.has(starDistance % 9),
      evidence: { starDistance, remainder: starDistance % 9 },
      rule: "Bride-to-groom Nakshatra distance modulo 9 is accepted at 2, 4, 6, 8 or 0.",
    },
    {
      id: "gana",
      label: "Gana",
      compatible:
        GANA[ai] === GANA[bi] ||
        (new Set([GANA[ai], GANA[bi]]).size === 2 &&
          !new Set([GANA[ai], GANA[bi]]).has("Rakshasa")),
      evidence: { bride: GANA[ai], groom: GANA[bi] },
      rule: "Same Gana or the Deva-Manushya pairing passes in this conservative baseline.",
    },
    {
      id: "mahendra",
      label: "Mahendra",
      compatible: MAHENDRA_GOOD.has(starDistance),
      evidence: { starDistance },
      rule: "Bride-to-groom Nakshatra distance is 4, 7, 10, 13, 16, 19, 22 or 25.",
    },
    {
      id: "stree-dheergha",
      label: "Sthree Dheergha",
      compatible: starDistance >= 14,
      evidence: { starDistance },
      rule: "Groom's Nakshatra is at least 14 places from the bride's, counted inclusively.",
    },
    {
      id: "yoni",
      label: "Yoni",
      compatible: !YONI_ENEMIES.has(`${YONI[ai]}:${YONI[bi]}`),
      evidence: {
        bride: YONI[ai],
        groom: YONI[bi],
        naturalEnemies: YONI_ENEMIES.has(`${YONI[ai]}:${YONI[bi]}`),
      },
      rule: "The two Nakshatra Yoni animals must not be a natural-enemy pair.",
    },
    {
      id: "rashi",
      label: "Rashi",
      compatible: signDistance === 1 || signDistance >= 7,
      evidence: {
        brideSign: SIGNS[a.sign],
        groomSign: SIGNS[b.sign],
        signDistance,
      },
      rule: "Same sign or groom's Moon sign at least seventh from the bride's passes this baseline; regional exceptions are not applied.",
    },
    {
      id: "rasyadhipati",
      label: "Rasyadhipati",
      compatible: aLord === bLord || !lordRelations.includes("enemy"),
      evidence: {
        brideLord: aLord,
        groomLord: bLord,
        brideToGroom: lordRelations[0],
        groomToBride: lordRelations[1],
      },
      rule: "Moon-sign lords are the same or neither directional relation is inimical.",
    },
    {
      id: "vashya",
      label: "Vashya",
      compatible: aV === bV,
      evidence: { bride: aV, groom: bV },
      rule: "Both Moon placements belong to the same Vashya class; a reviewed directional matrix is still pending.",
    },
    {
      id: "rajju",
      label: "Rajju",
      compatible: RAJJU[ai] !== RAJJU[bi],
      evidence: { bride: RAJJU[ai], groom: RAJJU[bi] },
      rule: "The two Nakshatras must not occupy the same Rajju group.",
    },
    {
      id: "vedha",
      label: "Vedha",
      compatible: !VEDHA_PAIRS.has(`${ai}:${bi}`),
      evidence: {
        brideNakshatra: a.nakshatra,
        groomNakshatra: b.nakshatra,
        obstructingPair: VEDHA_PAIRS.has(`${ai}:${bi}`),
      },
      rule: "The Nakshatras must not form a listed mutual Vedha pair.",
    },
  ];
  return {
    profile: "south-indian-general@1.0.0",
    status: "research-preview",
    convention:
      "South Indian ten-Porutham baseline; first chart is bride and second is groom",
    checks,
    summary: {
      compatible: checks.filter((item) => item.compatible).length,
      total: checks.length,
      scoreWithheld: true,
    },
    notice:
      "Individual Poruthams are reported without an aggregate verdict. Tamil, Telugu, Kannada and Kerala exception profiles require separate practitioner review.",
  };
}

export function calculateCompatibility(bride: ChartResult, groom: ChartResult) {
  const a = bride.placements.find((item) => item.name === "Moon")!,
    b = groom.placements.find((item) => item.name === "Moon")!,
    ai = nakIndex(a.nakshatra),
    bi = nakIndex(b.nakshatra);
  if (ai < 0 || bi < 0) throw new Error("Moon Nakshatra unavailable");
  const brideVarna = VARNA[a.sign],
    groomVarna = VARNA[b.sign],
    aV = vashya(a.sign, a.degree),
    bV = vashya(b.sign, b.degree),
    aY = YONI[ai],
    bY = YONI[bi],
    aLord = LORDS[a.sign],
    bLord = LORDS[b.sign],
    ab = relation(aLord, bLord),
    ba = relation(bLord, aLord);
  const maitri =
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
  const ganaScore =
    GANA[ai] === GANA[bi]
      ? 6
      : new Set([GANA[ai], GANA[bi]]).has("Rakshasa")
        ? new Set([GANA[ai], GANA[bi]]).has("Manushya")
          ? 0
          : 1
        : 5;
  const distanceAB = ((b.sign - a.sign + 12) % 12) + 1,
    distanceBA = ((a.sign - b.sign + 12) % 12) + 1,
    bhakootFault = [2, 5, 6, 8, 9, 12].includes(distanceAB);
  const components = [
    {
      id: "varna",
      label: "Varna",
      score: groomVarna >= brideVarna ? 1 : 0,
      maximum: 1,
      evidence: {
        bride: VARNA_NAMES[brideVarna],
        groom: VARNA_NAMES[groomVarna],
      },
    },
    {
      id: "vashya",
      label: "Vashya",
      score: aV === bV ? 2 : 1,
      maximum: 2,
      evidence: { bride: aV, groom: bV },
      notice:
        "Conservative class comparison pending reviewed directional matrix.",
    },
    {
      id: "tara",
      label: "Tara",
      score: (taraGood(ai, bi) ? 1.5 : 0) + (taraGood(bi, ai) ? 1.5 : 0),
      maximum: 3,
      evidence: { brideNakshatra: a.nakshatra, groomNakshatra: b.nakshatra },
    },
    {
      id: "yoni",
      label: "Yoni",
      score: aY === bY ? 4 : YONI_ENEMIES.has(`${aY}:${bY}`) ? 0 : 2,
      maximum: 4,
      evidence: { bride: aY, groom: bY },
      notice:
        "Intermediate pairs use a conservative neutral score pending reviewed full matrix.",
    },
    {
      id: "graha-maitri",
      label: "Graha Maitri",
      score: maitri,
      maximum: 5,
      evidence: {
        brideMoonLord: aLord,
        groomMoonLord: bLord,
        brideToGroom: ab,
        groomToBride: ba,
      },
    },
    {
      id: "gana",
      label: "Gana",
      score: ganaScore,
      maximum: 6,
      evidence: { bride: GANA[ai], groom: GANA[bi] },
    },
    {
      id: "bhakoot",
      label: "Bhakoot",
      score: bhakootFault ? 0 : 7,
      maximum: 7,
      evidence: {
        distanceBrideToGroom: distanceAB,
        distanceGroomToBride: distanceBA,
      },
      notice:
        "Uses the selected 2/12, 5/9 and 6/8 fault convention; regional exceptions require review.",
    },
    {
      id: "nadi",
      label: "Nadi",
      score: NADI[ai] === NADI[bi] ? 0 : 8,
      maximum: 8,
      evidence: { bride: NADI[ai], groom: NADI[bi] },
      notice: "No medical or fertility inference is made.",
    },
  ];
  const brideKuja = kuja(bride),
    groomKuja = kuja(groom),
    balanced = brideKuja.present === groomKuja.present,
    score = components.reduce((sum, item) => sum + item.score, 0);
  return {
    schemaVersion: "sahadeva-compatibility-1",
    subjects: {
      bride: {
        name: bride.input.name,
        moon: {
          sign: a.sign,
          signName: SIGNS[a.sign],
          nakshatra: a.nakshatra,
          pada: a.pada,
        },
      },
      groom: {
        name: groom.input.name,
        moon: {
          sign: b.sign,
          signName: SIGNS[b.sign],
          nakshatra: b.nakshatra,
          pada: b.pada,
        },
      },
    },
    ashtakoota: {
      score,
      maximum: 36,
      percentage: Number(((score / 36) * 100).toFixed(2)),
      components,
      convention:
        "North Indian Ashtakoota research-preview; first chart is bride and second is groom",
    },
    porutham: calculatePorutham(a, b, ai, bi),
    kujaDosha: {
      bride: brideKuja,
      groom: groomKuja,
      balance: {
        balanced,
        notice: balanced
          ? "Both charts have the same Kuja-presence state; this is a balancing observation, not a guarantee."
          : "The Kuja-presence states differ; inspect the reference houses and mitigations rather than using a binary rejection.",
      },
    },
    additionalEvidence: {
      brideNavamsa: bride.navamsa,
      groomNavamsa: groom.navamsa,
    },
    sourceCoverage: {
      status: "calculation-convention-only",
      reviewedRuleCitations: [],
    },
    safety: {
      status: "research-preview",
      prohibitedInferences: [...PROHIBITED_INFERENCES],
      notice:
        "Compatibility scoring is a traditional cultural framework, not proof of relationship success, health, fertility, genetics, or safety. Consent and real-world communication matter more than a score.",
    },
  };
}
