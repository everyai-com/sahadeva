import { useEffect, useRef, useState } from "react";
import { SouthChart } from "./SouthChart";
import {
  TELUGU_GRAHAS,
  TELUGU_KARANAS,
  TELUGU_NAKSHATRAS,
  TELUGU_PAKSHAS,
  TELUGU_SIGNS,
  TELUGU_TITHIS,
  TELUGU_VARAS,
  TELUGU_YOGAS,
} from "../shared/telugu";
import { SIGNS } from "../shared/constants";
import { calculateKpPreview } from "../shared/kp";
import { calculateYoginiDasha } from "../shared/additionalDashas";
import { NorthChart } from "./NorthChart";
import "./chat.css";
import { BtrWorkspace } from "./BtrWorkspace";
import { ReadingExperience } from "./ReadingExperience";
import { requestsFullProfile } from "../shared/chatEvidenceRouting";
import { auditReadingCompleteness } from "../shared/readingParser";

type Language = "en" | "te";

type Profile = {
  name: string;
  date: string;
  time: string;
  place: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
  language: Language;
};

type Message = { role: "user" | "assistant"; content: string };

type Thread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};

type Account = { id: string; name: string; email: string } | null;

type Person = { id: string; profile: Profile | null };

type TodayPanchanga = {
  status?: string;
  fiveLimbs?: {
    vara: string;
    tithi: string;
    paksha: string;
    nakshatra: string;
    yoga: string;
    karana: string;
  };
  solar?: { sunrise: string; sunset: string };
  inauspicious?: { rahuKaal?: { startIso: string; endIso: string } | null };
};

