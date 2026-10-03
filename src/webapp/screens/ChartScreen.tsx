import { ErrorNote } from "../states";
import { Glyph } from "../glyph";
import { prefillAsk } from "../prefill";
import { useState } from "react";
import "./chart.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { navigate } from "../router";
import { StatusBar, TabBar } from "../shell";
import { dms, grahaAbbr, grahaName, nakName, signName, SIGN_LORDS } from "../format";
import type { VargaPlacement } from "../api";

// Sign order 0..11 = Mesha..Meena, with South Indian grid positions.
const SIGN_LAYOUT: Array<{ k: string; en: string; full?: string; col: number; row: number }> = [
  { k: "Mesha", en: "Aries", col: 2, row: 1 },
  { k: "Vrisha", en: "Taurus", full: "Vrishabha", col: 3, row: 1 },
  { k: "Mithuna", en: "Gemini", col: 4, row: 1 },
  { k: "Karka", en: "Cancer", col: 4, row: 2 },
  { k: "Simha", en: "Leo", col: 4, row: 3 },
  { k: "Kanya", en: "Virgo", col: 4, row: 4 },
  { k: "Tula", en: "Libra", col: 3, row: 4 },
  { k: "Vrisch", en: "Scorpio", full: "Vrischika", col: 2, row: 4 },
  { k: "Dhanus", en: "Sagittarius", col: 1, row: 4 },
  { k: "Makara", en: "Capricorn", col: 1, row: 3 },
  { k: "Kumbha", en: "Aquarius", col: 1, row: 2 },
  { k: "Meena", en: "Pisces", col: 1, row: 1 },
];

type House = { t: string; tTe: string; tr: string; g: string; gTe: string };
const HOUSES: House[] = [
  { t: "You yourself", tTe: "మీరు", tr: "Lagna bhava · లగ్న భావం · லக்ன பாவம்", g: "Your body, temperament and the way you begin things.", gTe: "మీ శరీరం, స్వభావం, పనులు మొదలుపెట్టే తీరు." },
  { t: "What you hold", tTe: "మీ దగ్గర ఉన్నది", tr: "Dhana bhava · ధన భావం · தன பாவம்", g: "Money already in hand, the family you were born into, and speech.", gTe: "చేతిలో ఉన్న డబ్బు, పుట్టిన కుటుంబం, మాట." },
  { t: "Effort and nerve", tTe: "కృషి, ధైర్యం", tr: "Sahaja bhava · సహజ భావం · சகஜ பாவம்", g: "Courage, younger siblings, short journeys and self-made effort.", gTe: "ధైర్యం, తమ్ముళ్లు చెల్లెళ్లు, చిన్న ప్రయాణాలు, సొంత కృషి." },
  { t: "Home and peace", tTe: "ఇల్లు, మనశ్శాంతి", tr: "Sukha bhava · సుఖ భావం · சுக பாவம்", g: "The house you live in, your mother, land, and peace of mind.", gTe: "మీరు ఉండే ఇల్లు, తల్లి, భూమి, మనశ్శాంతి." },
  { t: "Learning and children", tTe: "చదువు, సంతానం", tr: "Putra bhava · పుత్ర భావం · புத்திர பாவம்", g: "Children, study, creative work and inherited good fortune.", gTe: "సంతానం, చదువు, సృజన, పూర్వ పుణ్యం." },
  { t: "Daily grind", tTe: "రోజువారీ శ్రమ", tr: "Ripu bhava · రిపు భావం · ரிபு பாவம்", g: "The work you do every day, debts, illness and competitors.", gTe: "రోజూ చేసే పని, అప్పులు, అనారోగ్యం, పోటీదారులు." },
  { t: "The other person", tTe: "ఎదుటి వ్యక్తి", tr: "Kalatra bhava · కళత్ర భావం · களத்திர பாவம்", g: "Marriage, business partners, and open dealings with others.", gTe: "వివాహం, భాగస్వాములు, బహిరంగ లావాదేవీలు." },
  { t: "Sudden change", tTe: "అకస్మాత్తు మార్పు", tr: "Randhra bhava · రంధ్ర భావం · ரந்திர பாவம்", g: "Inheritance, things hidden, and change you did not schedule.", gTe: "వారసత్వం, రహస్యమైనవి, ఊహించని మార్పు." },
  { t: "Fortune and teachers", tTe: "అదృష్టం, గురువులు", tr: "Dharma bhava · ధర్మ భావం · தர்ம பாவம்", g: "Luck, your father, teachers, faith and long journeys.", gTe: "అదృష్టం, తండ్రి, గురువులు, ధర్మం, దూర ప్రయాణాలు." },
  { t: "Career and standing", tTe: "వృత్తి, గుర్తింపు", tr: "Karma bhava · కర్మ భావం · கர்ம பாவம்", g: "Your work in the world, reputation and public action.", gTe: "మీ వృత్తి, సమాజంలో స్థానం, బహిరంగ కృషి." },
  { t: "Gains and friends", tTe: "లాభాలు, స్నేహితులు", tr: "Labha bhava · లాభ భావం · லாப பாவம்", g: "Income, gains, friends and elder siblings.", gTe: "ఆదాయం, లాభాలు, స్నేహితులు, అన్నలు అక్కలు." },
  { t: "Letting go", tTe: "వదిలివేయడం", tr: "Vyaya bhava · వ్యయ భావం · விய பாவம்", g: "Expense, sleep, distant places and release from things.", gTe: "ఖర్చు, నిద్ర, దూర ప్రదేశాలు, విడుదల." },
];

