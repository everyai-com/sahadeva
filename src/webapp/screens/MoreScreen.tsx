import { useState } from "react";
import "./more.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { navigate, type Route } from "../router";
import { StatusBar, TabBar } from "../shell";
import { nakName, signName } from "../format";
import { signOut, type Person } from "../api";
import { AuthSheet } from "./AuthSheet";
import { setOnboardingMode } from "../onboardingMode";
import type { ReactNode } from "react";

const CHEV = (
  <svg viewBox="0 0 24 24">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

function personSummary(person: Person): string {
  const p = person.profile;
  if (!p) return "—";
  return [p.date, p.time, p.place].filter(Boolean).join(" · ");
}

export function MoreScreen() {
  const { lang, t } = useLang();
  const { profile, chart, account, people, activePersonId, refreshMe, activatePerson, deletePerson } = useData();
  const [authOpen, setAuthOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleSignOut() {
    await signOut().catch(() => {});
    await refreshMe();
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
          <div className="acctcard">
            <span className="acctav">{(account.name || account.email || "?").trim().charAt(0).toUpperCase()}</span>
            <span className="acctinfo">
              <b>{account.name || t("Your account", "మీ ఖాతా")}</b>
              <span>{account.email}</span>
            </span>
            <button className="acctout" type="button" onClick={handleSignOut}>
              {t("Sign out", "సైన్ అవుట్")}
            </button>
          </div>
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
                        <span>{personSummary(person)}</span>
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
              <p className="pb">
                {profile.date} · {profile.time} · {profile.place}
                {moon && lagna ? (
                  <>
                    <br />
                    {signName(lagna.sign, lang)} lagna · {nakName(moon.nakshatra, lang)} · {signName(moon.sign, lang)}
                  </>
                ) : null}
              </p>
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
      </main>
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
      <TabBar current="more" />
    </>
  );
}
