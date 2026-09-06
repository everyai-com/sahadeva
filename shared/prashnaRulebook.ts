import type { QuestionCategory } from "./consultation";

export const PRASHNA_TRADITIONS = [
  "integrated",
  "classical",
  "tajaka",
  "systems-approach",
  "prashna-nadi",
] as const;

export type PrashnaTradition = (typeof PRASHNA_TRADITIONS)[number];

export const PRASHNA_SOURCES = {
  systems: {
    id: "book-application-prasna-astrology",
    title: "Application of Prasna Astrology",
    tradition: "systems-approach",
  },
  systemsTerminology: {
    id: "web-systems-approach-planetary-aspects",
    title: "Systems' Approach: General Terminology / Planetary Aspects",
    tradition: "systems-approach",
    url: "https://yournetastrologer.com/terminology.htm",
  },
  chappanna: {
    id: "book-chappanna-prasana-sastra",
    title: "Chappanna or Prasana Sastra",
    tradition: "classical",
  },
  tantra: {
    id: "book-neelakanta-prasna-tantra",
    title: "Sri Neelakanta's Prasna Tantra",
    tradition: "tajaka",
  },
  nadi: {
    id: "book-umang-taneja-prashna-nadi",
    title: "Prashna Nadi Astrology",
    tradition: "prashna-nadi",
  },
  marga: {
    id: "book-prasna-marga-raman",
    title: "Prasna Marga, Parts I-II",
    tradition: "classical",
  },
  kpReaderVi: {
    id: "book-kp-reader-vi-horary",
    title: "Horary Astrology / KP Reader VI",
    tradition: "prashna-nadi",
  },
  viswanathVolI: {
    id: "book-viswanath-prashna-remedies-vol-1",
    title: "Prashna Astrology and Remedies, Volume I",
    tradition: "prashna-nadi",
  },
  daivajnaVallabha: {
    id: "book-daivajna-vallabha",
    title: "Daivajna Vallabha",
    tradition: "classical",
  },
} as const;

export const PRASHNA_HOUSES: Record<QuestionCategory, number> = {
  career: 10,
  relationship: 7,
  money: 2,
  property: 4,
  travel: 9,
  "lost-object": 4,
  health: 6,
  education: 4,
  litigation: 7,
  children: 5,
  "missing-person": 7,
  general: 1,
};

export type PrashnaHouseRole = {
  role: string;
  house: number;
  sourceIds: string[];
  locator: string;
  status: "primary" | "supporting" | "conditional";
};

/**
 * Topic topology retained separately from verdict rules. A house can identify
 * an actor or process without being positive or negative evidence by itself.
 */
