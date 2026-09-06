// Typed fetch wrappers + response types for the Sahadev web app.
// Only the fields the UI actually renders are typed; the backend returns more.

export type Lang = "en" | "te";
export type SpeechLanguage = "auto" | "en" | "hi" | "te";

export type Profile = {
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  place: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
  language: Lang;
  birthTimeConfidence?: "exact" | "rough" | "part" | "none";
  birthTimeAccuracyMinutes?: number;
};

export class TranscriptionError extends Error {
  constructor(message: string, readonly status: number, readonly retryable: boolean) { super(message); this.name = "TranscriptionError"; }
}

export async function transcribeAudio(audio: Blob, language: SpeechLanguage, signal?: AbortSignal): Promise<{ text: string; language: string | null; provider: string | null }> {
  const form = new FormData();
  const extension = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  form.append("audio", audio, `voice.${extension}`);
  form.append("language", language);
  let res: Response;
  try { res = await fetch("/api/transcribe", { method: "POST", body: form, signal }); }
  catch (error) {
    if ((error as DOMException).name === "AbortError") throw error;
    throw new TranscriptionError("Connection interrupted. Please try again.", 0, true);
  }
  const data = (await res.json().catch(() => ({}))) as { text?: string; language?: string | null; provider?: string; error?: string };
  if (!res.ok || !data.text) throw new TranscriptionError(data.error || (res.status === 429 ? "Too many voice requests. Wait a moment and try again." : "We couldn't transcribe that recording."), res.status, res.status >= 500);
  return { text: data.text, language: data.language ?? null, provider: data.provider ?? null };
}

/* ── chart ─────────────────────────────────────────────────────────────── */

export type Placement = {
  name: string; // Sun..Ketu, Lagna
  sign: number; // 0..11, 0 = Mesha
  signName?: string;
  degree: number;
  nakshatra: string;
  pada: number;
  retrograde?: boolean;
};

export type Dignity = {
  name: string;
  sign: number;
  signLord: string;
  dignity: string;
  combust: boolean;
};

export type VargaPlacement = { name: string; sign: number; signName?: string };

export type DashaNode = {
  lord: string;
  startJulianDay: number;
  endJulianDay: number;
  subPeriods: Array<{
    lord: string;
    startJulianDay: number;
    endJulianDay: number;
    pratyantarPeriods: Array<{ lord: string; startJulianDay: number; endJulianDay: number }>;
  }>;
};

export type ChartResult = {
  input: Profile & Record<string, unknown>;
  engine: { julianDay: number; timezone?: { id?: string } };
  placements: Placement[];
  navamsa: VargaPlacement[];
  panchanga: {
    vara: string;
    tithi: string;
    paksha: string;
    nakshatra: string;
    yoga: string;
    karana: string;
  };
  vimshottari: { birthLord: string; balanceYears: number; sequence: Array<{ lord: string; years: number }> };
  advanced: {
    vargas: Record<string, VargaPlacement[]>;
    dignities: Dignity[];
    vimshottariTimeline: DashaNode[];
  };
};

/* ── panchanga/today ───────────────────────────────────────────────────── */

export type JdWindow = { startJulianDay: number; endJulianDay: number; startIso: string; endIso: string };
export type Unavail = { status: "unavailable"; reason?: string };

export type TodayPanchanga = {
  schemaVersion: string;
  status: string;
  date: string;
  location: { place: string; latitude: number; longitude: number; timezone: string | null };
  fiveLimbs: { vara: string; tithi: string; paksha: string; nakshatra: string; yoga: string; karana: string };
  solar: {
    sunrise: string;
    sunset: string;
    nextSunrise: string;
    dayLengthHours: number;
    nightLengthHours: number;
    moonrise: { status: string; instantIso?: string };
    moonset: { status: string; instantIso?: string };
  };
  inauspicious: {
    rahuKaal: JdWindow;
    yamaganda: JdWindow;
    gulikaKaal: JdWindow;
    bhadraVishti: { active: boolean; karana: string };
    durmuhurtam: Unavail;
    varjyam: Unavail;
  };
  auspicious: { abhijitMuhurta: JdWindow; brahmaMuhurta: JdWindow; amritKaal: Unavail };
  calendar: { ritu: string; ayana: string; masa: { amanta: Unavail; purnimanta: Unavail } };
};

