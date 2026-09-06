import { useState } from "react";
import "./more.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { navigate, type Route } from "../router";
import { StatusBar, TabBar } from "../shell";
import { nakName, signName } from "../format";
import { deleteAccount, signOut, type Person } from "../api";
import { AuthSheet } from "./AuthSheet";
import { setOnboardingMode } from "../onboardingMode";
import { getLifeContext, setLifeContext, LIFE_CONTEXT_MAX } from "../lifeContext";
import type { ReactNode } from "react";

const CHEV = (
  <svg viewBox="0 0 24 24">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const SIGN_GLOSS_EN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function personSummary(person: Person, lang: "en" | "te"): string {
  const p = person.profile;
  if (!p) return "—";
  const time = p.birthTimeConfidence === "none" ? (lang === "te" ? "సమయం తెలియదు" : "time not known") : p.time;
  return [p.date, time, p.place].filter(Boolean).join(" · ");
}

export function MoreScreen() {
  const { lang, t } = useLang();
  const { profile, chart, account, people, activePersonId, conversation, refreshMe, activatePerson, deletePerson } = useData();
  const [authOpen, setAuthOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [context, setContext] = useState<string>(() => getLifeContext());
  const [contextSaved, setContextSaved] = useState(false);
  const [accountToolsOpen, setAccountToolsOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);

  async function handleSignOut() {
    await signOut().catch(() => {});
    await refreshMe();
  }

  function exportAccountData() {
    const payload = { exportedAt: new Date().toISOString(), account, people, activePersonId, profile, conversation, aboutYou: context };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sahadeva-data-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setAccountMessage(t("Your data export was downloaded.", "మీ డేటా ఎగుమతి డౌన్‌లోడ్ అయింది."));
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      setAccountMessage(t("Enter your password to confirm deletion.", "తొలగింపును నిర్ధారించడానికి మీ పాస్‌వర్డ్ నమోదు చేయండి."));
      return;
    }
    setAccountBusy(true);
    setAccountMessage("");
    try {
      await deleteAccount(deletePassword);
      localStorage.removeItem("sahadeva.profile.guest.v2");
      await refreshMe();
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : t("Account deletion failed.", "ఖాతా తొలగింపు విఫలమైంది."));
    } finally {
      setAccountBusy(false);
    }
  }

  function editActive() {
    setOnboardingMode("edit");
    navigate("onboarding");
  }
  function addPerson() {
    setOnboardingMode("add");
    navigate("onboarding");
  }
  async function selectPerson(id: string) {
    if (id === activePersonId) return;
    setBusyId(id);
    await activatePerson(id);
    setBusyId(null);
  }
  async function removePerson(id: string) {
    setBusyId(id);
    await deletePerson(id);
    setBusyId(null);
  }

  const moon = chart.data?.placements.find((p) => p.name === "Moon");
  const lagna = chart.data?.placements.find((p) => p.name === "Lagna");
  const natalPanchanga = chart.data?.panchanga;

  const rows: Array<{ to: Route | "#pro"; icon: ReactNode; title: string; sub: string }> = [
    {
      to: "dasha",
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
      ),
      title: t("Life periods", "జీవిత దశలు"),
      sub: t("Your vimshottari dasha timeline", "మీ వింశోత్తరి దశల కాలరేఖ"),
    },
    {
      to: "match",
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-2 5 5 0 0 1 9 2c-2 4.5-9 9-9 9Z" />
        </svg>
      ),
      title: t("Match", "పొంతన"),
      sub: t("South Indian ten-porutham compatibility", "దక్షిణ భారత దశ పొరుత్తం పొంతన"),
    },
    {
      to: "remedies",
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M12 3v18M5 8c3 0 5 2 7 4M19 8c-3 0-5 2-7 4" />
        </svg>
      ),
      title: t("Remedies", "పరిహారాలు"),
      sub: t("Safe, low-burden practices — nothing sold", "సురక్షితమైన, తక్కువ భారం ఉన్న ఆచరణలు"),
    },
    {
      to: "prashna",
      icon: (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 3" />
        </svg>
      ),
      title: t("Prashna", "ప్రశ్న"),
      sub: t("Ask this moment — horary consultation", "ఈ క్షణాన్ని అడగండి — తత్కాల ప్రశ్న"),
    },
    {
      to: "#pro",
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      ),
      title: t("Full workspace", "పూర్తి వర్క్‌స్పేస్"),
      sub: t("Shadbala, KP, ashtakavarga and more", "షడ్బలం, KP, అష్టకవర్గ, మరిన్ని"),
    },
  ];

  return (
    <>
      <StatusBar />
      <main className="screen more-screen" id="content">
        <header className="shead headrow">
          <span>
            <p className="eyebrow">{t("Sahadeva", "సహదేవ")}</p>
            <h2>{t("More", "మరిన్ని")}</h2>
          </span>
          <LangToggle />
        </header>

        {account ? (
          <section className="account-area">
            <div className="acctcard">
              <span className="acctav">{(account.name || account.email || "?").trim().charAt(0).toUpperCase()}</span>
              <span className="acctinfo">
                <b>{account.name || t("Your account", "మీ ఖాతా")}</b>
                <span>{account.email}</span>
              </span>
              <button className="acctout" type="button" aria-expanded={accountToolsOpen} onClick={() => setAccountToolsOpen((open) => !open)}>
                {t("Manage", "నిర్వహించు")}
              </button>
            </div>
            {accountToolsOpen && (
              <div className="account-tools">
                <button className="edit" type="button" onClick={exportAccountData}>{t("Download my data", "నా డేటాను డౌన్‌లోడ్ చేయండి")}</button>
                <button className="edit" type="button" onClick={handleSignOut}>{t("Sign out", "సైన్ అవుట్")}</button>
                <details className="delete-account">
                  <summary>{t("Delete account", "ఖాతా తొలగించండి")}</summary>
                  <p>{t("This permanently removes your account, saved profiles, and backed-up conversations.", "ఇది మీ ఖాతా, సేవ్ చేసిన ప్రొఫైల్‌లు మరియు బ్యాకప్ సంభాషణలను శాశ్వతంగా తొలగిస్తుంది.")}</p>
                  <label htmlFor="delete-password">{t("Password", "పాస్‌వర్డ్")}</label>
                  <input id="delete-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
                  <button className="danger-button" type="button" disabled={accountBusy} onClick={handleDeleteAccount}>{accountBusy ? t("Deleting…", "తొలగిస్తోంది…") : t("Permanently delete", "శాశ్వతంగా తొలగించండి")}</button>
                </details>
                {accountMessage && <p className="account-message" role="status">{accountMessage}</p>}
              </div>
            )}
          </section>
        ) : (
          <button className="acctcta" type="button" onClick={() => setAuthOpen(true)}>
            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: "currentColor", fill: "none", strokeWidth: 1.7 }}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
            </svg>
            {t("Create account or sign in", "ఖాతా సృష్టించండి లేదా సైన్ ఇన్")}
          </button>
        )}

        <section className="profiles">
          <p className="sectitle">{t("Your profiles", "మీ ప్రొఫైల్‌లు")}</p>

          {account && people.length > 0 ? (
            <>
              {people.map((person) => {
                const active = person.id === activePersonId;
                return (
                  <div className={`prow2${active ? " active" : ""}`} key={person.id}>
                    <button className="popen" type="button" onClick={() => selectPerson(person.id)} disabled={busyId === person.id}>
                      <span className="pav">{(person.profile?.name || "?").trim().charAt(0).toUpperCase()}</span>
                      <span className="pmeta">
                        <b>{person.profile?.name || t("Unnamed", "పేరు లేదు")}</b>
                        <span>{personSummary(person, lang)}</span>
                      </span>
                      {active && (
                        <span className="pactive" aria-label={t("Active", "క్రియాశీలం")}>
                          <svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7" /></svg>
                        </span>
                      )}
                    </button>
                    {people.length > 1 && (
                      <button className="pdel" type="button" aria-label={t("Remove", "తొలగించు")} disabled={busyId === person.id} onClick={() => removePerson(person.id)}>
                        <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
              <button className="paddrow" type="button" onClick={addPerson}>
                <span className="pav plus">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                </span>
                <span className="pmeta"><b>{t("Add a person", "ఒక వ్యక్తిని జోడించండి")}</b><span>{t("A new individual chart", "కొత్త వ్యక్తిగత జాతకం")}</span></span>
              </button>
              <button className="edit" type="button" onClick={editActive} style={{ marginTop: "var(--space-3)" }}>
                {t("Edit the active person's details", "క్రియాశీల వ్యక్తి వివరాలు మార్చు")}
              </button>
            </>
          ) : profile ? (
            <div className="pcard">
              <p className="pn">{profile.name}</p>
              <dl className="profilefacts">
                <div><dt>{t("Date of birth", "పుట్టిన తేదీ")}</dt><dd className="mono">{profile.date}</dd></div>
                <div><dt>{t("Birth time", "పుట్టిన సమయం")}</dt><dd className="mono">{profile.birthTimeConfidence === "none" ? t("Not known", "తెలియదు") : profile.time}</dd></div>
                <div className="wide"><dt>{t("Place of birth", "పుట్టిన ప్రదేశం")}</dt><dd>{profile.place}</dd></div>
                {lagna && <div><dt>{t("Ascendant (Lagna)", "లగ్న రాశి")}</dt><dd>{signName(lagna.sign, lang)}{lang === "en" ? ` · ${SIGN_GLOSS_EN[lagna.sign]} rising` : ""}</dd></div>}
                {moon && <div><dt>{t("Birth star (Nakshatra)", "జన్మ నక్షత్రం")}</dt><dd>{nakName(moon.nakshatra, lang)}</dd></div>}
                {moon && <div><dt>{t("Moon sign (Rashi)", "చంద్ర రాశి")}</dt><dd>{signName(moon.sign, lang)}{lang === "en" ? ` · ${SIGN_GLOSS_EN[moon.sign]}` : ""}</dd></div>}
              </dl>
              {natalPanchanga && (
                <dl className="profilefacts">
                  <div className="wide"><dt>{t("Birth panchanga", "జన్మ పంచాంగం")}</dt><dd className="mono">{[natalPanchanga.vara, natalPanchanga.tithi, natalPanchanga.nakshatra, natalPanchanga.yoga, natalPanchanga.karana].filter(Boolean).join(" · ")}</dd></div>
                  <div><dt>{t("Paksha", "పక్షం")}</dt><dd>{natalPanchanga.paksha}</dd></div>
                  <div><dt>{t("Moon star, quarter", "నక్షత్ర పాదం")}</dt><dd>{moon ? `${nakName(moon.nakshatra, lang)} · ${t(`pada ${moon.pada}`, `పాదం ${moon.pada}`)}` : "—"}</dd></div>
                </dl>
              )}
              {moon && lagna && (
                <p className="profilehelp">
                  {t(
                    "Lagna is the sign rising at your birth. Nakshatra is the Moon’s birth star; Rashi is the Moon’s zodiac sign.",
                    "లగ్నం మీ పుట్టిన సమయంలో ఉదయించిన రాశి. నక్షత్రం చంద్రుని జన్మ నక్షత్రం; రాశి చంద్రుడు ఉన్న రాశి.",
                  )}
                </p>
              )}
              <button className="edit" type="button" onClick={editActive}>
                {t("Edit birth details", "జనన వివరాలు మార్చు")}
              </button>
              {!account && (
                <p className="small muted" style={{ marginTop: "var(--space-3)" }}>
                  {t("Create an account to save this and add profiles for others.", "దీన్ని భద్రపరచి, ఇతరుల ప్రొఫైల్‌లు జోడించడానికి ఖాతా సృష్టించండి.")}
                </p>
              )}
            </div>
          ) : null}
        </section>

        <div className="navlist">
          {rows.map((r) => (
            <button
              key={r.title}
              className="navrow2"
              type="button"
              onClick={() => {
                if (r.to === "#pro") window.location.hash = "#pro";
                else navigate(r.to);
              }}
            >
              <span className="ic">{r.icon}</span>
              <span className="lbl">
                <b>{r.title}</b>
                <span>{r.sub}</span>
              </span>
              <span className="chev">{CHEV}</span>
            </button>
          ))}
        </div>

        <section className="settings aboutyou">
          <p className="sectitle">{t("About you", "మీ గురించి")}</p>
          <p className="small muted" style={{ marginBottom: "var(--space-2)" }}>
            {t(
              "A line or two about your work, family and what is on your mind. Sahadeva uses it to make answers concrete instead of asking again.",
              "మీ పని, కుటుంబం, మనసులో ఉన్న విషయం గురించి ఒకటి రెండు వాక్యాలు. మళ్లీ అడగకుండా సమాధానాలను నిర్దిష్టంగా ఇవ్వడానికి సహదేవ దీన్ని వాడుతుంది.",
            )}
          </p>
          <textarea
            className="ctxbox"
            rows={3}
            maxLength={LIFE_CONTEXT_MAX}
            placeholder={t("e.g. Software engineer in Hyderabad, married, thinking about moving abroad next year.", "ఉదా. హైదరాబాద్‌లో సాఫ్ట్‌వేర్ ఇంజనీర్, వివాహితుడు, వచ్చే ఏడాది విదేశాలకు వెళ్లాలని ఆలోచన.")}
            value={context}
            onChange={(e) => {
              setContext(e.target.value);
              setContextSaved(false);
            }}
          />
          <div className="ctxrow">
            <span className="small muted">{context.length}/{LIFE_CONTEXT_MAX}</span>
            <button
              className="edit"
              type="button"
              onClick={() => {
                setLifeContext(context);
                setContext(getLifeContext());
                setContextSaved(true);
              }}
            >
              {contextSaved ? t("Saved", "భద్రపరిచారు") : t("Save", "భద్రపరచు")}
            </button>
          </div>
        </section>

        <section className="settings">
          <p className="sectitle">{t("Settings", "సెట్టింగ్‌లు")}</p>
          <div className="setrow">
            <span className="setlbl">
              <b>{t("Language", "భాష")}</b>
              <span>{t("Used across the app and in every answer.", "యాప్ అంతటా, ప్రతి సమాధానంలో వాడబడుతుంది.")}</span>
            </span>
            <LangToggle />
          </div>
        </section>

        <p className="foot">
          {t(
            "Lahiri sidereal · whole-sign houses · computed, not estimated. Astrology is an interpretive cultural practice, not a prediction of events.",
            "లాహిరి అయనాంశ · పూర్ణరాశి భావాలు · గణించినది. జ్యోతిషం ఒక వ్యాఖ్యాన సంప్రదాయం, సంఘటనల జోస్యం కాదు.",
          )}
        </p>
        <nav className="legal-links" aria-label={t("Legal", "చట్టపరమైన సమాచారం")}>
          <a href="/privacy">{t("Privacy", "గోప్యత")}</a>
          <a href="/terms">{t("Terms", "నిబంధనలు")}</a>
          <a href="/support">{t("Support", "సహాయం")}</a>
        </nav>
      </main>
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
      <TabBar current="more" />
    </>
  );
}
