import { SIGNS } from "./constants";
import type { ChartResult, GrahaName } from "./schema";

export type CurrentDasha = {
  mahadasha: string | null;
  antardasha: string | null;
  pratyantardasha?: string | null;
};
export type EverydayReading = {
  title: string;
  summary: string;
  sections: Array<{
    id: string;
    title: string;
    message: string;
    evidence: string[];
    evidenceRefs: Array<{id:string;factId:string;text:string;sourceStatus:"calculated"}>;
    claims: Array<{id:string;text:string;evidenceRefIds:string[]}>;
    status: "observation" | "traditional-lens" | "outlook";
  }>;
  confidence: { label: string; score: number; message: string };
  notice: string;
};

function traceReading(reading:Omit<EverydayReading,"sections">&{sections:Array<Omit<EverydayReading["sections"][number],"evidenceRefs"|"claims">>}):EverydayReading{return{...reading,sections:reading.sections.map(section=>{const evidenceRefs=section.evidence.map((text,index)=>({id:`evidence:${section.id}:${index+1}`,factId:`calculated:${section.id}:${index+1}`,text,sourceStatus:"calculated" as const})),sentences=section.message.split(/(?<=[.!?।])\s+/u).map(text=>text.trim()).filter(Boolean);return{...section,evidenceRefs,claims:sentences.map((text,index)=>({id:`claim:${section.id}:${index+1}`,text,evidenceRefIds:evidenceRefs.map(ref=>ref.id)}))}})}}

const SIGN_LENS = [
  "direct action, initiative and learning through experience",
  "steadiness, values and building lasting security",
  "curiosity, communication and adapting through information",
  "care, belonging and emotional protection",
  "creative visibility, pride and responsible self-expression",
  "discernment, practical improvement and attention to detail",
  "balance, cooperation and learning through relationships",
  "depth, privacy and transformation through sustained effort",
  "meaning, exploration and principled growth",
  "structure, responsibility and long-range achievement",
  "independence, systems thinking and contribution to groups",
  "imagination, empathy and the need for clear boundaries",
];

const PLANET_LENS: Record<string, string> = {
  Sun: "identity, confidence, authority and purposeful action",
  Moon: "emotional needs, habits, care and belonging",
  Mars: "initiative, courage, competition and decisive effort",
  Mercury: "learning, analysis, communication and trade",
  Jupiter: "growth, teaching, judgment and guiding principles",
  Venus: "relationships, enjoyment, aesthetics and agreements",
  Saturn: "responsibility, patience, limits and durable results",
  Rahu: "experimentation, ambition and unfamiliar territory",
  Ketu: "simplification, inward focus and release",
};
const PLANET_ACTION: Record<string, string> = {
  Sun: "choose one responsibility that needs visible ownership and state the decision plainly",
  Moon: "protect a steady daily rhythm and name emotional needs before making a major commitment",
  Mars: "channel urgency into one bounded task rather than several simultaneous confrontations",
  Mercury:
    "write down the facts, questions and terms before the next important conversation",
  Jupiter:
    "seek the principle behind the decision and test it with a trusted teacher or adviser",
  Venus:
    "clarify expectations, reciprocity and the quality of the agreement before saying yes",
  Saturn:
    "reduce the plan to a durable commitment that can be repeated even when motivation drops",
  Rahu: "treat unfamiliar opportunities as experiments with explicit limits and review dates",
  Ketu: "remove one unnecessary obligation so attention can return to what is essential",
};
const PLANET_ACTION_TE: Record<string, string> = {
  Sun: "స్పష్టమైన బాధ్యతను ఎంచుకుని నిర్ణయాన్ని నేరుగా చెప్పండి",
  Moon: "స్థిరమైన దినచర్యను కాపాడి, పెద్ద నిర్ణయానికి ముందు భావోద్వేగ అవసరాలను గుర్తించండి",
  Mars: "ఆతురతను అనేక ఘర్షణలకు కాకుండా ఒక పరిమిత పనికి మళ్లించండి",
  Mercury: "ముఖ్య సంభాషణకు ముందు వాస్తవాలు, ప్రశ్నలు మరియు షరతులను రాయండి",
  Jupiter:
    "నిర్ణయం వెనుక సూత్రాన్ని గుర్తించి విశ్వసనీయ గురువు లేదా సలహాదారుతో పరీక్షించండి",
  Venus: "అంగీకరించే ముందు పరస్పర అంచనాలు మరియు ఒప్పంద నాణ్యతను స్పష్టం చేయండి",
  Saturn:
    "ప్రేరణ తగ్గినా కొనసాగించగల ఒక స్థిరమైన నిబద్ధతకు ప్రణాళికను కుదించండి",
  Rahu: "కొత్త అవకాశాలను స్పష్టమైన పరిమితులు మరియు సమీక్ష తేదీలతో ప్రయోగాలుగా చూడండి",
  Ketu: "ముఖ్యమైన దానిపై దృష్టి పెట్టడానికి ఒక అనవసర బాధ్యతను తొలగించండి",
};