/* ── dasha/calendar ────────────────────────────────────────────────────── */

export type DashaLevel = {
  lord: string;
  startIso: string;
  endIso: string;
  ageAtStartYears: number;
};
export type DashaTimelineNode = DashaLevel & {
  antardashas: Array<DashaLevel & { pratyantardashas: DashaLevel[] }>;
};
export type DashaCalendar = {
  birthJulianDay: number;
  current: {
    instantIso: string;
    mahadasha: string | null;
    antardasha: string | null;
    pratyantardasha: string | null;
    boundaries: {
      mahadasha: { startIso: string; endIso: string } | null;
      antardasha: { startIso: string; endIso: string } | null;
      pratyantardasha: { startIso: string; endIso: string } | null;
    };
  };
  timeline: DashaTimelineNode[];
};

/* ── chat summary (subset) ─────────────────────────────────────────────── */

export type ChatSummary = {
  readingMode?: string;
  conversationAlignment?: { score: number; concernOpen: boolean; recoveryAttempted: boolean } | null;
  anchors?: { lagna?: { signName?: string; degree?: number }; moon?: { signName?: string; degree?: number; nakshatra?: string; pada?: number } };
  panchanga?: { vara?: string; tithi?: string; paksha?: string; nakshatra?: string; yoga?: string; karana?: string };
  currentTiming?: { mahadasha?: string | null; antardasha?: string | null; nextMahadasha?: { lord: string; startIso: string; endIso: string } | null };
  measuredStrengths?: Array<{ planet: string; ratio: number | null; avastha: string | null }>;
  detectedYogas?: Array<{ yoga: string; evidence: unknown }>;
  aspectMatrix?: {
    system: string;
    method: string;
    houses: Array<{ planet: string; occupiedHouse: number; aspectedHouses: number[]; classicalDrishti: boolean }>;
  };
  everyday?: { dailyLife?: { questions?: string[] } };
  fullProfile?: { nextQuestions?: string[] } | null;
  followUps?: string[];
  timingOutlook?: {
    topic: string;
    topicLabel: string;
    headline: string;
    now: { score: number; band: "strong" | "moderate" | "quiet"; summary: string };
    windows: Array<{ label: string; startIso: string; endIso: string; strength: "strong" | "moderate"; peakScore: number; reasons: string[] }>;
    quietStretch: { label: string } | null;
    dashaSequence: Array<{ label: string; relevance: "direct" | "supporting" | "neutral"; activates: string[] }>;
    sadeSati: { active: boolean; stage: string | null; dhaiya: boolean; saturnHouseFromMoon: number };
    notice: string;
  } | null;
  retrospectiveTiming?: {
    topic: string;
    topicLabel: string;
    range: { startIso: string; endIso: string; label: string };
    windows: Array<{ label: string; startIso: string; endIso: string; strength: "strong" | "moderate"; peakScore: number; reasons: string[]; periods: string[] }>;
    dashaSequence: Array<{ label: string; relevance: "direct" | "supporting" | "neutral"; activates: string[] }>;
    notice: string;
  } | null;
};

/* ── low-level fetch helpers ───────────────────────────────────────────── */

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function fetchChart(profile: Profile): Promise<ChartResult> {
  return postJson<ChartResult>("/api/chart", profile);
}

export function fetchTransitChart(profile: Profile): Promise<ChartResult> {
  const now = new Date(Date.now() + profile.timezoneOffset * 3_600_000);
  return postJson<ChartResult>("/api/chart", {
    ...profile,
    name: "Transit",
    date: now.toISOString().slice(0, 10),
    time: now.toISOString().slice(11, 16),
  });
}

export async function fetchToday(profile: Profile): Promise<TodayPanchanga> {
  const qs = new URLSearchParams({
    lat: String(profile.latitude),
    lon: String(profile.longitude),
    tzOffset: String(profile.timezoneOffset),
    lang: profile.language,
  });
  if (profile.timezone) qs.set("tz", profile.timezone);
  const res = await fetch(`/api/panchanga/today?${qs.toString()}`);
  if (!res.ok) throw new Error(`Panchanga failed (${res.status})`);
  return (await res.json()) as TodayPanchanga;
}

export function fetchDashaCalendar(profile: Profile): Promise<DashaCalendar> {
  return postJson<DashaCalendar>("/api/dasha/calendar", profile);
}

