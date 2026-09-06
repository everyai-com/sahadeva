import { useState } from "react";
import "./prashna.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { StatusBar, TabBar, BackButton } from "../shell";
import { Markdown } from "../md";
import {
  fetchPrashna,
  interpretConsultation,
  recordPrashnaOutcome,
  type PrashnaCategory,
  type PrashnaResult,
  type PrashnaTradition,
} from "../api";

const CATEGORIES: Array<{ id: PrashnaCategory; en: string; te: string }> = [
  { id: "career", en: "Career or job", te: "వృత్తి, ఉద్యోగం" },
  { id: "relationship", en: "Relationship", te: "సంబంధం" },
  { id: "money", en: "Money or agreement", te: "డబ్బు, ఒప్పందం" },
  { id: "property", en: "Property", te: "ఆస్తి" },
  { id: "travel", en: "Travel", te: "ప్రయాణం" },
  { id: "lost-object", en: "Lost object", te: "పోయిన వస్తువు" },
  { id: "health", en: "Health", te: "ఆరోగ్యం" },
  { id: "education", en: "Education", te: "చదువు" },
  { id: "litigation", en: "Litigation", te: "వ్యాజ్యం" },
  { id: "children", en: "Children", te: "సంతానం" },
  { id: "missing-person", en: "Missing person", te: "కనిపించని వ్యక్తి" },
  { id: "general", en: "General", te: "సాధారణం" },
];

const TRADITIONS: Array<{ id: PrashnaTradition; en: string; te: string }> = [
  { id: "integrated", en: "Compare traditions", te: "సంప్రదాయాల పోలిక" },
  { id: "classical", en: "Classical · Chappanna", te: "సంప్రదాయ · చప్పన్న" },
  { id: "tajaka", en: "Tajaka · Prasna Tantra", te: "తాజిక · ప్రశ్న తంత్ర" },
  { id: "systems-approach", en: "Systems' Approach", te: "సిస్టమ్స్ విధానం" },
  { id: "prashna-nadi", en: "Prashna Nadi / KP", te: "ప్రశ్న నాడి / KP" },
];

const HOUSES: Array<{ id: number; en: string; te: string }> = [
  { id: 1, en: "Myself", te: "నా గురించి" },
  { id: 3, en: "Younger sibling / neighbour", te: "తమ్ముడు, చెల్లి / పొరుగు" },
  { id: 4, en: "Mother", te: "తల్లి" },
  { id: 5, en: "Child", te: "సంతానం" },
  { id: 7, en: "Spouse / other party", te: "భాగస్వామి / ఎదుటి వ్యక్తి" },
  { id: 9, en: "Father", te: "తండ్రి" },
  { id: 10, en: "Employer", te: "యజమాని" },
  { id: 11, en: "Elder sibling", te: "అన్న, అక్క" },
];

