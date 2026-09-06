import type { EvidenceObservation, QuestionCategory } from "./consultation";
import type { TopicJudgment } from "./judgment";
import type { ChartResult } from "./schema";
import { calculateDevataProfile } from "./devata";
import { buildAfflictionRemedyPlan } from "./afflictionRemedies";
import { buildComprehensiveRemedies } from "./comprehensiveRemedies";
import { analyzeLalKitabInference } from "./lalKitabInference";

export type RemedyRecord = {
  id: string;
  label: string;
  categories: QuestionCategory[];
  triggerRuleIds: string[];
  instructions: string;
  timing: string;
  burden: "minimal" | "moderate";
  sourceIds: string[];
  reviewStatus: "structural-unreviewed" | "reviewed" | "publishable";
  contraindications: string[];
};

// Only low-cost, non-medical, optional practices belong in the default registry.
export const REMEDY_REGISTRY: RemedyRecord[] = [
  {
    id: "reflective-discipline",
    label: "A small act of disciplined service",
    categories: ["career", "money", "property", "general"],
    triggerRuleIds: ["prashna:saturn-pressure"],
    instructions:
      "Choose a modest, voluntary act of service or practical assistance this week. Treat it as reflection and conduct, not as a guaranteed transaction with fate.",
    timing: "Once within the next seven days, at a practical and safe time.",
    burden: "minimal",
    sourceIds: [],
    reviewStatus: "structural-unreviewed",
    contraindications: [],
  },
  {
    id: "clear-communication",
    label: "Deliberate clear communication",
    categories: ["career", "relationship", "money", "travel", "general"],
    triggerRuleIds: ["prashna:lord-combust", "prashna:mercury-pressure"],
    instructions:
      "Before acting, write the request, promise, or agreement plainly and verify that all parties understand it. This is practical conduct, not a supernatural guarantee.",
    timing: "Immediately before the next relevant conversation or agreement.",
    burden: "minimal",
    sourceIds: [],
    reviewStatus: "structural-unreviewed",
    contraindications: [],
  },
  {
    id: "quiet-reflection",
    label: "Brief voluntary prayer or reflection",
    categories: [
      "career",
      "relationship",
      "money",
      "property",
      "travel",
      "lost-object",
      "general",
    ],
    triggerRuleIds: [],
    instructions:
      "If it fits your beliefs, take a few quiet minutes for prayer, reflection, or mindful breathing before the next practical step.",
    timing:
      "Before the next practical action; no astrological hour is required.",
    burden: "minimal",
    sourceIds: [],
    reviewStatus: "structural-unreviewed",
    contraindications: [],
  },
];

export function matchRemedies(
  category: QuestionCategory,
  observations: EvidenceObservation[],
  publishableOnly = true,
) {
  const ids = new Set(observations.map((item) => item.provenance.ruleId));
  return REMEDY_REGISTRY.filter(
    (item) =>
      item.categories.includes(category) &&
      (item.triggerRuleIds.length === 0 ||
        item.triggerRuleIds.some((id) => ids.has(id))) &&
      (!publishableOnly || item.reviewStatus === "publishable"),
  )
    .slice(0, 2)
    .map((item) => ({
      id: item.id,
      label: item.label,
      instructions: item.instructions,
      timing: item.timing,
      optional: true as const,
      sourceIds: item.sourceIds,
      reviewStatus: item.reviewStatus,
    }));
}

export type PracticePreferences = {
  beliefMode: "hindu" | "spiritual" | "tradition-specific";
  tradition?: string;
  maximumBurden: "minimal" | "moderate";
  maximumCost: "free" | "low";
  allowPrayer: boolean;
  allowCharity: boolean;
  accessibilityNotes?: string[];
};
export type RemedyFamily =
  | "conduct"
  | "prayer"
  | "charity"
  | "fasting"
  | "mantra"
  | "worship"
  | "pilgrimage"
  | "ritual"
  | "gemstone"
  | "muhurta"
  | "devata-orientation"
  | "qualified-referral";
export const REMEDY_FAMILY_GATES: Record<
  RemedyFamily,
  {
    automaticEligibility: boolean;
    requiredReview: string[];
    contraindications: string[];
    supervision:
      "none" | "health-screen" | "qualified-teacher" | "qualified-practitioner";
  }
