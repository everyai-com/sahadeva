import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Profile, Thread } from "./types";

// Same keys as the web client so the mental model stays identical.
const PROFILE_KEY = "sahadeva.profile.v1";
const THREADS_KEY = "sahadeva.threads.v1";
const LIFE_CONTEXT_KEY = "sahadeva.lifeContext.v1";
export const LIFE_CONTEXT_MAX = 600;

export async function loadLifeContext(): Promise<string> {
  try {
    return ((await AsyncStorage.getItem(LIFE_CONTEXT_KEY)) || "").slice(0, LIFE_CONTEXT_MAX);
  } catch {
    return "";
  }
}

export async function saveLifeContext(text: string): Promise<void> {
  try {
    const clean = text.replace(/\s+/g, " ").trim().slice(0, LIFE_CONTEXT_MAX);
    if (clean) await AsyncStorage.setItem(LIFE_CONTEXT_KEY, clean);
    else await AsyncStorage.removeItem(LIFE_CONTEXT_KEY);
  } catch {
    /* storage unavailable */
  }
}

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    return parsed && parsed.date && parsed.time ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: Profile | null): Promise<void> {
  try {
    if (profile) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else await AsyncStorage.removeItem(PROFILE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export type StoredThreads = { threads: Thread[]; activeThreadId: string };

export function normalizeThreads(raw: unknown): StoredThreads {
  if (Array.isArray(raw)) {
    // Legacy single-conversation shape.
    const id = newThreadId();
    const messages = raw as Thread["messages"];
    return {
      threads: messages.length
        ? [{ id, title: "", updatedAt: new Date().toISOString(), messages }]
        : [],
      activeThreadId: messages.length ? id : "",
    };
  }
  const value = raw as { threads?: Thread[]; activeThreadId?: string } | null;
  if (value && Array.isArray(value.threads)) {
    const threads = value.threads.filter((t) => t && Array.isArray(t.messages));
    return {
      threads,
      activeThreadId:
        value.activeThreadId && threads.some((t) => t.id === value.activeThreadId)
          ? value.activeThreadId
          : (threads[0]?.id ?? ""),
    };
  }
  return { threads: [], activeThreadId: "" };
}

export const newThreadId = () => Math.random().toString(36).slice(2, 10);

export function threadTitle(thread: Thread, fallback: string): string {
  if (thread.title) return thread.title;
  const firstUser = thread.messages.find((m) => m.role === "user");
  return firstUser ? firstUser.content.slice(0, 48) : fallback;
}

export async function loadThreads(): Promise<StoredThreads> {
  try {
    const raw = await AsyncStorage.getItem(THREADS_KEY);
    return normalizeThreads(raw ? JSON.parse(raw) : null);
  } catch {
    return { threads: [], activeThreadId: "" };
  }
}

export async function saveThreads(threads: Thread[], activeThreadId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(
      THREADS_KEY,
      JSON.stringify({ threads: threads.slice(-20), activeThreadId }),
    );
  } catch {
    /* storage unavailable */
  }
}

export async function clearThreads(): Promise<void> {
  try {
    await AsyncStorage.removeItem(THREADS_KEY);
  } catch {
    /* storage unavailable */
  }
}

const CHART_STYLE_KEY = "sahadeva.chartstyle";

export async function loadChartStyle(): Promise<"south" | "north"> {
  try {
    const raw = await AsyncStorage.getItem(CHART_STYLE_KEY);
    return raw === "north" ? "north" : "south";
  } catch {
    return "south";
  }
}

export async function saveChartStyle(style: "south" | "north"): Promise<void> {
  try {
    await AsyncStorage.setItem(CHART_STYLE_KEY, style);
  } catch {
    /* storage unavailable */
  }
}

const PRO_KEY = "sahadeva.pro";

export async function loadProMode(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PRO_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function saveProMode(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PRO_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
}

const REMINDER_KEY = "sahadeva.reminder.v1";

export async function loadReminder(): Promise<{ enabled: boolean; token?: string }> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY);
    if (!raw) return { enabled: false };
    return JSON.parse(raw) as { enabled: boolean; token?: string };
  } catch {
    return { enabled: false };
  }
}

export async function saveReminder(value: { enabled: boolean; token?: string }): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}
