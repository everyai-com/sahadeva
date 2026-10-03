import { NAKSHATRAS, SIGNS } from "./constants";
import { jdToIso } from "./dashaCalendar";
import { coreLongitudes } from "./jyotish";
import type { CalendarDay, TimeWindow } from "./panchangaCalendar";
import type { ChartResult } from "./schema";

/*
 * "Best times for you" — a personal reading of one day.
 *
 * The waking day (sunrise to four hours after sunset) is cut at every
 * Choghadiya, Hora, Rahu kalam, Yamagandam, Gulika, Durmuhurtam, Varjyam,
 * Amrita kalam, Abhijit and Moon nakshatra / sign boundary. Each slice is
 * scored with the person's own Tara bala and Chandra bala *at that moment*
 * (they change when the Moon changes nakshatra or sign), the Hora lord
 * (natural benefics and the person's ascendant lord help), the Choghadiya
 * quality, Abhijit and Amrita kalam. Rahu kalam, Yamagandam, Gulika,
 * Durmuhurtam and Varjyam are excluded outright, as an astrologer would.
 * Every window carries the reasons that produced its score.
 */

export const PERSONAL_TIMING_RULES = {
  id: "sahadeva-personal-day",
  version: "1.0.0",
  weights: {
    choghadiya: { Amrit: 3, Shubh: 2, Labh: 2, Char: 0, Udveg: -3, Kaal: -3, Rog: -3 } as Record<string, number>,
    benefic_hora: 2,
    malefic_hora: -1,
    ascendant_lord_hora: 2,
    tara_favourable: 2,
    tara: { 1: -1, 3: -2, 5: -2, 7: -4 } as Record<number, number>,
    chandra_favourable: 2,
    chandra_other: -1,
    chandrashtama: -4,
    abhijit: 2,
    amrita_kalam: 3,
  },
  grades: { best: 6, good: 3 },
  basis:
    "Traditional muhurta practice: personal Tara bala and Chandra bala, Hora, Choghadiya, Abhijit and Amrita kalam; Rahu kalam, Yamagandam, Gulika, Durmuhurtam and Varjyam excluded.",
};

const SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const BENEFICS = new Set(["Jupiter", "Venus", "Mercury", "Moon"]);
const MALEFICS = new Set(["Saturn", "Mars"]);
const TARA_NAMES = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhaka", "Naidhana", "Mitra", "Parama Mitra"];
const TARA_FAVOURABLE = new Set([2, 4, 6, 8, 9]);
const CHANDRA_FAVOURABLE = new Set([1, 3, 6, 7, 10, 11]);

/** Traditional hora associations: what each planetary hour is used for. */
export const HORA_SUITS: Record<string, string[]> = {
  Sun: ["authority", "government", "health-routine"],
  Moon: ["travel", "family", "meeting-people"],
  Mars: ["property", "physical-work", "technical-work"],
  Mercury: ["study", "writing", "contracts", "business"],
  Jupiter: ["learning", "finance", "advice", "ceremonies", "new-beginnings"],
  Venus: ["relationships", "purchases", "arts", "celebrations"],
  Saturn: ["routine-work", "pending-tasks", "repairs"],
};

/** `value` / `count` let clients render the reason in any language. */
export type Reason = { id: string; points: number; label: string; value?: string; count?: number };

export type PersonalWindow = {
  startIso: string;
  endIso: string;
  score: number;
  grade: "best" | "good" | "neutral" | "low";
  hora: string;
  choghadiya: string;
  tara: { count: number; name: string; favourable: boolean };
  chandra: { house: number; favourable: boolean };
  reasons: Reason[];
  suits: string[];
};

export type BestWindow = {
  startIso: string;
  endIso: string;
  score: number;
  grade: "best" | "good";
  /** The highest-scoring stretch inside the window. */
  peak: { startIso: string; endIso: string };
  horas: string[];
  reasons: Reason[];
  suits: string[];
  parts: PersonalWindow[];
};

type Segment = { startIso: string; endIso: string; name?: string; lord?: string };
export type PersonalDayInput = {
  day: CalendarDay;
  choghadiya: { day: Segment[]; night: Segment[] };
  hora: Segment[];
  inauspicious: { rahuKaal: Segment; yamaganda: Segment; gulikaKaal: Segment };
  abhijit: Segment;
  natal: ChartResult;
};

const ms = (iso: string) => Date.parse(iso);
const toJd = (t: number) => t / 86400000 + 2440587.5;

function moonAt(t: number) {
  const moon = coreLongitudes(toJd(t)).sidereal.Moon;
  return { nakshatra: Math.floor(moon / (360 / 27)) % 27, sign: Math.floor(moon / 30) % 12 };
}

