import type { GrahaName, Placement } from "./schema";

const ASPECTS = [
  { name: "conjunction", angle: 0, nature: "neutral", strength: 100 },
  { name: "sextile", angle: 60, nature: "friendly", strength: 40 },
  { name: "square", angle: 90, nature: "hostile", strength: 45 },
  { name: "trine", angle: 120, nature: "friendly", strength: 75 },
  { name: "opposition", angle: 180, nature: "hostile", strength: 100 },
  { name: "trine", angle: 240, nature: "friendly", strength: 75 },
  { name: "square", angle: 270, nature: "hostile", strength: 45 },
  { name: "sextile", angle: 300, nature: "friendly", strength: 10 },
  // The directed-distance domain is [0, 360); 360 is the same conjunction
  // approached from the other side of the zodiac and must participate in the
  // nearest-geometry search.
  { name: "conjunction", angle: 360, nature: "neutral", strength: 100 },
] as const;

/** Prasna Tantra, ch. IV, stanzas 52–53 (B. V. Raman): deepthamsas. */
export const TAJAKA_DEEPTHAMSA: Readonly<Partial<Record<GrahaName, number>>> = {
  Sun: 15,
  Moon: 12,
  Mars: 8,
  Mercury: 7,
  Jupiter: 9,
  Venus: 7,
  Saturn: 9,
};

const directedDistance = (first: number, second: number) => ((second - first) % 360 + 360) % 360;

export type TajakaRelation = {
  first: GrahaName;
  second: GrahaName;
  aspect: (typeof ASPECTS)[number]["name"];
  angle: number;
  direction: "conjunction" | "3rd" | "4th" | "5th" | "7th" | "9th" | "10th" | "11th";
  nature: "friendly" | "hostile" | "neutral";
  strength: number;
  orb: number;
  allowedOrb: number;
  withinDeepthamsa: boolean;
  completeness: "poorna" | "forming" | "outside-deepthamsa";
  futureOrb: number;
  motion: "applying" | "separating" | "stationary";
  closingPerStep: number;
  perfectionSteps: number | null;
};

export function tajakaRelation(
  current: Placement[],
  future: Placement[],
  first: GrahaName,
  second: GrahaName,
): TajakaRelation | null {
  const a = current.find((item) => item.name === first);
  const b = current.find((item) => item.name === second);
  const futureA = future.find((item) => item.name === first);
  const futureB = future.find((item) => item.name === second);
  if (!a || !b || !futureA || !futureB || first === "Lagna" || second === "Lagna") return null;
  const currentDistance = directedDistance(a.longitude, b.longitude);
  const nextDistance = directedDistance(futureA.longitude, futureB.longitude);
  const aspect = ASPECTS.reduce((best, candidate) =>
    Math.abs(currentDistance - candidate.angle) < Math.abs(currentDistance - best.angle)
      ? candidate
      : best,
  );
  const orb = Math.abs(currentDistance - aspect.angle);
  const futureOrb = Math.abs(nextDistance - aspect.angle);
  const delta = futureOrb - orb;
  const closingPerStep = orb - futureOrb;
  const allowedOrb = ((TAJAKA_DEEPTHAMSA[first] ?? 0) + (TAJAKA_DEEPTHAMSA[second] ?? 0)) / 2;
  const withinDeepthamsa = orb <= allowedOrb;
  const direction = ({ 0: "conjunction", 60: "3rd", 90: "4th", 120: "5th", 180: "7th", 240: "9th", 270: "10th", 300: "11th", 360: "conjunction" } as const)[aspect.angle];
  return {
    first,
    second,
    aspect: aspect.name,
    angle: aspect.angle,
    direction,
    nature: aspect.nature,
    strength: aspect.strength,
    orb,
    allowedOrb,
    withinDeepthamsa,
    completeness: !withinDeepthamsa ? "outside-deepthamsa" : orb <= 1 ? "poorna" : "forming",
    futureOrb,
    motion: delta < -0.00001 ? "applying" : delta > 0.00001 ? "separating" : "stationary",
    closingPerStep,
    perfectionSteps: closingPerStep > 0.00001 ? orb / closingPerStep : null,
  };
}