const FOCUS_PLAIN: Record<string, string> = {
  general: "the overall direction of life",
  career: "work, contribution and public responsibility",
  marriage: "partnership and committed relationships",
  children: "children, mentoring and creative continuity",
  education: "learning, qualifications and intellectual development",
  property: "home, property and foundations",
  health: "vitality, routines and resilience",
  spirituality: "meaning, ethics, teachers and spiritual practice",
};

const HOUSE_TOPICS = [
  "identity and approach",
  "resources, family and speech",
  "initiative, skills and communication",
  "home and emotional foundations",
  "learning, creativity and mentoring",
  "routines, service and obstacles",
  "partnership and agreements",
  "shared responsibilities and major transitions",
  "beliefs, teachers and long journeys",
  "career and public contribution",
  "networks, gains and long-term aims",
  "rest, retreat, release and distant places",
];
const LIFE_AREAS = [
  { id: "resources", title: "Family, resources and speech", house: 2 },
  {
    id: "communication",
    title: "Communication and personal initiative",
    house: 3,
  },
  { id: "home", title: "Home and emotional foundations", house: 4 },
  { id: "learning", title: "Learning, creativity and mentoring", house: 5 },
  { id: "routines", title: "Work habits, service and obstacles", house: 6 },
  { id: "relationships", title: "Relationships and agreements", house: 7 },
  { id: "change", title: "Shared responsibilities and major change", house: 8 },
  { id: "meaning", title: "Beliefs, teachers and long journeys", house: 9 },
  { id: "career", title: "Career and public contribution", house: 10 },
  { id: "community", title: "Friends, networks and long-term aims", house: 11 },
  { id: "rest", title: "Rest, retreat and letting go", house: 12 },
] as const;
const TE_AREA_TITLES: Record<string, string> = {
  resources: "కుటుంబం, వనరులు మరియు మాట",
  communication: "సంభాషణ మరియు స్వయంకృషి",
  home: "ఇల్లు మరియు భావోద్వేగ పునాది",
  learning: "విద్య, సృజనాత్మకత మరియు మార్గదర్శకత్వం",
  routines: "పని అలవాట్లు, సేవ మరియు అడ్డంకులు",
  relationships: "సంబంధాలు మరియు ఒప్పందాలు",
  change: "పంచుకున్న బాధ్యతలు మరియు ప్రధాన మార్పులు",
  meaning: "నమ్మకాలు, గురువులు మరియు దూర ప్రయాణాలు",
  career: "వృత్తి మరియు ప్రజా బాధ్యత",
  community: "స్నేహితులు, సమూహాలు మరియు దీర్ఘకాల లక్ష్యాలు",
  rest: "విశ్రాంతి, ఏకాంతం మరియు వదిలివేయడం",
};

function houseFrom(lagnaSign: number, sign: number) {
  return ((sign - lagnaSign + 12) % 12) + 1;
}

