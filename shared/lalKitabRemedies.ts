import catalogJson from "../knowledge/lal-kitab-remedies.json";
import type { ChartResult, GrahaName } from "./schema";

const PLANETS = ["Jupiter", "Sun", "Moon", "Venus", "Mars", "Mercury", "Saturn", "Rahu", "Ketu"] as const satisfies readonly GrahaName[];
const catalog = catalogJson as typeof catalogJson;
const candidateById = new Map(catalog.candidates.map((candidate) => [candidate.id, candidate]));
const houseFromLagna = (lagnaSign: number, sign: number) => ((sign - lagnaSign + 12) % 12) + 1;

export function getLalKitabRemedyCatalog() {
  return {
    schemaVersion: catalog.schemaVersion,
    source: catalog.source,
    policy: catalog.policy,
    coverage: catalog.coverage,
    catalogSha256: catalog.catalogSha256,
  };
}

export function buildLalKitabRemedyCandidates(chart: ChartResult) {
  const lagna = chart.placements.find((placement) => placement.name === "Lagna");
  if (!lagna) throw new Error("Lagna is required for Lal Kitab remedy matching");
  const placements = PLANETS.map((planet) => {
    const placement = chart.placements.find((item) => item.name === planet);
    if (!placement) throw new Error(`Missing ${planet} placement`);
    const house = houseFromLagna(lagna.sign, placement.sign);
    const ids = catalog.byPlacement[`${planet}:${house}` as keyof typeof catalog.byPlacement] ?? [];
    return {
      planet,
      house,
      candidates: ids.flatMap((id) => {
        const candidate = candidateById.get(id);
        if (!candidate) return [];
        return [{
          id: candidate.id,
          locator: candidate.locator,
          sourceFamily: candidate.sourceFamily,
          remedyFamilies: candidate.remedyFamilies,
          riskFlags: candidate.riskFlags,
          extractionStatus: candidate.extractionStatus,
          scanVerificationStatus: candidate.scanVerificationStatus,
          reviewStatus: candidate.reviewStatus,
          publicationStatus: candidate.publicationStatus,
          executionStatus: "withheld-pending-atomic-review" as const,
          reason: "The OCR block is source-located, but its conditions and exceptions are not yet safe to personalize.",
        }];
      }),
    };
  });
  return {
    schemaVersion: "sahadeva-lal-kitab-remedy-engine-1",
    mode: "research-preview",
    subject: { name: chart.input.name, place: chart.input.place },
    placements,
    matchedCandidateCount: placements.reduce((count, item) => count + item.candidates.length, 0),
    catalogCoverage: catalog.coverage,
    publication: { reviewedExecutableRules: 0, personalizedInstructionsAllowed: false },
    nextGate: "Model each candidate's complete condition graph, verify it against the page scan, add counterexamples, and obtain two independent approvals.",
  };
}
