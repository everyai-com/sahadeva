import { useEffect, useState } from "react";
import "./match.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { StatusBar, TabBar, BackButton } from "../shell";
import { fetchCompatibility, type Compatibility, type Profile } from "../api";
import { nakName, signName } from "../format";

const PORUTHAM_META: Record<string, { te: string; tr: string }> = {
  dina: { te: "పగటి నక్షత్ర పొంతన", tr: "Dina · దిన · தின" },
  gana: { te: "స్వభావ గణం", tr: "Gana · గణ · கண" },
  mahendra: { te: "వంశ కొనసాగింపు", tr: "Mahendra · మహేంద్ర · மகேந்திர" },
  "stree-dheergha": { te: "స్త్రీ దీర్ఘ క్షేమం", tr: "Sthree Dheergha · స్త్రీ దీర్ఘ" },
  yoni: { te: "సహజ అనుకూలత", tr: "Yoni · యోని · யோனி" },
  rashi: { te: "రాశి సంబంధం", tr: "Rashi · రాశి · ராசி" },
  rasyadhipati: { te: "రాశ్యాధిపతుల మైత్రి", tr: "Rasyadhipati · రాశ్యాధిపతి" },
  vashya: { te: "పరస్పర ప్రభావం", tr: "Vashya · వశ్య · வசிய" },
  rajju: { te: "రజ్జు ఘర్షణ", tr: "Rajju · రజ్జు · ரஜ்ஜு" },
  vedha: { te: "వేధ జంట", tr: "Vedha · వేధ · வேத" },
};

const PORUTHAM_MEANING: Record<string, { en: string; te: string }> = {
  dina: { en: "day-to-day wellbeing and mutual support", te: "రోజువారీ క్షేమం, పరస్పర సహకారం" },
  gana: { en: "temperament and instinctive style", te: "స్వభావం, సహజ స్పందన తీరు" },
  mahendra: { en: "growth and continuity of family life", te: "కుటుంబ జీవితం ఎదగడం, కొనసాగడం" },
  "stree-dheergha": { en: "traditional long-term welfare", te: "సాంప్రదాయ దీర్ఘకాల క్షేమం" },
  yoni: { en: "physical and instinctive compatibility", te: "శారీరక, సహజ అనుకూలత" },
  rashi: { en: "emotional rhythm and Moon-sign relationship", te: "భావోద్వేగ లయ, చంద్ర రాశుల సంబంధం" },
  rasyadhipati: { en: "cooperation between the Moon-sign rulers", te: "చంద్ర రాశి అధిపతుల సహకారం" },
  vashya: { en: "influence, adjustment and give-and-take", te: "ప్రభావం, సర్దుబాటు, ఇచ్చిపుచ్చుకోవడం" },
  rajju: { en: "a traditional long-term stability caution", te: "సాంప్రదాయ దీర్ఘకాల స్థిరత్వ హెచ్చరిక" },
  vedha: { en: "a traditional obstruction or friction check", te: "సాంప్రదాయ అడ్డంకి లేదా ఘర్షణ పరీక్ష" },
};

type PlaceHit = { place: string; latitude: number; longitude: number; timezone?: string; timezoneOffset: number };

