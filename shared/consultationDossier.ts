/**
 * Shared whole-person consultation dossier.
 *
 * This module holds the dossier computation previously embedded in the MCP
 * `consult_jyotishya` handler. Both the MCP tool and the web `/api/chat`
 * endpoint build from this one function so the web app narrates the same
 * verified evidence the MCP path returns — priorities, consultation
 * analysis, cross-tradition ledgers and remedies, verification, coverage.
 *
 * Deterministic: no AI calls. Narrator models phrase; they never compute.
 */
import { calculateChart } from "./jyotish";
import { queryDashaAt } from "./dashaCalendar";
import type { birthInputSchema } from "./schema";
import { buildEverydayReading } from "./everydayReading";
import { calculateDoshas } from "./doshas";
import { calculateKpPreview } from "./kp";
import { calculateJaimini } from "./jaimini";
import { detectLifeThemes } from "./synthesisBrain";
import { assessNatalPromise, fuseTiming } from "./timingFusion";
import { synthesizeVargas } from "./vargaSynthesis";
import { buildTopicJudgment } from "./judgment";
import { buildChartRemedyProtocol } from "./remedies";
import { calculateDevataProfile } from "./devata";
import {
  compareTraditionLedgers,
  type TraditionLedger,
} from "./predictionQualityMcp";
import {
  crossTraditionRemedySummary,
  safeProfileProjection,
} from "./mcpSecurity";
import { inspectLalKitabStructure } from "./lalKitab";
import type { z } from "zod";

export type DossierBirth = z.infer<typeof birthInputSchema>;

export type ConsultationTopic =
  | "career"
  | "marriage"
  | "wealth"
  | "education"
  | "children"
  | "property"
  | "health"
  | "spirituality";

export const CONSULTATION_TOPIC_PATTERNS: Array<[ConsultationTopic, RegExp]> = [
  ["marriage", /marri|partner|relationship|spouse|wedding|husband|wife|love life|\u0c35\u0c3f\u0c35\u0c3e\u0c39|\u0c2a\u0c46\u0c33\u0c4d\u0c32\u0c3f|\u0c2d\u0c3e\u0c30\u0c4d\u0c2f|\u0c2d\u0c30\u0c4d\u0c24/i],
  ["health", /health|illness|sick|disease|body|fitness|energy|surgery|wellbeing|well-being|\u0c06\u0c30\u0c4b\u0c17\u0c4d\u0c2f|\u0c05\u0c28\u0c3e\u0c30\u0c4b\u0c17\u0c4d\u0c2f|\u0c1c\u0c2c\u0c4d\u0c2c\u0c41/i],
  ["career", /career|job|work|business|promotion|profession|salary hike|startup|\u0c09\u0c26\u0c4d\u0c2f\u0c4b\u0c17|\u0c35\u0c43\u0c24\u0c4d\u0c24\u0c3f|\u0c35\u0c4d\u0c2f\u0c3e\u0c2a\u0c3e\u0c30/i],
  ["wealth", /money|wealth|finance|income|investment|\u0c27\u0c28\u0c02|\u0c21\u0c2c\u0c4d\u0c2c\u0c41|\u0c38\u0c02\u0c2a\u0c26/i],
  ["education", /education|study|exam|college|degree|\u0c35\u0c3f\u0c26\u0c4d\u0c2f|\u0c1a\u0c26\u0c41\u0c35\u0c41/i],
  ["children", /child|children|kids|baby|pregnan|progeny|conceive|\u0c38\u0c02\u0c24\u0c3e\u0c28|\u0c2a\u0c3f\u0c32\u0c4d\u0c32/i],
];

export function consultationTopicOfShared(
  question: string,
  focus: string,
): ConsultationTopic | null {
  const matched = CONSULTATION_TOPIC_PATTERNS.find(([, pattern]) =>
    pattern.test(question),
  );
  if (matched) return matched[0];
  return [
    "career",
    "marriage",
    "children",
    "education",
    "property",
    "health",
    "spirituality",
  ].includes(focus)
    ? (focus as ConsultationTopic)
    : null;
}

export const COMPLETE_READING_TOPICS: Exclude<ConsultationTopic, "health">[] = [
  "career",
  "marriage",
  "wealth",
  "education",
  "children",
  "property",
  "spirituality",
];

