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

type PlaceHit = { place: string; latitude: number; longitude: number; timezone?: string; timezoneOffset: number };

export function MatchScreen() {
  const { lang, t } = useLang();
  const { profile } = useData();

  const [pname, setPname] = useState("");
  const [pdate, setPdate] = useState("");
  const [ptime, setPtime] = useState("12:00");
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

  const canCheck = !!profile && !!pname.trim() && !!pdate && !!pplace;

  async function check() {
    if (!profile || !pplace) return;
    setBusy(true);
    setError(null);
    const partner: Profile = {
      name: pname.trim() || "Partner",
      date: pdate,
      time: ptime || "12:00",
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
            <p className="sectitle">{t("Enter the other person's birth details", "ఎదుటి వ్యక్తి జనన వివరాలు ఇవ్వండి")}</p>
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
        <p className="vtext">
          {t(
            `${pass} of the ${total} poruthams pass.`,
            `${total} పొరుత్తాలలో ${pass} సరిపోతున్నాయి.`,
          )}
        </p>
        <div className="vmeter" role="img" aria-label={`${pass} of ${total} checks agree`}>
          {porutham.checks.map((k) => (
            <i key={k.id} className={k.compatible ? "" : "no"} />
          ))}
        </div>
        <p className="withheld">
          {t(
            "There is no single number here on purpose. The South Indian tradition reports each porutham separately and does not roll them into one score — so Sahadev does not either.",
            "ఇక్కడ ఒకే ఒక సంఖ్య ఇవ్వకపోవడం ఉద్దేశపూర్వకమే. దక్షిణ భారత సంప్రదాయం ప్రతి పొరుత్తాన్ని విడిగా చెబుతుంది, అన్నిటినీ కలిపి ఒకే స్కోరుగా ఇవ్వదు — కాబట్టి సహదేవ్ కూడా ఇవ్వదు.",
          )}
        </p>
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

      <details className="ref">
        <summary>{t("North Indian 36-point count, for reference", "ఉత్తర భారత 36 పాయింట్ల లెక్క, సూచన కోసం")}</summary>
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
      </details>

      <div className="actions">
        <button className="btn btn-ghost" type="button" onClick={onReset}>
          {t("Check another match", "మరో పొంతన చూడండి")}
        </button>
      </div>
    </>
  );
}