type Cell = { planet: string; deg: string; flags: string };

export function ChartScreen() {
  const { lang, t } = useLang();
  const { profile, chart, reload } = useData();
  const [varga, setVarga] = useState<"d1" | "d9">("d1");
  const [openHouse, setOpenHouse] = useState<{ sign: number; house: number } | null>(null);

  const data = chart.data;

  // Build placements-by-sign for the active varga.
  const dignityByName = new Map((data?.advanced.dignities ?? []).map((d) => [d.name, d]));
  let placements: Array<{ name: string; sign: number; deg?: number; retro?: boolean }> = [];
  let lagnaSign = 0;
  if (data) {
    if (varga === "d1") {
      placements = data.placements.map((p) => ({ name: p.name, sign: p.sign, deg: p.degree, retro: p.retrograde }));
      lagnaSign = data.placements.find((p) => p.name === "Lagna")?.sign ?? 0;
    } else {
      const nav: VargaPlacement[] = data.navamsa ?? data.advanced.vargas["D9"] ?? [];
      placements = nav.map((p) => ({ name: p.name, sign: p.sign }));
      lagnaSign = nav.find((p) => p.name === "Lagna")?.sign ?? 0;
    }
  }

  const bySign = new Map<number, Cell[]>();
  for (const p of placements) {
    if (p.name === "Lagna") continue;
    const own = SIGN_LORDS[p.sign] === p.name;
    const flags = [p.retro ? "R" : "", own ? "own" : ""].filter(Boolean).join(" · ");
    const arr = bySign.get(p.sign) ?? [];
    arr.push({ planet: grahaAbbr(p.name), deg: p.deg != null ? dms(p.deg) : "", flags });
    bySign.set(p.sign, arr);
  }

  const moon = data?.placements.find((p) => p.name === "Moon");
  const lagnaD1 = data?.placements.find((p) => p.name === "Lagna");

  // summary strip
  const summaryLine =
    varga === "d1"
      ? t(
          `Your ascendant is ${signName(lagnaSign, "en")}, and your Moon is in ${moon ? signName(moon.sign, "en") : ""} — in the star ${moon ? nakName(moon.nakshatra, "en") : ""}.`,
          `మీ లగ్నం ${signName(lagnaSign, "te")}, మీ చంద్రుడు ${moon ? signName(moon.sign, "te") : ""} రాశిలో — ${moon ? nakName(moon.nakshatra, "te") : ""} నక్షత్రంలో.`,
        )
      : t(
          `In the ninth division your ascendant is ${signName(lagnaSign, "en")}.`,
          `నవాంశలో మీ లగ్నం ${signName(lagnaSign, "te")}.`,
        );

  const house = openHouse ? HOUSES[openHouse.house - 1] : null;
  const sheetSign = openHouse ? SIGN_LAYOUT[openHouse.sign] : null;
  const sheetPlanets = openHouse ? placements.filter((p) => p.sign === openHouse.sign && p.name !== "Lagna") : [];

  return (
    <>
      <StatusBar />
      <main className="screen chart-screen" id="content">
        <header className="shead headrow">
          <span>
            <p className="eyebrow">
              {profile ? `${profile.name} · ${profile.date} · ${profile.time} · ${profile.place}` : ""}
            </p>
            <h2>{t("My chart", "నా జాతకం")}</h2>
          </span>
          <LangToggle />
        </header>

        <div className="seg" role="tablist" aria-label="Chart division">
          <button type="button" role="tab" aria-selected={varga === "d1"} onClick={() => setVarga("d1")}>
            <span>{t("Rasi", "రాశి")}</span> <span className="sub">D-1</span>
          </button>
          <button type="button" role="tab" aria-selected={varga === "d9"} onClick={() => setVarga("d9")}>
            <span>{t("Navamsa", "నవాంశ")}</span> <span className="sub">D-9</span>
          </button>
        </div>

        {chart.status === "error" && <ErrorNote error={chart.error} what={t("The chart could not be calculated.", "జాతకం లెక్కించలేకపోయాం.")} onRetry={reload} />}

        {data && (
          <>
            <div className="chart">
              {SIGN_LAYOUT.map((s, i) => {
                const houseNum = ((i - lagnaSign + 12) % 12) + 1;
                const cells = bySign.get(i) ?? [];
                return (
                  <button
                    key={s.k}
                    type="button"
                    className="cell"
                    style={{ gridColumn: s.col, gridRow: s.row }}
                    aria-pressed={openHouse?.sign === i}
                    aria-label={`${s.full || s.k}, ${s.en}, house ${houseNum}`}
                    onClick={() => setOpenHouse({ sign: i, house: houseNum })}
                  >
                    <span className="top">
                      <span className="sname">{s.k}</span>
                      <span className="hnum">{houseNum}</span>
                    </span>
                    {cells.map((c, j) => (
                      <span className="pl" key={j}>
                        {c.planet}
                        {c.deg && <span className="dg">{c.deg}</span>}
                        {c.flags && <span className="dg">{c.flags}</span>}
                      </span>
                    ))}
                    {i === lagnaSign && <span className="lg">LAGNA</span>}
                  </button>
                );
              })}
              <div className="center">
                <span className="cn">{profile?.name}</span>
                <span className="cm">
                  {profile?.date} · {profile?.time}
                  <br />
                  {profile?.place} · {profile?.latitude.toFixed(2)} N, {profile?.longitude.toFixed(2)} E
                </span>
                <span className="cv">{varga === "d1" ? t("Rasi · D-1", "రాశి · D-1") : t("Navamsa · D-9", "నవాంశ · D-9")}</span>
              </div>
            </div>

            <div className="sumstrip">
              <p>
                <span className="sline">{summaryLine}</span>
                <span className="tr">
                  {varga === "d1"
                    ? `${signName(lagnaSign, lang)} lagna${moon ? ` · ${signName(moon.sign, lang)} · ${nakName(moon.nakshatra, lang)} ${lagnaD1 ? "" : ""}` : ""}`
                    : `${signName(lagnaSign, lang)} navamsa lagna`}
                </span>
              </p>
            </div>

            <section className="legend">
              <p className="sectitle">{t("Short names used in the squares", "గడులలో వాడిన సంక్షిప్త పేర్లు")}</p>
              <div className="lgrid">
                {["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"].map((g) => (
                  <div key={g} className="lcell">
                    <Glyph family="graha" id={g} size={22} />
                    <span>
                      <b>{grahaAbbr(g)}</b>
                      {grahaName(g, lang)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: "var(--space-3)" }}>
                {t(
                  "R = moving backwards through the sky. Own = the planet is in the sign it rules. Tap any square to read what that house covers.",
                  "R = వక్ర గతి, వెనక్కి కదులుతోంది. Own = గ్రహం తన సొంత రాశిలో ఉంది. ఏదైనా గడిని నొక్కితే ఆ భావం దేని గురించో చదవవచ్చు.",
                )}
              </p>
            </section>

            <p className="foot">
              {t("Lahiri ayanamsa · whole-sign houses · South Indian square.", "లాహిరి అయనాంశ · పూర్ణరాశి భావాలు · దక్షిణ భారత చతురస్రం.")}
              <br />
              {t("Birth time used exactly as given. No rectification applied.", "జనన సమయాన్ని ఇచ్చినట్టుగానే వాడాం. సవరణ చేయలేదు.")}
            </p>
          </>
        )}

        {/* bottom sheet */}
        <div className={`scrim${openHouse ? " on" : ""}`} onClick={() => setOpenHouse(null)} />
        <aside className={`sheet${openHouse ? " on" : ""}`} role="dialog" aria-modal="true" inert={!openHouse} onKeyDown={(e) => e.key === "Escape" && setOpenHouse(null)} aria-label={house && openHouse ? t(`House ${openHouse.house} — ${house.t}`, `${openHouse.house}వ భావం — ${house.tTe}`) : undefined}>
          <div className="grabber" aria-hidden="true" />
          {house && sheetSign && openHouse && (
            <>
              <h3>{t(`House ${openHouse.house} — ${house.t}`, `${openHouse.house}వ భావం — ${house.tTe}`)}</h3>
              <p className="strn">
                {house.tr} &nbsp;·&nbsp; {sheetSign.full || sheetSign.k} ({sheetSign.en})
              </p>
              <p className="sgov">{lang === "te" ? house.gTe : house.g}</p>
              <div className="plist">
                {sheetPlanets.length === 0 ? (
                  <p className="empty">
                    {t(
                      "No planet sits here. In this tradition an empty house is read through its lord and the planets that aspect it — not as absence.",
                      "ఇక్కడ ఏ గ్రహమూ లేదు. ఈ సంప్రదాయంలో ఖాళీ భావాన్ని దాని అధిపతి ద్వారా, దానిపై దృష్టి ఉన్న గ్రహాల ద్వారా చదువుతారు — లేమిగా కాదు.",
                    )}
                  </p>
                ) : (
                  sheetPlanets.map((p, i) => {
                    const dg = dignityByName.get(p.name);
                    return (
                      <div className="prow" key={i}>
                        <Glyph family="graha" id={p.name} size={24} className="pglyph" />
                        <span className="pn">
                          {grahaName(p.name, lang)}
                          <span>{p.name}</span>
                        </span>
                        <span className="pd">
                          {[p.deg != null ? dms(p.deg) : "", p.retro ? "R" : "", dg?.dignity && dg.dignity !== "neutral" ? dg.dignity : ""].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="sheetact">
                <button className="btn" type="button" onClick={() => setOpenHouse(null)}>
                  {t("Close", "మూసివేయి")}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    prefillAsk(
                      t(
                        `What does my chart say about house ${openHouse.house} — ${house.t.toLowerCase()}?`,
                        `నా జాతకంలో ${openHouse.house}వ భావం — ${house.tTe} — గురించి ఏం చెబుతుంది?`,
                      ),
                    );
                    navigate("ask");
                  }}
                >
                  {t("Ask about this house", "ఈ భావం గురించి అడగండి")}
                </button>
              </div>
            </>
          )}
        </aside>
      </main>
      <TabBar current="chart" />
    </>
  );
}