export function completeDomainReadingShared(chart: {
  placements: Array<{ name: string; sign: number }>;
}) {
  const calculated = Object.fromEntries(
    COMPLETE_READING_TOPICS.map((topic) => {
      const vargas = synthesizeVargas(
        chart as Parameters<typeof synthesizeVargas>[0],
        topic as Parameters<typeof synthesizeVargas>[1],
      );
      const promise = assessNatalPromise(
        chart as Parameters<typeof assessNatalPromise>[0],
        topic as Parameters<typeof assessNatalPromise>[1],
      );
      return [
        topic,
        {
          topic,
          primaryHouse: vargas.primaryHouse,
          primaryLord: vargas.primaryLord,
          relevantVargas: vargas.rows.map((row) => row.varga),
          crossVargaJudgment: vargas.judgment,
          crossVargaScore: vargas.score,
          natalPromise: promise,
          interpretationStatus: "structural-research-preview",
        },
      ];
    }),
  ) as unknown as Record<ConsultationTopic, Record<string, unknown>>;
  const lagna = chart.placements.find((item) => item.name === "Lagna")!;
  const sixthSign = (lagna.sign + 5) % 12;
  const twelfthSign = (lagna.sign + 11) % 12;
  const sixthOccupants = chart.placements
    .filter((item) => item.name !== "Lagna" && item.sign === sixthSign)
    .map((item) => item.name);
  const twelfthOccupants = chart.placements
    .filter((item) => item.name !== "Lagna" && item.sign === twelfthSign)
    .map((item) => item.name);
  return {
    identityAndTemperament: {
      anchors: ["Lagna", "Moon", "Sun"],
      status: "included-in-anchors-and-priorities",
    },
    education: calculated.education,
    employment: calculated.career,
    businessAndIndependentWork: {
      evidenceCombination: ["career", "wealth"],
      careerJudgment: calculated.career.crossVargaJudgment,
      resourceJudgment: calculated.wealth.crossVargaJudgment,
      evidenceRefs: ["employment", "moneyAndResources"],
      notice:
        "Business suitability is not inferred from one placement; work structure and resource structure are shown together.",
    },
    moneyAndResources: calculated.wealth,
    loveAndRelationships: {
      evidenceRef: "marriageAndCommitment",
      crossVargaJudgment: calculated.marriage.crossVargaJudgment,
      notice:
        "Relationship quality is broader than marriage timing; communication, consent and lived compatibility remain primary.",
    },
    marriageAndCommitment: calculated.marriage,
    healthRoutinesAndResilience: {
      scope:
        "Traditional routine, workload and rest indicators only; no diagnosis, disease prediction, treatment advice or longevity claim.",
      sixthHouseSign: sixthSign,
      sixthHouseOccupants: sixthOccupants,
      twelfthHouseSign: twelfthSign,
      twelfthHouseOccupants: twelfthOccupants,
      prohibitedConclusions: [
        "medical diagnosis",
        "disease prediction",
        "treatment selection",
        "lifespan",
      ],
    },
    familyHomeAndProperty: calculated.property,
    childrenMentoringAndCreativity: calculated.children,
    spiritualityMeaningAndPractice: calculated.spirituality,
    domainCoverage: {
      covered: [
        "identity",
        "education",
        "employment",
        "business",
        "money",
        "love",
        "marriage",
        "health routines",
        "family",
        "home and property",
        "children and mentoring",
        "spirituality",
      ],
      notAutomaticallyClaimed: [
        "specific events",
        "guaranteed outcomes",
        "medical conditions",
        "fertility outcomes",
        "lifespan",
      ],
    },
  };
}

export type ConsultationDossierArgs = {
  birth: DossierBirth;
  question?: string;
  asOfDate?: string;
  detail?: "brief" | "standard";
  readingMode?: "auto" | "full-profile" | "follow-up";
  profileRef?: string;
  traditions?: string[];
  remedyPreferences?: Record<string, unknown>;
  engineVersion?: string;
  hasServerSecret?: boolean;
  locationLabel?: string;
  locationSource?: string;
  computeProfileRef: (birth: DossierBirth) => Promise<string>;
  attachCitations?: (
    judgment: ReturnType<typeof buildTopicJudgment>,
  ) => Promise<ReturnType<typeof buildTopicJudgment>>;
};

export type DossierError =
  | { kind: "profile-ref-mismatch" }
  | { kind: "follow-up-requires-ref" };

const KNOWN_TRADITIONS = ["parashari", "jaimini", "kp", "lal-kitab"] as const;