> = {
  conduct: {
    automaticEligibility: true,
    requiredReview: [],
    contraindications: ["coercive, unsafe or unaffordable conduct"],
    supervision: "none",
  },
  prayer: {
    automaticEligibility: true,
    requiredReview: ["must be familiar and user-chosen"],
    contraindications: ["conflict with the user's faith or wishes"],
    supervision: "none",
  },
  charity: {
    automaticEligibility: true,
    requiredReview: ["generic voluntary giving only"],
    contraindications: [
      "financial burden",
      "prescribed recipient or material without reviewed rule",
    ],
    supervision: "none",
  },
  fasting: {
    automaticEligibility: false,
    requiredReview: [
      "reviewed source rule",
      "individual health and accessibility screening",
    ],
    contraindications: [
      "pregnancy",
      "diabetes or metabolic risk",
      "eating disorder history",
      "medication or clinician conflict",
    ],
    supervision: "health-screen",
  },
  mantra: {
    automaticEligibility: false,
    requiredReview: [
      "rights-cleared text and audio",
      "lineage approval",
      "initiation-status review",
    ],
    contraindications: [
      "initiation-only practice",
      "unreviewed pronunciation",
      "replacement of existing tradition",
    ],
    supervision: "qualified-teacher",
  },
  worship: {
    automaticEligibility: false,
    requiredReview: ["lineage approval", "user tradition and consent"],
    contraindications: ["claiming a deity is angry", "religious coercion"],
    supervision: "qualified-teacher",
  },
  pilgrimage: {
    automaticEligibility: false,
    requiredReview: ["accessibility, cost and travel-safety review"],
    contraindications: [
      "financial pressure",
      "unsafe travel",
      "accessibility conflict",
    ],
    supervision: "qualified-practitioner",
  },
  ritual: {
    automaticEligibility: false,
    requiredReview: [
      "rights and procedure review",
      "lineage approval",
      "cost ceiling",
    ],
    contraindications: [
      "animal harm",
      "fire or ingestion risk",
      "fear-based pressure",
      "costly escalation",
    ],
    supervision: "qualified-practitioner",
  },
  gemstone: {
    automaticEligibility: false,
    requiredReview: [
      "functional-lord analysis",
      "strengthening-risk analysis",
      "independent practitioner approval",
      "cost and return policy",
    ],
    contraindications: [
      "automatic weak-planet strengthening",
      "medical claims",
      "debt or financial pressure",
    ],
    supervision: "qualified-practitioner",
  },
  muhurta: {
    automaticEligibility: false,
    requiredReview: [
      "actual activity, location and date range",
      "separate Muhurta calculation",
    ],
    contraindications: [
      "invented time",
      "guaranteed outcome",
      "delay of urgent practical action",
    ],
    supervision: "qualified-practitioner",
  },
  "devata-orientation": {
    automaticEligibility: false,
    requiredReview: [
      "lineage selection",
      "user tradition and consent",
      "qualified-teacher discussion",
    ],
    contraindications: [
      "claiming a deity is angry",
      "religious coercion",
      "casual mantra prescription",
    ],
    supervision: "qualified-teacher",
  },
  "qualified-referral": {
    automaticEligibility: true,
    requiredReview: [],
    contraindications: [
      "referral presented as mandatory",
      "undisclosed financial interest",
    ],
    supervision: "none",
  },
};

