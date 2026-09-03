import { useEffect, useState } from "react";
import "./remedies.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { StatusBar, TabBar, BackButton } from "../shell";
import { fetchRemedies, type RemedyProtocol, type RemedyPreferences } from "../api";

const TOPICS: Array<{ id: string; en: string; te: string }> = [
  { id: "career", en: "Career", te: "వృత్తి" },
  { id: "wealth", en: "Wealth", te: "సంపద" },
  { id: "relationships", en: "Relationships", te: "సంబంధాలు" },
  { id: "education", en: "Education", te: "చదువు" },
  { id: "property", en: "Property", te: "ఆస్తి" },
  { id: "spirituality", en: "Spirituality", te: "ఆధ్యాత్మికం" },
];

const FAMILY_LABEL: Record<string, { en: string; te: string }> = {
  mantra: { en: "Mantra", te: "మంత్రం" },
  gemstone: { en: "Gemstone", te: "రత్నం" },
  fasting: { en: "Fasting or vrata", te: "ఉపవాసం లేదా వ్రతం" },
  worship: { en: "Homa or worship", te: "హోమం లేదా పూజ" },
  ritual: { en: "Homa or ritual", te: "హోమం లేదా ఆచారం" },
  pilgrimage: { en: "Pilgrimage", te: "తీర్థయాత్ర" },
  muhurta: { en: "Muhurta for a specific act", te: "ఒక నిర్దిష్ట పనికి ముహూర్తం" },
  charity: { en: "Charity with a named material", te: "నిర్దిష్ట వస్తువుతో దానం" },
};
const SUPERVISION_LABEL: Record<string, { en: string; te: string }> = {
  "qualified-teacher": { en: "guru", te: "గురువు" },
  "qualified-practitioner": { en: "practitioner", te: "పండితుడు" },
  "health-screen": { en: "health", te: "ఆరోగ్యం" },
  none: { en: "review", te: "సమీక్ష" },
};

const PREFS: RemedyPreferences = {
  beliefMode: "hindu",
  maximumBurden: "minimal",
  maximumCost: "free",
  allowPrayer: true,
  allowCharity: true,
};

const CHECK = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
);

