import { SIGNS } from "./constants";
import { jdToIso } from "./dashaCalendar";
import type { ChartResult, GrahaName } from "./schema";
import { vsop87ApparentPosition } from "./vsop87";
import { PROHIBITED_INFERENCES } from "./safety";

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
  ],
  DAY_LORD: Record<string, GrahaName> = {
    Sunday: "Sun",
    Monday: "Moon",
    Tuesday: "Mars",
    Wednesday: "Mercury",
    Thursday: "Jupiter",
    Friday: "Venus",
    Saturday: "Saturn",
  },
  ASPECTS = [
    { name: "conjunction", angle: 0 },
    { name: "sextile", angle: 60 },
    { name: "square", angle: 90 },
    { name: "trine", angle: 120 },
    { name: "opposition", angle: 180 },
  ],
  norm = (value: number) => ((value % 360) + 360) % 360,
  delta = (value: number, target: number) =>
    ((value - target + 540) % 360) - 180,
  angular = (a: number, b: number) => Math.min(norm(a - b), norm(b - a));

export function findSolarReturnJulianDay(
  natal: ChartResult,
  targetYear: number,
) {
  const natalSun = natal.placements.find((item) => item.name === "Sun")!,
    target = natalSun.tropicalLongitude!;
  let jd =
    Date.UTC(
      targetYear,
      Number(natal.input.date.slice(5, 7)) - 1,
      Number(natal.input.date.slice(8, 10)),
      12,
    ) /
      86400000 +
    2440587.5;
  for (let iteration = 0; iteration < 8; iteration++)
    jd -=
      delta(vsop87ApparentPosition("Sun", jd).longitude, target) / 0.98564736;
  return {
    julianDay: jd,
    instantIso: jdToIso(jd),
    targetTropicalSunLongitude: target,
    actualTropicalSunLongitude: vsop87ApparentPosition("Sun", jd).longitude,
    errorArcseconds:
      Math.abs(delta(vsop87ApparentPosition("Sun", jd).longitude, target)) *
      3600,
  };
}

export function calculateVarshaphal(
  natal: ChartResult,
  annual: ChartResult,
  targetYear: number,
  returnInfo = findSolarReturnJulianDay(natal, targetYear),
) {
  const birthYear = Number(natal.input.date.slice(0, 4)),
    completedYears = targetYear - birthYear;
  if (completedYears < 0) throw new Error("Target year precedes birth year");
  const natalLagna = natal.placements.find((item) => item.name === "Lagna")!,
    annualLagna = annual.placements.find((item) => item.name === "Lagna")!,
    munthaSign = (natalLagna.sign + completedYears) % 12,
    munthaLord = LORDS[munthaSign],
    annualPlacements = annual.placements.map((item) => ({
      ...item,
      houseFromAnnualLagna: ((item.sign - annualLagna.sign + 12) % 12) + 1,
    }));
  const planets = annual.placements.filter((item) => item.name !== "Lagna"),
    tajikaAspects = [];
  for (let i = 0; i < planets.length; i++)
    for (let j = i + 1; j < planets.length; j++) {
      const separation = angular(planets[i].longitude, planets[j].longitude),
        closest = ASPECTS.map((aspect) => ({
          ...aspect,
          orb: Math.abs(separation - aspect.angle),
        })).sort((a, b) => a.orb - b.orb)[0];
      if (closest.orb <= 5)
        tajikaAspects.push({
          from: planets[i].name,
          to: planets[j].name,
          aspect: closest.name,
          exactAngle: closest.angle,
          separation,
          orb: closest.orb,
          applyingStatus: "unavailable-without-validated-relative-motion-rule",
        });
    }
  const annualLordCandidates = [
    { role: "Muntha lord", planet: munthaLord },
    { role: "Annual Lagna lord", planet: LORDS[annualLagna.sign] },
    { role: "Natal Lagna lord", planet: LORDS[natalLagna.sign] },
    { role: "Return weekday lord", planet: DAY_LORD[annual.panchanga.vara] },
    {
      role: "Annual Sun sign lord",
      planet:
        LORDS[annual.placements.find((item) => item.name === "Sun")!.sign],
    },
  ];
  return {
    schemaVersion: "sahadeva-varshaphal-1",
    status: "structural-research-preview",
    subject: {
      name: natal.input.name,
      targetYear,
      completedYears,
      coverage: {
        start: returnInfo.instantIso,
        end: jdToIso(returnInfo.julianDay + 365.2425),
      },
    },
    solarReturn: {
      ...returnInfo,
      location: {
        place: natal.input.place,
        latitude: natal.input.latitude,
        longitude: natal.input.longitude,
        timezone: natal.engine.timezone,
      },
      notice:
        "Return instant solves tropical Sun longitude equality; annual chart is displayed in the configured sidereal zodiac.",
    },
    annualChart: {
      lagna: {
        sign: annualLagna.sign,
        signName: SIGNS[annualLagna.sign],
        degree: annualLagna.degree,
      },
      placements: annualPlacements,
      panchanga: annual.panchanga,
    },
    muntha: {
      sign: munthaSign,
      signName: SIGNS[munthaSign],
      lord: munthaLord,
      houseFromAnnualLagna: ((munthaSign - annualLagna.sign + 12) % 12) + 1,
      convention: "Natal Lagna advanced one sign per completed year",
    },
    tajika: {
      aspectCandidates: tajikaAspects,
      annualLord: {
        status: "candidates-only",
        candidates: annualLordCandidates,
        notice:
          "Varshesha selection requires a validated Panchavargiya Bala and aspect-eligibility implementation.",
      },
      sahams: { status: "unavailable-unreviewed", values: [] },
      muddaDasha: { status: "unavailable-unreviewed", periods: [] },
    },
    rulebook: {
      id: "sahadeva-varshaphal-structural",
      version: "0.1.0",
      reviewStatus: "draft-unreviewed",
      sourceKeys: [],
    },
    safety: {
      status: "research-preview",
      prohibitedInferences: [...PROHIBITED_INFERENCES],
      notice:
        "This annual chart describes traditional timing structure and does not guarantee yearly events.",
    },
  };
}