export function MatchScreen() {
  const { lang, t } = useLang();
  const { profile } = useData();

  const [pname, setPname] = useState("");
  const [pdate, setPdate] = useState("");
  const [ptime, setPtime] = useState("");
  const [pquery, setPquery] = useState("");
  const [presults, setPresults] = useState<PlaceHit[] | null>(null);
  const [pplace, setPplace] = useState<PlaceHit | null>(null);

  const [result, setResult] = useState<Compatibility | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openK, setOpenK] = useState<string | null>(null);

  useEffect(() => {
    const q = pquery.trim();
    if (q.length < 2) {
      setPresults(null);
      return;
    }
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/locations/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ place: q }),
        });
        const j = await res.json();
        if (res.ok) setPresults([j as PlaceHit]);
        else if (res.status === 409 && Array.isArray(j.candidates))
          setPresults(j.candidates.map((c: { label: string; latitude: number; longitude: number; timezone?: string; timezoneOffset: number }) => ({ place: c.label, latitude: c.latitude, longitude: c.longitude, timezone: c.timezone, timezoneOffset: c.timezoneOffset })));
        else setPresults([]);
      } catch {
        setPresults([]);
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [pquery]);

  const canCheck = !!profile && !!pname.trim() && !!pdate && !!ptime && !!pplace;

  async function check() {
    if (!profile || !pplace) return;
    setBusy(true);
    setError(null);
    const partner: Profile = {
      name: pname.trim() || "Partner",
      date: pdate,
      time: ptime,
      place: pplace.place,
      latitude: pplace.latitude,
      longitude: pplace.longitude,
      timezone: pplace.timezone,
      timezoneOffset: pplace.timezoneOffset,
      language: lang,
    };
    try {
      const c = await fetchCompatibility(profile, partner);
      setResult(c);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StatusBar />
      <BackButton to="more" />
      <main className="screen match-screen" id="content">
        <header className="shead headrow">
          <span>
            <p className="eyebrow">{t("South Indian ten-porutham", "దక్షిణ భారత దశ పొరుత్తం")}</p>
            <h2>{t("Match", "పొంతన")}</h2>
          </span>
          <LangToggle />
        </header>

        {!result ? (
          <section className="pform">
            <div className="partner-intro">
              <span className="partner-step">2</span>
              <div>
                <h3>{t("When was your partner born?", "మీ భాగస్వామి ఎప్పుడు పుట్టారు?")}</h3>
                <p>{t("Enter their details just as you entered yours. Accurate details make both matching methods more useful.", "మీ వివరాలు ఇచ్చినట్టే వారి వివరాలు కూడా ఇవ్వండి. ఖచ్చితమైన వివరాలు రెండు పొంతన పద్ధతులనూ మరింత ఉపయోగకరంగా చేస్తాయి.")}</p>
              </div>
            </div>
            <div className="fld">
              <label>{t("Name", "పేరు")}</label>
              <input type="text" value={pname} onChange={(e) => setPname(e.target.value)} placeholder={t("Their name", "వారి పేరు")} />
            </div>
            <div className="fld row2">
              <div>
                <label>{t("Date of birth", "పుట్టిన తేదీ")}</label>
                <input type="date" value={pdate} onChange={(e) => setPdate(e.target.value)} />
              </div>
              <div>
                <label>{t("Time", "సమయం")}</label>
                <input type="time" value={ptime} onChange={(e) => setPtime(e.target.value)} />
                <span className="fieldhelp">{t("Use the recorded birth time; some checks depend on it.", "నమోదైన జనన సమయాన్ని ఇవ్వండి; కొన్ని పరీక్షలు దానిపై ఆధారపడతాయి.")}</span>
              </div>
            </div>
            <div className="fld">
              <label>{t("Place of birth", "జనన స్థలం")}</label>
              <input
                type="text"
                value={pquery}
                onChange={(e) => {
                  setPquery(e.target.value);
                  setPplace(null);
                }}
                placeholder={t("Start typing a place…", "ప్రదేశం టైప్ చేయడం మొదలుపెట్టండి…")}
              />
              <div className="presults">
                {presults?.length === 0 && <p className="dnote">{t("Couldn’t find that place. Try the district name.", "ఆ ప్రదేశం దొరకలేదు. జిల్లా పేరుతో ప్రయత్నించండి.")}</p>}
                {presults?.map((hit, i) => (
                  <button
                    key={i}
                    className="pres"
                    type="button"
                    aria-pressed={pplace?.place === hit.place}
                    onClick={() => {
                      setPplace(hit);
                      setPquery(hit.place);
                    }}
                  >
                    <b>{hit.place}</b>
                    <span>{hit.latitude.toFixed(2)} N, {hit.longitude.toFixed(2)} E</span>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="dnote" style={{ color: "var(--danger)" }}>{error}</p>}
            <div className="actions">
              <button className="btn" type="button" disabled={!canCheck || busy} onClick={check}>
                {busy ? t("Calculating…", "లెక్కిస్తోంది…") : t("Check the match", "పొంతన చూడండి")}
              </button>
            </div>
          </section>
        ) : (
          <Results result={result} openK={openK} setOpenK={setOpenK} onReset={() => setResult(null)} />
        )}

        <p className="foot">
          {t(
            "Lahiri sidereal · computed. Tamil, Telugu, Kannada and Kerala regional exceptions need a practitioner’s review — take this to your family astrologer.",
            "లాహిరి అయనాంశ · గణించినది. ప్రాంతీయ మినహాయింపులకు పండితుని సమీక్ష అవసరం — దీన్ని మీ కుటుంబ జ్యోతిష్యుని దగ్గరకు తీసుకెళ్లండి.",
          )}
        </p>
      </main>
      <TabBar current="more" />
    </>
  );
}

const YES = (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <circle cx="6" cy="6" r="5" fill="currentColor" />
  </svg>
);
const NO = (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M6 0.5 11.5 10.5 0.5 10.5Z" fill="currentColor" />
  </svg>
);

function Results({
  result,
  openK,
  setOpenK,
  onReset,
}: {
  result: Compatibility;
  openK: string | null;
  setOpenK: (v: string | null) => void;
  onReset: () => void;
}) {
  const { lang, t } = useLang();
  const { subjects, porutham, ashtakoota, kujaDosha } = result;
  const pass = porutham.summary.compatible;
  const total = porutham.summary.total;
  const passedChecks = porutham.checks.filter((check) => check.compatible);
  const failedChecks = porutham.checks.filter((check) => !check.compatible);
  const sensitiveFailures = failedChecks.filter((check) => check.id === "rajju" || check.id === "vedha");
  const kujaBalanced = kujaDosha.balance.balanced;
  const level = sensitiveFailures.length || !kujaBalanced ? "review" : pass >= 8 ? "supportive" : pass >= 6 ? "mixed" : "caution";
  const conclusion = level === "supportive"
    ? t("Broadly supportive match", "మొత్తంగా అనుకూలమైన పొంతన")
    : level === "mixed"
      ? t("Promising, with points to discuss", "ఆశాజనకం, కానీ మాట్లాడుకోవాల్సిన అంశాలు ఉన్నాయి")
      : level === "review"
        ? t("Mixed match — review the cautions", "మిశ్రమ పొంతన — హెచ్చరికలను పరిశీలించండి")
        : t("Several areas need careful consideration", "అనేక అంశాలను జాగ్రత్తగా పరిశీలించాలి");

  return (
    <>
      <section className="pair">
        <span className="pp">
          <b>{subjects.bride.name}</b>
          <span>
            {signName(subjects.bride.moon.sign, lang)}
            <br />
            {nakName(subjects.bride.moon.nakshatra, lang)}, pada {subjects.bride.moon.pada}
          </span>
        </span>
        <span className="pairx">×</span>
        <span className="pp">
          <b>{subjects.groom.name}</b>
          <span>
            {signName(subjects.groom.moon.sign, lang)}
            <br />
            {nakName(subjects.groom.moon.nakshatra, lang)}, pada {subjects.groom.moon.pada}
          </span>
        </span>
      </section>

      <section className="verdict">
        <p className="vnum">
          <b>{pass}</b>
          <span>{t(`of ${total} checks agree`, `పరీక్షలలో సరిపోయినవి (${total}కి)`)}</span>
        </p>
        <p className="vtitle">{conclusion}</p>
        <p className="vtext">{t(
          level === "supportive"
            ? "The traditional indicators are mostly aligned. This supports exploring the relationship further, while real-life communication and shared decisions remain more important than the score."
            : level === "mixed"
              ? "More checks agree than disagree. The match is not a rejection, but the areas below deserve an honest conversation before making a decision."
              : level === "review"
                ? "Several indicators agree, but at least one traditionally sensitive check or the Mars balance needs closer review. Do not decide from the total alone."
                : "The traditional framework finds more friction than ease. Treat this as a prompt for careful discussion and qualified review—not as an automatic rejection.",
          level === "supportive"
            ? "సాంప్రదాయ సూచనలు ఎక్కువగా అనుకూలంగా ఉన్నాయి. సంబంధాన్ని ముందుకు పరిశీలించవచ్చు; అయితే స్కోరు కంటే నిజ జీవిత సంభాషణ, ఉమ్మడి నిర్ణయాలే ముఖ్యమైనవి."
            : level === "mixed"
              ? "సరిపోని వాటికంటే సరిపోయే పరీక్షలు ఎక్కువ. ఇది తిరస్కరణ కాదు, కానీ నిర్ణయానికి ముందు కింది అంశాలపై నిజాయితీగా మాట్లాడాలి."
              : level === "review"
                ? "కొన్ని సూచనలు అనుకూలంగా ఉన్నా, కనీసం ఒక సున్నితమైన సాంప్రదాయ పరీక్ష లేదా కుజ సమతుల్యతను దగ్గరగా పరిశీలించాలి. మొత్తం సంఖ్యతో మాత్రమే నిర్ణయించవద్దు."
                : "ఈ సాంప్రదాయ పద్ధతిలో సౌలభ్యం కంటే ఘర్షణ సూచనలు ఎక్కువగా ఉన్నాయి. ఇది ఆటోమేటిక్ తిరస్కరణ కాదు—జాగ్రత్తగా మాట్లాడి, నిపుణుల సమీక్ష తీసుకోండి.",
        )}</p>
        <div className="vmeter" role="img" aria-label={`${pass} of ${total} checks agree`}>
          {porutham.checks.map((k) => (
            <i key={k.id} className={k.compatible ? "" : "no"} />
          ))}
        </div>
      </section>

      <section className="match-summary">
        <div className="summary-column good">
          <p className="sectitle">{t("What supports the match", "పొంతనకు అనుకూలమైనవి")}</p>
          <ul>
            {passedChecks.slice(0, 4).map((check) => (
              <li key={check.id}><b>{check.label}</b><span>{lang === "te" ? PORUTHAM_MEANING[check.id]?.te : PORUTHAM_MEANING[check.id]?.en}</span></li>
            ))}
          </ul>
        </div>
        <div className="summary-column care">
          <p className="sectitle">{t("What needs attention", "శ్రద్ధ అవసరమైనవి")}</p>
          {failedChecks.length ? (
            <ul>
              {failedChecks.map((check) => (
                <li key={check.id}><b>{check.label}</b><span>{lang === "te" ? PORUTHAM_MEANING[check.id]?.te : PORUTHAM_MEANING[check.id]?.en}</span></li>
              ))}
              {!kujaBalanced && <li><b>{t("Mars balance", "కుజ సమతుల్యత")}</b><span>{t("The two charts show different Kuja-presence states.", "రెండు జాతకాల్లో కుజ స్థితి భిన్నంగా ఉంది.")}</span></li>}
            </ul>
          ) : <p>{t("No Porutham caution was flagged in this baseline.", "ఈ ప్రాథమిక పద్ధతిలో పొరుత్తం హెచ్చరిక ఏదీ కనిపించలేదు.")}</p>}
        </div>
      </section>

      <section className="conversation-card">
        <p className="sectitle">{t("Before you decide, discuss these together", "నిర్ణయానికి ముందు ఇద్దరూ ఇవి మాట్లాడుకోండి")}</p>
        <ol>
          <li>{t("How do we handle disagreement, anger and repair?", "భేదాభిప్రాయం, కోపం వచ్చినప్పుడు ఎలా పరిష్కరించుకుంటాం?")}</li>
          <li>{t("Do we agree about money, work, family boundaries and where to live?", "డబ్బు, పని, కుటుంబ హద్దులు, ఎక్కడ ఉండాలి అనే విషయాల్లో ఏకాభిప్రాయం ఉందా?")}</li>
          <li>{t("Can both people choose freely, without pressure from either family?", "రెండు కుటుంబాల ఒత్తిడి లేకుండా ఇద్దరూ స్వేచ్ఛగా నిర్ణయించగలరా?")}</li>
        </ol>
        <p>{t(`Reference score: ${ashtakoota.score}/${ashtakoota.maximum}. It adds another traditional lens, not a final verdict.`, `సూచన స్కోరు: ${ashtakoota.score}/${ashtakoota.maximum}. ఇది మరో సాంప్రదాయ కోణం మాత్రమే, తుది తీర్పు కాదు.`)}</p>
      </section>

      <section style={{ marginTop: "var(--space-6)" }}>
        <p className="sectitle">{t("The ten checks — tap any one to read the rule", "పది పరీక్షలు — ఏదైనా ఒకటి నొక్కి నియమం చదవండి")}</p>
        {porutham.checks.map((k) => {
          const meta = PORUTHAM_META[k.id];
          const open = openK === k.id;
          return (
            <div className="krow" key={k.id}>
              <button className="khead" type="button" aria-expanded={open} onClick={() => setOpenK(open ? null : k.id)}>
                <span className="kname">
                  {lang === "te" && meta ? meta.te : k.label}
                  <span>{meta ? meta.tr : k.id}</span>
                </span>
                <span className={`kstat ${k.compatible ? "kyes" : "kno"}`}>
                  {k.compatible ? YES : NO}
                  {k.compatible ? t("Agrees", "సరిపోతుంది") : t("Does not", "సరిపోలేదు")}
                </span>
              </button>
              <div className={`kbody${open ? " on" : ""}`}>
                <p>{k.rule}</p>
                <div className="kev">
                  {Object.entries(k.evidence).map(([key, val]) => (
                    <span key={key}>{`${key}: ${String(val)}`}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="dosha">
        <p className="sectitle">{t("Chevvai dosham — the Mars check", "కుజ దోషం — కుజుని పరీక్ష")}</p>
        <div className="dcard">
          <div className="dline">
            <span>{subjects.bride.name}</span>
            <span className="dv">{kujaDosha.bride.present ? `${t("present", "ఉంది")} · ${kujaDosha.bride.severity}` : t("absent", "లేదు")}</span>
          </div>
          <div className="dline">
            <span>{subjects.groom.name}</span>
            <span className="dv">{kujaDosha.groom.present ? `${t("present", "ఉంది")} · ${kujaDosha.groom.severity}` : t("absent", "లేదు")}</span>
          </div>
          <p className="dnote">{kujaDosha.balance.notice}</p>
        </div>
      </section>

      <section className="ref north-match">
        <div className="north-head">
          <span>
            <p className="eyebrow">{t("A second traditional view", "మరో సాంప్రదాయ దృక్కోణం")}</p>
            <h3>{t("North Indian 36-point match", "ఉత్తర భారత 36 పాయింట్ల పొంతన")}</h3>
          </span>
          <b>{ashtakoota.score}<small>/36</small></b>
        </div>
        <p className="north-reading">{t(
          ashtakoota.score >= 28
            ? "This is a strong Ashtakoota agreement. Read the individual factors below to see where that strength comes from."
            : ashtakoota.score >= 18
              ? "This is a moderate Ashtakoota agreement. It clears the commonly used reference level, but weaker factors still deserve discussion."
              : "This falls below the commonly used Ashtakoota reference level. Review the weaker factors carefully instead of treating the number as a final rejection.",
          ashtakoota.score >= 28
            ? "ఇది బలమైన అష్టకూట పొంతన. ఆ బలం ఎక్కడి నుంచి వస్తుందో కింది అంశాల్లో చూడండి."
            : ashtakoota.score >= 18
              ? "ఇది మధ్యస్థ అష్టకూట పొంతన. సాధారణ సూచన స్థాయిని దాటింది, కానీ బలహీన అంశాలపై మాట్లాడాలి."
              : "ఇది సాధారణ అష్టకూట సూచన స్థాయి కంటే తక్కువ. ఈ సంఖ్యను తుది తిరస్కరణగా కాకుండా బలహీన అంశాలను జాగ్రత్తగా పరిశీలించండి.",
        )}</p>
        <div className="refbody">
          {ashtakoota.components.map((a) => (
            <div className="arow" key={a.id}>
              <span className="an">{a.label}</span>
              <span className="abar">
                <i style={{ width: `${(a.score / a.maximum) * 100}%` }} />
              </span>
              <span className="asc">{a.score}/{a.maximum}</span>
            </div>
          ))}
          <div className="atot">
            <span>{t("Total", "మొత్తం")}</span>
            <span>{ashtakoota.score} / {ashtakoota.maximum}</span>
          </div>
        </div>
        <p className="method-note">{t("South Indian Porutham and North Indian Ashtakoota use different rules. Sahadeva shows both without mixing their scores.", "దక్షిణ భారత పొరుత్తం, ఉత్తర భారత అష్టకూటం వేర్వేరు నియమాలను వాడతాయి. సహదేవ వాటి స్కోర్లను కలపకుండా రెండింటినీ చూపుతుంది.")}</p>
      </section>

      <div className="actions">
        <button className="btn btn-ghost" type="button" onClick={onReset}>
          {t("Check another match", "మరో పొంతన చూడండి")}
        </button>
      </div>
    </>
  );
}
