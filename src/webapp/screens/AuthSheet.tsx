import { useState } from "react";
import "./auth.css";
import { useLang } from "../lang";
import { useData } from "../data";
import { signIn, signUp, saveProfileToAccount, fetchMe } from "../api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Account sheet — sign in or create an account (Better Auth email+password).
 * On success it adopts the account's saved chart, or seeds a new account with
 * the local chart, then closes.
 */
export function AuthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { profile, setProfile, setAccount } = useData();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const emailOk = EMAIL_RE.test(email.trim());
  const pwOk = password.length >= 8;
  const canSubmit = emailOk && pwOk && (mode === "signin" || true) && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") await signUp(email.trim(), password, name.trim() || email.split("@")[0]);
      else await signIn(email.trim(), password);

      const me = await fetchMe();
      if (!me.signedIn || !me.user) throw new Error(t("Something went wrong. Please try again.", "ఏదో తప్పు జరిగింది. మళ్లీ ప్రయత్నించండి."));
      setAccount(me.user);
      if (me.profile?.date) {
        // account already has a saved chart → adopt it
        setProfile(me.profile);
      } else if (profile) {
        // new account → seed it with the local chart
        await saveProfileToAccount(profile);
      }
      reset();
      onClose();
    } catch (e) {
      const raw = (e as Error).message || "";
      setError(niceError(raw, mode, t));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPassword("");
    setError("");
  }

  return (
    <>
      <div className={`authscrim${open ? " on" : ""}`} onClick={() => !busy && onClose()} />
      <aside className={`authsheet${open ? " on" : ""}`} role="dialog" aria-modal="true" aria-label={t("Account", "ఖాతా")}>
        <div className="grabber" aria-hidden="true" />
        <h3>{mode === "signup" ? t("Create your account", "మీ ఖాతా సృష్టించండి") : t("Welcome back", "మళ్లీ స్వాగతం")}</h3>
        <p className="asub">
          {mode === "signup"
            ? t("Save your chart and readings, and reach them from any device.", "మీ జాతకం, పఠనాలను భద్రపరచి, ఏ పరికరం నుండైనా చూసుకోండి.")
            : t("Sign in to reach your saved chart and readings.", "మీ భద్రపరచిన జాతకాన్ని, పఠనాలను చూడటానికి సైన్ ఇన్ చేయండి.")}
        </p>

        {mode === "signup" && (
          <div className="afield">
            <label htmlFor="auth-name">{t("Name", "పేరు")}</label>
            <input
              id="auth-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Your name", "మీ పేరు")}
              autoComplete="name"
            />
          </div>
        )}

        <div className="afield">
          <label htmlFor="auth-email">{t("Email", "ఇమెయిల్")}</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
          />
        </div>

        <div className="afield">
          <label htmlFor="auth-pw">{t("Password", "పాస్‌వర్డ్")}</label>
          <div className="apwrap">
            <input
              id="auth-pw"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("At least 8 characters", "కనీసం 8 అక్షరాలు")}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <button className="aeye" type="button" aria-label={showPw ? t("Hide", "దాచు") : t("Show", "చూపు")} onClick={() => setShowPw((v) => !v)}>
              {showPw ? (
                <svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A9.5 9.5 0 0 1 12 5c5 0 9 4.5 9 7a12 12 0 0 1-2.2 3M6.1 6.1A12 12 0 0 0 3 12c0 2.5 4 7 9 7a9.6 9.6 0 0 0 3-.5" /></svg>
              ) : (
                <svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>
          {mode === "signup" && (
            <div className="arules">
              <span className={`arule${pwOk ? " ok" : ""}`}>
                <svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7" /></svg>
                {t("At least 8 characters", "కనీసం 8 అక్షరాలు")}
              </span>
            </div>
          )}
        </div>

        {error && <p className="aerror">{error}</p>}

        <button className="abtn" type="button" disabled={!canSubmit} onClick={submit}>
          {busy ? t("Please wait…", "దయచేసి వేచి ఉండండి…") : mode === "signup" ? t("Create account", "ఖాతా సృష్టించు") : t("Sign in", "సైన్ ఇన్")}
        </button>

        <button
          className="aswitch"
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError("");
          }}
        >
          {mode === "signup" ? (
            <>{t("Already have an account? ", "ఇప్పటికే ఖాతా ఉందా? ")}<b>{t("Sign in", "సైన్ ఇన్")}</b></>
          ) : (
            <>{t("New here? ", "కొత్తవారా? ")}<b>{t("Create an account", "ఖాతా సృష్టించండి")}</b></>
          )}
        </button>

        {mode === "signup" && (
          <p className="aterms">
            {t("Your birth details and readings are stored privately and encrypted at rest.", "మీ జనన వివరాలు, పఠనాలు గోప్యంగా, ఎన్‌క్రిప్ట్ చేసి భద్రపరచబడతాయి.")}
          </p>
        )}
      </aside>
    </>
  );
}

function niceError(raw: string, mode: "signin" | "signup", t: (en: string, te?: string) => string): string {
  const r = raw.toLowerCase();
  if (r.includes("exist") || r.includes("already"))
    return t("An account with this email already exists. Try signing in.", "ఈ ఇమెయిల్‌తో ఖాతా ఇప్పటికే ఉంది. సైన్ ఇన్ చేయండి.");
  if (r.includes("invalid") || r.includes("credential") || r.includes("password") || r.includes("401"))
    return mode === "signin"
      ? t("Email or password is incorrect.", "ఇమెయిల్ లేదా పాస్‌వర్డ్ తప్పు.")
      : t("Please check your details and try again.", "మీ వివరాలు సరిచూసి మళ్లీ ప్రయత్నించండి.");
  return t("Something went wrong. Please try again.", "ఏదో తప్పు జరిగింది. మళ్లీ ప్రయత్నించండి.");
}
