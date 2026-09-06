import { useEffect, useMemo, useState } from "react";
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

const PREFS_KEY = "sahadev.remedy.prefs.v1";
const DEFAULT_PREFS: RemedyPreferences = {
  beliefMode: "hindu",
  maximumBurden: "minimal",
  maximumCost: "free",
  allowPrayer: true,
  allowCharity: true,
};
function loadPrefs(): RemedyPreferences {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<RemedyPreferences>;
    return {
      beliefMode: raw.beliefMode === "spiritual" || raw.beliefMode === "tradition-specific" ? raw.beliefMode : "hindu",
      maximumBurden: raw.maximumBurden === "moderate" ? "moderate" : "minimal",
      maximumCost: raw.maximumCost === "low" ? "low" : "free",
      allowPrayer: raw.allowPrayer !== false,
      allowCharity: raw.allowCharity !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

const CHECK = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
);

type CompletionLog = Record<string, string[]>;

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastDateKeys(count: number): string[] {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - index));
    return localDateKey(date);
  });
}

export function RemediesScreen() {
  const { lang, t } = useLang();
  const { profile } = useData();
  const [topic, setTopic] = useState("career");
  const [prefs, setPrefs] = useState<RemedyPreferences>(loadPrefs);
  const [data, setData] = useState<RemedyProtocol | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [completionLog, setCompletionLog] = useState<CompletionLog>({});
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
    fetchRemedies(profile, topic, prefs)
      .then((r) => alive && (setData(r), setStatus("ready")))
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [profile, topic, prefs]);

  function updatePrefs(next: RemedyPreferences) {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const practices = (data?.eligiblePractices ?? []).slice(0, 4);
  // Only the gated families (mantra, gemstone, fasting, worship/ritual, pilgrimage,
  // muhurta, charity) are "held back" — the low-burden ones already appear as practices.
  const held = (data?.remedyFamilyEligibility ?? []).filter((f) => FAMILY_LABEL[f.family]);
  const devata = data?.chartDiagnosis?.devataProfile?.ishtaDevata;
  const supporting = data?.diagnosis.supportingEvidence?.length ?? 0;
  const opposing = data?.diagnosis.opposingEvidence?.length ?? 0;
  const lalKitab = data?.lalKitabInference;
  const mix = supporting && opposing ? t("mixed", "మిశ్రమం") : supporting ? t("supported", "అనుకూలం") : t("guarded", "జాగ్రత్త");

  const profileScope = profile
    ? `${profile.date}:${profile.time}:${profile.latitude.toFixed(3)}:${profile.longitude.toFixed(3)}`
    : "empty";
  const logKey = `sahadev.remedy.log.v1:${profileScope}:${topic}`;
  const todayKey = localDateKey();
  const visibleDates = useMemo(() => lastDateKeys(21), [todayKey]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(logKey) || "{}") as CompletionLog;
      setCompletionLog(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {});
    } catch {
      setCompletionLog({});
    }
  }, [logKey]);

  // Bring the old undated checkboxes forward as today's entries once.
  useEffect(() => {
    if (!practices.length) return;
    setCompletionLog((current) => {
      const migrated = practices
        .filter((practice) => {
          try { return localStorage.getItem(`sahadev.remedy.${topic}.${practice.id}`) === "1"; }
          catch { return false; }
        })
        .map((practice) => practice.id);
      if (!migrated.length || current[todayKey]?.length) return current;
      const next = { ...current, [todayKey]: migrated };
      try { localStorage.setItem(logKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [logKey, practices, todayKey, topic]);

  const todayDone = completionLog[todayKey] ?? [];
  const doneCount = practices.filter((practice) => todayDone.includes(practice.id)).length;

  function togglePractice(id: string) {
    setCompletionLog((current) => {
      const today = current[todayKey] ?? [];
      const nextToday = today.includes(id) ? today.filter((item) => item !== id) : [...today, id];
      const next = { ...current, [todayKey]: nextToday };
      try { localStorage.setItem(logKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

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

        <details className="prefs">
          <summary>{t("Your limits — burden, cost, belief", "మీ పరిమితులు — భారం, ఖర్చు, నమ్మకం")}</summary>
          <div className="prefsgrid">
            <label>
              {t("Belief", "నమ్మకం")}
              <select value={prefs.beliefMode} onChange={(e) => updatePrefs({ ...prefs, beliefMode: e.target.value as RemedyPreferences["beliefMode"] })}>
                <option value="hindu">{t("Hindu", "హిందూ")}</option>
                <option value="spiritual">{t("Spiritual, non-specific", "ఆధ్యాత్మికం")}</option>
                <option value="tradition-specific">{t("My own tradition", "నా సొంత సంప్రదాయం")}</option>
              </select>
            </label>
            <label>
              {t("Maximum burden", "గరిష్ట భారం")}
              <select value={prefs.maximumBurden} onChange={(e) => updatePrefs({ ...prefs, maximumBurden: e.target.value as RemedyPreferences["maximumBurden"] })}>
                <option value="minimal">{t("Minimal", "అతి తక్కువ")}</option>
                <option value="moderate">{t("Moderate", "మధ్యస్థం")}</option>
              </select>
            </label>
            <label>
              {t("Maximum cost", "గరిష్ట ఖర్చు")}
              <select value={prefs.maximumCost} onChange={(e) => updatePrefs({ ...prefs, maximumCost: e.target.value as RemedyPreferences["maximumCost"] })}>
                <option value="free">{t("Free", "ఉచితం")}</option>
                <option value="low">{t("Low", "తక్కువ")}</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={prefs.allowPrayer} onChange={(e) => updatePrefs({ ...prefs, allowPrayer: e.target.checked })} />
              {t("Include prayer", "ప్రార్థన ఉండవచ్చు")}
            </label>
            <label className="check">
              <input type="checkbox" checked={prefs.allowCharity} onChange={(e) => updatePrefs({ ...prefs, allowCharity: e.target.checked })} />
              {t("Include charity", "దానం ఉండవచ్చు")}
            </label>
          </div>
          <p className="small muted">{t("Stricter limits mean fewer, lighter suggestions — never stronger ones.", "కఠిన పరిమితులు అంటే తక్కువ, తేలికైన సూచనలు — బలమైనవి కావు.")}</p>
        </details>

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
                <span>{prefs.maximumCost === "free" ? t("free", "ఉచితం") : t("low cost", "తక్కువ ఖర్చు")} · {prefs.maximumBurden === "minimal" ? t("minimal burden", "అతి తక్కువ భారం") : t("moderate burden", "మధ్యస్థ భారం")}</span>
              </div>
              {(supporting > 0 || opposing > 0) && (
                <details className="evledger">
                  <summary>{t(`Evidence: ${supporting} supporting · ${opposing} opposing`, `ఆధారాలు: ${supporting} అనుకూలం · ${opposing} ప్రతికూలం`)}</summary>
                  {data?.diagnosis.supportingEvidence.map((item) => (
                    <p className="evsup" key={item}>{item}</p>
                  ))}
                  {data?.diagnosis.opposingEvidence.map((item) => (
                    <p className="evopp" key={item}>{item}</p>
                  ))}
                </details>
              )}
            </section>

            <section style={{ marginTop: "var(--space-6)" }}>
              <p className="sectitle">{t("What you can actually do", "మీరు నిజంగా చేయగలిగినవి")}</p>
              {practices.length === 0 && <p className="muted small">{t("No practice is required right now.", "ప్రస్తుతం ఏ ఆచరణా అవసరం లేదు.")}</p>}
              {practices.map((p) => {
                const on = todayDone.includes(p.id);
                return (
                  <div className={`prow${on ? " done" : ""}`} key={p.id}>
                    <button
                      className="pcheck"
                      type="button"
                      aria-pressed={on}
                      aria-label={p.label}
                      onClick={() => togglePractice(p.id)}
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
                    {visibleDates.map((date, index) => {
                      const count = completionLog[date]?.filter((id) => practices.some((practice) => practice.id === id)).length ?? 0;
                      const complete = practices.length > 0 && count === practices.length;
                      const label = `${date}: ${count} ${t("completed", "పూర్తయ్యాయి")}`;
                      return <i key={date} className={`${count ? "on" : ""}${complete ? " full" : ""}${index === 20 ? " today" : ""}`} title={label} aria-label={label} />;
                    })}
                  </div>
                  <div className="logmeta">
                    <span>{`${doneCount} ${t(`of ${practices.length} done today`, `/ ${practices.length} ఈ రోజు పూర్తి`)}`}</span>
                    <span>{t("nothing is filled in for you", "మీ తరపున ఏదీ నింపబడదు")}</span>
                  </div>
                </div>
              )}
            </section>

            {lalKitab && (
              <section className="lklogic">
                <p className="sectitle">{t("Lal Kitab reasoning", "లాల్ కితాబ్ తర్కం")}</p>
                <h3>{t("Calculated first. Explained step by step.", "మొదట గణన. తరువాత దశలవారీ వివరణ.")}</h3>
                <p className="lklead">
                  {t(
                    "This result was derived from the chart's fixed houses and Lal Kitab rule order. The engine did not search for a matching paragraph to produce the decision.",
                    "ఈ ఫలితం స్థిర భావాలు మరియు లాల్ కితాబ్ నియమ క్రమం నుంచి గణించబడింది. నిర్ణయం కోసం సరిపోయే పేరాను వెతకాలేదు.",
                  )}
                </p>
                <div className="lkfacts">
                  <span>{lalKitab.computation.retrievalRequired ? t("retrieval used", "శోధన వాడింది") : t("no retrieval", "శోధన లేదు")}</span>
                  <span>{`${lalKitab.diagnoses.length} ${t("diagnosed interactions", "గుర్తించిన పరస్పర ప్రభావాలు")}`}</span>
                  <span>{lalKitab.remedyPlan.outcome}</span>
                </div>
                <div className="lkdecision">
                  <b>{`${t("Lal Kitab prediction", "లాల్ కితాబ్ అంచనా")} · ${lalKitab.topicPrediction.topic} · ${lalKitab.topicPrediction.overall}`}</b>
                  <p>{lalKitab.topicPrediction.primaryStatement}</p>
                  <small>{lalKitab.topicPrediction.calculationBasis}</small>
                </div>
                {lalKitab.predictions.slice(0, 3).map((prediction) => (
                  <div className="lkdecision" key={prediction.id}>
                    <b>{`${prediction.planet} · H${prediction.house} · ${prediction.direction}`}</b>
                    <p>{prediction.statement}</p>
                    <small>{`${prediction.horizon} · ${prediction.confidence}`}</small>
                  </div>
                ))}
                {lalKitab.remedyPlan.ordered.slice(0, 4).map((item) => (
                  <div className="lkdecision" key={`${item.planet}-${item.house}`}>
                    <b>{`${item.priority}. ${item.planet} · H${item.house}`}</b>
                    <p>{item.decision.replaceAll("-", " ")}</p>
                    <small>
                      {item.targetPlanets.length
                        ? `${t("Remedy principle", "పరిహార సూత్రం")}: ${item.targetPlanets.join(" + ")} · ${item.houseMethod}`
                        : t("No automatic remedy target", "స్వయంచాలక పరిహార లక్ష్యం లేదు")}
                    </small>
                  </div>
                ))}
                <ol className="lktrace">
                  {lalKitab.explanationTrace.map((step) => (
                    <li key={step.order}>
                      <b>{step.rule}</b>
                      <span>{step.conclusion}</span>
                    </li>
                  ))}
                </ol>
                <p className="lksequence">{lalKitab.remedyPlan.sequencingRule}</p>
              </section>
            )}

            {data && data.availableChoices.length > 0 && (
              <section className="choices">
                <p className="sectitle">{t("Ways you could begin", "మీరు మొదలుపెట్టగల మార్గాలు")}</p>
                {data.availableChoices.map((choice) => (
                  <details className="choice" key={choice.family}>
                    <summary><b>{FAMILY_LABEL[choice.family] ? (lang === "te" ? FAMILY_LABEL[choice.family].te : FAMILY_LABEL[choice.family].en) : choice.family}</b><span>{choice.availability}</span></summary>
                    {choice.choicePrompt && <p>{choice.choicePrompt}</p>}
                  </details>
                ))}
              </section>
            )}

            {held.length > 0 && (
              <section className="held">
                <p className="sectitle">{t("Held back until reviewed", "సమీక్ష పూర్తయ్యే వరకు ఆపి ఉంచినవి")}</p>
                {held.map((f) => {
                  const fl = FAMILY_LABEL[f.family];
                  const sv = SUPERVISION_LABEL[f.supervision] || SUPERVISION_LABEL.none;
                  return (
                    <details className="hrow2" key={f.family}>
                      <summary>
                        <span className="hn">
                          <img src={`/brand/sahadeva/remedy/${f.family === "fasting" ? "vrata" : f.family === "worship" || f.family === "ritual" ? "puja" : f.family === "charity" ? "dana" : f.family}-24.svg`} alt="" />
                          {fl ? (lang === "te" ? fl.te : fl.en) : f.family}
                        </span>
                        <span className="hstat">{lang === "te" ? sv.te : sv.en}</span>
                      </summary>
                      <div className="hdetail">
                        {f.reasons.map((reason) => (
                          <p key={reason}><b>{t("Why held", "ఎందుకు ఆపాం")}:</b> {reason}</p>
                        ))}
                        {f.requiredReview.map((item) => (
                          <p key={item}><b>{t("Needs review", "సమీక్ష కావాలి")}:</b> {item}</p>
                        ))}
                        {f.contraindications.map((item) => (
                          <p key={item}><b>{t("Do not use when", "ఎప్పుడు వద్దు")}:</b> {item}</p>
                        ))}
                        <p><b>{t("Supervision", "పర్యవేక్షణ")}:</b> {lang === "te" ? sv.te : sv.en}</p>
                      </div>
                    </details>
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