function lifeAreaSections(chart: ChartResult, language: "en" | "te") {
  const lagna = chart.placements.find(
    (placement) => placement.name === "Lagna",
  )!;
  const lords = [
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
  return LIFE_AREAS.map((area) => {
    const areaSign = (lagna.sign + area.house - 1) % 12,
      lord = lords[areaSign],
      placement = chart.placements.find(
        (item) => item.name === (lord as GrahaName),
      ),
      placedHouse = placement ? houseFrom(lagna.sign, placement.sign) : null;
    if (language === "te")
      return {
        id: area.id,
        title: TE_AREA_TITLES[area.id],
        status: "traditional-lens" as const,
        message: `${area.house}వ భావం ${SIGNS[areaSign]} రాశిలో ఉంది; దాని అధిపతి ${lord}${placement ? ` లగ్నం నుండి ${placedHouse}వ భావంలో ఉంది` : " స్థానం అందుబాటులో లేదు"}. సాంప్రదాయ పఠనంలో ఈ జీవన అంశాన్ని ${placedHouse ? HOUSE_TOPICS[placedHouse - 1] : "ఇతర జాతక అంశాలతో"} కలిపి పరిశీలిస్తారు. ఇది సంఘటన లేదా ఫలిత నిర్ధారణ కాదు.`,
        evidence: [
          `భావం ${area.house}: ${SIGNS[areaSign]}`,
          `అధిపతి: ${lord}${placement ? ` · ${SIGNS[placement.sign]} ${placement.degree.toFixed(2)}° · భావం ${placedHouse}` : ""}`,
        ],
      };
    return {
      id: area.id,
      title: area.title,
      status: "traditional-lens" as const,
      message: `House ${area.house} falls in ${SIGNS[areaSign]}, and its lord ${lord}${placement ? ` is placed in house ${placedHouse} from the Lagna` : " has no available placement"}. In a traditional reading, this connects the topic with ${placedHouse ? HOUSE_TOPICS[placedHouse - 1] : "the wider chart"}. It identifies a pattern to explore, not a promised event or fixed outcome.`,
      evidence: [
        `House ${area.house}: ${SIGNS[areaSign]}`,
        `Lord: ${lord}${placement ? ` · ${SIGNS[placement.sign]} ${placement.degree.toFixed(2)}° · house ${placedHouse}` : ""}`,
      ],
    };
  });
}

const FOCUS_AREAS: Record<string, string[]> = {
  general: ["career", "relationships", "home"],
  career: ["career", "routines", "community"],
  marriage: ["relationships", "home", "communication"],
  children: ["learning", "home", "relationships"],
  education: ["learning", "communication", "meaning"],
  property: ["home", "resources", "change"],
  health: ["routines", "home", "rest"],
  spirituality: ["meaning", "rest", "learning"],
};

function priorityLifeAreas(
  chart: ChartResult,
  language: "en" | "te",
  focus: string,
) {
  const selected = new Set(FOCUS_AREAS[focus] || FOCUS_AREAS.general);
  return lifeAreaSections(chart, language).filter((section) =>
    selected.has(section.id),
  );
}

export function buildEverydayReading(
  chart: ChartResult,
  current?: CurrentDasha | null,
  language: "en" | "te" = "en",
): EverydayReading {
  const lagna = chart.placements.find(
    (placement) => placement.name === "Lagna",
  )!;
  const moon = chart.placements.find((placement) => placement.name === "Moon")!;
  const guidance = chart.advanced.guidance;
  const focus = FOCUS_PLAIN[guidance.focus.selected] || guidance.focus.label;
  const focusLord = chart.placements.find(
    (placement) => placement.name === guidance.evidence.relevantHouseLord,
  );
  const strengthRows = chart.advanced.planetaryStates.avasthas
    .filter(
      (row) =>
        row.name !== "Rahu" &&
        row.name !== "Ketu" &&
        row.requiredStrengthRatio !== null,
    )
    .sort(
      (a, b) => (b.requiredStrengthRatio || 0) - (a.requiredStrengthRatio || 0),
    );
  const strongest = strengthRows[0];
  const currentLords = [current?.mahadasha, current?.antardasha].filter(
    Boolean,
  ) as string[];
  const timingTopics = currentLords
    .map((lord) => PLANET_LENS[lord])
    .filter(Boolean);
  const warningCount = chart.advanced.uncertainty.boundaryWarnings.length;

  if (language === "te") {
    return traceReading({
      title: "సాధారణ జాతక వివరణ",
      summary: `${SIGNS[lagna.sign]} లగ్నం, ${moon.nakshatra} నక్షత్రంలో చంద్రుడు. ఇది గణించిన స్థితుల ఆధారంగా ఇచ్చే సరళమైన సాంప్రదాయ దృష్టి; ఖచ్చితమైన వ్యక్తిత్వ నిర్ధారణ కాదు.`,
      sections: [
        {
          id: "self",
          title: "మీ ప్రాథమిక ధోరణి",
          status: "traditional-lens",
          message: `సాంప్రదాయ దృష్టిలో ${SIGNS[lagna.sign]} లగ్నం ${SIGN_LENS[lagna.sign]} అంశాలను ముందుకు తెస్తుంది. చంద్రుని స్థానం భావోద్వేగ అలవాట్లను పరిశీలించడానికి ఉపయోగిస్తారు.`,
          evidence: [
            `లగ్నం: ${SIGNS[lagna.sign]} ${lagna.degree.toFixed(2)}°`,
            `చంద్రుడు: ${SIGNS[moon.sign]} · ${moon.nakshatra} పాదం ${moon.pada}`,
          ],
        },
        {
          id: "focus",
          title: "మీరు ఎంచుకున్న జీవన అంశం",
          status: "observation",
          message: `${focus} కోసం ${guidance.focus.relevantHouse}వ భావం, దాని అధిపతి ${guidance.evidence.relevantHouseLord}, మరియు ${guidance.focus.recommendedVarga} చక్రం పరిశీలన క్రమం. ఫలితం ఇంకా నిర్ధారించబడలేదు.`,
          evidence: [
            `భావ అధిపతి ${focusLord ? `${SIGNS[focusLord.sign]} రాశిలో, లగ్నం నుండి ${houseFrom(lagna.sign, focusLord.sign)}వ భావంలో` : "అందుబాటులో లేదు"}`,
            `కారకులు: ${guidance.focus.karakas.join(", ")}`,
          ],
        },
        ...(strongest
          ? [
              {
                id: "strength",
                title: "స్పష్టమైన గణిత బలం",
                status: "observation" as const,
                message: `ప్రస్తుత షడ్బల గణనలో ${strongest.name} ఇతర గ్రహాల కంటే ఎక్కువ అవసర-బల నిష్పత్తి చూపుతోంది. ఇది ఆ గ్రహానికి సంబంధించిన విషయాలు సులభంగా జరుగుతాయని హామీ కాదు.`,
                evidence: [
                  `${strongest.name}: నిష్పత్తి ${strongest.requiredStrengthRatio?.toFixed(2)}`,
                  `అవసర బలం: ${strongest.requiredVirupas.toFixed(0)} విరూపాలు`,
                ],
              },
            ]
          : []),
        ...priorityLifeAreas(chart, "te", guidance.focus.selected),
        {
          id: "timing",
          title: "ప్రస్తుత కాల దృష్టి",
          status: "outlook",
          message: currentLords.length
            ? `${currentLords.join(" → ")} దశల కాలంలో ${timingTopics.join("; ")} అంశాలపై దృష్టి పెరగవచ్చని సంప్రదాయం సూచిస్తుంది. ఇది సంఘటన హామీ కాదు.`
            : "ప్రస్తుత దశ సమాచారం లోడ్ అయిన తర్వాత కాల దృష్టి కనిపిస్తుంది.",
          evidence: currentLords.length
            ? [
                `మహాదశ: ${current?.mahadasha}`,
                `అంతర్దశ: ${current?.antardasha}`,
              ]
            : ["కాల సమాచారం అందుబాటులో లేదు"],
        },
        ...(currentLords.length
          ? [
              {
                id: "counsel",
                title: "ఈ కాలాన్ని ఉపయోగించే విధానం",
                status: "observation" as const,
                message: `ఈ కాలానికి ఒక ఆచరణాత్మక దృష్టి: ${currentLords
                  .map((lord) => PLANET_ACTION_TE[lord])
                  .filter(Boolean)
                  .join(
                    "; ",
                  )}. ఇది జ్యోతిష్య పరిహారం లేదా ఫలిత హామీ కాదు; ఇది ప్రస్తుత అంశాల ఆధారంగా ఇచ్చే సాధారణ ప్రణాళిక సూచన.`,
                evidence: currentLords.map(
                  (lord) => `${lord}: ${PLANET_LENS[lord] || "కాల సూచకం"}`,
                ),
              },
            ]
          : []),
      ],
      confidence: {
        label: guidance.confidence.level,
        score: guidance.confidence.score,
        message: warningCount
          ? `${warningCount} జనన-సమయ సరిహద్దు హెచ్చరికలు ఉన్నాయి; సూక్ష్మ ఫలితాలను జాగ్రత్తగా చూడండి.`
          : "నమోదైన జనన-సమయ పరిధిలో ప్రధాన నమూనాలు స్థిరంగా ఉన్నాయి.",
      },
      notice:
        "ఇది సమీక్షించని సాంప్రదాయ వివరణ పొర. వైద్య, న్యాయ, ఆర్థిక లేదా ఖచ్చితమైన భవిష్యవాణిగా ఉపయోగించవద్దు.",
    });
  }

  return traceReading({
    title: "Everyday chart reading",
    summary: `${SIGNS[lagna.sign]} rising with the Moon in ${moon.nakshatra}. This is a plain-language traditional lens grounded in the calculated chart—not a diagnosis or a fixed description of the person.`,
    sections: [
      {
        id: "self",
        title: "Your basic orientation",
        status: "traditional-lens",
        message: `In the traditional lens, ${SIGNS[lagna.sign]} rising emphasizes ${SIGN_LENS[lagna.sign]}. The Moon is then used to explore emotional habits and the conditions that help you feel settled.`,
        evidence: [
          `Lagna: ${SIGNS[lagna.sign]} ${lagna.degree.toFixed(2)}°`,
          `Moon: ${SIGNS[moon.sign]} · ${moon.nakshatra} Pada ${moon.pada}`,
        ],
      },
      {
        id: "focus",
        title: "The life area you selected",
        status: "observation",
        message: `For ${focus}, the evidence path begins with house ${guidance.focus.relevantHouse}, its lord ${guidance.evidence.relevantHouseLord}, and the ${guidance.focus.recommendedVarga} divisional chart. This identifies what to examine; it does not by itself promise an outcome.`,
        evidence: [
          `House lord: ${focusLord ? `${SIGNS[focusLord.sign]}, house ${houseFrom(lagna.sign, focusLord.sign)} from Lagna` : "unavailable"}`,
          `Natural significators: ${guidance.focus.karakas.join(", ")}`,
        ],
      },
      ...(strongest
        ? [
            {
              id: "strength",
              title: "A clearly measured strength",
              status: "observation" as const,
              message: `Among the currently completed Shadbala ratios, ${strongest.name} is the strongest relative to its required threshold. This makes its chart role worth examining; it does not guarantee easy results in every topic associated with that planet.`,
              evidence: [
                `${strongest.name} strength ratio: ${strongest.requiredStrengthRatio?.toFixed(2)}`,
                `Required strength: ${strongest.requiredVirupas.toFixed(0)} virupas`,
              ],
            },
          ]
        : []),
      ...priorityLifeAreas(chart, "en", guidance.focus.selected),
      {
        id: "timing",
        title: "Your current outlook",
        status: "outlook",
        message: currentLords.length
          ? `The current ${currentLords.join(" → ")} period traditionally puts more attention on ${timingTopics.join("; ")}. Treat this as a theme to observe and plan around, not as a guaranteed event prediction.`
          : "Your current Dasha outlook will appear after the timing calendar loads.",
        evidence: currentLords.length
          ? [
              `Mahadasha: ${current?.mahadasha}`,
              `Antardasha: ${current?.antardasha}`,
            ]
          : ["Current timing unavailable"],
      },
      ...(currentLords.length
        ? [
            {
              id: "counsel",
              title: "Use this period well",
              status: "observation" as const,
              message: `A practical planning response to this chapter is to ${currentLords
                .map((lord) => PLANET_ACTION[lord])
                .filter(Boolean)
                .join(
                  "; then ",
                )}. This is ordinary planning counsel drawn from the active themes—not a remedy or a promised result.`,
              evidence: currentLords.map(
                (lord) => `${lord}: ${PLANET_LENS[lord] || "period indicator"}`,
              ),
            },
          ]
        : []),
    ],
    confidence: {
      label: guidance.confidence.level,
      score: guidance.confidence.score,
      message: warningCount
        ? `${warningCount} birth-time boundary warning(s) are active, so fine-grained conclusions should be treated cautiously.`
        : "The main sampled chart anchors remain stable within the reported birth-time range.",
    },
    notice:
      "This is an unreviewed traditional interpretation layer for reflection. Do not use it as medical, legal, financial or deterministic life advice.",
  });
}