type ChatSummary = {
  profileRef?: string;
  generatedAt?: string;
  engineVersion?: string;
  readingMode?: "complete-profile" | "focused" | "orientation";
  fullProfile?: {
    requiredSections: string[];
    coverage?: unknown;
    domainEvidence: Record<string, unknown>;
    atAGlance: { strongestPlanets: Array<{ planet: string; ratio: number | null }>; lagna: { signName?: string; degree: number }; moon: { signName?: string; degree: number; nakshatra: string; pada: number }; currentPeriod: string[]; confidence?: { score?: number; level?: string } };
    timeline: Array<{ level: string; lord: string; startIso: string; endIso: string; current: boolean }>;
    nextQuestions: string[];
  } | null;
  context?: { estimatedInputTokens: number; historyMessages: number; included: { transits: boolean; dailyPanchanga: boolean; navamsa: boolean; yogas: boolean }; qualityContract: { coreChartAlwaysIncluded: boolean; focusedJudgmentAlwaysIncluded: boolean; timingAlwaysIncluded: boolean; olderContextCompressedNotDropped: boolean; outputCapUnchanged: boolean }; notice: string };
  anchors: {
    lagna: { signName?: string; degree: number };
    moon: { signName?: string; degree: number; nakshatra: string; pada: number };
  };
  panchanga: {
    vara: string;
    tithi: string;
    paksha: string;
    nakshatra: string;
    yoga: string;
    karana: string;
  };
  currentTiming: {
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
  measuredStrengths: Array<{
    planet: string;
    ratio: number | null;
    avastha?: string;
  }>;
  confidence?: { score?: number; level?: string };
};

type FullChart = {
  placements: Array<{
    name: string;
    sign: number;
    signName?: string;
    degree: number;
    nakshatra: string;
    pada: number;
    retrograde?: boolean;
  }>;
  navamsa: Array<{ name: string; sign: number }>;
  panchanga: {
    vara: string;
    tithi: string;
    paksha: string;
    nakshatra: string;
    yoga: string;
    karana: string;
  };
  advanced: {
    vimshottariTimeline: Array<{
      lord: string;
      startJulianDay: number;
      endJulianDay: number;
      subPeriods: Array<{
        lord: string;
        startJulianDay: number;
        endJulianDay: number;
        pratyantarPeriods: Array<{
          lord: string;
          startJulianDay: number;
          endJulianDay: number;
        }>;
      }>;
    }>;
    aspects: Array<{
      from: string;
      to: string;
      kind: string;
      separation: number;
    }>;
    vargas: Record<string, Array<{ name: string; sign: number }>>;
    yogas: Array<{ yoga: string; detected: boolean; evidence: string[] }>;
    planetaryStates: {
      avasthas: Array<{
        name: string;
        requiredStrengthRatio: number | null;
        balaadiAvastha?: string;
        shadbalaTotalVirupas?: number;
        requiredVirupas?: number;
      }>;
    };
    houses: {
      equalBhava: {
        planetHouses: Array<{
          name: string;
          wholeSignHouse: number;
          equalBhavaHouse: number;
        }>;
      };
    };
    dignities: Array<{
      name: string;
      dignity: string;
      combust: boolean;
    }>;
    ashtakavarga: { sarva: { signs: number[]; total: number } };
    guidance: { confidence?: { score?: number; level?: string } };
  };
} | null;

type TopicJudgment = {
  schemaVersion: "sahadeva-judgment-1";
  topic: "career" | "education" | "property" | "relationships" | "spirituality";
  title: string;
  conclusion: string;
  status: "supported" | "mixed" | "unsupported" | "unknown";
  score: number;
  supportingEvidence: Array<{ id: string; label: string; detail: string }>;
  opposingEvidence: Array<{ id: string; label: string; detail: string }>;
  vargaConfirmation: { varga: string; status: string };
  timingActivation: { status: string; currentLords: string[]; notice: string };
  citations: Array<{
    ruleId: string;
    sourceTitle: string;
    author: string | null;
    locator: string;
  }>;
  unresolvedSourceKeys: string[];
  uncertainty: { level: string; warnings: string[] };
  practitionerAnalysis: {
    functionalLordship: { planet?: string; houses?: number[]; functionalNature?: string; yogakaraka?: boolean; reason?: string } | null;
    relevantRelationships: Array<{ from: string; to: string; kind: string; detail: string }>;
    dispositorChain: string[];
    domainVarga: { evidence?: string[] };
  };
  safety: { notice: string };
  practicalQuestions: string[];
  sensitivity?: { stable: boolean; rangeMinutes: number; statuses: string[]; vargaStatuses: string[]; unstableEvidenceIds: string[] };
};
type HouseExplorer={houses:Array<{house:number;topic:string;signName:string;lord:string;status:string;supportingEvidence:string[];opposingEvidence:string[];safety:{restricted:boolean;notice:string}}>};
type NatalPanchanga={limbs:Array<{limb:string;value:string;lord:string|null;element:string;class?:string}>;paksha:{name:string;moonPakshaBalaVirupas:number;notice:string};interpretation:{status:string;notice:string}};
type PracticeProtocol={outcome:string;eligiblePractices:Array<{id:string;label:string;instructions:string;family:string}>;traditionalRemedyStatus:string;contraindications:string[]};
type ConventionComparison={variants:Array<{id:string;name:string;validation:string;lord:string}>;judgmentChangeAnalysis:{status:string;material:boolean;notice:string;changes:Array<{id:string;lagnaChanged:boolean;lordChanged:boolean;anchorChanges:unknown[]}>};traditionBoundary:{notice:string}};

const PROFILE_KEY = "sahadeva.profile.v1";
const THREADS_KEY = "sahadeva.threads.v1";

const newThreadId = () => Math.random().toString(36).slice(2, 10);

function normalizeThreads(raw: unknown): {
  threads: Thread[];
  activeThreadId: string;
} {
  if (Array.isArray(raw)) {
    // Legacy single-conversation shape
    const id = newThreadId();
    const messages = raw as Message[];
    return {
      threads: messages.length
        ? [{ id, title: "", updatedAt: new Date().toISOString(), messages }]
        : [],
      activeThreadId: messages.length ? id : "",
    };
  }
  const value = raw as {
    threads?: Thread[];
    activeThreadId?: string;
  } | null;
  if (value && Array.isArray(value.threads)) {
    const threads = value.threads.filter((t) => t && Array.isArray(t.messages));
    return {
      threads,
      activeThreadId:
        value.activeThreadId &&
        threads.some((t) => t.id === value.activeThreadId)
          ? value.activeThreadId
          : (threads[0]?.id ?? ""),
    };
  }
  return { threads: [], activeThreadId: "" };
}

function threadTitle(thread: Thread, fallback: string) {
  if (thread.title) return thread.title;
  const firstUser = thread.messages.find((m) => m.role === "user");
  return firstUser ? firstUser.content.slice(0, 48) : fallback;
}

function saveThreadsLocal(threads: Thread[], activeThreadId: string) {
  try {
    localStorage.setItem(
      THREADS_KEY,
      JSON.stringify({ threads: threads.slice(-20), activeThreadId }),
    );
  } catch {
    /* private mode */
  }
}

function loadThreadsLocal() {
  try {
    return normalizeThreads(JSON.parse(localStorage.getItem(THREADS_KEY) || "null"));
  } catch {
    return { threads: [] as Thread[], activeThreadId: "" };
  }
}

const STRINGS = {
  en: {
    tagline: "Your Jyotish companion. Share your birth details once — then just talk.",
    name: "Name",
    namePlaceholder: "Your name",
    dob: "Date of birth",
    tob: "Time of birth",
    pob: "Place of birth",
    pobPlaceholder: "Town, district, state",
    day: "Day",
    month: "Month",
    year: "Year",
    hour: "Hour",
    minute: "Min",
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    start: "Start the conversation",
    finding: "Finding your place…",
    privacy: "Your details are used only to calculate your chart. Create an account to keep them across devices.",
    workspace: "Research workspace",
    editDetails: "Edit details",
    editBirth: "Edit birth details",
    openDetails: "Open chart details",
    closeDetails: "Close details",
    yourChart: "Your chart",
    birthDetails: "Birth details",
    anchors: "Anchors",
    lagna: "Lagna",
    moon: "Moon",
    currentDasha: "Current dasha",
    mahadasha: "Mahadasha",
    antardasha: "Antardasha",
    pratyantardasha: "Pratyantardasha",
    panchanga: "Birth panchanga",
    vara: "Vara",
    tithi: "Tithi",
    paksha: "Paksha",
    nakshatra: "Nakshatra",
    yoga: "Yoga",
    karana: "Karana",
    strength: "Planet strength",
    language: "Language",
    disclaimer:
      "Calculated evidence is deterministic and immutable; the assistant only narrates it. Astrology is a cultural practice, not scientific fact.",
    openWorkspace: "Open the full research workspace →",
    composer: "Ask about your chart…",
    send: "Send",
    thinking: "Thinking",
    retry: "Retry",
    genericError: "Something went wrong.",
    rateError: "Too many questions at once. Wait a minute and try again.",
    replyError: "The assistant could not reply.",
    placeError: "That place could not be found. Add district, state, or country.",
    suggestions: [
      "What am I naturally good at?",
      "Help me understand school and learning.",
      "Explain my current phase in simple words.",
      "What can help me make better choices?",
      "What should I be careful about?",
    ],
    fullProfileAction: "Create my complete reading",
    fullProfileIntro: "A whole-chart consultation across identity, education, work, money, relationships, home, wellbeing, meaning and your current period.",
    padaShort: "P",
    // Account
    account: "Account",
    signIn: "Sign in",
    signUp: "Create account",
    signOut: "Sign out",
    email: "Email",
    password: "Password (8+ characters)",
    noAccount: "New here? Create an account",
    haveAccount: "Already have an account? Sign in",
    signedInAs: "Signed in as",
    syncNote: "Your birth details and conversation are saved to your account.",
    authError: "Sign in failed. Check your email and password.",
    signupError: "Could not create the account. Try a different email or a longer password.",
    guestNote: "Continue without an account — details stay only on this device.",
    // Pro
    proTitle: "Professional detail",
    allPlacements: "Graha positions (D1)",
    planet: "Graha",
    signCol: "Sign",
    degreeCol: "Deg",
    nakCol: "Nakshatra",
    retro: "retro",
    dashaTimeline: "Vimshottari timeline",
    running: "running",
    yogasTitle: "Detected yogas",
    noYogas: "No classical yoga patterns were detected structurally.",
    tools: "Tools & integrations",
    mcpNote: "Every calculation here is also available to any AI assistant via the MCP endpoint:",
    copy: "Copy",
    copied: "Copied!",
    // People & extras
    people: "People",
    addPerson: "+ Add another person",
    activeTag: "active",
    compare: "Compare charts",
    comparingWith: "Comparing with",
    clearCompare: "stop",
    compareAsk: "Check our traditional marriage compatibility.",
    deletePerson: "Remove",
    today: "Today's panchanga",
    sunrise: "Sunrise",
    sunset: "Sunset",
    rahuKaal: "Rahu kaal",
    downloadPdf: "Download PDF report",
    generatingPdf: "Preparing PDF…",
    houseCol: "House",
    dignityCol: "Dignity",
    combust: "combust",
    shadbala: "Shadbala (virupas)",
    required: "required",
    sarva: "Sarvashtakavarga bindus",
    sarvaTotal: "Total",
    downloadJson: "Download full chart JSON",
    kpTitle: "KP lords",
    starLord: "Star lord",
    subLord: "Sub lord",
    aspectsTitle: "Graha drishti (aspects)",
    dailySuggestions: ["How is today for me?", "Anything to watch this week?"],
    overviewTab: "Overview",
    sookshma: "Sookshma",
    chats: "Chats",
    newChat: "+ New chat",
    deleteChat: "Delete",
    emptyChat: "New chat",
    vargaTitle: "Divisional charts (vargas)",
    dockSize: "Panel size",
    focusTools: "Tools only",
    backToChat: "← Back to chat",
    prashnaChip: "🔮 Prashna",
    prashnaBanner: "Prashna mode — ask your question now",
    prashnaOff: "cancel",
    muhurtaChip: "🕐 Good time for…",
    muhurtaTitle: "Find an auspicious time",
    muhurtaActivities: {
      marriage: "Marriage / engagement",
      travel: "Travel / journey",
      naming: "Naming / new beginning",
      contract: "Contract / signing / purchase",
    },
    muhurtaAsk: "Find auspicious times in the next 5 days for",
    shareChart: "Share chart link",
    shareCopied: "Link copied! Valid 30 days.",
    shareNeedsAccount: "Sign in to create share links.",
    reminders: "Daily morning reminder",
    remindersDesc: "A notification each morning with your panchanga, tara bala and rahu kaal.",
    remindersDenied: "Notifications are blocked in your browser settings.",
    dashaSystem: "System",
    rename: "Rename",
    renamePrompt: "Chat name:",
    gochara: "Gochara (transits now)",
    fromMoon: "From Moon",
    fromLagna: "From Lagna",
    chartStyle: "Style",
    southStyle: "South",
    northStyle: "North",
    ownsCol: "Owns",
    lordInCol: "Lord sits in",
    proModeTitle: "Jyotishya (Pro) mode",
    proModeDesc: "Adds a Pro tools tab with full tables for practitioners — shadbala, KP lords, significators, ashtakavarga and more.",
    signifTitle: "KP significators",
    signifLegend: "A = star lord's house · B = planet's house · C = star lord's owned houses · D = planet's owned houses",
    rulingTitle: "Ruling planets",
    housesTitle: "Houses (whole-sign)",
    occupants: "Occupants",
    lordCol: "Lord",
    explain: "Explain",
    explainQ: {
      dasha: "Explain my current dasha periods simply — what do they mean for daily life?",
      placements: "Walk me through my planet placements one by one, in simple words.",
      timeline: "Explain my upcoming dasha periods for the next few years, simply.",
      yogas: "Explain the yogas detected in my chart in simple language.",
      shadbala: "Explain my shadbala strengths simply — which planets are strong or weak and what that means.",
      sarva: "Explain my sarvashtakavarga scores simply — which signs are strong for me?",
      kp: "Explain my KP star lords and sub lords in simple words.",
      signif: "Explain my KP significators simply — which planets signify which houses?",
      aspects: "Explain the main aspects in my chart in simple words.",
      houses: "Explain my houses simply — which areas of life are emphasized?",
    },
    proTab: "Pro tools",
    taraShort: "Tara bala",
    chandraShort: "Chandra bala",
    favorable: "favorable",
    unfavorable: "take care",
  },
  te: {
    tagline: "మీ జ్యోతిష సహచరుడు. జన్మ వివరాలు ఒక్కసారి ఇవ్వండి — ఆపై మాట్లాడండి.",
    name: "పేరు",
    namePlaceholder: "మీ పేరు",
    dob: "జన్మ తేదీ",
    tob: "జన్మ సమయం",
    pob: "జన్మ స్థలం",
    pobPlaceholder: "ఊరు, జిల్లా, రాష్ట్రం",
    day: "రోజు",
    month: "నెల",
    year: "సంవత్సరం",
    hour: "గంట",
    minute: "నిమి",
    months: ["జనవరి","ఫిబ్రవరి","మార్చి","ఏప్రిల్","మే","జూన్","జూలై","ఆగస్టు","సెప్టెంబర్","అక్టోబర్","నవంబర్","డిసెంబర్"],
    start: "సంభాషణ ప్రారంభించండి",
    finding: "మీ ఊరు వెతుకుతున్నాం…",
    privacy: "వివరాలు జాతకం లెక్కించడానికి మాత్రమే. ఖాతా సృష్టిస్తే అన్ని పరికరాల్లో ఉంటాయి.",
    workspace: "పరిశోధన వేదిక",
    editDetails: "వివరాలు మార్చండి",
    editBirth: "జన్మ వివరాలు మార్చండి",
    openDetails: "జాతక వివరాలు చూడండి",
    closeDetails: "మూసివేయండి",
    yourChart: "మీ జాతకం",
    birthDetails: "జన్మ వివరాలు",
    anchors: "మూల స్థానాలు",
    lagna: "లగ్నం",
    moon: "చంద్రుడు",
    currentDasha: "ప్రస్తుత దశ",
    mahadasha: "మహాదశ",
    antardasha: "అంతర్దశ",
    pratyantardasha: "ప్రత్యంతర్దశ",
    panchanga: "జన్మ పంచాంగం",
    vara: "వారం",
    tithi: "తిథి",
    paksha: "పక్షం",
    nakshatra: "నక్షత్రం",
    yoga: "యోగం",
    karana: "కరణం",
    strength: "గ్రహ బలం",
    language: "భాష",
    disclaimer:
      "లెక్కించిన సాక్ష్యం నిర్ణీతమైనది, మార్చలేనిది; సహాయకుడు దాన్ని వివరించడమే చేస్తాడు. జ్యోతిషం సాంస్కృతిక సంప్రదాయం, శాస్త్రీయంగా నిరూపితమైనది కాదు.",
    openWorkspace: "పూర్తి పరిశోధన వేదిక తెరవండి →",
    composer: "మీ జాతకం గురించి అడగండి…",
    send: "పంపండి",
    thinking: "ఆలోచిస్తున్నాను",
    retry: "మళ్ళీ ప్రయత్నించండి",
    genericError: "ఏదో తప్పు జరిగింది.",
    rateError: "ఒకేసారి ఎక్కువ ప్రశ్నలు వచ్చాయి. ఒక నిమిషం ఆగి మళ్ళీ ప్రయత్నించండి.",
    replyError: "సహాయకుడు సమాధానం ఇవ్వలేకపోయాడు.",
    placeError: "ఆ ఊరు దొరకలేదు. జిల్లా, రాష్ట్రం లేదా దేశం కూడా రాయండి.",
    suggestions: [
      "నాకు సహజంగా ఏ విషయాలు బాగా వస్తాయి?",
      "చదువు గురించి సులభంగా వివరించండి.",
      "నా ప్రస్తుత కాలాన్ని సులభమైన మాటల్లో చెప్పండి.",
      "మంచి నిర్ణయాలు తీసుకోవడానికి ఏమి సహాయపడుతుంది?",
      "నేను దేని విషయంలో జాగ్రత్తగా ఉండాలి?",
    ],
    fullProfileAction: "నా పూర్తి జాతక రీడింగ్ రూపొందించండి",
    fullProfileIntro: "వ్యక్తిత్వం, చదువు, వృత్తి, ధనం, సంబంధాలు, ఇల్లు, శ్రేయస్సు, ఆధ్యాత్మికత మరియు ప్రస్తుత దశతో కూడిన పూర్తి సంప్రదింపు.",
    padaShort: "పా",
    account: "ఖాతా",
    signIn: "సైన్ ఇన్",
    signUp: "ఖాతా సృష్టించండి",
    signOut: "సైన్ అవుట్",
    email: "ఇమెయిల్",
    password: "పాస్‌వర్డ్ (8+ అక్షరాలు)",
    noAccount: "కొత్తవారా? ఖాతా సృష్టించండి",
    haveAccount: "ఖాతా ఉందా? సైన్ ఇన్ చేయండి",
    signedInAs: "సైన్ ఇన్ అయినది",
    syncNote: "మీ జన్మ వివరాలు, సంభాషణ మీ ఖాతాలో భద్రంగా ఉంటాయి.",
    authError: "సైన్ ఇన్ కాలేదు. ఇమెయిల్, పాస్‌వర్డ్ చూసుకోండి.",
    signupError: "ఖాతా సృష్టించలేకపోయాం. వేరే ఇమెయిల్ లేదా పొడవైన పాస్‌వర్డ్ ప్రయత్నించండి.",
    guestNote: "ఖాతా లేకుండా కొనసాగండి — వివరాలు ఈ పరికరంలో మాత్రమే ఉంటాయి.",
    proTitle: "వృత్తిపరమైన వివరాలు",
    allPlacements: "గ్రహ స్థానాలు (D1)",
    planet: "గ్రహం",
    signCol: "రాశి",
    degreeCol: "డిగ్రీ",
    nakCol: "నక్షత్రం",
    retro: "వక్రం",
    dashaTimeline: "వింశోత్తరి దశా క్రమం",
    running: "నడుస్తోంది",
    yogasTitle: "గుర్తించిన యోగాలు",
    noYogas: "నిర్మాణాత్మకంగా ఏ శాస్త్రీయ యోగం గుర్తించబడలేదు.",
    tools: "సాధనాలు & అనుసంధానాలు",
    mcpNote: "ఇక్కడి ప్రతి గణన MCP ఎండ్‌పాయింట్ ద్వారా ఏ AI సహాయకుడికైనా అందుబాటులో ఉంటుంది:",
    copy: "కాపీ",
    copied: "కాపీ అయింది!",
    people: "వ్యక్తులు",
    addPerson: "+ మరో వ్యక్తిని చేర్చండి",
    activeTag: "ప్రస్తుతం",
    compare: "జాతకాలు పోల్చండి",
    comparingWith: "పోలిక:",
    clearCompare: "ఆపండి",
    compareAsk: "మా సాంప్రదాయ వివాహ పొంతన చూడండి.",
    deletePerson: "తొలగించండి",
    today: "నేటి పంచాంగం",
    sunrise: "సూర్యోదయం",
    sunset: "సూర్యాస్తమయం",
    rahuKaal: "రాహుకాలం",
    downloadPdf: "PDF నివేదిక డౌన్‌లోడ్",
    generatingPdf: "PDF సిద్ధమవుతోంది…",
    houseCol: "భావం",
    dignityCol: "స్థితి",
    combust: "అస్తంగతం",
    shadbala: "షడ్బలం (విరూపాలు)",
    required: "అవసరం",
    sarva: "సర్వాష్టకవర్గ బిందువులు",
    sarvaTotal: "మొత్తం",
    downloadJson: "పూర్తి జాతక JSON డౌన్‌లోడ్",
    kpTitle: "KP అధిపతులు",
    starLord: "నక్షత్రాధిపతి",
    subLord: "ఉప అధిపతి",
    aspectsTitle: "గ్రహ దృష్టులు",
    dailySuggestions: ["ఈ రోజు నాకు ఎలా ఉంటుంది?", "ఈ వారం జాగ్రత్తలు ఏమైనా ఉన్నాయా?"],
    overviewTab: "అవలోకనం",
    sookshma: "సూక్ష్మ దశ",
    chats: "సంభాషణలు",
    newChat: "+ కొత్త సంభాషణ",
    deleteChat: "తొలగించండి",
    emptyChat: "కొత్త సంభాషణ",
    vargaTitle: "వర్గ చక్రాలు",
    dockSize: "ప్యానెల్ పరిమాణం",
    focusTools: "పరికరాలు మాత్రమే",
    backToChat: "← సంభాషణకు తిరిగి",
    prashnaChip: "🔮 ప్రశ్న",
    prashnaBanner: "ప్రశ్న మోడ్ — ఇప్పుడు మీ ప్రశ్న అడగండి",
    prashnaOff: "రద్దు",
    muhurtaChip: "🕐 మంచి సమయం…",
    muhurtaTitle: "శుభ ముహూర్తం వెతకండి",
    muhurtaActivities: {
      marriage: "వివాహం / నిశ్చితార్థం",
      travel: "ప్రయాణం",
      naming: "నామకరణం / కొత్త ఆరంభం",
      contract: "ఒప్పందం / సంతకం / కొనుగోలు",
    },
    muhurtaAsk: "వచ్చే 5 రోజుల్లో శుభ సమయాలు చెప్పండి:",
    shareChart: "జాతకం లింక్ పంచుకోండి",
    shareCopied: "లింక్ కాపీ అయింది! 30 రోజులు చెల్లుతుంది.",
    shareNeedsAccount: "లింక్ కోసం సైన్ ఇన్ చేయండి.",
    reminders: "రోజువారీ ఉదయపు రిమైండర్",
    remindersDesc: "ప్రతి ఉదయం పంచాంగం, తారా బలం, రాహుకాలంతో నోటిఫికేషన్.",
    remindersDenied: "బ్రౌజర్ సెట్టింగ్స్‌లో నోటిఫికేషన్లు నిలిపివేయబడ్డాయి.",
    dashaSystem: "పద్ధతి",
    rename: "పేరు మార్చండి",
    renamePrompt: "సంభాషణ పేరు:",
    gochara: "గోచారం (ప్రస్తుత సంచారం)",
    fromMoon: "చంద్రుడి నుండి",
    fromLagna: "లగ్నం నుండి",
    chartStyle: "శైలి",
    southStyle: "దక్షిణ",
    northStyle: "ఉత్తర",
    ownsCol: "ఆధీన భావాలు",
    lordInCol: "అధిపతి ఉన్న భావం",
    proModeTitle: "జ్యోతిష్య (ప్రో) మోడ్",
    proModeDesc: "అభ్యాసకుల కోసం పూర్తి పట్టికలతో ప్రో టూల్స్ ట్యాబ్ చేరుస్తుంది — షడ్బలం, KP అధిపతులు, కారకత్వాలు, అష్టకవర్గ మొదలైనవి.",
    signifTitle: "KP కారకత్వాలు",
    signifLegend: "A = నక్షత్రాధిపతి భావం · B = గ్రహ భావం · C = నక్షత్రాధిపతి ఆధీన భావాలు · D = గ్రహ ఆధీన భావాలు",
    rulingTitle: "పాలక గ్రహాలు",
    housesTitle: "భావాలు (సమరాశి)",
    occupants: "గ్రహాలు",
    lordCol: "అధిపతి",
    explain: "వివరించండి",
    explainQ: {
      dasha: "నా ప్రస్తుత దశలను సరళంగా వివరించండి — రోజువారీ జీవితానికి అర్థం ఏమిటి?",
      placements: "నా గ్రహ స్థానాలను ఒక్కొక్కటిగా సులభమైన మాటల్లో చెప్పండి.",
      timeline: "రాబోయే కొన్నేళ్ల నా దశలను సరళంగా వివరించండి.",
      yogas: "నా జాతకంలోని యోగాలను సులభమైన భాషలో వివరించండి.",
      shadbala: "నా షడ్బలాన్ని సరళంగా చెప్పండి — ఏ గ్రహాలు బలంగా, బలహీనంగా ఉన్నాయి?",
      sarva: "నా సర్వాష్టకవర్గ స్కోర్లను సరళంగా వివరించండి — ఏ రాశులు బలంగా ఉన్నాయి?",
      kp: "నా KP నక్షత్ర, ఉప అధిపతులను సులభమైన మాటల్లో వివరించండి.",
      signif: "నా KP కారకత్వాలను సరళంగా చెప్పండి — ఏ గ్రహం ఏ భావాలను సూచిస్తుంది?",
      aspects: "నా జాతకంలోని ముఖ్య దృష్టులను సులభంగా వివరించండి.",
      houses: "నా భావాలను సరళంగా వివరించండి — ఏ జీవిత రంగాలు ప్రధానమో చెప్పండి.",
    },
    proTab: "ప్రో పరికరాలు",
    taraShort: "తారా బలం",
    chandraShort: "చంద్ర బలం",
    favorable: "అనుకూలం",
    unfavorable: "జాగ్రత్త",
  },
} as const;

type Strings = (typeof STRINGS)[Language];

const SIGN_TE: Record<string, string> = Object.fromEntries(
  SIGNS.map((sign, index) => [sign, TELUGU_SIGNS[index]]),
);
const NAKSHATRA_NAMES = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu",
  "Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta",
  "Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha",
  "Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada",
  "Uttara Bhadrapada","Revati",
];
const NAKSHATRA_TE: Record<string, string> = Object.fromEntries(
  NAKSHATRA_NAMES.map((name, index) => [name, TELUGU_NAKSHATRAS[index]]),
);