export type TajakaTransfer = {
  yoga: "nakta" | "yamaya";
  intermediary: GrahaName;
  firstRelation: TajakaRelation;
  secondRelation: TajakaRelation;
  donor: GrahaName;
  receiver: GrahaName;
  perfectionOrder: GrahaName[];
  applicationEvidence: string;
};

export type TajakaKamboola = {
  first: GrahaName;
  second: GrahaName;
  moonRelationWith: GrahaName;
  grade: "uttamottama" | "madhyamottama" | "madhyama" | "uttamadhama" | "unresolved";
  gradeBasis: string;
  evidence: string[];
  unavailableGradeInputs: string[];
};

export type TajakaCareerKamboola = TajakaKamboola & {
  moonHouse: 1 | 4 | 7 | 10;
  resultScale: "good-position" | "enlarged-position";
  topicBasis: string;
};

export type TajakaCareerExchange = {
  lagnaLord: GrahaName;
  tenthLord: GrahaName;
  lagnaLordHouse: number;
  tenthLordHouse: number;
  afflictions: Array<{ target: GrahaName; malefic: GrahaName; contact: string }>;
  qualifies: boolean;
  basis: string;
};

export type TajakaObjectRealisation = {
  lagnaLord: GrahaName;
  dispositor: GrahaName;
  dispositorHouse: number;
  dusthanaDispositor: boolean;
  lagnaLordCombust: boolean;
  squareContacts: Array<{ planet: GrahaName; direction: "4th" | "10th"; degreeOffset: number }>;
  activeClauses: string[];
};

type DignityEvidence = { name: GrahaName; dignity: string; combust?: boolean };
type DivisionalSigns = Partial<Record<"D3" | "D9" | "D12", Array<{ name: GrahaName; sign: number }>>>;

const SIGN_LORDS: GrahaName[] = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const EXALTATION_SIGNS: Partial<Record<GrahaName, number>> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};

export const PRASNA_TANTRA_SOURCE_CONFLICTS = [
  {
    id: "example-i-mars-ithasala",
    locator: "Prasna Tantra, Some Examples I, wealth",
    printedClaim: "Mars is in Ithasala with the ascendant lord Venus and second lord Mercury.",
    computedFromPrintedLongitudes: "Mars–Venus and Mars–Mercury are within sextile deepthamsa but separating under the stanza 54 speed order.",
    enginePolicy: "Retain the Venus–Mercury applying conjunction and store the two Mars contacts as a source conflict; do not relabel separating motion as Ithasala.",
  },
  {
    id: "example-xii-sun-venus-ithasala",
    locator: "Prasna Tantra, Some Examples XII, profession",
    printedClaim: "The Sun, ascendant lord, is in Ithasala with Venus, tenth lord.",
    computedFromPrintedLongitudes: "Sun 22°50′ and Venus 27°36′ Aries form an in-orb conjunction, but faster Venus is already ahead and the contact is separating.",
    enginePolicy: "Classify the printed geometry as separating Easarapha evidence and preserve the example's Ithasala wording as a conflict.",
  },
] as const;

/**
 * Prasna Tantra, ch. IV, stanza 61 and Raman's note. Only the two grades
 * decidable from D1 dignity are returned by name. The other grades require
 * Panchadhikara/Hadda and divisional dignity and remain explicitly unresolved.
 */
