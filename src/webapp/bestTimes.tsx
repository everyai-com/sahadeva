import { useEffect, useState } from "react";
import { useLang } from "./lang";
import { clock, grahaName, nakName, signName } from "./format";
import { Glyph } from "./glyph";
import { ErrorNote } from "./states";
import { choghadiyaName } from "./panchangaNames";
import { fetchPersonalDay, type CalendarPlace, type PersonalDay, type Profile, type TimingReason } from "./api";
import { SIGNS } from "../../shared/constants";

const TARA_TE: Record<string, string> = {
  Janma: "జన్మ", Sampat: "సంపత్", Vipat: "విపత్", Kshema: "క్షేమ", Pratyak: "ప్రత్యక్",
  Sadhaka: "సాధక", Naidhana: "నైధన", Mitra: "మిత్ర", "Parama Mitra": "పరమ మిత్ర",
};
const SUITS: Record<string, [string, string]> = {
  authority: ["dealing with authority", "అధికారులతో పనులు"],
  government: ["government work", "ప్రభుత్వ పనులు"],
  "health-routine": ["health routines", "ఆరోగ్య అలవాట్లు"],
  travel: ["travel", "ప్రయాణం"],
  family: ["family matters", "కుటుంబ విషయాలు"],
  "meeting-people": ["meeting people", "వ్యక్తులను కలవడం"],
  property: ["property", "ఆస్తి పనులు"],
  "physical-work": ["physical work", "శారీరక శ్రమ"],
  "technical-work": ["technical work", "సాంకేతిక పనులు"],
  study: ["study", "చదువు"],
  writing: ["writing", "రచన"],
  contracts: ["contracts & signing", "ఒప్పందాలు, సంతకాలు"],
  business: ["business", "వ్యాపారం"],
  learning: ["learning", "నేర్చుకోవడం"],
  finance: ["money matters", "ఆర్థిక విషయాలు"],
  advice: ["seeking advice", "సలహా తీసుకోవడం"],
  ceremonies: ["ceremonies & puja", "పూజలు, శుభకార్యాలు"],
  "new-beginnings": ["new beginnings", "కొత్త ప్రారంభాలు"],
  relationships: ["relationships", "సంబంధాలు"],
  purchases: ["purchases", "కొనుగోళ్ళు"],
  arts: ["arts", "కళలు"],
  celebrations: ["celebrations", "వేడుకలు"],
  "routine-work": ["routine work", "రోజువారీ పనులు"],
  "pending-tasks": ["clearing pending tasks", "పెండింగ్ పనులు పూర్తి చేయడం"],
  repairs: ["repairs", "మరమ్మతులు"],
};
const AVOID: Record<string, [string, string]> = {
  "rahu-kalam": ["Rahu kalam", "రాహు కాలం"],
  yamagandam: ["Yamagandam", "యమగండం"],
  gulika: ["Gulika kalam", "గుళిక కాలం"],
  durmuhurtam: ["Durmuhurtam", "దుర్ముహూర్తం"],
  varjyam: ["Varjyam", "వర్జ్యం"],
  chandrashtama: ["Chandrashtama for you", "మీకు చంద్రాష్టమం"],
  "low-personal-score": ["Weak for you", "మీకు బలహీనం"],
};

function reasonText(r: TimingReason, lang: "en" | "te"): string {
  const te = lang === "te";
  switch (r.id) {
    case "choghadiya":
      return te ? `${choghadiyaName(r.value!, "te")} చౌఘడియ` : `${r.value} choghadiya`;
    case "hora":
      return te ? `${grahaName(r.value!, "te")} హోర` : `${r.value} hora`;
    case "ascendant-lord-hora":
      return te ? `మీ లగ్నాధిపతి ${grahaName(r.value!, "te")} హోర` : `${r.value} hora — your ascendant lord`;
    case "tara":
      return te ? `${TARA_TE[r.value!] ?? r.value} తార (${r.count})` : `${r.value} tara (${r.count})`;
    case "chandra":
      return te ? `చంద్ర బలం — మీ చంద్రుని నుండి ${r.count}వ` : `Chandra bala — Moon ${r.count} from yours`;
    case "chandrashtama":
      return te ? "చంద్రాష్టమం" : "Chandrashtama";
    case "abhijit":
      return te ? "అభిజిత్ ముహూర్తం" : "Abhijit muhurtam";
    case "amrita-kalam":
      return te ? "అమృత కాలం" : "Amrita kalam";
    default:
      return r.label;
  }
}

