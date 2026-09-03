// Deterministic tool router. Given a natural-language question and light
// context flags, it returns an ordered call plan so an AI client knows which
// Sahadeva tool(s) to call BEFORE calling them, instead of guessing across the
// full tool surface. Pure string/flag logic — no chart calculation, no I/O.

export interface RouterContext {
  hasBirthDetails?: boolean;
  hasSecondPerson?: boolean;
  hasProfileRef?: boolean;
  language?: string;
}

export interface PlanStep {
  tool: string;
  why: string;
  requiredArgs: string[];
  when?: string;
}

const T = (s: string) => new RegExp(s, "i");

// Intent matchers, most specific first. Each yields a primary tool + why.
interface IntentRule {
  intent: string;
  test: RegExp;
  primary: string;
  why: string;
  requiredArgs: string[];
  follow?: PlanStep[];
  alternatives?: string[];
  resources?: string[];
}

const RULES: IntentRule[] = [
  {
    intent: "relationship-nonmarital",
    test: T(
      "business partner|co-?founder|partnership|colleague|team ?mate|friend|friendship|sibling|brother|sister|room ?mate|house ?mate|mentor|student|guru|boss|manager|work with|get along|with my (father|mother|dad|mom|son|daughter|parent|child)|parent(-| and )child",
    ),
    primary: "calculate_relationship_compatibility",
    why: "Gender-neutral Nakshatra compatibility for a non-marital bond, weighted for the chosen relationship type.",
    requiredArgs: ["personA", "personB", "relationship"],
    alternatives: ["calculate_compatibility"],
  },
  {
    intent: "marriage-match",
    test: T(
      "compatib|match ?making|kundli match|kundali match|guna|gun milan|ashtakoot|porutham|horoscope match|marry (him|her|them)|should (i|we) marry|are we compatible|spouse|husband|wife",
    ),
    primary: "calculate_compatibility",
    why: "North-Indian Ashtakoota + South-Indian Porutham + Kuja Dosha for a marriage match between two charts.",
    requiredArgs: ["bride", "groom"],
    alternatives: ["get_marriage_readiness", "calculate_relationship_compatibility"],
  },
  {
    intent: "marriage-timing",
    test: T(
      "when will i (get )?marr|marriage (time|timing|date|year|age)|时候|when.*wedding|delay in marriage|marriage window|when.*spouse|(what age|which year|when).*(marry|marriage|wedding)|wedding.*(year|date|when|age)",
    ),
    primary: "get_marriage_readiness",
    why: "Combines compatibility (if a partner is given) with ranked marriage-timing windows from the natal chart.",
    requiredArgs: ["birthDetails"],
    alternatives: ["find_marriage_windows"],
  },
  {
    // Checked before muhurta so "is today an auspicious day almanac" is read as
    // an almanac lookup, not an electional search.
    intent: "daily-panchanga",
    test: T(
      "panchang|panchanga|today('?s)? (tithi|nakshatra|stars|almanac)|rahu ?kal|choghadiya|\\bhora\\b|almanac|is today good|tithi|nakshatra today",
    ),
    primary: "get_panchanga",
    why: "Full daily almanac (tithi, nakshatra, yoga, karana, Rahu Kaal, Choghadiya) for a date and place; add natal for Tara/Chandra Bala.",
    requiredArgs: ["date", "place"],
    alternatives: ["get_natal_panchanga"],
  },
  {
    intent: "muhurta",
    test: T(
      "muhur|auspicious (time|date|day)|good (time|date|day) (to|for)|best (time|date|day) (to|for)|when should i (start|launch|buy|travel|sign|register|move)|shubh|electional",
    ),
    primary: "find_muhurta",
    why: "Ranks auspicious windows over a date range for a supported activity; use find_muhurta_with_natal_fit to weight the person's own chart.",
    requiredArgs: ["activity", "startDate", "endDate", "place"],
    alternatives: ["find_muhurta_with_natal_fit"],
  },
  {
    intent: "transits-timing",
    test: T(
      "transit|gochar|current (period|phase|time)|right now|these days|whats happening|saturn (sade ?sati|return)|sade ?sati|dhaiya|jupiter transit|what.*coming|next (few )?(months|year)",
    ),
    primary: "analyze_transit_activation",
    why: "How current transits activate the natal chart; pair with get_timing_context and build_slow_transit_calendar for a forward calendar.",
    requiredArgs: ["birthDetails"],
    alternatives: ["get_timing_context", "build_slow_transit_calendar", "fuse_timing"],
  },
  {
    intent: "dasha",
    test: T(
      "dasha|dasa|mahadasha|antardasha|bhukti|vimshottari|planetary period|which planet.*period|current period lord",
    ),
    primary: "calculate_dasha_system",
    why: "Vimshottari (and other) Dasha timeline for the chart.",
    requiredArgs: ["birthDetails"],
    alternatives: ["query_vimshottari_date", "fuse_timing"],
  },
  {
    intent: "remedies",
    test: T(
      "remed|upay|upaya|parihar|mantra|gemstone|gem stone|donation|puja|pooja|reduce.*dosha|counteract|cure|what.*do.*(dosha|planet|saturn|rahu|ketu|mars)",
    ),
    primary: "analyze_remedies",
    why: "Tradition-tagged remedies filtered by goal, burden and preference; pair with suggest_safe_practice for low-risk general practices.",
    requiredArgs: ["birthDetails"],
    alternatives: ["suggest_safe_practice", "analyze_lal_kitab"],
  },
  {
    intent: "dosha",
    test: T(
      "dosha|dosham|mangal|manglik|kuja|kaal ?sarp|kalsarp|pitra|sade|affliction|is my chart bad",
    ),
    primary: "calculate_doshas",
    why: "Detects and explains classical doshas with evidence and mitigations.",
    requiredArgs: ["birthDetails"],
    alternatives: ["analyze_remedies"],
  },
  {
    intent: "prashna",
    test: T(
      "prashna|horary|yes or no|will i (get|win|pass|succeed|recover)|lost|missing|where is|will it happen|is it going to|should i (take|accept|do)",
    ),
    primary: "calculate_prashna",
    why: "Horary answer from the moment of asking; no birth chart required. Record the outcome later with record_prashna_outcome.",
    requiredArgs: ["question", "place"],
    resources: ["sahadeva://prediction-quality"],
  },
  {
    intent: "full-report",
    test: T(
      "full (life )?report|complete( \\w+)? (reading|report|analysis)|entire chart|everything about|life report|detailed report|full kundli|full horoscope|pdf|download",
    ),
    primary: "generate_full_life_report",
    why: "Complete multi-domain life dossier; fetch individual sections with get_full_life_report_section and export with generate_report_pdf.",
    requiredArgs: ["birthDetails"],
    alternatives: ["get_full_life_report_section", "generate_report_pdf"],
  },
  {
    intent: "chart-image",
    test: T(
      "draw|render|show.*chart|chart (image|picture|diagram|svg)|north indian chart|south indian chart|rasi chart image|kundli (image|diagram)",
    ),
    primary: "render_chart",
    why: "Returns an SVG chart image (North/South Indian style).",
    requiredArgs: ["birthDetails"],
  },
  {
    intent: "yogas",
    test: T("yoga|raj ?yoga|dhan ?yoga|gaj ?kesari|combination|special combination"),
    primary: "analyze_yogas",
    why: "Detects named yogas present in the chart with evidence.",
    requiredArgs: ["birthDetails"],
  },
  {
    intent: "career",
    test: T("career|job|profession|promotion|startup|which field|what work|vocation|business (should|will)"),
    primary: "analyze_career_structure",
    why: "Focused career structure (10th house, D-10, karakas). For a conversational answer use consult_jyotishya with focus 'career'.",
    requiredArgs: ["birthDetails"],
    alternatives: ["consult_jyotishya"],
  },
  {
    intent: "wealth",
    test: T("money|wealth|finance|income|savings|invest|rich|financial"),
    primary: "analyze_finance_structure",
    why: "Focused wealth structure (2nd/11th, Dhana yogas). For a conversational answer use consult_jyotishya with focus 'wealth'.",
    requiredArgs: ["birthDetails"],
    alternatives: ["consult_jyotishya"],
  },
  {
    intent: "rectification",
    test: T("birth time|rectif|unknown time|not sure.*time|correct.*time|verify.*time"),
    primary: "rectify_birth_time",
    why: "Narrows an uncertain birth time using dated life events.",
    requiredArgs: ["birthDetails", "events"],
    alternatives: ["simulate_birth_time_uncertainty"],
  },
];

