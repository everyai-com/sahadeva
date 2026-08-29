import { z } from "zod";
import { calculateChart } from "./jyotish";
import type { BirthInput, ChartResult, GrahaName } from "./schema";
import {
  safetyContract,
  scoreObservations,
  structuralRule,
  type ConsultationResult,
  type EvidenceObservation,
  type QuestionCategory,
} from "./consultation";
import { matchRemedies } from "./remedies";

export const prashnaRequestSchema = z.object({
  question: z.string().trim().min(3).max(500),
  category: z.enum([
    "career",
    "relationship",
    "money",
    "property",
    "travel",
    "lost-object",
    "general",
  ]),
  place: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z
    .string()
    .trim()
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Invalid IANA timezone"),
  language: z.enum(["en", "te"]).default("en"),
});
export type PrashnaRequest = z.infer<typeof prashnaRequestSchema>;
const HOUSE: Record<QuestionCategory, number> = {
  career: 10,
  relationship: 7,
  money: 2,
  property: 4,
  travel: 9,
  "lost-object": 2,
  general: 1,
};
const LORDS: GrahaName[] = [
  "Mars",
  "Venus",
  "Mercury",
  "Moon",
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Saturn",
  "Jupiter",
];
const BENEFICS = new Set(["Jupiter", "Venus", "Mercury"]),
  MALEFICS = new Set(["Mars", "Saturn", "Rahu", "Ketu"]);
const houseFrom = (origin: number, target: number) =>
  ((target - origin + 12) % 12) + 1;
const localParts = (instant: Date, timezone: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};
const offsetHours = (instant: Date, timezone: string) => {
  const p = localParts(instant, timezone),
    local = Date.parse(`${p.date}T${p.time}:00Z`);
  return (local - instant.getTime()) / 3_600_000;
};