function localize(
  value: string | null | undefined,
  language: Language,
  map: Record<string, string>,
) {
  if (!value) return value ?? "";
  return language === "te" ? map[value] || value : value;
}

const jdToDate = (jd: number) => new Date((jd - 2440587.5) * 86400000);
const VIM_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
const VIM_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
function sookshmaPeriods(praty: { lord: string; startJulianDay: number; endJulianDay: number }) {
  const span = praty.endJulianDay - praty.startJulianDay;
  const startIndex = VIM_ORDER.indexOf(praty.lord);
  if (startIndex === -1) return [];
  let cursor = praty.startJulianDay;
  return VIM_ORDER.map((_, offset) => {
    const lord = VIM_ORDER[(startIndex + offset) % 9];
    const length = (span * VIM_YEARS[lord]) / 120;
    const period = { lord, startJulianDay: cursor, endJulianDay: cursor + length };
    cursor += length;
    return period;
  });
}
const WS_LORDS = ["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
const nowJd = () => Date.now() / 86400000 + 2440587.5;

function summaryFromChart(chart: NonNullable<FullChart>): ChatSummary {
  const lagna = chart.placements.find((p) => p.name === "Lagna");
  const moon = chart.placements.find((p) => p.name === "Moon");
  const jd = nowJd();
  const timeline = chart.advanced.vimshottariTimeline;
  const maha = timeline.find((p) => jd >= p.startJulianDay && jd < p.endJulianDay);
  const antar = maha?.subPeriods.find(
    (p) => jd >= p.startJulianDay && jd < p.endJulianDay,
  );
  const bounds = (p?: { startJulianDay: number; endJulianDay: number }) =>
    p
      ? {
          startIso: jdToDate(p.startJulianDay).toISOString(),
          endIso: jdToDate(p.endJulianDay).toISOString(),
        }
      : null;
  return {
    anchors: {
      lagna: {
        signName: lagna?.signName || (lagna ? SIGNS[lagna.sign] : ""),
        degree: lagna?.degree ?? 0,
      },
      moon: {
        signName: moon?.signName || (moon ? SIGNS[moon.sign] : ""),
        degree: moon?.degree ?? 0,
        nakshatra: moon?.nakshatra || "",
        pada: moon?.pada ?? 0,
      },
    },
    panchanga: chart.panchanga,
    currentTiming: {
      asOf: new Date().toISOString(),
      mahadasha: maha?.lord ?? null,
      antardasha: antar?.lord ?? null,
      pratyantardasha: null,
      boundaries: {
        mahadasha: bounds(maha),
        antardasha: bounds(antar),
        pratyantardasha: null,
      },
    },
    measuredStrengths: chart.advanced.planetaryStates.avasthas
      .filter((item) => item.requiredStrengthRatio !== null)
      .sort(
        (a, b) =>
          Number(b.requiredStrengthRatio) - Number(a.requiredStrengthRatio),
      )
      .slice(0, 5)
      .map((item) => ({
        planet: item.name,
        ratio: item.requiredStrengthRatio,
        avastha: item.balaadiAvastha,
      })),
    confidence: chart.advanced.guidance.confidence,
  };
}

function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Profile;
    return value?.date && value?.time && Number.isFinite(value?.latitude)
      ? value
      : null;
  } catch {
    return null;
  }
}

function saveProfileLocal(profile: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* private mode */
  }
}

function renderAssistantText(text: string) {
  return text.split(/\n{2,}/).map((block, index) => {
    const lines = block.split("\n");
    const isList = lines.every((line) => /^\s*([-*•]|\d+[.)])\s+/.test(line));
    if (isList)
      return (
        <ul key={index}>
          {lines.map((line, i) => (
            <li key={i}>{inlineBold(line.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>
          ))}
        </ul>
      );
    return <p key={index}>{inlineBold(block.replace(/^#+\s*/, ""))}</p>;
  });
}

function inlineBold(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, index) =>
    index % 2 ? <strong key={index}>{part}</strong> : part,
  );
}

function formatMonth(iso: string, language: Language) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(language === "te" ? "te-IN" : undefined, {
        month: "short",
        year: "numeric",
      });
}

function formatDay(date: Date, language: Language) {
  return date.toLocaleDateString(language === "te" ? "te-IN" : undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function fetchMe(): Promise<{
  signedIn: boolean;
  user?: { id: string; name: string; email: string };
  profile?: Profile | null;
  conversation?: Message[] | null;
  people?: Person[];
  activePersonId?: string | null;
}> {
  try {
    const response = await fetch("/api/me");
    if (!response.ok) return { signedIn: false };
    return (await response.json()) as never;
  } catch {
    return { signedIn: false };
  }
}

function pushProfile(profile: Profile) {
  void fetch("/api/me/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile }),
  }).catch(() => {});
}

async function enableDailyReminder(hour: number, tzOffset: number) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    throw new Error("unsupported");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const { publicKey } = (await (await fetch("/api/push/key")).json()) as {
    publicKey?: string;
  };
  if (!publicKey) throw new Error("no-key");
  const padded = publicKey.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const applicationServerKey = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscription, hour, tzOffset }),
  });
  if (!response.ok) throw new Error("save-failed");
}

async function disableDailyReminder() {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: subscription?.endpoint }),
    });
    await subscription?.unsubscribe();
  } catch {
    /* best effort */
  }
}

function pushThreads(threads: Thread[], activeThreadId: string) {
  void fetch("/api/me/conversation", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threads: threads.slice(-20), activeThreadId }),
  }).catch(() => {});
}

/* ── Date / time pickers ─────────────────────────────── */