export function tajakaKamboola(
  current: Placement[],
  future: Placement[],
  first: GrahaName,
  second: GrahaName,
  dignities: DignityEvidence[],
  divisionalSigns: DivisionalSigns = {},
): TajakaKamboola | null {
  const direct = tajakaRelation(current, future, first, second);
  if (!direct?.withinDeepthamsa || direct.motion !== "applying") return null;
  const moonFirst = tajakaRelation(current, future, "Moon", first);
  const moonSecond = tajakaRelation(current, future, "Moon", second);
  const moonRelation = [moonFirst, moonSecond].find(
    (relation) => relation?.withinDeepthamsa && relation.motion === "applying",
  );
  if (!moonRelation) return null;
  const dignityOf = (name: GrahaName) => dignities.find((item) => item.name === name)?.dignity ?? "unknown";
  const states = [first, second, "Moon" as const].map((name) => ({ name, dignity: dignityOf(name) }));
  const strong = (dignity: string) => dignity === "exalted" || dignity === "own-sign";
  const vargaSign = (varga: keyof DivisionalSigns, name: GrahaName) =>
    divisionalSigns[varga]?.find((item) => item.name === name)?.sign;
  const ownIn = (varga: keyof DivisionalSigns, name: GrahaName) => {
    const sign = vargaSign(varga, name);
    return sign !== undefined && SIGN_LORDS[sign] === name;
  };
  let grade: TajakaKamboola["grade"] = "unresolved";
  let gradeBasis = "The source-listed condition cannot be decided from the available inputs.";
  if (states.every((item) => strong(item.dignity))) {
    grade = "uttamottama";
    gradeBasis = "Both lords and the Moon are exalted or in their own D1 signs.";
  } else if (strong(dignityOf("Moon")) && [first, second].every((name) => dignityOf(name) === "debilitated")) {
    grade = "uttamadhama";
    gradeBasis = "The Moon is exalted or in its own D1 sign while both lords are debilitated.";
  } else if (ownIn("D9", "Moon") && ownIn("D12", "Moon") && [first, second].every((name) => strong(dignityOf(name)))) {
    grade = "madhyamottama";
    gradeBasis = "The Moon occupies its own D9 and D12 signs and both lords are own-sign or exalted in D1.";
  } else if ((ownIn("D9", "Moon") || ownIn("D3", "Moon")) && dignityOf(first) === "own-sign") {
    grade = "madhyama";
    gradeBasis = "The Moon occupies its own D9 or D3 sign and the ascendant lord is in its own D1 sign.";
  }
  return {
    first,
    second,
    moonRelationWith: moonRelation.first === "Moon" ? moonRelation.second : moonRelation.first,
    grade,
    gradeBasis,
    evidence: [
      ...states.map((item) => `${item.name}: ${item.dignity} in D1`),
      ...(["D3", "D9", "D12"] as const).flatMap((varga) =>
        states.map(({ name }) => `${name}: sign ${vargaSign(varga, name) ?? "unavailable"} in ${varga}`),
      ),
    ],
    unavailableGradeInputs: grade === "unresolved"
      ? ["Hadda/term dignity", "Panchadhikara strength", "remaining source-grade conditions"]
      : [],
  };
}

/**
 * Prasna Tantra, Bhava Prasna, stanza 112 (tenth-house questions).
 * This is deliberately narrower than generic Kamboola: the Moon must occupy
 * a quadrant from the horary ascendant.  Own-sign Moon is retained as the
 * source's stronger result, without translating either result into certainty.
 */
export function tajakaCareerKamboola(
  current: Placement[],
  future: Placement[],
  lagnaSign: number,
  dignities: DignityEvidence[],
  divisionalSigns: DivisionalSigns = {},
): TajakaCareerKamboola | null {
  const lagnaLord = SIGN_LORDS[lagnaSign];
  const tenthSign = (lagnaSign + 9) % 12;
  const tenthLord = SIGN_LORDS[tenthSign];
  const kamboola = tajakaKamboola(current, future, lagnaLord, tenthLord, dignities, divisionalSigns);
  const moon = current.find((item) => item.name === "Moon");
  if (!kamboola || !moon) return null;
  const moonHouse = (((moon.sign - lagnaSign + 12) % 12) + 1);
  if (![1, 4, 7, 10].includes(moonHouse)) return null;
  const ownSignMoon = SIGN_LORDS[moon.sign] === "Moon";
  return {
    ...kamboola,
    moonHouse: moonHouse as 1 | 4 | 7 | 10,
    resultScale: ownSignMoon ? "enlarged-position" : "good-position",
    topicBasis: ownSignMoon
      ? "Stanza 112 career Kamboola with the angular Moon in its own sign; the text states an enlarged position."
      : "Stanza 112 career Kamboola with the Moon angular from the horary ascendant; the text states a good position.",
  };
}

