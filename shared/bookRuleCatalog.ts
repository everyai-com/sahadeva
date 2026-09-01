import type { ExecutableRule } from "./ruleDsl";

const LOCATORS = {
  bhavaTrik: "book-bhasin-sarvarth-chintamani:L1228:verses-4-6",
  yogaKaraka: "book-larsen-fundamentals:L4265:section-3.4.2",
  mahapurushaNavamsa: "book-larsen-fundamentals:L4170-L4264:charts-48-and-50",
  jupiterNodeQualification: "book-bhasin-sarvarth-chintamani:L6434:verses-1-2",
  diptadi: "book-larsen-fundamentals:L5002:section-5.2.1",
  balaadi: "book-larsen-fundamentals:L5020:section-5.2.2",
  lajjitadi: "book-larsen-fundamentals:L5062:section-5.2.3",
  sambandhaDefinition: "book-larsen-fundamentals:L4383-L4542:chapter-4",
  ninthLordSambandha:
    "book-bhasin-sarvarth-chintamani:L5541-L5571:verses-34-and-38-39",
  argalaObstruction: "book-larsen-fundamentals:L1093-L1109:worked-examples",
  panchangaNandadi: "book-larsen-fundamentals:L984-L1043:tables-9-and-rikta",
  panchangaTattva: "book-larsen-fundamentals:L2671-L2708:tables-24-26",
} as const;

const bhavaTrikRules = Array.from(
  { length: 12 },
  (_, index): ExecutableRule => {
    const house = index + 1;
    return {
      id: `sc-bhava-${house}-lord-in-trik`,
      version: 1,
      sourceKey: LOCATORS.bhavaTrik,
      tradition: "parashari-sarvarth-chintamani",
      topic: `bhava-${house}`,
      effect: "oppose",
      weight: -20,
      condition: {
        type: "predicate",
        fact: { kind: "house-lord-house", house },
        operator: "in",
        value: [6, 8, 12],
      },
      exceptions: [
        {
          id: "benefic-influence-qualifies",
          condition: {
            type: "predicate",
            fact: { kind: "house-lord-benefic-influence-count", house },
            operator: "gte",
            value: 1,
          },
          effect: "reduce",
          factor: 0.5,
        },
      ],
      interpretation: `The lord of house ${house} occupies a configured Trik house; benefic influence qualifies rather than erases the indication.`,
      harmClass: [6, 8, 12].includes(house)
        ? "high-impact-restricted"
        : "sensitive-reflective",
      reviewStatus: "draft",
    };
  },
);

const bhavaCombustRules = Array.from(
  { length: 12 },
  (_, index): ExecutableRule => {
    const house = index + 1;
    return {
      id: `sc-bhava-${house}-lord-combust`,
      version: 1,
      sourceKey: LOCATORS.bhavaTrik,
      tradition: "parashari-sarvarth-chintamani",
      topic: `bhava-${house}`,
      effect: "oppose",
      weight: -12,
      condition: {
        type: "predicate",
        fact: { kind: "house-lord-combust", house },
        operator: "eq",
        value: true,
      },
      exceptions: [],
      interpretation: `Combustion of the lord of house ${house} is retained as a separate qualifying condition; it is not treated as a stand-alone outcome.`,
      harmClass: [6, 8, 12].includes(house)
        ? "high-impact-restricted"
        : "sensitive-reflective",
      reviewStatus: "draft",
    };
  },
);

const yogaKarakaRule: ExecutableRule = {
  id: "jf-yoga-karaka-kendra-trikona-association",
  version: 1,
  sourceKey: LOCATORS.yogaKaraka,
  tradition: "parashari-larsen",
  topic: "yoga-karaka",
  effect: "support",
  weight: 20,
  condition: {
    type: "predicate",
    fact: { kind: "kendra-trikona-lord-association-count" },
    operator: "gte",
    value: 1,
  },
  exceptions: [],
  interpretation:
    "One or more kendra and trikona lord associations are structurally present by same lordship, conjunction, exchange, or mutual aspect.",
  harmClass: "general-cultural",
  reviewStatus: "draft",
};

