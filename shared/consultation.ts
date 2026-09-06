import { PROHIBITED_INFERENCES } from "./safety";

export type QuestionCategory =
  | "career"
  | "relationship"
  | "money"
  | "property"
  | "travel"
  | "lost-object"
  | "health"
  | "education"
  | "litigation"
  | "children"
  | "missing-person"
  | "general";
export type JudgmentTier = "structural-convention" | "citation-backed";
export type JudgmentDirection =
  | "supportive"
  | "mixed"
  | "challenging"
  | "indeterminate"
  | "chart-unfit";

export type RuleProvenance = {
  ruleId: string;
  tier: JudgmentTier;
  convention: string;
  sourceIds: string[];
  reviewStatus: "structural-unreviewed" | "reviewed" | "publishable";
  sourceLocators?: string[];
  ruleMaturity?: "structural" | "located" | "reproduced" | "reviewed" | "calibrated";
};
export type EvidenceObservation = {
  id: string;
  label: string;
  polarity: "supportive" | "challenging" | "neutral";
  weight: number;
  facts: string[];
  provenance: RuleProvenance;
};
export type TimingWindow = {
  start: string;
  end: string;
  unit: string;
  score: number;
  supportingFactors: string[];
  opposingFactors: string[];
  notice: string;
};
export type ConsultationResult = {
  schemaVersion: "sahadeva-consultation-1";
  consultationId: string;
  question: {
    text: string;
    category: QuestionCategory;
    askedAt: string;
    timestampConvention: string;
    location: {
      place: string;
      latitude: number;
      longitude: number;
      timezone: string;
    };
  };
  methodSelection: {
    method: "prashna" | "natal";
    chartTypes: string[];
    reason: string;
    tradition?: string;
    capabilityStatus?: "available" | "partial";
    unavailableCapabilities?: string[];
  };
  questionStructure?: {
    referenceHouse: number;
    roles: Array<{
      role: string;
      radicalHouse: number;
      derivedHouse: number;
      status: "primary" | "supporting" | "conditional";
      sourceIds: string[];
      locator: string;
    }>;
  };
  chartFitness: {
    status: "fit" | "sensitive" | "unfit";
    reasons: string[];
    unavailableChecks: string[];
  };
  observations: EvidenceObservation[];
  traditionResults?: Array<{
    tradition: string;
    observations: EvidenceObservation[];
    direction: JudgmentDirection;
    score: number | null;
    maturity: "structural" | "located" | "reproduced" | "reviewed" | "calibrated";
  }>;
  confirmations: string[];
  contradictions: string[];
  timingWindows: TimingWindow[];
  judgment: {
    direction: JudgmentDirection;
    score: number | null;
    tier: JudgmentTier;
    confidence: "low" | "moderate" | "high";
    rationale: string[];
  };
  judgmentDimensions?: {
    promise: {
      direction: JudgmentDirection;
      score: number | null;
      evidenceRuleIds: string[];
    };
    quality: {
      status: "calculated" | "unavailable";
      summary: string | null;
      evidenceRuleIds: string[];
    };
    timing: {
      status: "calculated" | "unavailable";
      windows: TimingWindow[];
      reason: string | null;
    };
  };
  remedies: Array<{
    id: string;
    label: string;
    instructions: string;
    timing: string;
    optional: true;
    sourceIds: string[];
    reviewStatus: string;
  }>;
  citations: Array<{ ruleId: string; sourceIds: string[] }>;
  uncertainty: string[];
  feedback: {
    confirmationToken: string;
    status: "awaiting-outcome";
    endpoint: string;
    suggestedFollowUpAt: string | null;
  };
  safety: {
    interpretiveOnly: true;
    scientificallyValidated: false;
    prohibitedInferences: string[];
    notice: string;
  };
};

export const structuralRule = (
  ruleId: string,
  convention: string,
): RuleProvenance => ({
  ruleId,
  tier: "structural-convention",
  convention,
  sourceIds: [],
  reviewStatus: "structural-unreviewed",
});
export function safetyContract() {
  return {
    interpretiveOnly: true as const,
    scientificallyValidated: false as const,
    prohibitedInferences: [...PROHIBITED_INFERENCES],
    notice:
      "This is bounded structural reasoning within an astrological tradition, not scientific fact or professional advice. It does not guarantee an outcome.",
  };
}
export function scoreObservations(observations: EvidenceObservation[]) {
  const signed = observations.reduce(
      (sum, item) =>
        sum +
        (item.polarity === "supportive"
          ? item.weight
          : item.polarity === "challenging"
            ? -item.weight
            : 0),
      0,
    ),
    possible = observations.reduce(
      (sum, item) =>
        sum + (item.polarity === "neutral" ? 0 : Math.abs(item.weight)),
      0,
    );
  return possible
    ? Math.max(-100, Math.min(100, Math.round((signed / possible) * 100)))
    : 0;
}
