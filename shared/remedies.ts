import type { EvidenceObservation, QuestionCategory } from "./consultation";
import type { TopicJudgment } from "./judgment";
import type { ChartResult } from "./schema";
import { calculateDevataProfile } from "./devata";

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

export type PracticePreferences={beliefMode:"secular"|"spiritual"|"tradition-specific";tradition?:string;maximumBurden:"minimal"|"moderate";maximumCost:"free"|"low";allowPrayer:boolean;allowCharity:boolean;accessibilityNotes?:string[]};
export type RemedyFamily="conduct"|"prayer"|"charity"|"fasting"|"mantra"|"worship"|"pilgrimage"|"ritual"|"gemstone"|"qualified-referral";
export const REMEDY_FAMILY_GATES:Record<RemedyFamily,{automaticEligibility:boolean;requiredReview:string[];contraindications:string[];supervision:"none"|"health-screen"|"qualified-teacher"|"qualified-practitioner"}>={conduct:{automaticEligibility:true,requiredReview:[],contraindications:["coercive, unsafe or unaffordable conduct"],supervision:"none"},prayer:{automaticEligibility:true,requiredReview:["must be familiar and user-chosen"],contraindications:["conflict with the user's faith or wishes"],supervision:"none"},charity:{automaticEligibility:true,requiredReview:["generic voluntary giving only"],contraindications:["financial burden","prescribed recipient or material without reviewed rule"],supervision:"none"},fasting:{automaticEligibility:false,requiredReview:["reviewed source rule","individual health and accessibility screening"],contraindications:["pregnancy","diabetes or metabolic risk","eating disorder history","medication or clinician conflict"],supervision:"health-screen"},mantra:{automaticEligibility:false,requiredReview:["rights-cleared text and audio","lineage approval","initiation-status review"],contraindications:["initiation-only practice","unreviewed pronunciation","replacement of existing tradition"],supervision:"qualified-teacher"},worship:{automaticEligibility:false,requiredReview:["lineage approval","user tradition and consent"],contraindications:["claiming a deity is angry","religious coercion"],supervision:"qualified-teacher"},pilgrimage:{automaticEligibility:false,requiredReview:["accessibility, cost and travel-safety review"],contraindications:["financial pressure","unsafe travel","accessibility conflict"],supervision:"qualified-practitioner"},ritual:{automaticEligibility:false,requiredReview:["rights and procedure review","lineage approval","cost ceiling"],contraindications:["animal harm","fire or ingestion risk","fear-based pressure","costly escalation"],supervision:"qualified-practitioner"},gemstone:{automaticEligibility:false,requiredReview:["functional-lord analysis","strengthening-risk analysis","independent practitioner approval","cost and return policy"],contraindications:["automatic weak-planet strengthening","medical claims","debt or financial pressure"],supervision:"qualified-practitioner"},"qualified-referral":{automaticEligibility:true,requiredReview:[],contraindications:["referral presented as mandatory","undisclosed financial interest"],supervision:"none"}};
export function evaluateRemedyFamilyEligibility(preferences:PracticePreferences){return Object.entries(REMEDY_FAMILY_GATES).map(([family,gate])=>{const preferenceAllowed=family!=="prayer"&&family!=="worship"&&family!=="mantra"?family!=="charity"||preferences.allowCharity:preferences.allowPrayer&&preferences.beliefMode!=="secular",costAllowed=preferences.maximumCost==="low"||!["pilgrimage","ritual","gemstone"].includes(family),burdenAllowed=preferences.maximumBurden==="moderate"||!["fasting","pilgrimage","ritual"].includes(family),eligible=gate.automaticEligibility&&preferenceAllowed&&costAllowed&&burdenAllowed;return{family:family as RemedyFamily,eligible,status:eligible?"eligible-low-risk":"withheld",reasons:[...(!gate.automaticEligibility?["not eligible for automatic prescription"]:[]),...(!preferenceAllowed?["not permitted by user preferences"]:[]),...(!costAllowed?["exceeds cost ceiling"]:[]),...(!burdenAllowed?["exceeds burden ceiling"]:[])],...gate}})}
export function buildRemedyProtocol(judgment:TopicJudgment,preferences:PracticePreferences){const practices=[{id:"evidence-journal",family:"conduct",label:"Evidence and decision journal",instructions:"Write the decision, known facts, assumptions, alternatives and a review date. Revisit the real-world outcome without treating the chart as the sole cause.",cost:"free",burden:"minimal",requiresInitiation:false,sourceStatus:"practical-not-astrological"},{id:"steady-service",family:"conduct",label:"One sustainable act of service",instructions:"Choose one voluntary, safe and affordable act of practical help. Do not treat it as a transaction that guarantees an outcome.",cost:"free",burden:"minimal",requiresInitiation:false,sourceStatus:"structural-unreviewed"},...(preferences.allowPrayer&&preferences.beliefMode!=="secular"?[{id:"voluntary-reflection",family:"prayer",label:"Voluntary prayer or quiet reflection",instructions:`Use a familiar prayer or reflective practice from ${preferences.tradition||"your own tradition"}. No new mantra, initiation or astrological hour is prescribed.`,cost:"free",burden:"minimal",requiresInitiation:false,sourceStatus:"user-tradition-not-chart-prescription"}]:[])],eligible=practices.filter(item=>(preferences.maximumCost!=="free"||item.cost==="free")&&(preferences.maximumBurden!=="minimal"||item.burden==="minimal"));return{schemaVersion:"sahadeva-remedy-protocol-3",judgmentId:judgment.id,diagnosis:{topic:judgment.topic,status:judgment.status,supportingEvidence:judgment.supportingEvidence.map(item=>item.id),opposingEvidence:judgment.opposingEvidence.map(item=>item.id),timing:judgment.timingActivation.status,uncertainty:judgment.uncertainty.level},outcome:judgment.status==="supported"&&!judgment.opposingEvidence.length?"no-remedy-needed":"optional-low-burden-support-only",preferences,remedyFamilyEligibility:evaluateRemedyFamilyEligibility(preferences),eligiblePractices:eligible,traditionalChartRemedies:[],traditionalRemedyStatus:"withheld-until-reviewed",contraindications:["Do not replace medical, legal, financial or mental-health care.","Do not purchase gemstones or costly rituals from this output.","Do not display initiation-only mantras as casual instructions.","Stop any fasting or physical practice that conflicts with health needs."],followUp:{suggested:true,question:"What observable real-world change, if any, occurred by the review date?",causalityNotice:"A follow-up cannot establish that a practice caused the outcome."}};}

