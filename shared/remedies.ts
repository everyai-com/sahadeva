import type { EvidenceObservation, QuestionCategory } from "./consultation";

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
