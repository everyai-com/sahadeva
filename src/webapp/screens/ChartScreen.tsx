import { useState } from "react";
import "./chart.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { navigate } from "../router";
import { StatusBar, TabBar } from "../shell";
import { dms, grahaAbbr, grahaName, nakName, signName, SIGN_LORDS } from "../format";
import { GrahaIcon } from "../design/GrahaIcon";
import type { VargaPlacement } from "../api";
import { downloadChartJson, fetchHouseExplorer, type HouseLedgerView } from "../api";
import { setOnboardingMode } from "../onboardingMode";
import { saveChartAskContext } from "../chartAskContext";

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

type Cell = { name: string; planet: string; deg: string; flags: string };
const BHAVA_IDS = ["tanu","dhana","sahaja","bandhu","putra","ari","yuvati","randhra","dharma","karma","labha","vyaya"];

// Divisional charts the web app can render from the already-fetched payload.
// D1 carries degrees/nakshatra; higher vargas carry sign placement only.
const VARGAS = [
  { id: "D1", label: "Rasi", labelTe: "రాశి", sub: "D-1" },
  { id: "D9", label: "Navamsa", labelTe: "నవాంశ", sub: "D-9" },
  { id: "D10", label: "Dasamsa", labelTe: "దశాంశ", sub: "D-10" },
  { id: "D7", label: "Saptamsa", labelTe: "సప్తాంశ", sub: "D-7" },
  { id: "D12", label: "Dwadasamsa", labelTe: "ద్వాదశాంశ", sub: "D-12" },
] as const;
type VargaId = (typeof VARGAS)[number]["id"];

// Classical Graha Drishti offsets (signs forward from the planet's own sign).
const DRISHTI_OFFSETS: Record<string, number[]> = {
  Mars: [3, 6, 7],
  Jupiter: [4, 6, 8],
  Saturn: [2, 6, 9],
};
function aspectedSigns(planet: string, sign: number): number[] {
  if (planet === "Rahu" || planet === "Ketu" || planet === "Lagna") return [sign];
  const offsets = DRISHTI_OFFSETS[planet] ?? [6];
  return [...new Set([sign, ...offsets.map((off) => (sign + off) % 12)])];
}

