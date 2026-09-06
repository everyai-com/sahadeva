export const PREDICTION_QUALITY_METHOD = {
  schemaVersion: "sahadeva-prediction-quality-method-1",
  sequence: [
    "verified-input",
    "calculation-audit",
    "immutable-facts",
    "sensitivity-analysis",
    "approved-rule-search",
    "deterministic-rule-execution",
    "supporting-and-opposing-evidence",
    "publication-gate",
    "constrained-narration",
    "consented-outcome-follow-up",
  ],
  confidenceDimensions: [
    "input-confidence",
    "calculation-certification",
    "rule-and-source-review",
    "synthesis-completeness",
    "empirical-calibration",
  ],
  narrationRule:
    "Never collapse the confidence dimensions into a probability or certainty unless a versioned blind validation report supports that exact claim class.",
  sensitiveClaims:
    "Sensitive topics remain answerable through reflective possibilities and practical suggestions. Never diagnose illness, predict certain death or fertility, coerce marriage decisions, guarantee financial or remedy outcomes, accuse criminality or abuse, or recommend harm to people or animals.",
  sensitiveTopicNarration:
    "Restrict the unsafe claim, not the whole topic. When a proposed verdict must be withheld, offer a bounded reflection, uncertainty-aware planning guidance and optional real-world next steps instead.",
} as const;

export type TraditionLedger = {
  tradition: string;
  status: "calculated" | "source-linked" | "reviewed" | "calibrated";
  supportingEvidence: unknown[];
  opposingEvidence: unknown[];
  unresolvedSources: string[];
  limitations: string[];
};

// Versioned calculation-certification matrix. Every row states what was
// actually checked (test file + tolerance), never more. "reference-checked"
// means cross-checked against independent reference vectors in tests;
// "structural-tests" means internal invariants only; "pending" names the
// gate that would upgrade the row. No row claims production certification.
export const CALCULATION_CERTIFICATION_MATRIX = {
  schemaVersion: "sahadeva-certification-matrix-1",
  engine: "cleanroom-0.15.0",
  overallCalculation: "research-preview",
  rows: [
    {
      component: "planets-vsop87-approx",
      status: "reference-checked",
      evidence: "shared/jplApprox.test.ts: JPL Horizons fixtures at 1900/1950/2000/2020/2049 within 0.08deg (0.3deg Jupiter/Saturn)",
      gate: "full-ephemeris DE441 integration with published error budgets",
    },
    {
      component: "moon-elp-mpp02",
      status: "reference-checked",
      evidence: "shared/lunar.test.ts: 6 DE441 vectors <500km; 108 Pada boundaries p95 <0.1arcsec; 117 transition fixtures model <0.08deg",
      gate: "combined Moon/Sun/ayanamsa transition model is gated at 0.08deg until solar-event certification finishes",
    },
    {
      component: "ayanamsa-lahiri-iae-1985-mean",
      status: "reference-checked",
      evidence: "shared/ayanamsa.test.ts: 6 references 1800-2050 within 1arcsec plus corrected IAE anchor",
      gate: "independent practitioner sign-off on the versioned convention",
    },
    {
      component: "lagna",
      status: "reference-checked",
      evidence: "shared/astronomyCertification.test.ts: 4 Meeus/IAU-1982 vectors within 1arcsec",
      gate: "independent practitioner certification across historical timezones and high latitudes",
    },
    {
      component: "solar-events",
      status: "reference-checked",
      evidence: "shared/astronomyCertification.test.ts: 3 apparent-Sun rise/set vectors within 3min",
      gate: "independent solar-event certification (moonrise/moonset uncertified)",
    },
    {
      component: "houses-whole-sign-equal",
      status: "structural-tests",
      evidence: "shared/houses.test.ts: structure, Arudha, special Lagnas; Sripati cusps computed with explicit polar status",
      gate: "published reference-chart comparison for Sripati Bhava",
    },
    {
      component: "vargas-shodashavarga",
      status: "structural-tests",
      evidence: "shared/advanced.test.ts: complete 16-chart set plus Hora/Trimsamsa mappings",
      gate: "boundary-sensitivity testing against reference charts (higher vargas shift with small birth-time differences)",
    },
    {
      component: "vimshottari",
      status: "structural-tests",
      evidence: "shared/advanced.test.ts + shared/dashaCalendar.test.ts: 120-year cycle, nested boundaries, 81-event ICS",
      gate: "reference-timeline comparison across timezones",
    },
    {
      component: "ashtakavarga",
      status: "structural-tests",
      evidence: "shared/ashtakavarga.test.ts: classical invariant totals (Bhinna 48/49/39/54/56/52/39, Sarva 337) plus reduction identities",
      gate: "reference-chart comparison",
    },
    {
      component: "shadbala-bhava-bala",
      status: "structural-tests",
      evidence: "shared/states.ts component ranges with versioned conventions retained as evidence",
      gate: "complete-strength certification with compatible conventions",
    },
    {
      component: "kp-placidus-cusps",
      status: "reference-checked",
      evidence: "shared/kp.test.ts: 6 Swiss-Ephemeris-derived vectors within 0.54arcsec; polar abstention",
      gate: "independent KP system certification (rulers, significators, event logic remain structural-preview)",
    },
    {
      component: "transits-ingresses-uncertainty",
      status: "structural-tests",
      evidence: "ingress ordering, nine-sample birth-time sensitivity, compact evidence schema",
      gate: "reference-transit comparison and rectification protocol review",
    },
  ],
} as const;

