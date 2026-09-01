export type PredictionReadinessStatus =
  | "available-research-preview"
  | "partial"
  | "source-only"
  | "not-started"
  | "blocked";

type ReadinessGate = {
  id: string;
  label: string;
  status: PredictionReadinessStatus;
  evidence: string[];
  requiredNext: string[];
};

const gates: ReadinessGate[] = [
  {
    id: "astronomy",
    label: "Astronomical and calendar calculations",
    status: "available-research-preview",
    evidence: [
      "Versioned sidereal chart facts, Vargas, Panchanga, Dashas and transits",
      "Reference fixtures exist for planets, the Moon and calendar transitions",
    ],
    requiredNext: [
      "Independent Lagna, solar-event and complete-strength certification",
      "Published reference-vector report across historical and boundary cases",
    ],
  },
  {
    id: "executable-rules",
    label: "Source-linked executable interpretation rules",
    status: "partial",
    evidence: [
      "Typed rule DSL, source locators, exceptions and contradiction workflow exist",
      "Current book-derived catalog remains draft and cannot be represented as reviewed doctrine",
    ],
    requiredNext: [
      "Extract atomic rules with exact page locators and explicit conventions",
      "Obtain two independent approvals and resolve contradictions",
    ],
  },
  {
    id: "worked-examples",
    label: "Worked-example reconstruction",
    status: "partial",
    evidence: [
      "Rule fixture and example-review gates exist",
      "No complete multi-book adjudicated regression corpus is certified",
    ],
    requiredNext: [
      "Recalculate rights-safe worked charts independently",
      "Record expected matches, non-matches and convention-dependent discrepancies",
    ],
  },
  {
    id: "practitioner-review",
    label: "Practitioner and regional review",
    status: "not-started",
    evidence: ["Publication schema requires distinct reviewers without inventing reviewer identities"],
    requiredNext: [
      "Recruit identified reviewers for Parashari and each regional preset",
      "Run blinded adjudication and preserve dissent by lineage",
    ],
  },
  {
    id: "outcome-calibration",
    label: "Outcome calibration",
    status: "not-started",
    evidence: [
      "Outcome capture and longitudinal-analysis scaffolding exist",
      "Current activation scores are explicitly heuristic, not probabilities",
    ],
    requiredNext: [
      "Preregister metrics and freeze engine/rule versions",
      "Collect consented blind holdouts with base-rate and abstention comparisons",
    ],
  },
];

const traditions = [
  {
    id: "parashari",
    status: "partial" as const,
    sourceCoverage: "multiple parsed references and draft executable rules",
    calculationCoverage: "broad research-preview implementation",
    predictionPolicy: "structural and source-status-labelled only",
  },
  {
    id: "jaimini",
    status: "partial" as const,
    sourceCoverage: "limited draft rules and structural calculations",
    calculationCoverage: "specialist preview",
    predictionPolicy: "never silently blend with Parashari",
  },
  {
    id: "kp",
    status: "partial" as const,
    sourceCoverage: "insufficient reviewed rule coverage",
    calculationCoverage: "specialist preview",
    predictionPolicy: "method-labelled preview only",
  },
  {
    id: "lal-kitab",
    status: "source-only" as const,
    sourceCoverage:
      "B. M. Gosvami Lal Kitab, 778-page parsed reference with source-page chunk markers",
    calculationCoverage:
      "dedicated natal fixed-house conversion and source-section inspection; no annual-chart or executable prediction engine",
    predictionPolicy:
      "do not infer Lal Kitab predictions or remedies from the parsed book; extract, verify and review rules first",
    requiredNext: [
      "Create a Lal Kitab namespace and fixed-house convention specification",
      "Build a page-stable source manifest and OCR correction queue",
      "Extract planet-in-house, conjunction, debt and remedy rules as separate typed claims",
      "Encode eligibility, exceptions, age periods and contraindications",
      "Verify rule-critical wording against the scan and obtain lineage review",
      "Keep Lal Kitab output separate from Parashari synthesis unless comparison is explicitly requested",
    ],
  },
];

export function assessPredictionReadiness() {
  return {
    schemaVersion: "sahadeva-prediction-readiness-1",
    overallStatus: "research-preview" as const,
    decision: {
      deterministicChartCalculation: "available-research-preview",
      reviewedTraditionalPrediction: "blocked",
      calibratedEventProbability: "blocked",
      lalKitabPrediction: "blocked",
    },
    gates,
    traditions,
    recommendedMcpBuildOrder: [
      {
        priority: 0,
        tool: "audit_chart_calculation",
        purpose: "Run boundary, convention and reference-vector checks before interpretation.",
      },
      {
        priority: 0,
        tool: "assess_prediction_readiness",
        purpose: "Expose abstention and publication gates to every MCP host.",
      },
      {
        priority: 0,
        tool: "reconstruct_worked_example",
        purpose: "Compare calculated facts and fired rules with an adjudicated source example.",
      },
      {
        priority: 1,
        tool: "search_reviewed_rules",
        purpose: "Retrieve only rights-permitted, approved rules using structured fact requirements.",
      },
      {
        priority: 1,
        tool: "compare_traditions",
        purpose: "Show independent outputs and contradictions without averaging lineages.",
      },
      {
        priority: 1,
        tool: "analyze_lal_kitab",
        purpose:
          "Source-only structural inspector is implemented; keep prediction and remedies blocked until its rule and review gates pass.",
      },
      {
        priority: 1,
        tool: "record_consultation_outcome",
        purpose: "Collect consented, versioned outcomes without feeding narration back as truth.",
      },
      {
        priority: 2,
        tool: "get_validation_report",
        purpose: "Publish coverage, abstention, base-rate and holdout metrics by engine version.",
      },
    ],
    safety: {
      abstainWhen: [
        "the required tradition has source-only or not-started status",
        "birth-time uncertainty changes required houses or Vargas",
        "a claim lacks an approved rule or has an open contradiction",
        "the request asks for medical, legal, financial, fertility, lifespan or guaranteed-event certainty",
      ],
      notice:
        "More calculations do not by themselves make predictions more reliable; source fidelity, independent review, worked-example reconstruction and blind calibration are separate gates.",
    },
  };
}