export function RemediesScreen() {
  const { lang, t } = useLang();
  const { profile } = useData();
  const [topic, setTopic] = useState("career");
  const [data, setData] = useState<RemedyProtocol | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [, force] = useState(0);
  const [note, setNote] = useState<string>(() => {
    try {
      return localStorage.getItem("sahadev.review.note") || "";
    } catch {
      return "";
    }
  });
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    setStatus("loading");
    setData(null);
    fetchRemedies(profile, topic, PREFS)
      .then((r) => alive && (setData(r), setStatus("ready")))
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [profile, topic]);

  const practices = (data?.eligiblePractices ?? []).slice(0, 4);
  // Only the gated families (mantra, gemstone, fasting, worship/ritual, pilgrimage,
  // muhurta, charity) are "held back" — the low-burden ones already appear as practices.
  const held = (data?.remedyFamilyEligibility ?? []).filter((f) => FAMILY_LABEL[f.family]);
  const devata = data?.chartDiagnosis?.devataProfile?.ishtaDevata;
  const supporting = data?.diagnosis.supportingEvidence?.length ?? 0;
  const opposing = data?.diagnosis.opposingEvidence?.length ?? 0;
  const mix = supporting && opposing ? t("mixed", "మిశ్రమం") : supporting ? t("supported", "అనుకూలం") : t("guarded", "జాగ్రత్త");

  function key(id: string) {
    return `sahadev.remedy.${topic}.${id}`;
  }
  const doneCount = practices.filter((p) => {
    try {
      return localStorage.getItem(key(p.id)) === "1";
    } catch {
      return false;
    }
  }).length;

  return (
    <>
      <StatusBar />
      <BackButton to="more" />
      <main className="screen remedies-screen" id="content">
        <header className="shead headrow">
          <span>
            <p className="eyebrow">{t("Safe, low-burden support", "సురక్షితమైన, తక్కువ భారం")}</p>
            <h2>{t("Remedies", "పరిహారాలు")}</h2>
          </span>
          <LangToggle />
        </header>

        <div className="topbtns">
          {TOPICS.map((tp) => (
            <button key={tp.id} className="topbtn" type="button" aria-pressed={topic === tp.id} onClick={() => setTopic(tp.id)}>
              <img src={`/brand/sahadeva/life-area/${tp.id === "wealth" ? "money" : tp.id === "relationships" ? "love" : tp.id}-24.svg`} alt="" />
              {lang === "te" ? tp.te : tp.en}
            </button>
          ))}
        </div>

        {status === "loading" && <p className="muted small">{t("Calculating safe practices…", "సురక్షిత ఆచరణలు లెక్కిస్తోంది…")}</p>}
        {status === "error" && <p className="muted small">{t("Remedies could not be calculated.", "పరిహారాలు లెక్కించలేకపోయాం.")}</p>}

        {status === "ready" && data && (
          <>
            <section className="why">
              <h3>{t("Why these, and nothing more", "ఈవే ఎందుకు, ఇంకేమీ ఎందుకు కాదు")}</h3>
              <p>
                {t(
                  "Support is optional, and only the lowest-burden kind is appropriate. Sahadeva will not escalate to a ritual you did not need.",
                  "పరిహారం ఐచ్ఛికం మాత్రమే, అందులోనూ అతి తక్కువ భారం ఉన్నదే సరిపోతుంది. మీకు అవసరం లేని పూజకు సహదేవ మిమ్మల్ని నెట్టదు.",
                )}
              </p>
              <div className="whyev">
                <span>{`${lang === "te" ? TOPICS.find((x) => x.id === topic)?.te : topic} · ${mix}`}</span>
                <span>{t("uncertainty · low", "అనిశ్చితి · తక్కువ")}</span>
                <span>{t("free · minimal burden", "ఉచితం · అతి తక్కువ భారం")}</span>
              </div>
            </section>

            <section style={{ marginTop: "var(--space-6)" }}>
              <p className="sectitle">{t("What you can actually do", "మీరు నిజంగా చేయగలిగినవి")}</p>
              {practices.length === 0 && <p className="muted small">{t("No practice is required right now.", "ప్రస్తుతం ఏ ఆచరణా అవసరం లేదు.")}</p>}
              {practices.map((p) => {
                let on = false;
                try {
                  on = localStorage.getItem(key(p.id)) === "1";
                } catch {
                  /* ignore */
                }
                return (
                  <div className={`prow${on ? " done" : ""}`} key={p.id}>
                    <button
                      className="pcheck"
                      type="button"
                      aria-pressed={on}
                      aria-label={p.label}
                      onClick={() => {
                        try {
                          localStorage.setItem(key(p.id), on ? "0" : "1");
                        } catch {
                          /* ignore */
                        }
                        force((n) => n + 1);
                      }}
                    >
                      {CHECK}
                    </button>
                    <span className="ptext">
                      <b>{p.label}</b>
                      <p>{p.instructions}</p>
                      <span className="ptag">{`${p.family} · ${p.cost} · ${p.burden}`}</span>
                    </span>
                  </div>
                );
              })}

              {practices.length > 0 && (
                <div className="log">
                  <p className="sectitle">{t("Your log — last 21 days", "మీ నమోదు — గత 21 రోజులు")}</p>
                  <div className="logstrip" role="img" aria-label="21 day log">
                    {Array.from({ length: 21 }, (_, i) => (
                      <i key={i} className={i === 20 ? (doneCount === practices.length ? "today on" : "today") : ""} />
                    ))}
                  </div>
                  <div className="logmeta">
                    <span>{`${doneCount} ${t(`of ${practices.length} done today`, `/ ${practices.length} ఈ రోజు పూర్తి`)}`}</span>
                    <span>{t("nothing is filled in for you", "మీ తరపున ఏదీ నింపబడదు")}</span>
                  </div>
                </div>
              )}
            </section>

            {held.length > 0 && (
              <section className="held">
                <p className="sectitle">{t("Held back until reviewed", "సమీక్ష పూర్తయ్యే వరకు ఆపి ఉంచినవి")}</p>
                {held.map((f) => {
                  const fl = FAMILY_LABEL[f.family];
                  const sv = SUPERVISION_LABEL[f.supervision] || SUPERVISION_LABEL.none;
                  return (
                    <div className="hrow" key={f.family}>
                      <span className="hn">
                        <img src={`/brand/sahadeva/remedy/${f.family === "fasting" ? "vrata" : f.family === "worship" || f.family === "ritual" ? "puja" : f.family === "charity" ? "dana" : f.family}-24.svg`} alt="" />
                        {fl ? (lang === "te" ? fl.te : fl.en) : f.family}
                        <span>{f.reasons?.[0] || f.requiredReview?.[0] || t("Needs independent review before use.", "వాడకముందు స్వతంత్ర సమీక్ష అవసరం.")}</span>
                      </span>
                      <span className="hstat">{lang === "te" ? sv.te : sv.en}</span>
                    </div>
                  );
                })}
              </section>
            )}

            {devata && (devata.deityCandidates?.length || devata.selected?.planet) && (
              <section className="devata">
                <p className="dlbl">{t("CALCULATED SYMBOLIC CANDIDATE", "గణించిన సంకేత అభ్యర్థి")}</p>
                <p className="dv">
                  {devata.deityCandidates?.[0] || "—"}
                  {devata.selected?.planet ? `, ${t("through", "ద్వారా")} ${devata.selected.planet}` : ""}
                </p>
                <p className="dtr">
                  Ishta Devata · ఇష్ట దేవత{devata.targetSignName ? ` · ${devata.targetSignName}` : ""}
                </p>
                <p className="dn">
                  {t(
                    "This is a lineage-specific symbolic candidate produced by one method — not proof of faith, not an obligation, and not the one correct deity for you. If it fits a tradition you already follow, discuss it with a qualified teacher.",
                    "ఇది ఒక పద్ధతి ద్వారా వచ్చిన, ఒక పరంపరకు మాత్రమే వర్తించే సంకేత అభ్యర్థి — ఇది భక్తికి రుజువు కాదు, బాధ్యత కాదు, మీకు సరైన ఒకే ఒక దేవత అంతకంటే కాదు.",
                  )}
                </p>
              </section>
            )}

            <section className="review">
              <h3>{t("Come back and review", "తిరిగి వచ్చి సమీక్షించండి")}</h3>
              <p>
                {data.followUp?.question ||
                  t(
                    "What observable change, if any, actually happened by then? Write it plainly.",
                    "అప్పటికి నిజంగా కనిపించే మార్పు ఏదైనా జరిగిందా? సూటిగా రాయండి.",
                  )}
              </p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Leave this until later.", "తర్వాత వరకు దీన్ని అలాగే ఉంచండి.")} />
              <button
                className="mini"
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem("sahadev.review.note", note);
                  } catch {
                    /* ignore */
                  }
                  setNoteSaved(true);
                  window.setTimeout(() => setNoteSaved(false), 1600);
                }}
              >
                {noteSaved ? t("Saved", "భద్రమైంది") : t("Save note", "గమనిక భద్రపరచు")}
              </button>
            </section>

            <div className="warnbox">
              <p>{t("Sahadeva will not:", "సహదేవ ఇవి చేయదు:")}</p>
              <ul>
                <li>{t("replace medical, legal, financial or mental-health care;", "వైద్య, న్యాయ, ఆర్థిక లేదా మానసిక ఆరోగ్య సంరక్షణకు బదులు కాదు;")}</li>
                <li>{t("sell you a gemstone or a costly ritual;", "మీకు రత్నం లేదా ఖరీదైన పూజ అమ్మదు;")}</li>
                <li>{t("print an initiation-only mantra as a casual instruction;", "దీక్ష అవసరమైన మంత్రాన్ని మామూలు సూచనలా చూపదు;")}</li>
                <li>{t("ask you to continue a fast that conflicts with your health.", "మీ ఆరోగ్యానికి విరుద్ధమైన ఉపవాసాన్ని కొనసాగించమని అడగదు.")}</li>
              </ul>
            </div>
          </>
        )}

        <p className="foot">
          {t(
            "Computed for the selected question. Practice candidates carry their own source status; gated families are withheld pending independent review, not hidden.",
            "ఎంచుకున్న ప్రశ్నకు గణించినది. ఆపి ఉంచిన విభాగాలు స్వతంత్ర సమీక్ష కోసం నిలిపి ఉంచినవి, దాచినవి కావు.",
          )}
        </p>
      </main>
      <TabBar current="more" />
    </>
  );
}
