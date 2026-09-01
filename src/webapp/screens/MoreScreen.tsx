import "./more.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { navigate, type Route } from "../router";
import { StatusBar, TabBar } from "../shell";
import { nakName, signName } from "../format";
import type { ReactNode } from "react";

const CHEV = (
  <svg viewBox="0 0 24 24">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export function MoreScreen() {
  const { lang, t } = useLang();
  const { profile, chart, account } = useData();

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
            <p className="eyebrow">{account ? account.email : t("Sahadev", "సహదేవ్")}</p>
            <h2>{t("More", "మరిన్ని")}</h2>
          </span>
          <LangToggle />
        </header>

        {profile && (
          <section className="pcard">
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
            <button className="edit" type="button" onClick={() => navigate("onboarding")}>
              {t("Edit birth details", "జనన వివరాలు మార్చు")}
            </button>
          </section>
        )}

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
      <TabBar current="more" />
    </>
  );
}
