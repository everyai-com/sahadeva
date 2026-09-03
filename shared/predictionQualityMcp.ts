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
