import { useEffect, useState } from "react";
import "./today.css";
import { useLang, LangToggle, Rich } from "../lang";
import { useData } from "../data";
import { navigate } from "../router";
import { StatusBar, TabBar } from "../shell";
import {
  clock,
  windowRange,
  minutesOfDay,
  nowMinutes,
  monthYear,
  dayMonthYear,
  grahaName,
  nakName,
  signName,
  taraBala,
  chandraBala,
  SIGN_LORDS,
} from "../format";
import { fetchTodayBrief, type JdWindow, type Placement, type TodayBrief } from "../api";
import { BriefAlert } from "./BriefAlert";

const AXIS_START = 6 * 60; // 6 am
const AXIS_SPAN = 16 * 60; // to 10 pm

function block(win: JdWindow | undefined, tzOffset: number) {
  if (!win) return null;
  const s = minutesOfDay(win.startIso, tzOffset);
  const e = minutesOfDay(win.endIso, tzOffset);
  const left = ((s - AXIS_START) / AXIS_SPAN) * 100;
  const width = ((e - s) / AXIS_SPAN) * 100;
  return { left: Math.max(0, Math.min(100, left)), width: Math.max(0, Math.min(100, width)) };
}

export function TodayScreen() {
  const { lang, t } = useLang();
  const { profile, today, chart, transit, dasha } = useData();
  const [openChip, setOpenChip] = useState<string | null>(null);
  const [brief, setBrief] = useState<TodayBrief | null>(null);
  useEffect(() => {
    let live = true;
    setBrief(null);
    if (profile) {
      fetchTodayBrief(profile)
        .then((b) => {
          if (live) setBrief(b);
        })
        .catch(() => {
          /* the panchanga card below remains the fallback */
        });
    }
    return () => {
      live = false;
    };
  }, [profile?.date, profile?.time, profile?.latitude, profile?.longitude]);

  const tz = profile?.timezoneOffset ?? 0;
  const td = today.data;

  const moonOf = (arr?: Placement[]) => arr?.find((p) => p.name === "Moon");
  const natalMoon = moonOf(chart.data?.placements);
  const transitMoon = moonOf(transit.data?.placements);
  const todayNak = transitMoon?.nakshatra || td?.fiveLimbs.nakshatra || "";

  const tara = natalMoon && todayNak ? taraBala(natalMoon.nakshatra, todayNak) : null;
  const chandra =
    natalMoon && transitMoon ? chandraBala(natalMoon.sign, transitMoon.sign) : null;

  const favCount = (tara?.favorable ? 1 : 0) + (chandra?.favorable ? 1 : 0);
  // Server-computed brief wins when available: same engine as MCP, with the
  // running sub-period and a one-line "why today feels this way" reading.
  const quality = brief?.quality
    ?? (tara && chandra ? (favCount === 2 ? "good" : favCount === 1 ? "mixed" : "hard") : "good");
  const qualLabel =
    quality === "good"
      ? t("Supportive", "అనుకూలం")
      : quality === "mixed"
        ? t("Mixed", "మిశ్రమం")
        : t("Demanding", "కఠినం");

  const rahu = td?.inauspicious.rahuKaal;
  const rahuRange = rahu ? windowRange(rahu.startIso, rahu.endIso, tz) : "—";
  const dateLabel = td ? dayMonthYear(td.date + "T12:00:00Z", lang) : "";
  const placeLabel = profile?.place ?? td?.location.place ?? "";

  // dasha "running now"
  const cur = dasha.data?.current;
  const mahaB = cur?.boundaries.mahadasha;
  const mahaLord = cur?.mahadasha ?? "";
  const mahaYears = mahaB ? Math.round((Date.parse(mahaB.endIso) - Date.parse(mahaB.startIso)) / (365.2425 * 86400000)) : 0;

  return (
    <>
      <StatusBar />
      <main className="screen today-screen" id="content">
        <header className="shead headrow today-heading">
          <h2>{t("Today", "ఈ రోజు")}</h2>
          <LangToggle />
        </header>

        {today.status === "error" && (
          <p className="muted small">{t("Today's timings could not be loaded.", "ఈ రోజు సమయాలు లోడ్ కాలేదు.")}</p>
        )}

        {td && (
          <>
            <section className="card">
              <div className="rowb">
                <span className={`qual qual-${quality}`}>
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <circle cx="6" cy="6" r="5" fill="currentColor" />
                  </svg>
                  <span>{qualLabel}</span>
                </span>
                <span className="small muted mono">
                  {profile?.name ? t(`for ${profile.name.split(" ")[0]}`, `${profile.name.split(" ")[0]} కోసం`) : ""}
                </span>
              </div>
              <p className="verdict">
                {quality === "good"
                  ? t(
                      `A generally supportive day. ${rahuRange} is traditionally kept free for important new beginnings. If nothing important is planned, follow your day as usual.`,
                      `సాధారణంగా అనుకూలమైన రోజు. ${rahuRange} సమయాన్ని ముఖ్యమైన కొత్త ప్రారంభాలకు సంప్రదాయంగా నివారిస్తారు. ముఖ్యమైన పని ఏదీ లేకపోతే, మీ రోజును మామూలుగానే కొనసాగించండి.`,
                    )
                  : t(
                      `A mixed day. Take important decisions slowly, especially during ${rahuRange}. Routine plans can continue as usual.`,
                      `మిశ్రమమైన రోజు. ముఖ్యంగా ${rahuRange} సమయంలో ముఖ్యమైన నిర్ణయాలు నెమ్మదిగా తీసుకోండి. సాధారణ పనులను మామూలుగానే కొనసాగించవచ్చు.`,
                    )}
              </p>
              {brief ? (
                <div className="whybody">
                  <p className="verdict-why">{brief.whyToday}</p>
                  <div className="ev">
                    {brief.taraBala && (
                      <span className="evchip">
                        {t(
                          `Tara bala · ${brief.taraBala.count} · ${brief.taraBala.favorable ? "favourable" : "guarded"}`,
                          `తార బల · ${brief.taraBala.count} · ${brief.taraBala.favorable ? "అనుకూలం" : "జాగ్రత్త"}`,
                        )}
                      </span>
                    )}
                    {brief.chandraBala && (
                      <span className="evchip">
                        {t(
                          `Chandra bala · ${brief.chandraBala.houseFromNatalMoon}th from natal Moon`,
                          `చంద్ర బల · జన్మ చంద్రుని నుండి ${brief.chandraBala.houseFromNatalMoon}వ`,
                        )}
                      </span>
                    )}
                    {brief.runningPeriod.pratyantardasha && (
                      <span className="evchip">
                        {t(
                          `${brief.runningPeriod.mahadasha} / ${brief.runningPeriod.antardasha} / ${brief.runningPeriod.pratyantardasha}`,
                          `${brief.runningPeriod.mahadasha} / ${brief.runningPeriod.antardasha} / ${brief.runningPeriod.pratyantardasha}`,
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                tara && chandra && (
                  <details className="why">
                    <summary>{t("Why this reading?", "ఎందుకు ఇలా?")}</summary>
                    <div className="whybody">
                      <span>
                        {t(
                          "Two personal checks are run against your birth star.",
                          "మీ జన్మ నక్షత్రం ఆధారంగా రెండు వ్యక్తిగత పరీక్షలు చేస్తాం.",
                        )}
                      </span>
                      <div className="ev">
                        <span className="evchip">
                          {t(
                            `Tara bala · ${tara.count} · ${tara.favorable ? "favourable" : "guarded"}`,
                            `తార బల · ${tara.count} · ${tara.favorable ? "అనుకూలం" : "జాగ్రత్త"}`,
                          )}
                        </span>
                        <span className="evchip">
                          {t(
                            `Chandra bala · ${chandra.house}th from natal Moon`,
                            `చంద్ర బల · జన్మ చంద్రుని నుండి ${chandra.house}వ`,
                          )}
                        </span>
                      </div>
                    </div>
                  </details>
                )
              )}
            </section>

            <section style={{ marginTop: "var(--space-6)" }}>
              <p className="sectitle">{t("Times to keep clear today", "ఈ రోజు ఖాళీగా ఉంచవలసిన సమయాలు")}</p>
              <DayBar td={td} tz={tz} />
              <div style={{ marginTop: "var(--space-4)" }}>
                <WindowRow
                  icon="rahu-kala"
                  name={t("Most-watched window", "అందరూ చూసే సమయం")}
                  sub="Rahu kalam · రాహు కాలం · ராகு காலம்"
                  win={td.inauspicious.rahuKaal}
                  tz={tz}
                />
                <WindowRow
                  icon="gulika"
                  name={t("Midday window", "మధ్యాహ్న సమయం")}
                  sub="Gulika kalam · గుళిక కాలం · குளிகை"
                  win={td.inauspicious.gulikaKaal}
                  tz={tz}
                />
                <WindowRow
                  icon="yamagandam"
                  name={t("Death-lord window", "యమగండం")}
                  sub="Yamagandam · యమగండం · யமகண்டம்"
                  win={td.inauspicious.yamaganda}
                  tz={tz}
                />
              </div>
            </section>

            <section style={{ marginTop: "var(--space-6)" }}>
              <p className="sectitle">{t("The day itself — tap any one to read it", "రోజు వివరాలు — ఏదైనా ఒకటి నొక్కి చదవండి")}</p>
              <div className="chips">
                <Chip
                  id="tithi"
                  open={openChip}
                  setOpen={setOpenChip}
                  cen={t(`${td.fiveLimbs.paksha === "Krishna" ? "Waning" : "Waxing"} moon`, td.fiveLimbs.paksha === "Krishna" ? "క్షీణ చంద్రుడు" : "వృద్ధి చంద్రుడు")}
                  ctr={`${td.fiveLimbs.tithi} · ${td.fiveLimbs.paksha}`}
                />
                <Chip
                  id="nak"
                  open={openChip}
                  setOpen={setOpenChip}
                  cen={t("Moon's star", "చంద్రుని నక్షత్రం")}
                  ctr={nakName(td.fiveLimbs.nakshatra, lang)}
                />
                <Chip
                  id="yoga"
                  open={openChip}
                  setOpen={setOpenChip}
                  cen={t("Sun–Moon join", "సూర్య–చంద్ర కలయిక")}
                  ctr={td.fiveLimbs.yoga}
                />
                <Chip
                  id="karana"
                  open={openChip}
                  setOpen={setOpenChip}
                  cen={t("Half-day sign", "అర్ధ దిన సంకేతం")}
                  ctr={td.fiveLimbs.karana}
                />
              </div>
              <ChipNote id="tithi" open={openChip}>
                <Rich
                  as="span"
                  en={`<b>${td.fiveLimbs.tithi}, ${td.fiveLimbs.paksha} paksha.</b> The lunar day the Moon is in right now — one of the five limbs of the panchanga.`}
                  te={`<b>${td.fiveLimbs.tithi}, ${td.fiveLimbs.paksha} పక్షం.</b> చంద్రుడు ప్రస్తుతం ఉన్న తిథి — పంచాంగంలోని ఐదు అంగాలలో ఒకటి.`}
                />
              </ChipNote>
              <ChipNote id="nak" open={openChip}>
                <Rich
                  as="span"
                  en={`<b>${td.fiveLimbs.nakshatra}.</b> The star the Moon travels through today.${tara ? ` It falls ${tara.count} from your birth star.` : ""}`}
                  te={`<b>${nakName(td.fiveLimbs.nakshatra, "te")}.</b> ఈ రోజు చంద్రుడు సంచరించే నక్షత్రం.${tara ? ` మీ జన్మ నక్షత్రం నుండి ఇది ${tara.count}వది.` : ""}`}
                />
              </ChipNote>
              <ChipNote id="yoga" open={openChip}>
                <Rich
                  as="span"
                  en={`<b>${td.fiveLimbs.yoga} yoga.</b> A measure of the angular distance between Sun and Moon, in twenty-seven steps.`}
                  te={`<b>${td.fiveLimbs.yoga} యోగం.</b> సూర్యుడికి చంద్రుడికి మధ్య దూరాన్ని ఇరవై ఏడు భాగాలుగా కొలిచేది.`}
                />
              </ChipNote>
              <ChipNote id="karana" open={openChip}>
                <Rich
                  as="span"
                  en={`<b>${td.fiveLimbs.karana} karana.</b> Half of a lunar day — the sixth limb of the panchanga.`}
                  te={`<b>${td.fiveLimbs.karana} కరణం.</b> ఒక తిథిలో సగం — పంచాంగంలోని ఆరవ అంగం.`}
                />
              </ChipNote>
            </section>

            {cur && mahaLord && (
              <section style={{ marginTop: "var(--space-6)" }}>
                <p className="sectitle">{t("Running in your chart right now", "ప్రస్తుతం మీ జాతకంలో నడుస్తున్నవి")}</p>
                <div className="pnote">
                  <p>
                    {t(
                      `You are in a ${mahaYears}-year ${grahaName(mahaLord, "en")} period. It closes in ${mahaB ? monthYear(mahaB.endIso, "en") : ""}.`,
                      `మీరు ${mahaYears} సంవత్సరాల ${grahaName(mahaLord, "te")} దశలో ఉన్నారు. ఇది ${mahaB ? monthYear(mahaB.endIso, "te") : ""}లో ముగుస్తుంది.`,
                    )}
                  </p>
                  <details className="why">
                    <summary>{t("What that means", "దీని అర్థం ఏమిటి")}</summary>
                    <div className="whybody">
                      <span>
                        {t(
                          `Your life runs in planetary periods in a fixed order from birth. The ${grahaName(mahaLord, "en")} period began in ${mahaB ? monthYear(mahaB.startIso, "en") : ""}. Within it, the ${grahaName(cur.antardasha || "", "en")} sub-period is running now.`,
                          `పుట్టినప్పటి నుండి మీ జీవితం నిర్ణీత క్రమంలో గ్రహ దశలుగా విభజించబడి ఉంటుంది. ${grahaName(mahaLord, "te")} దశ ${mahaB ? monthYear(mahaB.startIso, "te") : ""}లో మొదలైంది. దాని లోపల ${grahaName(cur.antardasha || "", "te")} అంతర్దశ ఇప్పుడు నడుస్తోంది.`,
                        )}
                      </span>
                      <div className="ev">
                        <span className="evchip">Vimshottari · {grahaName(mahaLord, lang)} mahadasha</span>
                        {cur.antardasha && (
                          <span className="evchip">
                            {grahaName(cur.antardasha, lang)} antardasha
                            {cur.boundaries.antardasha ? ` · ${dayMonthYear(cur.boundaries.antardasha.startIso, lang)}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
                {natalMoon && (
                  <div className="pnote">
                    <p>
                      {t(
                        `Your birth Moon sits in ${signName(natalMoon.sign, "en")}, ruled by ${grahaName(SIGN_LORDS[natalMoon.sign], "en")}.`,
                        `మీ జన్మ చంద్రుడు ${signName(natalMoon.sign, "te")} రాశిలో ఉన్నాడు — దీని అధిపతి ${grahaName(SIGN_LORDS[natalMoon.sign], "te")}.`,
                      )}
                    </p>
                    <div className="ev">
                      <span className="evchip">
                        Moon · {signName(natalMoon.sign, lang)} · {nakName(natalMoon.nakshatra, lang)} {natalMoon.pada}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}

            <section style={{ marginTop: "var(--space-5)" }}>
              <details className="more">
                <summary>{t("More timings", "మరిన్ని సమయాలు")}</summary>
                <div className="morebody">
                  <TRow label={t("Sunrise", "సూర్యోదయం")} value={clock(td.solar.sunrise, tz)} />
                  <TRow label={t("Sunset", "సూర్యాస్తమయం")} value={clock(td.solar.sunset, tz)} />
                  {td.solar.moonrise.instantIso && (
                    <TRow label={t("Moonrise", "చంద్రోదయం")} value={clock(td.solar.moonrise.instantIso, tz)} />
                  )}
                  {td.solar.moonset.instantIso && (
                    <TRow label={t("Moonset", "చంద్రాస్తమయం")} value={clock(td.solar.moonset.instantIso, tz)} />
                  )}
                  <TRow
                    label={t("Abhijit — the clear midday hour", "అభిజిత్ — మధ్యాహ్నపు మంచి గడియ")}
                    value={windowRange(td.auspicious.abhijitMuhurta.startIso, td.auspicious.abhijitMuhurta.endIso, tz)}
                  />
                  <TRow
                    label={t("Brahma muhurtam — before dawn", "బ్రహ్మ ముహూర్తం — తెల్లవారుజామున")}
                    value={windowRange(td.auspicious.brahmaMuhurta.startIso, td.auspicious.brahmaMuhurta.endIso, tz)}
                  />
                  <TRow
                    label={t("Bhadra / Vishti", "భద్ర / విష్టి")}
                    value={td.inauspicious.bhadraVishti.active ? t("active", "ఉంది") : t("not active", "లేదు")}
                  />
                  <TRow label={t("Season · half-year", "ఋతువు · అయనం")} value={`${td.calendar.ritu} · ${td.calendar.ayana}`} />
                  <p className="unavail">
                    {t(
                      "Not shown: durmuhurtam, varjyam and amrita kalam. Sahadeva has the calculation but not a reviewed rule for them yet, so it will not guess.",
                      "చూపించనివి: దుర్ముహూర్తం, వర్జ్యం, అమృత కాలం. సహదేవ దగ్గర లెక్క ఉంది, కానీ వీటికి సమీక్షించిన నియమం ఇంకా లేదు — కాబట్టి ఊహించి చెప్పదు.",
                    )}
                  </p>
                </div>
              </details>
            </section>

            <div style={{ marginTop: "var(--space-6)" }}>
              <BriefAlert />
            </div>

            <div style={{ marginTop: "var(--space-6)" }}>
              <button
                className="btn btn-primary btn-full"
                type="button"
                onClick={() => navigate("ask")}
              >
                {t("Ask about today", "ఈ రోజు గురించి అడగండి")}
              </button>
            </div>
          </>
        )}

        <p className="foot">
          {profile ? `${profile.name} · ${dateLabel} · ${placeLabel}` : ""}
          <br />
          {t(
            "Lahiri sidereal · whole-sign houses · computed, not estimated.",
            "లాహిరి అయనాంశ · పూర్ణరాశి భావాలు · గణించినది, ఊహించినది కాదు.",
          )}
        </p>
      </main>
      <TabBar current="today" />
    </>
  );
}

function DayBar({ td, tz }: { td: NonNullable<ReturnType<typeof useData>["today"]["data"]>; tz: number }) {
  const now = nowMinutes(tz);
  const nowLeft = Math.max(0, Math.min(100, ((now - AXIS_START) / AXIS_SPAN) * 100));
  const wins = [td.inauspicious.yamaganda, td.inauspicious.gulikaKaal, td.inauspicious.rahuKaal];
  const { t } = useLang();
  return (
    <>
      <div className="daybar" role="img" aria-label={t("Windows to keep clear today.", "ఈ రోజు తప్పించవలసిన సమయాలు.")}>
        {wins.map((w, i) => {
          const b = block(w, tz);
          return b ? <div key={i} className="dblock" style={{ left: `${b.left}%`, width: `${b.width}%` }} /> : null;
        })}
        <div className="dnow" style={{ left: `${nowLeft}%` }} />
      </div>
      <div className="dscale">
        <span>{t("6 am", "ఉ. 6")}</span>
        <span>{t("10 am", "ఉ. 10")}</span>
        <span>{t("2 pm", "మ. 2")}</span>
        <span>{t("6 pm", "సా. 6")}</span>
        <span>{t("10 pm", "రా. 10")}</span>
      </div>
    </>
  );
}

function WindowRow({ icon, name, sub, win, tz }: { icon: string; name: string; sub: string; win: JdWindow; tz: number }) {
  return (
    <div className="wrow">
      <img className="timing-icon" src={`/brand/sahadeva/timing/${icon}-24.svg`} alt="" />
      <span className="wname">
        {name}
        <span>{sub}</span>
      </span>
      <span className="wtime">{windowRange(win.startIso, win.endIso, tz)}</span>
    </div>
  );
}

function Chip({
  id,
  open,
  setOpen,
  cen,
  ctr,
}: {
  id: string;
  open: string | null;
  setOpen: (v: string | null) => void;
  cen: string;
  ctr: string;
}) {
  return (
    <button
      className="chip"
      type="button"
      aria-expanded={open === id}
      onClick={() => setOpen(open === id ? null : id)}
    >
      <span className="cen">{cen}</span>
      <span className="ctr">{ctr}</span>
    </button>
  );
}

function ChipNote({ id, open, children }: { id: string; open: string | null; children: React.ReactNode }) {
  return <div className={`chipnote${open === id ? " on" : ""}`}>{children}</div>;
}

function TRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="trow">
      <span>{label}</span>
      <span className="tv">{value}</span>
    </div>
  );
}
