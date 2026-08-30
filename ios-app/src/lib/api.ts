import { fetch } from "expo/fetch";

import type {
  Account,
  ChatMode,
  ChatSummary,
  FullChart,
  JudgmentTopic,
  Message,
  Person,
  Profile,
  ResolvedPlace,
  Thread,
  TodayPanchanga,
  TopicJudgment,
} from "./types";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://sahadeva.everyai-com.workers.dev").replace(/\/$/, "");

export type ApiErrorCode = "rate" | "reply" | "place" | "auth" | "signup" | "generic";

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message?: string) {
    super(message || code);
    this.code = code;
  }
}

const json = { "content-type": "application/json" } as const;

async function post(path: string, body: unknown) {
  return fetch(`${API_URL}${path}`, { method: "POST", headers: json, body: JSON.stringify(body) });
}

// ---------------------------------------------------------------------------
// Chat — the worker streams `head JSON  reply text` as plain UTF-8.
// ---------------------------------------------------------------------------

// Incremental UTF-8 decoding with a TextDecoder fallback for older runtimes.
function makeUtf8Decoder(): (chunk: Uint8Array, stream: boolean) => string {
  if (typeof TextDecoder !== "undefined") {
    const decoder = new TextDecoder();
    return (chunk, stream) => decoder.decode(chunk, { stream });
  }
  let carry = new Uint8Array(0);
  return (chunk, stream) => {
    let bytes = new Uint8Array(carry.length + chunk.length);
    bytes.set(carry, 0);
    bytes.set(chunk, carry.length);
    let end = bytes.length;
    if (stream) {
      // Hold back a possibly incomplete multi-byte sequence.
      let i = bytes.length - 1;
      while (i >= 0 && i >= bytes.length - 4 && (bytes[i] & 0xc0) === 0x80) i--;
      if (i >= 0 && bytes.length - 4 <= i) {
        const lead = bytes[i];
        const needed = lead >= 0xf0 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc0 ? 2 : 1;
        if (i + needed > bytes.length) end = i;
      }
    }
    carry = bytes.slice(end);
    bytes = bytes.slice(0, end);
    let out = "";
    for (let i = 0; i < bytes.length; ) {
      const b = bytes[i];
      if (b < 0x80) {
        out += String.fromCharCode(b);
        i += 1;
      } else if (b < 0xe0) {
        out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
        i += 2;
      } else if (b < 0xf0) {
        out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
        i += 3;
      } else {
        const cp = ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
        out += String.fromCodePoint(cp);
        i += 4;
      }
    }
    return out;
  };
}

export type ChatRequest = {
  profile: Profile;
  partner?: Profile | null;
  mode?: ChatMode;
  messages: Message[];
  responseDepth?: "standard" | "deep";
  onSummary?: (summary: ChatSummary) => void;
  onDelta?: (text: string) => void;
};

export async function chat(request: ChatRequest, attempt = 0): Promise<string> {
  const response = await post("/api/chat", {
    profile: request.profile,
    partner: request.partner ?? undefined,
    mode: request.mode,
    clientSurface: "mobile",
    responseDepth: request.responseDepth ?? "standard",
    messages: request.messages,
  });
  if (response.status === 503 && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    return chat(request, attempt + 1);
  }
  if (!response.ok) throw new ApiError(response.status === 429 ? "rate" : "reply");
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    // Non-streaming fallback (Workers AI object responses, BTR chat turns).
    const data = (await response.json()) as { response?: string; summary?: ChatSummary };
    if (data.summary && request.onSummary) request.onSummary(data.summary);
    if (data.response && request.onDelta) request.onDelta(data.response);
    return data.response || "";
  }
  if (!response.body) throw new ApiError("reply");
  const reader = response.body.getReader();
  const decode = makeUtf8Decoder();
  let buffer = "";
  let headParsed = false;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decode(value, true);
    if (!headParsed) {
      const split = buffer.indexOf(String.fromCharCode(30));
      if (split === -1) continue;
      try {
        const parsed = JSON.parse(buffer.slice(0, split)) as { summary?: ChatSummary };
        if (parsed.summary && request.onSummary) request.onSummary(parsed.summary);
      } catch {
        /* head was not JSON; ignore */
      }
      buffer = buffer.slice(split + 1);
      headParsed = true;
    }
    if (headParsed && buffer) {
      text += buffer;
      buffer = "";
      if (request.onDelta) request.onDelta(text);
    }
  }
  if (!text.trim()) throw new ApiError("reply");
  return text;
}

// ---------------------------------------------------------------------------
// Calculation endpoints
// ---------------------------------------------------------------------------

export type PlaceCandidate = {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneOffset: number;
};

export class AmbiguousPlaceError extends ApiError {
  candidates: PlaceCandidate[];
  constructor(candidates: PlaceCandidate[]) {
    super("place", "Place is ambiguous");
    this.candidates = candidates;
  }
}

export async function resolvePlace(place: string, date: string, time: string): Promise<ResolvedPlace> {
  const response = await post("/api/locations/resolve", { place, date, time });
  const result = (await response.json()) as ResolvedPlace & {
    error?: string;
    candidates?: PlaceCandidate[];
  };
  if (response.status === 409 && result.candidates?.length)
    throw new AmbiguousPlaceError(result.candidates);
  if (!response.ok) throw new ApiError("place", result.error);
  return result;
}