export type TraditionalRemedyGateContext = {
  diagnosisEstablished: boolean;
  userConsented: boolean;
  nonFearBased: boolean;
  doesNotReplaceProfessionalCare: boolean;
  withinMeans: boolean;
  sourceApproved: boolean;
  rightsCleared: boolean;
  lineageApproved: boolean;
  initiationSatisfied: boolean;
  healthScreened: boolean;
  practitionerApproved: boolean;
  strengtheningRiskReviewed: boolean;
  exactProcedureReviewed: boolean;
  separateCalculationCompleted: boolean;
};
type RemedyGateKey = keyof TraditionalRemedyGateContext;
export type RemedyPolicyRule = {
  id: string;
  version: number;
  sourceKey: string;
  appliesTo: RemedyFamily[] | "all-traditional";
  requirements: RemedyGateKey[];
  interpretation: string;
  harmClass:
    "general-cultural" | "sensitive-reflective" | "high-impact-restricted";
  reviewStatus: "draft";
};
export const REMEDY_POLICY_RULES: RemedyPolicyRule[] = [
  {
    id: "rath-diagnosis-before-remedy",
    version: 1,
    sourceKey: "book-rath-remedies:L2588-L2610:two-stage-process",
    appliesTo: "all-traditional",
    requirements: [
      "diagnosisEstablished",
      "userConsented",
      "nonFearBased",
      "doesNotReplaceProfessionalCare",
    ],
    interpretation:
      "Determine the immediate problem before offering a traditional candidate; consent and non-fear framing are mandatory.",
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  },
  {
    id: "rath-muhurta-separate-calculation",
    version: 1,
    sourceKey: "book-rath-remedies:L95-L112:section-1.1.3",
    appliesTo: ["muhurta"],
    requirements: ["separateCalculationCompleted"],
    interpretation:
      "Muhurta may be routed as a separate calculation for the actual activity, location and range; no time may be invented by the remedy protocol.",
    harmClass: "sensitive-reflective",
    reviewStatus: "draft",
  },
  {
    id: "rath-charity-means-ceiling",
    version: 1,
    sourceKey: "book-rath-remedies:L1207-L1260:sections-1.10.2-1.10.3",
    appliesTo: ["charity", "pilgrimage", "ritual"],
    requirements: ["withinMeans", "sourceApproved", "practitionerApproved"],
    interpretation:
      "Specific donations or costly acts require an approved source, an affordability ceiling and independent practitioner review.",
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  },
  {
    id: "rath-mantra-governance",
    version: 1,
    sourceKey: "book-rath-remedies:L4446-L4714:section-1.16",
    appliesTo: ["mantra"],
    requirements: [
      "sourceApproved",
      "rightsCleared",
      "lineageApproved",
      "initiationSatisfied",
      "exactProcedureReviewed",
    ],
    interpretation:
      "A mantra requires reviewed source, rights, lineage, initiation status and procedure; the engine must not publish initiation-only text casually.",
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  },
  {
    id: "rath-devata-lineage-consent",
    version: 1,
    sourceKey: "book-rath-remedies:L2588-L2675:sections-1.12-1.12.1",
    appliesTo: ["worship", "devata-orientation"],
    requirements: ["userConsented", "lineageApproved", "practitionerApproved"],
    interpretation:
      "A calculated Devata is a lineage-specific symbolic candidate and becomes practice guidance only with consent and qualified review.",
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  },
  {
    id: "rath-fasting-health-gate",
    version: 1,
    sourceKey: "book-rath-remedies:L3159-L3352:section-1.14",
    appliesTo: ["fasting"],
    requirements: ["healthScreened", "sourceApproved", "practitionerApproved"],
    interpretation:
      "Fasting is withheld without individualized health, accessibility, source and practitioner review.",
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  },
  {
    id: "rath-gemstone-strengthening-gate",
    version: 1,
    sourceKey: "book-larsen-fundamentals:L2038:argala-strengthening-warning",
    appliesTo: ["gemstone"],
    requirements: [
      "sourceApproved",
      "practitionerApproved",
      "strengtheningRiskReviewed",
      "withinMeans",
    ],
    interpretation:
      "A gemstone cannot be selected by weak-planet logic alone; strengthening and Argala-obstruction risks require independent review.",
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  },
  {
    id: "rath-ritual-procedure-gate",
    version: 1,
    sourceKey: "book-rath-remedies:L3159-L4242:kastha-remedy-procedures",
    appliesTo: ["ritual", "pilgrimage"],
    requirements: [
      "sourceApproved",
      "rightsCleared",
      "lineageApproved",
      "exactProcedureReviewed",
      "withinMeans",
      "practitionerApproved",
    ],
    interpretation:
      "Ritual and pilgrimage candidates require reviewed procedure, lineage, safety, cost and practitioner gates.",
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  },
];
const TRADITIONAL_FAMILIES = new Set<RemedyFamily>([
  "charity",
  "fasting",
  "mantra",
  "worship",
  "pilgrimage",
  "ritual",
  "gemstone",
  "muhurta",
  "devata-orientation",
]);
export function assessTraditionalRemedyCandidate(
  family: RemedyFamily,
  context: TraditionalRemedyGateContext,
) {
  const rules = REMEDY_POLICY_RULES.filter((rule) =>
      rule.appliesTo === "all-traditional"
        ? TRADITIONAL_FAMILIES.has(family)
        : rule.appliesTo.includes(family),
    ),
    evaluations = rules.map((rule) => {
      const failedRequirements = rule.requirements.filter(
        (key) => !context[key],
      );
      return {
        ruleId: rule.id,
        sourceKey: rule.sourceKey,
        passed: failedRequirements.length === 0,
        failedRequirements,
        interpretation: rule.interpretation,
        harmClass: rule.harmClass,
        reviewStatus: rule.reviewStatus,
      };
    }),
    blockers = evaluations.flatMap((row) =>
      row.failedRequirements.map((requirement) => ({
        ruleId: row.ruleId,
        requirement,
      })),
    );
  return {
    schemaVersion: "sahadeva-remedy-policy-assessment-1",
    family,
    status: blockers.length ? "withheld" : "eligible-after-policy-gates",
    publishable: false,
    evaluations,
    blockers,
    notice:
      "Passing draft policy gates does not publish a traditional remedy; passage, rights and two-reviewer approvals remain required.",
  };
}

