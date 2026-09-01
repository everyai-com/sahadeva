import type { ChartResult } from "./schema";
const TITHI_CLASSES = ["Nanda", "Bhadra", "Jaya", "Rikta", "Purna"],
  TITHI_ELEMENTS = ["Agni", "Prithvi", "Akasha", "Jala", "Vayu"],
  TITHI_LORDS = [
    "Sun",
    "Moon",
    "Mars",
    "Mercury",
    "Jupiter",
    "Venus",
    "Saturn",
    "Rahu",
  ],
  TITHI_DEVATAS = [
    "Isha",
    "Vahnika",
    "Gauri",
    "Ganesha",
    "Sarasvati",
    "Guha",
    "Ravi",
    "Shiva",
    "Durga",
    "Antaka",
    "Vishva",
    "Hari",
    "Agni",
    "Shiva",
  ],
  NAKSHATRA_LORDS = [
    "Ketu",
    "Venus",
    "Sun",
    "Moon",
    "Mars",
    "Rahu",
    "Jupiter",
    "Saturn",
    "Mercury",
  ],
  YOGA_LORDS = [
    "Saturn",
    "Mercury",
    "Ketu",
    "Venus",
    "Sun",
    "Moon",
    "Mars",
    "Rahu",
    "Jupiter",
  ],
  VARA_LORDS: Record<string, string> = {
    Sunday: "Sun",
    Monday: "Moon",
    Tuesday: "Mars",
    Wednesday: "Mercury",
    Thursday: "Jupiter",
    Friday: "Venus",
    Saturday: "Saturn",
  },
  KARANA_LORDS: Record<string, string> = {
    Bava: "Sun",
    Balava: "Moon",
    Kaulava: "Mars",
    Taitila: "Mercury",
    Taitula: "Mercury",
    Garaja: "Jupiter",
    Garija: "Jupiter",
    Vanija: "Venus",
    Vishti: "Saturn",
    Shakuni: "Rahu",
    Chatushpada: "Ketu",
    Naga: "Rahu",
    Kimstughna: "Ketu",
  },
  LIFE_AREAS: Record<string, string> = {
    Vara: "life and available energy",
    Karana: "activity, work in society and accomplishment",
    Tithi: "passions and close-relationship context",
    Nakshatra: "body and health context",
    Yoga: "company, cooperation, friendship and spiritual context",
  },
  TATTVA_DEVATAS: Record<string, string> = {
    Prithvi: "Ganesha",
    Agni: "Aditya",
    Akasha: "Vishnu",
    Jala: "Shakti",
    Vayu: "Shiva",
  };
const norm = (value: number) => ((value % 360) + 360) % 360,
  angularBoundary = (value: number, step: number) => {
    const remainder = norm(value) % step;
    return Math.min(remainder, step - remainder);
  };
