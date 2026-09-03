import { SIGNS } from "./constants";
import type { ChartResult, GrahaName } from "./schema";
import { isoToJd, jdToIso, queryDashaAt } from "./dashaCalendar";
import { siderealSignAt } from "./jyotish";
import { assessNatalPromise, type TimingTopic } from "./timingFusion";
import { SIGN_LORDS as LORDS, TIMING_TOPIC_CONFIG } from "./topicConfig";

/**
 * Code-computed "when" ledger for the chat consultation.
 *
 * A real Jyotishi answers "when?" by intersecting the Vimshottari periods that
 * activate a topic (house lord, karaka, occupants) with the slow transits of
 * Jupiter and Saturn over that house. This module performs that scan month by
 * month over a bounded horizon, merges contiguous strong months into windows
 * and explains every window with the exact factors that produced it. The
 * narrator may only phrase this ledger; it may not invent new windows.
 */

export type OutlookTopic = TimingTopic | "health" | "general";

type TopicConfig = {
  house: number;
  secondaryHouses: readonly number[];
  karakas: readonly GrahaName[];
  label: string;
};

const CONFIG: Record<OutlookTopic, TopicConfig> = {
  ...TIMING_TOPIC_CONFIG,
  health: { house: 1, secondaryHouses: [6, 8], karakas: ["Sun", "Moon"], label: "health and vitality" },
  general: { house: 1, secondaryHouses: [10, 4], karakas: ["Sun", "Moon"], label: "overall momentum" },
};