export function buildPersonalDay(input: PersonalDayInput) {
  const { day, natal } = input;
  if (!day.sunrise || !day.sunset || !day.nextSunrise)
    return { status: "unavailable" as const, reason: "Sunrise and sunset are required." };
  const natalMoon = natal.placements.find((p) => p.name === "Moon")!,
    lagna = natal.placements.find((p) => p.name === "Lagna")!,
    natalNak = NAKSHATRAS.indexOf(natalMoon.nakshatra as (typeof NAKSHATRAS)[number]),
    ascendantLord = SIGN_LORDS[lagna.sign];
  const from = ms(day.sunrise),
    to = Math.min(ms(day.nextSunrise), ms(day.sunset) + 4 * 3_600_000);

  const blocked: Array<{ id: string; w: { startIso: string; endIso: string } }> = [
    { id: "rahu-kalam", w: input.inauspicious.rahuKaal },
    { id: "yamagandam", w: input.inauspicious.yamaganda },
    { id: "gulika", w: input.inauspicious.gulikaKaal },
    ...(day.durmuhurtam ?? []).map((w) => ({ id: "durmuhurtam", w })),
    ...(day.varjyam ?? []).map((w) => ({ id: "varjyam", w })),
  ];
  const amrita: TimeWindow[] = day.amritaKalam ?? [];
  const choghadiya = [...input.choghadiya.day, ...input.choghadiya.night];

  // Every boundary that can change a slice's score.
  const cuts = new Set<number>([from, to]);
  const addCut = (iso: string) => {
    const t = ms(iso);
    if (t > from && t < to) cuts.add(t);
  };
  for (const s of [...choghadiya, ...input.hora, input.abhijit, ...blocked.map((b) => b.w), ...amrita]) {
    addCut(s.startIso);
    addCut(s.endIso);
  }
  for (const n of day.nakshatra) addCut(n.endIso);
  const sorted = [...cuts].sort((a, b) => a - b);
  // Moon sign changes (Chandra bala) — bisect any slice whose ends differ.
  for (let i = 0; i + 1 < sorted.length; i++) {
    let lo = sorted[i],
      hi = sorted[i + 1];
    const start = moonAt(lo).sign;
    if (moonAt(hi).sign === start) continue;
    for (let k = 0; k < 16; k++) {
      const mid = (lo + hi) / 2;
      if (moonAt(mid).sign === start) lo = mid;
      else hi = mid;
    }
    cuts.add(Math.round(hi));
  }
  const edges = [...cuts].sort((a, b) => a - b);

  const inside = (t: number, w: { startIso: string; endIso: string }) => t >= ms(w.startIso) && t < ms(w.endIso);
  const W = PERSONAL_TIMING_RULES.weights;
  const slices: Array<PersonalWindow & { blockedBy: string | null; start: number; end: number }> = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const start = edges[i],
      end = edges[i + 1];
    if (end - start < 60_000) continue;
    const mid = (start + end) / 2;
    const block = blocked.find((b) => inside(mid, b.w));
    const chog = choghadiya.find((c) => inside(mid, c))?.name ?? "";
    const hora = input.hora.find((h) => inside(mid, h))?.lord ?? "";
    const moon = moonAt(mid);
    const taraCount = ((moon.nakshatra - natalNak + 27) % 27) + 1,
      taraPos = ((taraCount - 1) % 9) + 1,
      chandraHouse = ((moon.sign - natalMoon.sign + 12) % 12) + 1;
    const reasons: Reason[] = [];
    const add = (id: string, points: number, label: string, value?: string, count?: number) =>
      points !== 0 && reasons.push({ id, points, label, ...(value ? { value } : {}), ...(count ? { count } : {}) });
    add("choghadiya", W.choghadiya[chog] ?? 0, `${chog} choghadiya`, chog);
    if (hora === ascendantLord) add("ascendant-lord-hora", W.ascendant_lord_hora, `${hora} hora — your ascendant lord`, hora);
    if (BENEFICS.has(hora)) add("hora", W.benefic_hora, `${hora} hora (benefic)`, hora);
    else if (MALEFICS.has(hora) && hora !== ascendantLord) add("hora", W.malefic_hora, `${hora} hora`, hora);
    const taraName = TARA_NAMES[taraPos - 1];
    if (TARA_FAVOURABLE.has(taraPos)) add("tara", W.tara_favourable, `${taraName} tara (${taraCount})`, taraName, taraCount);
    else add("tara", W.tara[taraPos] ?? 0, `${taraName} tara (${taraCount})`, taraName, taraCount);
    if (chandraHouse === 8) add("chandrashtama", W.chandrashtama, "Chandrashtama — Moon 8th from your Moon", undefined, 8);
    else if (CHANDRA_FAVOURABLE.has(chandraHouse)) add("chandra", W.chandra_favourable, `Chandra bala — Moon ${chandraHouse} from your Moon`, undefined, chandraHouse);
    else add("chandra", W.chandra_other, `Moon ${chandraHouse} from your Moon`, undefined, chandraHouse);
    if (inside(mid, input.abhijit) && day.vara !== "Wednesday") add("abhijit", W.abhijit, "Abhijit muhurtam");
    if (amrita.some((w) => inside(mid, w))) add("amrita-kalam", W.amrita_kalam, "Amrita kalam");
    const score = reasons.reduce((sum, r) => sum + r.points, 0);
    slices.push({
      start,
      end,
      startIso: new Date(start).toISOString(),
      endIso: new Date(end).toISOString(),
      score,
      grade: score >= PERSONAL_TIMING_RULES.grades.best ? "best" : score >= PERSONAL_TIMING_RULES.grades.good ? "good" : score >= 0 ? "neutral" : "low",
      hora,
      choghadiya: chog,
      tara: { count: taraCount, name: TARA_NAMES[taraPos - 1], favourable: TARA_FAVOURABLE.has(taraPos) },
      chandra: { house: chandraHouse, favourable: CHANDRA_FAVOURABLE.has(chandraHouse) },
      reasons,
      suits: HORA_SUITS[hora] ?? [],
      blockedBy: block?.id ?? null,
    });
  }

  // Merge neighbours that read identically (same score drivers).
  const key = (s: (typeof slices)[number]) => `${s.blockedBy}|${s.score}|${s.hora}|${s.choghadiya}|${s.reasons.map((r) => r.id + r.points).join(",")}`;
  const merged: typeof slices = [];
  for (const s of slices) {
    const last = merged[merged.length - 1];
    if (last && last.end === s.start && key(last) === key(s)) {
      last.end = s.end;
      last.endIso = s.endIso;
    } else merged.push({ ...s });
  }

  const strip = ({ start: _s, end: _e, blockedBy: _b, ...rest }: (typeof slices)[number]) => rest;
  const open = merged.filter((s) => !s.blockedBy);
  // Contiguous good slices form one window; its grade is its peak.
  const groups: Array<typeof open> = [];
  for (const s of open.filter((x) => x.grade === "best" || x.grade === "good")) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1].end === s.start) last.push(s);
    else groups.push([s]);
  }
  const best: BestWindow[] = groups
    .map((parts) => {
      const peak = parts.reduce((a, b) => (b.score > a.score ? b : a));
      const reasons = new Map<string, Reason>();
      for (const p of parts) for (const r of p.reasons) if (r.points > 0 && (!reasons.has(r.label) || reasons.get(r.label)!.points < r.points)) reasons.set(r.label, r);
      return {
        startIso: parts[0].startIso,
        endIso: parts[parts.length - 1].endIso,
        start: parts[0].start,
        end: parts[parts.length - 1].end,
        score: peak.score,
        grade: peak.grade as "best" | "good",
        peak: { startIso: peak.startIso, endIso: peak.endIso },
        horas: [...new Set(parts.map((p) => p.hora))],
        reasons: [...reasons.values()].sort((a, b) => b.points - a.points),
        suits: [...new Set(parts.flatMap((p) => p.suits))],
        parts: parts.map(strip),
      };
    })
    .filter((w) => w.end - w.start >= 15 * 60_000)
    .sort((a, b) => b.score - a.score || b.end - b.start - (a.end - a.start))
    .slice(0, 4)
    .sort((a, b) => a.start - b.start)
    .map(({ start: _s, end: _e, ...rest }) => rest);
  const fallback = best.length
    ? null
    : open
        .filter((s) => s.end - s.start >= 15 * 60_000)
        .sort((a, b) => b.score - a.score)
        .slice(0, 1)
        .map(strip)[0] ?? null;
  const avoid = [
    ...merged.filter((s) => s.blockedBy).map((s) => ({ startIso: s.startIso, endIso: s.endIso, reason: s.blockedBy! })),
    ...open.filter((s) => s.grade === "low" && s.score <= -4).map((s) => ({
      startIso: s.startIso,
      endIso: s.endIso,
      reason: s.reasons.some((r) => r.id === "chandrashtama") ? "chandrashtama" : "low-personal-score",
    })),
  ].sort((a, b) => ms(a.startIso) - ms(b.startIso));
  // Collapse adjacent avoid windows with the same reason.
  const avoidMerged: typeof avoid = [];
  for (const w of avoid) {
    const last = avoidMerged[avoidMerged.length - 1];
    if (last && last.reason === w.reason && ms(last.endIso) >= ms(w.startIso)) last.endIso = w.endIso;
    else avoidMerged.push({ ...w });
  }

  const sunriseMoon = moonAt(from);
  const sunriseTara = ((sunriseMoon.nakshatra - natalNak + 27) % 27) + 1;
  return {
    status: "computed" as const,
    date: day.date,
    natal: {
      nakshatra: natalMoon.nakshatra,
      moonSign: SIGNS[natalMoon.sign],
      ascendant: SIGNS[lagna.sign],
      ascendantLord,
    },
    daySummary: {
      taraAtSunrise: { count: sunriseTara, name: TARA_NAMES[((sunriseTara - 1) % 9)], favourable: TARA_FAVOURABLE.has(((sunriseTara - 1) % 9) + 1) },
      chandrashtama: merged.some((s) => s.reasons.some((r) => r.id === "chandrashtama")),
    },
    best,
    fallback,
    avoid: avoidMerged,
    timeline: merged.map(strip).map((s, i) => ({ ...s, blockedBy: merged[i].blockedBy })),
    window: { fromIso: jdToIso(toJd(from)), toIso: jdToIso(toJd(to)) },
    rules: { id: PERSONAL_TIMING_RULES.id, version: PERSONAL_TIMING_RULES.version, basis: PERSONAL_TIMING_RULES.basis },
  };
}
