import type { BirthInput, Placement } from "./schema";
import { TIMING_TOPIC_CONFIG } from "./topicConfig";

export const FOCUS_GUIDE = {
  general: { house: 1, varga: "D1", karakas: ["Sun"], label: "Whole chart" },
  career: { house: 10, varga: "D10", karakas: ["Sun", "Saturn"], label: "Career and public work" },
  marriage: { house: 7, varga: "D9", karakas: ["Venus", "Jupiter"], label: "Partnership and marriage" },
  children: { house: 5, varga: "D7", karakas: ["Jupiter"], label: "Children and lineage" },
  education: { house: TIMING_TOPIC_CONFIG.education.house, varga: "D24", karakas: TIMING_TOPIC_CONFIG.education.karakas, label: "Education and learning" },
  property: { house: 4, varga: "D4", karakas: ["Mars"], label: "Property and fixed assets" },
  health: { house: 1, varga: "D27", karakas: ["Sun"], label: "Vitality and resilience" },
  spirituality: { house: 9, varga: "D20", karakas: ["Jupiter", "Ketu"], label: "Spiritual practice" },
} as const;

const SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

export function buildGuidance(input: BirthInput, placements: Placement[], boundaryWarnings: string[]) {
  const focus = input.focus || "general";
  const method = input.methodology || "parashari";
  const accuracy = input.birthTimeAccuracyMinutes ?? 5;
  const guide = FOCUS_GUIDE[focus];
  const lagna = placements.find((p) => p.name === "Lagna")!;
  const relevantSign = (lagna.sign + guide.house - 1) % 12;
  const lord = SIGN_LORDS[relevantSign];
  const lordPlacement = placements.find((p) => p.name === lord);
  const houseFromLagna = lordPlacement ? ((lordPlacement.sign - lagna.sign + 12) % 12) + 1 : null;
  const sensitiveVarga = Number(guide.varga.slice(1)) >= 24;
  let score = 55;
  score += accuracy <= 1 ? 20 : accuracy <= 5 ? 14 : accuracy <= 15 ? 7 : 0;
  score -= Math.min(15, boundaryWarnings.length * 3);
  if (sensitiveVarga && accuracy > 2) score -= 12;
  if (method !== "parashari") score -= 20;
  score = Math.max(5, Math.min(85, score));
  const methodStatus = method === "parashari" ? "available-preview" : "not-implemented";
  const factors = [
    "Astronomy is independently reference-gated, but the product remains a research preview pending complete-strength chart and practitioner review.",
    `Reported birth-time accuracy: ±${accuracy} minutes.`,
    ...(sensitiveVarga ? [`${guide.varga} is highly sensitive to birth-time error.`] : []),
    ...(boundaryWarnings.length ? [`${boundaryWarnings.length} placement boundary warning(s) detected.`] : []),
    ...(methodStatus === "not-implemented" ? [`${method.toUpperCase()} calculations are not implemented; results shown are Parashari chart facts only.`] : []),
  ];
  return {
    methodology: { selected: method, status: methodStatus, blendingAllowed: false },
    focus: { selected: focus, label: guide.label, relevantHouse: guide.house, recommendedVarga: guide.varga, karakas: [...guide.karakas] },
    confidence: { score, level: score >= 70 ? "moderate" : score >= 45 ? "limited" : "low", factors },
    evidence: {
      lagnaSign: lagna.sign,
      relevantHouseSign: relevantSign,
      relevantHouseLord: lord,
      lordPlacementSign: lordPlacement?.sign ?? null,
      lordHouseFromLagna: houseFromLagna,
      observation: `${guide.house}th-house sign and lord are identified deterministically; no outcome is inferred without reviewed rules.`,
    },
  };
}