export const PRASHNA_TOPIC_HOUSES: Record<QuestionCategory, PrashnaHouseRole[]> = {
  career: [
    { role: "profession or office", house: 10, sourceIds: [PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Prasna Tantra example XII; Daivajna Vallabha Chapter II", status: "primary" },
    { role: "service or employment", house: 6, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra Chapter II, employer–employee questions", status: "supporting" },
    { role: "gain or preferment", house: 11, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example XII and eleventh-house questions", status: "supporting" },
    { role: "change or leaving", house: 12, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example XI", status: "conditional" },
  ],
  relationship: [
    { role: "partner or marriage", house: 7, sourceIds: [PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Prasna Tantra seventh-house questions and example VI", status: "primary" },
    { role: "family formation", house: 2, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra marriage questions", status: "supporting" },
    { role: "obstruction or marital vulnerability", house: 8, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example VI", status: "supporting" },
    { role: "fulfilment", house: 11, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra eleventh-house questions", status: "supporting" },
  ],
  money: [
    { role: "wealth or movable resources", house: 2, sourceIds: [PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Prasna Tantra second-house questions; example I", status: "primary" },
    { role: "gain", house: 11, sourceIds: [PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Eleventh-house questions; Daivajna Vallabha Chapter II", status: "supporting" },
    { role: "speculation or brokerage", house: 5, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example I", status: "conditional" },
  ],
  property: [
    { role: "land, home or property", house: 4, sourceIds: [PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Fourth-house questions; Daivajna Vallabha Chapter II", status: "primary" },
    { role: "price or resources", house: 2, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra property and purchase questions", status: "supporting" },
    { role: "seller or counterparty", house: 7, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra property example in fourth-house questions", status: "supporting" },
  ],
  travel: [
    { role: "foreign or long journey", house: 9, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra examples introduction and example X", status: "primary" },
    { role: "journey within the country", house: 3, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra examples introduction", status: "conditional" },
    { role: "local journey", house: 12, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra examples introduction", status: "conditional" },
    { role: "foreign journey when linked with the ninth lord", house: 7, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra examples introduction", status: "conditional" },
  ],
  "lost-object": [
    { role: "lost property", house: 4, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example VIII", status: "primary" },
    { role: "thief", house: 7, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example VIII", status: "supporting" },
    { role: "movable value", house: 2, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example VIII", status: "supporting" },
    { role: "recovery or gain", house: 11, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example VIII", status: "supporting" },
  ],
  health: [
    { role: "disease", house: 6, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example V, Raman's stated experienced preference", status: "primary" },
    { role: "physician", house: 1, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra sixth-house questions and example V", status: "supporting" },
    { role: "patient", house: 10, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example V", status: "supporting" },
    { role: "treatment", house: 4, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example V", status: "supporting" },
    { role: "vulnerability or longevity", house: 8, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra sixth-house questions and example V", status: "supporting" },
    { role: "disease in Neelakanta's stated allocation", house: 7, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example V, explicitly contrasted by Raman", status: "conditional" },
  ],
  education: [
    { role: "basic learning", house: 4, sourceIds: [PRASHNA_SOURCES.daivajnaVallabha.id, PRASHNA_SOURCES.kpReaderVi.id], locator: "Daivajna Vallabha Chapter II; KP education combinations", status: "primary" },
    { role: "intellect or study", house: 5, sourceIds: [PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Daivajna Vallabha Chapter II", status: "supporting" },
    { role: "higher or sacred study", house: 9, sourceIds: [PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Daivajna Vallabha Chapter II", status: "supporting" },
  ],
  litigation: [
    { role: "dispute or opponent", house: 7, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example VII and example IX", status: "primary" },
    { role: "querent or plaintiff", house: 1, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example IX", status: "supporting" },
    { role: "enemy, contest or conflict", house: 6, sourceIds: [PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Daivajna Vallabha Chapter II", status: "supporting" },
  ],
  children: [
    { role: "child or conception", house: 5, sourceIds: [PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Prasna Tantra fifth-house questions and example III", status: "primary" },
    { role: "fulfilment", house: 11, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example III", status: "supporting" },
    { role: "obstruction or loss", house: 8, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra fifth-house questions", status: "supporting" },
  ],
  "missing-person": [
    { role: "absent person", house: 7, sourceIds: [PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.daivajnaVallabha.id], locator: "General absent-person allocation; derive another house when relationship is known", status: "primary" },
    { role: "whereabouts or wellbeing", house: 4, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example IV, fourth from the absent-person house", status: "supporting" },
    { role: "vulnerability or longevity", house: 8, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example IV, eighth from the absent-person house", status: "supporting" },
    { role: "route or return", house: 11, sourceIds: [PRASHNA_SOURCES.tantra.id], locator: "Prasna Tantra example IV", status: "supporting" },
  ],
  general: [
    { role: "querent and general matter", house: 1, sourceIds: [PRASHNA_SOURCES.daivajnaVallabha.id], locator: "Daivajna Vallabha Chapter II", status: "primary" },
  ],
};

export const PRASHNA_CATEGORY_SOURCES: Record<QuestionCategory, string[]> = {
  career: [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.nadi.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.kpReaderVi.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  relationship: [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.chappanna.id, PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.nadi.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.kpReaderVi.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  money: [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.chappanna.id, PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.nadi.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.kpReaderVi.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  property: [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.chappanna.id, PRASHNA_SOURCES.nadi.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.kpReaderVi.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  travel: [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.chappanna.id, PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.nadi.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.kpReaderVi.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  "lost-object": [PRASHNA_SOURCES.chappanna.id, PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.nadi.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.kpReaderVi.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  health: [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.chappanna.id, PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  education: [PRASHNA_SOURCES.nadi.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.kpReaderVi.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  litigation: [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.nadi.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.kpReaderVi.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  children: [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.chappanna.id, PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.kpReaderVi.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  "missing-person": [PRASHNA_SOURCES.systems.id, PRASHNA_SOURCES.chappanna.id, PRASHNA_SOURCES.tantra.id, PRASHNA_SOURCES.marga.id, PRASHNA_SOURCES.viswanathVolI.id, PRASHNA_SOURCES.daivajnaVallabha.id],
  general: Object.values(PRASHNA_SOURCES).map((source) => source.id),
};

export const PRASHNA_CAPABILITIES: Record<
  PrashnaTradition,
  { status: "available" | "partial"; available: string[]; missing: string[] }
> = {
  integrated: {
    status: "partial",
    available: ["question-time D1", "whole-sign event house", "lord dignity", "occupants", "Moon house"],
    missing: ["reviewed conflict-resolution precedence between traditions"],
  },
  classical: {
    status: "partial",
    available: ["question-time D1", "whole-sign event house", "lord dignity", "occupants", "Moon house", "Navamsa", "independent Chappanna Navamsa and Daivajna Vallabha sign/influence Dhatu-Moola-Jeeva classifiers", "Daivajna Vallabha Chapter X subject-house, sign-size, and color/shape descriptors with local Navamsa-tier selection and tie abstention", "Daivajna Vallabha rising-sign success testimony", "complete Daivajna Vallabha Chapter III gains/losses safe rule set with correlated evidence", "Daivajna Vallabha Chapter VI safe return and journey-condition rules with one return cluster", "Daivajna Vallabha Chapter VIII verses 3, 4, 6 and 7 safe symbolic health testimony with one recovery cluster", "Prasna Marga marriage and children Upachaya predicates", "Prasna Marga children stanzas 18 and 22", "Daivajna Vallabha marriage verses 1, 3, 4, and 11-13 with promise/obstacle deduplication", "Daivajna Vallabha lost-property verses 1–3 location-only testimony and verses 8, 10–17 with verse-11 partial abstention and correlated recovery deduplication", "lost-property angular-planet/sign direction with strength selection and unresolved Navamsa-distance candidates", "Daivajna Vallabha travel verses 1-6, neutral verses 8-9 timing candidates, and verse-10 retrograde search with refined station boundaries", "catalogued non-executable high-impact or textually incomplete source claims"],
    missing: ["wider reviewed topic-specific stanza rules", "visual Drekkana matching", "resolved lost-property Yojana wording and whole-sign Lagna strength comparison", "source-located tie-break beyond Chapter X's Navamsa relationship tiers", "remaining topic-specific direction and time rules", "human review of newly extracted Prasna Marga rules"],
  },
  tajaka: {
    status: "partial",
    available: ["question-time D1", "querent and event lords", "dignity", "hour-forward applying/separating motion", "Prasna Tantra deepthamsas", "friendly/hostile Tajaka aspect classification", "Ithasala/Easarapha candidates", "application- and perfection-ordered Nakta/Yamaya transfer candidates", "four calculable Kamboola grades", "career stanza-112 angular-Moon Kamboola and result scale"],
    missing: ["Kamboola grades requiring Hadda/Panchadhikara", "source-located universal retrograde/interference prohibitions", "worked-example reproduction across all enabled yogas"],
  },
  "systems-approach": {
    status: "partial",
    available: ["question-time D1", "whole-sign event house", "dignity", "combustion", "MEP projection", "all twelve functional-malefic/benefic rows", "all twelve MMP rows and fallback precedence", "graded close conjunction and full-aspect projection to houses and planets", "worked Chart 36 Ketu-Moon aspect topology", "weak-planet causes and moolatrikona dependency propagation", "neutral main/sub/sub-sub period activation layers", "sub-period trend with event-MEP and natal/transit sub-period-lord contact synthesis", "bounded forward transit-contact calendar with refined ingress/egress, edge truncation, retained sampled peaks, and one-minute local continuous peak refinement"],
    missing: ["exact-degree worked-chart reproduction", "clean verification of the OCR-corrupt major-period favorable/adverse paragraph"],
  },
  "prashna-nadi": {
    status: "partial",
    available: ["question-time D1", "source-located KP New 6′ correction from Lahiri", "algorithmic 1-249 beginning-of-sub seed ascendant", "verified timestamp and numbered-horary Placidus cusps", "cuspal and planetary star/sub/sub-sub lords", "four consultation-wired cuspal event predicates", "KP-Moon-recomputed Vimshottari timeline with current activation and forward conjoined-period candidates", "Viswanath Volume I 2-6-10-11 employment predicate retained separately from Reader VI", "eight event-specific Reader VI transit patterns", "scale-aware Sun/Moon/Lagna transit search with grouped windows and one-minute boundary refinement", "Taneja node house-coordinate sequence", "Reader VI ruling planets with node agents and retrograde filters", "Nakshatra placement", "Reader VI retained as the primary local KP source"],
    missing: ["transit-pattern registration for remaining event families", "remaining worked-example reproduction from Reader VI", "independent historical-astronomy certification for four named pattern conflicts", "independent certification of the 6′ KP correction"],
  },
};

export function sourcesFor(tradition: PrashnaTradition, category: QuestionCategory) {
  const categorySources = PRASHNA_CATEGORY_SOURCES[category];
  if (tradition === "integrated") return categorySources;
  return categorySources.filter((id) =>
    Object.values(PRASHNA_SOURCES).some(
      (source) => source.id === id && source.tradition === tradition,
    ),
  );
}