export function consultationTopicOf(question: string, focus: string) {
  return consultationTopicOfShared(question, focus);
}

function consultationWindow(asOf: string) {
  const start = new Date(asOf);
  if (!Number.isFinite(start.getTime())) throw new Error("Invalid asOfDate");
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 2);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * Build the whole-person dossier. Returns `{ error }` for profileRef
 * contract violations (caller maps to transport errors) or
 * `{ dossier }` with the structured content plus the computed chart.
 */
export async function buildConsultationDossier(
  args: ConsultationDossierArgs,
): Promise<
  | { error: DossierError; chart?: undefined; dossier?: undefined }
  | {
      dossier: Record<string, unknown>;
      chart: ReturnType<typeof calculateChart>;
      chartRef: string;
      isFollowUp: boolean;
    }
> {
  const startedAt = Date.now();
  const birth = args.birth;
  const chart = calculateChart(birth);
  const asOf =
    typeof args.asOfDate === "string" && args.asOfDate
      ? args.asOfDate
      : new Date().toISOString();
  const current = queryDashaAt(chart, asOf);
  const reading = buildEverydayReading(chart, current, birth.language);
  const detail = args.detail === "standard" ? "standard" : "brief";
  const preferredIds = new Set(["focus", "timing", "counsel"]);
  const priorities =
    detail === "brief"
      ? reading.sections.filter((section) => preferredIds.has(section.id))
      : reading.sections;
  const lagna = chart.placements.find((item) => item.name === "Lagna")!;
  const moon = chart.placements.find((item) => item.name === "Moon")!;
  const strengths = chart.advanced.planetaryStates.avasthas
    .filter((item) => item.requiredStrengthRatio !== null)
    .sort(
      (a, b) =>
        Number(b.requiredStrengthRatio) - Number(a.requiredStrengthRatio),
    );
  const question = String(args.question || "").trim();
  const consultTopic = consultationTopicOf(question, birth.focus);
  const topic = consultTopic === "health" ? null : consultTopic;
  const range = consultationWindow(asOf);
  const vargaAnalysis = topic ? synthesizeVargas(chart, topic) : null;
  const timingAnalysis: ReturnType<typeof fuseTiming> | null = topic
    ? (fuseTiming(chart, topic, range.startIso, range.endIso) as ReturnType<
        typeof fuseTiming
      >)
    : null;
  const lifeThemeAnalysis: {
    periods: Array<{
      startIso: string;
      endIso: string;
      mahadasha: string;
      antardasha: string;
      themes: unknown[];
    }>;
  } = detectLifeThemes(chart, range.startIso, range.endIso) as never;
  const activeThemePeriod = lifeThemeAnalysis.periods.find(
    (period) =>
      Date.parse(period.startIso) <= Date.parse(range.startIso) &&
      Date.parse(period.endIso) > Date.parse(range.startIso),
  );
  const doshaAnalysis = calculateDoshas(chart);
  const jaiminiAnalysis = calculateJaimini(chart);
  const devataAnalysis = calculateDevataProfile(chart);
  const kpAnalysis = calculateKpPreview(chart);
  const chartRef = await args.computeProfileRef(birth);
  const judgmentTopic =
    topic === "career" ||
    topic === "education" ||
    topic === "property" ||
    topic === "spirituality" ||
    topic === "wealth"
      ? topic
      : topic === "marriage"
        ? ("relationships" as const)
        : null;
  let topicJudgment: ReturnType<typeof buildTopicJudgment> | null = null;
  if (judgmentTopic) {
    const raw = buildTopicJudgment(chart, judgmentTopic, asOf);
    topicJudgment = args.attachCitations ? await args.attachCitations(raw) : raw;
  }
  const requestedTraditions = Array.isArray(args.traditions)
    ? [...new Set(args.traditions.map(String))].filter((item) =>
        (KNOWN_TRADITIONS as readonly string[]).includes(item),
      )
    : [...KNOWN_TRADITIONS];
  const selectedTraditions = requestedTraditions.length
    ? requestedTraditions
    : ["parashari"];
  const lalKitabAnalysis = selectedTraditions.includes("lal-kitab")
    ? inspectLalKitabStructure(chart)
    : null;
  const traditionLedgers: TraditionLedger[] = selectedTraditions.map(
    (tradition) =>
      tradition === "parashari"
        ? {
            tradition,
            status: topicJudgment?.citations?.length
              ? "reviewed"
              : "calculated",
            supportingEvidence: topicJudgment?.supportingEvidence ?? [],
            opposingEvidence: topicJudgment?.opposingEvidence ?? [],
            unresolvedSources: topicJudgment?.unresolvedSourceKeys ?? [],
            limitations: topicJudgment?.uncertainty?.warnings ?? [],
          }
        : tradition === "jaimini"
          ? {
              tradition,
              status: "calculated",
              supportingEvidence: [
                {
                  atmakaraka: jaiminiAnalysis.charaKarakas.sevenKaraka[0],
                  karakamsha: jaiminiAnalysis.karakamsha,
                  arudhaLagna: jaiminiAnalysis.arudhaPadas.arudhaLagna,
                  upapadaLagna: jaiminiAnalysis.arudhaPadas.upapadaLagna,
                },
              ],
              opposingEvidence: [],
              unresolvedSources: [],
              limitations: [
                "Structural Jaimini anchors are calculated; predictive doctrine remains independently review-gated.",
              ],
            }
          : tradition === "kp"
            ? {
                tradition,
                status: "source-linked",
                supportingEvidence: [kpAnalysis.rulingPlanets],
                opposingEvidence: [],
                unresolvedSources: [],
                limitations: [
                  "KP ayanamsa and Placidus cusp certification remain incomplete.",
                ],
              }
            : {
                tradition,
                status: "source-linked",
                supportingEvidence:
                  lalKitabAnalysis?.placements.map((item) => ({
                    planet: item.planet,
                    house: item.house,
                    locator: item.source.locator,
                    status: item.interpretation.status,
                  })) ?? [],
                opposingEvidence: [],
                unresolvedSources:
                  lalKitabAnalysis?.placements.map(
                    (item) => item.source.locator,
                  ) ?? [],
                limitations: lalKitabAnalysis?.blockedOutputs ?? [
                  "Dedicated reviewed prediction rules are unavailable.",
                ],
              },
  );
  const remedyPrefs = args.remedyPreferences as
    | Record<string, unknown>
    | undefined;
  const remedyPreferencesValid = Boolean(
    remedyPrefs &&
      ["hindu", "spiritual", "tradition-specific"].includes(
        String(remedyPrefs.beliefMode),
      ) &&
      ["minimal", "moderate"].includes(String(remedyPrefs.maximumBurden)) &&
      ["free", "low"].includes(String(remedyPrefs.maximumCost)) &&
      typeof remedyPrefs.allowPrayer === "boolean" &&
      typeof remedyPrefs.allowCharity === "boolean",
  );
  const parashariRemedyProtocol =
    topicJudgment && remedyPreferencesValid
      ? buildChartRemedyProtocol(chart, topicJudgment, {
          beliefMode: String(remedyPrefs!.beliefMode) as
            | "hindu"
            | "spiritual"
            | "tradition-specific",
          tradition:
            typeof remedyPrefs!.tradition === "string"
              ? remedyPrefs!.tradition
              : undefined,
          maximumBurden: String(remedyPrefs!.maximumBurden) as
            | "minimal"
            | "moderate",
          maximumCost: String(remedyPrefs!.maximumCost) as "free" | "low",
          allowPrayer: Boolean(remedyPrefs!.allowPrayer),
          allowCharity: Boolean(remedyPrefs!.allowCharity),
          accessibilityNotes: Array.isArray(remedyPrefs!.accessibilityNotes)
            ? remedyPrefs!.accessibilityNotes
                .filter((item): item is string => typeof item === "string")
                .slice(0, 8)
            : undefined,
        })
      : null;
  const traditionComparison = compareTraditionLedgers(traditionLedgers);
  const crossTraditionRemedies = crossTraditionRemedySummary(
    selectedTraditions,
    parashariRemedyProtocol,
  );
  const requestedMode = String(args.readingMode || "auto");
  const requestedProfileRef = String(args.profileRef || "").trim();
  if (requestedProfileRef && requestedProfileRef !== chartRef)
    return {
      error: { kind: "profile-ref-mismatch" },
    };
  if (requestedMode === "follow-up" && !requestedProfileRef)
    return { error: { kind: "follow-up-requires-ref" } };
  const isFollowUp =
    requestedMode === "follow-up" ||
    (requestedMode === "auto" && requestedProfileRef === chartRef);
  const dossier: Record<string, unknown> = {
    schemaVersion: "sahadeva-consultation-1",
    chartRef,
    responseProfile: isFollowUp ? "focused-follow-up" : "full-profile",
    profileLifecycle: {
      mode: isFollowUp ? "follow-up" : "first-reading",
      profileRef: chartRef,
      verifiedAgainstBirthData: true,
      referenceProtection: args.hasServerSecret
        ? "server-keyed-hmac; birth details are not encoded in the reference"
        : "local-development deterministic reference; configure BETTER_AUTH_SECRET before deployment",
      nextAction: isFollowUp
        ? "Continue passing this profileRef with the same birth details for later focused questions."
        : "Retain this profileRef. Pass it with the same birth details on later questions so the complete dossier is not repeated.",
    },
    profileCalculationManifest: isFollowUp
      ? {
          status: "verified-existing-profile",
          profileRef: chartRef,
          focusedEnginesRun: [
            "question-intent",
            "relevant-varga-synthesis",
            "current-dasha",
            "timing-fusion",
            "contradiction-check",
          ],
        }
      : {
          status: "full-natal-dossier-calculated",
          calculatedFromBirthData: [
            "sidereal natal placements and houses",
            "Panchanga and Nakshatra anchors",
            "Shodashavarga divisional charts",
            "Vimshottari timeline and current sub-periods",
            "planetary dignities, combustion and retrogression",
            "Shadbala and planetary-state lineage",
            "Parashari Graha Drishti",
            "Ashtakavarga",
            "structural Yogas",
            "Doshas with cancellations and mitigations",
            "Jaimini structural anchors",
            "KP structural preview boundaries",
            "additional Dasha availability",
            "cross-Varga analysis for every major life domain",
            "natal-promise gates for education, career, wealth, marriage, property, children and spirituality",
            "current life-theme activation",
            "slow-transit and Dasha timing context for the focused topic",
            "birth-time uncertainty and boundary warnings",
          ],
          requiresAdditionalInput: [
            {
              workflow: "compatibility and relationship matching",
              requires: "the second person's verified birth details",
            },
            {
              workflow: "birth-time rectification",
              requires: "dated life events and a candidate time range",
            },
            {
              workflow: "Muhurta",
              requires: "activity, location and date range",
            },
            {
              workflow: "Varshaphal annual return",
              requires: "target year",
            },
            {
              workflow: "Prashna",
              requires: "a precise question and the server receipt time",
            },
          ],
          rule: "A workflow requiring missing external input is not guessed or represented as already calculated.",
        },
    subject: {
      name: birth.name,
      place: birth.place,
      question: question || null,
      focus: birth.focus,
    },
    privacyProfile: safeProfileProjection({
      name: birth.name,
      place: birth.place,
      question,
    }),
    crossTraditionProfile: {
      selectedTraditions,
      comparison: {
        schemaVersion: traditionComparison.schemaVersion,
        traditions: traditionComparison.traditions.map((ledger) => ({
          tradition: ledger.tradition,
          status: ledger.status,
          supportingEvidence: ledger.supportingEvidence.slice(0, 2),
          opposingEvidence: ledger.opposingEvidence.slice(0, 2),
          unresolvedSourceCount: ledger.unresolvedSources.length,
          unresolvedSourceSample: ledger.unresolvedSources.slice(0, 3),
          limitations: ledger.limitations.slice(0, 3),
        })),
        agreements: traditionComparison.agreements,
        contradictions: traditionComparison.contradictions,
        synthesisPolicy: traditionComparison.synthesisPolicy,
      },
      interconnection: {
        sharedTopic: topic,
        rule: "Methods are connected by the user's life topic and common calculated chart facts; doctrine, scores and remedies remain tradition-labelled.",
      },
    },
    crossTraditionRemedies,
    answerContract: {
      userQuestion: question || null,
      instruction: isFollowUp
        ? "This is a verified follow-up to an existing profile. Answer the exact question directly using consultationAnalysis, currentTiming, priorities, verification and the retained profile context. Do not repeat the whole-person dossier unless the user asks. Never invent missing profile facts."
        : "This is the first reading. Give a deep whole-person dossier covering every domain, explain the calculation manifest and verification limits, then answer the user's exact question. Distinguish calculated facts from traditional interpretation. Never invent placements, dates, citations, remedies, medical claims or guaranteed events.",
      evidenceOrder: [
        "verification",
        "consultationAnalysis",
        "remediesAndPracticalSupport",
        "priorities",
        "currentTiming",
        "measuredStrengths",
        "anchors",
        "confidence",
      ],
      responseShape: isFollowUp
        ? [
            "direct answer",
            "strongest existing profile evidence",
            "new timing evidence when relevant",
            "contradictions and uncertainty",
            "one practical next step",
          ]
        : [
            "whole-person executive overview",
            "education, work/business, money, relationships/marriage, health routines, home/family, children and spirituality",
            "direct answer to the initial question",
            "calculation coverage and verification limits",
            "optional low-risk practical supports",
          ],
    },
    anchors: {
      lagna: {
        signName: lagna.signName,
        degree: Number(lagna.degree.toFixed(2)),
      },
      moon: {
        signName: moon.signName,
        degree: Number(moon.degree.toFixed(2)),
        nakshatra: moon.nakshatra,
        pada: moon.pada,
      },
    },
    priorities,
    currentTiming: {
      asOf: current.instantIso,
      mahadasha: current.mahadasha,
      antardasha: current.antardasha,
      pratyantardasha: current.pratyantardasha,
      boundaries: current.boundaries,
    },
    measuredStrengths: strengths
      .slice(0, detail === "brief" ? 3 : 7)
      .map((item) => ({
        planet: item.name,
        ratio: item.requiredStrengthRatio,
        avastha: item.balaadiAvastha,
      })),
    consultationAnalysis: {
      inferredTopic: topic,
      judgment: topicJudgment
        ? {
            schemaVersion: topicJudgment.schemaVersion,
            topic: topicJudgment.topic,
            conclusion: topicJudgment.conclusion,
            status: topicJudgment.status,
            score: topicJudgment.score,
            supportingEvidence: topicJudgment.supportingEvidence.slice(0, 3),
            opposingEvidence: topicJudgment.opposingEvidence.slice(0, 3),
            vargaConfirmation: {
              varga: topicJudgment.vargaConfirmation.varga,
              status: topicJudgment.vargaConfirmation.status,
            },
            timingActivation: topicJudgment.timingActivation,
            citations: topicJudgment.citations,
            unresolvedSourceKeys: topicJudgment.unresolvedSourceKeys,
            uncertainty: topicJudgment.uncertainty,
          }
        : null,
      enginesRun: [
        "natal-chart",
        "vimshottari",
        "planetary-strengths",
        "life-theme-synthesis",
        ...(topic ? ["relevant-varga-synthesis", "timing-fusion"] : []),
        "complete-life-domain-screen",
        "dosha-and-cancellation-analysis",
      ],
      relevantVargas: vargaAnalysis,
      timing: timingAnalysis
        ? {
            schemaVersion: (timingAnalysis as { schemaVersion: string })
              .schemaVersion,
            topic: (timingAnalysis as { topic: string }).topic,
            promise: (timingAnalysis as { promise: unknown }).promise,
            windows: (
              (timingAnalysis as { windows: unknown[] }).windows || []
            ).slice(0, 4),
            notice:
              (timingAnalysis as { notice?: string | null }).notice || null,
          }
        : null,
      activeLifeThemes: activeThemePeriod
        ? {
            mahadasha: activeThemePeriod.mahadasha,
            antardasha: activeThemePeriod.antardasha,
            startIso: activeThemePeriod.startIso,
            endIso: activeThemePeriod.endIso,
            themes: (activeThemePeriod.themes as unknown[]).slice(0, 4),
          }
        : null,
      doshas: {
        summary: doshaAnalysis.summary,
        patterns: doshaAnalysis.patterns.map((pattern) => ({
          id: pattern.id,
          label: pattern.label,
          detected: pattern.detected,
          rawSeverity: pattern.rawSeverity,
          effectiveSeverity: pattern.severity,
          mitigations: pattern.cancellationsOrMitigations.map(
            (item) => item.evidence,
          ),
          sourceKey: pattern.sourceKey,
        })),
        rulebookStatus: doshaAnalysis.rulebook.reviewStatus,
        safety: doshaAnalysis.safety,
      },
    },
    remediesAndPracticalSupport: isFollowUp
      ? null
      : {
          practicalSupports: [
            {
              id: "clear-decisions",
              label: "Written decision check",
              instruction:
                "Before a major commitment, write the facts, assumptions, alternatives, costs and review date. Use the chart as a reflection aid, not as the sole reason for acting.",
              burden: "minimal",
              optional: true,
              type: "practical-support",
            },
            {
              id: "steady-routine",
              label: "Sustainable daily discipline",
              instruction:
                "Choose one modest sleep, movement, study, budgeting or work routine that can be repeated safely for four weeks, then review its real-world effect.",
              burden: "minimal",
              optional: true,
              type: "practical-support",
            },
            {
              id: "reflection-or-prayer",
              label: "Voluntary reflection or prayer",
              instruction:
                "If it fits the person's beliefs, use a few quiet minutes of prayer, meditation or reflection before the next practical action. No astrological hour or purchase is required.",
              burden: "minimal",
              optional: true,
              type: "traditional-low-risk-practice",
            },
          ],
          traditionalRemedies: [],
          traditionalRemedyStatus:
            "No chart-specific mantra, gemstone, donation, ritual or planetary remedy is published until its source and rule have completed review.",
          sourceGroundedRemedyEngine: {
            tool: "analyze_remedies",
            status: "available-with-user-preferences",
            requiredPreferences: [
              "beliefMode",
              "maximumBurden",
              "maximumCost",
              "allowPrayer",
              "allowCharity",
            ],
            notice:
              "Call the dedicated tool before presenting chart-specific remedy candidates; the consultation does not assume the person's beliefs.",
          },
          prohibited: [
            "guaranteed remedies",
            "medical substitutes",
            "expensive gemstones or purchases",
            "fear-based ritual pressure",
          ],
        },
    verification: {
      status: "completed",
      checks: [
        {
          id: "location",
          status: args.locationSource ? "passed" : "unverified",
          evidence: `${args.locationLabel || birth.place} · ${birth.timezone} · ${birth.latitude}, ${birth.longitude}`,
        },
        {
          id: "cross-varga",
          status: vargaAnalysis
            ? vargaAnalysis.judgment === "mixed"
              ? "mixed"
              : "passed"
            : "not-applicable",
          evidence: vargaAnalysis
            ? `${vargaAnalysis.judgment}; score ${vargaAnalysis.score}/100`
            : "No single life-area topic was inferred",
        },
        {
          id: "natal-promise-before-timing",
          status: timingAnalysis
            ? (
                timingAnalysis as {
                  promise: { present: boolean; score: number; contradictions: unknown[] };
                }
              ).promise.present
              ? "passed"
              : "limited"
            : "not-applicable",
          evidence: timingAnalysis
            ? `Promise score ${(timingAnalysis as { promise: { score: number; contradictions: unknown[] } }).promise.score}/100; ${(timingAnalysis as { promise: { contradictions: unknown[] } }).promise.contradictions.length} contradiction(s)`
            : "No topic-specific timing claim requested",
        },
        {
          id: "birth-time-sensitivity",
          status:
            birth.birthTimeAccuracyMinutes <= 15 ? "passed" : "caution",
          evidence: `Reported accuracy ±${birth.birthTimeAccuracyMinutes} minutes`,
        },
        {
          id: "reviewed-textual-grounding",
          status: "unavailable",
          evidence:
            "Calculation evidence is present; reviewed classical passage retrieval is not currently deployed",
        },
      ],
      contradictions: [
        ...(((timingAnalysis as {
          promise?: { contradictions: string[] };
        } | null)?.promise?.contradictions) || []),
        ...(vargaAnalysis?.judgment === "mixed"
          ? ["Relevant divisional charts give mixed structural confirmation"]
          : []),
      ],
      rule: "Lead with agreement across independent factors. State mixed evidence plainly. Never convert an unreviewed rule or heuristic score into certainty.",
    },
    coverage: {
      completeForQuestion: Boolean(topic || !question),
      omittedBecauseNotApplicable: [
        "compatibility requires a second person's birth details",
        "rectification requires dated life events",
        "muhurta requires an activity and date range",
      ],
      followUpNeeded: topic
        ? []
        : question
          ? [
              "The question did not map cleanly to a supported specialist topic; clarify the intended life area for full Varga and timing fusion.",
            ]
          : [],
    },
    confidence: chart.advanced.guidance.confidence,
    meta: {
      calculationMs: Date.now() - startedAt,
      engineVersion: (args.engineVersion || chart.engine.version) ?? "unknown",
      locationSource: args.locationSource,
      hiddenAiCalls: 0,
    },
  };
  return { dossier, chart, chartRef, isFollowUp };
}
