import manifestJson from "../knowledge/lal-kitab-manifest.json";
import type { ChartResult, GrahaName } from "./schema";

const PLANETS = [
  "Jupiter",
  "Sun",
  "Moon",
  "Venus",
  "Mars",
  "Mercury",
  "Saturn",
  "Rahu",
  "Ketu",
] as const satisfies readonly GrahaName[];

type PlanetHouseSource = {
  id: string;
  planet: string;
  house: number;
  lineStart: number;
  lineEnd: number;
  locator: string;
  sourcePdfChunk: { pageStart: number; pageEnd: number };
  extractionStatus: string;
  publicationStatus: string;
};

const manifest = manifestJson as typeof manifestJson & {
  planetHouseSections: PlanetHouseSource[];
};
const sourceByPlacement = new Map(
  manifest.planetHouseSections.map((section) => [
    `${section.planet}:${section.house}`,
    section,
  ]),
);

export function getLalKitabSourceCatalog() {
  return {
    schemaVersion: "sahadeva-lal-kitab-source-catalog-1",
    source: {
      id: manifest.source.id,
      title: manifest.source.title,
      author: manifest.source.author,
      editionBasis: manifest.source.editionBasis,
      parsedPages: manifest.source.parsedPages,
      sourceSha256: manifest.source.sourceSha256,
      verificationNotice: manifest.source.verificationNotice,
    },
    coverage: manifest.coverage,
    policy: manifest.policy,
    families: manifest.ruleFamilies.map((family) => ({
      id: family.id,
      locator: family.locator,
      lineStart: family.lineStart,
      lineEnd: family.lineEnd,
      headingCount: family.headingCount,
      policy: family.policy,
      lexicalSignals: family.lexicalSignals,
    })),
    notice:
      "This catalog exposes provenance, locators, coverage and disclosure policy without republishing the copyrighted source body.",
  };
}

const houseFromLagna = (lagnaSign: number, sign: number) =>
  ((sign - lagnaSign + 12) % 12) + 1;

export function inspectLalKitabStructure(chart: ChartResult) {
  const lagna = chart.placements.find((placement) => placement.name === "Lagna");
  if (!lagna) throw new Error("Lagna is required for Lal Kitab house conversion");

  const placements = PLANETS.map((planet) => {
    const placement = chart.placements.find((item) => item.name === planet);
    if (!placement) throw new Error(`Missing ${planet} placement`);
    const house = houseFromLagna(lagna.sign, placement.sign);
    const source = sourceByPlacement.get(`${planet}:${house}`);
    if (!source) throw new Error(`Missing Lal Kitab source locator for ${planet} house ${house}`);
    return {
      planet,
      house,
      source: {
        id: source.id,
        locator: source.locator,
        sourcePdfChunk: source.sourcePdfChunk,
        extractionStatus: source.extractionStatus,
        publicationStatus: source.publicationStatus,
      },
      interpretation: {
        status: "withheld-source-only" as const,
        reason:
          "The located section contains multiple conditional claims, exceptions, age periods and remedies that have not yet been atomically extracted and scan-verified.",
      },
    };
  });

  const byHouse = new Map<number, string[]>();
  for (const placement of placements)
    byHouse.set(placement.house, [
      ...(byHouse.get(placement.house) || []),
      placement.planet,
    ]);
  const conjunctions = [...byHouse]
    .filter(([, planets]) => planets.length >= 2)
    .map(([house, planets]) => ({
      house,
      planets,
      sourceSearchStatus: "candidate-headings-indexed-not-rule-linked" as const,
      interpretationStatus: "withheld-source-only" as const,
    }));

  return {
    schemaVersion: "sahadeva-lal-kitab-structure-1",
    tradition: {
      id: manifest.policy.traditionNamespace,
      sourceEdition: manifest.source.editionBasis,
      mixingAllowed: false,
      parashariSynthesisUsed: false,
    },
    conversion: {
      method:
        "Retain the planets in the traditional natal chart, erase sign labels, number the Ascendant house as 1 and continue anti-clockwise through house 12.",
      sourceLocator: "book-gosvami-lal-kitab:L572-L697;L2637-L2645",
      sourceChartBasis: "natal chart whole-sign house from sidereal Lagna",
      annualChartStatus: "not-implemented",
      rectificationStatus: "not-implemented",
      nodeIndependenceWarning:
        "The source's annual-chart framework can treat Rahu, Ketu and Mercury independently of ordinary astronomical constraints. This output uses natal astronomical placements only and does not emulate that annual framework.",
    },
    subject: { name: chart.input.name, place: chart.input.place },
    placements,
    conjunctions,
    sourceCoverage: {
      manifestSchemaVersion: manifest.schemaVersion,
      sourceSha256: manifest.source.sourceSha256,
      locatedPlanetHouseSections: placements.length,
      corpusPlanetHouseSections: manifest.coverage.planetHouseSections,
      corpusHeadings: manifest.coverage.headings,
      extractionStatus: "source-located-ocr-unverified",
      reviewedExecutableRules: 0,
    },
    controlledDisclosurePolicy: {
      retention:
        "All source claims are retained for extraction and review, including illness, death, fertility, marriage, costly ritual and animal-related historical material.",
      reviewedSensitiveClaims:
        "May be explained as source-attributed traditional material only with a prominent caution, uncertainty, contrary evidence and practical support.",
      deathAndLifespan:
        "May be discussed as historical source doctrine, but never converted into a personalized death date, lifespan certainty or reason to delay care.",
      healthAndFertility:
        "May be discussed as traditional symbolism, never diagnosis, prognosis or guaranteed reproductive outcome; encourage qualified care where relevant.",
      marriage:
        "May be discussed as a reflective traditional indication, never a verdict that a relationship must succeed, fail or end.",
      remedies:
        "Reviewed low-risk remedies may be offered as optional cultural practices. Costly, intoxicant-related, initiation-dependent or burdensome practices require explicit burden warnings and user consent.",
      animalRelatedMaterial:
        "Historical claims are preserved and may be described, but animal harm is never recommended; use a harmless symbolic or charitable alternative when appropriate.",
    },
    blockedOutputs: [
      "unreviewed planet-in-house prediction prose",
      "certain age or event forecasts",
      "medical diagnosis or personalized death/lifespan certainty",
      "guaranteed fertility, pregnancy or marriage verdicts",
      "fear-based, coercive or financially burdensome remedy instructions",
      "animal harm",
      "blended Parashari-Lal Kitab conclusions",
    ],
    nextGate:
      "Atomically extract each located section into observation, condition, exception, interpretation and remedy records; verify against the scan; reconstruct examples; obtain independent lineage review.",
    safety: {
      status: "source-inspection-only",
      notice:
        "This result locates relevant Lal Kitab source sections. Sensitive source material is retained for controlled, caution-led disclosure after review; this structural result itself is not yet a prediction or remedy recommendation.",
    },
  };
}
