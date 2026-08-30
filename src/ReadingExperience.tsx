import { useEffect, useMemo, useRef, useState } from "react";
import { parseReading } from "../shared/readingParser";

type Language = "en" | "te";

type ReadingSummary = {
  profileRef?: string;
  generatedAt?: string;
  engineVersion?: string;
  readingMode?: "complete-profile" | "focused" | "orientation";
  fullProfile?: {
    requiredSections: string[];
    coverage?: unknown;
    domainEvidence: Record<string, unknown>;
    atAGlance: { strongestPlanets: Array<{ planet: string; ratio: number | null }>; currentPeriod: string[]; confidence?: { score?: number; level?: string } };
    timeline: Array<{ level: string; lord: string; startIso: string; endIso: string; current: boolean }>;
    nextQuestions: string[];
  } | null;
  anchors: {
    lagna: { signName?: string; degree: number };
    moon: { signName?: string; degree: number; nakshatra: string; pada: number };
  };
  currentTiming: {
    mahadasha: string | null;
    antardasha: string | null;
    pratyantardasha: string | null;
    boundaries: {
      mahadasha: { startIso: string; endIso: string } | null;
      antardasha: { startIso: string; endIso: string } | null;
      pratyantardasha: { startIso: string; endIso: string } | null;
    };
  };
  measuredStrengths: Array<{ planet: string; ratio: number | null; avastha?: string }>;
  confidence?: { score?: number; level?: string };
};

function Inline({ text }: { text: string }) {
  return <>{text.split(/\*\*(.+?)\*\*/g).map((part, index) => index % 2 ? <strong key={index}>{part}</strong> : part)}</>;
}

function ReadingBody({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).filter(Boolean).map((block, index) => {
    const lines = block.split("\n").filter(Boolean);
    const list = lines.length > 0 && lines.every((line) => /^\s*([-*•]|\d+[.)])\s+/.test(line));
    if (list) return <ul key={index}>{lines.map((line, item) => <li key={item}><Inline text={line.replace(/^\s*([-*•]|\d+[.)])\s+/, "")} /></li>)}</ul>;
    return <p key={index}><Inline text={block} /></p>;
  })}</>;
}

const month = (iso: string | undefined, language: Language) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(language === "te" ? "te-IN" : "en-IN", { month: "short", year: "numeric" });
};