const MONTH = 30.436875;
const relative = (origin: number, target: number) => ((target - origin + 12) % 12) + 1;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(iso: string) {
  const date = new Date(iso);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export type OutlookFactor = { id: string; label: string; points: number };

export type OutlookMonth = {
  startIso: string;
  endIso: string;
  score: number;
  factors: OutlookFactor[];
  mahadasha: string | null;
  antardasha: string | null;
};

export type OutlookWindow = {
  startIso: string;
  endIso: string;
  label: string;
  peakScore: number;
  strength: "strong" | "moderate";
  reasons: string[];
  periods: string[];
};

export type DashaStep = {
  level: "antardasha";
  mahadasha: string;
  antardasha: string;
  startIso: string;
  endIso: string;
  label: string;
  activates: string[];
  relevance: "direct" | "supporting" | "neutral";
};

export type TimingOutlook = {
  schemaVersion: "sahadeva-chat-timing-outlook-1";
  topic: OutlookTopic;
  topicLabel: string;
  asOf: string;
  horizonYears: number;
  topicAnatomy: {
    house: number;
    houseSign: string;
    lord: GrahaName;
    lordHouse: number;
    occupants: GrahaName[];
    karakas: GrahaName[];
    activators: string[];
  };
  natalPromise: { present: boolean; score: number; supporting: string[]; contradictions: string[] } | null;
  now: { score: number; band: "strong" | "moderate" | "quiet"; factors: OutlookFactor[]; summary: string };
  windows: OutlookWindow[];
  quietStretch: { startIso: string; endIso: string; label: string } | null;
  dashaSequence: DashaStep[];
  sadeSati: { active: boolean; stage: "rising" | "middle" | "setting" | null; dhaiya: boolean; saturnHouseFromMoon: number };
  transitsNow: { jupiterHouse: number; saturnHouse: number; jupiterSign: string; saturnSign: string };
  headline: string;
  notice: string;
};

export type RetrospectiveTimingOutlook = {
  schemaVersion: "sahadeva-retrospective-timing-outlook-1";
  topic: OutlookTopic;
  topicLabel: string;
  range: { startIso: string; endIso: string; label: string };
  windows: OutlookWindow[];
  dashaSequence: DashaStep[];
  notice: string;
};

type Anatomy = TimingOutlook["topicAnatomy"] & { secondaryLords: GrahaName[]; houseSignIndex: number; lagnaSign: number; moonSign: number };

function anatomy(chart: ChartResult, topic: OutlookTopic): Anatomy {
  const cfg = CONFIG[topic],
    lagna = chart.placements.find((p) => p.name === "Lagna")!,
    moon = chart.placements.find((p) => p.name === "Moon")!,
    houseSignIndex = (lagna.sign + cfg.house - 1) % 12,
    lord = LORDS[houseSignIndex],
    lordPlacement = chart.placements.find((p) => p.name === lord)!,
    occupants = chart.placements.filter((p) => p.name !== "Lagna" && p.sign === houseSignIndex).map((p) => p.name),
    secondaryLords = cfg.secondaryHouses.map((house) => LORDS[(lagna.sign + house - 1) % 12]);
  return {
    house: cfg.house,
    houseSign: SIGNS[houseSignIndex],
    houseSignIndex,
    lagnaSign: lagna.sign,
    moonSign: moon.sign,
    lord,
    lordHouse: relative(lagna.sign, lordPlacement.sign),
    occupants,
    karakas: Array.from(cfg.karakas) as GrahaName[],
    secondaryLords: Array.from(secondaryLords) as GrahaName[],
    activators: Array.from(new Set<string>([lord, ...cfg.karakas, ...occupants])),
  };
}

function roleOf(planet: string, a: Anatomy): { role: string; points: number } | null {
  if (planet === a.lord) return { role: `lord of house ${a.house}`, points: 25 };
  if (a.occupants.includes(planet as GrahaName)) return { role: `placed in house ${a.house}`, points: 18 };
  if (a.karakas.includes(planet as GrahaName)) return { role: "natural significator", points: 15 };
  if (a.secondaryLords.includes(planet as GrahaName)) return { role: "lord of a supporting house", points: 8 };
  return null;
}

function scoreMonth(chart: ChartResult, a: Anatomy, jd: number): OutlookMonth {
  const startIso = jdToIso(jd),
    endIso = jdToIso(jd + MONTH),
    mid = jd + MONTH / 2,
    active = queryDashaAt(chart, jdToIso(mid)),
    factors: OutlookFactor[] = [];
  const levels: Array<[string | null, string, number]> = [
    [active.mahadasha, "Mahadasha", 0.8],
    [active.antardasha, "Antardasha", 1],
    [active.pratyantardasha, "Pratyantardasha", 0.35],
  ];
  for (const [lord, level, weight] of levels) {
    if (!lord) continue;
    const role = roleOf(lord, a);
    if (role)
      factors.push({
        id: `dasha:${level.toLowerCase()}:${lord}`,
        label: `${lord} ${level} (${role.role})`,
        points: Math.round(role.points * weight),
      });
  }
  const jupiter = siderealSignAt("Jupiter", mid),
    saturn = siderealSignAt("Saturn", mid),
    jHouse = relative(a.lagnaSign, jupiter),
    sHouse = relative(a.lagnaSign, saturn),
    jFromTarget = relative(jupiter, a.houseSignIndex),
    sFromTarget = relative(saturn, a.houseSignIndex),
    jupiterTouch = jHouse === a.house ? "transits" : [5, 7, 9].includes(jFromTarget) ? "aspects" : null,
    saturnTouch = sHouse === a.house ? "transits" : [3, 7, 10].includes(sFromTarget) ? "aspects" : null;
  if (jupiterTouch)
    factors.push({ id: "transit:jupiter", label: `Jupiter ${jupiterTouch} house ${a.house} from house ${jHouse}`, points: jupiterTouch === "transits" ? 16 : 12 });
  if (saturnTouch)
    factors.push({ id: "transit:saturn", label: `Saturn ${saturnTouch} house ${a.house} from house ${sHouse}`, points: saturnTouch === "transits" ? 10 : 8 });
  if (jupiterTouch && saturnTouch)
    factors.push({ id: "transit:double", label: "Jupiter and Saturn both activate the house (double transit)", points: 12 });
  const jFromMoon = relative(a.moonSign, jupiter);
  if ([1, 5, 9, 11].includes(jFromMoon))
    factors.push({ id: "transit:jupiter-moon", label: `Jupiter in a supportive house (${jFromMoon}) from the natal Moon`, points: 5 });
  const sFromMoon = relative(a.moonSign, saturn);
  if ([12, 1, 2].includes(sFromMoon))
    factors.push({ id: "transit:sade-sati", label: `Saturn in house ${sFromMoon} from the natal Moon (Sade Sati)`, points: -6 });
  const score = Math.max(0, Math.min(100, factors.reduce((sum, f) => sum + f.points, 0)));
  return { startIso, endIso, score, factors, mahadasha: active.mahadasha ?? null, antardasha: active.antardasha ?? null };
}

function mergeWindows(months: OutlookMonth[], threshold: number): OutlookWindow[] {
  const windows: OutlookWindow[] = [];
  let run: OutlookMonth[] = [];
  const flush = () => {
    if (run.length < 2) {
      run = [];
      return;
    }
    const peak = Math.max(...run.map((m) => m.score)),
      reasonPoints = new Map<string, number>();
    for (const month of run)
      for (const f of month.factors)
        if (f.points > 0) reasonPoints.set(f.label, Math.max(reasonPoints.get(f.label) ?? 0, f.points));
    const reasons = [...reasonPoints.entries()].sort((x, y) => y[1] - x[1]).map(([label]) => label).slice(0, 4),
      periods = Array.from(new Set(run.map((m) => `${m.mahadasha ?? "?"}–${m.antardasha ?? "?"}`)));
    windows.push({
      startIso: run[0].startIso,
      endIso: run[run.length - 1].endIso,
      label: `${formatMonth(run[0].startIso)} – ${formatMonth(run[run.length - 1].endIso)}`,
      peakScore: peak,
      strength: peak >= 55 ? "strong" : "moderate",
      reasons,
      periods,
    });
    run = [];
  };
  for (const month of months) {
    if (month.score >= threshold) run.push(month);
    else flush();
  }
  flush();
  return windows.sort((x, y) => y.peakScore - x.peakScore || x.startIso.localeCompare(y.startIso)).slice(0, 4).sort((x, y) => x.startIso.localeCompare(y.startIso));
}

function dashaSequence(chart: ChartResult, a: Anatomy, startJd: number, endJd: number): DashaStep[] {
  const steps: DashaStep[] = [];
  for (const maha of chart.advanced.vimshottariTimeline) {
    if (maha.endJulianDay <= startJd || maha.startJulianDay >= endJd) continue;
    for (const sub of maha.subPeriods) {
      if (sub.endJulianDay <= startJd || sub.startJulianDay >= endJd) continue;
      const activates = [maha.lord, sub.lord].filter((p, i, arr) => arr.indexOf(p) === i).map((p) => ({ p, role: roleOf(p, a) })).filter((x) => x.role),
        direct = activates.some((x) => x.role!.points >= 15);
      steps.push({
        level: "antardasha",
        mahadasha: maha.lord,
        antardasha: sub.lord,
        startIso: jdToIso(Math.max(sub.startJulianDay, startJd)),
        endIso: jdToIso(sub.endJulianDay),
        label: `${maha.lord}–${sub.lord}: ${formatMonth(jdToIso(Math.max(sub.startJulianDay, startJd)))} to ${formatMonth(jdToIso(sub.endJulianDay))}`,
        activates: activates.map((x) => `${x.p} (${x.role!.role})`),
        relevance: direct ? "direct" : activates.length ? "supporting" : "neutral",
      });
      if (steps.length >= 8) return steps;
    }
  }
  return steps;
}

export function buildTimingOutlook(chart: ChartResult, topic: OutlookTopic, asOfIso = new Date().toISOString(), horizonYears = 3): TimingOutlook {
  const a = anatomy(chart, topic),
    start = isoToJd(asOfIso),
    end = start + horizonYears * 365.25,
    months: OutlookMonth[] = [];
  for (let jd = start; jd < end; jd += MONTH) months.push(scoreMonth(chart, a, jd));
  const now = months[0],
    band = now.score >= 45 ? "strong" : now.score >= 22 ? "moderate" : "quiet",
    windows = mergeWindows(months, 38),
    quietRun = (() => {
      let best: OutlookMonth[] = [],
        run: OutlookMonth[] = [];
      for (const m of months) {
        if (m.score < 15) run.push(m);
        else {
          if (run.length > best.length) best = run;
          run = [];
        }
      }
      if (run.length > best.length) best = run;
      return best.length >= 4 ? { startIso: best[0].startIso, endIso: best[best.length - 1].endIso, label: `${formatMonth(best[0].startIso)} – ${formatMonth(best[best.length - 1].endIso)}` } : null;
    })(),
    saturnNow = siderealSignAt("Saturn", start + 1),
    jupiterNow = siderealSignAt("Jupiter", start + 1),
    saturnFromMoon = relative(a.moonSign, saturnNow),
    promise = topic === "health" || topic === "general" ? null : assessNatalPromise(chart, topic),
    cfg = CONFIG[topic];
  const headline = windows.length
    ? `For ${cfg.label}, the strongest calculated support in the next ${horizonYears} years is ${windows.sort((x, y) => y.peakScore - x.peakScore)[0].label} (${windows[0].reasons[0] ?? "period activation"}).`
    : `For ${cfg.label}, no month in the next ${horizonYears} years reaches the strong-activation threshold; progress would rely on steady effort rather than a marked period.`;
  windows.sort((x, y) => x.startIso.localeCompare(y.startIso));
  return {
    schemaVersion: "sahadeva-chat-timing-outlook-1",
    topic,
    topicLabel: cfg.label,
    asOf: asOfIso,
    horizonYears,
    topicAnatomy: { house: a.house, houseSign: a.houseSign, lord: a.lord, lordHouse: a.lordHouse, occupants: a.occupants, karakas: a.karakas, activators: a.activators },
    natalPromise: promise ? { present: promise.present, score: promise.score, supporting: promise.supportingEvidence, contradictions: promise.contradictions } : null,
    now: {
      score: now.score,
      band,
      factors: now.factors,
      summary:
        band === "quiet"
          ? `The current ${now.mahadasha ?? "?"}–${now.antardasha ?? "?"} period does not strongly activate ${cfg.label}; this is a building phase.`
          : `The current ${now.mahadasha ?? "?"}–${now.antardasha ?? "?"} period gives ${band} activation to ${cfg.label}.`,
    },
    windows,
    quietStretch: quietRun,
    dashaSequence: dashaSequence(chart, a, start, end),
    sadeSati: {
      active: [12, 1, 2].includes(saturnFromMoon),
      stage: saturnFromMoon === 12 ? "rising" : saturnFromMoon === 1 ? "middle" : saturnFromMoon === 2 ? "setting" : null,
      dhaiya: [4, 8].includes(saturnFromMoon),
      saturnHouseFromMoon: saturnFromMoon,
    },
    transitsNow: { jupiterHouse: relative(a.lagnaSign, jupiterNow), saturnHouse: relative(a.lagnaSign, saturnNow), jupiterSign: SIGNS[jupiterNow], saturnSign: SIGNS[saturnNow] },
    headline,
    notice: "Windows rank traditional period-and-transit activation over the horizon; they are not event probabilities, guarantees or dates of events. Birth-time accuracy shifts house-based factors.",
  };
}

export function buildRetrospectiveTimingOutlook(
  chart: ChartResult,
  topic: OutlookTopic,
  startIso: string,
  endIso: string,
): RetrospectiveTimingOutlook {
  const a = anatomy(chart, topic);
  const start = isoToJd(startIso);
  const end = isoToJd(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("Invalid retrospective timing range");
  const months: OutlookMonth[] = [];
  for (let jd = start; jd < end; jd += MONTH) months.push(scoreMonth(chart, a, jd));
  return {
    schemaVersion: "sahadeva-retrospective-timing-outlook-1",
    topic,
    topicLabel: CONFIG[topic].label,
    range: { startIso, endIso, label: `${formatMonth(startIso)} – ${formatMonth(endIso)}` },
    windows: mergeWindows(months, 30),
    dashaSequence: dashaSequence(chart, a, start, end),
    notice: "These are retrospectively ranked Dasha-and-transit activation periods, not proof that an event occurred or that a relationship succeeded.",
  };
}
