import { SIGNS } from "./constants";
import {
  buildDashaCalendar,
  compactChartEvidence,
  queryDashaAt,
} from "./dashaCalendar";
import { buildEverydayReading } from "./everydayReading";
import type { ChartResult } from "./schema";
import {
  buildSlowTransitCalendar,
  intersectDashaTransits,
} from "./transitCalendar";
import { PROHIBITED_INFERENCES } from "./safety";
import { isoToJd } from "./dashaCalendar";
import { calculateDoshas } from "./doshas";
import { calculateStrengthLineage } from "./strengthLineage";
import { synthesizeVargas } from "./vargaSynthesis";
import { additionalDashaStatus } from "./additionalDashas";
import { buildTopicJudgment, JUDGMENT_TOPICS } from "./judgment";
import { analyzeAllHouses } from "./houseJudgment";
import { analyzeNatalPanchanga } from "./natalPanchanga";
import { buildPlanetaryRelationshipGraph } from "./practitioner";
import { buildTimingOutlook } from "./chatTimingOutlook";
import { TIMING_TOPICS } from "./topicConfig";

export function buildFullLifeReport(
  chart: ChartResult,
  asOfIso: string,
  horizonYears = 5,
) {
  const current = queryDashaAt(chart, asOfIso),
    reading = buildEverydayReading(chart, current, chart.input.language),
    lagna = chart.placements.find((item) => item.name === "Lagna")!,
    moon = chart.placements.find((item) => item.name === "Moon")!;
  const strengths = chart.advanced.planetaryStates.avasthas
    .map((row) => ({
      name: row.name,
      ratio: row.requiredStrengthRatio,
      totalVirupas: row.shadbalaTotalVirupas,
      requiredVirupas: row.requiredVirupas,
      avastha: row.balaadiAvastha,
      retrograde: row.retrograde,
    }))
    .sort((a, b) => (b.ratio || -1) - (a.ratio || -1));
  const placements = chart.placements.map((placement) => ({
    name: placement.name,
    sign: placement.sign,
    signName: placement.signName || SIGNS[placement.sign],
    degree: Number(placement.degree.toFixed(4)),
    houseFromLagna: ((placement.sign - lagna.sign + 12) % 12) + 1,
    nakshatra: placement.nakshatra,
    pada: placement.pada,
    retrograde: Boolean(placement.retrograde),
    dignity:
      chart.advanced.dignities.find((item) => item.name === placement.name)
        ?.dignity || "not-applicable",
    combust: Boolean(
      chart.advanced.dignities.find((item) => item.name === placement.name)
        ?.combust,
    ),
  }));
  const vargaAnchors = Object.fromEntries(
    ["D1", "D4", "D7", "D9", "D10", "D20", "D24", "D27", "D60"].map((varga) => [
      varga,
      chart.advanced.vargas[varga]
        .filter((item) =>
          [
            "Lagna",
            "Sun",
            "Moon",
            ...chart.advanced.guidance.focus.karakas,
          ].includes(item.name),
        )
        .map((item) => ({
          name: item.name,
          sign: item.sign,
          signName: SIGNS[item.sign],
        })),
    ]),
  );
  const calendar = buildDashaCalendar(chart),
    activeMaha = calendar.find(
      (item) =>
        item.lord === current.mahadasha &&
        Date.parse(current.instantIso) >= Date.parse(item.startIso) &&
        Date.parse(current.instantIso) < Date.parse(item.endIso),
    ),
    upcomingAntardashas =
      activeMaha?.antardashas
        .filter(
          (item) => Date.parse(item.endIso) > Date.parse(current.instantIso),
        )
        .slice(0, 4) || [];
  const start = isoToJd(current.instantIso),
    years = Math.min(10, Math.max(1, horizonYears)),
    transitCalendar = buildSlowTransitCalendar(
      chart,
      start,
      start + years * 365.2425,
    ),
    intersections = intersectDashaTransits(chart, transitCalendar.periods);
  const yearStart = new Date(current.instantIso).getUTCFullYear(),
    yearByYear = Array.from({ length: Math.ceil(years) }, (_, offset) => {
      const year = yearStart + offset,
        from = `${year}-01-01T00:00:00.000Z`,
        to = `${year + 1}-01-01T00:00:00.000Z`,
        active = intersections.filter(
          (item) => item.endIso > from && item.startIso < to,
        );
      return {
        year,
        activeDashaTransitWindows: active.slice(0, 24),
        slowPlanets: [...new Set(active.map((item) => item.planet))],
        notice: "These are overlapping timing factors, not promised events.",
      };
    });
  const domainTimingOutlooks = Object.fromEntries(
    TIMING_TOPICS.map(
      (topic) => [topic, buildTimingOutlook(chart, topic, current.instantIso, years)],
    ),
  );
  const supportive = strengths
      .filter((item) => Number(item.ratio) >= 1)
      .slice(0, 4),
    developmental = strengths
      .filter((item) => item.ratio !== null && Number(item.ratio) < 1)
      .slice(-4)
      .reverse(),
    dignitySupport = placements.filter((item) =>
      ["exalted", "own-sign"].includes(item.dignity),
    ),
    dignityChallenges = placements.filter(
      (item) => item.dignity === "debilitated" || item.combust,
    );
  const synthesis = {
    supportiveFactors: [
      ...supportive.map(
        (item) =>
          `${item.name} meets or exceeds its current required-strength threshold (${item.ratio?.toFixed(2)}).`,
      ),
      ...dignitySupport.map(
        (item) => `${item.name} is ${item.dignity} in ${item.signName}.`,
      ),
    ],
    developmentalFactors: [
      ...developmental.map(
        (item) =>
          `${item.name} is below its current required-strength threshold (${item.ratio?.toFixed(2)}); interpret with context.`,
      ),
      ...dignityChallenges.map(
        (item) =>
          `${item.name} is ${item.combust ? "combust" : item.dignity}; this is a factor to examine, not a verdict.`,
      ),
    ],
    combinationRule:
      "Supporting and challenging factors coexist. No single placement, strength score, Yoga or transit determines an outcome.",
  };
  const vargaPurpose: Record<string, string> = {
    D1: "overall natal structure",
    D4: "home and property",
    D7: "children and continuity",
    D9: "partnership, dharma and chart maturation",
    D10: "career and public work",
    D20: "spiritual practice",
    D24: "education and learning",
    D27: "resilience and strength",
    D60: "fine karmic pattern; extremely birth-time sensitive",
  };
  const divisionalAnalysis = Object.fromEntries(
    Object.entries(vargaAnchors).map(([key, value]) => [
      key,
      {
        purpose: vargaPurpose[key],
        anchors: value,
        birthTimeSensitive: ["D20", "D24", "D27", "D60"].includes(key),
        notice:
          "Structural anchors only; detailed outcomes require reviewed Varga interpretation rules.",
      },
    ]),
  );
  const specialDrishti: Record<string, number[]> = {
    Mars: [4, 7, 8],
    Jupiter: [5, 7, 9],
    Saturn: [3, 7, 10],
  };
  const houseAspects = chart.placements
    .filter((item) => item.name !== "Lagna")
    .flatMap((from) =>
      (specialDrishti[from.name] || [7]).map((distance) => {
        const sign = (from.sign + distance - 1) % 12;
        return {
          from: from.name,
          drishti: `${distance}th-house`,
          targetSign: sign,
          targetSignName: SIGNS[sign],
          targetHouseFromLagna: ((sign - lagna.sign + 12) % 12) + 1,
        };
      }),
    );
  const aspects = {
    convention: "Parashari sign-based Graha Drishti",
    planetToPlanet: chart.advanced.aspects,
    planetToHouse: houseAspects,
    notice:
      "Structural aspect geometry only. Outcomes require reviewed interpretation rules.",
  };
  const ashtakavarga = {
    ...chart.advanced.ashtakavarga,
    sarvaBySign: chart.advanced.ashtakavarga.sarva.signs.map(
      (bindus, sign) => ({ sign, signName: SIGNS[sign], bindus }),
    ),
    notice:
      "Bindu counts and reductions are calculation evidence; they are not an automatic good/bad verdict.",
  };
  const sourceCoverage = {
    status: "awaiting-reviewed-rules",
    statementCitations: [],
    notice:
      "No classical verse is attached until its passage, translation, rule extraction, and reviewer approval are present. Structural evidence is returned separately and must not be represented as a classical citation.",
  };
  const judgmentLedger=Object.fromEntries(JUDGMENT_TOPICS.map(topic=>[topic,buildTopicJudgment(chart,topic,asOfIso)]));
  return {
    schemaVersion: "sahadeva-full-life-report-1",
    subject: {
      name: chart.input.name,
      birthDate: chart.input.date,
      birthTime: chart.input.time,
      place: chart.input.place,
      coordinates: {
        latitude: chart.input.latitude,
        longitude: chart.input.longitude,
      },
      timezone: chart.engine.timezone,
    },
    methodology: {
      system: "Parashari",
      ayanamsa: chart.engine.ayanamsa,
      houseSystem: chart.advanced.houses.selectedSystem,
      zodiac: chart.engine.zodiac,
      engineVersion: chart.engine.version,
      judgmentSchemaVersion:"sahadeva-judgment-1",
      ruleDslVersion:"sahadeva-rule-dsl-1",
    },
    anchors: {
      lagna: {
        signName: lagna.signName,
        degree: lagna.degree,
        nakshatra: lagna.nakshatra,
        pada: lagna.pada,
      },
      moon: {
        signName: moon.signName,
        degree: moon.degree,
        nakshatra: moon.nakshatra,
        pada: moon.pada,
      },
      panchanga: chart.panchanga,
      birthDasha: chart.vimshottari,
    },
    plainLanguageReading: reading,
    judgmentLedger,
    houseExplorer:analyzeAllHouses(chart),
    natalPanchanga:analyzeNatalPanchanga(chart),
    planetaryRelationshipGraph:buildPlanetaryRelationshipGraph(chart),
    placements,
    measuredStrengths: strengths,
    structuralYogaCandidates: chart.advanced.yogas.filter(
      (item) => item.detected,
    ),
    aspects,
    ashtakavarga,
    divisionalChartAnchors: vargaAnchors,
    divisionalAnalysis,
    consultationDepth:{strengthLineage:calculateStrengthLineage(chart),vargaSynthesis:synthesizeVargas(chart,(chart.input.focus==="marriage"?"marriage":chart.input.focus==="career"?"career":chart.input.focus==="children"?"children":chart.input.focus==="education"?"education":chart.input.focus==="property"?"property":chart.input.focus==="spirituality"?"spirituality":"wealth")),targetedLagnas:chart.advanced.houses.targetedLagnas,additionalDashas:additionalDashaStatus(chart)},
    synthesis,
    sourceCoverage,
    doshaAnalysis: calculateDoshas(chart),
    currentTiming: {
      asOf: current.instantIso,
      periods: current,
      upcomingAntardashas,
    },
    futureTiming: {
      horizonYears: years,
      domainOutlooks: domainTimingOutlooks,
      slowTransitPeriods: transitCalendar.periods,
      dashaTransitIntersections: intersections,
      yearByYear,
      manifestationBoundary: {
        rule:
          "Activation identifies a life area, not the real-world event through which it manifests.",
        home:
          "Home/property activation does not establish relocation, foreign residence, leaving family, buying property, or working from home.",
        relationships:
          "Relationship activation does not establish a relationship start, ending, success, failure, engagement, or marriage.",
        observedHistory:
          "User-confirmed dates and records outrank astrological inference; contradictions must be preserved as failed or unresolved claims.",
      },
    },
    uncertainty: {
      ...chart.advanced.uncertainty,
      confidence: chart.advanced.guidance.confidence,
    },
    evidence: compactChartEvidence(chart),
    safety: {
      status: "research-preview",
      interpretationsReviewed: false,
      publishableKnowledgeRules: 0,
      prohibitedInferences: [...PROHIBITED_INFERENCES],
      notice:
        "Traditional interpretations are reflective and unreviewed. Sensitive topics may be explored as possibilities with optional practical suggestions, but timing themes are not guaranteed events and this report does not provide medical diagnosis, legal verdicts, guaranteed financial returns, fertility outcomes or lifespan predictions.",
    },
  };
}
