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
  type ChartResult,
  type DashaCalendar,
  type Profile,
  type TodayPanchanga,
} from "./api";
import { useLang } from "./lang";

const PROFILE_KEY = "sahadeva.profile.v1"; // shared with the #pro chat app

function loadLocalProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    return p && p.date ? p : null;
  } catch {
    return null;
  }
}
function saveLocalProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* private mode */
  }
}

type Async<T> = { status: "idle" | "loading" | "ready" | "error"; data: T | null; error?: string };

type DataCtx = {
  profile: Profile | null;
  meLoaded: boolean;
  account: { id: string; name: string; email: string } | null;
  setProfile: (p: Profile) => void;
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

  const [chart, setChart] = useState<Async<ChartResult>>({ status: "idle", data: null });
  const [transit, setTransit] = useState<Async<ChartResult>>({ status: "idle", data: null });
  const [today, setToday] = useState<Async<TodayPanchanga>>({ status: "idle", data: null });
  const [dasha, setDasha] = useState<Async<DashaCalendar>>({ status: "idle", data: null });

  const currentSig = useRef<string>("");

  const setProfile = useCallback((p: Profile) => {
    saveLocalProfile(p);
    setProfileState(p);
  }, []);

  // Keep the profile's language in sync with the chosen UI language, so the AI
  // and server-localized panchanga are generated in that language too.
  useEffect(() => {
    if (profile && profile.language !== lang) {
      const next = { ...profile, language: lang };
      saveLocalProfile(next);
      setProfileState(next);
    }
  }, [lang, profile]);

  // Load account + server profile on mount.
  useEffect(() => {
    let alive = true;
    void fetchMe().then((me) => {
      if (!alive) return;
      if (me.signedIn && me.user) {
        setAccount(me.user);
        if (me.profile?.date) {
          saveLocalProfile(me.profile);
          setProfileState((prev) => prev ?? me.profile!);
        }
      }
      setMeLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psig]);

  const reload = useCallback(() => {
    if (profile) runLoads(profile);
  }, [profile, runLoads]);

  const value = useMemo<DataCtx>(
    () => ({ profile, meLoaded, account, setProfile, chart, transit, today, dasha, reload }),
    [profile, meLoaded, account, setProfile, chart, transit, today, dasha, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