/* ── compatibility ─────────────────────────────────────────────────────── */

export type KootaComponent = {
  id: string;
  label: string;
  score: number;
  maximum: number;
  evidence: Record<string, string | number>;
  notice?: string;
};
export type PoruthamCheck = {
  id: string;
  label: string;
  compatible: boolean;
  evidence: Record<string, string | number | boolean>;
  rule: string;
};
export type Compatibility = {
  subjects: {
    bride: { name: string; moon: { sign: number; signName: string; nakshatra: string; pada: number } };
    groom: { name: string; moon: { sign: number; signName: string; nakshatra: string; pada: number } };
  };
  ashtakoota: { score: number; maximum: number; percentage: number; components: KootaComponent[] };
  porutham: { checks: PoruthamCheck[]; summary: { compatible: number; total: number } };
  kujaDosha: {
    bride: { present: boolean; severity: string };
    groom: { present: boolean; severity: string };
    balance: { balanced: boolean; notice: string };
  };
};

export function fetchCompatibility(bride: Profile, groom: Profile): Promise<Compatibility> {
  return postJson<Compatibility>("/api/compatibility", { bride, groom });
}

/* ── remedies ──────────────────────────────────────────────────────────── */

export type RemedyChoice = {
  family: string;
  label: string;
  availability: string;
  choicePrompt?: string;
};
export type RemedyEligibility = {
  family: string;
  eligible: boolean;
  status: string;
  reasons: string[];
  requiredReview: string[];
  contraindications: string[];
  supervision: string;
};
export type RemedyProtocol = {
  diagnosis: { topic: string; status: string; supportingEvidence: string[]; opposingEvidence: string[]; timing?: unknown; uncertainty?: unknown };
  outcome: string;
  availableChoices: RemedyChoice[];
  remedyFamilyEligibility: RemedyEligibility[];
  eligiblePractices: Array<{ id: string; family: string; label: string; instructions: string; cost: string; burden: string; sourceStatus: string }>;
  contraindications: string[];
  followUp: { question: string; causalityNotice: string };
  chartDiagnosis?: {
    devataProfile?: {
      ishtaDevata?: { targetSignName?: string; selected?: { planet?: string }; deityCandidates?: string[] };
      anchors?: { karakamshaSignName?: string };
    };
  };
  lalKitabInference?: {
    computation: { retrievalRequired: boolean; chartCalculatedOnce: boolean };
    topicPrediction: {
      topic: string; overall: string; primaryPredictionId: string | null; primaryStatement: string;
      counts: { supportive: number; challenging: number; mixed: number; unclear: number };
      calculationBasis: string;
    };
    predictions: Array<{
      id: string; topic: string; planet: string; house: number; theme: string;
      direction: string; activation: string; horizon: string; statement: string;
      logic: string[]; supportingEvidence: string[]; opposingEvidence: string[]; confidence: string;
      remedyLink: { decision: string; targetPlanets: string[] };
    }>;
    diagnoses: Array<{
      planet: string;
      house: number;
      effectClass: string;
      adverseSignals: string[];
      activation: string;
      remedyDecision: { decision: string; targetPlanets: string[]; houseMethod: string };
    }>;
    remedyPlan: {
      outcome: string;
      sequencingRule: string;
      ordered: Array<{ priority: number; planet: string; house: number; predictionIds?: string[]; decision: string; targetPlanets: string[]; houseMethod: string }>;
    };
    explanationTrace: Array<{ order: number; rule: string; conclusion: string; facts: string[]; sourceLocator: string }>;
  };
};

export type RemedyPreferences = {
  beliefMode: "hindu" | "spiritual" | "tradition-specific";
  maximumBurden: "minimal" | "moderate";
  maximumCost: "free" | "low";
  allowPrayer: boolean;
  allowCharity: boolean;
};

export function fetchRemedies(
  profile: Profile,
  topic: string,
  preferences: RemedyPreferences,
): Promise<RemedyProtocol> {
  return postJson<RemedyProtocol>("/api/remedies", { ...profile, topic, preferences });
}

/* ── prashna (horary) ──────────────────────────────────────────────────── */

export type PrashnaCategory =
  | "career" | "relationship" | "money" | "property" | "travel"
  | "lost-object" | "health" | "education" | "litigation"
  | "children" | "missing-person" | "general";