export function PrashnaScreen() {
  const { lang, t } = useLang();
  const { profile } = useData();
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState<PrashnaCategory>("career");
  const [tradition, setTradition] = useState<PrashnaTradition>("integrated");
  const [referenceHouse, setReferenceHouse] = useState(1);
  const [seedNumber, setSeedNumber] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<PrashnaResult | null>(null);
  const [narration, setNarration] = useState("");
  const [narrating, setNarrating] = useState(false);
  const [outcome, setOutcome] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setStatus("loading");
    setResult(null);
    setNarration("");
    setOutcome("");
    try {
      const data = await fetchPrashna(profile, {
        question,
        category,
        tradition,
        referenceHouse,
        ...(tradition === "prashna-nadi" ? { seedNumber } : {}),
      });
      setResult(data);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const explain = async () => {
    if (!result || !profile) return;
    setNarrating(true);
    try {
      setNarration(await interpretConsultation(result, question, profile.language));
    } catch {
      setNarration(t("Narration is unavailable. The deterministic judgment above still stands.", "వివరణ అందుబాటులో లేదు. పైన గణించిన నిర్ణయం అలాగే ఉంటుంది."));
    }
    setNarrating(false);
  };

  const confirm = async (value: "confirmed" | "partly-confirmed" | "not-confirmed") => {
    if (!result) return;
    try {
      await recordPrashnaOutcome(result.feedback.confirmationToken, value);
      setOutcome(t("Outcome recorded. Thank you — this calibrates the engine.", "ఫలితం నమోదైంది. ధన్యవాదాలు — ఇది ఇంజిన్‌ను మెరుగుపరుస్తుంది."));
    } catch {
      setOutcome(t("Outcome could not be recorded.", "ఫలితం నమోదు కాలేదు."));
    }
  };

  return (
    <>
      <StatusBar />
      <BackButton to="more" />
      <main className="screen prashna-screen" id="content">
        <header className="shead headrow">
          <span>
            <p className="eyebrow">{t("Prashna · horary", "ప్రశ్న · తత్కాల")}</p>
            <h2>{t("Ask this moment", "ఈ క్షణాన్ని అడగండి")}</h2>
          </span>
          <LangToggle />
        </header>

        <p className="muted small">
          {t(
            "The chart is cast for the moment your question reaches Sahadeva — not your birth. Its judgment is structural and auditable, never a certain prediction.",
            "మీ ప్రశ్న సహదేవ్‌కు చేరిన క్షణానికి జాతకం వేస్తారు — మీ జన్మకు కాదు. నిర్ణయం నిర్మాణాత్మకమైనది, తనిఖీ చేయదగినది; ఖచ్చితమైన జోస్యం కాదు.",
          )}
        </p>

        <form className="pqform" onSubmit={submit}>
          <label>
            {t("One clear question", "ఒక స్పష్టమైన ప్రశ్న")}
            <textarea required minLength={3} maxLength={500} rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("Will this role move forward?", "ఈ ఉద్యోగం ముందుకు సాగుతుందా?")} />
          </label>
          <div className="prow2col">
            <label>
              {t("Question area", "ప్రశ్న రంగం")}
              <select value={category} onChange={(e) => setCategory(e.target.value as PrashnaCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{lang === "te" ? c.te : c.en}</option>
                ))}
              </select>
            </label>
            <label>
              {t("Tradition", "సంప్రదాయం")}
              <select value={tradition} onChange={(e) => setTradition(e.target.value as PrashnaTradition)}>
                {TRADITIONS.map((c) => (
                  <option key={c.id} value={c.id}>{lang === "te" ? c.te : c.en}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="prow2col">
            <label>
              {t("Question concerns", "ప్రశ్న ఎవరి గురించి")}
              <select value={referenceHouse} onChange={(e) => setReferenceHouse(Number(e.target.value))}>
                {HOUSES.map((h) => (
                  <option key={h.id} value={h.id}>{lang === "te" ? h.te : h.en}</option>
                ))}
              </select>
            </label>
            {tradition === "prashna-nadi" && (
              <label>
                {t("Seed number (1–249)", "బీజ సంఖ్య (1–249)")}
                <input type="number" min={1} max={249} required value={seedNumber} onChange={(e) => setSeedNumber(Number(e.target.value))} />
              </label>
            )}
          </div>
          <button className="btn primary" type="submit" disabled={status === "loading" || !profile}>
            {status === "loading" ? t("Casting the question chart…", "ప్రశ్న జాతకం వేస్తోంది…") : t("Ask Sahadeva now", "ఇప్పుడు అడగండి")}
          </button>
          {status === "error" && <p className="error">{t("The Prashna consultation could not be calculated.", "ప్రశ్న జాతకం లెక్కించలేకపోయాం.")}</p>}
        </form>

        {result && (
          <article className={`pqresult ${result.judgment.direction}`}>
            <p className="eyebrow">{t("Prashna judgment · structural", "ప్రశ్న నిర్ణయం · నిర్మాణాత్మకం")}</p>
            <h3>
              {result.judgment.score === null
                ? t("No judgment forced", "బలవంతపు నిర్ణయం లేదు")
                : t(`Direction ${result.judgment.direction} · score ${result.judgment.score}`, `దిశ ${result.judgment.direction} · స్కోరు ${result.judgment.score}`)}
            </h3>
            {result.judgment.rationale.slice(0, 6).map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
            <button className="btn" type="button" onClick={explain} disabled={narrating}>
              {narrating ? t("Explaining…", "వివరిస్తోంది…") : t("Explain compassionately", "అర్థమయ్యేలా వివరించు")}
            </button>
            {narration && <div className="md pqnarration"><Markdown text={narration} /></div>}
            <details className="jy">
              <summary>{t("Evidence and uncertainty", "ఆధారాలు, అనిశ్చితి")}</summary>
              <div className="jybody">
                {(result.methodSelection.unavailableCapabilities ?? []).map((item) => (
                  <div className="jrow" key={item}><b>{t("Not yet calculated", "ఇంకా లెక్కించలేదు")}</b><span className="tr">{item}</span></div>
                ))}
                {result.observations.map((item) => (
                  <div className="jrow" key={item.id}>
                    <b>{item.label}</b>
                    <span className="tr">{item.facts.join(" · ")} · {item.provenance.tier}</span>
                  </div>
                ))}
                {result.uncertainty.map((item) => (
                  <div className="jrow" key={item}><b>{item}</b><span className="tr">{t("Uncertainty", "అనిశ్చితి")}</span></div>
                ))}
              </div>
            </details>
            {result.remedies.length > 0 && (
              <div className="pqrem">
                <p className="sectitle">{t("Optional low-risk practice", "ఐచ్ఛిక తక్కువ-ప్రమాద ఆచరణ")}</p>
                {result.remedies.map((remedy) => (
                  <div className="jrow" key={remedy.id}>
                    <b>{remedy.label} — {remedy.instructions}</b>
                    <span className="tr">{remedy.timing} · {remedy.reviewStatus}</span>
                  </div>
                ))}
              </div>
            )}
            {result.feedback.suggestedFollowUpAt && (
              <div className="pqfb">
                <p className="sectitle">{t("When it resolves, calibrate the engine", "ఫలితం తెలిశాక ఇంజిన్‌కు తెలపండి")}</p>
                <div className="pqfbrow">
                  <button className="btn" type="button" onClick={() => confirm("confirmed")}>{t("Confirmed", "నిజమైంది")}</button>
                  <button className="btn" type="button" onClick={() => confirm("partly-confirmed")}>{t("Partly", "పాక్షికం")}</button>
                  <button className="btn" type="button" onClick={() => confirm("not-confirmed")}>{t("Not confirmed", "నిజం కాలేదు")}</button>
                </div>
                {outcome && <p className="small">{outcome}</p>}
              </div>
            )}
            <p className="limitnote">{result.safety.notice}</p>
          </article>
        )}
      </main>
      <TabBar current="more" />
    </>
  );
}
