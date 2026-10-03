import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import "./calendar.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { navigate } from "../router";
import { StatusBar, TabBar } from "../shell";
import { Glyph } from "../glyph";
import { MoonPhase } from "../moonPhase";
import { ErrorNote } from "../states";
import { prefillAsk } from "../prefill";
import { clock, grahaName, nakName, taraBala } from "../format";
import {
  fetchCalendarMonth,
  fetchPanchangaDay,
  type CalendarDay,
  type CalendarMonth,
  type CalendarPlace,
  type DayPanchanga,
  type Hora,
  type JdWindow,
  type Lang,
  type LimbSpan,
  type Observance,
  type Profile,
  type TimedSegment,
} from "../api";
import {
  MONTH_LONG,
  WEEKDAY_SHORT,
  ayanaName,
  choghadiyaName,
  limbName,
  masaName,
  pakshaName,
  rituName,
  tithiName,
  varaName,
} from "../panchangaNames";

/* ── place: birth place by default, or the device's location ────────────── */

const PLACE_KEY = "sahadeva.calendar.place";

function birthPlace(profile: Profile | null): CalendarPlace | null {
  if (!profile) return null;
  return {
    label: profile.place,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    timezoneOffset: profile.timezoneOffset,
  };
}

function loadDevicePlace(): CalendarPlace | null {
  try {
    const raw = JSON.parse(localStorage.getItem(PLACE_KEY) || "null") as CalendarPlace | null;
    return raw && Number.isFinite(raw.latitude) && Number.isFinite(raw.longitude) ? raw : null;
  } catch {
    return null;
  }
}

/* ── dates ───────────────────────────────────────────────────────────────── */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayAt(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 3_600_000).toISOString().slice(0, 10);
}
function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function localDateOf(iso: string, offsetHours: number) {
  return new Date(Date.parse(iso) + offsetHours * 3_600_000).toISOString().slice(0, 10);
}
function dateFromHash(): string | null {
  const m = /[?&]d=(\d{4}-\d{2}-\d{2})/.exec(window.location.hash);
  return m ? m[1] : null;
}
function longDate(date: string, lang: Lang) {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const vara = lang === "te" ? WEEKDAY_SHORT.te[wd] + "వారం" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][wd];
  return `${vara}, ${d} ${MONTH_LONG[lang][m - 1]} ${y}`;
}

/* ── screen ──────────────────────────────────────────────────────────────── */

