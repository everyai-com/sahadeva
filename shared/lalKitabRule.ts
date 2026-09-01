import { z } from "zod";

export const lalKitabConditionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("planet-in-house"),
    planet: z.enum([
      "Jupiter",
      "Sun",
      "Moon",
      "Venus",
      "Mars",
      "Mercury",
      "Saturn",
      "Rahu",
      "Ketu",
    ]),
    house: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("planets-conjoined"),
    planets: z.array(z.string()).min(2),
    house: z.number().int().min(1).max(12).optional(),
    orderSensitive: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("planet-state"),
    planet: z.string(),
    state: z.enum([
      "benefic",
      "malefic",
      "exalted",
      "debilitated",
      "alive",
      "dormant",
      "blind",
      "half-blind",
      "pious",
      "adult",
      "non-adult",
    ]),
  }),
  z.object({
    kind: z.literal("age-window"),
    startAge: z.number().min(0).max(120),
    endAge: z.number().min(0).max(120),
    conventionId: z.string(),
  }),
]);

export const lalKitabRuleCandidateSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  tradition: z.literal("lal-kitab-gosvami-1952"),
  sourceLocator: z.string().startsWith("book-gosvami-lal-kitab:"),
  sourceScanVerification: z.enum(["not-checked", "checked", "adjudicated"]),
  claimType: z.enum([
    "observation",
    "benefic-condition",
    "malefic-condition",
    "exception",
    "cancellation",
    "timing",
    "relationship-correspondence",
    "material-correspondence",
    "remedy",
    "abstention",
  ]),
  conditions: z.array(lalKitabConditionSchema).min(1),
  contraryConditions: z.array(lalKitabConditionSchema).default([]),
  normalizedClaim: z.string().min(1),
  originalWordingStoredInternally: z.boolean(),
  harmClass: z.enum([
    "general-cultural",
    "sensitive-reflective",
    "high-impact-restricted",
    "prohibited-output",
  ]),
  disclosureMode: z.enum([
    "ordinary-cultural",
    "caution-required",
    "source-context-only",
    "historical-record-only",
  ]),
  cautionRequired: z.boolean(),
  uncertaintyRequired: z.boolean(),
  practicalSupportRequired: z.boolean(),
  automaticOutputAllowed: z.boolean(),
  reviewStatus: z.enum([
    "extraction-draft",
    "scan-verified",
    "example-tested",
    "reviewed",
    "publishable",
    "rejected",
  ]),
  reviewerIds: z.array(z.string()),
  contradictionIds: z.array(z.string()),
  notes: z.array(z.string()),
});

export type LalKitabRuleCandidate = z.infer<
  typeof lalKitabRuleCandidateSchema
>;

export const lalKitabPublicationGate = (rule: LalKitabRuleCandidate) => {
  const scanVerified = ["checked", "adjudicated"].includes(
      rule.sourceScanVerification,
    ),
    exampleTested = ["example-tested", "reviewed", "publishable"].includes(
      rule.reviewStatus,
    ),
    twoReviewers = new Set(rule.reviewerIds).size >= 2,
    noOpenContradiction = rule.contradictionIds.length === 0,
    harmAllowed = rule.harmClass !== "prohibited-output",
    disclosureSafeguardsSatisfied =
      rule.harmClass !== "high-impact-restricted" ||
      (rule.disclosureMode !== "ordinary-cultural" &&
        rule.cautionRequired &&
        rule.uncertaintyRequired &&
        rule.practicalSupportRequired);
  return {
    scanVerified,
    exampleTested,
    twoReviewers,
    noOpenContradiction,
    harmAllowed,
    disclosureSafeguardsSatisfied,
    publishableForControlledDisclosure:
      rule.reviewStatus === "publishable" &&
      scanVerified &&
      exampleTested &&
      twoReviewers &&
      noOpenContradiction &&
      harmAllowed &&
      disclosureSafeguardsSatisfied,
    publishable:
      rule.reviewStatus === "publishable" &&
      scanVerified &&
      exampleTested &&
      twoReviewers &&
      noOpenContradiction &&
      harmAllowed &&
      disclosureSafeguardsSatisfied &&
      rule.automaticOutputAllowed,
  };
};