export type PrashnaTradition =
  | "integrated" | "classical" | "tajaka" | "systems-approach" | "prashna-nadi";

export type PrashnaObservation = {
  id: string;
  label: string;
  polarity: string;
  facts: string[];
  provenance: { ruleId: string; tier: string; sourceIds?: string[] };
};
export type PrashnaResult = {
  consultationId: string;
  judgment: { direction: string; score: number | null; tier: string; confidence: string; rationale: string[] };
  chartFitness: { status: string };
  observations: PrashnaObservation[];
  uncertainty: string[];
  remedies: Array<{ id: string; label: string; instructions: string; timing: string; reviewStatus: string }>;
  methodSelection: { unavailableCapabilities?: string[] };
  feedback: { confirmationToken: string; status: string; suggestedFollowUpAt: string | null };
  safety: { notice: string };
};

export function fetchPrashna(
  profile: Profile,
  args: {
    question: string;
    category: PrashnaCategory;
    tradition: PrashnaTradition;
    referenceHouse: number;
    seedNumber?: number;
  },
): Promise<PrashnaResult> {
  return postJson<PrashnaResult>("/api/prashna", {
    place: profile.place,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone || "UTC",
    language: profile.language,
    question: args.question,
    category: args.category,
    tradition: args.tradition,
    referenceHouse: args.referenceHouse,
    ...(args.seedNumber === undefined ? {} : { seedNumber: args.seedNumber }),
  });
}

export function recordPrashnaOutcome(
  confirmationToken: string,
  outcome: "confirmed" | "partly-confirmed" | "not-confirmed" | "unresolved",
): Promise<{ status: string }> {
  return postJson<{ status: string }>("/api/prashna/outcome", {
    confirmationToken,
    outcome,
    resolvedAt: new Date().toISOString(),
  });
}

export function interpretConsultation(
  consultation: PrashnaResult,
  question: string,
  language: Lang,
): Promise<string> {
  return postJson<{ response?: string }>("/api/interpret", {
    consultation,
    question,
    language: language === "te" ? "Telugu" : "English",
  }).then((data) => data.response || "");
}

/* ── judgment ledgers (supporting/opposing evidence) ─────────────────── */

export type JudgmentEvidenceView = { id: string; label: string; detail: string };
export type TopicJudgmentView = {
  topic: string;
  title: string;
  conclusion: string;
  status: string;
  score: number;
  supportingEvidence: JudgmentEvidenceView[];
  opposingEvidence: JudgmentEvidenceView[];
  vargaConfirmation: { varga: string; status: string; evidence: JudgmentEvidenceView[] };
  timingActivation: { status: string; currentLords: string[]; evidence: JudgmentEvidenceView[]; notice: string };
  unresolvedSourceKeys?: string[];
};
export type HouseLedgerView = {
  house: number;
  lord?: string;
  support: string[];
  opposition: string[];
  notice?: string;
};
export type HouseExplorerView = {
  schemaVersion: string;
  houses: HouseLedgerView[];
  notice: string;
};

export function fetchTopicJudgment(profile: Profile, topic: string): Promise<TopicJudgmentView> {
  return postJson<TopicJudgmentView>("/api/judgments/topic", { ...profile, topic });
}

export function fetchHouseExplorer(profile: Profile): Promise<HouseExplorerView> {
  return postJson<HouseExplorerView>("/api/judgments/houses", { ...profile });
}

/* ── export artifacts ────────────────────────────────────────────────── */

export async function downloadDashaIcs(profile: Profile): Promise<void> {
  const res = await fetch("/api/dasha.ics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`Calendar export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(profile.name || "sahadeva").replace(/[^a-zA-Z0-9_-]+/g, "-")}-vimshottari.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadChartJson(profile: Profile, chart: ChartResult): void {
  const payload = {
    exportedAt: new Date().toISOString(),
   notice: "Deterministic calculation artifact. Interpretive use only; not scientific fact.",
    input: chart.input,
    engine: chart.engine,
    placements: chart.placements,
    navamsa: chart.navamsa,
    panchanga: chart.panchanga,
    vimshottari: chart.vimshottari,
    advanced: chart.advanced,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(profile.name || "sahadeva").replace(/[^a-zA-Z0-9_-]+/g, "-")}-chart.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* ── daily-brief push alerts ─────────────────────────────────────────── */

export type BriefPushError =
  | "unsupported"
  | "denied"
  | "no-key"
  | "save-failed"
  | "needs-signin";

function vapidKeyToBytes(publicKey: string): Uint8Array<ArrayBuffer> {
  const padded = publicKey.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
}

export function briefPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function currentBriefSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    return (await registration?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

export async function enableDailyBrief(hour: number, tzOffset: number): Promise<void> {
  if (!briefPushSupported()) throw new Error("unsupported");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const { publicKey } = (await (await fetch("/api/push/key")).json()) as {
    publicKey?: string;
  };
  if (!publicKey) throw new Error("no-key");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyToBytes(publicKey),
  });
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscription, hour, tzOffset }),
  });
  if (response.status === 401) throw new Error("needs-signin");
  if (!response.ok) throw new Error("save-failed");
}

