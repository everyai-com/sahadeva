import { useState } from "react";
import "./dasha.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { StatusBar, TabBar, BackButton } from "../shell";
import { dayMonthYear, monthYear, grahaName, grahaChar, grahaTr } from "../format";
import type { DashaTimelineNode, Profile } from "../api";
import { GrahaIcon } from "../design/GrahaIcon";
import { getDashaRecalls, saveDashaRecall } from "../dashaRecall";

const YEAR_MS = 365.2425 * 86_400_000;

function years(startIso: string, endIso: string): number {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / YEAR_MS);
}

function remaining(endIso: string, lang: "en" | "te"): string {
  const ms = Date.parse(endIso) - Date.now();
  if (ms <= 0) return lang === "te" ? "ముగిసింది" : "ended";
  const totalMonths = Math.round(ms / (YEAR_MS / 12));
  const y = Math.floor(totalMonths / 12);
  const mo = totalMonths % 12;
  if (lang === "te") {
    const yp = y ? `${y} సంవత్సరం${y > 1 ? "లు" : ""}` : "";
    const mp = mo ? `${mo} నెల${mo > 1 ? "లు" : ""}` : "";
    return [yp, mp].filter(Boolean).join(" ") || "కొద్ది రోజులు";
  }
  const yp = y ? `${y} year${y > 1 ? "s" : ""}` : "";
  const mp = mo ? `${mo} month${mo > 1 ? "s" : ""}` : "";
  return [yp, mp].filter(Boolean).join(" and ") || "a few days";
}

function state(node: { startIso: string; endIso: string }): "past" | "active" | "future" {
  const now = Date.now();
  if (Date.parse(node.endIso) < now) return "past";
  if (Date.parse(node.startIso) <= now) return "active";
  return "future";
}