export function buildChartRemedyProtocol(chart:ChartResult,judgment:TopicJudgment,preferences:PracticePreferences){const base=buildRemedyProtocol(judgment,preferences),devata=calculateDevataProfile(chart),traditionalChartRemedies=[{id:"muhurta-as-remedy",family:"muhurta",label:"Begin the relevant activity in a separately calculated suitable window",trigger:{topic:judgment.topic,status:judgment.status},publicationStatus:"principle-grounded-specific-window-not-calculated",source:{work:"Vedic Remedies in Astrology",section:"1.1.3 Remedial Measures"},instructionBoundary:"Call find_muhurta with the actual activity and date range; do not infer a time from this protocol."},...(preferences.allowCharity?[{id:"voluntary-charity",family:"charity",label:"Voluntary affordable giving",trigger:{opposingEvidence:judgment.opposingEvidence.map(item=>item.id)},publicationStatus:"general-practice-only-specific-material-withheld",source:{work:"Vedic Remedies in Astrology",section:"1.10.2 Remedies for Adverse Dasa"},instructionBoundary:"Choose an ordinary, affordable charitable act. Specific materials, quantities and recipients require reviewed rules and must never be financially burdensome."}]:[]),...(preferences.allowPrayer&&preferences.beliefMode!=="secular"?[{id:"devata-orientation",family:"devata",label:"Respectful orientation to an existing devotional tradition",trigger:{ishtaCandidate:devata.ishtaDevata.selected.planet,deityCandidates:devata.ishtaDevata.deityCandidates},publicationStatus:"calculated-symbolic-candidate-no-mantra-prescribed",source:{work:"Vedic Remedies in Astrology",section:"1.12.1 Ista Devata & Dharma Devata"},instructionBoundary:"Do not begin an initiation-only mantra from this output. If this symbolism fits the user's existing tradition, discuss it with a qualified teacher."}]:[])];return{...base,schemaVersion:"sahadeva-remedy-protocol-3",chartDiagnosis:{engineVersion:chart.engine.version,birthTimeSensitivity:devata.birthTimeSensitivity,devataProfile:devata},traditionalChartRemedies,traditionalRemedyStatus:"calculated-candidates-with-publication-gates",sourceCoverage:{parsedWorks:[{work:"Vedic Remedies in Astrology",author:"Sanjay Rath",sections:["1.1.3","1.10.2","1.12.1-1.12.4"]}],ruleReview:"awaiting-independent-review",verbatimMantrasPublished:false},decisionTrace:["Determine the topic judgment and whether support is actually needed.","Respect belief, cost, burden, prayer and charity preferences.","Calculate symbolic deity anchors separately from immediate remedies.","Expose only low-risk practices; gate mantras, gemstones, fasting and costly ritual behind review and qualified guidance."]};}
