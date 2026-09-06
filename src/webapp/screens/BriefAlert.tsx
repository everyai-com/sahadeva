import { useEffect, useState } from "react";
import { useLang } from "../lang";
import { useData } from "../data";
import { navigate } from "../router";
import {
  briefPushSupported,
  currentBriefSubscription,
  disableDailyBrief,
  enableDailyBrief,
  updateDailyBriefHour,
} from "../api";

const HOUR_KEY = "sahadeva.brief.hour.v1";
const HOURS = [5, 6, 7, 8, 9, 10];

function loadHour(): number {
  try {
    const raw = Number(localStorage.getItem(HOUR_KEY));
    if (HOURS.includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 7;
}

type State = "checking" | "off" | "on" | "error";
const ERROR_TEXT: Record<string, { en: string; te: string }> = {
  unsupported: {
    en: "This browser cannot receive alerts.",
    te: "ఈ బ్రౌజర్ హెచ్చరికలు అందుకోలేదు.",
  },
  denied: {
    en: "Notifications are blocked. Allow them in the browser settings, then try again.",
    te: "నోటిఫికేషన్లు నిరోధించబడ్డాయి. బ్రౌజర్ సెట్టింగుల్లో అనుమతించి మళ్లీ ప్రయత్నించండి.",
  },
  "no-key": {
    en: "Morning alerts are not switched on server-side yet. Your chart and today view work normally.",
    te: "సర్వర్ వైపు ఉదయపు హెచ్చరికలు ఇంకా ప్రారంభం కాలేదు.",
  },
  "save-failed": {
    en: "Could not save the alert. Check your connection and try again.",
    te: "హెచ్చరికను భద్రపరచలేకపోయాం. మళ్లీ ప్రయత్నించండి.",
  },
  "needs-signin": {
    en: "Sign in to receive the morning brief.",
    te: "ఉదయపు సారాంశం కోసం సైన్ ఇన్ చేయండి.",
  },
};

/** Morning panchanga brief alert — the only missing piece of the push loop. */
export function BriefAlert() {
  const { lang, t } = useLang();
  const { account, profile } = useData();
  const [state, setState] = useState<State>("checking");
  const [hour, setHour] = useState<number>(loadHour);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!briefPushSupported()) {
      setState("error");
      setError("unsupported");
      return;
    }
    currentBriefSubscription().then((sub) => {
      if (alive) setState(sub ? "on" : "off");
    });
    return () => {
      alive = false;
    };
  }, []);

  const fail = (code: string) => {
    setError(code);
    setState(code === "unsupported" || code === "no-key" ? "error" : "off");
  };

  const enable = async () => {
    if (!account) {
      navigate("more");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await enableDailyBrief(hour, profile?.timezoneOffset ?? 5.5);
      try {
        localStorage.setItem(HOUR_KEY, String(hour));
      } catch {
        /* ignore */
      }
      setState("on");
    } catch (e) {
      fail(e instanceof Error ? e.message : "save-failed");
    }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    await disableDailyBrief();
    setBusy(false);
    setState("off");
  };

  const changeHour = async (next: number) => {
    setHour(next);
    try {
      localStorage.setItem(HOUR_KEY, String(next));
    } catch {
      /* ignore */
    }
    if (state !== "on") return;
    setBusy(true);
    try {
      await updateDailyBriefHour(next, profile?.timezoneOffset ?? 5.5);
    } catch (e) {
      fail(e instanceof Error ? e.message : "save-failed");
    }
    setBusy(false);
  };

  if (state === "checking") return null;

  return (
    <section className="brief" aria-label={t("Morning brief alert", "ఉదయపు సారాంశ హెచ్చరిక")}>
      <p className="sectitle">{t("Morning brief", "ఉదయపు సారాంశం")}</p>
      <p className="briefsub">
        {t(
          "One quiet notification with your panchanga and tara/chandra bala — never marketing, never predictions.",
          "మీ పంచాంగం, తారా/చంద్ర బలంతో ఒకే ఒక నిశ్శబ్ద నోటిఫికేషన్ — ప్రచారం కాదు, జోస్యం కాదు.",
        )}
      </p>
      {state === "error" && error ? (
        <p className="muted small">{lang === "te" ? ERROR_TEXT[error]?.te || error : ERROR_TEXT[error]?.en || error}</p>
      ) : (
        <div className="briefrow">
          <label>
            {t("Hour", "గంట")}
            <select value={hour} onChange={(e) => changeHour(Number(e.target.value))} disabled={busy}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </label>
          {state === "on" ? (
            <button className="btn" type="button" onClick={disable} disabled={busy}>
              {t("Alerts on — tap to stop", "హెచ్చరికలు ఆన్ — ఆపడానికి నొక్కండి")}
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={enable} disabled={busy}>
              {busy
                ? t("Setting up…", "సిద్ధం చేస్తోంది…")
                : account
                  ? t("Alert me every morning", "ప్రతి ఉదయం తెలపండి")
                  : t("Sign in to enable alerts", "హెచ్చరికలకు సైన్ ఇన్ చేయండి")}
            </button>
          )}
        </div>
      )}
      {error && state !== "error" && (
        <p className="muted small">{lang === "te" ? ERROR_TEXT[error]?.te || error : ERROR_TEXT[error]?.en || error}</p>
      )}
    </section>
  );
}
