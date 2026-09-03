import { useEffect, useRef, useState } from "react";
import "./onboarding.css";
import { useLang, LangToggle, Rich } from "../lang";
import { useData } from "../data";
import { navigate } from "../router";
import { StatusBar } from "../shell";
import { fetchChart, saveProfileToAccount, type Profile } from "../api";
import { MON_EN, MON_TE, nakName, signName } from "../format";
import { getOnboardingMode, setOnboardingMode } from "../onboardingMode";

const MON_FULL_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON_FULL_TE = ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్"];

function daysIn(m: number, y: number) {
  return [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
}

function coordinateLabel(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;
}

type PlaceHit = { place: string; latitude: number; longitude: number; timezone?: string; timezoneOffset: number };

export function OnboardingScreen() {
  const { lang, t } = useLang();
  const { profile: existingProfile, setProfile, account, addPerson } = useData();
  const editing = getOnboardingMode() === "edit";
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(1);
  const [returnToReview, setReturnToReview] = useState(false);
  const initialDate = editing && existingProfile?.date ? existingProfile.date.split("-").map(Number) : [1995, 1, 14];
  const initialTime = editing && existingProfile?.time ? existingProfile.time.split(":").map(Number) : [9, 30];
  const initialHour = initialTime[0] || 0;
  const [name, setName] = useState(editing ? existingProfile?.name || "" : "");
  const [d, setD] = useState(initialDate[2]);
  const [m, setM] = useState(initialDate[1] - 1);
  const [y, setY] = useState(initialDate[0]);
  const [h, setH] = useState(initialHour % 12 || 12);
  const [min, setMin] = useState(initialTime[1] || 0);
  const [ap, setAp] = useState(initialHour >= 12 ? 1 : 0); // 0 am, 1 pm
  const initialConfidence = editing ? existingProfile?.birthTimeConfidence || "exact" : "exact";
  const [conf, setConf] = useState<"exact" | "rough" | "part" | "none">(initialConfidence);
  const [branchOpen, setBranchOpen] = useState(initialConfidence !== "exact");

  const initialPlace = editing && existingProfile ? {
    place: existingProfile.place,
    latitude: existingProfile.latitude,
    longitude: existingProfile.longitude,
    timezone: existingProfile.timezone,
    timezoneOffset: existingProfile.timezoneOffset,
  } : null;
  const [placeQuery, setPlaceQuery] = useState(initialPlace?.place || "");
  const [placeResults, setPlaceResults] = useState<PlaceHit[] | null>(null);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [place, setPlace] = useState<PlaceHit | null>(initialPlace);
  const selectedPlaceRef = useRef<PlaceHit | null>(initialPlace);

  const [derived, setDerived] = useState<{ nak: string; pada: number; sign: number } | null | "loading">(null);

  const dateBad = d > daysIn(m, y) || y > new Date().getFullYear();

  // place search (debounced -> /api/locations/resolve)
  useEffect(() => {
    if (step !== 3) return;
    const q = placeQuery.trim();
    if (selectedPlaceRef.current?.place === q) {
      setPlaceSearching(false);
      setPlaceResults([selectedPlaceRef.current]);
      return;
    }
    if (q.length < 2) {
      setPlaceResults(null);
      return;
    }
    setPlaceSearching(true);
    const id = window.setTimeout(async () => {
      try {
        let hour = h % 12;
        if (ap === 1) hour += 12;
        const res = await fetch("/api/locations/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            place: q,
            date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
            time: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
          }),
        });
        const j = await res.json();
        if (res.ok) {
          setPlaceResults([j as PlaceHit]);
        } else if (res.status === 409 && Array.isArray(j.candidates)) {
          setPlaceResults(
            j.candidates.map((c: { label: string; latitude: number; longitude: number; timezone?: string; timezoneOffset: number }) => ({
              place: c.label,
              latitude: c.latitude,
              longitude: c.longitude,
              timezone: c.timezone,
              timezoneOffset: c.timezoneOffset,
            })),
          );
        } else {
          setPlaceResults([]);
        }
      } catch {
        setPlaceResults([]);
      } finally {
        setPlaceSearching(false);
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [placeQuery, step, d, m, y, h, min, ap]);

  function assembleProfile(): Profile {
    const date = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    let hh = h % 12;
    if (ap === 1) hh += 12;
    const selectedTime = `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const time = conf === "none" ? "06:00" : conf === "part" ? "12:00" : selectedTime;
    const birthTimeAccuracyMinutes = conf === "exact" ? 5 : conf === "rough" ? 120 : conf === "part" ? 360 : 720;
    return {
      name: name.trim() || "You",
      date,
      time,
      place: place!.place,
      latitude: place!.latitude,
      longitude: place!.longitude,
      timezone: place!.timezone,
      timezoneOffset: place!.timezoneOffset,
      language: lang,
      birthTimeConfidence: conf,
      birthTimeAccuracyMinutes,
    };
  }

  // On reaching confirm, compute the derived star.
  useEffect(() => {
    if (step !== 4 || !place) return;
    setDerived("loading");
    const p = assembleProfile();
    fetchChart(p)
      .then((chart) => {
        const moon = chart.placements.find((x) => x.name === "Moon");
        if (moon) setDerived({ nak: moon.nakshatra, pada: moon.pada, sign: moon.sign });
        else setDerived(null);
      })
      .catch(() => setDerived(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function next() {
    if (step === 4) {
      const p = assembleProfile();
      const mode = getOnboardingMode();
      setSaving(true);
      try {
        if (mode === "add" && account) {
          // create an additional individual profile (it auto-activates)
          await addPerson(p);
        } else {
          setProfile(p);
          // update the active person on the account when signed in
          if (account) await saveProfileToAccount(p);
        }
      } finally {
        setSaving(false);
      }
      setOnboardingMode("new");
      navigate(mode === "new" ? "ask" : "more");
      return;
    }
    if (returnToReview) {
      setReturnToReview(false);
      setStep(4);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function editFromReview(targetStep: number) {
    setReturnToReview(true);
    setStep(targetStep);
  }

  function goBack() {
    if (returnToReview) {
      setReturnToReview(false);
      setStep(4);
      return;
    }
    setStep((s) => Math.max(1, s - 1));
  }

  const canContinue = step === 1 ? !dateBad : step === 3 ? !!place : true;

  const monShort = lang === "te" ? MON_TE : MON_EN;
  const ampmItems = lang === "te" ? ["ఉ.", "సా."] : ["am", "pm"];

  return (
    <>
      <StatusBar />
      <div className="onboarding-screen" style={{ display: "contents" }}>
        <div className="navrow">
          {step > 1 ? (
            <button className="backbtn" type="button" aria-label="Back" onClick={goBack}>
              <svg viewBox="0 0 24 24">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          ) : (
            <span className="navspace" />
          )}
          <span className="dots">
            {[1, 2, 3, 4].map((i) => (
              <i key={i} className={i === step ? "on" : ""} />
            ))}
          </span>
          <LangToggle />
        </div>

        <main className="obscreen" id="content">
          {step === 1 && (
            <section>
              <h2>{t("What is your name, and when were you born?", "మీ పేరు ఏమిటి, మీరు ఎప్పుడు పుట్టారు?")}</h2>
              <p className="qlead">{t("Your date of birth fixes almost everything Cosmithra reads.", "కోస్మిత్ర చదివే దాదాపు ప్రతిదానికీ మీ పుట్టిన తేదీయే ఆధారం.")}</p>
              <input
                className="tinput"
                type="text"
                placeholder={t("Your name", "మీ పేరు")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label={t("Your name", "మీ పేరు")}
                autoComplete="off"
              />
              <div className="wheel">
                <div className="wband" aria-hidden="true" />
                <WheelCol items={range(1, 31).map(String)} index={d - 1} onChange={(i) => setD(i + 1)} />
                <WheelCol items={lang === "te" ? MON_FULL_TE : MON_FULL_EN} index={m} onChange={setM} />
                <WheelCol items={range(1935, new Date().getFullYear()).map(String)} index={y - 1935} onChange={(i) => setY(1935 + i)} />
              </div>
              {dateBad && (
                <p className="err on">
                  {t(`There is no ${(lang === "te" ? MON_FULL_TE : MON_FULL_EN)[m]} ${d} in ${y}.`, `${y}లో ${MON_FULL_TE[m]} ${d} అనే తేదీ లేదు.`)}
                </p>
              )}
            </section>
          )}

          {step === 2 && (
            <section>
              <h2>{t("What time were you born?", "మీరు ఏ సమయంలో పుట్టారు?")}</h2>
              <p className="qlead">{t("Most people do not know this exactly. That is fine — say so and Cosmithra works around it.", "చాలామందికి ఇది కచ్చితంగా తెలియదు. ఫరవాలేదు — అలా చెబితే కోస్మిత్ర దాన్ని దృష్టిలో ఉంచుకునే పని చేస్తుంది.")}</p>
              {!branchOpen && (
                <div className="wheel">
                  <div className="wband" aria-hidden="true" />
                  <WheelCol items={range(1, 12).map(String)} index={h - 1} onChange={(i) => setH(i + 1)} />
                  <WheelCol items={range(0, 59).map((n) => String(n).padStart(2, "0"))} index={min} onChange={setMin} />
                  <WheelCol items={ampmItems} index={ap} onChange={setAp} />
                </div>
              )}
              <button className="linkbtn" type="button" onClick={() => setBranchOpen((v) => { const next = !v; if (!next) setConf("exact"); return next; })}>
                {branchOpen ? t("Enter an exact time", "ఖచ్చితమైన సమయం నమోదు చేయండి") : t("I’m not sure of the time", "సమయం ఖచ్చితంగా తెలియదు")}
              </button>
              <div className={`branch${branchOpen ? " on" : ""}`}>
                <ConfOpt cur={conf} setConf={setConf} value="rough"
                  title={t("I know roughly — within about two hours", "సుమారుగా తెలుసు — రెండు గంటల లోపు")}
                  sub={t("Everything works. House-based readings carry a small note.", "అన్నీ పని చేస్తాయి. భావ ఆధారిత విషయాలకు ఒక చిన్న గమనిక ఉంటుంది.")} />
                <ConfOpt cur={conf} setConf={setConf} value="part"
                  title={t("Only the part of day", "పగటి భాగం మాత్రమే")}
                  sub={t("Your star and life periods stay accurate; the ascendant is provisional.", "మీ నక్షత్రం, జీవిత దశలు కచ్చితంగానే ఉంటాయి; లగ్నాన్ని తాత్కాలికంగా తీసుకుంటాం.")} />
                <ConfOpt cur={conf} setConf={setConf} value="none"
                  title={t("No idea at all", "అస్సలు తెలియదు")}
                  sub={t("Cosmithra uses sunrise and marks every house-based reading as unconfirmed.", "కోస్మిత్ర సూర్యోదయాన్ని వాడి, భావ ఆధారిత ప్రతి విషయాన్నీ నిర్ధారించబడలేదని గుర్తు పెడుతుంది.")} />
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2>{t("Where were you born?", "మీరు ఎక్కడ పుట్టారు?")}</h2>
              <p className="qlead">{t("Town or village, not the hospital. Pick the exact one — several places share a name.", "ఆసుపత్రి కాదు — ఊరు లేదా గ్రామం. సరైనదాన్నే ఎంచుకోండి, ఒకే పేరుతో చాలా ప్రదేశాలు ఉంటాయి.")}</p>
              <input
                className="tinput"
                type="text"
                placeholder={t("Start typing a place…", "ప్రదేశం టైప్ చేయడం మొదలుపెట్టండి…")}
                value={placeQuery}
                onChange={(e) => {
                  setPlaceQuery(e.target.value);
                  setPlace(null);
                  selectedPlaceRef.current = null;
                }}
                aria-label={t("Place of birth", "ప్రదేశం")}
                autoComplete="off"
              />
              <div className="results">
                {placeSearching && (
                  <>
                    <div className="skelrow" style={{ width: "78%" }} />
                    <div className="skelrow" style={{ width: "60%" }} />
                  </>
                )}
                {!placeSearching && placeResults?.length === 0 && (
                  <p className="nores">{t("Couldn’t find that place. Try the district name.", "ఆ ప్రదేశం దొరకలేదు. జిల్లా పేరుతో ప్రయత్నించండి.")}</p>
                )}
                {!placeSearching &&
                  placeResults?.map((hit, i) => (
                    <button
                      key={i}
                      className="res"
                      type="button"
                      aria-pressed={place?.place === hit.place}
                      onClick={() => {
                        selectedPlaceRef.current = hit;
                        setPlace(hit);
                        setPlaceQuery(hit.place);
                      }}
                    >
                      <b>{hit.place}</b>
                      <span>
                        {hit.timezone || t("Verified location", "ధృవీకరించిన ప్రదేశం")} · {coordinateLabel(hit.latitude, "N", "S")}, {coordinateLabel(hit.longitude, "E", "W")}
                      </span>
                      <i aria-hidden="true">{place?.place === hit.place ? "✓" : "›"}</i>
                    </button>
                  ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2>{t("Is this right?", "ఇది సరైనదేనా?")}</h2>
              <p className="qlead">{t("You can change any of it later.", "వీటిలో దేనినైనా తర్వాత మార్చుకోవచ్చు.")}</p>
              <div className="confcard">
                <div className="crow">
                  <span>{t("Name", "పేరు")}<button type="button" onClick={() => editFromReview(1)}>{t("Edit", "మార్చు")}</button></span>
                  <span className="cv">{name.trim() || "—"}</span>
                </div>
                <div className="crow">
                  <span>{t("Date of birth", "పుట్టిన తేదీ")}<button type="button" onClick={() => editFromReview(1)}>{t("Edit", "మార్చు")}</button></span>
                  <span className="cv">{`${d} ${monShort[m]} ${y}`}</span>
                </div>
                <div className="crow">
                  <span>{t("Time of birth", "పుట్టిన సమయం")}<button type="button" onClick={() => editFromReview(2)}>{t("Edit", "మార్చు")}</button></span>
                  <span className="cv">
                    {conf === "none"
                      ? t("not known", "తెలియదు")
                      : conf === "part"
                        ? t("part of day only", "పగటి భాగం మాత్రమే")
                        : `${h}:${String(min).padStart(2, "0")} ${ampmItems[ap]}${conf === "rough" ? " ±2h" : ""}`}
                  </span>
                </div>
                <div className="crow">
                  <span>{t("Place of birth", "పుట్టిన ప్రదేశం")}<button type="button" onClick={() => editFromReview(3)}>{t("Edit", "మార్చు")}</button></span>
                  <span className="cv">{place?.place ?? "—"}</span>
                </div>
                <div className="derived">
                  <p className="dlbl">{t("Your chart reference", "మీ జాతక సూచిక")}</p>
                  {derived === "loading" && <p className="dval" style={{ fontSize: 17, fontWeight: 500, color: "var(--muted)" }}>{t("Calculating…", "లెక్కిస్తోంది…")}</p>}
                  {derived && derived !== "loading" && (
                    <>
                      <dl className="birthrefs">
                        <div><dt>{t("Birth star", "జన్మ నక్షత్రం")}</dt><dd>{nakName(derived.nak, lang)} · {t(`quarter ${derived.pada}`, `${derived.pada}వ పాదం`)}</dd></div>
                        <div><dt>{t("Moon sign", "చంద్ర రాశి")}</dt><dd>{signName(derived.sign, lang)}</dd></div>
                        <div><dt>{t("Calculation", "గణన పద్ధతి")}</dt><dd>{t("Lahiri sidereal", "లాహిరి నిరయణ")}</dd></div>
                      </dl>
                      <p className="refhelp">{t("These are the three reference points used throughout your reading.", "మీ పఠనం అంతటా ఉపయోగించే మూడు ప్రధాన సూచికలు ఇవి.")}</p>
                    </>
                  )}
                  {derived === null && <p className="dval" style={{ fontSize: 17, fontWeight: 500, color: "var(--muted)" }}>{t("Could not calculate — check the details.", "లెక్కించలేకపోయాం — వివరాలు సరిచూడండి.")}</p>}
                </div>
              </div>
              <p className="conf">
                {conf === "exact"
                  ? t("Birth time taken as exact. Every house-based reading is treated as confirmed.", "జనన సమయాన్ని కచ్చితమైనదిగా తీసుకున్నాం. భావ ఆధారిత ప్రతి విషయాన్నీ నిర్ధారితమైనదిగా పరిగణిస్తాం.")
                  : conf === "rough"
                    ? t("Birth time is approximate within about two hours. Your star and life periods are unaffected.", "జనన సమయం సుమారు రెండు గంటల లోపు కచ్చితత్వంతో ఉంది. మీ నక్షత్రం, జీవిత దశలు ప్రభావితం కావు.")
                    : conf === "part"
                      ? t("Only the part of day is known. The ascendant is provisional until you confirm a time.", "పగటి భాగం మాత్రమే తెలుసు. సమయం నిర్ధారించే వరకు లగ్నం తాత్కాలికం.")
                      : t("No birth time known. Cosmithra uses sunrise as a stand-in and marks every house-based reading as unconfirmed.", "జనన సమయం తెలియదు. కోస్మిత్ర సూర్యోదయాన్ని బదులుగా వాడి, భావ ఆధారిత ప్రతి విషయాన్నీ నిర్ధారించబడలేదని గుర్తు పెడుతుంది.")}
              </p>
            </section>
          )}
        </main>

        <div className="footer">
          <button className="btn" type="button" disabled={!canContinue || saving} onClick={next}>
            {saving
              ? t("Saving…", "భద్రపరుస్తోంది…")
              : step === 4
                ? getOnboardingMode() === "add"
                  ? t("Add this person", "ఈ వ్యక్తిని జోడించు")
                  : t("Show my chart", "నా జాతకం చూడండి")
                : returnToReview
                  ? t("Save change", "మార్పును భద్రపరచండి")
                  : t("Continue", "కొనసాగించు")}
          </button>
        </div>
      </div>
    </>
  );
}

function range(a: number, b: number) {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

function ConfOpt({
  cur,
  setConf,
  value,
  title,
  sub,
}: {
  cur: string;
  setConf: (v: "exact" | "rough" | "part" | "none") => void;
  value: "rough" | "part" | "none";
  title: string;
  sub: string;
}) {
  return (
    <button className="opt" type="button" aria-pressed={cur === value} onClick={() => setConf(value)}>
      <b>{title}</b>
      <span>{sub}</span>
    </button>
  );
}

/** Scroll-snap wheel column, reproducing the prototype picker. */
function WheelCol({ items, index, onChange }: { items: string[]; index: number; onChange: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(index);
  const settle = useRef<number | undefined>(undefined);

  // Sync scroll position when the controlled index changes externally.
  useEffect(() => {
    setSel(index);
    if (ref.current) ref.current.scrollTop = index * 44;
  }, [index, items.length]);

  return (
    <div
      className="wcol"
      ref={ref}
      role="listbox"
      onScroll={() => {
        window.clearTimeout(settle.current);
        settle.current = window.setTimeout(() => {
          const el = ref.current;
          if (!el) return;
          const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / 44)));
          el.scrollTop = i * 44;
          setSel(i);
          if (i !== index) onChange(i);
        }, 90);
      }}
    >
      <div style={{ height: 88 }} aria-hidden="true" />
      {items.map((it, i) => (
        <div key={i} role="option" aria-selected={i === sel} className={i === sel ? "sel" : ""}>
          {it}
        </div>
      ))}
      <div style={{ height: 88 }} aria-hidden="true" />
    </div>
  );
}
