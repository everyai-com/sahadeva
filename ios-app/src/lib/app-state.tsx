import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  activatePerson,
  addPerson,
  chat,
  fetchChart,
  fetchMe,
  pushProfile,
  pushThreads,
  removePerson,
  sendTelemetry,
  signIn as apiSignIn,
  signOut as apiSignOut,
  signUp as apiSignUp,
} from "./api";
import {
  clearThreads,
  loadProfile,
  loadThreads,
  newThreadId,
  normalizeThreads,
  saveProfile,
  saveThreads,
} from "./storage";
import { getStrings, type Strings } from "./strings";
import type {
  Account,
  ChatMode,
  ChatSummary,
  FullChart,
  Language,
  Message,
  Person,
  Profile,
  Thread,
} from "./types";

type AppState = {
  hydrated: boolean;
  profile: Profile | null;
  language: Language;
  t: Strings;
  threads: Thread[];
  activeThreadId: string;
  messages: Message[];
  draft: string | null;
  busy: boolean;
  error: string;
  summary: ChatSummary | null;
  chart: FullChart | null;
  account: Account;
  people: Person[];
  partner: Profile | null;
  prashnaMode: boolean;
  adoptProfile: (profile: Profile) => void;
  replaceProfile: (profile: Profile) => void;
  resetProfile: () => void;
  switchLanguage: (language: Language) => void;
  send: (text: string, mode?: ChatMode) => Promise<void>;
  refreshChart: () => Promise<void>;
  newThread: () => void;
  switchThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
  deleteThread: (id: string) => void;
  setPrashnaMode: (on: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  addPersonProfile: (profile: Profile) => Promise<void>;
  switchPerson: (person: Person) => Promise<void>;
  deletePerson: (person: Person) => Promise<void>;
  compareWith: (person: Person) => Promise<void>;
  clearPartner: () => void;
  clearError: () => void;
};

const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [chart, setChart] = useState<FullChart | null>(null);
  const [account, setAccount] = useState<Account>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [prashnaMode, setPrashnaMode] = useState(false);

  const startedRef = useRef(false);
  const chartLoadingRef = useRef(false);
  const activeThreadIdRef = useRef("");
  const accountRef = useRef<Account>(null);
  const profileRef = useRef<Profile | null>(null);
  const threadsRef = useRef<Thread[]>([]);

  useEffect(() => {
    accountRef.current = account;
    profileRef.current = profile;
    threadsRef.current = threads;
  }, [account, profile, threads]);

  const language: Language = profile?.language ?? "en";
  const t = getStrings(language);

  const messages = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId)?.messages ?? [],
    [threads, activeThreadId],
  );

  const loadChartFor = useCallback(async (activeProfile: Profile) => {
    if (chartLoadingRef.current) return;
    chartLoadingRef.current = true;
    try {
      const result = await fetchChart(activeProfile);
      if (result) setChart(result);
    } finally {
      chartLoadingRef.current = false;
    }
  }, []);

  const commitMessages = useCallback((next: Message[]) => {
    setThreads((previous) => {
      let id = activeThreadIdRef.current;
      let list = [...previous];
      if (!id || !list.some((thread) => thread.id === id)) {
        id = newThreadId();
        activeThreadIdRef.current = id;
        setActiveThreadId(id);
        list = [...list, { id, title: "", updatedAt: new Date().toISOString(), messages: [] }];
      }
      list = list.map((thread) =>
        thread.id === id
          ? { ...thread, updatedAt: new Date().toISOString(), messages: next }
          : thread,
      );
      void saveThreads(list, id);
      if (accountRef.current) pushThreads(list, id);
      return list;
    });
  }, []);

  const localizedError = useCallback(
    (err: unknown): string => {
      const strings = getStrings(profileRef.current?.language ?? "en");
      if (err instanceof ApiError) {
        if (err.code === "rate") return strings.rateError;
        if (err.code === "reply") return strings.replyError;
        if (err.code === "place") return strings.placeError;
        if (err.code === "auth") return strings.authError;
        if (err.code === "signup") return strings.signupError;
      }
      return err instanceof Error && err.message ? err.message : strings.genericError;
    },
    [],
  );

  const runChat = useCallback(
    async (history: Message[], mode?: ChatMode, partnerOverride?: Profile | null) => {
      const activeProfile = profileRef.current;
      if (!activeProfile) return;
      setBusy(true);
      setError("");
      try {
        const reply = await chat({
          profile: activeProfile,
          partner: partnerOverride ?? undefined,
          mode,
          messages: history,
          onSummary: setSummary,
          onDelta: setDraft,
        });
        commitMessages([...history, { role: "assistant", content: reply }]);
        const lastUser = history.at(-1);
        if (
          lastUser &&
          /\b(?:entire|complete|full|whole).*\b(?:profile|reading|report|chart)\b|\beverything\b|సంపూర్ణ|పూర్తి.*(?:జాతక|ప్రొఫైల్)|అన్నింటితో సహా/i.test(lastUser.content)
        ) {
          sendTelemetry("full_profile_completed", { language: activeProfile.language, characters: reply.length });
        }
      } catch (err) {
        setError(localizedError(err));
      } finally {
        setDraft(null);
        setBusy(false);
      }
    },
    [commitMessages, localizedError],
  );

  const send = useCallback(
    async (text: string, mode?: ChatMode) => {
      const trimmed = text.trim();
      if (!trimmed || !profileRef.current || busy) return;
      let effectiveMode = mode;
      if (!effectiveMode && prashnaMode) {
        effectiveMode = { prashna: true };
        setPrashnaMode(false);
      }
      const next: Message[] = [...(threadsRef.current.find((thread) => thread.id === activeThreadIdRef.current)?.messages ?? []), { role: "user", content: trimmed }];
      commitMessages(next);
      await runChat(next, effectiveMode, partner);
    },
    [busy, prashnaMode, partner, commitMessages, runChat],
  );

  const startSession = useCallback(
    async (activeProfile: Profile) => {
      setBusy(true);
      setError("");
      try {
        const [reply] = await Promise.all([
          chat({
            profile: activeProfile,
            messages: [],
            onSummary: setSummary,
            onDelta: setDraft,
          }),
          loadChartFor(activeProfile),
        ]);
        commitMessages([{ role: "assistant", content: reply }]);
      } catch (err) {
        setError(localizedError(err));
      } finally {
        setDraft(null);
        setBusy(false);
      }
    },
    [commitMessages, loadChartFor, localizedError],
  );

  // Hydrate from device storage, then prefer the signed-in account's state.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [localProfile, localThreads, me] = await Promise.all([
        loadProfile(),
        loadThreads(),
        fetchMe(),
      ]);
      if (cancelled) return;
      let nextProfile = localProfile;
      let nextThreads = localThreads;
      if (me.signedIn && me.user) {
        setAccount(me.user);
        setPeople(me.people ?? []);
        if (me.profile?.date) {
          nextProfile = me.profile;
          const restored = normalizeThreads(me.conversation);
          if (restored.threads.length) nextThreads = restored;
          void saveProfile(me.profile);
          void saveThreads(nextThreads.threads, nextThreads.activeThreadId);
        }
      }
      if (nextProfile) {
        setProfile(nextProfile);
        setThreads(nextThreads.threads);
        setActiveThreadId(nextThreads.activeThreadId);
        activeThreadIdRef.current = nextThreads.activeThreadId;
        startedRef.current = nextThreads.threads.length > 0;
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // First conversation: ask the worker for its welcome turn and load the chart.
  useEffect(() => {
    if (!hydrated || !profile || busy) return;
    if (threads.length > 0) {
      startedRef.current = true;
      if (!chart) void loadChartFor(profile);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    void startSession(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, profile, threads.length]);

  const adoptProfile = useCallback((next: Profile) => {
    void saveProfile(next);
    setProfile(next);
    if (accountRef.current) {
      void addPerson(next)
        .then(() => fetchMe())
        .then((me) => setPeople(me.people ?? []))
        .catch(() => {});
    }
  }, []);

  const replaceProfile = useCallback((next: Profile) => {
    void saveProfile(next);
    setProfile(next);
    setChart(null);
    setSummary(null);
    if (accountRef.current) pushProfile(next);
    void loadChartFor(next);
  }, [loadChartFor]);

  const resetProfile = useCallback(() => {
    void saveProfile(null);
    void clearThreads();
    startedRef.current = false;
    setProfile(null);
    setThreads([]);
    setActiveThreadId("");
    activeThreadIdRef.current = "";
    setSummary(null);
    setChart(null);
    setPartner(null);
    setError("");
  }, []);

  const switchLanguage = useCallback((next: Language) => {
    const current = profileRef.current;
    if (!current || current.language === next) return;
    const updated = { ...current, language: next };
    void saveProfile(updated);
    setProfile(updated);
    if (accountRef.current) pushProfile(updated);
  }, []);

  const newThread = useCallback(() => {
    const id = newThreadId();
    setThreads((previous) => {
      const list = [...previous, { id, title: "", updatedAt: new Date().toISOString(), messages: [] }];
      void saveThreads(list, id);
      if (accountRef.current) pushThreads(list, id);
      return list;
    });
    setActiveThreadId(id);
    activeThreadIdRef.current = id;
    setError("");
  }, []);

  const switchThread = useCallback((id: string) => {
    setActiveThreadId(id);
    activeThreadIdRef.current = id;
    setError("");
    void saveThreads(threadsRef.current, id);
  }, []);

  const renameThread = useCallback((id: string, title: string) => {
    setThreads((previous) => {
      const list = previous.map((thread) =>
        thread.id === id ? { ...thread, title: title.slice(0, 80) } : thread,
      );
      void saveThreads(list, activeThreadIdRef.current);
      if (accountRef.current) pushThreads(list, activeThreadIdRef.current);
      return list;
    });
  }, []);

  const deleteThread = useCallback((id: string) => {
    if (id === activeThreadIdRef.current) return;
    setThreads((previous) => {
      const list = previous.filter((thread) => thread.id !== id);
      void saveThreads(list, activeThreadIdRef.current);
      if (accountRef.current) pushThreads(list, activeThreadIdRef.current);
      return list;
    });
  }, []);

  const handleSignedIn = useCallback(async (user: NonNullable<Account>) => {
    setAccount(user);
    const me = await fetchMe();
    setPeople(me.people ?? []);
    if (me.profile?.date) {
      void saveProfile(me.profile);
      const restored = normalizeThreads(me.conversation);
      startedRef.current = restored.threads.length > 0;
      setProfile(me.profile);
      setThreads(restored.threads);
      setActiveThreadId(restored.activeThreadId);
      activeThreadIdRef.current = restored.activeThreadId;
      void saveThreads(restored.threads, restored.activeThreadId);
      setChart(null);
      setSummary(null);
      void loadChartFor(me.profile);
    } else if (profileRef.current) {
      pushProfile(profileRef.current);
      if (threadsRef.current.length) pushThreads(threadsRef.current, activeThreadIdRef.current);
    }
  }, [loadChartFor]);

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await apiSignIn(email.trim(), password);
    await handleSignedIn(user);
  }, [handleSignedIn]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const user = await apiSignUp(email.trim(), password, name);
    await handleSignedIn(user);
  }, [handleSignedIn]);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setAccount(null);
    setPeople([]);
    setPartner(null);
  }, []);

  const addPersonProfile = useCallback(async (next: Profile) => {
    await addPerson(next);
    const me = await fetchMe();
    setPeople(me.people ?? []);
  }, []);

  const switchPerson = useCallback(async (person: Person) => {
    const data = await activatePerson(person.id);
    if (!data) return;
    const nextProfile = data.profile || person.profile;
    if (!nextProfile) return;
    void saveProfile(nextProfile);
    setPartner(null);
    setSummary(null);
    setChart(null);
    setError("");
    const restored = normalizeThreads(data.conversation);
    startedRef.current = restored.threads.length > 0;
    setProfile(nextProfile);
    setThreads(restored.threads);
    setActiveThreadId(restored.activeThreadId);
    activeThreadIdRef.current = restored.activeThreadId;
    void saveThreads(restored.threads, restored.activeThreadId);
    if (restored.threads.length) void loadChartFor(nextProfile);
  }, [loadChartFor]);

  const deletePerson = useCallback(async (person: Person) => {
    await removePerson(person.id);
    const me = await fetchMe();
    setPeople(me.people ?? []);
  }, []);

  const compareWith = useCallback(async (person: Person) => {
    const activeProfile = profileRef.current;
    if (!person.profile || !activeProfile || busy) return;
    setPartner(person.profile);
    const question = `${getStrings(activeProfile.language).compareAsk} (${activeProfile.name} + ${person.profile.name})`;
    const next: Message[] = [...(threadsRef.current.find((thread) => thread.id === activeThreadIdRef.current)?.messages ?? []), { role: "user", content: question }];
    commitMessages(next);
    await runChat(next, undefined, person.profile);
  }, [busy, commitMessages, runChat]);

  const clearPartner = useCallback(() => setPartner(null), []);
  const clearError = useCallback(() => setError(""), []);

  const refreshChart = useCallback(async () => {
    if (profileRef.current) {
      const result = await fetchChart(profileRef.current);
      if (result) setChart(result);
    }
  }, []);

  const value: AppState = {
    hydrated,
    profile,
    language,
    t,
    threads,
    activeThreadId,
    messages,
    draft,
    busy,
    error,
    summary,
    chart,
    account,
    people,
    partner,
    prashnaMode,
    adoptProfile,
    replaceProfile,
    resetProfile,
    switchLanguage,
    send,
    refreshChart,
    newThread,
    switchThread,
    renameThread,
    deleteThread,
    setPrashnaMode,
    signIn,
    signUp,
    signOut,
    addPersonProfile,
    switchPerson,
    deletePerson,
    compareWith,
    clearPartner,
    clearError,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
