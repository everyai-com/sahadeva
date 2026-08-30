// Shared data shapes for the Sahadeva mobile client. These mirror the
// worker responses (worker/index.ts) and the web client (src/ChatApp.tsx).
export type Language = "en" | "te";

export type Profile = {
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  place: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
  language: Language;
};

export type Message = { role: "user" | "assistant"; content: string };

export type Thread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};

export type Account = { id: string; name: string; email: string } | null;

export type Person = { id: string; profile: Profile | null };

export type TodayPanchanga = {
  fiveLimbs?: {
    vara: string;
    tithi: string;
    paksha: string;
    nakshatra: string;
    yoga: string;
    karana: string;
  };
  solar?: { sunrise?: string; sunset?: string };
  inauspicious?: { rahuKaal?: { startIso: string; endIso: string } | null };
};

export type ChatSummary = {
  anchors?: {
    lagna?: { signName?: string; degree: number };
    moon?: { signName?: string; degree: number; nakshatra: string; pada: number };
  };
  panchanga?: {
    vara: string;
    tithi: string;
    paksha: string;
    nakshatra: string;
    yoga: string;
    karana: string;
  };
  currentTiming?: {
    asOf: string;
    mahadasha: string | null;
    antardasha: string | null;
    pratyantardasha: string | null;
    boundaries: {
      mahadasha: { startIso: string; endIso: string } | null;
      antardasha: { startIso: string; endIso: string } | null;
      pratyantardasha: { startIso: string; endIso: string } | null;
    };
  };
  measuredStrengths?: { planet: string; ratio: number | null; avastha?: string }[];
  confidence?: { score?: number; level?: string };
};

export type Placement = {
  name: string;
  sign: number;
  signName?: string;
  degree: number;
  nakshatra: string;
  pada: number;
  retrograde?: boolean;
};

export type FullChart = {
  placements: Placement[];
  navamsa: { name: string; sign: number }[];
  panchanga: {
    vara: string;
    tithi: string;
    paksha: string;
    nakshatra: string;
    yoga: string;
    karana: string;
  };
  advanced?: {
    vimshottariTimeline?: {
      lord: string;
      startJulianDay: number;
      endJulianDay: number;
      subPeriods: { lord: string; startJulianDay: number; endJulianDay: number }[];
    }[];
    yogas?: { yoga: string; detected: boolean; evidence: string[] }[];
    dignities?: { name: string; dignity: string; combust: boolean }[];
    planetaryStates?: {
      avasthas: {
        name: string;
        requiredStrengthRatio: number | null;
        balaadiAvastha?: string;
        shadbalaTotalVirupas?: number;
        requiredVirupas?: number;
      }[];
    };
    guidance?: { confidence?: { score?: number; level?: string } };
  };
};

export type JudgmentTopic = "career" | "education" | "property" | "relationships" | "spirituality";

export type TopicJudgment = {
  topic: JudgmentTopic;
  title: string;
  conclusion: string;
  status: "supported" | "mixed" | "unsupported" | "unknown";
  supportingEvidence: { id: string; label: string; detail: string }[];
  opposingEvidence: { id: string; label: string; detail: string }[];
  vargaConfirmation: { varga: string; status: string };
  timingActivation: { status: string; notice: string };
  citations: { ruleId: string; sourceTitle: string; locator: string }[];
  unresolvedSourceKeys: string[];
  uncertainty: { level: string; warnings?: string[] };
  practicalQuestions?: string[];
  safety: { notice: string };
};

export type ChatMode = { prashna?: boolean; muhurta?: { activity?: string } };

export type ResolvedPlace = {
  place: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneOffset: number;
};