export async function updateDailyBriefHour(
  hour: number,
  tzOffset: number,
): Promise<void> {
  const subscription = await currentBriefSubscription();
  if (!subscription) throw new Error("save-failed");
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), hour, tzOffset }),
  });
  if (response.status === 401) throw new Error("needs-signin");
  if (!response.ok) throw new Error("save-failed");
}

export async function disableDailyBrief(): Promise<void> {
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

/* ── /api/me ───────────────────────────────────────────────────────────── */

export type Person = {
  id: string;
  profile: Profile | null;
  profileSnapshot?: { status?: string } & Record<string, unknown>;
};

export type Me = {
  signedIn: boolean;
  user?: { id: string; name: string; email: string };
  profile?: Profile | null;
  people?: Person[];
  activePersonId?: string | null;
  conversation?: StoredConversation | null;
};

export type StoredConversation =
  | ChatTurn[]
  | {
      threads: Array<{
        id: string;
        title: string;
        updatedAt: string | number;
        messages: ChatTurn[];
      }>;
      activeThreadId?: string;
    };

export async function fetchMe(): Promise<Me> {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) return { signedIn: false };
    return (await res.json()) as Me;
  } catch {
    return { signedIn: false };
  }
}

/* ── people (multiple individual profiles per account) ─────────────────── */

export async function addPerson(profile: Profile): Promise<{ ok: boolean; personId?: string; error?: string }> {
  const res = await fetch("/api/me/people", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ profile, traditions: ["parashari", "jaimini", "kp", "lal-kitab"] }),
  });
  const j = (await res.json().catch(() => ({}))) as { personId?: string; error?: string };
  return { ok: res.ok, personId: j.personId, error: j.error };
}

export async function activatePerson(id: string): Promise<{ profile: Profile | null; conversation: StoredConversation | null }> {
  const res = await fetch(`/api/me/people/${encodeURIComponent(id)}/activate`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return { profile: null, conversation: null };
  const j = (await res.json()) as { profile?: Profile; conversation?: StoredConversation | null };
  return { profile: j.profile ?? null, conversation: j.conversation ?? null };
}

export async function deletePerson(id: string): Promise<boolean> {
  const res = await fetch(`/api/me/people/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.ok;
}

/* ── Better Auth (email + password) ────────────────────────────────────── */

async function authPost(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = "";
    try {
      const j = (await res.json()) as { message?: string; error?: string };
      msg = j?.message || j?.error || "";
    } catch {
      /* ignore */
    }
    throw new Error(msg || `Request failed (${res.status})`);
  }
}

export function signUp(email: string, password: string, name: string): Promise<void> {
  return authPost("/api/auth/sign-up/email", { email, password, name });
}
export function signIn(email: string, password: string): Promise<void> {
  return authPost("/api/auth/sign-in/email", { email, password });
}
export function signOut(): Promise<void> {
  return authPost("/api/auth/sign-out", {});
}
export function deleteAccount(password: string): Promise<void> {
  return authPost("/api/auth/delete-user", { password });
}

/** Save the current local profile to the signed-in account (upserts the active person). */
export async function saveProfileToAccount(profile: Profile): Promise<boolean> {
  try {
    const res = await fetch("/api/me/profile/sync", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ profile, traditions: ["parashari", "jaimini", "kp", "lal-kitab"] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveConversationToAccount(
  threads: Array<{ id: string; title: string; updatedAt: number; turns: ChatTurn[] }>,
  activeThreadId: string | null,
): Promise<boolean> {
  try {
    const res = await fetch("/api/me/conversation", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        threads: threads.slice(0, 20).map((thread) => ({
          id: thread.id,
          title: thread.title,
          updatedAt: new Date(thread.updatedAt).toISOString(),
          messages: thread.turns.map(({ id, role, content, intentPoints }) => ({ id, role, content, intentPoints })),
        })),
        activeThreadId: activeThreadId ?? "",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ── chat streaming ────────────────────────────────────────────────────── */

export type ResponseIntentPoint = { id: string; intent: string; text: string };
export type ChatTurn = { id?: string; role: "user" | "assistant"; content: string; intentPoints?: ResponseIntentPoint[] };

export type AlignmentSnapshot = { score: number; cause: string; created_at: string };
export type AlignmentState = { score: number; concernOpen?: boolean; history: AlignmentSnapshot[] };

export async function fetchConversationAlignment(sessionId: string): Promise<AlignmentState> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(sessionId)}/alignment`, { credentials: "include" });
  if (!res.ok) return { score: 50, history: [] };
  return (await res.json()) as AlignmentState;
}

export async function recordConversationInput(
  sessionId: string,
  turnId: string,
  input: string,
): Promise<{ score: number; concernOpen: boolean }> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(sessionId)}/input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ turnId, input }),
  });
  if (!res.ok) throw new Error("alignment-input");
  return (await res.json()) as { score: number; concernOpen: boolean };
}

