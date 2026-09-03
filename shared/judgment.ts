import { SIGNS } from "./constants";
import type { ChartResult, GrahaName } from "./schema";
import { analyzeVargaDomain, buildPlanetaryRelationshipGraph } from "./practitioner";
import{JUDGMENT_TOPIC_CONFIG,type JudgmentTopic}from"./judgmentTopics";
export{JUDGMENT_TOPICS,type JudgmentTopic}from"./judgmentTopics";
export type JudgmentStatus =
  | "supported"
  | "mixed"
  | "unsupported"
  | "unknown";

export type JudgmentEvidence = {
  id: string;
  label: string;
  detail: string;
  factType:
    | "house"
    | "lord"
    | "occupant"
    | "strength"
    | "relationship"
    | "varga"
    | "timing"
    | "uncertainty";
  weight: number;
  source: "calculated" | "reviewed-rule";
};

export type JudgmentCitation = {
  sourceKey: string;
  ruleId: string;
  sourceTitle: string;
  author: string | null;
  locator: string;
  interpretation: string;
  reviewStatus: "publishable";
};

export type TopicJudgment = {
  schemaVersion: "sahadeva-judgment-1";
  id: string;
  topic: JudgmentTopic;
  title: string;
  conclusion: string;
  status: JudgmentStatus;
  score: number;
  supportingEvidence: JudgmentEvidence[];
  opposingEvidence: JudgmentEvidence[];
  vargaConfirmation: {
    varga: string;
    status: "supporting" | "mixed" | "opposing" | "unavailable";
    evidence: JudgmentEvidence[];
  };
  timingActivation: {
    status: "active" | "partial" | "inactive";
    currentLords: string[];
    evidence: JudgmentEvidence[];
    notice: string;
  };
  appliedRules: Array<{
    id: string;
    sourceKey: string;
    status: "structural-unreviewed" | "publishable";
  }>;
  practitionerAnalysis: {
    functionalLordship: unknown;
    relevantRelationships: unknown[];
    dispositorChain: string[];
    domainVarga: unknown;
  };
  citations: JudgmentCitation[];
  unresolvedSourceKeys: string[];
  uncertainty: {
    level: "low" | "moderate" | "high";
    birthTimeAccuracyMinutes: number;
    warnings: string[];
  };
  safety: {
    status: "research-preview";
    prohibitedInferences: string[];
    notice: string;
    allowedGuidance: string;
  };
  practicalQuestions: string[];
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


const relative = (origin: number, target: number) =>
  ((target - origin + 12) % 12) + 1;
const evidence = (
  id: string,
  label: string,
  detail: string,
  factType: JudgmentEvidence["factType"],
  weight: number,
): JudgmentEvidence => ({
  id,
  label,
  detail,
  factType,
  weight,
  source: "calculated",
});

export function buildTopicJudgment(
  chart: ChartResult,
  topic: JudgmentTopic = "career",
  asOfIso = new Date().toISOString(),
): TopicJudgment {
  const config = JUDGMENT_TOPIC_CONFIG[topic],
    lagna = chart.placements.find((item) => item.name === "Lagna")!,
    houseSign = (lagna.sign + config.house - 1) % 12,
    lord = LORDS[houseSign],
    lordPlacement = chart.placements.find((item) => item.name === lord)!,
    lordHouse = relative(lagna.sign, lordPlacement.sign),
    dignity = chart.advanced.dignities.find((item) => item.name === lord),
    strength = chart.advanced.planetaryStates.avasthas.find(
      (item) => item.name === lord,
    ),
    occupants = chart.placements.filter(
      (item) => item.name !== "Lagna" && item.sign === houseSign,
    ),
    supportingEvidence: JudgmentEvidence[] = [],
    opposingEvidence: JudgmentEvidence[] = [],
    relationshipGraph = buildPlanetaryRelationshipGraph(chart),
    functionalLordship = relationshipGraph.functionalLordships.planets.find(item=>item.planet===lord),
    relevantRelationships = relationshipGraph.edges.filter(edge=>edge.from===lord||edge.to===lord).slice(0,12),
    dispositorChain = relationshipGraph.dispositorChains.find(item=>item.planet===lord)?.path||[];

  supportingEvidence.push(
    evidence(
      `${topic}:house`,
      `House ${config.house}`,
      `${SIGNS[houseSign]} is the topic sign; its lord is ${lord}.`,
      "house",
      8,
    ),
  );
  for(const house of config.secondaryHouses){const sign=(lagna.sign+house-1)%12,secondaryLord=LORDS[sign],placement=chart.placements.find(item=>item.name===secondaryLord)!;supportingEvidence.push(evidence(`${topic}:secondary-house:${house}`,`Supporting house ${house}`,`${SIGNS[sign]} and its lord ${secondaryLord} in house ${relative(lagna.sign,placement.sign)} are retained as context; this factor is not scored until a reviewed topic rule defines its role.`,"house",0));}
  const lordDetail = `${lord} is in house ${lordHouse}, ${SIGNS[lordPlacement.sign]} ${lordPlacement.degree.toFixed(1)}°.`;
  if ([1, 4, 5, 7, 9, 10, 11].includes(lordHouse))
    supportingEvidence.push(
      evidence(`${topic}:lord-house`, "Topic lord placement", lordDetail, "lord", 18),
    );
  else
    opposingEvidence.push(
      evidence(`${topic}:lord-house`, "Topic lord placement", lordDetail, "lord", -14),
    );

  if (dignity?.dignity === "exalted" || dignity?.dignity === "own")
    supportingEvidence.push(
      evidence(
        `${topic}:dignity`,
        `${lord} dignity`,
        `${lord} is ${dignity.dignity}.`,
        "strength",
        18,
      ),
    );
  else if (dignity?.dignity === "debilitated")
    opposingEvidence.push(
      evidence(
        `${topic}:dignity`,
        `${lord} dignity`,
        `${lord} is debilitated; cancellation has not been assumed.`,
        "strength",
        -18,
      ),
    );
  if (dignity?.combust)
    opposingEvidence.push(
      evidence(
        `${topic}:combust`,
        `${lord} combustion`,
        `${lord} is within the engine's combustion condition.`,
        "strength",
        -10,
      ),
    );
  if ((strength?.requiredStrengthRatio ?? 0) >= 1)
    supportingEvidence.push(
      evidence(
        `${topic}:shadbala`,
        `${lord} measured strength`,
        `Required-strength ratio ${(strength!.requiredStrengthRatio! * 100).toFixed(0)}%.`,
        "strength",
        14,
      ),
    );

  if(functionalLordship){
    const target=functionalLordship.functionalNature==="challenging"?opposingEvidence:supportingEvidence;
    target.push(evidence(`${topic}:functional-lordship`,`${lord} functional role`,functionalLordship.reason,"relationship",functionalLordship.yogakaraka?16:functionalLordship.functionalNature==="supportive"?8:-8));
  }
  if(dispositorChain.length>1)supportingEvidence.push(evidence(`${topic}:dispositor-chain`,`${lord} dispositor chain`,dispositorChain.join(" → "),"relationship",4));
  const exchange=relevantRelationships.find(item=>item.kind==="exchange");
  if(exchange)supportingEvidence.push(evidence(`${topic}:exchange`,"Mutual sign exchange",exchange.detail,"relationship",12));
  else if (strength?.requiredStrengthRatio !== null)
    opposingEvidence.push(
      evidence(
        `${topic}:shadbala`,
        `${lord} measured strength`,
        `Required-strength ratio ${((strength?.requiredStrengthRatio ?? 0) * 100).toFixed(0)}%.`,
        "strength",
        -10,
      ),
    );

  for (const occupant of occupants) {
    const target = config.karakas.includes(occupant.name)
      ? supportingEvidence
      : occupant.name === "Rahu" || occupant.name === "Ketu"
        ? opposingEvidence
        : supportingEvidence;
    target.push(
      evidence(
        `${topic}:occupant:${occupant.name}`,
        `${occupant.name} occupies house ${config.house}`,
        `${occupant.name} is in ${SIGNS[occupant.sign]} ${occupant.degree.toFixed(1)}°; this is a structural observation, not a standalone outcome.`,
        "occupant",
        target === opposingEvidence ? -7 : 7,
      ),
    );
  }
  for(const karaka of config.karakas){const placement=chart.placements.find(item=>item.name===karaka)!,karakaHouse=relative(lagna.sign,placement.sign),karakaDignity=chart.advanced.dignities.find(item=>item.name===karaka),karakaStrength=chart.advanced.planetaryStates.avasthas.find(item=>item.name===karaka)?.requiredStrengthRatio??null,detail=`${karaka} is in house ${karakaHouse}, ${SIGNS[placement.sign]} ${placement.degree.toFixed(1)}°${karakaDignity?`, ${karakaDignity.dignity}`:""}${karakaStrength===null?"":`, strength ratio ${(karakaStrength*100).toFixed(0)}%`}.`;if(karakaDignity?.dignity==="debilitated"||karakaDignity?.combust)opposingEvidence.push(evidence(`${topic}:karaka:${karaka}`,`${karaka} as topic karaka`,detail,"strength",-6));else supportingEvidence.push(evidence(`${topic}:karaka:${karaka}`,`${karaka} as topic karaka`,detail,"strength",6));}

  const varga = chart.advanced.vargas[config.varga],
    vargaLord = varga?.find((item) => item.name === lord),
    domainVarga = analyzeVargaDomain(chart,config.varga,config.house,config.karakas),
    vargaEvidence: JudgmentEvidence[] = [];
  let vargaStatus: TopicJudgment["vargaConfirmation"]["status"] = "unavailable";
  if (vargaLord) {
    vargaStatus = domainVarga.status === "supporting" ? "supporting" : "opposing";
    vargaEvidence.push(
      evidence(
        `${topic}:varga:${config.varga}`,
        `${lord} in ${config.varga}`,
        domainVarga.evidence.join(" "),
        "varga",
        vargaStatus === "supporting" ? 12 : vargaStatus === "opposing" ? -12 : 0,
      ),
    );
    (vargaStatus === "opposing" ? opposingEvidence : supportingEvidence).push(
      ...vargaEvidence,
    );
  }

  const jd = 2440587.5 + new Date(asOfIso).getTime() / 86400000,
    period = chart.advanced.vimshottariTimeline.find(
      (item) => jd >= item.startJulianDay && jd < item.endJulianDay,
    ),
    sub = period?.subPeriods.find(
      (item) => jd >= item.startJulianDay && jd < item.endJulianDay,
    ),
    currentLords = [period?.lord, sub?.lord].filter(Boolean) as string[],
    activators = new Set<string>([lord, ...config.karakas]),
    activeHits = currentLords.filter((item) => activators.has(item)),
    timingStatus = activeHits.length >= 2 ? "active" : activeHits.length ? "partial" : "inactive",
    timingEvidence = currentLords.length
      ? [
          evidence(
            `${topic}:timing`,
            "Current Vimshottari activation",
            `${currentLords.join(" → ")}${activeHits.length ? ` activates ${activeHits.join(", ")}` : " does not directly activate the configured topic lord or Karakas"}.`,
            "timing",
            activeHits.length * 8,
          ),
        ]
      : [];
  if (activeHits.length) supportingEvidence.push(...timingEvidence);

  const raw =
      50 +
      supportingEvidence.reduce((sum, item) => sum + item.weight, 0) +
      opposingEvidence.reduce((sum, item) => sum + item.weight, 0),
    score = Math.max(0, Math.min(100, Math.round(raw))),
    status: JudgmentStatus =
      supportingEvidence.length && opposingEvidence.length
        ? "mixed"
        : score >= 65
          ? "supported"
          : score < 40
            ? "unsupported"
            : "unknown",
    accuracy = chart.input.birthTimeAccuracyMinutes ?? 5,
    warnings = chart.advanced.uncertainty.boundaryWarnings;

  return {
    schemaVersion: "sahadeva-judgment-1",
    id: `${topic}:${chart.engine.version}:${chart.input.date}:${chart.input.time}`,
    topic,
    title: config.title,
    conclusion:
      status === "supported"
        ? `The calculated chart contains several supporting structures for ${config.title.toLowerCase()}.`
        : status === "unsupported"
          ? `The configured structural test does not establish a strong ${config.title.toLowerCase()} promise.`
          : status === "mixed"
            ? `The chart contains both support and friction for ${config.title.toLowerCase()}; neither side should be omitted.`
            : `The available reviewed evidence is insufficient for a firm ${config.title.toLowerCase()} judgment.`,
    status,
    score,
    supportingEvidence,
    opposingEvidence,
    vargaConfirmation: {
      varga: config.varga,
      status: vargaStatus,
      evidence: vargaEvidence,
    },
    timingActivation: {
      status: timingStatus,
      currentLords,
      evidence: timingEvidence,
      notice: "Timing describes activation only; it cannot create a natal promise or guarantee an event.",
    },
    appliedRules: config.sourceKeys.map((sourceKey) => ({
      id: sourceKey,
      sourceKey,
      status: "structural-unreviewed",
    })),
    practitionerAnalysis:{functionalLordship:functionalLordship||null,relevantRelationships,dispositorChain,domainVarga},
    citations: [],
    unresolvedSourceKeys: [...config.sourceKeys],
    uncertainty: {
      level: accuracy > 15 || warnings.length > 2 ? "high" : accuracy > 5 || warnings.length ? "moderate" : "low",
      birthTimeAccuracyMinutes: accuracy,
      warnings,
    },
    safety: {
      status: "research-preview",
      prohibitedInferences: [
        "guaranteed employment or promotion",
        "financial return",
        "medical diagnosis",
        "relationship verdict",
        "guaranteed event",
      ],
      notice: "This is a transparent traditional research model, not scientific prediction or professional advice.",
      allowedGuidance:
        "Discuss this domain as a possibility and offer practical, optional planning suggestions; do not turn it into a verdict or guarantee.",
    },
    practicalQuestions: config.questions,
  };
}