export function buildRemedyChoiceCatalog(preferences: PracticePreferences) {
  return [
    {
      family: "conduct" as const,
      label: "Practical conduct or seva",
      availability: "available-now",
      choicePrompt:
        "Would you like a simple conduct or seva option alongside the traditional remedies?",
    },
    {
      family: "prayer" as const,
      label: "Familiar prayer",
      availability: preferences.allowPrayer
        ? "selected-option"
        : "available-by-choice",
      choicePrompt:
        "Would you like prayer included, and which form of your family or chosen tradition do you follow?",
    },
    {
      family: "mantra" as const,
      label: "Guru-guided mantra",
      availability: "available-after-questions",
      examples: [
        {
          name: "Mahamrityunjaya Mantra",
          devanagari:
            "ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् । उर्वारुकमिव बन्धनान् मृत्योर्मुक्षीय मामृतात् ॥",
          mantraText:
            "Om Tryambakaṃ Yajāmahe Sugandhiṃ Puṣṭivardhanam, Urvārukamiva Bandhanān Mṛtyor Mukṣīya Mā'mṛtāt.",
          textAvailability: "classical-public-form-shown",
          textProvenance:
            "Classical public-domain formula; not reproduced from a restricted modern edition.",
          optional: true,
          guruConfirmationRequired: true,
          guruConfirmationPrompt:
            "Please confirm this mantra, its pronunciation, repetition count, timing, and diksha requirements with your Guru before beginning.",
        },
        {
          name: "Panchakshari Shiva Mantra",
          devanagari: "ॐ नमः शिवाय",
          mantraText: "Om Namaḥ Śivāya.",
          textAvailability: "classical-public-form-shown",
          textProvenance:
            "Classical public-domain formula; not reproduced from a restricted modern edition.",
          optional: true,
          guruConfirmationRequired: true,
          guruConfirmationPrompt:
            "Please confirm this mantra, its pronunciation, repetition count, timing, and diksha requirements with your Guru before beginning.",
        },
        {
          name: "Narayana Mantra",
          devanagari: "ॐ नमो नारायणाय",
          mantraText: "Om Namo Nārāyaṇāya.",
          textAvailability: "classical-public-form-shown",
          textProvenance:
            "Classical public-domain formula; not reproduced from a restricted modern edition.",
          optional: true,
          guruConfirmationRequired: true,
          guruConfirmationPrompt:
            "Please confirm this mantra, its pronunciation, repetition count, timing, and diksha requirements with your Guru before beginning.",
        },
        {
          name: "Surya Nama Mantra",
          devanagari: "ॐ सूर्याय नमः",
          mantraText: "Om Sūryāya Namaḥ.",
          textAvailability: "classical-public-form-shown",
          textProvenance:
            "Classical public-domain formula; not reproduced from a restricted modern edition.",
          optional: true,
          guruConfirmationRequired: true,
          guruConfirmationPrompt:
            "Please confirm this mantra, its pronunciation, repetition count, timing, and diksha requirements with your Guru before beginning.",
        },
      ],
      choicePrompt:
        "These mantra texts are optional choices. Before beginning, please ask your Guru to confirm the suitable mantra, pronunciation, repetition count, timing, and whether diksha is required.",
    },
    {
      family: "worship" as const,
      label: "Puja or Devata worship",
      availability: "available-after-questions",
      choicePrompt:
        "Which Devata, temple, sampradaya or family tradition are you already connected with?",
    },
    {
      family: "charity" as const,
      label: "Dana or affordable charity",
      availability: preferences.allowCharity
        ? "selected-generic-option"
        : "available-by-choice",
      choicePrompt:
        "Would you like charity options, and what maximum amount or material burden is comfortable?",
    },
    {
      family: "fasting" as const,
      label: "Vrata or fasting",
      availability: "available-after-health-check",
      choicePrompt:
        "Do pregnancy, diabetes, eating-disorder history, medication, age, work demands or clinician advice make fasting unsuitable? A non-food vrata can be considered.",
    },
    {
      family: "muhurta" as const,
      label: "Muhurta for beginning the activity",
      availability: "available-after-activity-details",
      choicePrompt:
        "What exact activity, place and date range should the Muhurta cover?",
    },
    {
      family: "pilgrimage" as const,
      label: "Temple visit or pilgrimage",
      availability: "available-after-travel-check",
      choicePrompt:
        "Would you prefer a nearby temple, and what travel, accessibility and budget limits should be respected?",
    },
    {
      family: "ritual" as const,
      label: "Reviewed ritual or homa",
      availability: "available-with-qualified-practitioner",
      choicePrompt:
        "Do you want a ritual option, and do you have a trusted priest or practitioner who can confirm procedure and cost first?",
    },
    {
      family: "gemstone" as const,
      label: "Gemstone assessment",
      availability: "available-as-assessment-not-purchase-order",
      choicePrompt:
        "Would you like a gemstone suitability review, including reasons not to strengthen the planet, alternatives, budget and return-policy requirements?",
    },
  ];
}