export function CalendarScreen() {
  const { lang, t } = useLang();
  const { profile, chart } = useData();
  const [device, setDevice] = useState<CalendarPlace | null>(loadDevicePlace);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const place = device ?? birthPlace(profile);
  const offset = place?.timezoneOffset ?? 5.5;
  const today = todayAt(offset);

  const [selected, setSelected] = useState<string>(() => {
    const fromHash = dateFromHash();
    return fromHash && DATE_RE.test(fromHash) ? fromHash : todayAt(place?.timezoneOffset ?? 5.5);
  });
  const year = Number(selected.slice(0, 4)),
    month = Number(selected.slice(5, 7));

  // Keep the selected day in the URL so a day can be bookmarked or shared.
  useEffect(() => {
    try {
      history.replaceState(null, "", `#calendar?d=${selected}`);
    } catch {
      /* ignore */
    }
  }, [selected]);

  const [monthState, setMonthState] = useState<{ status: "loading" | "ready" | "error"; data?: CalendarMonth; error?: unknown }>({
    status: "loading",
  });
  const [dayState, setDayState] = useState<{ status: "loading" | "ready" | "error"; data?: DayPanchanga; error?: unknown }>({
    status: "loading",
  });
  const [attempt, setAttempt] = useState(0);

  const placeKey = place ? `${place.latitude.toFixed(3)},${place.longitude.toFixed(3)},${place.timezone ?? place.timezoneOffset}` : "";

  useEffect(() => {
    if (!place) return;
    let alive = true;
    setMonthState((s) => ({ status: "loading", data: s.data && s.data.year === year && s.data.month === month ? s.data : undefined }));
    fetchCalendarMonth(place, year, month, "en")
      .then((data) => alive && setMonthState({ status: "ready", data }))
      .catch((error) => alive && setMonthState({ status: "error", error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, year, month, attempt]);

  useEffect(() => {
    if (!place) return;
    let alive = true;
    setDayState({ status: "loading" });
    fetchPanchangaDay(place, selected, "en")
      .then((data) => alive && setDayState({ status: "ready", data }))
      .catch((error) => alive && setDayState({ status: "error", error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, selected, attempt]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocError(t("This browser cannot share a location.", "ఈ బ్రౌజర్ స్థానాన్ని పంచుకోలేదు."));
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: CalendarPlace = {
          label: t("Your location", "మీ ప్రస్తుత స్థానం"),
          latitude: Number(pos.coords.latitude.toFixed(3)),
          longitude: Number(pos.coords.longitude.toFixed(3)),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffset: -new Date().getTimezoneOffset() / 60,
        };
        try {
          localStorage.setItem(PLACE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        setDevice(next);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError(t("Location permission was not given.", "స్థానం అనుమతి ఇవ్వలేదు."));
      },
      { maximumAge: 3_600_000, timeout: 15_000 },
    );
  }
  function useBirthPlace() {
    try {
      localStorage.removeItem(PLACE_KEY);
    } catch {
      /* ignore */
    }
    setDevice(null);
  }

  const days = monthState.data?.days ?? [];
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const natalMoon = chart.data?.placements.find((p) => p.name === "Moon");

  const monthMasas = useMemo(() => {
    const names: string[] = [];
    for (const d of days) {
      const n = masaName(d.masa.amanta, d.masa.adhika, lang);
      if (names[names.length - 1] !== n) names.push(n);
    }
    return names;
  }, [days, lang]);
  const monthObservances = days.flatMap((d) => d.observances.map((o) => ({ date: d.date, o })));

  if (!place)
    return (
      <>
        <StatusBar />
        <main className="screen calendar-screen" id="content">
          <p className="muted">{t("Add your birth details to see the panchangam.", "పంచాంగం చూడటానికి మీ జనన వివరాలు ఇవ్వండి.")}</p>
        </main>
        <TabBar current="calendar" />
      </>
    );

  return (
    <>
      <StatusBar />
      <main className="screen calendar-screen" id="content">
        <header className="shead headrow">
          <span>
            <p className="eyebrow">{t(`Panchangam for ${place.label}`, `${place.label} పంచాంగం`)}</p>
            <h2>{t("Panchangam", "పంచాంగం")}</h2>
          </span>
          <LangToggle />
        </header>

        <div className="placebar">
          <span className="placechip">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11Z" />
              <circle cx="12" cy="10" r="2.2" />
            </svg>
            {device ? t("Using your current location", "మీ ప్రస్తుత స్థానం") : t(`Using your birth place, ${place.label}`, `మీ జన్మస్థలం ${place.label}`)}
          </span>
          {device ? (
            <button type="button" className="linkbtn" onClick={useBirthPlace}>
              {t("Use birth place", "జన్మస్థలం వాడండి")}
            </button>
          ) : (
            <button type="button" className="linkbtn" onClick={useMyLocation} disabled={locating}>
              {locating ? t("Locating…", "వెతుకుతోంది…") : t("Use my location", "నా స్థానం వాడండి")}
            </button>
          )}
        </div>
        {locError && <p className="small muted" role="status">{locError}</p>}

        {/* ── month ── */}
        <section className="monthcard" aria-label={t("Month calendar", "నెల క్యాలెండర్")}>
          <div className="monthnav">
            <button type="button" className="navbtn" aria-label={t("Previous month", "గత నెల")} onClick={() => setSelected(firstOfMonth(year, month, -1))}>
              <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <div className="monthtitle">
              <h3>{`${MONTH_LONG[lang][month - 1]} ${year}`}</h3>
              <p className="small muted">{monthMasas.length ? monthMasas.join(" → ") : " "}</p>
              {selected !== today && (
                <button type="button" className="todaybtn" onClick={() => setSelected(today)}>
                  {t("Back to today", "ఈ రోజుకు వెళ్ళండి")}
                </button>
              )}
            </div>
            <button type="button" className="navbtn" aria-label={t("Next month", "వచ్చే నెల")} onClick={() => setSelected(firstOfMonth(year, month, 1))}>
              <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <MonthGrid
            year={year}
            month={month}
            byDate={byDate}
            loading={monthState.status === "loading"}
            selected={selected}
            today={today}
            onSelect={setSelected}
          />
          {monthState.status === "error" && (
            <ErrorNote error={monthState.error} what={t("This month could not be calculated.", "ఈ నెల లెక్కించలేకపోయాం.")} onRetry={() => setAttempt((n) => n + 1)} />
          )}
          <p className="legendline small muted">
            <span className="lgd lgd-fest" /> {t("festival", "పండుగ")}
            <span className="lgd lgd-vrata" /> {t("ekadashi", "ఏకాదశి")}
            <span className="lgd lgd-solar" /> {t("sankranti", "సంక్రాంతి")}
            <MoonPhase tithi={10} size={12} className="lgd-moon" /> {t("moon phase at sunrise", "సూర్యోదయ చంద్ర కళ")}
          </p>
        </section>

        {/* ── selected day ── */}
        <div className="daynav">
          <button type="button" className="navbtn" aria-label={t("Previous day", "ముందు రోజు")} onClick={() => setSelected(shiftDate(selected, -1))}>
            <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <div className="daytitle">
            <h3>{longDate(selected, lang)}</h3>
            {selected === today && <span className="todaytag">{t("Today", "ఈ రోజు")}</span>}
          </div>
          <button type="button" className="navbtn" aria-label={t("Next day", "తర్వాతి రోజు")} onClick={() => setSelected(shiftDate(selected, 1))}>
            <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {dayState.status === "loading" && <div className="skeleton" aria-busy="true" aria-label={t("Loading", "లోడ్ అవుతోంది")} />}
        {dayState.status === "error" && (
          <ErrorNote error={dayState.error} what={t("This day could not be calculated.", "ఈ రోజు లెక్కించలేకపోయాం.")} onRetry={() => setAttempt((n) => n + 1)} />
        )}
        {dayState.status === "ready" && dayState.data && dayState.data.day && (
          <DayView data={dayState.data} isToday={selected === today} natalNakshatra={natalMoon?.nakshatra} />
        )}

        {monthObservances.length > 0 && (
          <section className="obslist" aria-label={t("Observances this month", "ఈ నెల పర్వదినాలు")}>
            <p className="sectitle">{t(`Festivals and observances — ${MONTH_LONG.en[month - 1]}`, `${MONTH_LONG.te[month - 1]} పండుగలు, పర్వదినాలు`)}</p>
            {monthObservances.map(({ date, o }) => (
              <button key={date + o.id + o.en} type="button" className={`obsrow kind-${o.kind}`} aria-pressed={date === selected} onClick={() => setSelected(date)}>
                <span className="obsdate">
                  <b>{Number(date.slice(8))}</b>
                  <span>{WEEKDAY_SHORT[lang][new Date(`${date}T00:00:00Z`).getUTCDay()]}</span>
                </span>
                <span className="obsname">{lang === "te" ? o.te : o.en}</span>
                <span className={`obskind kind-${o.kind}`}>{kindLabel(o, lang)}</span>
              </button>
            ))}
          </section>
        )}

        <div className="askrow">
          <button
            className="askbtn"
            type="button"
            onClick={() => {
              prefillAsk(
                t(
                  `What does ${longDate(selected, "en")} look like for me, and what is it good for?`,
                  `${longDate(selected, "te")} నాకు ఎలా ఉంటుంది, ఏ పనులకు అనుకూలం?`,
                ),
              );
              navigate("ask");
            }}
          >
            {t("Ask about this day", "ఈ రోజు గురించి అడగండి")}
          </button>
        </div>

        <p className="foot">
          {monthState.data?.conventions?.limbs
            ? t(
                "Lahiri sidereal · sunrise to sunrise · each limb is named by the one running at sunrise, with exact end times · amanta lunar months with adhika detection.",
                "లాహిరి అయనాంశ · సూర్యోదయం నుండి సూర్యోదయం వరకు · సూర్యోదయ సమయంలో ఉన్న అంగమే ఆ రోజు పేరు, ఖచ్చితమైన ముగింపు సమయాలతో · అమాంత మాసాలు, అధిక మాస గుర్తింపుతో.",
              )
            : ""}
          <br />
          {t(
            "Festival dates follow each festival's traditional time of day; regional and sectarian practice can differ by a day — confirm important dates with your family priest or temple.",
            "పండుగ తేదీలు ఆయా పండుగల సాంప్రదాయ కాల నియమం ప్రకారం; ప్రాంతీయ ఆచారాలను బట్టి ఒక రోజు తేడా ఉండవచ్చు — ముఖ్యమైన తేదీలను మీ పురోహితుడు లేదా ఆలయంతో నిర్ధారించుకోండి.",
          )}
        </p>
      </main>
      <TabBar current="calendar" />
    </>
  );
}

function firstOfMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}

function kindLabel(o: Observance, lang: Lang) {
  const te = lang === "te";
  if (o.kind === "festival") return te ? "పండుగ" : "festival";
  if (o.kind === "vrata") return te ? "వ్రతం" : "vrata";
  if (o.kind === "solar") return te ? "సౌర" : "solar";
  return te ? "చంద్ర" : "lunar";
}

/* ── month grid ──────────────────────────────────────────────────────────── */

function MonthGrid({
  year,
  month,
  byDate,
  loading,
  selected,
  today,
  onSelect,
}: {
  year: number;
  month: number;
  byDate: Map<string, CalendarDay>;
  loading: boolean;
  selected: string;
  today: string;
  onSelect: (date: string) => void;
}) {
  const { lang } = useLang();
  const gridRef = useRef<HTMLDivElement>(null);
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<string | null> = [...Array(first).fill(null)];
  for (let d = 1; d <= count; d++) cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);

  // Arrow keys move the selection like a native date grid.
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    onSelect(shiftDate(selected, step));
  }
  useEffect(() => {
    if (gridRef.current?.contains(document.activeElement))
      gridRef.current.querySelector<HTMLButtonElement>(`[data-date="${selected}"]`)?.focus();
  }, [selected]);

  return (
    <div className="mgrid" role="grid" ref={gridRef} onKeyDown={onKey} aria-busy={loading}>
      <div className="mrow mhead" role="row">
        {WEEKDAY_SHORT[lang].map((w, i) => (
          <span key={w} role="columnheader" className={i === 0 ? "sun" : undefined}>
            {w}
          </span>
        ))}
      </div>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <div className="mrow" role="row" key={r}>
          {cells.slice(r * 7, r * 7 + 7).map((date, i) =>
            date ? (
              <DayCell key={date} date={date} day={byDate.get(date)} selected={date === selected} today={date === today} onSelect={onSelect} />
            ) : (
              <span key={`e${r}${i}`} className="mcell empty" role="gridcell" />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function DayCell({
  date,
  day,
  selected,
  today,
  onSelect,
}: {
  date: string;
  day?: CalendarDay;
  selected: boolean;
  today: boolean;
  onSelect: (date: string) => void;
}) {
  const { lang } = useLang();
  const udaya = day?.tithi[0];
  const fest = day?.observances.find((o) => o.kind === "festival");
  const kinds = new Set(day?.observances.map((o) => o.kind));
  const label = [
    longDate(date, lang),
    udaya ? `${pakshaName(udaya.paksha!, lang)} ${tithiName(udaya.name, lang)}` : "",
    day?.nakshatra[0] ? nakName(day.nakshatra[0].name, lang) : "",
    ...(day?.observances.map((o) => (lang === "te" ? o.te : o.en)) ?? []),
  ]
    .filter(Boolean)
    .join(", ");
  const short = udaya ? `${lang === "te" ? (udaya.paksha === "Krishna" ? "కృ" : "శు") : udaya.paksha === "Krishna" ? "K" : "S"}${udaya.number! > 15 ? udaya.number! - 15 : udaya.number}` : "";
  return (
    <button
      type="button"
      role="gridcell"
      data-date={date}
      className={`mcell${today ? " today" : ""}${udaya?.number === 15 ? " purnima" : ""}${udaya?.number === 30 ? " amavasya" : ""}`}
      aria-selected={selected}
      aria-current={today ? "date" : undefined}
      aria-label={label}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(date)}
    >
      <span className="mnum">{Number(date.slice(8))}</span>
      {udaya && <MoonPhase tithi={udaya.number!} size={16} className="mphase" />}
      <span className="mtithi">
        <span className="mshort">{short}</span>
        <span className="mlong">{udaya ? tithiName(udaya.name, lang) : ""}</span>
      </span>
      {fest && <span className="mfest">{lang === "te" ? fest.te : fest.en}</span>}
      {(kinds.has("festival") || kinds.has("vrata") || kinds.has("solar")) && (
        <span className="mdots" aria-hidden="true">
          {kinds.has("festival") && <i className="lgd-fest" />}
          {kinds.has("vrata") && <i className="lgd-vrata" />}
          {kinds.has("solar") && <i className="lgd-solar" />}
        </span>
      )}
    </button>
  );
}

/* ── day view ────────────────────────────────────────────────────────────── */

function DayView({ data, isToday, natalNakshatra }: { data: DayPanchanga; isToday: boolean; natalNakshatra?: string }) {
  const { lang, t } = useLang();
  const day = data.day;
  const off = day.offsetHours;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  /** "9:03 pm", with "· tomorrow"/"· yesterday" when it falls on another date. */
  const when = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const diff = (Date.parse(`${localDateOf(iso, off)}T00:00:00Z`) - Date.parse(`${day.date}T00:00:00Z`)) / 86_400_000;
    const tag = diff > 0 ? t(" · next day", " · మరుసటి రోజు") : diff < 0 ? t(" · previous day", " · ముందు రోజు") : "";
    return clock(iso, off) + tag;
  };
  const range = (w: JdWindow) => `${clock(w.startIso, off)} – ${clock(w.endIso, off)}`;
  const udaya = day.tithi[0];

  const tara = natalNakshatra && day.nakshatra[0] ? taraBala(natalNakshatra, day.nakshatra[0].name) : null;

  return (
    <div className="dayview">
      {/* hero */}
      <section className="dayhero">
        <p className="dhline">
          <b>{masaName(day.masa.amanta, day.masa.adhika, lang)}</b>
          {t(" masa · ", " మాసం · ")}
          {pakshaName(udaya?.paksha ?? "Shukla", lang)}
        </p>
        <p className="dhbig">
          {udaya && <MoonPhase tithi={udaya.number!} size={34} className="dhglyph" />}
          <span>
            {udaya ? tithiName(udaya.name, lang) : ""}
            <small>{udaya ? t(`until ${when(udaya.endIso)}`, `${when(udaya.endIso)} వరకు`) : ""}</small>
          </span>
        </p>
        <p className="dhmeta">
          {varaName(day.vara, lang)} · {rituName(day.ritu, lang)} · {ayanaName(day.ayana, lang)}
          {day.masa.purnimanta && day.masa.purnimanta !== day.masa.amanta
            ? t(` · ${day.masa.purnimanta} in the purnimanta reckoning`, ` · పూర్ణిమాంత లెక్కలో ${masaName(day.masa.purnimanta, false, "te")}`)
            : ""}
        </p>
        {day.observances.length > 0 && (
          <div className="dhobs">
            {day.observances.map((o) => (
              <span key={o.id + o.en} className={`obschip kind-${o.kind}`}>
                {lang === "te" ? o.te : o.en}
              </span>
            ))}
          </div>
        )}
        {day.sankranti && (
          <p className="small muted">
            {t(`The Sun enters ${day.sankranti.sign} at ${when(day.sankranti.instantIso)}.`, `సూర్యుడు ${when(day.sankranti.instantIso)}కి ${day.sankranti.sign} రాశిలో ప్రవేశిస్తాడు.`)}
          </p>
        )}
        <div className="sunmoon">
          <SunMoon glyph="sunrise" label={t("Sunrise", "సూర్యోదయం")} value={when(day.sunrise)} />
          <SunMoon glyph="sunset" label={t("Sunset", "సూర్యాస్తమయం")} value={when(day.sunset)} />
          <SunMoon graha="Moon" label={t("Moonrise", "చంద్రోదయం")} value={day.moon?.moonrise ? when(day.moon.moonrise) : t("none today", "ఈ రోజు లేదు")} />
          <SunMoon graha="Moon" label={t("Moonset", "చంద్రాస్తమయం")} value={day.moon?.moonset ? when(day.moon.moonset) : t("none today", "ఈ రోజు లేదు")} />
        </div>
      </section>

      {/* timeline */}
      <DayTimeline data={data} now={isToday ? now : null} />

      {/* five limbs */}
      <section className="limbs">
        <p className="sectitle">{t("The five limbs — from sunrise to the next sunrise", "పంచ అంగాలు — సూర్యోదయం నుండి మరుసటి సూర్యోదయం వరకు")}</p>
        <div className="limbrow">
          <span className="limbk">
            <Glyph family="graha" id={["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"][["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day.vara)]} size={22} />
            <span>{t("Vara", "వారం")}<small>{t("weekday", "వారం")}</small></span>
          </span>
          <span className="limbv">
            <b>{varaName(day.vara, lang)}</b>
          </span>
        </div>
        <LimbRow kind="tithi" label={t("Tithi", "తిథి")} sub={t("lunar day", "చాంద్రమాన దినం")} spans={day.tithi} when={when} />
        <LimbRow kind="nakshatra" label={t("Nakshatra", "నక్షత్రం")} sub={t("Moon's star", "చంద్ర నక్షత్రం")} spans={day.nakshatra} when={when} />
        <LimbRow kind="yoga" label={t("Yoga", "యోగం")} sub={t("Sun + Moon", "సూర్య + చంద్ర")} spans={day.yoga ?? []} when={when} />
        <LimbRow kind="karana" label={t("Karana", "కరణం")} sub={t("half tithi", "అర్ధ తిథి")} spans={day.karana ?? []} when={when} />
      </section>

      {/* windows */}
      <Windows data={data} now={isToday ? now : null} range={range} />

      {/* personal */}
      {tara && (
        <section className="personal">
          <p className="sectitle">{t("For you", "మీ కోసం")}</p>
          <div className={`pbala ${tara.favorable ? "ok" : "care"}`}>
            <Glyph family="nakshatra" id={day.nakshatra[0].name} size={26} />
            <span>
              <b>
                {t(`Tara bala: ${tara.nameEn} (${tara.count})`, `తార బలం: ${tara.nameTe} (${tara.count})`)} —{" "}
                {tara.favorable ? t("favourable", "అనుకూలం") : t("go gently", "జాగ్రత్త")}
              </b>
              <small>
                {t(
                  `The Moon's star at sunrise, ${nakName(day.nakshatra[0].name, "en")}, is ${tara.count} from your birth star, ${nakName(natalNakshatra!, "en")}. A traditional lens for timing, not a verdict.`,
                  `సూర్యోదయ సమయంలో చంద్ర నక్షత్రం ${nakName(day.nakshatra[0].name, "te")}, మీ జన్మ నక్షత్రం ${nakName(natalNakshatra!, "te")} నుండి ${tara.count}వది. ఇది సాంప్రదాయ సమయ దృష్టి మాత్రమే, తీర్పు కాదు.`,
                )}
              </small>
            </span>
          </div>
        </section>
      )}

      {/* choghadiya + hora */}
      <Choghadiya data={data} now={isToday ? now : null} range={range} />
      <Horas horas={data.hora} now={isToday ? now : null} range={range} />

      <section className="notes">
        <p className="sectitle">{t("Not shown, on purpose", "ఉద్దేశపూర్వకంగా చూపనివి")}</p>
        <p className="small muted">
          {t(
            "Durmuhurtam, varjyam and amrita kalam need weekday- and nakshatra-specific rule tables that have not passed source review yet, so Sahadeva does not guess them.",
            "దుర్ముహూర్తం, వర్జ్యం, అమృత కాలం — వీటికి వార, నక్షత్ర ఆధారిత నియమ పట్టికలు ఇంకా సమీక్ష పూర్తి కాలేదు, కాబట్టి సహదేవ ఊహించి చెప్పదు.",
          )}
        </p>
      </section>
    </div>
  );
}

function SunMoon({ glyph, graha, label, value }: { glyph?: string; graha?: string; label: string; value: string }) {
  return (
    <div className="smitem">
      {glyph ? <Glyph family="timing" id={glyph} size={22} /> : <Glyph family="graha" id={graha!} size={22} />}
      <span>
        <small>{label}</small>
        <b>{value}</b>
      </span>
    </div>
  );
}

function LimbRow({
  kind,
  label,
  sub,
  spans,
  when,
}: {
  kind: "tithi" | "nakshatra" | "yoga" | "karana";
  label: string;
  sub: string;
  spans: LimbSpan[];
  when: (iso: string) => string;
}) {
  const { lang, t } = useLang();
  if (!spans.length) return null;
  const glyphFor = (s: LimbSpan) =>
    kind === "tithi" ? <MoonPhase tithi={s.number!} size={22} /> : <Glyph family={kind} id={s.name} size={22} />;
  return (
    <div className="limbrow">
      <span className="limbk">
        {glyphFor(spans[0])}
        <span>
          {label}
          <small>{sub}</small>
        </span>
      </span>
      <span className="limbv">
        {spans.map((s, i) => (
          <span key={s.startIso} className={i === 0 ? "lfirst" : "lnext"}>
            <b>
              {kind === "tithi" && s.paksha ? `${lang === "te" ? (s.paksha === "Krishna" ? "కృష్ణ " : "శుక్ల ") : s.paksha === "Krishna" ? "Krishna " : "Shukla "}` : ""}
              {limbName(kind, s.name, lang)}
            </b>
            <small>
              {i === 0 ? t(`until ${when(s.endIso)}`, `${when(s.endIso)} వరకు`) : t(`from ${when(s.startIso)}`, `${when(s.startIso)} నుండి`)}
            </small>
          </span>
        ))}
      </span>
    </div>
  );
}

/* A sunrise-to-sunrise bar: daylight / night, the classical windows and the
   tithi + nakshatra ribbons, with a live "now" marker on today. */
function DayTimeline({ data, now }: { data: DayPanchanga; now: number | null }) {
  const { lang, t } = useLang();
  const day = data.day;
  const off = day.offsetHours;
  if (!day.sunrise || !day.nextSunrise) return null;
  const a = Date.parse(day.sunrise),
    b = Date.parse(day.nextSunrise),
    span = b - a;
  const pct = (iso: string) => Math.max(0, Math.min(100, ((Date.parse(iso) - a) / span) * 100));
  const block = (w: JdWindow) => ({ left: `${pct(w.startIso)}%`, width: `${Math.max(0.6, pct(w.endIso) - pct(w.startIso))}%` });
  const sunsetPct = day.sunset ? pct(day.sunset) : 50;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, iso: new Date(a + span * f).toISOString() }));
  const ribbon = (spans: LimbSpan[], kind: "tithi" | "nakshatra") =>
    spans.map((s, i) => {
      const l = pct(s.startIso),
        r = pct(s.endIso);
      return (
        <span key={s.startIso} className={`rseg r${i % 2}`} style={{ left: `${l}%`, width: `${r - l}%` }} title={limbName(kind, s.name, lang)}>
          <span>{limbName(kind, s.name, lang)}</span>
        </span>
      );
    });
  const nowPct = now !== null && now >= a && now <= b ? ((now - a) / span) * 100 : null;
  return (
    <section className="timeline" aria-label={t("The day from sunrise to the next sunrise", "సూర్యోదయం నుండి మరుసటి సూర్యోదయం వరకు రోజు")}>
      <p className="sectitle">{t("The day at a glance", "ఒక చూపులో రోజు")}</p>
      <div className="tlwrap">
        <div className="tlbar">
          <span className="tlnight" style={{ left: `${sunsetPct}%` }} />
          {[data.inauspicious.rahuKaal, data.inauspicious.yamaganda, data.inauspicious.gulikaKaal].map((w, i) => (
            <span key={i} className="tlwatch" style={block(w)} />
          ))}
          <span className="tlgood" style={block(data.auspicious.abhijitMuhurta)} />
          {nowPct !== null && <span className="tlnow" style={{ left: `${nowPct}%` }} />}
        </div>
        <div className="ribbon" aria-hidden="true">{ribbon(day.tithi, "tithi")}</div>
        <div className="ribbon r-nak" aria-hidden="true">{ribbon(day.nakshatra, "nakshatra")}</div>
        <div className="tlscale" aria-hidden="true">
          {ticks.map((tk) => (
            <span key={tk.f} style={{ left: `${tk.f * 100}%` }}>
              {clock(tk.iso, off)}
            </span>
          ))}
        </div>
      </div>
      <p className="tllegend small muted">
        <i className="k-watch" /> {t("Rahu · Yama · Gulika", "రాహు · యమ · గుళిక")}
        <i className="k-good" /> {t("Abhijit", "అభిజిత్")}
        <i className="k-night" /> {t("night", "రాత్రి")}
        <span className="k-rib">{t("ribbons: tithi, then nakshatra", "పట్టీలు: తిథి, నక్షత్రం")}</span>
      </p>
    </section>
  );
}

function Windows({ data, now, range }: { data: DayPanchanga; now: number | null; range: (w: JdWindow) => string }) {
  const { t } = useLang();
  const rows = [
    { id: "brahma", glyph: "sunrise", good: true, name: t("Brahma muhurtam", "బ్రహ్మ ముహూర్తం"), sub: t("Pre-dawn hour for study, prayer and quiet work", "చదువు, ప్రార్థన, ప్రశాంత పనులకు తెల్లవారుజాము సమయం"), w: data.auspicious.brahmaMuhurta },
    { id: "abhijit", glyph: "abhijit", good: true, name: t("Abhijit muhurtam", "అభిజిత్ ముహూర్తం"), sub: t("The clear midday window", "మధ్యాహ్నపు మంచి గడియ"), w: data.auspicious.abhijitMuhurta },
    { id: "rahu", glyph: "rahu-kala", good: false, name: t("Rahu kalam", "రాహు కాలం"), sub: t("Traditionally kept free of new starts, signing and travel", "కొత్త పనులు, సంతకాలు, ప్రయాణాలకు సాంప్రదాయంగా వదిలే సమయం"), w: data.inauspicious.rahuKaal },
    { id: "yama", glyph: "yamagandam", good: false, name: t("Yamagandam", "యమగండం"), sub: t("Traditionally avoided for journeys and new ventures", "ప్రయాణాలు, కొత్త ప్రయత్నాలకు సాంప్రదాయంగా వదిలే సమయం"), w: data.inauspicious.yamaganda },
    { id: "gulika", glyph: "gulika", good: false, name: t("Gulika kalam", "గుళిక కాలం"), sub: t("Traditionally avoided for auspicious beginnings", "శుభ కార్యాల ఆరంభానికి సాంప్రదాయంగా వదిలే సమయం"), w: data.inauspicious.gulikaKaal },
  ].sort((x, y) => Date.parse(x.w.startIso) - Date.parse(y.w.startIso));
  return (
    <section className="windows">
      <p className="sectitle">{t("Good and watchful times", "మంచి సమయాలు, జాగ్రత్త సమయాలు")}</p>
      {rows.map((r) => {
        const state = now === null ? "" : now >= Date.parse(r.w.endIso) ? "past" : now >= Date.parse(r.w.startIso) ? "now" : "";
        return (
          <div key={r.id} className={`wrow2 ${r.good ? "good" : "watch"} ${state}`}>
            <Glyph family="timing" id={r.glyph} size={22} />
            <span className="wn">
              {r.name}
              {state === "now" && <em className="nowpill">{t("now", "ఇప్పుడు")}</em>}
              <small>{r.sub}</small>
            </span>
            <span className="wt">{range(r.w)}</span>
          </div>
        );
      })}
      {data.inauspicious.bhadraVishti.active && (
        <p className="small muted">{t("Bhadra (Vishti karana) is active today.", "ఈ రోజు భద్ర (విష్టి కరణం) ఉంది.")}</p>
      )}
    </section>
  );
}

function Choghadiya({ data, now, range }: { data: DayPanchanga; now: number | null; range: (w: JdWindow) => string }) {
  const { lang, t } = useLang();
  const nightNow = now !== null && data.choghadiya.night.some((s) => now >= Date.parse(s.startIso) && now < Date.parse(s.endIso));
  const [part, setPart] = useState<"day" | "night">(nightNow ? "night" : "day");
  const list: TimedSegment[] = data.choghadiya[part];
  const q = (s: TimedSegment) =>
    s.quality === "favorable" ? t("good", "మంచిది") : s.quality === "mixed" ? t("neutral", "సాధారణం") : t("avoid", "వదలండి");
  return (
    <section className="chog">
      <div className="chead">
        <p className="sectitle">{t("Choghadiya — eight parts of day and night", "చౌఘడియ — పగలు, రాత్రి ఎనిమిది భాగాలు")}</p>
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={part === "day"} onClick={() => setPart("day")}>{t("Day", "పగలు")}</button>
          <button type="button" role="tab" aria-selected={part === "night"} onClick={() => setPart("night")}>{t("Night", "రాత్రి")}</button>
        </div>
      </div>
      <div className="clist" role="tabpanel">
        {list.map((s) => {
          const active = now !== null && now >= Date.parse(s.startIso) && now < Date.parse(s.endIso);
          const past = now !== null && now >= Date.parse(s.endIso);
          return (
            <div key={s.startIso} className={`crow q-${s.quality}${active ? " now" : ""}${past ? " past" : ""}`}>
              <span className="cq" aria-hidden="true" />
              <span className="cn">
                {choghadiyaName(s.name, lang)}
                {active && <em className="nowpill">{t("now", "ఇప్పుడు")}</em>}
              </span>
              <span className="cqual">{q(s)}</span>
              <span className="ct">{range(s)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Horas({ horas, now, range }: { horas: Hora[]; now: number | null; range: (w: JdWindow) => string }) {
  const { lang, t } = useLang();
  const [all, setAll] = useState(false);
  const current = now === null ? -1 : horas.findIndex((h) => now >= Date.parse(h.startIso) && now < Date.parse(h.endIso));
  const shown = all ? horas : current >= 0 ? horas.slice(current, current + 4) : horas.slice(0, 4);
  return (
    <section className="horas">
      <p className="sectitle">{t("Hora — the planetary hours", "హోర — గ్రహ గంటలు")}</p>
      {shown.map((h) => (
        <div key={h.startIso} className={`hrow2${h.number - 1 === current ? " now" : ""}`}>
          <Glyph family="graha" id={h.lord} size={20} />
          <span className="hn">
            {grahaName(h.lord, lang)}
            {h.number - 1 === current && <em className="nowpill">{t("now", "ఇప్పుడు")}</em>}
            <small>{h.period === "day" ? t(`day hora ${h.number}`, `పగటి హోర ${h.number}`) : t(`night hora ${h.number - 12}`, `రాత్రి హోర ${h.number - 12}`)}</small>
          </span>
          <span className="ht">{range(h)}</span>
        </div>
      ))}
      <button type="button" className="linkbtn" onClick={() => setAll((v) => !v)}>
        {all ? t("Show fewer", "తక్కువ చూపించు") : t("Show all 24 horas", "మొత్తం 24 హోరలు చూపించు")}
      </button>
    </section>
  );
}