const mahapurushaNames = {
  Mars: "Ruchaka",
  Mercury: "Bhadra",
  Jupiter: "Hamsa",
  Venus: "Malavya",
  Saturn: "Shasha",
} as const;
const mahapurushaNavamsaRules = Object.entries(mahapurushaNames).map(
  ([planet, name]): ExecutableRule => ({
    id: `jf-${name.toLowerCase()}-d9-condition`,
    version: 1,
    sourceKey: LOCATORS.mahapurushaNavamsa,
    tradition: "parashari-larsen",
    topic: "yoga-cancellation",
    effect: "support",
    weight: 18,
    condition: {
      type: "predicate",
      fact: { kind: "yoga-detected", yoga: `${name} Yoga candidate` },
      operator: "eq",
      value: true,
    },
    exceptions: [
      {
        id: "d9-debilitation-curtails",
        condition: {
          type: "predicate",
          fact: {
            kind: "varga-planet-dignity",
            varga: "D9",
            planet: planet as keyof typeof mahapurushaNames,
          },
          operator: "eq",
          value: "debilitated",
        },
        effect: "reduce",
        factor: 0.25,
      },
    ],
    interpretation: `The ${name} structural formation is kept separate from its D9 condition; D9 debilitation curtails rather than silently deletes the formation.`,
    harmClass: "sensitive-reflective",
    reviewStatus: "draft",
  }),
);

const jupiterNodeQualificationRule: ExecutableRule = {
  id: "sc-jupiter-node-malefic-influence-qualified",
  version: 1,
  sourceKey: LOCATORS.jupiterNodeQualification,
  tradition: "parashari-sarvarth-chintamani",
  topic: "yoga-cancellation",
  effect: "qualify",
  weight: -10,
  condition: {
    type: "all",
    conditions: [
      {
        type: "any",
        conditions: [
          {
            type: "predicate",
            fact: {
              kind: "graha-conjunction",
              first: "Jupiter",
              second: "Rahu",
            },
            operator: "eq",
            value: true,
          },
          {
            type: "predicate",
            fact: {
              kind: "graha-conjunction",
              first: "Jupiter",
              second: "Ketu",
            },
            operator: "eq",
            value: true,
          },
        ],
      },
      {
        type: "any",
        conditions: ["Sun", "Mars", "Saturn"].map((planet) => ({
          type: "predicate" as const,
          fact: {
            kind: "graha-aspect" as const,
            from: planet as "Sun" | "Mars" | "Saturn",
            to: "Jupiter" as const,
          },
          operator: "eq" as const,
          value: true,
        })),
      },
    ],
  },
  exceptions: [
    {
      id: "moon-and-venus-aspects-qualify",
      condition: {
        type: "all",
        conditions: [
          {
            type: "predicate",
            fact: { kind: "graha-aspect", from: "Moon", to: "Jupiter" },
            operator: "eq",
            value: true,
          },
          {
            type: "predicate",
            fact: { kind: "graha-aspect", from: "Venus", to: "Jupiter" },
            operator: "eq",
            value: true,
          },
        ],
      },
      effect: "cancel",
      factor: 0,
    },
  ],
  interpretation:
    "Jupiter-node conjunction plus configured malefic aspect is recorded as a contested structural qualification. Simultaneous Moon and Venus aspects cancel this draft qualification. No character, caste, health, or fate conclusion is permitted.",
  harmClass: "high-impact-restricted",
  reviewStatus: "draft",
};