export function DashaScreen() {
  const { lang, t } = useLang();
  const { profile, dasha } = useData();
  const [open, setOpen] = useState<string | null>(null);
  const [recall, setRecall] = useState<string | null>(null);

  const data = dasha.data;
  const timeline = data?.timeline ?? [];
  const active = timeline.find((n) => state(n) === "active");
  const activeAntar = active?.antardashas.find((a) => state(a) === "active");

  const birthIso = profile ? `${profile.date}T00:00:00.000Z` : null;
  const visibleTimeline = birthIso ? timeline.filter((node) => Date.parse(node.endIso) > Date.parse(birthIso)) : timeline;
  const main = visibleTimeline.slice(0, 6);
  const later = visibleTimeline.slice(6);

  return (
    <>
      <StatusBar />
      <BackButton to="more" />
      <main className="screen dasha-screen" id="content">
        <header className="shead headrow">
          <span>
            <p className="eyebrow">{profile ? t(`${profile.name} · born ${profile.date}`, `${profile.name} · జననం ${profile.date}`) : ""}</p>
            <h2>{t("Life periods", "జీవిత దశలు")}</h2>
          </span>
          <LangToggle />
        </header>

        {dasha.status === "error" && <p className="muted small">{t("The dasha timeline could not be calculated.", "దశలు లెక్కించలేకపోయాం.")}</p>}

        {active && (
          <section className="nowcard">
            <p className="lbl">{t("RIGHT NOW", "ప్రస్తుతం")}</p>
            <h3>
              <GrahaIcon name={active.lord} size={32} decorative />
              {t(
                `${grahaName(active.lord, "en")} period${activeAntar ? `, ${grahaName(activeAntar.lord, "en")} sub-period` : ""}`,
                `${grahaName(active.lord, "te")} దశ${activeAntar ? `, ${grahaName(activeAntar.lord, "te")} అంతర్దశ` : ""}`,
              )}
            </h3>
            <p className="trm">{grahaTr(active.lord)}{activeAntar ? ` → ${grahaTr(activeAntar.lord)}` : ""}</p>
            <p className="rem">
              {t(
                `${remaining(active.endIso, "en")} left. It ends on ${dayMonthYear(active.endIso, "en")}.`,
                `ఇంకా ${remaining(active.endIso, "te")}. ఇది ${dayMonthYear(active.endIso, "te")}న ముగుస్తుంది.`,
              )}
            </p>
            <div className="prog" role="img" aria-label={t("Period progress", "దశ పురోగతి")}>
              <i style={{ width: `${elapsedPct(active)}%` }} />
            </div>
            <div className="progscale">
              <span>{monthYear(active.startIso, lang)}</span>
              <span>{monthYear(active.endIso, lang)}</span>
            </div>
          </section>
        )}

        <section style={{ marginTop: "var(--space-6)" }}>
          <p className="sectitle">{t("Your periods in order — tap one to open its sub-periods", "మీ దశలు వరుసగా — ఏదైనా ఒకటి నొక్కితే అంతర్దశలు తెరుచుకుంటాయి")}</p>
          <div className="tl">
            {main.map((node) => {
              const st = state(node);
              const visibleStart = birthIso && Date.parse(node.startIso) < Date.parse(birthIso) ? birthIso : node.startIso;
              const beganBeforeBirth = visibleStart !== node.startIso;
              const yrs = years(visibleStart, node.endIso);
              const isOpen = open === node.lord + node.startIso;
              return (
                <div key={node.lord + node.startIso}>
                  <div className={`per ${st}`}>
                    <button
                      className="phead"
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : node.lord + node.startIso)}
                    >
                      <span className="prow1">
                        <span className="pname">
                          <GrahaIcon name={node.lord} size={24} decorative />
                          {grahaName(node.lord, lang)}
                          <span>{grahaTr(node.lord)}</span>
                        </span>
                        <span className="pdates">{beganBeforeBirth ? t("At birth", "జననం నుండి") : monthYear(visibleStart, lang)} – {monthYear(node.endIso, lang)}</span>
                      </span>
                      <span className="pbar">
                        <i style={{ width: `${(yrs / 20) * 100}%` }} />
                      </span>
                      <span className="prow2">
                        <span>{grahaChar(node.lord, lang)} · {yrs}{t(" years", " సంవత్సరాలు")}</span>
                        <span>{st === "past" ? t("finished", "ముగిసింది") : st === "active" ? `${elapsedPct(node)}%` : t("ahead", "ముందున్నది")}</span>
                      </span>
                    </button>
                    <div className={`subs${isOpen ? " on" : ""}`}>
                      {node.antardashas.filter((a) => !birthIso || Date.parse(a.endIso) > Date.parse(birthIso)).map((a) => {
                        const ast = state(a);
                        const antarStart = birthIso && Date.parse(a.startIso) < Date.parse(birthIso) ? birthIso : a.startIso;
                        return (
                          <div className={`srow ${ast === "past" ? "done" : ast === "active" ? "now" : ""}`} key={a.lord + a.startIso}>
                            <span className="sn">
                              <GrahaIcon name={a.lord} size={20} decorative />
                              {grahaName(a.lord, lang)}
                              {ast === "active" ? t(" — running now", " — ఇప్పుడు నడుస్తోంది") : ""}
                            </span>
                            <span className="sd">{antarStart !== a.startIso ? t("At birth", "జననం నుండి") : dayMonthYear(antarStart, lang)} – {dayMonthYear(a.endIso, lang)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {st === "past" && profile && <RecallBox profile={profile} node={{ ...node, startIso: visibleStart }} open={recall} setOpen={setRecall} />}
                  </div>
                  {st === "active" && (
                    <div className="nowline">
                      <hr />
                      <span>{t(`NOW · ${dayMonthYear(new Date().toISOString(), "en").toUpperCase()}`, `ఇప్పుడు · ${dayMonthYear(new Date().toISOString(), "te")}`)}</span>
                      <hr />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {later.length > 0 && (
            <div className="later">
              <p className="sectitle">{t("Beyond the timeline above", "పై కాలరేఖ తర్వాత")}</p>
              {later.map((node) => (
                <div className="lrow" key={node.lord + node.startIso}>
                  {grahaName(node.lord, lang)} · {years(node.startIso, node.endIso)}{t(" years", " సంవత్సరాలు")}
                  <span>{monthYear(node.startIso, lang)} – {monthYear(node.endIso, lang)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="foot">
          {t(
            "Vimshottari, counted from the Moon's nakshatra at birth.",
            "వింశోత్తరి, జనన సమయంలో చంద్రుని నక్షత్రం నుండి లెక్కించినది.",
          )}
          <br />
          {t(
            "The one-word labels are the traditional character of each planet's period — not a forecast of events.",
            "ఒక్క మాట పేర్లు ఆ గ్రహ దశ సంప్రదాయ స్వభావం — జరగబోయే సంఘటనల జోస్యం కాదు.",
          )}
        </p>
      </main>
      <TabBar current="more" />
    </>
  );
}

function elapsedPct(node: { startIso: string; endIso: string }): number {
  const s = Date.parse(node.startIso);
  const e = Date.parse(node.endIso);
  const p = ((Date.now() - s) / (e - s)) * 100;
  return Math.max(0, Math.min(100, Math.round(p * 10) / 10));
}

function RecallBox({ profile, node, open, setOpen }: { profile: Profile; node: Pick<DashaTimelineNode, "lord" | "startIso" | "endIso">; open: string | null; setOpen: (v: string | null) => void }) {
  const { t } = useLang();
  const key = `${node.lord}:${node.startIso}`;
  const [value, setValue] = useState<string>(() => {
    return getDashaRecalls(profile).find((item) => `${item.lord}:${item.startIso}` === key)?.text || "";
  });
  const [saved, setSaved] = useState(false);
  const isOpen = open === key;
  return (
    <div className="recall">
      <button className="recallbtn" type="button" onClick={() => setOpen(isOpen ? null : key)}>
        {t("What actually happened?", "నిజంగా ఏమి జరిగింది?")}
      </button>
      <div className={`recallbox${isOpen ? " on" : ""}`}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("Write what this stretch was really like. Sahadeva keeps it beside the dates.", "ఈ కాలం నిజంగా ఎలా గడిచిందో రాయండి. సహదేవ దాన్ని తేదీల పక్కనే ఉంచుతుంది.")}
          aria-label={node.lord}
        />
        <div className="ra">
          <button
            className="mini"
            type="button"
            onClick={() => {
              saveDashaRecall(profile, { lord: node.lord, startIso: node.startIso, endIso: node.endIso, text: value });
              setSaved(true);
              window.setTimeout(() => setSaved(false), 1600);
            }}
          >
            {t("Save", "భద్రపరచు")}
          </button>
          {saved && <span className="saved">{t("Saved", "భద్రమైంది")}</span>}
        </div>
        <p className="recallnote">{t("Sahadeva uses this as user-reported history in future answers on this device.", "ఈ పరికరంలో భవిష్యత్ సమాధానాల్లో సహదేవ్ దీన్ని మీరు చెప్పిన జీవిత చరిత్రగా ఉపయోగిస్తుంది.")}</p>
      </div>
    </div>
  );
}