export function analyzeNatalPanchanga(chart: ChartResult) {
  const sun = chart.placements.find((p) => p.name === "Sun")!,
    moon = chart.placements.find((p) => p.name === "Moon")!,
    elongation = norm(moon.longitude - sun.longitude),
    sum = norm(moon.longitude + sun.longitude),
    tithiIndex = Math.floor(elongation / 12),
    tithiNumber = (tithiIndex % 15) + 1,
    nakshatraIndex = Math.floor(moon.longitude / (360 / 27)),
    yogaIndex = Math.floor(sum / (360 / 27)),
    paksha = elongation < 180 ? "Shukla" : "Krishna",
    pakshaBala = Math.min(elongation, 360 - elongation) / 3,
    tithiClass = TITHI_CLASSES[(tithiNumber - 1) % 5],
    tithiLord =
      tithiNumber === 15
        ? paksha === "Shukla"
          ? "Saturn"
          : "Rahu"
        : TITHI_LORDS[(tithiNumber - 1) % 8],
    tithiDevata =
      tithiNumber === 15
        ? paksha === "Shukla"
          ? "Narayana"
          : "Kali"
        : TITHI_DEVATAS[tithiNumber - 1],
    karanaLord = KARANA_LORDS[chart.panchanga.karana] || null;
  const limbs = [
      {
        limb: "Vara",
        value: chart.panchanga.vara,
        lord: VARA_LORDS[chart.panchanga.vara] || null,
        element: "Agni",
        lifeArea: LIFE_AREAS.Vara,
        tattvaDevataStudyAssociation: TATTVA_DEVATAS.Agni,
        status: "calculated" as const,
      },
      {
        limb: "Tithi",
        value: chart.panchanga.tithi,
        lord: tithiLord,
        element: "Jala",
        lifeArea: LIFE_AREAS.Tithi,
        tattvaDevataStudyAssociation: TATTVA_DEVATAS.Jala,
        class: tithiClass,
        nandadiElement: TITHI_ELEMENTS[(tithiNumber - 1) % 5],
        number: tithiNumber,
        devata: tithiDevata,
        status: "calculated" as const,
      },
      {
        limb: "Nakshatra",
        value: chart.panchanga.nakshatra,
        lord: NAKSHATRA_LORDS[nakshatraIndex % 9],
        element: "Vayu",
        lifeArea: LIFE_AREAS.Nakshatra,
        tattvaDevataStudyAssociation: TATTVA_DEVATAS.Vayu,
        status: "calculated" as const,
      },
      {
        limb: "Yoga",
        value: chart.panchanga.yoga,
        lord: YOGA_LORDS[yogaIndex % 9],
        element: "Akasha",
        lifeArea: LIFE_AREAS.Yoga,
        tattvaDevataStudyAssociation: TATTVA_DEVATAS.Akasha,
        status: "calculated" as const,
      },
      {
        limb: "Karana",
        value: chart.panchanga.karana,
        lord: karanaLord,
        element: "Prithvi",
        lifeArea: LIFE_AREAS.Karana,
        tattvaDevataStudyAssociation: TATTVA_DEVATAS.Prithvi,
        status: "calculated" as const,
      },
    ],
    byLimb = new Map(limbs.map((row) => [row.limb, row])),
    conflictPairs = [
      ["Vara", "Tithi"],
      ["Tithi", "Nakshatra"],
      ["Nakshatra", "Karana"],
      ["Karana", "Vara"],
    ] as const,
    supportPairs = [
      ["Vara", "Nakshatra"],
      ["Tithi", "Karana"],
    ] as const;
  const conflicts = conflictPairs.map(([first, second]) => {
      const a = byLimb.get(first)!,
        b = byLimb.get(second)!;
      return {
        first,
        second,
        firstElement: a.element,
        secondElement: b.element,
        sharedLord: a.lord && a.lord === b.lord ? a.lord : null,
        present: Boolean(a.lord && a.lord === b.lord),
      };
    }),
    supports = supportPairs.map(([first, second]) => {
      const a = byLimb.get(first)!,
        b = byLimb.get(second)!;
      return {
        first,
        second,
        sharedLord: a.lord && a.lord === b.lord ? a.lord : null,
        present: Boolean(a.lord && a.lord === b.lord),
      };
    }),
    yogaLord = byLimb.get("Yoga")!.lord,
    akashaResolutionCandidates = conflicts
      .filter((row) => row.present && row.sharedLord === yogaLord)
      .map((row) => `${row.first}-${row.second}`);
  const sunBoundaryDegrees = angularBoundary(sun.longitude, 30),
    tithiGroupBoundaryDegrees = angularBoundary(elongation, 60),
    synodicDegreesPerHour = 360 / (29.530588 * 24),
    tithiGandantaDistanceHours =
      tithiGroupBoundaryDegrees / synodicDegreesPerHour;
  return {
    schemaVersion: "sahadeva-natal-panchanga-3",
    subject: { name: chart.input.name, place: chart.input.place },
    limbs,
    paksha: {
      name: paksha,
      moonPakshaBalaVirupas: Number(pakshaBala.toFixed(2)),
      proximity:
        Math.abs(elongation - 180) < Math.min(elongation, 360 - elongation)
          ? "closer-to-full-moon"
          : "closer-to-new-moon",
      looseStrongInterval: elongation >= 84 && elongation <= 276,
      notice:
        "Paksha Bala is a measured lunar-strength component, not a good/bad life score.",
    },
    nandadi: {
      number: tithiNumber,
      class: tithiClass,
      element: TITHI_ELEMENTS[(tithiNumber - 1) % 5],
      lord: tithiLord,
      devata: tithiDevata,
    },
    tattvaRelationships: {
      conflicts,
      supports,
      akashaResolutionCandidates,
      sourceKey: "book-larsen-fundamentals:L2687-L2704",
      notice:
        "A shared limb lord identifies the configured relationship candidate; interpretation requires a reviewed rule and does not weaken a house automatically.",
    },
    boundaries: {
      warnings: chart.advanced.uncertainty.boundaryWarnings.filter((w) =>
        /Moon|Sun|nakshatra|pada|tithi|yoga|karana/i.test(w),
      ),
      sankranti: {
        sunDegreesFromNearestSignBoundary: Number(
          sunBoundaryDegrees.toFixed(4),
        ),
        withinFirstDegreeAtBirth: sun.degree < 1,
        entireIngressDayStatus: "requires-ingress-day-calculation",
      },
      tithiGandanta: {
        approxHoursFromPurnaNandaBoundary: Number(
          tithiGandantaDistanceHours.toFixed(3),
        ),
        withinTwoGhatiApproximation: tithiGandantaDistanceHours <= 0.8,
        method:
          "mean synodic speed screen; exact local transition interval required for publication",
      },
    },
    interpretation: {
      status: "structural-unreviewed",
      sourceKeys: [
        "book-larsen-fundamentals:L447-L526",
        "book-larsen-fundamentals:L970-L1043",
        "book-larsen-fundamentals:L1836-L1901",
        "book-larsen-fundamentals:L2671-L2708",
      ],
      lineage: "Sri Achyutananda Dasa parampara as presented by Visti Larsen",
      devataBoundary:
        "Tattva-Devata names are source study associations, not personalized worship or remedy prescriptions.",
      notice:
        "The five limbs, lords, elements, Nandadi class and boundary screens are reviewable structures. Personality or event claims require approved lineage-specific rules.",
    },
    safety: {
      status: "research-preview",
      prohibited: [
        "death or lifespan inference",
        "disease diagnosis",
        "marriage success verdict",
        "fear-based dosha remedy",
      ],
      notice:
        "Natal Panchanga is a traditional context layer, not a verdict about character, fate, health or auspiciousness.",
    },
  };
}