export function ReadingExperience({
  text, name, language, summary, onAsk, onFeedback, onRegenerate, onDownload, onShare, onOpenChart,
}: {
  text: string;
  name: string;
  language: Language;
  summary: ReadingSummary | null;
  onAsk: (section: string) => void;
  onFeedback: (section: string, rating: string) => void;
  onRegenerate: () => void;
  onDownload: () => void;
  onShare: () => void;
  onOpenChart: () => void;
}) {
  const sections = useMemo(() => parseReading(text), [text]);
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [previousVersion, setPreviousVersion] = useState<{generatedAt?:string;sections:string[]}|null>(null);
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-18% 0px -64%", threshold: [0, .2, .6] });
    root.querySelectorAll("[data-reading-section]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections]);

  const activeIndex = Math.max(0, sections.findIndex((section) => section.id === active));
  const activeTitle = sections[activeIndex]?.title ?? (language === "te" ? "మొత్తం రీడింగ్" : "Overall reading");
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const submit = (rating: string) => { onFeedback(activeTitle, rating); setFeedback(rating); };
  const timing = summary?.currentTiming;
  const full = summary?.fullProfile;
  const sectionTitles = sections.map(section=>section.title.toLowerCase());
  const coverageCount = full?.requiredSections.filter(required=>sectionTitles.some(title=>title.includes(required.split(",")[0])||required.split(/\s+/).filter(word=>word.length>5).some(word=>title.includes(word)))).length ?? 0;
  const evidenceFor = (title:string) => {
    const key=title.toLowerCase();
    const map:Array<[RegExp,string[]]>=[[/identity|temperament|overview/,['identityAndTemperament']],[/education|learning/,['education']],[/career|employment|business|work/,['employment','businessAndIndependentWork']],[/money|wealth|resources/,['moneyAndResources']],[/love|relationship|marriage|partner/,['loveAndRelationships','marriageAndCommitment']],[/family|home|property/,['familyHomeAndProperty']],[/children|mentoring|creativity/,['childrenMentoringAndCreativity']],[/health|routine|resilience|wellbeing/,['healthRoutinesAndResilience']],[/spiritual|meaning/,['spiritualityMeaningAndPractice']]];
    const keys=map.find(([pattern])=>pattern.test(key))?.[1]??[];
    return keys.map(item=>[item,full?.domainEvidence[item]] as const).filter((entry)=>entry[1]);
  };

  useEffect(()=>{
    if(!summary?.profileRef||summary.readingMode!=="complete-profile")return;
    const storageKey=`sahadeva.reading.version.${summary.profileRef}`;
    try{const prior=localStorage.getItem(storageKey);if(prior)setPreviousVersion(JSON.parse(prior));localStorage.setItem(storageKey,JSON.stringify({generatedAt:summary.generatedAt,sections:sections.map(section=>section.title)}));}catch{/* private mode */}
  },[summary?.profileRef,summary?.readingMode,summary?.generatedAt,sections]);

  return (
    <section className={`reading-experience${evidenceOpen ? " evidence-is-open" : ""}`} aria-label={language === "te" ? "పూర్తి జాతక రీడింగ్" : "Complete chart reading"}>
      <header className="reading-cover">
        <div><span className="reading-kicker">{language === "te" ? "సహదేవ · వ్యక్తిగత రీడింగ్" : "Sahadeva · personal reading"}</span><h1>{name}{language === "te" ? " గారి జాతక రీడింగ్" : "’s chart reading"}</h1><p>{language === "te" ? `${sections.length} విభాగాలు · ఆధారాలతో వివరించబడింది` : `${sections.length} sections · explained with chart evidence`}</p></div>
        <button className="reading-evidence-toggle" onClick={() => setEvidenceOpen((value) => !value)} aria-expanded={evidenceOpen}>⌁ {language === "te" ? "ఆధారాలు" : "Chart evidence"}</button>
      </header>

      {full && <section className="reading-glance" aria-label={language === "te" ? "ఒక చూపులో" : "At a glance"}>
        <div className="glance-heading"><span>{language === "te" ? "ఒక చూపులో" : "At a glance"}</span><strong>{coverageCount}/{full.requiredSections.length} {language === "te" ? "అవసరమైన అంశాలు" : "required themes detected"}</strong></div>
        <div className="glance-grid">
          <article><span>{language === "te" ? "ప్రస్తుత కాలం" : "Current period"}</span><strong>{full.atAGlance.currentPeriod.join(" · ") || "—"}</strong></article>
          <article><span>{language === "te" ? "ప్రధాన బలాలు" : "Measured strengths"}</span><strong>{full.atAGlance.strongestPlanets.map(item=>item.planet).join(" · ") || "—"}</strong></article>
          <article><span>{language === "te" ? "నమ్మక స్థాయి" : "Confidence"}</span><strong>{full.atAGlance.confidence?.level || "—"}</strong></article>
        </div>
        {previousVersion&&<p className="reading-version-note">{language === "te" ? "మునుపటి రీడింగ్‌తో పోల్చడానికి ఈ సంస్కరణ భద్రపరచబడింది." : `Updated reading · previous version from ${previousVersion.generatedAt ? new Date(previousVersion.generatedAt).toLocaleDateString("en-IN") : "this device"} retained for comparison.`}</p>}
      </section>}

      <div className="reading-mobile-nav">
        <label><span>{language === "te" ? "విభాగం" : "Section"}</span><select value={active} onChange={(event) => { setActive(event.target.value); jump(event.target.value); }}>{sections.map((section) => <option value={section.id} key={section.id}>{section.title}</option>)}</select></label>
        <i><span style={{ width: `${((activeIndex + 1) / Math.max(sections.length, 1)) * 100}%` }} /></i>
      </div>

      <div className="reading-layout">
        <nav className="reading-toc" aria-label={language === "te" ? "రీడింగ్ విభాగాలు" : "Reading sections"}>
          <span>{language === "te" ? "ఈ రీడింగ్‌లో" : "In this reading"}</span>
          <ol>{sections.map((section, index) => <li key={section.id}><button className={active === section.id ? "active" : ""} onClick={() => jump(section.id)}><em>{String(index + 1).padStart(2, "0")}</em>{section.title}</button></li>)}</ol>
          <div className="reading-progress"><span style={{ height: `${((activeIndex + 1) / Math.max(sections.length, 1)) * 100}%` }} /></div>
        </nav>

        <article className="reading-article" ref={articleRef}>
          {sections.map((section, index) => <section id={section.id} data-reading-section key={section.id} className="reading-section">
            <div className="reading-section-number">{String(index + 1).padStart(2, "0")}</div>
            <h2>{section.title}</h2>
            <ReadingBody text={section.body} />
            {evidenceFor(section.title).length>0&&<details className="section-evidence"><summary>{language === "te" ? "ఈ నిర్ణయానికి ఆధారం" : "Why this conclusion"}</summary><div>{evidenceFor(section.title).map(([key,value])=><article key={key}><strong>{key.replace(/([A-Z])/g," $1")}</strong><pre>{JSON.stringify(value,null,2)}</pre></article>)}</div></details>}
            <button className="reading-ask" onClick={() => onAsk(section.title)}>↳ {language === "te" ? "ఈ విభాగం గురించి అడగండి" : "Ask about this section"}</button>
          </section>)}
          {full?.timeline?.length?<section className="reading-timeline"><span className="reading-kicker">{language === "te" ? "కాలరేఖ" : "Personal timeline"}</span><h2>{language === "te" ? "ప్రస్తుత మరియు తదుపరి దశలు" : "Current and upcoming periods"}</h2>{full.timeline.map((period,index)=><button key={`${period.level}-${period.lord}`} onClick={()=>onAsk(`${period.lord} ${period.level}`)} className={period.current?"current":""}><i>{String(index+1).padStart(2,"0")}</i><span><small>{period.level}</small><strong>{period.lord}</strong><em>{month(period.startIso,language)} — {month(period.endIso,language)}</em></span></button>)}</section>:null}
          {full?.nextQuestions?.length?<section className="reading-next"><span className="reading-kicker">{language === "te" ? "తదుపరి సంప్రదింపు" : "Continue the consultation"}</span><h2>{language === "te" ? "మీ జాతకం ఆధారంగా తదుపరి ప్రశ్నలు" : "Useful next questions from your chart"}</h2>{full.nextQuestions.map(question=><button key={question} onClick={()=>onAsk(question)}>{question}<span>→</span></button>)}</section>:null}
          <footer className="reading-actions">
            <div><span>{language === "te" ? "ఈ విభాగం స్పష్టంగా ఉందా?" : "Was this section clear?"}</span><button onClick={() => submit("helpful")} aria-pressed={feedback === "helpful"}>Helpful</button><button onClick={() => submit("unclear")} aria-pressed={feedback === "unclear"}>Unclear</button><button onClick={() => submit("incorrect")} aria-pressed={feedback === "incorrect"}>Incorrect</button></div>
            <div><button onClick={onRegenerate}>{language === "te" ? "మళ్లీ రూపొందించు" : "Regenerate"}</button><button onClick={onDownload}>↓ {language === "te" ? "దింపుకోండి" : "Download"}</button><button onClick={onShare}>↗ {language === "te" ? "పంచుకోండి" : "Share"}</button></div>
          </footer>
        </article>

        <aside className="reading-evidence" aria-label={language === "te" ? "జాతక ఆధారాలు" : "Chart evidence"}>
          <button className="reading-evidence-close" onClick={() => setEvidenceOpen(false)} aria-label="Close">×</button>
          <span className="reading-kicker">{language === "te" ? "లెక్కించిన ఆధారాలు" : "Calculated evidence"}</span>
          <h2>{language === "te" ? "రీడింగ్ వెనుక ఉన్న జాతకం" : "What this reading is based on"}</h2>
          {!summary ? <p className="reading-muted">{language === "te" ? "జాతక లెక్కింపు లోడ్ అవుతోంది." : "Chart calculation is loading."}</p> : <>
            <dl className="evidence-anchors"><div><dt>Lagna</dt><dd>{summary.anchors.lagna.signName || "—"} <small>{summary.anchors.lagna.degree.toFixed(1)}°</small></dd></div><div><dt>Moon</dt><dd>{summary.anchors.moon.signName || "—"}<small>{summary.anchors.moon.nakshatra} · pada {summary.anchors.moon.pada}</small></dd></div></dl>
            <section><h3>{language === "te" ? "ప్రస్తుత కాలం" : "Current timing"}</h3>{(["mahadasha", "antardasha", "pratyantardasha"] as const).map((key) => timing?.[key] && <div className="evidence-timing" key={key}><span>{key.replace("dasha", " dasha")}</span><strong>{timing[key]}</strong><small>{month(timing.boundaries[key]?.startIso, language)} — {month(timing.boundaries[key]?.endIso, language)}</small></div>)}</section>
            {summary.measuredStrengths.length > 0 && <section><h3>{language === "te" ? "కొలిచిన బలాలు" : "Measured strengths"}</h3>{summary.measuredStrengths.map((item) => <div className="evidence-strength" key={item.planet}><span>{item.planet}<small>{item.avastha}</small></span><strong>{item.ratio == null ? "—" : `${Math.round(item.ratio * 100)}%`}</strong></div>)}</section>}
            {summary.confidence?.level && <p className="evidence-confidence"><span>{language === "te" ? "లెక్కింపు నమ్మకం" : "Calculation confidence"}</span><strong>{summary.confidence.level}</strong></p>}
          </>}
          <button className="reading-open-chart" onClick={onOpenChart}>{language === "te" ? "పూర్తి జాతకం మరియు లెక్కలు చూడండి" : "Open full chart & calculations"} →</button>
        </aside>
      </div>
    </section>
  );
}