export function prashnaChart(request: PrashnaRequest, receivedAt: Date) {
  const local = localParts(receivedAt, request.timezone),
    input: BirthInput = {
      name: "Prashna",
      ...local,
      place: request.place,
      latitude: request.latitude,
      longitude: request.longitude,
      timezone: request.timezone,
      timezoneOffset: offsetHours(receivedAt, request.timezone),
      language: request.language,
      methodology: "parashari",
      focus: "general",
      birthTimeAccuracyMinutes: 1,
      houseSystem: "whole-sign",
    };
  return calculateChart(input);
}
export function evaluateChartFitness(chart: ChartResult) {
  const lagna = chart.placements.find((p) => p.name === "Lagna")!,
    moon = chart.placements.find((p) => p.name === "Moon")!,
    reasons: string[] = [];
  if (lagna.degree < 0.5 || lagna.degree > 29.5)
    reasons.push("Lagna is within 0.5° of a sign boundary.");
  if (moon.degree < 0.25 || moon.degree > 29.75)
    reasons.push("Moon is within 0.25° of a sign boundary.");
  if (chart.advanced.uncertainty.boundaryWarnings.length)
    reasons.push(...chart.advanced.uncertainty.boundaryWarnings);
  return {
    status: (reasons.length ? "unfit" : "fit") as "fit" | "unfit",
    reasons,
    unavailableChecks: [
      "Ithasala/application fitness awaits a versioned Tajika motion convention.",
    ],
  };
}
export function prashnaObservations(
  chart: ChartResult,
  category: QuestionCategory,
) {
  const lagna = chart.placements.find((p) => p.name === "Lagna")!,
    targetHouse = HOUSE[category],
    targetSign = (lagna.sign + targetHouse - 1) % 12,
    targetLord = LORDS[targetSign],
    lord = chart.placements.find((p) => p.name === targetLord)!,
    dignity = chart.advanced.dignities.find((d) => d.name === targetLord),
    items: EvidenceObservation[] = [];
  const add = (
    id: string,
    label: string,
    polarity: EvidenceObservation["polarity"],
    weight: number,
    facts: string[],
  ) =>
    items.push({
      id,
      label,
      polarity,
      weight,
      facts,
      provenance: structuralRule(id, "sahadeva-prashna-structural-1"),
    });
  const lordHouse = houseFrom(lagna.sign, lord.sign);
  if ([1, 4, 7, 10].includes(lordHouse))
    add(
      "prashna:lord-angular",
      `${targetHouse}th-house lord is angular`,
      "supportive",
      3,
      [`${targetLord} occupies house ${lordHouse}`],
    );
  if ([6, 8, 12].includes(lordHouse))
    add(
      "prashna:lord-dusthana",
      `${targetHouse}th-house lord is in a difficult house`,
      "challenging",
      3,
      [`${targetLord} occupies house ${lordHouse}`],
    );
  if (dignity && ["exalted", "own-sign"].includes(dignity.dignity))
    add(
      "prashna:lord-dignity",
      "Relevant lord has sign dignity",
      "supportive",
      3,
      [`${targetLord} is ${dignity.dignity}`],
    );
  if (dignity?.dignity === "debilitated")
    add(
      "prashna:lord-debilitated",
      "Relevant lord is debilitated",
      "challenging",
      3,
      [`${targetLord} is debilitated`],
    );
  if (dignity?.combust)
    add("prashna:lord-combust", "Relevant lord is combust", "challenging", 2, [
      `${targetLord} is marked combust`,
    ]);
  const occupants = chart.placements.filter(
    (p) => p.name !== "Lagna" && p.sign === targetSign,
  );
  for (const p of occupants) {
    if (BENEFICS.has(p.name))
      add(
        `prashna:benefic-${p.name.toLowerCase()}`,
        "Benefic occupies the relevant house",
        "supportive",
        2,
        [`${p.name} occupies house ${targetHouse}`],
      );
    if (MALEFICS.has(p.name))
      add(
        p.name === "Saturn"
          ? "prashna:saturn-pressure"
          : `prashna:malefic-${p.name.toLowerCase()}`,
        "Malefic occupies the relevant house",
        "challenging",
        2,
        [`${p.name} occupies house ${targetHouse}`],
      );
  }
  const moonHouse = houseFrom(
    lagna.sign,
    chart.placements.find((p) => p.name === "Moon")!.sign,
  );
  add(
    "prashna:moon-position",
    "Moon describes the question's immediate movement",
    [1, 4, 7, 10].includes(moonHouse)
      ? "supportive"
      : [6, 8, 12].includes(moonHouse)
        ? "challenging"
        : "neutral",
    2,
    [`Moon occupies house ${moonHouse}`],
  );
  return items;
}
export function buildPrashnaConsultation(
  request: PrashnaRequest,
  receivedAt = new Date(),
  options: { allowStructuralRemedies?: boolean } = {},
): ConsultationResult {
  const chart = prashnaChart(request, receivedAt),
    fitness = evaluateChartFitness(chart),
    observations = prashnaObservations(chart, request.category),
    score = scoreObservations(observations),
    direction =
      fitness.status === "unfit"
        ? "chart-unfit"
        : observations.length < 2
          ? "indeterminate"
          : score >= 25
            ? "supportive"
            : score <= -25
              ? "challenging"
              : "mixed",
    id = crypto.randomUUID(),
    confirmationToken = crypto.randomUUID(),
    days =
      request.category === "lost-object"
        ? 7
        : request.category === "travel"
          ? 30
          : 90;
  return {
    schemaVersion: "sahadeva-consultation-1",
    consultationId: id,
    question: {
      text: request.question,
      category: request.category,
      askedAt: receivedAt.toISOString(),
      timestampConvention:
        "Server receipt time: when the question reached Sahadeva",
      location: {
        place: request.place,
        latitude: request.latitude,
        longitude: request.longitude,
        timezone: request.timezone,
      },
    },
    methodSelection: {
      method: "prashna",
      chartTypes: ["D1 Prashna"],
      reason:
        "No natal chart was supplied; the question is judged from its server-received moment.",
    },
    chartFitness: fitness,
    observations,
    confirmations: observations
      .filter((i) => i.polarity === "supportive")
      .map((i) => i.label),
    contradictions: observations
      .filter((i) => i.polarity === "challenging")
      .map((i) => i.label),
    timingWindows:
      fitness.status === "fit" && direction !== "indeterminate"
        ? [
            {
              start: receivedAt.toISOString(),
              end: new Date(
                receivedAt.getTime() + days * 86400000,
              ).toISOString(),
              unit: `exploratory ${days}-day follow-up horizon`,
              score: Math.abs(score),
              supportingFactors: observations
                .filter((i) => i.polarity === "supportive")
                .map((i) => i.id),
              opposingFactors: observations
                .filter((i) => i.polarity === "challenging")
                .map((i) => i.id),
              notice:
                "This is a follow-up horizon for calibration, not a guaranteed event date.",
            },
          ]
        : [],
    judgment: {
      direction,
      score: fitness.status === "unfit" ? null : score,
      tier: "structural-convention",
      confidence:
        fitness.status === "unfit" || direction === "indeterminate"
          ? "low"
          : "moderate",
      rationale:
        fitness.status === "unfit"
          ? [
              "The chart is boundary-sensitive; ask again later rather than forcing a judgment.",
            ]
          : observations.map((i) => `${i.polarity}: ${i.label}`),
    },
    remedies: matchRemedies(
      request.category,
      observations,
      options.allowStructuralRemedies === false,
    ),
    citations: [],
    uncertainty: [
      "Structural-convention rules are auditable but not yet lineage-reviewed.",
      "Question outcomes are not scientifically validated.",
      ...fitness.unavailableChecks,
    ],
    feedback: {
      confirmationToken,
      status: "awaiting-outcome",
      endpoint: "/api/prashna/outcome",
      suggestedFollowUpAt:
        fitness.status === "fit"
          ? new Date(receivedAt.getTime() + days * 86400000).toISOString()
          : null,
    },
    safety: safetyContract(),
  };
}