const avasthaContextRules: ExecutableRule[] = [
  {
    id: "jf-balaadi-mrita-publication-boundary",
    version: 1,
    sourceKey: LOCATORS.balaadi,
    tradition: "parashari-larsen",
    topic: "avastha",
    effect: "abstain",
    weight: 0,
    condition: {
      type: "predicate",
      fact: {
        kind: "avastha-state-count",
        system: "balaadi",
        states: ["mrita"],
      },
      operator: "gte",
      value: 1,
    },
    exceptions: [],
    interpretation:
      "One or more planets are calculated in Mrita Balaadi Avastha. The source's timing symbolism is retained for internal review, but death, post-mortem fame, lifespan, or event certainty must not be inferred.",
    harmClass: "prohibited-output",
    reviewStatus: "draft",
  },
  {
    id: "jf-diptadi-kopa-context",
    version: 1,
    sourceKey: LOCATORS.diptadi,
    tradition: "parashari-larsen",
    topic: "avastha",
    effect: "qualify",
    weight: 0,
    condition: {
      type: "predicate",
      fact: {
        kind: "avastha-state-count",
        system: "diptadi",
        states: ["kopa"],
      },
      operator: "gte",
      value: 1,
    },
    exceptions: [],
    interpretation:
      "At least one planet is calculated in Kopa Diptadi Avastha through combustion. This qualifies the experience of an otherwise formed Yoga and is not a mental-health diagnosis.",
    harmClass: "sensitive-reflective",
    reviewStatus: "draft",
  },
  {
    id: "jf-lajjitadi-kshudhita-context",
    version: 1,
    sourceKey: LOCATORS.lajjitadi,
    tradition: "parashari-larsen",
    topic: "avastha",
    effect: "qualify",
    weight: 0,
    condition: {
      type: "predicate",
      fact: {
        kind: "avastha-state-count",
        system: "lajjitadi",
        states: ["kshudhita"],
      },
      operator: "gte",
      value: 1,
    },
    exceptions: [],
    interpretation:
      "At least one Kshudhita Lajjitadi state is structurally present through enemy and malefic influence. It may qualify Yoga experience but cannot establish depression, self-harm, relationship failure, curse, or a required remedy.",
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  },
];

const sambandhaRules: ExecutableRule[] = [
  {
    id: "sc-sixth-ninth-lord-sambandha",
    version: 1,
    sourceKey: LOCATORS.ninthLordSambandha,
    tradition: "parashari-sarvarth-chintamani",
    topic: "bhava-9",
    effect: "qualify",
    weight: 8,
    condition: {
      type: "predicate",
      fact: {
        kind: "house-lord-sambandha-count",
        firstHouse: 6,
        secondHouse: 9,
      },
      operator: "gte",
      value: 1,
    },
    exceptions: [],
    interpretation:
      "The sixth and ninth lords share at least one configured Graha Sambandha. This records a source-specific connection between challenge/service and dharma/opportunity; it does not guarantee benefit through opponents or a change of fortune.",
    harmClass: "sensitive-reflective",
    reviewStatus: "draft",
  },
  {
    id: "sc-ninth-eleventh-lord-sambandha",
    version: 1,
    sourceKey: LOCATORS.ninthLordSambandha,
    tradition: "parashari-sarvarth-chintamani",
    topic: "bhava-9",
    effect: "support",
    weight: 8,
    condition: {
      type: "predicate",
      fact: {
        kind: "house-lord-sambandha-count",
        firstHouse: 9,
        secondHouse: 11,
      },
      operator: "gte",
      value: 1,
    },
    exceptions: [],
    interpretation:
      "The ninth and eleventh lords share at least one configured Graha Sambandha. The link is retained as supporting structural evidence only, not a promise that fortune or gains will return.",
    harmClass: "sensitive-reflective",
    reviewStatus: "draft",
  },
];