export function buildRemedyIntakeQuestions(preferences: PracticePreferences) {
  return [
    {
      id: "tradition",
      question:
        "Which Hindu sampradaya, family tradition, Guru, Ishta Devata or temple tradition do you follow, if any?",
      requiredFor: ["mantra", "worship", "devata-orientation"],
    },
    {
      id: "choice",
      question:
        "Which options would you like to see: prayer, mantra, puja, charity, vrata, Muhurta, temple visit, ritual, gemstone assessment, or practical seva?",
      requiredFor: ["all-traditional"],
    },
    {
      id: "guru",
      question:
        "Do you have mantra diksha or access to a Guru? Please confirm your selected mantra, pronunciation, repetition count, timing, and any diksha or restricted-procedure requirements with your Guru before beginning.",
      requiredFor: ["mantra"],
    },
    {
      id: "health",
      question:
        "Is there any pregnancy, diabetes, eating-disorder history, medication, disability, age or clinician advice relevant to fasting or physical practices?",
      requiredFor: ["fasting"],
    },
    {
      id: "budget",
      question: `Should choices remain ${preferences.maximumCost === "free" ? "free only" : "free or low cost"}, or do you want to set a specific maximum?`,
      requiredFor: ["charity", "pilgrimage", "ritual", "gemstone"],
    },
    {
      id: "accessibility",
      question:
        "Do travel, mobility, language, timing, fire, smoke, food or sensory needs affect which practice is suitable?",
      requiredFor: ["fasting", "pilgrimage", "ritual"],
    },
    {
      id: "professional-care",
      question:
        "Is this concern also medical, legal, financial or mental-health related, so the practice can remain complementary rather than replacing professional care?",
      requiredFor: ["all-traditional"],
    },
  ];
}
export function evaluateRemedyFamilyEligibility(
  preferences: PracticePreferences,
) {
  return Object.entries(REMEDY_FAMILY_GATES).map(([family, gate]) => {
    const preferenceAllowed =
        family !== "prayer" && family !== "worship" && family !== "mantra"
          ? family !== "charity" || preferences.allowCharity
          : preferences.allowPrayer,
      costAllowed =
        preferences.maximumCost === "low" ||
        !["pilgrimage", "ritual", "gemstone"].includes(family),
      burdenAllowed =
        preferences.maximumBurden === "moderate" ||
        !["fasting", "pilgrimage", "ritual"].includes(family),
      eligible =
        gate.automaticEligibility &&
        preferenceAllowed &&
        costAllowed &&
        burdenAllowed;
    return {
      family: family as RemedyFamily,
      eligible,
      status: eligible
        ? "selected-and-eligible"
        : !preferenceAllowed
          ? "available-by-choice"
          : !costAllowed
            ? "available-after-cost-choice"
            : !burdenAllowed
              ? "available-after-burden-choice"
              : "available-with-requirements",
      reasons: [
        ...(!gate.automaticEligibility
          ? ["requires the listed checks before personalized instruction"]
          : []),
        ...(!preferenceAllowed
          ? ["not selected yet; still shown as a choice"]
          : []),
        ...(!costAllowed
          ? ["above the current cost choice; ask before proceeding"]
          : []),
        ...(!burdenAllowed
          ? ["above the current burden choice; ask before proceeding"]
          : []),
      ],
      ...gate,
    };
  });
}
export function buildRemedyProtocol(
  judgment: TopicJudgment,
  preferences: PracticePreferences,
) {
  const practices = [
      {
        id: "evidence-journal",
        family: "conduct",
        label: "Evidence and decision journal",
        instructions:
          "Write the decision, known facts, assumptions, alternatives and a review date. Revisit the real-world outcome without treating the chart as the sole cause.",
        cost: "free",
        burden: "minimal",
        requiresInitiation: false,
        sourceStatus: "practical-not-astrological",
      },
      {
        id: "steady-service",
        family: "conduct",
        label: "One sustainable act of service",
        instructions:
          "Choose one voluntary, safe and affordable act of practical help. Do not treat it as a transaction that guarantees an outcome.",
        cost: "free",
        burden: "minimal",
        requiresInitiation: false,
        sourceStatus: "structural-unreviewed",
      },
      ...(preferences.allowPrayer
        ? [
            {
              id: "voluntary-reflection",
              family: "prayer",
              label: "Voluntary prayer or quiet reflection",
              instructions: `Use a familiar prayer or reflective practice from ${preferences.tradition || "your own tradition"}. No new mantra, initiation or astrological hour is prescribed.`,
              cost: "free",
              burden: "minimal",
              requiresInitiation: false,
              sourceStatus: "user-tradition-not-chart-prescription",
            },
          ]
        : []),
    ],
    eligible = practices.filter(
      (item) =>
        (preferences.maximumCost !== "free" || item.cost === "free") &&
        (preferences.maximumBurden !== "minimal" || item.burden === "minimal"),
    );
  return {
    schemaVersion: "sahadeva-remedy-protocol-4",
    judgmentId: judgment.id,
    diagnosis: {
      topic: judgment.topic,
      status: judgment.status,
      supportingEvidence: judgment.supportingEvidence.map((item) => item.id),
      opposingEvidence: judgment.opposingEvidence.map((item) => item.id),
      timing: judgment.timingActivation.status,
      uncertainty: judgment.uncertainty.level,
    },
    outcome:
      judgment.status === "supported" && !judgment.opposingEvidence.length
        ? "no-remedy-needed"
        : "optional-low-burden-support-only",
    preferences,
    availableChoices: buildRemedyChoiceCatalog(preferences),
    intakeQuestions: buildRemedyIntakeQuestions(preferences),
    remedyFamilyEligibility: evaluateRemedyFamilyEligibility(preferences),
    eligiblePractices: eligible,
    traditionalChartRemedies: [],
    traditionalRemedyStatus: "withheld-until-reviewed",
    contraindications: [
      "Do not replace medical, legal, financial or mental-health care.",
      "Do not purchase gemstones or costly rituals from this output.",
      "Do not display initiation-only mantras as casual instructions.",
      "Stop any fasting or physical practice that conflicts with health needs.",
    ],
    followUp: {
      suggested: true,
      question:
        "What observable real-world change, if any, occurred by the review date?",
      causalityNotice:
        "A follow-up cannot establish that a practice caused the outcome.",
    },
  };
}