/**
 * Prasna Tantra, Bhava Prasna, stanza 109 and its note: an unafflicted
 * exchange of the ascendant and tenth lords supports acquisition without
 * effort.  Classical malefics use the chapter-IV in-deepthamsa Tajaka
 * aspects; Rahu/Ketu are used only for same-sign conjunction because this
 * edition supplies no node deepthamsa.
 */
export function tajakaCareerExchange(
  current: Placement[],
  future: Placement[],
  lagnaSign: number,
): TajakaCareerExchange | null {
  const lagnaLord = SIGN_LORDS[lagnaSign];
  const tenthSign = (lagnaSign + 9) % 12;
  const tenthLord = SIGN_LORDS[tenthSign];
  const lagnaPlacement = current.find((item) => item.name === lagnaLord);
  const tenthPlacement = current.find((item) => item.name === tenthLord);
  if (!lagnaPlacement || !tenthPlacement || lagnaPlacement.sign !== tenthSign || tenthPlacement.sign !== lagnaSign) return null;
  const house = (sign: number) => ((sign - lagnaSign + 12) % 12) + 1;
  const afflictions: TajakaCareerExchange["afflictions"] = [];
  for (const target of [lagnaLord, tenthLord]) {
    const targetPlacement = current.find((item) => item.name === target)!;
    for (const malefic of ["Sun", "Mars", "Saturn", "Rahu", "Ketu"] as GrahaName[]) {
      // The required exchange partners are not treated as external afflictors
      // of one another; otherwise the rule becomes impossible for ascendants
      // whose first/tenth lords are both natural malefics and mutually aspect.
      if (malefic === lagnaLord || malefic === tenthLord) continue;
      const maleficPlacement = current.find((item) => item.name === malefic);
      if (!maleficPlacement) continue;
      if (maleficPlacement.sign === targetPlacement.sign) {
        afflictions.push({ target, malefic, contact: "same-sign conjunction" });
        continue;
      }
      if (malefic === "Rahu" || malefic === "Ketu") continue;
      const relation = tajakaRelation(current, future, target, malefic);
      if (relation?.withinDeepthamsa) {
        afflictions.push({ target, malefic, contact: `${relation.direction} ${relation.aspect}, orb ${relation.orb.toFixed(2)}°` });
      }
    }
  }
  return {
    lagnaLord,
    tenthLord,
    lagnaLordHouse: house(lagnaPlacement.sign),
    tenthLordHouse: house(tenthPlacement.sign),
    afflictions,
    qualifies: afflictions.length === 0,
    basis: afflictions.length === 0
      ? "Ascendant and tenth lords exchange houses and no encoded malefic conjunction or in-deepthamsa aspect reaches either."
      : "The exchange exists, but stanza 109's unafflicted gate fails; no opposite outcome is inferred.",
  };
}

