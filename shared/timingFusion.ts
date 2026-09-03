import type { ChartResult, GrahaName } from "./schema";
import { isoToJd, jdToIso, queryDashaAt } from "./dashaCalendar";
import { siderealSignAt } from "./jyotish";
import { calculateAshtottariDasha } from "./ashtottari";
import { calculateCharaDasha, calculateNarayanaDasha } from "./rasiDashas";
import {
  calculateKalachakraDasha,
  calculateYoginiDasha,
} from "./additionalDashas";
import { SIGN_LORDS as LORDS, TIMING_TOPIC_CONFIG as CONFIG } from "./topicConfig";
export type { TimingTopic } from "./topicConfig";
import type { TimingTopic } from "./topicConfig";

export type WeightedTimingFactor = {
  id: string;
  label: string;
  raw: number;
  weight: number;
  contribution: number;
  evidence: string[];
  learnable: true;
};
export type PromiseAssessment = {
  present: boolean;
  score: number;
  requiredEvidence: string[];
  supportingEvidence: string[];
  contradictions: string[];
  convention: string;
};
const relative = (origin: number, target: number) =>
  ((target - origin + 12) % 12) + 1;

export function assessNatalPromise(
  chart: ChartResult,
  topic: TimingTopic,
): PromiseAssessment {
  const cfg = CONFIG[topic],
    lagna = chart.placements.find((p) => p.name === "Lagna")!,
    sign = (lagna.sign + cfg.house - 1) % 12,
    lord = LORDS[sign],
    placement = chart.placements.find((p) => p.name === lord)!,
    dignity = chart.advanced.dignities.find((d) => d.name === lord),
    occupants = chart.placements.filter(
      (p) => p.name !== "Lagna" && p.sign === sign,
    ),
    vargaName = cfg.primaryVarga,
    varga = chart.advanced.vargas[vargaName] || [],
    vargaLord = varga.find((p) => p.name === lord),
    support: string[] = [],
    opposition: string[] = [];
  if (dignity && dignity.dignity !== "debilitated")
    support.push(`${lord}, lord of house ${cfg.house}, is not debilitated`);
  else opposition.push(`${lord}, lord of house ${cfg.house}, is debilitated`);
  if (![6, 8, 12].includes(relative(lagna.sign, placement.sign)))
    support.push(`${lord} is outside houses 6, 8 and 12`);
  else
    opposition.push(
      `${lord} occupies house ${relative(lagna.sign, placement.sign)}`,
    );
  if (occupants.some((p) => cfg.karakas.includes(p.name)))
    support.push(`A topic karaka occupies house ${cfg.house}`);
  if (vargaLord)
    support.push(`${lord} is available for confirmation in ${vargaName}`);
  const score = Math.max(
    0,
    Math.min(100, 25 * support.length - 15 * opposition.length),
  );
  return {
    present: support.length >= 2 && score >= 35,
    score,
    requiredEvidence: [
      `House ${cfg.house} and lord ${lord}`,
      `${vargaName} confirmation`,
    ],
    supportingEvidence: support,
    contradictions: opposition,
    convention: "sahadeva-promise-gate-1",
  };
}