export async function fetchChart(profile: Profile): Promise<FullChart | null> {
  try {
    const response = await post("/api/chart", profile);
    if (!response.ok) return null;
    return (await response.json()) as FullChart;
  } catch {
    return null;
  }
}

export async function fetchToday(profile: Profile): Promise<TodayPanchanga | null> {
  try {
    const tz = profile.timezone ? `&tz=${encodeURIComponent(profile.timezone)}` : "";
    const response = await fetch(
      `${API_URL}/api/panchanga/today?lat=${profile.latitude}&lon=${profile.longitude}&tzOffset=${profile.timezoneOffset}${tz}&lang=${profile.language}`,
    );
    if (!response.ok) return null;
    return (await response.json()) as TodayPanchanga;
  } catch {
    return null;
  }
}

export async function fetchJudgment(profile: Profile, topic: JudgmentTopic): Promise<TopicJudgment> {
  const response = await post("/api/judgments/topic", { ...profile, topic });
  const result = (await response.json()) as TopicJudgment & { error?: string };
  if (!response.ok) throw new ApiError("generic", result.error);
  return result;
}

// ---------------------------------------------------------------------------
// Account, people and sync (better-auth session cookie)
// ---------------------------------------------------------------------------

export type Me = {
  signedIn: boolean;
  user?: { id: string; name: string; email: string };
  profile?: Profile | null;
  conversation?: unknown;
  people?: Person[];
  activePersonId?: string | null;
};

export async function fetchMe(): Promise<Me> {
  try {
    const response = await fetch(`${API_URL}/api/me`);
    if (!response.ok) return { signedIn: false };
    return (await response.json()) as Me;
  } catch {
    return { signedIn: false };
  }
}

export async function signIn(email: string, password: string): Promise<NonNullable<Account>> {
  const response = await post("/api/auth/sign-in/email", { email, password });
  if (!response.ok) throw new ApiError("auth");
  const data = (await response.json()) as { user?: NonNullable<Account> };
  if (!data.user) throw new ApiError("auth");
  return data.user;
}

export async function signUp(email: string, password: string, name: string): Promise<NonNullable<Account>> {
  const response = await post("/api/auth/sign-up/email", { email, password, name });
  if (!response.ok) throw new ApiError("signup");
  const data = (await response.json()) as { user?: NonNullable<Account> };
  if (!data.user) throw new ApiError("signup");
  return data.user;
}

export async function signOut(): Promise<void> {
  await post("/api/auth/sign-out", {}).catch(() => {});
}

export function pushProfile(profile: Profile): void {
  void fetch(`${API_URL}/api/me/profile`, {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ profile }),
  }).catch(() => {});
}

export function pushThreads(threads: Thread[], activeThreadId: string): void {
  void fetch(`${API_URL}/api/me/conversation`, {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ threads: threads.slice(-20), activeThreadId }),
  }).catch(() => {});
}

export async function addPerson(profile: Profile): Promise<boolean> {
  try {
    const response = await post("/api/me/people", { profile });
    return response.ok;
  } catch {
    return false;
  }
}

export async function activatePerson(id: string): Promise<{ profile?: Profile; conversation?: unknown } | null> {
  try {
    const response = await fetch(`${API_URL}/api/me/people/${id}/activate`, { method: "POST" });
    if (!response.ok) return null;
    return (await response.json()) as { profile?: Profile; conversation?: unknown };
  } catch {
    return null;
  }
}

export async function removePerson(id: string): Promise<void> {
  await fetch(`${API_URL}/api/me/people/${id}`, { method: "DELETE" }).catch(() => {});
}

export async function createShareLink(): Promise<string | null> {
  try {
    const response = await post("/api/me/share", {});
    if (!response.ok) return null;
    const data = (await response.json()) as { token?: string };
    return data.token ? `${API_URL}/?chart=${data.token}` : null;
  } catch {
    return null;
  }
}

export async function registerPushToken(token: string, hour: number, tzOffset: number): Promise<boolean> {
  try {
    const response = await post("/api/push/expo", { token, hour, tzOffset });
    return response.ok;
  } catch {
    return false;
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  await fetch(`${API_URL}/api/push/expo`, {
    method: "DELETE",
    headers: json,
    body: JSON.stringify({ token }),
  }).catch(() => {});
}

export async function fetchBrief(): Promise<{ title: string; body: string } | null> {
  try {
    const response = await fetch(`${API_URL}/api/push/brief`);
    if (!response.ok) return null;
    return (await response.json()) as { title: string; body: string };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Reading quality feedback + product telemetry (fire and forget)
// ---------------------------------------------------------------------------

export function sendReadingFeedback(reading: string, section: string, rating: string, language: string): void {
  void post("/api/readings/feedback", { reading, section, rating, language }).catch(() => {});
}

export function sendTelemetry(event: string, extra?: Record<string, unknown>): void {
  void post("/api/readings/telemetry", { event, ...extra }).catch(() => {});
}