function DateField({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (next: string) => void;
  t: Strings;
}) {
  const [y, m, d] = value ? value.split("-").map(Number) : [0, 0, 0];
  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = thisYear; year >= 1900; year--) years.push(year);
  const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 31;
  const set = (part: "y" | "m" | "d", raw: string) => {
    const numeric = Number(raw);
    const ny = part === "y" ? numeric : y || thisYear - 25;
    const nm = part === "m" ? numeric : m || 1;
    let nd = part === "d" ? numeric : d || 1;
    nd = Math.min(nd, new Date(ny, nm, 0).getDate());
    onChange(
      `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`,
    );
  };
  return (
    <div className="picker-row" role="group" aria-label={t.dob}>
      <label className="picker">
        <span>{t.day}</span>
        <select value={d || ""} onChange={(e) => set("d", e.target.value)} required>
          <option value="" disabled hidden />
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
      </label>
      <label className="picker picker-wide">
        <span>{t.month}</span>
        <select value={m || ""} onChange={(e) => set("m", e.target.value)} required>
          <option value="" disabled hidden />
          {t.months.map((label, index) => (
            <option key={label} value={index + 1}>{label}</option>
          ))}
        </select>
      </label>
      <label className="picker">
        <span>{t.year}</span>
        <select value={y || ""} onChange={(e) => set("y", e.target.value)} required>
          <option value="" disabled hidden />
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TimeField({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (next: string) => void;
  t: Strings;
}) {
  const [h, min] = value ? value.split(":").map(Number) : [NaN, NaN];
  const hour12 = Number.isNaN(h) ? "" : ((h % 12) || 12);
  const period = Number.isNaN(h) ? "" : h < 12 ? "AM" : "PM";
  const set = (part: "h" | "m" | "p", raw: string) => {
    const currentH = Number.isNaN(h) ? 6 : h;
    let nh = currentH;
    if (part === "h") {
      const base = Number(raw) % 12;
      nh = (period || "AM") === "PM" ? base + 12 : base;
    }
    if (part === "p") {
      const base = currentH % 12;
      nh = raw === "PM" ? base + 12 : base;
    }
    const nm = part === "m" ? Number(raw) : Number.isNaN(min) ? 0 : min;
    onChange(`${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);
  };
  return (
    <div className="picker-row" role="group" aria-label={t.tob}>
      <label className="picker">
        <span>{t.hour}</span>
        <select value={hour12} onChange={(e) => set("h", e.target.value)} required>
          <option value="" disabled hidden />
          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>
      </label>
      <label className="picker">
        <span>{t.minute}</span>
        <select value={Number.isNaN(min) ? "" : min} onChange={(e) => set("m", e.target.value)} required>
          <option value="" disabled hidden />
          {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
            <option key={minute} value={minute}>{String(minute).padStart(2, "0")}</option>
          ))}
        </select>
      </label>
      <label className="picker">
        <span>AM/PM</span>
        <select value={period} onChange={(e) => set("p", e.target.value)} required>
          <option value="" disabled hidden />
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </label>
    </div>
  );
}

function ConsultationProgress({language}:{language:Language}){
  const [stage,setStage]=useState(0);
  const stages=language==="te"?["జన్మ జాతకాన్ని లెక్కిస్తోంది","జీవిత విభాగాలను పరిశీలిస్తోంది","దశలు మరియు విరుద్ధ ఆధారాలను కలుపుతోంది","మీ పూర్తి రీడింగ్‌ను రచిస్తోంది"]:["Calculating the natal chart","Reviewing every life domain","Connecting timing and contrary evidence","Writing your complete consultation"];
  useEffect(()=>{const timer=window.setInterval(()=>setStage(value=>Math.min(value+1,stages.length-1)),4200);return()=>window.clearInterval(timer)},[stages.length]);
  return <section className="consultation-progress" aria-live="polite"><header><span>{language==="te"?"పూర్తి సంప్రదింపు":"Complete consultation"}</span><strong>{stages[stage]}</strong></header><ol>{stages.map((label,index)=><li key={label} className={index<stage?"done":index===stage?"active":""}><i>{index<stage?"✓":index+1}</i>{label}</li>)}</ol><div className="consultation-skeleton"><i/><i/><i/></div></section>;
}

/* ── Main app ────────────────────────────────────────── */

export default function ChatApp() {
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [account, setAccount] = useState<Account>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [prashnaMode, setPrashnaMode] = useState(false);
  const [specialToolsOpen,setSpecialToolsOpen]=useState(false);
  const [muhurtaOpen, setMuhurtaOpen] = useState(false);
  const modeRef = useRef<
    { prashna?: boolean; muhurta?: { activity?: string }; fullProfile?: boolean } | undefined
  >(undefined);
  const [today, setToday] = useState<TodayPanchanga | null>(null);
  const [transit, setTransit] = useState<FullChart>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [threads, setThreads] = useState<Thread[]>(
    () => loadThreadsLocal().threads,
  );
  const [activeThreadId, setActiveThreadId] = useState<string>(
    () => loadThreadsLocal().activeThreadId,
  );
  const activeThreadIdRef = useRef(activeThreadId);
  activeThreadIdRef.current = activeThreadId;
  const accountRef = useRef<Account>(null);
  const messages =
    threads.find((thread) => thread.id === activeThreadId)?.messages ?? [];
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [chart, setChart] = useState<FullChart>(null);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [dockSize, setDockSize] = useState<"normal" | "wide" | "full">(() => {
    try {
      const stored = localStorage.getItem("sahadeva.dock");
      return stored === "wide" || stored === "full" ? stored : "normal";
    } catch {
      return "normal";
    }
  });
  function cycleDock() {
    const next =
      dockSize === "normal" ? "wide" : dockSize === "wide" ? "full" : "normal";
    setDockSize(next);
    try {
      localStorage.setItem("sahadeva.dock", next);
    } catch {
      /* private mode */
    }
  }
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [btrOpen, setBtrOpen] = useState(false);
  const [wide, setWide] = useState(
    () => window.matchMedia("(min-width: 1100px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1100px)");
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const endRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  accountRef.current = account;
  const language: Language = profile?.language === "te" ? "te" : "en";
  const t = STRINGS[language];

  function commitMessages(nextMessages: Message[]) {
    setThreads((prev) => {
      const id = activeThreadIdRef.current || newThreadId();
      const exists = prev.some((thread) => thread.id === id);
      const stamped = new Date().toISOString();
      const next = exists
        ? prev.map((thread) =>
            thread.id === id
              ? { ...thread, messages: nextMessages, updatedAt: stamped }
              : thread,
          )
        : [
            ...prev,
            { id, title: "", updatedAt: stamped, messages: nextMessages },
          ];
      if (!exists) setActiveThreadId(id);
      activeThreadIdRef.current = id;
      if (accountRef.current) pushThreads(next, id);
      saveThreadsLocal(next, id);
      return next;
    });
  }

  function askMuhurta(activity: string, label: string) {
    setMuhurtaOpen(false);
    if (!profile || busy) return;
    modeRef.current = { muhurta: { activity } };
    void (async () => {
      const question = `${t.muhurtaAsk} ${label}`;
      const next: Message[] = [...messages, { role: "user", content: question }];
      commitMessages(next);
      setBusy(true);
      setError("");
      try {
        const reply = await callChat(profile, next, setDraft);
        modeRef.current = undefined;
        commitMessages([...next, { role: "assistant", content: reply }]);
      } catch (err) {
        modeRef.current = undefined;
        setError(err instanceof Error ? err.message : t.genericError);
      } finally {
        setDraft(null);
        setBusy(false);
      }
    })();
  }

  function newChat() {
    const id = newThreadId();
    setThreads((prev) => [
      ...prev,
      { id, title: "", updatedAt: new Date().toISOString(), messages: [] },
    ]);
    setActiveThreadId(id);
    activeThreadIdRef.current = id;
    setError("");
    if (profile) void startSession(profile);
  }

  function switchThread(id: string) {
    setActiveThreadId(id);
    activeThreadIdRef.current = id;
    setError("");
  }

  function deleteThread(id: string) {
    setThreads((prev) => {
      const next = prev.filter((thread) => thread.id !== id);
      const nextActive =
        activeThreadIdRef.current === id
          ? (next[next.length - 1]?.id ?? "")
          : activeThreadIdRef.current;
      setActiveThreadId(nextActive);
      activeThreadIdRef.current = nextActive;
      if (accountRef.current) pushThreads(next, nextActive);
      saveThreadsLocal(next, nextActive);
      return next;
    });
  }

  useEffect(() => {
    const latest = messages[messages.length - 1];
    if (latest?.role === "assistant" && latest.content.length > 1200) {
      const readings = document.querySelectorAll<HTMLElement>(".reading-experience");
      readings.item(readings.length - 1)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, busy, draft]);

  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Restore account/profile/conversation from the server once.
  useEffect(() => {
    void (async () => {
      const me = await fetchMe();
      if (me.signedIn && me.user) {
        setAccount(me.user);
        setPeople(me.people ?? []);
        if (me.profile?.date) {
          saveProfileLocal(me.profile);
          setProfile(me.profile);
          const restored = normalizeThreads(me.conversation);
          if (restored.threads.length) {
            startedRef.current = true;
            setThreads(restored.threads);
            setActiveThreadId(restored.activeThreadId);
            activeThreadIdRef.current = restored.activeThreadId;
            void loadChart(me.profile);
          }
        }
      }
      setMeLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!meLoaded || !profile || startedRef.current) return;
    startedRef.current = true;
    void startSession(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meLoaded, profile]);

  async function loadChart(activeProfile: Profile) {
    void fetch(
      `/api/panchanga/today?lat=${activeProfile.latitude}&lon=${activeProfile.longitude}&tzOffset=${activeProfile.timezoneOffset}${activeProfile.timezone ? `&tz=${encodeURIComponent(activeProfile.timezone)}` : ""}&lang=${activeProfile.language}`,
    )
      .then(async (r) => (r.ok ? ((await r.json()) as TodayPanchanga) : null))
      .then((data) => setToday(data))
      .catch(() => {});
    const now = new Date(Date.now() + activeProfile.timezoneOffset * 3600000);
    void fetch("/api/chart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...activeProfile,
        name: "Transit",
        date: now.toISOString().slice(0, 10),
        time: now.toISOString().slice(11, 16),
      }),
    })
      .then(async (r) => (r.ok ? ((await r.json()) as FullChart) : null))
      .then((data) => setTransit(data))
      .catch(() => {});
    try {
      const response = await fetch("/api/chart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(activeProfile),
      });
      if (!response.ok) return;
      const full = (await response.json()) as NonNullable<FullChart>;
      setChart(full);
      setSummary(summaryFromChart(full));
    } catch {
      /* sheet simply shows less */
    }
  }

  async function callChat(
    activeProfile: Profile,
    history: Message[],
    onDelta?: (text: string) => void,
    attempt = 0,
  ): Promise<string> {
    const strings = STRINGS[activeProfile.language];
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profile: activeProfile,
        partner: partner ?? undefined,
        mode: modeRef.current,
        messages: history,
      }),
    });
    if (response.status === 503 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      return callChat(activeProfile, history, onDelta, attempt + 1);
    }
    if (!response.ok)
      throw new Error(
        response.status === 429 ? strings.rateError : strings.replyError,
      );
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as {
        response?: string;
        summary?: ChatSummary;
      };
      if (data.summary) setSummary(data.summary);
      if (data.response) onDelta?.(data.response);
      return data.response || "";
    }
    if (!response.body) throw new Error(strings.replyError);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let headParsed = false;
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (!headParsed) {
        const split = buffer.indexOf("");
        if (split === -1) continue;
        try {
          const parsed = JSON.parse(buffer.slice(0, split)) as {
            summary?: ChatSummary;
          };
          if (parsed.summary) setSummary(parsed.summary);
        } catch {
          /* head was not JSON; ignore */
        }
        buffer = buffer.slice(split + 1);
        headParsed = true;
      }
      if (headParsed && buffer) {
        text += buffer;
        buffer = "";
        onDelta?.(text);
      }
    }
    if (!text.trim()) throw new Error(strings.replyError);
    return text;
  }

  async function startSession(activeProfile: Profile) {
    setBusy(true);
    setError("");
    try {
      const [reply] = await Promise.all([
        callChat(activeProfile, [], setDraft),
        loadChart(activeProfile),
      ]);
      commitMessages([{ role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setDraft(null);
      setBusy(false);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !profile || busy) return;
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    commitMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    if (prashnaMode) {
      modeRef.current = { prashna: true };
      setPrashnaMode(false);
    }
    try {
      const fullProfileRun=modeRef.current?.fullProfile===true||requestsFullProfile(trimmed);
      let reply = await callChat(profile, next, setDraft);
      const audit=fullProfileRun?auditReadingCompleteness(reply):null;
      if(fullProfileRun&&audit&&!audit.complete){
        const repairPrompt=language==="te"?`మునుపటి ముసాయిదా అసంపూర్ణంగా ఉంది. మిస్సైన అంశాలు: ${audit.missing.join(", ")}. మొత్తం రీడింగ్‌ను అన్ని విభాగాలతో ఒకే పూర్తి సమాధానంగా మళ్లీ రాయండి.`:`The previous draft was incomplete. Missing themes: ${audit.missing.join(", ")}. Rewrite it as one complete reading with every required section, including contrary evidence, uncertainty, and a final synthesis.`;
        modeRef.current={fullProfile:true};
        setDraft(null);
        reply=await callChat(profile,[...next,{role:"assistant",content:reply},{role:"user",content:repairPrompt}],setDraft);
      }
      if (fullProfileRun) void fetch("/api/readings/telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"full_profile_completed",language:profile.language,characters:reply.length})}).catch(()=>{});
      modeRef.current = undefined;
      commitMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      modeRef.current = undefined;
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setDraft(null);
      setBusy(false);
    }
  }

  async function readingFeedback(message:Message,section:string,rating:string){await fetch("/api/readings/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reading:message.content,section,rating,language})}).catch(()=>{});}
  function createFullProfile(){modeRef.current={fullProfile:true};void send(language==="te"?"నా పూర్తి జాతక ప్రొఫైల్ ఇవ్వండి. అన్ని జీవిత విభాగాలు, బలాలు, విరుద్ధ ఆధారాలు, ప్రస్తుత దశ మరియు పరిమితులను వివరించండి.":"Create my complete astrological profile. Cover every life domain, strengths, contrary evidence, current timing, and important limitations.");}
  async function downloadReading(message:Message){let blob:Blob,file=`sahadeva-${profile?.name||"reading"}.md`;if(chart){const{buildChartPdf}=await import("./pdfReport");blob=await buildChartPdf(chart as never,{readingText:message.content});file=`sahadeva-${profile?.name||"reading"}-consultation.pdf`;}else blob=new Blob([message.content],{type:"text/markdown;charset=utf-8"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=file;a.click();URL.revokeObjectURL(url);void fetch("/api/readings/telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"reading_downloaded",language,characters:message.content.length})});}
  async function shareReading(message:Message){const data={title:`Sahadeva · ${profile?.name||"Reading"}`,text:message.content};if(navigator.share)await navigator.share(data).catch(()=>{});else await navigator.clipboard.writeText(message.content).catch(()=>{});void fetch("/api/readings/telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"reading_shared",language,characters:message.content.length})});}
  function followUpReading(section?:string){setInput(language==="te"?`ఈ రీడింగ్‌లో “${section||"ఈ విషయం"}” గురించి మరింత వివరంగా చెప్పండి: `:`Explain “${section||"this part"}” of the reading in more detail: `);inputRef.current?.focus();void fetch("/api/readings/telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"follow_up_started",language,section})});}

  function switchLanguage(next: Language) {
    if (!profile || next === profile.language) return;
    const updated = { ...profile, language: next };
    saveProfileLocal(updated);
    setProfile(updated);
    if (account) pushProfile(updated);
  }

  function resetProfile() {
    localStorage.removeItem(PROFILE_KEY);
    startedRef.current = false;
    setProfile(null);
    setThreads([]);
    setActiveThreadId("");
    activeThreadIdRef.current = "";
    saveThreadsLocal([], "");
    setSummary(null);
    setChart(null);
    setDetailsOpen(false);
    setError("");
  }

  function adoptProfile(next: Profile) {
    saveProfileLocal(next);
    setProfile(next);
    if (account)
      void fetch("/api/me/people", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: next }),
      })
        .then(() => fetchMe())
        .then((me) => setPeople(me.people ?? []))
        .catch(() => {});
  }

  async function switchPerson(person: Person) {
    if (!person.profile) return;
    const response = await fetch(`/api/me/people/${person.id}/activate`, {
      method: "POST",
    });
    if (!response.ok) return;
    const data = (await response.json()) as {
      profile?: Profile;
      conversation?: Message[] | null;
    };
    const nextProfile = data.profile || person.profile;
    saveProfileLocal(nextProfile);
    setPartner(null);
    setSummary(null);
    setChart(null);
    setError("");
    setAccountOpen(false);
    setDetailsOpen(false);
    const restored = normalizeThreads(data.conversation);
    if (restored.threads.length) {
      startedRef.current = true;
      setProfile(nextProfile);
      setThreads(restored.threads);
      setActiveThreadId(restored.activeThreadId);
      activeThreadIdRef.current = restored.activeThreadId;
      saveThreadsLocal(restored.threads, restored.activeThreadId);
      void loadChart(nextProfile);
    } else {
      startedRef.current = false;
      setThreads([]);
      setActiveThreadId("");
      activeThreadIdRef.current = "";
      saveThreadsLocal([], "");
      setProfile(nextProfile);
    }
  }

  async function removePerson(person: Person) {
    await fetch(`/api/me/people/${person.id}`, { method: "DELETE" }).catch(
      () => {},
    );
    const me = await fetchMe();
    setPeople(me.people ?? []);
  }

  function compareWith(person: Person) {
    if (!person.profile || !profile) return;
    setPartner(person.profile);
    setAccountOpen(false);
    void sendWithPartner(person.profile);
  }

  async function sendWithPartner(partnerProfile: Profile) {
    if (!profile || busy) return;
    const question = `${t.compareAsk} (${profile.name} + ${partnerProfile.name})`;
    const next: Message[] = [...messages, { role: "user", content: question }];
    commitMessages(next);
    setBusy(true);
    setError("");
    try {
      const strings = STRINGS[profile.language];
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile,
          partner: partnerProfile,
          messages: next,
        }),
      });
      if (!response.ok) throw new Error(strings.replyError);
      let reply = "";
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = (await response.json()) as { response?: string };
        reply = data.response || "";
        setDraft(reply);
      } else if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let headParsed = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          if (!headParsed) {
            const split = buffer.indexOf(String.fromCharCode(30));
            if (split === -1) continue;
            buffer = buffer.slice(split + 1);
            headParsed = true;
          }
          if (headParsed && buffer) {
            reply += buffer;
            buffer = "";
            setDraft(reply);
          }
        }
      }
      if (!reply.trim()) throw new Error(strings.replyError);
      commitMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setDraft(null);
      setBusy(false);
    }
  }

  async function handleSignedIn(user: NonNullable<Account>) {
    setAccount(user);
    const me = await fetchMe();
    setPeople(me.people ?? []);
    if (me.profile?.date) {
      saveProfileLocal(me.profile);
      const restored = normalizeThreads(me.conversation);
      startedRef.current = restored.threads.length > 0;
      setProfile(me.profile);
      setThreads(restored.threads);
      setActiveThreadId(restored.activeThreadId);
      activeThreadIdRef.current = restored.activeThreadId;
      void loadChart(me.profile);
    } else if (profile) {
      pushProfile(profile);
      if (threads.length) pushThreads(threads, activeThreadId);
    }
    setAccountOpen(false);
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
    setAccount(null);
    setPeople([]);
    setPartner(null);
    setAccountOpen(false);
  }

  const uiLanguage: Language = profile ? language : "en";
  const hasLongReading = messages.some((message) => message.role === "assistant" && message.content.length > 1200);

  if (!profile)
    return (
      <>
        <Onboarding
          onReady={adoptProfile}
          onOpenAccount={() => setAccountOpen(true)}
          account={account}
        />
        {accountOpen && (
          <AccountSheet
            t={STRINGS[uiLanguage]}
            account={account}
            onClose={() => setAccountOpen(false)}
            onSignedIn={handleSignedIn}
            onSignOut={signOut}
          />
        )}
      </>
    );

  return (
    <div className={`chat-shell dock-${wide && !hasLongReading ? dockSize : "normal"}${detailsOpen ? " chart-open" : ""}`}>
      <header className="chat-header">
        <button
          className="chat-header-btn"
          onClick={() => setAccountOpen(true)}
          aria-label={t.account}
          title={t.account}
        >
          {account ? account.name.slice(0, 1).toUpperCase() : "✳"}
        </button>
        <button
          className="chat-header-title"
          onClick={() => setThreadsOpen(true)}
          aria-label={t.chats}
        >
          <strong>Sahadeva</strong>
          <span>
            {profile.name} · {threads.length > 1 ? `${threads.length} ${t.chats.toLowerCase()}` : profile.date} ▾
          </span>
        </button>
        <button
          className="chat-header-btn"
          onClick={newChat}
          aria-label={t.newChat}
          title={t.newChat}
        >
          ✎
        </button>
        <button
          className="chat-header-btn"
          onClick={() => setDetailsOpen(true)}
          aria-label={t.openDetails}
        >
          ☰
        </button>
      </header>

      <main className="chat-scroll">
        <div className="chat-messages">
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div key={index} className="bubble-user">
                {message.content}
              </div>
            ) : message.content.length > 1200 ? (
              <ReadingExperience key={index} text={message.content} name={profile.name} language={language} summary={summary} onAsk={followUpReading} onFeedback={(section,rating)=>void readingFeedback(message,section,rating)} onRegenerate={()=>{void fetch("/api/readings/telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"regenerated",language})});void send(language==="te"?"ఈ పూర్తి జాతక ప్రొఫైల్‌ను మళ్లీ రూపొందించండి. ప్రతి విభాగాన్ని పూర్తి చేసి, స్పష్టమైన సహజ తెలుగులో రాయండి.":"Regenerate this complete profile. Finish every section with clearer, more natural language.")}} onDownload={()=>downloadReading(message)} onShare={()=>void shareReading(message)} onOpenChart={()=>setDetailsOpen(true)}/>
            ) : (
              <div key={index} className="bubble-assistant">{renderAssistantText(message.content)}</div>
            ),
          )}
          {draft && (
            <div className="bubble-assistant">{renderAssistantText(draft)}</div>
          )}
          {busy && !draft && (
            modeRef.current?.fullProfile?<ConsultationProgress language={language}/>:<div className="bubble-assistant typing" aria-label={t.thinking}><span /><em>{t.thinking} · checking the evidence ledger</em></div>
          )}
          {error && (
            <div className="chat-error" role="alert">
              {error}
              {messages.length === 0 && (
                <button onClick={() => profile && startSession(profile)}>
                  {t.retry}
                </button>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>

      {!busy && !partner && (
        <div className={`chip-row${messages.length <= 1 ? " consultation-start" : ""}`} role="list">
          {messages.length <= 1 && <div className="full-profile-invite">
            <div><span>{language === "te" ? "ప్రారంభించడానికి ఉత్తమ మార్గం" : "Best place to begin"}</span><strong>{t.fullProfileAction}</strong><p>{t.fullProfileIntro}</p></div>
            <button onClick={createFullProfile}>{t.fullProfileAction}<b aria-hidden="true">→</b></button>
          </div>}
          <button className="chip chip-more" onClick={()=>setSpecialToolsOpen(value=>!value)} aria-expanded={specialToolsOpen}>{specialToolsOpen?"Fewer choices":"More choices"}</button>
          {specialToolsOpen&&<><button
            className={prashnaMode ? "chip on" : "chip"}
            onClick={() => setPrashnaMode(!prashnaMode)}
          >
            {t.prashnaChip}
          </button>
          <button className="chip" onClick={() => setMuhurtaOpen(true)}>
            {t.muhurtaChip}
          </button></>}
          <button className="chip" onClick={() => setBtrOpen(true)}>BTR</button>
          {[
            ...t.dailySuggestions,
            ...(messages.length <= 1 ? t.suggestions : []),
          ].map((suggestion) => (
            <button
              key={suggestion}
              className="chip"
              onClick={() => send(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {prashnaMode && (
        <div className="compare-banner">
          🔮 {t.prashnaBanner}
          <button onClick={() => setPrashnaMode(false)}>{t.prashnaOff} ✕</button>
        </div>
      )}
      {partner && (
        <div className="compare-banner">
          ⚭ {t.comparingWith} <strong>{partner.name}</strong>
          <button onClick={() => setPartner(null)}>{t.clearCompare} ✕</button>
        </div>
      )}

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t.composer}
          aria-label={t.send}
          enterKeyHint="send"
          autoFocus={wide}
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label={t.send}>
          ↑
        </button>
      </form>
      {btrOpen&&<BtrWorkspace profile={profile} language={language} onClose={()=>setBtrOpen(false)}/>}

      {muhurtaOpen && (
        <div className="sheet-backdrop" onClick={() => setMuhurtaOpen(false)}>
          <aside
            className="sheet sheet-compact"
            role="dialog"
            aria-label={t.muhurtaTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-head">
              <h2>{t.muhurtaTitle}</h2>
              <button onClick={() => setMuhurtaOpen(false)} aria-label={t.closeDetails}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="people-list">
                {Object.entries(t.muhurtaActivities).map(([key, label]) => (
                  <div key={key} className="person">
                    <button
                      className="person-main"
                      onClick={() => askMuhurta(key, label)}
                    >
                      <strong>{label}</strong>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {threadsOpen && (
        <div className="sheet-backdrop" onClick={() => setThreadsOpen(false)}>
          <aside
            className="sheet sheet-compact"
            role="dialog"
            aria-label={t.chats}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-head">
              <h2>{t.chats}</h2>
              <button onClick={() => setThreadsOpen(false)} aria-label={t.closeDetails}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="people-list">
                {[...threads]
                  .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
                  .map((thread) => (
                    <div
                      key={thread.id}
                      className={
                        thread.id === activeThreadId ? "person active" : "person"
                      }
                    >
                      <button
                        className="person-main"
                        onClick={() => {
                          switchThread(thread.id);
                          setThreadsOpen(false);
                        }}
                      >
                        <strong>{threadTitle(thread, t.emptyChat)}</strong>
                        <em>
                          {thread.messages.length} ·{" "}
                          {formatDay(new Date(thread.updatedAt), language)}
                        </em>
                      </button>
                      <button
                        className="person-remove"
                        aria-label={t.rename}
                        onClick={() => {
                          const name = window.prompt(
                            t.renamePrompt,
                            threadTitle(thread, t.emptyChat),
                          );
                          if (name === null) return;
                          setThreads((prev) => {
                            const next = prev.map((item) =>
                              item.id === thread.id
                                ? { ...item, title: name.slice(0, 80) }
                                : item,
                            );
                            if (accountRef.current)
                              pushThreads(next, activeThreadIdRef.current);
                            saveThreadsLocal(next, activeThreadIdRef.current);
                            return next;
                          });
                        }}
                      >
                        ✎
                      </button>
                      {thread.id !== activeThreadId && (
                        <button
                          className="person-remove"
                          aria-label={t.deleteChat}
                          onClick={() => deleteThread(thread.id)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
              </div>
              <button
                className="link-btn"
                onClick={() => {
                  setThreadsOpen(false);
                  newChat();
                }}
              >
                {t.newChat}
              </button>
            </div>
          </aside>
        </div>
      )}

      {(detailsOpen || (wide && !hasLongReading)) && (
        <DetailsSheet
          docked={wide}
          dockSize={dockSize}
          onCycleDock={wide ? cycleDock : undefined}
          profile={profile}
          summary={summary}
          chart={chart}
          transit={transit}
          today={today}
          t={t}
          language={language}
          onClose={() => setDetailsOpen(false)}
          onEdit={resetProfile}
          onLanguage={switchLanguage}
          onAsk={(question) => {
            if (!wide) setDetailsOpen(false);
            void send(question);
          }}
        />
      )}
      {accountOpen && (
        <AccountSheet
          t={t}
          account={account}
          people={people}
          activeProfile={profile}
          onClose={() => setAccountOpen(false)}
          onSignedIn={handleSignedIn}
          onSignOut={signOut}
          onEditBirth={resetProfile}
          onSwitchPerson={switchPerson}
          onRemovePerson={removePerson}
          onCompare={compareWith}
          onAddPerson={() => {
            setAccountOpen(false);
            resetProfile();
          }}
        />
      )}
    </div>
  );
}

/* ── Account sheet ───────────────────────────────────── */

function AccountSheet({
  t,
  account,
  people = [],
  activeProfile = null,
  onClose,
  onSignedIn,
  onSignOut,
  onEditBirth,
  onSwitchPerson,
  onRemovePerson,
  onCompare,
  onAddPerson,
}: {
  t: Strings;
  account: Account;
  people?: Person[];
  activeProfile?: Profile | null;
  onClose: () => void;
  onSignedIn: (user: NonNullable<Account>) => void;
  onSignOut: () => void;
  onEditBirth?: () => void;
  onSwitchPerson?: (person: Person) => void;
  onRemovePerson?: (person: Person) => void;
  onCompare?: (person: Person) => void;
  onAddPerson?: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderError, setReminderError] = useState("");
  useEffect(() => {
    if (!account || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setReminderOn(Boolean(subscription)))
      .catch(() => {});
  }, [account]);
  async function toggleReminder(next: boolean) {
    setReminderError("");
    if (next) {
      try {
        await enableDailyReminder(7, activeProfile?.timezoneOffset ?? 5.5);
        setReminderOn(true);
      } catch (err) {
        setReminderError(
          err instanceof Error && err.message === "denied"
            ? t.remindersDenied
            : t.genericError,
        );
        setReminderOn(false);
      }
    } else {
      await disableDailyReminder();
      setReminderOn(false);
    }
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path =
        mode === "signup" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email";
      const body =
        mode === "signup"
          ? { email, password, name: name.trim() || email.split("@")[0] }
          : { email, password };
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        throw new Error(mode === "signup" ? t.signupError : t.authError);
      const data = (await response.json()) as {
        user?: { id: string; name: string; email: string };
      };
      if (!data.user) throw new Error(t.authError);
      onSignedIn({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside
        className="sheet sheet-compact"
        role="dialog"
        aria-label={t.account}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>{t.account}</h2>
          <button onClick={onClose} aria-label={t.closeDetails}>✕</button>
        </div>
        <div className="sheet-body">
          {account ? (
            <>
              <section>
                <p className="muted">
                  {t.signedInAs} <strong>{account.email}</strong>
                </p>
                <p className="muted small">{t.syncNote}</p>
              </section>
              {people.length > 0 && (
                <section>
                  <h3>{t.people}</h3>
                  <div className="people-list">
                    {people.map((person) => {
                      const isActive =
                        !!activeProfile &&
                        person.profile?.name === activeProfile.name &&
                        person.profile?.date === activeProfile.date &&
                        person.profile?.time === activeProfile.time;
                      return (
                        <div
                          key={person.id}
                          className={isActive ? "person active" : "person"}
                        >
                          <button
                            className="person-main"
                            onClick={() => !isActive && onSwitchPerson?.(person)}
                          >
                            <strong>{person.profile?.name || "—"}</strong>
                            <em>
                              {person.profile?.date}
                              {isActive && ` · ${t.activeTag}`}
                            </em>
                          </button>
                          {!isActive && activeProfile && onCompare && (
                            <button
                              className="chip"
                              onClick={() => onCompare(person)}
                            >
                              ⚭ {t.compare}
                            </button>
                          )}
                          {!isActive && onRemovePerson && (
                            <button
                              className="person-remove"
                              aria-label={t.deletePerson}
                              onClick={() => onRemovePerson(person)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {onAddPerson && (
                    <button className="link-btn" onClick={onAddPerson}>
                      {t.addPerson}
                    </button>
                  )}
                </section>
              )}
              <section>
                <label className="pro-toggle">
                  <span>
                    <strong>🔔 {t.reminders}</strong>
                    <em>{reminderError || t.remindersDesc}</em>
                  </span>
                  <input
                    type="checkbox"
                    checked={reminderOn}
                    onChange={(event) => void toggleReminder(event.target.checked)}
                  />
                  <i aria-hidden="true" />
                </label>
              </section>
              <section className="account-actions">
                {onEditBirth && (
                  <button className="link-btn" onClick={onEditBirth}>
                    {t.editBirth}
                  </button>
                )}
                <button className="cta secondary" onClick={onSignOut}>
                  {t.signOut}
                </button>
              </section>
            </>
          ) : (
            <form className="account-form" onSubmit={submit}>
              {mode === "signup" && (
                <label>
                  {t.name}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    maxLength={80}
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                {t.email}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                />
              </label>
              <label>
                {t.password}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </label>
              {error && <div className="chat-error" role="alert">{error}</div>}
              <button className="cta" type="submit" disabled={busy}>
                {mode === "signup" ? t.signUp : t.signIn}
              </button>
              <button
                type="button"
                className="link-btn center"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup" ? t.haveAccount : t.noAccount}
              </button>
              <p className="muted small">{t.syncNote}</p>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ── Details sheet ───────────────────────────────────── */

function DetailsSheet({
  profile,
  summary,
  chart,
  transit = null,
  today,
  t,
  language,
  docked = false,
  dockSize = "normal",
  onCycleDock,
  onClose,
  onEdit,
  onLanguage,
  onAsk,
}: {
  profile: Profile;
  summary: ChatSummary | null;
  chart: FullChart;
  transit?: FullChart;
  today: TodayPanchanga | null;
  t: Strings;
  language: Language;
  docked?: boolean;
  dockSize?: "normal" | "wide" | "full";
  onCycleDock?: () => void;
  onClose: () => void;
  onEdit: () => void;
  onLanguage: (next: Language) => void;
  onAsk?: (question: string) => void;
}) {

  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [judgmentTopic, setJudgmentTopic] = useState<TopicJudgment["topic"]>("career");
  const [judgment, setJudgment] = useState<TopicJudgment | null>(null);
  const [judgmentBusy, setJudgmentBusy] = useState(false);
  const [houseExplorer,setHouseExplorer]=useState<HouseExplorer|null>(null);
  const [natalPanchanga,setNatalPanchanga]=useState<NatalPanchanga|null>(null);
  const [beliefMode,setBeliefMode]=useState<"secular"|"spiritual">("secular");
  const [practiceProtocol,setPracticeProtocol]=useState<PracticeProtocol|null>(null);
  const [conventionComparison,setConventionComparison]=useState<ConventionComparison|null>(null);
  async function loadPractices(){const response=await fetch("/api/practices",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...profile,topic:judgmentTopic,preferences:{beliefMode,maximumBurden:"minimal",maximumCost:"free",allowPrayer:beliefMode==="spiritual",allowCharity:true}})});if(response.ok)setPracticeProtocol(await response.json() as PracticeProtocol);}
  useEffect(() => {
    let active = true;
    setJudgmentBusy(true);
    void fetch("/api/judgments/topic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...profile, topic: judgmentTopic }),
    })
      .then(async (response) =>
        response.ok ? ((await response.json()) as TopicJudgment) : null,
      )
      .then((result) => {
        if (active) setJudgment(result);
      })
      .catch(() => {
        if (active) setJudgment(null);
      })
      .finally(() => {
        if (active) setJudgmentBusy(false);
      });
    return () => {
      active = false;
    };
  }, [profile, judgmentTopic]);
  useEffect(()=>{let active=true;void fetch("/api/judgments/conventions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...profile,topic:judgmentTopic,conventions:["lahiri","krishnamurti","raman"]})}).then(async response=>response.ok?(await response.json())as ConventionComparison:null).then(result=>{if(active)setConventionComparison(result)}).catch(()=>{if(active)setConventionComparison(null)});return()=>{active=false}},[profile,judgmentTopic]);
  useEffect(()=>{let active=true;void fetch("/api/judgments/houses",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(profile)}).then(async response=>response.ok?(await response.json()) as HouseExplorer:null).then(result=>{if(active)setHouseExplorer(result)}).catch(()=>{});return()=>{active=false}},[profile]);
  useEffect(()=>{let active=true;void fetch("/api/panchanga/natal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(profile)}).then(async response=>response.ok?(await response.json()) as NatalPanchanga:null).then(result=>{if(active)setNatalPanchanga(result)}).catch(()=>{});return()=>{active=false}},[profile]);
  const [proEnabled, setProEnabled] = useState(() => {
    try {
      return localStorage.getItem("sahadeva.pro") === "1";
    } catch {
      return false;
    }
  });
  function toggleProMode(next: boolean) {
    setProEnabled(next);
    try {
      localStorage.setItem("sahadeva.pro", next ? "1" : "0");
    } catch {
      /* private mode */
    }
    pickTab(next ? "pro" : "overview");
  }
  const [varga, setVarga] = useState("D1");
  const [chartStyle, setChartStyle] = useState<"south" | "north">(() => {
    try {
      return localStorage.getItem("sahadeva.chartstyle") === "north"
        ? "north"
        : "south";
    } catch {
      return "south";
    }
  });
  function pickStyle(next: "south" | "north") {
    setChartStyle(next);
    try {
      localStorage.setItem("sahadeva.chartstyle", next);
    } catch {
      /* private mode */
    }
  }
  const [dashaSystem, setDashaSystem] = useState<"vimshottari" | "yogini">(
    "vimshottari",
  );
  const [shareState, setShareState] = useState<"idle" | "busy" | "copied" | "need-account">("idle");
  async function shareChart() {
    if (shareState === "busy") return;
    setShareState("busy");
    try {
      const response = await fetch("/api/me/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (response.status === 401) {
        setShareState("need-account");
        window.setTimeout(() => setShareState("idle"), 2500);
        return;
      }
      const data = (await response.json()) as { token?: string };
      if (!data.token) throw new Error();
      await navigator.clipboard.writeText(
        `${window.location.origin}/?chart=${data.token}`,
      );
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2500);
    } catch {
      setShareState("idle");
    }
  }
  const [tab, setTab] = useState<"overview" | "pro">(() => {
    try {
      return localStorage.getItem("sahadeva.protab") === "pro" &&
        localStorage.getItem("sahadeva.pro") === "1"
        ? "pro"
        : "overview";
    } catch {
      return "overview";
    }
  });
  function pickTab(next: "overview" | "pro") {
    setTab(next);
    try {
      localStorage.setItem("sahadeva.protab", next);
    } catch {
      /* private mode */
    }
  }
  const houseByPlanet: Record<string, number> = Object.fromEntries(
    (chart?.advanced.houses.equalBhava.planetHouses ?? []).map((item) => [
      item.name,
      item.wholeSignHouse,
    ]),
  );
  const dignityByPlanet: Record<string, { dignity: string; combust: boolean }> =
    Object.fromEntries(
      (chart?.advanced.dignities ?? []).map((item) => [
        item.name,
        { dignity: item.dignity, combust: item.combust },
      ]),
    );
  const clock = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleTimeString(
          language === "te" ? "te-IN" : undefined,
          { hour: "2-digit", minute: "2-digit" },
        )
      : "—";
  async function downloadPdf() {
    if (!chart || pdfBusy) return;
    setPdfBusy(true);
    try {
      const { buildChartPdf } = await import("./pdfReport");
      const blob = await buildChartPdf(chart as never);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sahadeva-${profile.name || "chart"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      /* pdf generation failed silently; workspace still offers it */
    } finally {
      setPdfBusy(false);
    }
  }
  const proHead = (title: string, key: keyof Strings["explainQ"]) => (
    <div className="section-head">
      <h3>{title}</h3>
      {onAsk && (
        <button
          className="ask-btn"
          onClick={() => onAsk(t.explainQ[key])}
          aria-label={`${t.explain}: ${title}`}
        >
          ✨ {t.explain}
        </button>
      )}
    </div>
  );

  function downloadJson() {
    if (!chart) return;
    const blob = new Blob([JSON.stringify(chart, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sahadeva-${profile.name || "chart"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  const jd = nowJd();
  const detectedYogas = chart?.advanced.yogas.filter((item) => item.detected) ?? [];
  const kp = (() => {
    if (!chart) return null;
    try {
      return calculateKpPreview(chart as never) as {
        significators: Array<{
          planet: string;
          starLord: string;
          subLord: string;
          occupiedHouse: number;
          ownedHouses: number[];
          starLordOccupiedHouse: number;
          starLordOwnedHouses: number[];
        }>;
        rulingPlanets: Array<{ role: string; planet: string }>;
      };
    } catch {
      return null;
    }
  })();
  return (
    <div
      className={docked ? "sheet-dock" : "sheet-backdrop"}
      onClick={docked ? undefined : onClose}
    >
      <aside
        className={docked ? "sheet docked" : "sheet"}
        role={docked ? "complementary" : "dialog"}
        aria-label={t.yourChart}
        onClick={(event) => event.stopPropagation()}
      >
        {!docked && <div className="sheet-handle" />}
        <div className="sheet-head">
          <h2>{t.yourChart}</h2>
          {docked && onCycleDock && (
            <button
              onClick={onCycleDock}
              aria-label={t.dockSize}
              title={
                dockSize === "normal"
                  ? t.dockSize
                  : dockSize === "wide"
                    ? t.focusTools
                    : t.backToChat
              }
            >
              {dockSize === "full" ? "⇥" : "⇤"}
            </button>
          )}
          {!docked && (
            <button onClick={onClose} aria-label={t.closeDetails}>✕</button>
          )}
        </div>
        {proEnabled && (
        <div className="sheet-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "overview"}
            className={tab === "overview" ? "on" : ""}
            onClick={() => pickTab("overview")}
          >
            {t.overviewTab}
          </button>
          <button
            role="tab"
            aria-selected={tab === "pro"}
            className={tab === "pro" ? "on" : ""}
            onClick={() => pickTab("pro")}
          >
            ✦ {t.proTab}
          </button>
        </div>
        )}
        <div className="sheet-body">
          <section hidden={tab === "pro"}>
            <h3>{t.language}</h3>
            <div className="lang-row">
              <button
                type="button"
                className={language === "en" ? "on" : ""}
                onClick={() => onLanguage("en")}
              >
                English
              </button>
              <button
                type="button"
                className={language === "te" ? "on" : ""}
                onClick={() => onLanguage("te")}
              >
                తెలుగు
              </button>
            </div>
          </section>

          {today?.fiveLimbs && (
            <section hidden={tab === "pro"}>
              <h3>{t.today}</h3>
              <div className="fact-grid">
                <div>
                  <span>{t.vara}</span>
                  <strong>{localize(today.fiveLimbs.vara, language, TELUGU_VARAS)}</strong>
                </div>
                <div>
                  <span>{t.tithi}</span>
                  <strong>{localize(today.fiveLimbs.tithi, language, TELUGU_TITHIS)}</strong>
                </div>
                <div>
                  <span>{t.nakshatra}</span>
                  <strong>{localize(today.fiveLimbs.nakshatra, language, NAKSHATRA_TE)}</strong>
                </div>
                <div>
                  <span>{t.yoga}</span>
                  <strong>{localize(today.fiveLimbs.yoga, language, TELUGU_YOGAS)}</strong>
                </div>
                <div>
                  <span>{t.sunrise} / {t.sunset}</span>
                  <strong>{clock(today.solar?.sunrise)} · {clock(today.solar?.sunset)}</strong>
                </div>
                <div>
                  <span>{t.rahuKaal}</span>
                  <strong>
                    {clock(today.inauspicious?.rahuKaal?.startIso)} – {clock(today.inauspicious?.rahuKaal?.endIso)}
                  </strong>
                </div>
              </div>
            </section>
          )}

          {natalPanchanga&&<section hidden={tab === "pro"}><h3>{language==="te"?"జన్మ పంచాంగం":"Natal Panchanga"}</h3><div className="fact-grid">{natalPanchanga.limbs.map(limb=><div key={limb.limb}><span>{limb.limb} · {limb.element}</span><strong>{limb.value}</strong><em>{[limb.lord,limb.class].filter(Boolean).join(" · ")}</em></div>)}</div><p className="muted small">{natalPanchanga.paksha.name} Paksha · Moon Paksha Bala {natalPanchanga.paksha.moonPakshaBalaVirupas.toFixed(1)} Virupas. {natalPanchanga.interpretation.notice}</p></section>}

          <section hidden={tab === "pro"}>
            <h3>{t.birthDetails}</h3>
            <p className="muted">
              {profile.name} · {profile.date} · {profile.time}
              <br />
              {profile.place}
            </p>
            <button className="link-btn" onClick={onEdit}>
              {t.editDetails}
            </button>
          </section>

          <section hidden={tab === "pro"} className="judgment-card">
            <div className="section-head">
              <h3>{language === "te" ? "ఆధారాలతో విశ్లేషణ" : "Judgment with evidence"}</h3>
              {judgment && <span className={`judgment-status ${judgment.status}`}>{judgment.status}</span>}
            </div>
            <div className="judgment-topics" aria-label="Judgment topic">
              {(["career", "education", "property", "relationships", "spirituality"] as const).map((topic) => (
                <button
                  type="button"
                  key={topic}
                  className={judgmentTopic === topic ? "on" : ""}
                  onClick={() => setJudgmentTopic(topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
            {judgmentBusy ? (
              <p className="muted small">{language === "te" ? "గణిస్తోంది…" : "Building the evidence ledger…"}</p>
            ) : judgment ? (
              <div className="judgment-body">
                <p>{judgment.conclusion}</p>
                <div className="judgment-meta">
                  <span>{judgment.vargaConfirmation.varga}: {judgment.vargaConfirmation.status}</span>
                  <span>{language === "te" ? "దశ" : "Timing"}: {judgment.timingActivation.status}</span>
                  <span>{language === "te" ? "అనిశ్చితి" : "Uncertainty"}: {judgment.uncertainty.level}</span>
                  {judgment.sensitivity&&<span>{judgment.sensitivity.stable?"Stable across":"Changes within"} ±{judgment.sensitivity.rangeMinutes}m</span>}
                </div>
                <details open>
                  <summary>{language === "te" ? "మద్దతు" : "Supporting evidence"} ({judgment.supportingEvidence.length})</summary>
                  <ul>{judgment.supportingEvidence.map((item) => <li key={item.id}><strong>{item.label}</strong><span>{item.detail}</span></li>)}</ul>
                </details>
                <details open={judgment.opposingEvidence.length > 0}>
                  <summary>{language === "te" ? "వ్యతిరేక ఆధారాలు" : "Opposing evidence"} ({judgment.opposingEvidence.length})</summary>
                  {judgment.opposingEvidence.length ? (
                    <ul>{judgment.opposingEvidence.map((item) => <li key={item.id}><strong>{item.label}</strong><span>{item.detail}</span></li>)}</ul>
                  ) : <p className="muted small">No opposing factor matched this structural screen.</p>}
                </details>
                <details>
                  <summary>{language === "te" ? "గ్రహ సంబంధాలు" : "Functional role and relationships"}</summary>
                  {judgment.practitionerAnalysis.functionalLordship && (
                    <p className="muted small">{judgment.practitionerAnalysis.functionalLordship.reason}</p>
                  )}
                  {judgment.practitionerAnalysis.dispositorChain.length > 1 && (
                    <p className="muted small">Dispositor chain: {judgment.practitionerAnalysis.dispositorChain.join(" → ")}</p>
                  )}
                  <ul>{judgment.practitionerAnalysis.relevantRelationships.slice(0,6).map((item,index)=><li key={`${item.from}-${item.to}-${item.kind}-${index}`}><strong>{item.kind}</strong><span>{item.detail}</span></li>)}</ul>
                </details>
                <details>
                  <summary>{language === "te" ? "మూలాలు" : "Sources and review state"}</summary>
                  {judgment.citations.length ? (
                    <ul>{judgment.citations.map((item) => <li key={item.ruleId}><strong>{item.sourceTitle}</strong><span>{item.author ? `${item.author} · ` : ""}{item.locator}</span></li>)}</ul>
                  ) : (
                    <p className="muted small">No publishable rule is attached yet. {judgment.unresolvedSourceKeys.length} source key(s) await passage review and two approvals.</p>
                  )}
                </details>
                {conventionComparison&&<details><summary>{language==="te"?"పద్ధతి పోలిక":"Convention comparison"}</summary><p className="muted small">{conventionComparison.judgmentChangeAnalysis.notice}</p><ul>{conventionComparison.variants.map(item=><li key={item.id}><strong>{item.name}</strong><span>Topic lord {item.lord} · {item.validation}</span></li>)}</ul><p className="muted small">{conventionComparison.traditionBoundary.notice}</p></details>}
                <details>
                  <summary>{language==="te"?"ఐచ్ఛిక ఆచరణ":"Optional safe practice"}</summary>
                  <div className="judgment-topics"><button className={beliefMode==="secular"?"on":""} onClick={()=>setBeliefMode("secular")}>Secular</button><button className={beliefMode==="spiritual"?"on":""} onClick={()=>setBeliefMode("spiritual")}>Spiritual</button><button onClick={()=>void loadPractices()}>Build preferences</button></div>
                  {practiceProtocol&&<><p className="muted small">{practiceProtocol.outcome} · {practiceProtocol.traditionalRemedyStatus}</p><ul>{practiceProtocol.eligiblePractices.map(item=><li key={item.id}><strong>{item.label}</strong><span>{item.instructions}</span></li>)}</ul></>}
                </details>
                <p className="muted small">{judgment.timingActivation.notice}</p>
              </div>
            ) : (
              <p className="muted small">Judgment evidence is temporarily unavailable; calculated chart facts remain available.</p>
            )}
          </section>

          {summary && (
            <>
              <section hidden={tab === "pro"}>
                <h3>{t.anchors}</h3>
                <div className="fact-grid">
                  <div>
                    <span>{t.lagna}</span>
                    <strong>
                      {localize(summary.anchors.lagna.signName, language, SIGN_TE)}{" "}
                      {summary.anchors.lagna.degree.toFixed(1)}°
                    </strong>
                  </div>
                  <div>
                    <span>{t.moon}</span>
                    <strong>
                      {localize(summary.anchors.moon.signName, language, SIGN_TE)} ·{" "}
                      {localize(summary.anchors.moon.nakshatra, language, NAKSHATRA_TE)}{" "}
                      {t.padaShort}
                      {summary.anchors.moon.pada}
                    </strong>
                  </div>
                </div>
              </section>
              <section hidden={tab === "pro"}>
                {proHead(t.currentDasha, "dasha")}
                <div className="dasha-stack">
                  {(
                    [
                      [t.mahadasha, "mahadasha"],
                      [t.antardasha, "antardasha"],
                      [t.pratyantardasha, "pratyantardasha"],
                    ] as const
                  ).map(([label, key]) => {
                    const lord = summary.currentTiming[key];
                    const bounds = summary.currentTiming.boundaries[key];
                    if (!lord) return null;
                    return (
                      <div key={key}>
                        <span>{label}</span>
                        <strong>{localize(lord, language, TELUGU_GRAHAS)}</strong>
                        {bounds && (
                          <em>
                            {formatMonth(bounds.startIso, language)} –{" "}
                            {formatMonth(bounds.endIso, language)}
                          </em>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
              <section hidden={tab === "overview"}>
                <h3>{t.panchanga}</h3>
                <div className="fact-grid">
                  <div>
                    <span>{t.vara}</span>
                    <strong>{localize(summary.panchanga.vara, language, TELUGU_VARAS)}</strong>
                  </div>
                  <div>
                    <span>{t.tithi}</span>
                    <strong>{localize(summary.panchanga.tithi, language, TELUGU_TITHIS)}</strong>
                  </div>
                  <div>
                    <span>{t.paksha}</span>
                    <strong>{localize(summary.panchanga.paksha, language, TELUGU_PAKSHAS)}</strong>
                  </div>
                  <div>
                    <span>{t.nakshatra}</span>
                    <strong>{localize(summary.panchanga.nakshatra, language, NAKSHATRA_TE)}</strong>
                  </div>
                  <div>
                    <span>{t.yoga}</span>
                    <strong>{localize(summary.panchanga.yoga, language, TELUGU_YOGAS)}</strong>
                  </div>
                  <div>
                    <span>{t.karana}</span>
                    <strong>{localize(summary.panchanga.karana, language, TELUGU_KARANAS)}</strong>
                  </div>
                </div>
              </section>
              {summary.measuredStrengths.length > 0 && (
                <section hidden={tab === "overview"}>
                  <h3>{t.strength}</h3>
                  <div className="strength-list">
                    {summary.measuredStrengths.map((item) => (
                      <div key={item.planet}>
                        <span>{localize(item.planet, language, TELUGU_GRAHAS)}</span>
                        <div className="strength-bar">
                          <i
                            style={{
                              width: `${Math.min(100, Math.round((item.ratio ?? 0) * 100))}%`,
                            }}
                          />
                        </div>
                        <em>{item.avastha}</em>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {summary.context&&<section hidden={tab === "overview"}><h3>Response context</h3><p className="muted small">≈{summary.context.estimatedInputTokens.toLocaleString()} input tokens · {summary.context.historyMessages} recent messages · {Object.entries(summary.context.included).filter(([,included])=>included).map(([name])=>name).join(", ")||"core chart evidence only"}</p></section>}
            </>
          )}

          {chart && (
            <>
              <section className="chart-section" hidden={tab === "pro"}>
                <div className="lang-row style-row">
                  <button
                    type="button"
                    className={chartStyle === "south" ? "on" : ""}
                    onClick={() => pickStyle("south")}
                  >
                    {t.southStyle}
                  </button>
                  <button
                    type="button"
                    className={chartStyle === "north" ? "on" : ""}
                    onClick={() => pickStyle("north")}
                  >
                    {t.northStyle}
                  </button>
                </div>
                {chartStyle === "south" ? (
                  <SouthChart
                    placements={chart.placements as never}
                    title={language === "te" ? "రాశి చక్రం (D1)" : "Rasi (D1)"}
                    language={language}
                  />
                ) : (
                  <NorthChart
                    placements={chart.placements as never}
                    title={language === "te" ? "రాశి చక్రం (D1)" : "Rasi (D1)"}
                    language={language}
                  />
                )}
              </section>
              <section className="chart-section" hidden={tab === "pro"}>
                {chartStyle === "south" ? (
                  <SouthChart
                    placements={chart.navamsa as never}
                    title={language === "te" ? "నవాంశ చక్రం (D9)" : "Navamsa (D9)"}
                    language={language}
                  />
                ) : (
                  <NorthChart
                    placements={chart.navamsa as never}
                    title={language === "te" ? "నవాంశ చక్రం (D9)" : "Navamsa (D9)"}
                    language={language}
                  />
                )}
              </section>

              <section hidden={tab === "overview"}>
                <h3>{t.vargaTitle}</h3>
                <div className="chip-row varga-row">
                  {Object.keys(chart.advanced.vargas).map((key) => (
                    <button
                      key={key}
                      className={varga === key ? "chip on" : "chip"}
                      onClick={() => setVarga(key)}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <div className="chart-section">
                  <SouthChart
                    placements={(chart.advanced.vargas[varga] ?? []) as never}
                    title={varga}
                    language={language}
                  />
                </div>
              </section>

              <div className="pro-divider" hidden={tab === "overview"}>
                <span>{t.proTitle}</span>
              </div>

              <section hidden={tab === "overview"}>
                {proHead(t.allPlacements, "placements")}
                <div className="table-wrap">
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>{t.planet}</th>
                        <th>{t.signCol}</th>
                        <th>{t.degreeCol}</th>
                        <th>{t.houseCol}</th>
                        <th>{t.ownsCol}</th>
                        <th>{t.nakCol}</th>
                        <th>{t.dignityCol}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chart.placements.map((item) => (
                        <tr key={item.name}>
                          <td>
                            {localize(item.name, language, TELUGU_GRAHAS)}
                            {item.retrograde && (
                              <em className="retro-tag"> {t.retro}</em>
                            )}
                          </td>
                          <td>
                            {localize(
                              item.signName || SIGNS[item.sign],
                              language,
                              SIGN_TE,
                            )}
                          </td>
                          <td>{item.degree.toFixed(2)}°</td>
                          <td>{houseByPlanet[item.name] ?? "—"}</td>
                          <td>
                            {(() => {
                              const lagna = chart.placements.find(
                                (p) => p.name === "Lagna",
                              );
                              if (!lagna || item.name === "Lagna") return "—";
                              const owned = WS_LORDS.flatMap((lord, index) =>
                                lord === item.name
                                  ? [((index - lagna.sign + 12) % 12) + 1]
                                  : [],
                              );
                              return owned.join(", ") || "—";
                            })()}
                          </td>
                          <td>
                            {localize(item.nakshatra, language, NAKSHATRA_TE)}{" "}
                            {t.padaShort}
                            {item.pada}
                          </td>
                          <td>
                            {dignityByPlanet[item.name]?.dignity ?? "—"}
                            {dignityByPlanet[item.name]?.combust && (
                              <em className="retro-tag"> {t.combust}</em>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section hidden={tab === "overview"}>
                {proHead(t.dashaTimeline, "timeline")}
                <div className="lang-row style-row">
                  <button
                    type="button"
                    className={dashaSystem === "vimshottari" ? "on" : ""}
                    onClick={() => setDashaSystem("vimshottari")}
                  >
                    Vimshottari
                  </button>
                  <button
                    type="button"
                    className={dashaSystem === "yogini" ? "on" : ""}
                    onClick={() => setDashaSystem("yogini")}
                  >
                    Yogini
                  </button>
                </div>
                {dashaSystem === "yogini" && (
                  <div className="timeline">
                    {(() => {
                      try {
                        const yogini = calculateYoginiDasha(chart as never) as {
                          periods: Array<{
                            lord?: string;
                            planet?: string;
                            startJulianDay: number;
                            endJulianDay: number;
                            subPeriods?: Array<{
                              lord?: string;
                              planet?: string;
                              startJulianDay: number;
                              endJulianDay: number;
                            }>;
                          }>;
                        };
                        return yogini.periods.map((period, index) => {
                          const active =
                            jd >= period.startJulianDay &&
                            jd < period.endJulianDay;
                          return (
                            <details key={index} open={active}>
                              <summary className={active ? "active" : ""}>
                                <strong>
                                  {period.lord}
                                  {period.planet
                                    ? ` (${localize(period.planet, language, TELUGU_GRAHAS)})`
                                    : ""}
                                </strong>
                                <em>
                                  {formatDay(jdToDate(period.startJulianDay), language)} –{" "}
                                  {formatDay(jdToDate(period.endJulianDay), language)}
                                </em>
                                {active && <i className="running-dot" />}
                              </summary>
                              <div className="timeline-sub">
                                {(period.subPeriods ?? []).map((sub, subIndex) => {
                                  const subActive =
                                    jd >= sub.startJulianDay &&
                                    jd < sub.endJulianDay;
                                  return (
                                    <div
                                      key={subIndex}
                                      className={subActive ? "active" : ""}
                                    >
                                      <span>
                                        {sub.lord}
                                        {sub.planet
                                          ? ` (${localize(sub.planet, language, TELUGU_GRAHAS)})`
                                          : ""}
                                      </span>
                                      <em>
                                        {formatMonth(
                                          jdToDate(sub.startJulianDay).toISOString(),
                                          language,
                                        )}{" "}
                                        –{" "}
                                        {formatMonth(
                                          jdToDate(sub.endJulianDay).toISOString(),
                                          language,
                                        )}
                                      </em>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          );
                        });
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}
                <div className="timeline" hidden={dashaSystem !== "vimshottari"}>
                  {chart.advanced.vimshottariTimeline.map((maha) => {
                    const active =
                      jd >= maha.startJulianDay && jd < maha.endJulianDay;
                    return (
                      <details key={`${maha.lord}-${maha.startJulianDay}`} open={active}>
                        <summary className={active ? "active" : ""}>
                          <strong>{localize(maha.lord, language, TELUGU_GRAHAS)}</strong>
                          <em>
                            {formatDay(jdToDate(maha.startJulianDay), language)} –{" "}
                            {formatDay(jdToDate(maha.endJulianDay), language)}
                          </em>
                          {active && <i className="running-dot" title={t.running} />}
                        </summary>
                        <div className="timeline-sub">
                          {maha.subPeriods.map((antar) => {
                            const antarActive =
                              jd >= antar.startJulianDay && jd < antar.endJulianDay;
                            return (
                              <details
                                key={`${antar.lord}-${antar.startJulianDay}`}
                                className={antarActive ? "active" : ""}
                                open={antarActive}
                              >
                                <summary>
                                  <span>
                                    {localize(antar.lord, language, TELUGU_GRAHAS)}
                                  </span>
                                  <em>
                                    {formatMonth(
                                      jdToDate(antar.startJulianDay).toISOString(),
                                      language,
                                    )}{" "}
                                    –{" "}
                                    {formatMonth(
                                      jdToDate(antar.endJulianDay).toISOString(),
                                      language,
                                    )}
                                  </em>
                                </summary>
                                <div className="timeline-praty">
                                  {antar.pratyantarPeriods.map((praty) => {
                                    const pratyActive =
                                      jd >= praty.startJulianDay &&
                                      jd < praty.endJulianDay;
                                    return (
                                      <details
                                        key={`${praty.lord}-${praty.startJulianDay}`}
                                        className={pratyActive ? "active" : ""}
                                        open={pratyActive}
                                      >
                                        <summary>
                                          <span>
                                            {localize(praty.lord, language, TELUGU_GRAHAS)}
                                          </span>
                                          <em>
                                            {formatDay(
                                              jdToDate(praty.startJulianDay),
                                              language,
                                            )}{" "}
                                            –{" "}
                                            {formatDay(
                                              jdToDate(praty.endJulianDay),
                                              language,
                                            )}
                                          </em>
                                        </summary>
                                        <div className="timeline-sookshma">
                                          <i className="sookshma-label">
                                            {t.sookshma}
                                          </i>
                                          {sookshmaPeriods(praty).map((sook) => {
                                            const sookActive =
                                              jd >= sook.startJulianDay &&
                                              jd < sook.endJulianDay;
                                            return (
                                              <div
                                                key={`${sook.lord}-${sook.startJulianDay}`}
                                                className={sookActive ? "active" : ""}
                                              >
                                                <span>
                                                  {localize(sook.lord, language, TELUGU_GRAHAS)}
                                                </span>
                                                <em>
                                                  {formatDay(
                                                    jdToDate(sook.startJulianDay),
                                                    language,
                                                  )}{" "}
                                                  –{" "}
                                                  {formatDay(
                                                    jdToDate(sook.endJulianDay),
                                                    language,
                                                  )}
                                                </em>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </details>
                                    );
                                  })}
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>

              <section hidden={tab === "overview"}>
                {proHead(t.yogasTitle, "yogas")}
                {detectedYogas.length ? (
                  <div className="yoga-list">
                    {detectedYogas.map((item) => (
                      <details key={item.yoga}>
                        <summary>{item.yoga}</summary>
                        <ul>
                          {item.evidence.map((line, index) => (
                            <li key={index}>{line}</li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>
                ) : (
                  <p className="muted small">{t.noYogas}</p>
                )}
              </section>

              <section hidden={tab === "overview"}>
                {proHead(t.shadbala, "shadbala")}
                <div className="table-wrap">
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>{t.planet}</th>
                        <th>{t.shadbala}</th>
                        <th>{t.required}</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chart.advanced.planetaryStates.avasthas
                        .filter((item) => item.shadbalaTotalVirupas !== undefined)
                        .map((item) => (
                          <tr key={item.name}>
                            <td>{localize(item.name, language, TELUGU_GRAHAS)}</td>
                            <td>{Math.round(item.shadbalaTotalVirupas ?? 0)}</td>
                            <td>{Math.round(item.requiredVirupas ?? 0)}</td>
                            <td>
                              {item.requiredStrengthRatio !== null
                                ? `${Math.round(item.requiredStrengthRatio * 100)}%`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section hidden={tab === "overview"}>
                {proHead(t.sarva, "sarva")}
                <div className="sarva-grid">
                  {chart.advanced.ashtakavarga.sarva.signs.map((bindus, index) => (
                    <div key={index}>
                      <span>
                        {language === "te" ? TELUGU_SIGNS[index] : SIGNS[index]}
                      </span>
                      <strong>{bindus}</strong>
                    </div>
                  ))}
                </div>
                <p className="muted small">
                  {t.sarvaTotal}: {chart.advanced.ashtakavarga.sarva.total}
                </p>
              </section>

              {kp && (
                <section hidden={tab === "overview"}>
                  {proHead(t.kpTitle, "kp")}
                  <div className="table-wrap">
                    <table className="pro-table">
                      <thead>
                        <tr>
                          <th>{t.planet}</th>
                          <th>{t.houseCol}</th>
                          <th>{t.starLord}</th>
                          <th>{t.subLord}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kp.significators.map((row) => (
                          <tr key={row.planet}>
                            <td>{localize(row.planet, language, TELUGU_GRAHAS)}</td>
                            <td>{row.occupiedHouse}</td>
                            <td>{localize(row.starLord, language, TELUGU_GRAHAS)}</td>
                            <td>{localize(row.subLord, language, TELUGU_GRAHAS)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {kp && (
                <section hidden={tab === "overview"}>
                  {proHead(t.signifTitle, "signif")}
                  <div className="table-wrap">
                    <table className="pro-table">
                      <thead>
                        <tr>
                          <th>{t.planet}</th>
                          <th>A</th>
                          <th>B</th>
                          <th>C</th>
                          <th>D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kp.significators.map((row) => (
                          <tr key={row.planet}>
                            <td>{localize(row.planet, language, TELUGU_GRAHAS)}</td>
                            <td>{row.starLordOccupiedHouse}</td>
                            <td>{row.occupiedHouse}</td>
                            <td>{row.starLordOwnedHouses.join(", ") || "—"}</td>
                            <td>{row.ownedHouses.join(", ") || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="muted small">{t.signifLegend}</p>
                </section>
              )}

              {kp && (
                <section hidden={tab === "overview"}>
                  <h3>{t.rulingTitle}</h3>
                  <div className="fact-grid">
                    {kp.rulingPlanets.map((row) => (
                      <div key={row.role}>
                        <span>{row.role}</span>
                        <strong>{localize(row.planet, language, TELUGU_GRAHAS)}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section hidden={tab === "overview"}>
                {proHead(t.housesTitle, "houses")}
                {houseExplorer && <div className="house-explorer">{houseExplorer.houses.map(item=><details key={item.house}><summary><b>{item.house}</b><span>{item.topic}</span><em className={`judgment-status ${item.status}`}>{item.status}</em></summary><p>{item.signName} · Lord {item.lord}</p>{item.supportingEvidence.length>0&&<><strong>Support</strong><ul>{item.supportingEvidence.map((line,index)=><li key={`s-${index}`}>{line}</li>)}</ul></>}{item.opposingEvidence.length>0&&<><strong>Opposition</strong><ul>{item.opposingEvidence.map((line,index)=><li key={`o-${index}`}>{line}</li>)}</ul></>}<p className="muted small">{item.safety.notice}</p></details>)}</div>}
                <div className="table-wrap">
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>{t.houseCol}</th>
                        <th>{t.signCol}</th>
                        <th>{t.lordCol}</th>
                        <th>{t.lordInCol}</th>
                        <th>{t.occupants}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const lagna = chart.placements.find(
                          (p) => p.name === "Lagna",
                        );
                        if (!lagna) return null;
                        const lords = ["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
                        const roman = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
                        return roman.map((label, index) => {
                          const sign = (lagna.sign + index) % 12;
                          const occupants = chart.placements
                            .filter((p) => p.name !== "Lagna" && p.sign === sign)
                            .map((p) => localize(p.name, language, TELUGU_GRAHAS))
                            .join(", ");
                          const lordPlanet = chart.placements.find(
                            (p) => p.name === lords[sign],
                          );
                          const lordHouse = lordPlanet
                            ? ((lordPlanet.sign - lagna.sign + 12) % 12) + 1
                            : null;
                          return (
                            <tr key={label}>
                              <td>{label}</td>
                              <td>{localize(SIGNS[sign], language, SIGN_TE)}</td>
                              <td>{localize(lords[sign], language, TELUGU_GRAHAS)}</td>
                              <td>{lordHouse ?? "—"}</td>
                              <td>{occupants || "—"}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>

              {transit && (
                <section hidden={tab === "overview"}>
                  <h3>{t.gochara}</h3>
                  <div className="table-wrap">
                    <table className="pro-table">
                      <thead>
                        <tr>
                          <th>{t.planet}</th>
                          <th>{t.signCol}</th>
                          <th>{t.degreeCol}</th>
                          <th>{t.fromLagna}</th>
                          <th>{t.fromMoon}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const natalLagna = chart.placements.find(
                            (p) => p.name === "Lagna",
                          );
                          const natalMoon = chart.placements.find(
                            (p) => p.name === "Moon",
                          );
                          if (!natalLagna || !natalMoon) return null;
                          return transit.placements
                            .filter((p) => p.name !== "Lagna")
                            .map((p) => (
                              <tr key={p.name}>
                                <td>
                                  {localize(p.name, language, TELUGU_GRAHAS)}
                                  {p.retrograde && (
                                    <em className="retro-tag"> {t.retro}</em>
                                  )}
                                </td>
                                <td>
                                  {localize(
                                    p.signName || SIGNS[p.sign],
                                    language,
                                    SIGN_TE,
                                  )}
                                </td>
                                <td>{p.degree.toFixed(1)}°</td>
                                <td>
                                  {((p.sign - natalLagna.sign + 12) % 12) + 1}
                                </td>
                                <td>
                                  {((p.sign - natalMoon.sign + 12) % 12) + 1}
                                </td>
                              </tr>
                            ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {chart.advanced.aspects.length > 0 && (
                <section hidden={tab === "overview"}>
                  {proHead(t.aspectsTitle, "aspects")}
                  <div className="aspect-list">
                    {chart.advanced.aspects.map((aspect, index) => (
                      <div key={index}>
                        <strong>
                          {localize(aspect.from, language, TELUGU_GRAHAS)} →{" "}
                          {localize(aspect.to, language, TELUGU_GRAHAS)}
                        </strong>
                        <em>{aspect.kind}</em>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section hidden={tab === "overview"}>
                <h3>{t.tools}</h3>
                <div className="tool-buttons">
                  <button className="cta secondary" onClick={shareChart} disabled={shareState === "busy"}>
                    {shareState === "copied"
                      ? t.shareCopied
                      : shareState === "need-account"
                        ? t.shareNeedsAccount
                        : `🔗 ${t.shareChart}`}
                  </button>
                  <button className="cta secondary" onClick={downloadPdf} disabled={pdfBusy}>
                    {pdfBusy ? t.generatingPdf : t.downloadPdf}
                  </button>
                  <button className="cta secondary" onClick={downloadJson}>
                    {t.downloadJson}
                  </button>
                </div>
                <p className="muted small">{t.mcpNote}</p>
                <div className="mcp-row">
                  <code>{`${window.location.origin}/mcp`}</code>
                  <button
                    className="chip"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(`${window.location.origin}/mcp`)
                        .then(() => {
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1500);
                        });
                    }}
                  >
                    {copied ? t.copied : t.copy}
                  </button>
                </div>
                <p className="muted small">
                  <a href="#pro">{t.openWorkspace}</a>
                </p>
              </section>
            </>
          )}

          <section hidden={tab === "pro"} className="pro-gate">
            <label className="pro-toggle">
              <span>
                <strong>✦ {t.proModeTitle}</strong>
                <em>{t.proModeDesc}</em>
              </span>
              <input
                type="checkbox"
                checked={proEnabled}
                onChange={(event) => toggleProMode(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>
          </section>

          <section hidden={tab === "pro"}>
            <p className="muted small">{t.disclaimer}</p>
          </section>
        </div>
      </aside>
    </div>
  );
}

/* ── Onboarding ──────────────────────────────────────── */

function Onboarding({
  onReady,
  onOpenAccount,
  account,
}: {
  onReady: (profile: Profile) => void;
  onOpenAccount: () => void;
  account: Account;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step,setStep]=useState<1|2|3>(1);
  const t = STRINGS[language];
  const next=()=>{setError("");if(step===1&&!name.trim())return setError(language==="te"?"ముందుగా మీ పేరు రాయండి.":"Please add your name first.");if(step===2&&(!date||!time))return setError(language==="te"?"పుట్టిన తేదీ మరియు సమయం ఎంచుకోండి.":"Choose your birth date and time.");setStep(value=>Math.min(3,value+1)as 1|2|3)};

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/locations/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ place, date, time }),
      });
      const resolved = (await response.json()) as {
        error?: string;
        place: string;
        latitude: number;
        longitude: number;
        timezone: string;
        timezoneOffset: number;
      };
      if (!response.ok) throw new Error(resolved.error || t.placeError);
      onReady({
        name: name.trim(),
        date,
        time,
        place: resolved.place,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        timezone: resolved.timezone,
        timezoneOffset: resolved.timezoneOffset,
        language,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
      setBusy(false);
    }
  }

  return (
    <div className="onboard">
      <div className="onboard-card">
        <button
          className="account-corner"
          onClick={onOpenAccount}
          aria-label={t.account}
        >
          {account ? account.name.slice(0, 1).toUpperCase() : "👤"}
        </button>
        <div className="onboard-mark">✳</div>
        <h1>Sahadeva</h1>
        <p className="muted">{language==="te"?"మీ జాతకాన్ని సులభమైన మాటల్లో అర్థం చేసుకుందాం.":"Understand your chart in simple words. No astrology knowledge needed."}</p>
        <div className="setup-progress" aria-label={`Step ${step} of 3`}><span style={{width:`${step/3*100}%`}}/></div>
        <p className="setup-step">{language==="te"?`3 లో ${step}వ దశ`:`Step ${step} of 3`}</p>
        <form onSubmit={submit}>
          {step===1&&<><div className="setup-heading"><strong>{language==="te"?"మిమ్మల్ని ఏమని పిలవాలి?":"What should I call you?"}</strong><span>{language==="te"?"మీకు నచ్చిన భాషను కూడా ఎంచుకోండి.":"Choose the language that feels easiest."}</span></div><div className="lang-row" role="radiogroup" aria-label={t.language}>
            <button
              type="button"
              className={language === "en" ? "on" : ""}
              onClick={() => setLanguage("en")}
            >
              English
            </button>
            <button
              type="button"
              className={language === "te" ? "on" : ""}
              onClick={() => setLanguage("te")}
            >
              తెలుగు
            </button>
          </div>
          <label>
            {t.name}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.namePlaceholder}
              required
              maxLength={80}
              autoComplete="name"
            />
          </label></>}
          {step===2&&<><div className="setup-heading"><strong>{language==="te"?"మీరు ఎప్పుడు పుట్టారు?":"When were you born?"}</strong><span>{language==="te"?"జాతకం లెక్కించడానికి తేదీ మరియు సమయం అవసరం.":"The date and time help calculate your chart."}</span></div><div className="field-label">{t.dob}</div>
          <DateField value={date} onChange={setDate} t={t} />
          <div className="field-label">{t.tob}</div>
          <TimeField value={time} onChange={setTime} t={t} /></>}
          {step===3&&<><div className="setup-heading"><strong>{language==="te"?"మీరు ఎక్కడ పుట్టారు?":"Where were you born?"}</strong><span>{language==="te"?"పట్టణం లేదా గ్రామం పేరు రాయండి. మేము సరైన స్థలాన్ని కనుగొంటాము.":"Type the town or village. We’ll find the correct location."}</span></div><label>
            {t.pob}
            <input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder={t.pobPlaceholder}
              required
              maxLength={120}
            />
          </label><div className="setup-check"><span>✓</span><p><strong>{name}</strong><br/>{date} · {time}</p><button type="button" onClick={()=>setStep(1)}>{language==="te"?"మార్చు":"Change"}</button></div></>}
          {error && <div className="chat-error" role="alert">{error}</div>}
          <div className="setup-actions">{step>1&&<button className="setup-back" type="button" onClick={()=>setStep(value=>Math.max(1,value-1)as 1|2|3)}>{language==="te"?"వెనుకకు":"Back"}</button>}{step<3?<button className="cta" type="button" onClick={next}>{language==="te"?"తర్వాత":"Next"}</button>:<button className="cta" type="submit" disabled={busy||!place.trim()}>{busy?t.finding:(language==="te"?"నా జాతకం చూపించు":"Show my chart")}</button>}</div>
        </form>
        <p className="muted small">
          {account ? t.syncNote : t.guestNote}{" "}
          <a href="#pro">{t.workspace}</a>
        </p>
      </div>
    </div>
  );
}

/* ── Read-only shared chart viewer (?chart=TOKEN) ────── */

export function SharedChartView({ token }: { token: string }) {
  const [data, setData] = useState<{
    profile: Profile;
    chart: NonNullable<FullChart>;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void fetch(`/api/share/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as {
          profile: Profile;
          chart: NonNullable<FullChart>;
        };
      })
      .then(setData)
      .catch(() => setFailed(true));
  }, [token]);
  if (failed)
    return (
      <div className="onboard">
        <div className="onboard-card">
          <div className="onboard-mark">✳</div>
          <h1>Sahadeva</h1>
          <p className="muted">This share link is invalid or has expired.</p>
          <p className="muted small">
            <a href="/">Open Sahadeva →</a>
          </p>
        </div>
      </div>
    );
  if (!data) return null;
  const language: Language = data.profile.language === "te" ? "te" : "en";
  const summary = summaryFromChart(data.chart);
  return (
    <div className="chat-shell dock-full shared-view">
      <DetailsSheet
        profile={data.profile}
        summary={summary}
        chart={data.chart}
        today={null}
        t={STRINGS[language]}
        language={language}
        docked
        onClose={() => {}}
        onEdit={() => {}}
        onLanguage={() => {}}
      />
    </div>
  );
}