/** Prasna Tantra, Bhava Prasna, stanza 113 (Karya Siddhi). */
export function tajakaObjectRealisationStanza113(
  current: Placement[],
  lagnaSign: number,
  dignities: DignityEvidence[],
): TajakaObjectRealisation {
  const lagnaLord = SIGN_LORDS[lagnaSign];
  const lagnaLordPlacement = current.find((item) => item.name === lagnaLord);
  if (!lagnaLordPlacement) throw new Error(`Missing ${lagnaLord} placement for Tajaka stanza 113`);
  const dispositor = SIGN_LORDS[lagnaLordPlacement.sign];
  const dispositorPlacement = current.find((item) => item.name === dispositor);
  if (!dispositorPlacement) throw new Error(`Missing ${dispositor} placement for Tajaka stanza 113`);
  const dispositorHouse = ((dispositorPlacement.sign - lagnaSign + 12) % 12) + 1;
  const dusthanaDispositor = [6, 8, 12].includes(dispositorHouse);
  const lagnaLordCombust = dignities.find((item) => item.name === lagnaLord)?.combust === true;
  const squareContacts = (["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as GrahaName[])
    .filter((planet) => planet !== dispositor)
    .flatMap((planet) => {
      const placement = current.find((item) => item.name === planet);
      if (!placement) return [];
      const signDistance = (placement.sign - dispositorPlacement.sign + 12) % 12;
      if (signDistance !== 3 && signDistance !== 9) return [];
      const exactAngle = signDistance === 3 ? 90 : 270;
      return [{
        planet,
        direction: signDistance === 3 ? "4th" as const : "10th" as const,
        degreeOffset: Math.abs(directedDistance(dispositorPlacement.longitude, placement.longitude) - exactAngle),
      }];
    });
  const activeClauses = [
    ...(dusthanaDispositor ? [`${dispositor}, dispositor of ascendant lord ${lagnaLord}, occupies house ${dispositorHouse}.`] : []),
    ...(lagnaLordCombust ? [`Ascendant lord ${lagnaLord} is combust.`] : []),
    ...squareContacts.map((contact) => `${contact.planet} forms the ${contact.direction} sign-based square from ${dispositor} (degree offset ${contact.degreeOffset.toFixed(2)}°).`),
  ];
  return { lagnaLord, dispositor, dispositorHouse, dusthanaDispositor, lagnaLordCombust, squareContacts, activeClauses };
}

const SPEED_ORDER: GrahaName[] = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];

/**
 * Candidate light-transfer yogas from Prasna Tantra, ch. IV, stanzas 57 and 60.
 * The caller must still apply the topic-specific result and any dignity exceptions.
 */
export function tajakaTransferCandidates(
  current: Placement[],
  future: Placement[],
  first: GrahaName,
  second: GrahaName,
): TajakaTransfer[] {
  const direct = tajakaRelation(current, future, first, second);
  if (direct?.withinDeepthamsa) return [];
  const firstSpeed = SPEED_ORDER.indexOf(first);
  const secondSpeed = SPEED_ORDER.indexOf(second);
  if (firstSpeed < 0 || secondSpeed < 0) return [];
  const candidates: TajakaTransfer[] = [];
  SPEED_ORDER.forEach((intermediary, speed) => {
    if (intermediary === first || intermediary === second) return;
    const firstRelation = tajakaRelation(current, future, intermediary, first);
    const secondRelation = tajakaRelation(current, future, intermediary, second);
    if (!firstRelation?.withinDeepthamsa || !secondRelation?.withinDeepthamsa) return;
    if (firstRelation.motion !== "applying" || secondRelation.motion !== "applying") return;
    if (speed > firstSpeed && speed > secondSpeed) {
      const donor = firstSpeed > secondSpeed ? first : second;
      const receiver = donor === first ? second : first;
      const donorRelation = donor === first ? firstRelation : secondRelation;
      const receiverRelation = receiver === first ? firstRelation : secondRelation;
      if (donorRelation.perfectionSteps === null || receiverRelation.perfectionSteps === null
        || donorRelation.perfectionSteps >= receiverRelation.perfectionSteps) return;
      candidates.push({
        yoga: "nakta", intermediary, firstRelation, secondRelation, donor, receiver,
        perfectionOrder: [donor, receiver],
        applicationEvidence: `${intermediary} applies first to faster principal ${donor}, then to slower principal ${receiver}.`,
      });
    } else if (speed < firstSpeed && speed < secondSpeed) {
      const ordered = [
        { planet: first, steps: firstRelation.perfectionSteps! },
        { planet: second, steps: secondRelation.perfectionSteps! },
      ].sort((a, b) => a.steps - b.steps);
      candidates.push({
        yoga: "yamaya", intermediary, firstRelation, secondRelation,
        donor: ordered[0].planet, receiver: intermediary,
        perfectionOrder: ordered.map((item) => item.planet),
        applicationEvidence: `Both faster principals apply to slower collector ${intermediary}.`,
      });
    }
  });
  return candidates;
}