export function buildChartRemedyProtocol(
  chart: ChartResult,
  judgment: TopicJudgment,
  preferences: PracticePreferences,
) {
  const base = buildRemedyProtocol(judgment, preferences),
    devata = calculateDevataProfile(chart),
    traditionalChartRemedies = [
      {
        id: "muhurta-as-remedy",
        family: "muhurta",
        label:
          "Begin the relevant activity in a separately calculated suitable window",
        trigger: { topic: judgment.topic, status: judgment.status },
        publicationStatus: "principle-grounded-specific-window-not-calculated",
        source: {
          work: "Vedic Remedies in Astrology",
          section: "1.1.3 Remedial Measures",
        },
        instructionBoundary:
          "Call find_muhurta with the actual activity and date range; do not infer a time from this protocol.",
      },
      ...(preferences.allowCharity
        ? [
            {
              id: "voluntary-charity",
              family: "charity",
              label: "Voluntary affordable giving",
              trigger: {
                opposingEvidence: judgment.opposingEvidence.map(
                  (item) => item.id,
                ),
              },
              publicationStatus:
                "general-practice-only-specific-material-withheld",
              source: {
                work: "Vedic Remedies in Astrology",
                section: "1.10.2 Remedies for Adverse Dasa",
              },
              instructionBoundary:
                "Choose an ordinary, affordable charitable act. Specific materials, quantities and recipients require reviewed rules and must never be financially burdensome.",
            },
          ]
        : []),
      ...(preferences.allowPrayer
        ? [
            {
              id: "devata-orientation",
              family: "devata",
              label:
                "Respectful orientation to an existing devotional tradition",
              trigger: {
                ishtaCandidate: devata.ishtaDevata.selected.planet,
                deityCandidates: devata.ishtaDevata.deityCandidates,
              },
              publicationStatus:
                "calculated-symbolic-candidate-no-mantra-prescribed",
              source: {
                work: "Vedic Remedies in Astrology",
                section: "1.12.1 Ista Devata & Dharma Devata",
              },
              instructionBoundary:
                "Do not begin an initiation-only mantra from this output. If this symbolism fits the user's existing tradition, discuss it with a qualified teacher.",
            },
          ]
        : []),
    ],
    defaultGateContext: TraditionalRemedyGateContext = {
      diagnosisEstablished: judgment.status !== "unknown",
      userConsented: true,
      nonFearBased: true,
      doesNotReplaceProfessionalCare: true,
      withinMeans: true,
      sourceApproved: false,
      rightsCleared: false,
      lineageApproved: false,
      initiationSatisfied: false,
      healthScreened: false,
      practitionerApproved: false,
      strengtheningRiskReviewed: false,
      exactProcedureReviewed: false,
      separateCalculationCompleted: false,
    },
    assessedTraditionalChartRemedies = traditionalChartRemedies.map(
      (candidate) => {
        const family =
            candidate.family === "devata"
              ? "devata-orientation"
              : (candidate.family as RemedyFamily),
          context =
            family === "charity"
              ? {
                  ...defaultGateContext,
                  sourceApproved: true,
                  practitionerApproved: true,
                }
              : defaultGateContext;
        return {
          ...candidate,
          policyAssessment: assessTraditionalRemedyCandidate(family, context),
        };
      },
    );
  return {
    ...base,
    schemaVersion: "sahadeva-remedy-protocol-4",
    chartDiagnosis: {
      engineVersion: chart.engine.version,
      birthTimeSensitivity: devata.birthTimeSensitivity,
      devataProfile: devata,
    },
    afflictionRemedies: buildAfflictionRemedyPlan(chart, {
      beliefMode: preferences.beliefMode,
      maximumBurden: preferences.maximumBurden,
      maximumCost: preferences.maximumCost,
      allowPrayer: preferences.allowPrayer,
      allowCharity: preferences.allowCharity,
    }),
    comprehensiveRepertoire: buildComprehensiveRemedies(chart, {
      // General prayer/cost preferences are not consent for a specific mantra,
      // gemstone or fast. Those remain off until a dedicated gated choice exists.
      allowGemstones: false,
      allowMantras: false,
      allowFasting: false,
      allowCharity: preferences.allowCharity,
    }),
    lalKitabInference: analyzeLalKitabInference(chart, judgment.topic),
    traditionalChartRemedies: assessedTraditionalChartRemedies,
    traditionalRemedyStatus: "calculated-candidates-with-publication-gates",
    sourceCoverage: {
      parsedWorks: [
        {
          work: "Vedic Remedies in Astrology",
          author: "Sanjay Rath",
          sections: ["1.1.3", "1.10.2", "1.12.1-1.12.4"],
        },
      ],
      ruleReview: "awaiting-independent-review",
      verbatimMantrasPublished: false,
      policyCatalog: {
        version: "sahadeva-remedy-policy-1",
        rules: REMEDY_POLICY_RULES.map((rule) => ({
          id: rule.id,
          version: rule.version,
          sourceKey: rule.sourceKey,
          reviewStatus: rule.reviewStatus,
        })),
      },
    },
    decisionTrace: [
      "Determine the topic judgment and whether support is actually needed.",
      "Respect belief, cost, burden, prayer and charity preferences.",
      "Calculate symbolic deity anchors separately from immediate remedies.",
      "Expose only low-risk practices; gate mantras, gemstones, fasting and costly ritual behind review and qualified guidance.",
    ],
  };
}
