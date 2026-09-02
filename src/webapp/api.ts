// Typed fetch wrappers + response types for the Sahadev web app.
// Only the fields the UI actually renders are typed; the backend returns more.

export type Lang = "en" | "te";

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
};

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
  anchors?: { lagna?: { signName?: string; degree?: number }; moon?: { signName?: string; degree?: number; nakshatra?: string; pada?: number } };
  panchanga?: { vara?: string; tithi?: string; paksha?: string; nakshatra?: string; yoga?: string; karana?: string };
  currentTiming?: { mahadasha?: string | null; antardasha?: string | null; nextMahadasha?: { lord: string; startIso: string; endIso: string } | null };
  everyday?: { dailyLife?: { questions?: string[] } };
  fullProfile?: { nextQuestions?: string[] } | null;
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

/* ── /api/me ───────────────────────────────────────────────────────────── */

export type Me = {
  signedIn: boolean;
  user?: { id: string; name: string; email: string };
  profile?: Profile | null;
};

export async function fetchMe(): Promise<Me> {
  try {
    const res = await fetch("/api/me");
    if (!res.ok) return { signedIn: false };
    return (await res.json()) as Me;
  } catch {
    return { signedIn: false };
  }
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

/* ── chat streaming ────────────────────────────────────────────────────── */

export type ChatTurn = { role: "user" | "assistant"; content: string };

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
): Promise<{ text: string; summary: ChatSummary | null }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile, messages, clientSurface: "web" }),
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