const DEFAULT_RESOURCES = [
  "sahadeva://security",
  "sahadeva://mcp-workflows",
];

export function recommendTools(question: string, context: RouterContext = {}) {
  const q = String(question || "");
  const matched = RULES.filter((rule) => rule.test.test(q));
  const primaryRule = matched[0];

  const twoPersonIntents = new Set([
    "relationship-nonmarital",
    "marriage-match",
  ]);
  const needsSecondPerson = primaryRule
    ? twoPersonIntents.has(primaryRule.intent)
    : false;

  const plan: PlanStep[] = [];

  // Almost every path needs an unambiguous place first.
  if (primaryRule && primaryRule.requiredArgs.some((a) => /place|Details|person|bride|groom/.test(a))) {
    plan.push({
      tool: "search_locations",
      why: "Resolve each birth/query place to unambiguous coordinates + timezone before the main call (skip if you already pass latitude/longitude/timezone).",
      requiredArgs: ["query"],
      when: "if any place is a name rather than explicit coordinates",
    });
  }

  if (primaryRule) {
    plan.push({
      tool: primaryRule.primary,
      why: primaryRule.why,
      requiredArgs: primaryRule.requiredArgs,
    });
    for (const step of primaryRule.follow || []) plan.push(step);
  } else {
    // Fallback: the single-call front door handles any general life question.
    plan.push({
      tool: "consult_jyotishya",
      why: "Default front door: one call returns the full life-domain profile, focused timing, per-tradition ledgers and remedies. Reuse its profileRef for follow-ups.",
      requiredArgs: ["birthDetails", "question"],
      when: context.hasProfileRef
        ? "pass the existing profileRef for a focused follow-up"
        : "first call builds and returns a profileRef",
    });
  }

  const intent = primaryRule?.intent ?? "general-consultation";
  const notes: string[] = [];
  if (needsSecondPerson && !context.hasSecondPerson)
    notes.push(
      "This is a two-person question — collect the second person's birth details before calling.",
    );
  if (!context.hasBirthDetails && intent !== "prashna" && intent !== "daily-panchanga" && intent !== "muhurta")
    notes.push("Birth details (name, date, time, place) are required for this path.");
  if (intent === "prashna")
    notes.push("Prashna needs no birth chart — only the question and the asking place/time.");

  return {
    schemaVersion: "sahadeva-tool-router-1",
    question: q,
    intent,
    matchedIntents: matched.map((r) => r.intent),
    primaryTool: primaryRule?.primary ?? "consult_jyotishya",
    plan,
    alternativeTools: primaryRule?.alternatives ?? ["get_depth_analysis"],
    relevantResources: [
      ...DEFAULT_RESOURCES,
      ...(primaryRule?.resources ?? []),
    ],
    notes,
    guidance:
      "Call the tools in `plan` order. Everything is deterministic — prefer one focused tool over many. When a question spans several domains or is open-ended, use consult_jyotishya and reuse its profileRef.",
    safety: {
      status: "routing-hint",
      notice:
        "This only recommends which tool to call; it makes no astrological claim. Follow each tool's own safety contract.",
    },
  };
}
