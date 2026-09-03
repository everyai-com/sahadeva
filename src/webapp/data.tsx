import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchChart,
  fetchDashaCalendar,
  fetchMe,
  fetchToday,
  fetchTransitChart,
  addPerson as apiAddPerson,
  activatePerson as apiActivatePerson,
  deletePerson as apiDeletePerson,
  type ChartResult,
  type DashaCalendar,
  type Person,
  type Profile,
  type StoredConversation,
  type TodayPanchanga,
} from "./api";
import { useLang } from "./lang";
import { analyticsIdentify, analyticsReset } from "../analytics";

const GUEST_PROFILE_KEY = "sahadeva.profile.guest.v2";

function loadLocalProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    return p && p.date ? p : null;
  } catch {
    return null;
  }
}
function saveGuestProfile(p: Profile) {
  try {
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* private mode */
  }
}

type Async<T> = { status: "idle" | "loading" | "ready" | "error"; data: T | null; error?: string };

export type Account = { id: string; name: string; email: string } | null;

type DataCtx = {
  profile: Profile | null;
  meLoaded: boolean;
  account: Account;
  /** All individual profiles on the signed-in account (empty for guests). */
  people: Person[];
  activePersonId: string | null;
  conversation: StoredConversation | null;
  setAccount: (a: Account) => void;
  /** Re-fetch /api/me (after sign in/out); updates account + people + profile. */
  refreshMe: () => Promise<void>;
  setProfile: (p: Profile) => void;
  /** Add a new person (individual profile) to the account and make it active. */
  addPerson: (profile: Profile) => Promise<{ ok: boolean; error?: string }>;
  /** Switch the active person. */
  activatePerson: (id: string) => Promise<void>;
  /** Remove a person from the account. */
  deletePerson: (id: string) => Promise<void>;
  chart: Async<ChartResult>;
  transit: Async<ChartResult>;
  today: Async<TodayPanchanga>;
  dasha: Async<DashaCalendar>;
  reload: () => void;
};

const Ctx = createContext<DataCtx | null>(null);

function sig(p: Profile | null): string {
  return p ? `${p.date}:${p.time}:${p.latitude.toFixed(3)}:${p.longitude.toFixed(3)}:${p.language}` : "";
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [profile, setProfileState] = useState<Profile | null>(loadLocalProfile);
  const [meLoaded, setMeLoaded] = useState(false);
  const [account, setAccount] = useState<DataCtx["account"]>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<StoredConversation | null>(null);
  const identifiedUserRef = useRef<string | null>(null);

  const [chart, setChart] = useState<Async<ChartResult>>({ status: "idle", data: null });
  const [transit, setTransit] = useState<Async<ChartResult>>({ status: "idle", data: null });
  const [today, setToday] = useState<Async<TodayPanchanga>>({ status: "idle", data: null });
  const [dasha, setDasha] = useState<Async<DashaCalendar>>({ status: "idle", data: null });

  const currentSig = useRef<string>("");

  const setProfile = useCallback((p: Profile) => {
    if (!account) saveGuestProfile(p);
    setProfileState(p);
  }, [account]);

  // Keep the profile's language in sync with the chosen UI language, so the AI
  // and server-localized panchanga are generated in that language too.
  useEffect(() => {
    if (profile && profile.language !== lang) {
      const next = { ...profile, language: lang };
      if (!account) saveGuestProfile(next);
      setProfileState(next);
    }
  }, [account, lang, profile]);

  const refreshMe = useCallback(async () => {
    const me = await fetchMe();
    if (me.signedIn && me.user) {
      analyticsIdentify(me.user.id);
      identifiedUserRef.current = me.user.id;
      setAccount(me.user);
      setPeople(me.people ?? []);
      setActivePersonId(me.activePersonId ?? null);
      setConversation(me.conversation ?? null);
      if (me.profile?.date) {
        // The account's active person is the source of truth once signed in.
        setProfileState(me.profile);
      } else {
        // Never let a previous guest or account profile bleed into this account.
        setProfileState(null);
      }
    } else {
      const wasSignedIn = Boolean(identifiedUserRef.current);
      if (wasSignedIn) analyticsReset();
      identifiedUserRef.current = null;
      setAccount(null);
      setPeople([]);
      setActivePersonId(null);
      setConversation(null);
      // A real sign-out must clear the account's person. On a normal guest
      // page load, retain only the guest-scoped profile.
      setProfileState(wasSignedIn ? null : loadLocalProfile());
    }
    setMeLoaded(true);
  }, []);

  const addPerson = useCallback(
    async (p: Profile) => {
      const res = await apiAddPerson(p);
      if (res.ok) {
        setProfileState(p); // the new person is auto-activated server-side
        await refreshMe();
      }
      return { ok: res.ok, error: res.error };
    },
    [refreshMe],
  );

  const activatePerson = useCallback(
    async (id: string) => {
      const result = await apiActivatePerson(id);
      if (result.profile?.date) {
        setProfileState(result.profile);
      }
      setConversation(result.conversation);
      setActivePersonId(id);
      await refreshMe();
    },
    [refreshMe],
  );

  const deletePerson = useCallback(
    async (id: string) => {
      await apiDeletePerson(id);
      await refreshMe();
    },
    [refreshMe],
  );

  // Load account + server profile on mount.
  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const runLoads = useCallback((p: Profile) => {
    const mySig = sig(p);
    currentSig.current = mySig;

    setChart({ status: "loading", data: null });
    setToday({ status: "loading", data: null });
    setTransit({ status: "loading", data: null });
    setDasha({ status: "loading", data: null });

    fetchChart(p)
      .then((d) => currentSig.current === mySig && setChart({ status: "ready", data: d }))
      .catch((e) => currentSig.current === mySig && setChart({ status: "error", data: null, error: String(e?.message || e) }));

    fetchToday(p)
      .then((d) => currentSig.current === mySig && setToday({ status: "ready", data: d }))
      .catch((e) => currentSig.current === mySig && setToday({ status: "error", data: null, error: String(e?.message || e) }));

    fetchTransitChart(p)
      .then((d) => currentSig.current === mySig && setTransit({ status: "ready", data: d }))
      .catch(() => currentSig.current === mySig && setTransit({ status: "error", data: null }));

    fetchDashaCalendar(p)
      .then((d) => currentSig.current === mySig && setDasha({ status: "ready", data: d }))
      .catch((e) => currentSig.current === mySig && setDasha({ status: "error", data: null, error: String(e?.message || e) }));
  }, []);

  // Fetch whenever the profile identity changes.
  const psig = sig(profile);
  useEffect(() => {
    if (profile) runLoads(profile);
    else {
      currentSig.current = "";
      setChart({ status: "idle", data: null });
      setTransit({ status: "idle", data: null });
      setToday({ status: "idle", data: null });
      setDasha({ status: "idle", data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psig]);

  const reload = useCallback(() => {
    if (profile) runLoads(profile);
  }, [profile, runLoads]);

  const value = useMemo<DataCtx>(
    () => ({
      profile, meLoaded, account, people, activePersonId, conversation,
      setAccount, refreshMe, setProfile, addPerson, activatePerson, deletePerson,
      chart, transit, today, dasha, reload,
    }),
    [profile, meLoaded, account, people, activePersonId, conversation, refreshMe, setProfile, addPerson, activatePerson, deletePerson, chart, transit, today, dasha, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