export async function recordResponseIntentCoverage(
  sessionId: string,
  turnId: string,
  inputTurnId: string,
  response: string,
): Promise<ResponseIntentPoint[]> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(sessionId)}/response-coverage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ turnId, inputTurnId, response }),
  });
  if (!res.ok) throw new Error("intent-coverage");
  const data = (await res.json()) as { points?: ResponseIntentPoint[] };
  return data.points ?? [];
}

export async function submitClaimFeedback(
  sessionId: string,
  input: { turnId: string; claimId: string; claimKind: string; rating: "up" | "down"; reason?: string; response: string },
): Promise<{ score: number; concernOpen: boolean; concernResolved?: boolean }> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(sessionId)}/claim-feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("feedback");
  return (await res.json()) as { score: number; concernOpen: boolean; concernResolved?: boolean };
}

/**
 * Calls POST /api/chat and streams the assistant reply.
 * Wire format: JSON head + U+001E + cumulative UTF-8 text (see the Worker).
 * `onDelta` receives the cumulative text so far. Returns the summary (if any).
 */
export async function streamChat(
  profile: Profile,
  messages: ChatTurn[],
  onDelta: (cumulativeText: string) => void,
  signal?: AbortSignal,
  options: { lifeContext?: string; deep?: boolean; conversationSessionId?: string; conversationTurnId?: string; fullProfile?: boolean } = {},
): Promise<{ text: string; summary: ChatSummary | null }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      profile,
      messages,
      clientSurface: "web",
      responseStyle: options.deep ? "plain" : "layered",
      responseDepth: options.deep ? "deep" : "standard",
      mode: options.fullProfile ? { fullProfile: true } : undefined,
      lifeContext: options.lifeContext || undefined,
      conversationSessionId: options.conversationSessionId,
      conversationTurnId: options.conversationTurnId,
    }),
    signal,
  });
  if (res.status === 429) throw new Error("rate");
  if (!res.ok) throw new Error("reply");

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as { response?: string; summary?: ChatSummary };
    if (data.response) onDelta(data.response);
    return { text: data.response || "", summary: data.summary ?? null };
  }

  const reader = res.body?.getReader();
  if (!reader) return { text: "", summary: null };
  const decoder = new TextDecoder();
  const SEP = String.fromCharCode(30); // U+001E
  let buffer = "";
  let headParsed = false;
  let text = "";
  let summary: ChatSummary | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    if (!headParsed) {
      const split = buffer.indexOf(SEP);
      if (split === -1) continue;
      try {
        const head = JSON.parse(buffer.slice(0, split)) as { summary?: ChatSummary };
        summary = head.summary ?? null;
      } catch {
        /* ignore malformed head */
      }
      buffer = buffer.slice(split + 1);
      headParsed = true;
    }
    if (headParsed && buffer) {
      text += buffer;
      buffer = "";
      onDelta(text);
    }
  }
  return { text, summary };
}