export function compareTraditionLedgers(ledgers: TraditionLedger[]) {
  const normalized = ledgers.map((ledger) => ({
    ...ledger,
    supportingEvidence: ledger.supportingEvidence ?? [],
    opposingEvidence: ledger.opposingEvidence ?? [],
    unresolvedSources: [...new Set(ledger.unresolvedSources ?? [])],
    limitations: [...new Set(ledger.limitations ?? [])],
  }));
  return {
    schemaVersion: "sahadeva-tradition-comparison-1",
    traditions: normalized,
    agreements: [],
    contradictions: [],
    synthesisPolicy:
      "Traditions remain separate. Agreements and contradictions require claim IDs or reviewed rules and are never inferred by averaging scores.",
    method: PREDICTION_QUALITY_METHOD,
  };
}

export function auditPredictionClaim(input: {
  claim: string;
  claimClass?: string;
  supportingEvidence?: unknown[];
  opposingEvidence?: unknown[];
  approvedRules?: unknown[];
  unresolvedSourceKeys?: string[];
  calculationCertified?: boolean;
  nearBoundary?: boolean;
  empiricallyCalibrated?: boolean;
  harmClass?: string;
}) {
  const blockers: string[] = [];
  if (!input.calculationCertified) blockers.push("calculation-not-independently-certified");
  if (input.nearBoundary) blockers.push("calculation-near-configured-boundary");
  if (!(input.approvedRules?.length)) blockers.push("no-approved-rule");
  if (input.unresolvedSourceKeys?.length) blockers.push("unresolved-source-keys");
  if (input.harmClass === "prohibited-output") blockers.push("prohibited-output");
  const opposing = input.opposingEvidence?.length ?? 0;
  const supporting = input.supportingEvidence?.length ?? 0;
  const decision = blockers.includes("prohibited-output")
    ? "abstain"
    : blockers.length || opposing >= supporting
      ? "caution"
      : "publish";
  const narration = decision === "publish"
    ? {
        mode: "evidence-linked-interpretation",
        instruction: "Narrate the claim with supporting and opposing evidence and stated limits.",
      }
    : decision === "caution"
      ? {
          mode: "suggestion-only",
          instruction: "Frame this only as a possibility and provide practical, optional suggestions; do not imply an outcome.",
        }
      : {
          mode: "rewrite-unsafe-claim",
          instruction: "Do not state this claim. Replace it with a bounded reflection or practical suggestion without predicting the outcome.",
        };
  return {
    schemaVersion: "sahadeva-prediction-claim-audit-1",
    claim: input.claim,
    claimClass: input.claimClass ?? "unspecified",
    evidence: {
      supporting: input.supportingEvidence ?? [],
      opposing: input.opposingEvidence ?? [],
      approvedRules: input.approvedRules ?? [],
      unresolvedSourceKeys: input.unresolvedSourceKeys ?? [],
    },
    confidence: {
      calculationCertified: input.calculationCertified === true,
      ruleReviewed: Boolean(input.approvedRules?.length),
      empiricallyCalibrated: input.empiricallyCalibrated === true,
    },
    decision: { action: decision, blockers },
    narration,
    method: PREDICTION_QUALITY_METHOD,
  };
}

export function validationReportFromCounts(counts: Record<string, number>) {
  const resolved = counts.resolvedOutcomes ?? 0;
  return {
    schemaVersion: "sahadeva-validation-report-1",
    certificationMatrix: CALCULATION_CERTIFICATION_MATRIX,
    calculation: {
      certifiedVectors: counts.certifiedVectors ?? 0,
      failedVectors: counts.failedVectors ?? 0,
      status: (counts.failedVectors ?? 0) === 0 && (counts.certifiedVectors ?? 0) > 0
        ? "partial-reference-coverage"
        : "not-certified",
    },
    knowledge: {
      sources: counts.sources ?? 0,
      passages: counts.passages ?? 0,
      publishableRules: counts.publishableRules ?? 0,
      openContradictions: counts.openContradictions ?? 0,
      approvedWorkedExamples: counts.approvedWorkedExamples ?? 0,
    },
    review: {
      activeReviewers: counts.activeReviewers ?? 0,
      practitionerCohortComplete: (counts.activeReviewers ?? 0) >= 2,
    },
    outcomes: {
      resolved,
      blind: counts.blindOutcomes ?? 0,
      calibrated: resolved >= 100 && (counts.blindOutcomes ?? 0) >= 100,
    },
    overallStatus: "research-preview",
    limitations: [
      "Counts measure pipeline coverage, not truth or predictive validity.",
      "No probability is authorized without a preregistered blind validation cohort.",
    ],
    method: PREDICTION_QUALITY_METHOD,
  };
}
