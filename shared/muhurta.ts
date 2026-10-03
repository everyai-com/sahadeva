import type { ChartResult } from "./schema";
import { SIGNS } from "./constants";
import { lahiriAyanamsa, tropicalAscendant } from "./jyotish";

export const MUHURTA_RULEBOOK = {
  id: "sahadeva-muhurta-seed",
  version: "0.1.0",
  reviewStatus: "draft-unreviewed",
  activities: {
    marriage: {
      karaka: "Venus",
      weekdays: ["Monday", "Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Rohini",
        "Mrigashira",
        "Magha",
        "Uttara Phalguni",
        "Hasta",
        "Swati",
        "Anuradha",
        "Mula",
        "Uttara Ashadha",
        "Uttara Bhadrapada",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
        "Trayodashi",
      ],
    },
    griha_pravesh: {
      karaka: "Jupiter",
      weekdays: ["Monday", "Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Rohini",
        "Mrigashira",
        "Uttara Phalguni",
        "Chitra",
        "Anuradha",
        "Uttara Ashadha",
        "Dhanishtha",
        "Shatabhisha",
        "Uttara Bhadrapada",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
        "Trayodashi",
      ],
    },
    travel: {
      karaka: "Moon",
      weekdays: ["Monday", "Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Ashwini",
        "Mrigashira",
        "Punarvasu",
        "Pushya",
        "Hasta",
        "Anuradha",
        "Shravana",
        "Dhanishtha",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
      ],
    },
    business_start: {
      karaka: "Mercury",
      weekdays: ["Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Ashwini",
        "Rohini",
        "Mrigashira",
        "Pushya",
        "Hasta",
        "Chitra",
        "Anuradha",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
        "Trayodashi",
      ],
    },
    vehicle_purchase: {
      karaka: "Venus",
      weekdays: ["Monday", "Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Ashwini",
        "Rohini",
        "Mrigashira",
        "Punarvasu",
        "Pushya",
        "Hasta",
        "Chitra",
        "Swati",
        "Anuradha",
        "Shravana",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
        "Trayodashi",
      ],
    },
    property_purchase: {
      karaka: "Mars",
      weekdays: ["Monday", "Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Rohini",
        "Mrigashira",
        "Pushya",
        "Hasta",
        "Anuradha",
        "Uttara Ashadha",
        "Shravana",
        "Dhanishtha",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
        "Trayodashi",
      ],
    },
    naming: {
      karaka: "Jupiter",
      weekdays: ["Monday", "Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Ashwini",
        "Rohini",
        "Mrigashira",
        "Punarvasu",
        "Pushya",
        "Hasta",
        "Chitra",
        "Swati",
        "Anuradha",
        "Shravana",
        "Dhanishtha",
        "Shatabhisha",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
        "Trayodashi",
      ],
    },
    contract: {
      karaka: "Mercury",
      weekdays: ["Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Ashwini",
        "Rohini",
        "Mrigashira",
        "Pushya",
        "Hasta",
        "Chitra",
        "Swati",
        "Anuradha",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
        "Trayodashi",
      ],
    },
    important_conversation: {
      karaka: "Mercury",
      weekdays: ["Monday", "Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Ashwini",
        "Rohini",
        "Mrigashira",
        "Punarvasu",
        "Pushya",
        "Hasta",
        "Chitra",
        "Swati",
        "Anuradha",
        "Shravana",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
        "Trayodashi",
      ],
    },
    new_venture: {
      karaka: "Jupiter",
      weekdays: ["Wednesday", "Thursday", "Friday"],
      nakshatras: [
        "Ashwini",
        "Rohini",
        "Mrigashira",
        "Pushya",
        "Hasta",
        "Chitra",
        "Anuradha",
        "Uttara Ashadha",
        "Revati",
      ],
      tithis: [
        "Dwitiya",
        "Tritiya",
        "Panchami",
        "Saptami",
        "Dashami",
        "Ekadashi",
        "Trayodashi",
      ],
    },
  },
  sourceKeys: ["muhurta-seed:activity-tables:awaiting-passage-review"],
  notice:
    "Seed tables are implementation hypotheses awaiting passage-level source review; they are not approved classical citations.",
} as const;
export type MuhurtaActivity = keyof typeof MUHURTA_RULEBOOK.activities;
type Daily = {
  fiveLimbs: { vara: string; tithi: string; nakshatra: string; karana: string };
  inauspicious: {
    rahuKaal: { startJulianDay: number; endJulianDay: number };
    yamaganda: { startJulianDay: number; endJulianDay: number };
    gulikaKaal: { startJulianDay: number; endJulianDay: number };
    bhadraVishti: { active: boolean };
  };
  personalized: null | {
    taraBala: { favorable: boolean };
    chandraBala: { favorable: boolean };
  };
};
const overlaps = (
  a: { startJulianDay: number; endJulianDay: number },
  b: { startJulianDay: number; endJulianDay: number },
) => a.startJulianDay < b.endJulianDay && a.endJulianDay > b.startJulianDay;
export function scoreMuhurta(
  activity: MuhurtaActivity,
  daily: Daily,
  window: {
    startJulianDay: number;
    endJulianDay: number;
    startIso: string;
    endIso: string;
    name: string;
    quality: string;
  },
  chart: ChartResult,
) {
  const rule = MUHURTA_RULEBOOK.activities[activity],
    reasons: Array<{
      rule: string;
      status: "pass" | "fail" | "neutral";
      points: number;
      evidence: string;
      sourceKey: string;
    }> = [],
    add = (
      ruleName: string,
      status: "pass" | "fail" | "neutral",
      points: number,
      evidence: string,
    ) =>
      reasons.push({
        rule: ruleName,
        status,
        points,
        evidence,
        sourceKey: `${MUHURTA_RULEBOOK.id}:${activity}`,
      });
  add(
    "weekday",
    rule.weekdays.includes(daily.fiveLimbs.vara as never) ? "pass" : "neutral",
    rule.weekdays.includes(daily.fiveLimbs.vara as never) ? 8 : 0,
    daily.fiveLimbs.vara,
  );
  add(
    "nakshatra",
    rule.nakshatras.includes(daily.fiveLimbs.nakshatra as never)
      ? "pass"
      : "neutral",
    rule.nakshatras.includes(daily.fiveLimbs.nakshatra as never) ? 10 : 0,
    daily.fiveLimbs.nakshatra,
  );
  add(
    "tithi",
    rule.tithis.includes(daily.fiveLimbs.tithi as never) ? "pass" : "neutral",
    rule.tithis.includes(daily.fiveLimbs.tithi as never) ? 10 : 0,
    daily.fiveLimbs.tithi,
  );
  add(
    "choghadiya",
    window.quality === "favorable" ? "pass" : "neutral",
    window.quality === "favorable" ? 8 : 0,
    window.name,
  );
  for (const [name, period] of Object.entries({
    rahuKaal: daily.inauspicious.rahuKaal,
    yamaganda: daily.inauspicious.yamaganda,
    gulikaKaal: daily.inauspicious.gulikaKaal,
  }))
    if (overlaps(window, period))
      add(name, "fail", -25, "Window overlaps prohibited period");
  if (daily.inauspicious.bhadraVishti.active)
    add("bhadra-vishti", "fail", -15, daily.fiveLimbs.karana);
  if (daily.personalized) {
    add(
      "tara-bala",
      daily.personalized.taraBala.favorable ? "pass" : "fail",
      daily.personalized.taraBala.favorable ? 8 : -5,
      String(daily.personalized.taraBala.favorable),
    );
    add(
      "chandra-bala",
      daily.personalized.chandraBala.favorable ? "pass" : "fail",
      daily.personalized.chandraBala.favorable ? 8 : -5,
      String(daily.personalized.chandraBala.favorable),
    );
  }
  const lagna = chart.placements.find((item) => item.name === "Lagna")!,
    benefics = new Set(["Jupiter", "Venus", "Mercury", "Moon"]),
    malefics = new Set(["Saturn", "Mars", "Rahu", "Ketu", "Sun"]),
    supportive = chart.placements.filter(
      (item) =>
        benefics.has(item.name) &&
        [1, 4, 5, 7, 9, 10].includes(((item.sign - lagna.sign + 12) % 12) + 1),
    ),
    difficult = chart.placements.filter(
      (item) =>
        malefics.has(item.name) &&
        [1, 8].includes(((item.sign - lagna.sign + 12) % 12) + 1),
    );
  add(
    "lagna-support",
    supportive.length >= 2 ? "pass" : "neutral",
    Math.min(6, supportive.length * 2),
    `${supportive.map((item) => item.name).join(", ") || "No benefic"} in kendra/trikona`,
  );
  if (difficult.length)
    add(
      "lagna-eighth-malefics",
      "fail",
      -4 * difficult.length,
      difficult.map((item) => item.name).join(", "),
    );
  const karaka = chart.placements.find((item) => item.name === rule.karaka),
    state = chart.advanced.dignities.find((item) => item.name === rule.karaka),
    war = chart.advanced.planetaryStates.grahaYuddhaCandidates.find(
      (item) => item.loser === rule.karaka,
    );
  if (state?.combust)
    add("karaka-combustion", "fail", -12, `${rule.karaka} is combust`);
  else add("karaka-combustion", "pass", 4, `${rule.karaka} is not combust`);
  if (karaka?.retrograde)
    add("karaka-retrograde", "fail", -5, `${rule.karaka} is retrograde`);
  if (war)
    add(
      "karaka-war",
      "fail",
      -10,
      `${rule.karaka} loses a Graha Yuddha candidate`,
    );
  const raw = 50 + reasons.reduce((sum, item) => sum + item.points, 0),
    score = Math.max(0, Math.min(100, raw));
  return {
    ...window,
    midpointIso: new Date(
      (window.startJulianDay + window.endJulianDay - 2 * 2440587.5) * 43200000,
    ).toISOString(),
    score,
    reasons,
    lagna: { sign: lagna.sign, signName: lagna.signName, degree: lagna.degree },
    karaka: {
      name: rule.karaka,
      combust: Boolean(state?.combust),
      retrograde: Boolean(karaka?.retrograde),
      dignity: state?.dignity || "neutral",
    },
    eligible: !reasons.some(
      (item) =>
        ["rahuKaal", "yamaganda", "gulikaKaal"].includes(item.rule) &&
        item.status === "fail",
    ),
  };
}

/**
 * The chart a muhurta window is judged from: the day's planetary positions
 * with the lagna re-cast for the window's midpoint at the place. (Scoring the
 * person's natal lagna instead would give every window the same lagna.)
 */
export function chartForWindow(
  dayChart: ChartResult,
  window: { startJulianDay: number; endJulianDay: number },
  latitude: number,
  longitude: number,
): ChartResult {
  const mid = (window.startJulianDay + window.endJulianDay) / 2;
  const longitudeDeg = (((tropicalAscendant(mid, latitude, longitude) - lahiriAyanamsa(mid)) % 360) + 360) % 360;
  const sign = Math.floor(longitudeDeg / 30);
  return {
    ...dayChart,
    placements: dayChart.placements.map((p) =>
      p.name === "Lagna" ? { ...p, longitude: longitudeDeg, sign, signName: SIGNS[sign], degree: longitudeDeg - sign * 30 } : p,
    ),
  };
}