export function ChartScreen() {
  const { lang, t } = useLang();
  const { profile, chart } = useData();
  const [varga, setVarga] = useState<VargaId>("D1");
  const [openHouse, setOpenHouse] = useState<{ sign: number; house: number } | null>(null);
  const [houseLedger, setHouseLedger] = useState<{ key: string; houses: HouseLedgerView[] } | null>(null);
  const [houseLedgerFailed, setHouseLedgerFailed] = useState(false);

  const data = chart.data;

  // Build placements-by-sign for the active varga.
  const dignityByName = new Map((data?.advanced.dignities ?? []).map((d) => [d.name, d]));
  const d1ByName = new Map((data?.placements ?? []).map((p) => [p.name, p]));
  let placements: Array<{ name: string; sign: number; deg?: number; retro?: boolean }> = [];
  let lagnaSign = 0;
  if (data) {
    if (varga === "D1") {
      placements = data.placements.map((p) => ({ name: p.name, sign: p.sign, deg: p.degree, retro: p.retrograde }));
      lagnaSign = data.placements.find((p) => p.name === "Lagna")?.sign ?? 0;
    } else {
      const division: VargaPlacement[] = data.advanced.vargas[varga] ?? data.navamsa ?? [];
      placements = division.map((p) => ({ name: p.name, sign: p.sign }));
      lagnaSign = division.find((p) => p.name === "Lagna")?.sign ?? 0;
    }
  }
  const vargaMeta = VARGAS.find((v) => v.id === varga)!;

  const bySign = new Map<number, Cell[]>();
  for (const p of placements) {
    if (p.name === "Lagna") continue;
    const dg = dignityByName.get(p.name);
    const own = SIGN_LORDS[p.sign] === p.name;
    const flags = [
      p.retro ? "R" : "",
      own ? "own" : "",
      dg?.dignity && dg.dignity !== "neutral" ? dg.dignity : "",
      dg?.combust ? "combust" : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const arr = bySign.get(p.sign) ?? [];
    arr.push({ name: p.name, planet: grahaAbbr(p.name), deg: p.deg != null ? dms(p.deg) : "", flags });
    bySign.set(p.sign, arr);
  }

  const moon = data?.placements.find((p) => p.name === "Moon");
  const lagnaD1 = data?.placements.find((p) => p.name === "Lagna");

  // Planets aspecting a sign (whole-sign Graha Drishti, D1 only).
  const aspectingBySign = new Map<number, string[]>();
  if (varga === "D1" && data) {
    for (const p of data.placements) {
      if (p.name === "Lagna") continue;
      for (const s of aspectedSigns(p.name, p.sign)) {
        if (s === p.sign) continue;
        const arr = aspectingBySign.get(s) ?? [];
        arr.push(p.name);
        aspectingBySign.set(s, arr);
      }
    }
  }

  // summary strip
  const summaryLine =
    varga === "D1"
      ? t(
          `Your ascendant is ${signName(lagnaSign, "en")}, and your Moon is in ${moon ? signName(moon.sign, "en") : ""} — in the star ${moon ? nakName(moon.nakshatra, "en") : ""}.`,
          `మీ లగ్నం ${signName(lagnaSign, "te")}, మీ చంద్రుడు ${moon ? signName(moon.sign, "te") : ""} రాశిలో — ${moon ? nakName(moon.nakshatra, "te") : ""} నక్షత్రంలో.`,
        )
      : t(
          `In ${vargaMeta.label} your ascendant is ${signName(lagnaSign, "en")}.`,
          `${vargaMeta.labelTe}లో మీ లగ్నం ${signName(lagnaSign, "te")}.`,
        );

  const house = openHouse ? HOUSES[openHouse.house - 1] : null;
  const sheetSign = openHouse ? SIGN_LAYOUT[openHouse.sign] : null;
  const sheetPlanets = openHouse ? placements.filter((p) => p.sign === openHouse.sign && p.name !== "Lagna") : [];
  const profileKey = profile ? `${profile.date}:${profile.time}:${profile.latitude.toFixed(3)}:${profile.longitude.toFixed(3)}` : "";
  const openLedger = houseLedger && houseLedger.key === profileKey ? houseLedger.houses.find((h) => h.house === openHouse?.house) : undefined;
  const openSheet = (sign: number, houseNum: number) => {
    setOpenHouse({ sign, house: houseNum });
    if (profile && (!houseLedger || houseLedger.key !== profileKey) && !houseLedgerFailed) {
      fetchHouseExplorer(profile)
        .then((data) => setHouseLedger({ key: profileKey, houses: data.houses }))
        .catch(() => setHouseLedgerFailed(true));
    }
  };

  return (
    <>
      <StatusBar />
      <main className="screen chart-screen" id="content">
        <header className="shead headrow">
          <span>
            <p className="eyebrow">
              {profile ? `${profile.name} · ${profile.date} · ${profile.birthTimeConfidence === "none" ? t("time not known", "సమయం తెలియదు") : profile.time} · ${profile.place}` : ""}
            </p>
            <h2>{t("My chart", "నా జాతకం")}</h2>
          </span>
          <LangToggle />
        </header>

        <button className="editbirth" type="button" onClick={() => { setOnboardingMode("edit"); navigate("onboarding"); }}>
          {t("Edit birth details", "జనన వివరాలు మార్చండి")}
        </button>

        <div className="seg" role="tablist" aria-label="Chart division">
          {VARGAS.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={varga === v.id} onClick={() => setVarga(v.id)}>
              <span>{t(v.label, v.labelTe)}</span> <span className="sub">{v.sub}</span>
            </button>
          ))}
        </div>

        {chart.status === "error" && <p className="muted small">{t("The chart could not be calculated.", "జాతకం లెక్కించలేకపోయాం.")}</p>}

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
                    onClick={() => openSheet(i, houseNum)}
                  >
                    <span className="top">
                      <span className="sname">{s.k}</span>
                      <span className="hnum">{houseNum}</span>
                    </span>
                    {cells.map((c, j) => (
                      <span className="pl" key={j}>
                        <GrahaIcon name={c.name} size={20} decorative />
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
                <span className="cv">{varga === "D1" ? t("Rasi · D-1", "రాశి · D-1") : t(`${vargaMeta.label} · ${vargaMeta.sub}`, `${vargaMeta.labelTe} · ${vargaMeta.sub}`)}</span>
              </div>
            </div>

            <div className="sumstrip">
              <p>
                <span className="sline">{summaryLine}</span>
                <span className="tr">
                  {varga === "D1"
                    ? `${signName(lagnaSign, lang)} lagna${moon ? ` · ${signName(moon.sign, lang)} · ${nakName(moon.nakshatra, lang)} ${lagnaD1 ? "" : ""}` : ""}`
                    : `${signName(lagnaSign, lang)} ${vargaMeta.label.toLowerCase()} lagna`}
                </span>
              </p>
            </div>

            <section className="chartguide" aria-label={t("How to read this chart", "ఈ జాతకాన్ని ఎలా చదవాలి")}>
              <h3>{t("How to read this chart", "ఈ జాతకాన్ని ఎలా చదవాలి")}</h3>
              <div>
                <p><b>{t("Sign", "రాశి")}</b><span>{t("The fixed zodiac name in each square.", "ప్రతి గడిలోని స్థిర రాశి పేరు.")}</span></p>
                <p><b>{t("House", "భావం")}</b><span>{t("The small number shows the life area, counted from your ascendant.", "చిన్న సంఖ్య లగ్నం నుండి లెక్కించిన జీవిత రంగాన్ని చూపుతుంది.")}</span></p>
                <p><b>{t("Planet", "గ్రహం")}</b><span>{t("Planet abbreviations show what occupies that sign. Select a square for details.", "గ్రహ సంక్షిప్తాలు ఆ రాశిలో ఉన్న గ్రహాలను చూపుతాయి. వివరాలకు గడిని ఎంచుకోండి.")}</span></p>
              </div>
            </section>

            <section className="legend">
              <p className="sectitle">{t("Short names used in the squares", "గడులలో వాడిన సంక్షిప్త పేర్లు")}</p>
              <div className="lgrid">
                {["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"].map((g) => (
                  <div key={g}>
                    <GrahaIcon name={g} size={24} decorative />
                    <b>{grahaAbbr(g)}</b>
                    {grahaName(g, lang)}
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

            {profile && (
              <div className="sheetact" style={{ marginTop: "var(--space-3)" }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => data && downloadChartJson(profile, data)}
                >
                  {t("Download this chart (.json)", "ఈ జాతకాన్ని దింపుకోండి (.json)")}
                </button>
              </div>
            )}
          </>
        )}

        {/* bottom sheet */}
        <div className={`scrim${openHouse ? " on" : ""}`} onClick={() => setOpenHouse(null)} />
        <aside className={`sheet${openHouse ? " on" : ""}`} role="dialog" aria-modal="true">
          <div className="grabber" aria-hidden="true" />
          {house && sheetSign && openHouse && (
            <>
              <h3><img className="bhava-icon" src={`/brand/sahadeva/bhava/${BHAVA_IDS[openHouse.house - 1]}-48.svg`} alt="" />{t(`House ${openHouse.house} — ${house.t}`, `${openHouse.house}వ భావం — ${house.tTe}`)}</h3>
              <p className="strn">
                {house.tr} &nbsp;·&nbsp; {sheetSign.full || sheetSign.k} ({sheetSign.en})
              </p>
              <p className="sgov">{lang === "te" ? house.gTe : house.g}</p>
              {varga === "D1" && (
                <p className="strn">
                  {t(`Lord: ${grahaName(SIGN_LORDS[openHouse.sign], "en")}`, `అధిపతి: ${grahaName(SIGN_LORDS[openHouse.sign], "te")}`)}
                  {(aspectingBySign.get(openHouse.sign) ?? []).length > 0 && (
                    <>
                      {" "}&nbsp;·&nbsp;{" "}
                      {t(
                        `Aspected by ${(aspectingBySign.get(openHouse.sign) ?? []).map((n) => grahaName(n, "en")).join(", ")}`,
                        `దృష్టి: ${(aspectingBySign.get(openHouse.sign) ?? []).map((n) => grahaName(n, "te")).join(", ")}`,
                      )}
                    </>
                  )}
                </p>
              )}
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
                    const d1 = varga === "D1" ? d1ByName.get(p.name) : undefined;
                    const houseNum = ((p.sign - lagnaSign + 12) % 12) + 1;
                    return (
                      <div className="prow" key={i}>
                        <span className="pn">
                          <GrahaIcon name={p.name} size={24} decorative />
                          {grahaName(p.name, lang)}
                          <span>{p.name}</span>
                        </span>
                        <span className="pd">
                          {[
                            p.deg != null ? dms(p.deg) : "",
                            d1 ? `${nakName(d1.nakshatra, lang)} ${d1.pada}` : "",
                            `${t("house", "భావం")} ${houseNum}`,
                            `${t("lord", "అధిపతి")} ${grahaName(SIGN_LORDS[p.sign], lang)}`,
                            p.retro ? "R" : "",
                            dg?.dignity && dg.dignity !== "neutral" ? dg.dignity : "",
                            dg?.combust ? t("combust", "అస్తంగత") : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              {openLedger && (openLedger.support.length > 0 || openLedger.opposition.length > 0) && (
                <div className="hledger">
                  <p className="sectitle">{t("Calculated evidence for this house", "ఈ భావానికి గణించిన ఆధారాలు")}</p>
                  {openLedger.support.slice(0, 4).map((item) => (
                    <p className="hsup" key={item}>{item}</p>
                  ))}
                  {openLedger.opposition.slice(0, 4).map((item) => (
                    <p className="hopp" key={item}>{item}</p>
                  ))}
                </div>
              )}
              <div className="sheetact">
                <button className="btn" type="button" onClick={() => setOpenHouse(null)}>
                  {t("Close", "మూసివేయి")}
                </button>
                <button className="btn" type="button" onClick={() => {
                  saveChartAskContext({
                    division: varga === "D1" ? "d1" : varga === "D9" ? "d9" : varga === "D10" ? "d10" : varga === "D7" ? "d7" : "d12",
                    house: openHouse.house,
                    sign: `${sheetSign.full || sheetSign.k} (${sheetSign.en})`,
                    planets: sheetPlanets.map((planet) => planet.name),
                  });
                  navigate("ask");
                }}>
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