/** Personal best (and avoid) times for one day, from the person's own chart. */
export function BestTimes({
  profile,
  place,
  date,
  offset,
  compact = false,
}: {
  profile: Profile;
  place: CalendarPlace | null;
  date: string | null;
  offset: number;
  compact?: boolean;
}) {
  const { lang, t } = useLang();
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; data?: PersonalDay; error?: unknown }>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [showWhy, setShowWhy] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const profileKey = `${profile.date}|${profile.time}|${profile.latitude}|${profile.longitude}`;
  const placeKey = place ? `${place.latitude},${place.longitude},${place.timezone}` : "";
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fetchPersonalDay(profile, place, date)
      .then((data) => alive && setState({ status: "ready", data }))
      .catch((error) => alive && setState({ status: "error", error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey, placeKey, date, attempt]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const range = (a: string, b: string) => `${clock(a, offset)} – ${clock(b, offset)}`;
  if (state.status === "loading") return <div className="besttimes"><div className="skeleton" style={{ height: 120 }} aria-busy="true" /></div>;
  if (state.status === "error")
    return <ErrorNote error={state.error} what={t("Your best times could not be calculated.", "మీ మంచి సమయాలు లెక్కించలేకపోయాం.")} onRetry={() => setAttempt((n) => n + 1)} />;
  const d = state.data!;
  if (d.status !== "computed") return null;
  const windows = d.best.length ? d.best : [];
  const shown = compact ? windows.filter((w) => Date.parse(w.endIso) > now).slice(0, 2) : windows;
  const tara = d.daySummary.taraAtSunrise;

  return (
    <section className="besttimes" aria-label={t("Best times for you", "మీకు మంచి సమయాలు")}>
      <div className="bthead">
        <p className="sectitle">{t("Best times for you", "మీకు మంచి సమయాలు")}</p>
        <span className="btfor small muted">
          {t(
            `${nakName(d.natal.nakshatra, "en")} star · ${d.natal.ascendant} ascendant`,
            `${nakName(d.natal.nakshatra, "te")} నక్షత్రం · ${signName(SIGNS.indexOf(d.natal.ascendant as (typeof SIGNS)[number]), "te")} లగ్నం`,
          )}
        </span>
      </div>
      <p className="btsummary">
        {d.daySummary.chandrashtama
          ? t("Chandrashtama falls today for you — keep major starts small and choose the windows below carefully.", "ఈ రోజు మీకు చంద్రాష్టమం — పెద్ద ప్రారంభాలు వద్దు, కింది సమయాలనే ఎంచుకోండి.")
          : tara.favourable
            ? t(`Your tara today is ${tara.name} (${tara.count}) — a supportive day for you.`, `ఈ రోజు మీ తార ${TARA_TE[tara.name] ?? tara.name} (${tara.count}) — మీకు అనుకూలమైన రోజు.`)
            : t(`Your tara today is ${tara.name} (${tara.count}) — use the best windows for anything important.`, `ఈ రోజు మీ తార ${TARA_TE[tara.name] ?? tara.name} (${tara.count}) — ముఖ్యమైన పనులకు కింది సమయాలనే వాడండి.`)}
      </p>

      {shown.length === 0 && (
        <p className="small muted">
          {compact && windows.length
            ? t("Today's best windows have passed. Open the panchangam to see tomorrow's.", "ఈ రోజు మంచి సమయాలు గడిచిపోయాయి. రేపటివి పంచాంగంలో చూడండి.")
            : d.fallback
              ? t(`No strongly favourable window for you today. If you must, ${range(d.fallback.startIso, d.fallback.endIso)} is the least burdened.`, `ఈ రోజు మీకు బలమైన మంచి సమయం లేదు. తప్పనిసరైతే ${range(d.fallback.startIso, d.fallback.endIso)} మెరుగు.`)
              : t("No strongly favourable window for you today.", "ఈ రోజు మీకు బలమైన మంచి సమయం లేదు.")}
        </p>
      )}

      {shown.map((w, i) => {
        const live = now >= Date.parse(w.startIso) && now < Date.parse(w.endIso);
        const past = now >= Date.parse(w.endIso);
        return (
          <div key={w.startIso} className={`btwin ${w.grade}${live ? " live" : ""}${past ? " past" : ""}`}>
            <div className="btrow">
              <span className="bttime">
                {range(w.startIso, w.endIso)}
                {live && <em className="nowpill">{t("now", "ఇప్పుడు")}</em>}
              </span>
              <span className={`btgrade ${w.grade}`}>{w.grade === "best" ? t("Best", "అత్యుత్తమం") : t("Good", "మంచిది")}</span>
            </div>
            {w.peak.startIso !== w.startIso || w.peak.endIso !== w.endIso ? (
              <p className="btpeak small">{t(`Strongest ${range(w.peak.startIso, w.peak.endIso)}`, `అత్యంత బలం ${range(w.peak.startIso, w.peak.endIso)}`)}</p>
            ) : null}
            <p className="btsuits">
              {w.horas.map((h) => (
                <Glyph key={h} family="graha" id={h} size={18} />
              ))}
              <span>
                {t("Good for ", "వీటికి మంచిది: ")}
                {w.suits.slice(0, 4).map((s) => (SUITS[s] ? SUITS[s][lang === "te" ? 1 : 0] : s)).join(", ")}
              </span>
            </p>
            <button type="button" className="btwhy" aria-expanded={showWhy === i} onClick={() => setShowWhy(showWhy === i ? null : i)}>
              {t("Why this time", "ఎందుకు ఈ సమయం")}
            </button>
            {showWhy === i && (
              <div className="btreasons">
                {w.reasons.map((r) => (
                  <span key={r.label} className="btreason">
                    {reasonText(r, lang)} <b>+{r.points}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {!compact && d.avoid.length > 0 && (
        <div className="btavoid">
          <p className="small muted">{t("Keep these clear", "ఈ సమయాలు వదలండి")}</p>
          {d.avoid.map((a) => (
            <span key={a.startIso + a.reason} className="btav">
              <b>{range(a.startIso, a.endIso)}</b> {AVOID[a.reason]?.[lang === "te" ? 1 : 0] ?? a.reason}
            </span>
          ))}
        </div>
      )}
      <p className="btbasis small muted">
        {t(
          "Chosen from your own tara bala and chandra bala at each moment, the hora (benefics and your ascendant lord), choghadiya, Abhijit and amrita kalam; Rahu kalam, Yamagandam, Gulika, durmuhurtam and varjyam are left out.",
          "ప్రతి క్షణంలో మీ తార బలం, చంద్ర బలం, హోర (శుభ గ్రహాలు, మీ లగ్నాధిపతి), చౌఘడియ, అభిజిత్, అమృత కాలం ఆధారంగా ఎంచుకున్నాం; రాహు కాలం, యమగండం, గుళిక, దుర్ముహూర్తం, వర్జ్యం వదిలేశాం.",
        )}
      </p>
    </section>
  );
}