const argalaRules: ExecutableRule[] = [
  {
    id: "jf-fully-obstructed-argala-context",
    version: 1,
    sourceKey: LOCATORS.argalaObstruction,
    tradition: "jaimini-larsen",
    topic: "argala",
    effect: "qualify",
    weight: 0,
    condition: {
      type: "predicate",
      fact: {
        kind: "argala-status-count",
        status: "fully-obstructed",
        targetHouse: 1,
        argalaHouse: 5,
      },
      operator: "gte",
      value: 1,
    },
    exceptions: [],
    interpretation:
      "The configured secondary fifth-house Argala onto Lagna is fully obstructed by an equal or greater ninth-house occupant count, matching the source's worked structural pattern. It cannot establish denial, loss, illness, relationship failure, or an inevitable event.",
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  },
];

const panchangaConflictPairs = [
  ["Vara", "Tithi"],
  ["Tithi", "Nakshatra"],
  ["Nakshatra", "Karana"],
  ["Karana", "Vara"],
] as const;
const panchangaRules: ExecutableRule[] = [
  {
    id: "jf-nandadi-rikta-context",
    version: 1,
    sourceKey: LOCATORS.panchangaNandadi,
    tradition: "panchanga-larsen-achyutananda",
    topic: "natal-panchanga",
    effect: "qualify",
    weight: 0,
    condition: {
      type: "predicate",
      fact: { kind: "natal-panchanga-tithi-class" },
      operator: "eq",
      value: "Rikta",
    },
    exceptions: [],
    interpretation:
      "The birth Tithi belongs to the Rikta Nandadi group. This is lineage-specific calendar context and cannot label a person, relationship, day, or life as inauspicious.",
    harmClass: "sensitive-reflective",
    reviewStatus: "draft",
  },
  ...panchangaConflictPairs.map(([first, second]): ExecutableRule => ({
    id: `jf-panchanga-conflict-${first.toLowerCase()}-${second.toLowerCase()}`,
    version: 1,
    sourceKey: LOCATORS.panchangaTattva,
    tradition: "panchanga-larsen-achyutananda",
    topic: "natal-panchanga",
    effect: "qualify",
    weight: 0,
    condition: {
      type: "predicate",
      fact: { kind: "natal-panchanga-tattva-conflict", first, second },
      operator: "eq",
      value: true,
    },
    exceptions: [],
    interpretation: `${first} and ${second} share a limb lord, forming the configured Tattva-conflict candidate. House-weakness and adverse-event claims are withheld and cannot be inferred from this link alone.`,
    harmClass: "high-impact-restricted",
    reviewStatus: "draft",
  })),
  {
    id: "jf-panchanga-akasha-resolution-context",
    version: 1,
    sourceKey: LOCATORS.panchangaTattva,
    tradition: "panchanga-larsen-achyutananda",
    topic: "natal-panchanga",
    effect: "qualify",
    weight: 0,
    condition: {
      type: "predicate",
      fact: { kind: "natal-panchanga-akasha-resolution-count" },
      operator: "gte",
      value: 1,
    },
    exceptions: [],
    interpretation:
      "The Yoga lord links at least one configured Tattva-conflict pair, making an Akasha-resolution candidate. It does not automatically cancel a chart indication or prescribe worship.",
    harmClass: "sensitive-reflective",
    reviewStatus: "draft",
  },
];

export const BOOK_RULE_CATALOG = [
  ...bhavaTrikRules,
  ...bhavaCombustRules,
  yogaKarakaRule,
  ...mahapurushaNavamsaRules,
  jupiterNodeQualificationRule,
  ...avasthaContextRules,
  ...sambandhaRules,
  ...argalaRules,
  ...panchangaRules,
] as const;
export const BOOK_RULE_CATALOG_META = {
  schemaVersion: "sahadeva-book-rule-catalog-1",
  version: "0.1.0",
  ruleCount: BOOK_RULE_CATALOG.length,
  sourceLocators: Object.values(LOCATORS),
  reviewStatus: "draft-awaiting-two-independent-reviewers",
  quotationPolicy: "locator-and-paraphrase-only",
  notice:
    "Rules are executable research drafts. They cannot publish until passage, practice, rights, examples, counterexamples and two-reviewer gates pass.",
} as const;