export function fuseTiming(
  chart: ChartResult,
  topic: TimingTopic,
  startIso: string,
  endIso: string,
  weights: Partial<Record<string, number>> = {},
) {
  const promise = assessNatalPromise(chart, topic),
    start = isoToJd(startIso),
    end = isoToJd(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("Invalid timing-fusion range");
  if (!promise.present)
    return {
      schemaVersion: "sahadeva-timing-fusion-2",
      topic,
      promise,
      windows: [],
      weightsStatus: "learnable-untrained",
      notice:
        "Natal promise is a hard gate. Timing windows are not emitted when the configured promise test is absent.",
    };
  const cfg = CONFIG[topic],
    lagna = chart.placements.find((p) => p.name === "Lagna")!,
    targetSign = (lagna.sign + cfg.house - 1) % 12,
    targetLord = LORDS[targetSign],
    step = 30.436875,
    windows = [],
    yogini = calculateYoginiDasha(chart, 5, 1).periods,
    ashtottari = calculateAshtottariDasha(chart, "universal", 2).periods,
    chara = calculateCharaDasha(chart, 2).periods,
    narayana = calculateNarayanaDasha(chart, 2).periods,
    kalachakra = calculateKalachakraDasha(chart, 4).periods,
    activePeriod = (periods: Array<any>, jd: number) =>
      periods.find((p) => jd >= p.startJulianDay && jd < p.endJulianDay);
  for (let jd = start; jd < end; jd += step) {
    const windowEnd = Math.min(end, jd + step),
      mid = (jd + windowEnd) / 2,
      active = queryDashaAt(chart, jdToIso(mid)),
      jupiter = siderealSignAt("Jupiter", mid),
      saturn = siderealSignAt("Saturn", mid),
      factors: WeightedTimingFactor[] = [];
    const add = (
      id: string,
      label: string,
      raw: number,
      evidence: string[],
    ) => {
      const weight = weights[id] ?? 1;
      factors.push({
        id,
        label,
        raw,
        weight,
        contribution: raw * weight,
        evidence,
        learnable: true,
      });
    };
    const dashaHit = [
      active.mahadasha,
      active.antardasha,
      active.pratyantardasha,
    ]
      .filter(Boolean)
      .filter(
        (name) =>
          name === targetLord || cfg.karakas.includes(name as GrahaName),
      );
    add(
      "dasha-activation",
      "Vimshottari activates lord or karaka",
      Math.min(35, dashaHit.length * 15),
      dashaHit.map(String),
    );
    const jHouse = relative(lagna.sign, jupiter),
      sHouse = relative(lagna.sign, saturn),
      double =
        (jHouse === cfg.house ||
          relative(jupiter, targetSign) === 5 ||
          relative(jupiter, targetSign) === 9) &&
        (sHouse === cfg.house ||
          [3, 7, 10].includes(relative(saturn, targetSign)));
    add(
      "double-transit",
      "Jupiter–Saturn double-transit confirmation",
      double ? 30 : 0,
      [`Jupiter house ${jHouse}; Saturn house ${sHouse}`],
    );
    const av = chart.advanced.ashtakavarga.sarva.signs[targetSign] || 0;
    add(
      "ashtakavarga",
      "Sarvashtakavarga strength in target sign",
      Math.max(0, Math.min(25, (av - 20) * 2.5)),
      [`Target sign SAV: ${av}`],
    );
    const alternate = [
        {
          system: "Yogini",
          value: activePeriod(yogini, mid)?.planet,
          kind: "planet",
        },
        {
          system: "Ashtottari",
          value: activePeriod(ashtottari as Array<any>, mid)?.lord,
          kind: "planet",
        },
        {
          system: "Chara",
          value: activePeriod(chara as Array<any>, mid)?.sign,
          kind: "sign",
        },
        {
          system: "Narayana",
          value: activePeriod(narayana as Array<any>, mid)?.sign,
          kind: "sign",
        },
        {
          system: "Kalachakra",
          value: activePeriod(kalachakra as Array<any>, mid)?.sign,
          kind: "sign",
        },
      ],
      confirmations = alternate.filter((x) =>
        x.kind === "planet"
          ? x.value === targetLord || cfg.karakas.includes(x.value as GrahaName)
          : x.value === targetSign,
      );
    add(
      "multi-dasha-confirmation",
      "Independent Dasha systems activate the topic",
      Math.min(30, confirmations.length * 7.5),
      alternate.map(
        (x) =>
          `${x.system}=${String(x.value ?? "outside-range")}${confirmations.includes(x) ? " (confirming)" : ""}`,
      ),
    );
    const total = Math.round(
      factors.reduce((sum, f) => sum + f.contribution, 0),
    );
    if (total >= 25)
      windows.push({
        start: jdToIso(jd),
        end: jdToIso(windowEnd),
        score: Math.min(100, total),
        factors,
        supportingFactors: factors
          .filter((f) => f.contribution > 0)
          .map((f) => f.id),
        opposingFactors: [],
        crossSystem: {
          confirmations: confirmations.map((x) => x.system),
          disagreements: alternate
            .filter((x) => !confirmations.includes(x))
            .map((x) => x.system),
        },
        confidence: {
          level: total >= 65 ? "high" : total >= 40 ? "moderate" : "low",
          calibrated: false,
        },
      });
  }
  return {
    schemaVersion: "sahadeva-timing-fusion-2",
    topic,
    promise,
    windows,
    weightsStatus: "learnable-untrained",
    notice:
      "Scores rank traditional structural activation; they are not event probabilities or guarantees. Cross-system disagreement remains visible.",
  };
}
