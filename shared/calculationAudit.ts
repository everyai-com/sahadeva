import type { ChartResult } from "./schema";

const distanceFromBoundary = (value: number, step: number) => {
  const remainder = ((value % step) + step) % step;
  return Math.min(remainder, step - remainder);
};

export function auditChartCalculation(chart: ChartResult) {
  const lagna = chart.placements.find((placement) => placement.name === "Lagna")!;
  const moon = chart.placements.find((placement) => placement.name === "Moon")!;
  const sensitiveFacts = [
    {
      fact: "Lagna sign",
      distanceDegrees: distanceFromBoundary(lagna.longitude, 30),
      thresholdDegrees: 0.25,
    },
    {
      fact: "Moon sign",
      distanceDegrees: distanceFromBoundary(moon.longitude, 30),
      thresholdDegrees: 0.25,
    },
    {
      fact: "Moon Nakshatra",
      distanceDegrees: distanceFromBoundary(moon.longitude, 360 / 27),
      thresholdDegrees: 0.1,
    },
    {
      fact: "Moon Pada",
      distanceDegrees: distanceFromBoundary(moon.longitude, 360 / 108),
      thresholdDegrees: 0.05,
    },
  ].map((item) => ({
    ...item,
    nearBoundary: item.distanceDegrees <= item.thresholdDegrees,
    distanceDegrees: Number(item.distanceDegrees.toFixed(6)),
  }));
  const validation = chart.engine.validation;
  const uncertified = Object.entries(validation)
    .filter(([key, value]) => key !== "productionCertified" && !/certified|validated|high-precision/i.test(String(value)))
    .map(([key, value]) => ({ domain: key, status: String(value) }));
  const reasons = [
    ...chart.advanced.uncertainty.boundaryWarnings,
    ...sensitiveFacts
      .filter((item) => item.nearBoundary)
      .map((item) => `${item.fact} is near a configured boundary screen.`),
    ...(!validation.productionCertified
      ? ["The calculation engine is not production-certified."]
      : []),
  ];
  return {
    schemaVersion: "sahadeva-calculation-audit-1",
    engine: {
      version: chart.engine.version,
      astronomyModel: chart.engine.astronomyModel,
      validRange: chart.engine.validRange,
      productionCertified: validation.productionCertified,
    },
    inputProvenance: {
      localDate: chart.input.date,
      localTime: chart.input.time,
      place: chart.input.place,
      coordinates: {
        latitude: chart.input.latitude,
        longitude: chart.input.longitude,
      },
      timezone: chart.engine.timezone,
      birthTimeAccuracyMinutes: chart.input.birthTimeAccuracyMinutes,
    },
    convention: {
      zodiac: chart.engine.zodiac.type,
      ayanamsa: chart.engine.ayanamsa,
      ayanamsaDegrees: chart.engine.ayanamsaDegrees,
      houseSystem: chart.input.houseSystem || "whole-sign",
      nodeMode: "engine-declared placement; verify mean/true-node convention before publication",
    },
    validation,
    uncertifiedDomains: uncertified,
    boundaryAudit: sensitiveFacts,
    existingWarnings: chart.advanced.uncertainty.boundaryWarnings,
    decision: {
      chartFactsUsableForResearchPreview: true,
      safeForReviewedPrediction: validation.productionCertified && reasons.length === 0,
      requiresHumanReview: !validation.productionCertified || reasons.length > 0,
      abstentionReasons: reasons,
    },
    notice:
      "This audit checks declared provenance, certification and boundary sensitivity. It does not independently recompute the chart with an external ephemeris.",
  };
}
