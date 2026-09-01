import { useEffect, useMemo, useRef, useState } from "react";
import { parseReading } from "../shared/readingParser";
import type { EverydayReading } from "../shared/everydayReading";

type Language = "en" | "te";

type ReadingSummary = {
  profileRef?: string;
  generatedAt?: string;
  engineVersion?: string;
  readingMode?: "complete-profile" | "focused" | "orientation";
  everyday?: EverydayReading;
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
  const [journeyStep, setJourneyStep] = useState(0);
  const [need, setNeed] = useState<"clarity"|"courage"|"calm"|"direction"|"">("");
  const [savedInsightIds, setSavedInsightIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`sahadeva.journey.saved.${summary?.profileRef || "guest"}`) || "[]"); } catch { return []; }
  });
  const [completedDays, setCompletedDays] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`sahadeva.journey.days.${summary?.profileRef || "guest"}`) || "[]"); } catch { return []; }
  });
  const [clarityFeedback, setClarityFeedback] = useState<"clearer"|"partly"|"not-yet"|"">("");
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

  const timing = summary?.currentTiming;
  const full = summary?.fullProfile;
  const everyday = summary?.everyday?.dailyLife;
  const technicalPattern = /technical|current period|timing|dasha|yoga|dosha|strength|evidence|uncertainty|verification|calculation|వివర|కాలం|దశ|యోగ|దోష|ఆధార/i;
  const ordinarySections = sections.filter(section => !technicalPattern.test(section.title));
  const technicalSections = sections.filter(section => technicalPattern.test(section.title));
  const displaySections = [...ordinarySections, ...technicalSections];
  const activeIndex = Math.max(0, displaySections.findIndex((section) => section.id === active));
  const activeTitle = displaySections[activeIndex]?.title ?? (language === "te" ? "మొత్తం రీడింగ్" : "Overall reading");
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const submit = (rating: string) => { onFeedback(activeTitle, rating); setFeedback(rating); };
  const sectionTitles = sections.map(section=>section.title.toLowerCase());
  const coverageCount = full?.requiredSections.filter(required=>sectionTitles.some(title=>title.includes(required.split(",")[0])||required.split(/\s+/).filter(word=>word.length>5).some(word=>title.includes(word)))).length ?? 0;
  const evidenceFor = (title:string) => {
    const key=title.toLowerCase();
    const map:Array<[RegExp,string[]]>=[[/identity|temperament|overview/,['identityAndTemperament']],[/education|learning/,['education']],[/career|employment|business|work/,['employment','businessAndIndependentWork']],[/money|wealth|resources/,['moneyAndResources']],[/love|relationship|marriage|partner/,['loveAndRelationships','marriageAndCommitment']],[/family|home|property/,['familyHomeAndProperty']],[/children|mentoring|creativity/,['childrenMentoringAndCreativity']],[/health|routine|resilience|wellbeing/,['healthRoutinesAndResilience']],[/spiritual|meaning/,['spiritualityMeaningAndPractice']]];
    const keys=map.find(([pattern])=>pattern.test(key))?.[1]??[];
    return keys.map(item=>[item,full?.domainEvidence[item]] as const).filter((entry)=>entry[1]);
  };

  const journeyLabels = language === "te"
    ? ["దృష్టి", "జాగ్రత్త", "చేయండి"]
    : ["Your focus", "Watch for", "Try this"];
  const journeyPrompts = language === "te"
    ? ["ముఖ్యమైనది ఏమిటో చూడండి", "ఏది సమతుల్యం చేయాలో చూడండి", "ఒక చిన్న అడుగు వేయండి"]
    : ["See what matters most", "Notice what needs balance", "Take one useful step"];
  const journeyItems = everyday?.items ?? [];
  const journeyDone = journeyStep > journeyItems.length;
  const journeyItem = journeyStep > 0 ? journeyItems[journeyStep - 1] : null;
  const needOptions = language === "te"
    ? [{id:"clarity",label:"స్పష్టత",detail:"గందరగోళంలో ముఖ్యమైనది చూడాలి"},{id:"courage",label:"ధైర్యం",detail:"తెలిసిన విషయంపై అడుగు వేయాలి"},{id:"calm",label:"ప్రశాంతత",detail:"ఒత్తిడి మధ్య స్థిరపడాలి"},{id:"direction",label:"దిశ",detail:"తదుపరి ఉపయోగకరమైన అడుగు తెలుసుకోవాలి"}]
    : [{id:"clarity",label:"Clarity",detail:"See what matters through the noise"},{id:"courage",label:"Courage",detail:"Act on what you already know"},{id:"calm",label:"Calm",detail:"Find steadiness in a busy moment"},{id:"direction",label:"Direction",detail:"Choose the most useful next step"}];
  const acknowledgements: Record<"clarity"|"courage"|"calm"|"direction", string> = language === "te" ? {
    clarity:"గందరగోళంగా అనిపించినప్పుడు అన్నింటికీ సమాధానం అవసరం లేదు. ముందుగా ముఖ్యమైన ఒక్క విషయాన్ని చూద్దాం.", courage:"భయం ఉన్నప్పటికీ ముందుకు వెళ్లాలని అనుకోవడం ధైర్యమే. మీకు సరిపోయే చిన్న అడుగును చూద్దాం.", calm:"ఇప్పుడు నెమ్మదిగా ఉండటం కూడా ఒక మంచి నిర్ణయం. శబ్దాన్ని తగ్గించి స్థిరమైన దారిని చూద్దాం.", direction:"మొత్తం మార్గం ఇప్పుడే కనిపించాల్సిన అవసరం లేదు. తదుపరి సరైన అడుగు చాలు.",
  } : {
    clarity:"You do not need every answer at once. Let’s find the one thing that matters most.", courage:"Wanting to move despite uncertainty already takes courage. Let’s find a step that feels possible.", calm:"Slowing down can be a wise decision. Let’s quiet the noise and find steadier ground.", direction:"You do not need the whole path today. One honest next step is enough.",
  };
  const toggleSavedInsight = (id:string) => {
    const next = savedInsightIds.includes(id) ? savedInsightIds.filter(item => item !== id) : [...savedInsightIds, id];
    setSavedInsightIds(next);
    try { localStorage.setItem(`sahadeva.journey.saved.${summary?.profileRef || "guest"}`, JSON.stringify(next)); } catch {/* private mode */}
  };
  const completeJourney = () => {
    setJourneyStep(journeyItems.length + 1);
    if (!summary?.profileRef) return;
    try {
      const key = `sahadeva.journey.days.${summary.profileRef}`;
      const today = new Date().toISOString().slice(0, 10);
      const days = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      const next = [...new Set([...days, today])].slice(-28);
      localStorage.setItem(key, JSON.stringify(next));
      setCompletedDays(next);
    } catch {/* private mode */}
  };

  useEffect(()=>{
    if(!summary?.profileRef||summary.readingMode!=="complete-profile")return;
    const storageKey=`sahadeva.reading.version.${summary.profileRef}`;
    try{const prior=localStorage.getItem(storageKey);if(prior)setPreviousVersion(JSON.parse(prior));localStorage.setItem(storageKey,JSON.stringify({generatedAt:summary.generatedAt,sections:sections.map(section=>section.title)}));}catch{/* private mode */}
  },[summary?.profileRef,summary?.readingMode,summary?.generatedAt,sections]);

  if (everyday) return (
    <section className={`reading-experience journey-experience${evidenceOpen ? " evidence-is-open" : ""}`} aria-label={language === "te" ? "ఈ రోజు మీ మార్గదర్శనం" : "Your guidance for today"}>
      <div className="journey-progress" aria-label={language === "te" ? "మీ పురోగతి" : "Your progress"}>
        {journeyItems.map((_, index) => <i key={index} className={journeyStep > index ? "done" : journeyStep === index ? "current" : ""}><span /></i>)}
      </div>

      <main className="journey-main">
        {!need && <section className="journey-needs">
          <span className="journey-greeting">{language === "te" ? `నమస్కారం, ${name}` : `Hello, ${name}`}</span>
          <p className="consultation-promise">{language === "te" ? "ముందుగా మీ మాట వింటాను. నిజంగా ఏది ఆందోళన కలిగిస్తోందో అర్థం చేసుకుని, ఆ తర్వాతే జాతకాన్ని చూస్తాను." : "I’ll listen first, understand what is really worrying you, and only then read the chart."}</p>
          <h1>{language === "te" ? "ఇప్పుడు మీకు ఎక్కువగా ఏది కావాలి?" : "What do you need most right now?"}</h1>
          <p>{language === "te" ? "సరిగ్గా అనిపించే దారిని ఎంచుకోండి. ఇది మీ జాతక గణనను మార్చదు—మీతో మాట్లాడే విధానాన్ని మాత్రమే మారుస్తుంది." : "Choose what feels closest. This will not change your calculated reading—only how we walk through it together."}</p>
          <div className="journey-need-grid">{needOptions.map(option=><button key={option.id} onClick={()=>setNeed(option.id as "clarity"|"courage"|"calm"|"direction")}><strong>{option.label}</strong><span>{option.detail}</span><i>→</i></button>)}</div>
          <button className="consultation-own-words" onClick={()=>onAsk(language === "te" ? "ఇప్పుడు నన్ను ఎక్కువగా ఆందోళన పెడుతున్న విషయం" : "What is worrying me most right now")}>{language === "te" ? "నా మాటల్లో చెప్పాలనుకుంటున్నాను" : "I’d rather explain it in my own words"} →</button>
        </section>}

        {need && journeyStep === 0 && <section className="journey-intro">
          <span className="journey-greeting">{language === "te" ? `నమస్కారం, ${name}` : `Hello, ${name}`}</span>
          <h1>{language === "te" ? "ఇప్పుడు మీకు ముఖ్యమైనది" : "What matters for you now"}</h1>
          <p className="journey-acknowledgement">{acknowledgements[need]}</p>
          <p>{everyday.summary}</p>
          <div className="journey-peek"><span>01</span><div><small>{journeyLabels[0]}</small><strong>{everyday.title}</strong></div></div>
          <button className="journey-primary" onClick={() => setJourneyStep(1)}>{language === "te" ? "నా మార్గదర్శనం చూడండి" : "Show my guidance"}<span>→</span></button>
          <small className="journey-time">{language === "te" ? "సుమారు 1 నిమిషం" : "About 1 minute"}</small>
        </section>}

        {journeyItem && <section className="journey-chapter" key={journeyItem.id}>
          <div className="journey-chapter-top"><span>{String(journeyStep).padStart(2, "0")} / {String(journeyItems.length).padStart(2, "0")}</span><small>{journeyLabels[journeyStep - 1]}</small></div>
          <h1>{journeyItem.title}</h1>
          <p>{journeyItem.message.charAt(0).toUpperCase() + journeyItem.message.slice(1)}</p>
          <div className="journey-action"><small>{journeyPrompts[journeyStep - 1]}</small><strong>{journeyStep === 3 ? journeyItem.message : journeyItem.title}</strong></div>
          <div className="journey-chapter-actions">
            <button className={`journey-save${savedInsightIds.includes(journeyItem.id) ? " saved" : ""}`} onClick={() => toggleSavedInsight(journeyItem.id)}>{savedInsightIds.includes(journeyItem.id) ? "✓ " : "♡ "}{language === "te" ? "దాచండి" : savedInsightIds.includes(journeyItem.id) ? "Saved" : "Save"}</button>
            <button className="journey-primary" onClick={() => journeyStep === journeyItems.length ? completeJourney() : setJourneyStep(step => step + 1)}>{journeyStep === journeyItems.length ? (language === "te" ? "ఈ రోజుకు పూర్తయింది" : "Done for now") : (language === "te" ? "తదుపరి" : "Continue")}<span>→</span></button>
          </div>
          <button className="journey-ask" onClick={() => onAsk(journeyItem.title)}>{language === "te" ? "దీని గురించి ఒక ప్రశ్న అడగండి" : "Ask a question about this"}</button>
        </section>}

        {journeyDone && <section className="journey-complete">
          <span className="journey-complete-mark">✓</span>
          <small>{language === "te" ? "ఈ రోజు పూర్తయింది" : "Your check-in is complete"}</small>
          <h1>{language === "te" ? "ఒక స్పష్టమైన అడుగు చాలు." : "One clear step is enough."}</h1>
          <p>{language === "te" ? "మీ మార్గదర్శనం దాచబడింది. పరిస్థితి మారినప్పుడు మళ్లీ వచ్చి అడగండి." : "Your guidance is here whenever you need it. Come back when something changes or a decision feels unclear."}</p>
          <div className="journey-history"><span>{language === "te" ? "గత 7 రోజులు" : "Your last 7 days"}</span><div>{Array.from({length:7},(_,index)=>{const day=new Date();day.setDate(day.getDate()-(6-index));const key=day.toISOString().slice(0,10);return <i key={key} className={completedDays.includes(key)?"done":""} title={key}/>})}</div><small>{language === "te" ? `${completedDays.filter(day=>Date.now()-new Date(day).getTime()<7*86400000).length} నిజమైన చెక్-ఇన్‌లు` : `${completedDays.filter(day=>Date.now()-new Date(day).getTime()<7*86400000).length} completed check-ins—not a streak`}</small></div>
          {savedInsightIds.length>0&&<p className="journey-owned">{language === "te" ? `${savedInsightIds.length} సూచనలు మీ కోసం దాచబడ్డాయి` : `${savedInsightIds.length} insight${savedInsightIds.length===1?" is":"s are"} saved in your journey`}</p>}
          <div className="consultation-clarity"><strong>{language === "te" ? "ఇది కొంచెం స్పష్టత ఇచ్చిందా?" : "Did this make things clearer?"}</strong><div><button className={clarityFeedback==="clearer"?"selected":""} onClick={()=>{setClarityFeedback("clearer");submit("helpful")}}>{language === "te" ? "అవును" : "Yes"}</button><button className={clarityFeedback==="partly"?"selected":""} onClick={()=>{setClarityFeedback("partly");submit("unclear")}}>{language === "te" ? "కొంతవరకు" : "Partly"}</button><button className={clarityFeedback==="not-yet"?"selected":""} onClick={()=>{setClarityFeedback("not-yet");submit("incorrect")}}>{language === "te" ? "ఇంకా లేదు" : "Not yet"}</button></div>{clarityFeedback==="not-yet"&&<button className="consultation-followup" onClick={()=>onAsk(language === "te" ? "ఇంకా స్పష్టంగా లేని విషయం" : "What still feels unclear")}>{language === "te" ? "ఏది ఇంకా స్పష్టంగా లేదో నా మాటల్లో చెబుతాను" : "Tell Sahadeva what still feels unclear"} →</button>}</div>
          <div className="journey-next-questions">{(full?.nextQuestions ?? summary?.everyday?.dailyLife.questions ?? []).slice(0, 2).map(question => <button key={question} onClick={() => onAsk(question)}>{question}<span>→</span></button>)}</div>
          <button className="journey-replay" onClick={() => {setJourneyStep(0);setNeed("");}}>{language === "te" ? "మళ్లీ చూడండి" : "Read it again"}</button>
        </section>}
      </main>

      <footer className="journey-depth">
        <div className="journey-provenance"><strong>{summary?.everyday?.provenance?.calculationShare ?? 93}%</strong><span>{language === "te" ? "గణన మరియు ఎంపిక కోడ్ ద్వారా" : "calculated and selected by code"}</span><i>·</i><span>{language === "te" ? "AI వాటిని సహజంగా వివరిస్తుంది" : "AI helps explain it naturally"}</span></div>
        <details>
          <summary>{language === "te" ? "పూర్తి వివరణ చదవండి" : "Want the full explanation?"}<span>{language === "te" ? "తెరవండి" : "Open"} ↓</span></summary>
          <article className="journey-long-reading">{ordinarySections.map(section => <section key={section.id}><h2>{section.title}</h2><ReadingBody text={section.body} /><button onClick={() => onAsk(section.title)}>{language === "te" ? "దీని గురించి అడగండి" : "Ask about this"} →</button></section>)}</article>
        </details>
        <button className="journey-why" onClick={() => setEvidenceOpen(value => !value)} aria-expanded={evidenceOpen}>{language === "te" ? "ఇది ఎలా లెక్కించబడింది?" : "How was this calculated?"}<span>⌁</span></button>
        {evidenceOpen && <section className="journey-technical">
          <div><small>{language === "te" ? "ఐచ్ఛిక సాంకేతిక వివరాలు" : "Optional technical details"}</small><h2>{language === "te" ? "రీడింగ్ వెనుక ఉన్న జాతకం" : "The chart behind your guidance"}</h2><p>{language === "te" ? "ఈ వివరాలు సాధారణ మార్గదర్శనాన్ని రూపొందించిన గణనలు. ఇవి హామీలు కావు." : "These calculations produced the guidance above. They are interpretive evidence, not guaranteed outcomes."}</p></div>
          {summary && <dl><div><dt>{language === "te" ? "ప్రస్తుత కాలం" : "Current period"}</dt><dd>{[timing?.mahadasha, timing?.antardasha].filter(Boolean).join(" · ") || "—"}</dd></div><div><dt>{language === "te" ? "గణన నమ్మకం" : "Calculation confidence"}</dt><dd>{summary.confidence?.level || "—"}</dd></div></dl>}
          {technicalSections.map(section => <details key={section.id}><summary>{section.title}</summary><ReadingBody text={section.body} /></details>)}
          <button onClick={onOpenChart}>{language === "te" ? "పూర్తి జాతకం చూడండి" : "Open the complete chart"} →</button>
        </section>}
        <div className="journey-footer-actions"><button onClick={onDownload}>↓ {language === "te" ? "దింపుకోండి" : "Download"}</button><button onClick={onRegenerate}>↻ {language === "te" ? "తాజా చేయండి" : "Refresh guidance"}</button></div>
      </footer>
    </section>
  );

  return (
    <section className={`reading-experience${evidenceOpen ? " evidence-is-open" : ""}`} aria-label={language === "te" ? "పూర్తి జాతక రీడింగ్" : "Complete chart reading"}>
      <header className="reading-cover">
        <div><span className="reading-kicker">{language === "te" ? "సహదేవ · వ్యక్తిగత రీడింగ్" : "Sahadeva · personal reading"}</span><h1>{name}{language === "te" ? " గారి జాతక రీడింగ్" : "’s chart reading"}</h1><p>{language === "te" ? `${sections.length} విభాగాలు · ఆధారాలతో వివరించబడింది` : `${sections.length} sections · explained with chart evidence`}</p></div>
        <button className="reading-evidence-toggle" onClick={() => setEvidenceOpen((value) => !value)} aria-expanded={evidenceOpen}>⌁ {language === "te" ? "ఆధారాలు" : "Chart evidence"}</button>
      </header>

      <div className="reading-mobile-nav">
        <label><span>{language === "te" ? "విభాగం" : "Section"}</span><select value={active} onChange={(event) => { setActive(event.target.value); jump(event.target.value); }}>{displaySections.map((section) => <option value={section.id} key={section.id}>{section.title}</option>)}</select></label>
        <i><span style={{ width: `${((activeIndex + 1) / Math.max(displaySections.length, 1)) * 100}%` }} /></i>
      </div>

      <div className="reading-layout">
        <nav className="reading-toc" aria-label={language === "te" ? "రీడింగ్ విభాగాలు" : "Reading sections"}>
          <span>{language === "te" ? "ఈ రీడింగ్‌లో" : "In this reading"}</span>
          <ol>{displaySections.map((section, index) => <li key={section.id}><button className={active === section.id ? "active" : ""} onClick={() => jump(section.id)}><em>{String(index + 1).padStart(2, "0")}</em>{section.title}</button></li>)}</ol>
          <div className="reading-progress"><span style={{ height: `${((activeIndex + 1) / Math.max(displaySections.length, 1)) * 100}%` }} /></div>
        </nav>

        <article className="reading-article" ref={articleRef}>
          {ordinarySections.map((section, index) => <section id={section.id} data-reading-section key={section.id} className="reading-section">
            <div className="reading-section-number">{String(index + 1).padStart(2, "0")}</div>
            <h2>{section.title}</h2>
            <ReadingBody text={section.body} />
            <button className="reading-ask" onClick={() => onAsk(section.title)}>↳ {language === "te" ? "ఈ విభాగం గురించి అడగండి" : "Ask about this section"}</button>
          </section>)}
          {full?.nextQuestions?.length?<section className="reading-next"><span className="reading-kicker">{language === "te" ? "తదుపరి సంప్రదింపు" : "Continue the consultation"}</span><h2>{language === "te" ? "మీ జాతకం ఆధారంగా తదుపరి ప్రశ్నలు" : "Useful next questions from your chart"}</h2>{full.nextQuestions.map(question=><button key={question} onClick={()=>onAsk(question)}>{question}<span>→</span></button>)}</section>:null}
          {(full || technicalSections.length>0) && <section className="technical-zone" aria-label={language === "te" ? "సాంకేతిక జాతక వివరాలు" : "Technical chart details"}>
            <span className="reading-kicker">{language === "te" ? "లోతైన వివరాలు" : "For readers who want the calculation layer"}</span>
            <h2>{language === "te" ? "సాంకేతిక జాతక వివరాలు" : "Technical chart details"}</h2>
            <p>{language === "te" ? "ఇక్కడి సమాచారం పై వివరణకు ఉపయోగించిన గణించిన జాతక నిర్మాణం. ఇవి సాంప్రదాయ ఆధారాలు; ఫలిత హామీలు కావు." : "This is the calculated chart structure beneath the plain-language reading. These are traditional evidence fields, not guaranteed outcomes."}</p>
            {full && <div className="reading-glance" aria-label={language === "te" ? "గణన ఒక చూపులో" : "Calculation at a glance"}>
              <div className="glance-heading"><span>{language === "te" ? "గణన ఒక చూపులో" : "Calculation at a glance"}</span><strong>{coverageCount}/{full.requiredSections.length} {language === "te" ? "అంశాలు" : "themes detected"}</strong></div>
              <div className="glance-grid"><article><span>{language === "te" ? "ప్రస్తుత దశ" : "Current period"}</span><strong>{full.atAGlance.currentPeriod.join(" · ") || "—"}</strong></article><article><span>{language === "te" ? "కొలిచిన గ్రహ బలాలు" : "Measured planet strengths"}</span><strong>{full.atAGlance.strongestPlanets.map(item=>item.planet).join(" · ") || "—"}</strong></article><article><span>{language === "te" ? "గణన నమ్మకం" : "Calculation confidence"}</span><strong>{full.atAGlance.confidence?.level || "—"}</strong></article></div>
            </div>}
            {technicalSections.map(section=><section id={section.id} data-reading-section key={section.id} className="technical-reading-section"><h3>{section.title}</h3><ReadingBody text={section.body}/>{evidenceFor(section.title).length>0&&<details className="section-evidence"><summary>{language === "te" ? "గణించిన ఆధారాలు చూడండి" : "View calculated evidence"}</summary><div>{evidenceFor(section.title).map(([key,value])=><article key={key}><strong>{key.replace(/([A-Z])/g," $1")}</strong><pre>{JSON.stringify(value,null,2)}</pre></article>)}</div></details>}</section>)}
            {full?.timeline?.length?<section className="reading-timeline"><span className="reading-kicker">{language === "te" ? "దశ కాలరేఖ" : "Calculated timing timeline"}</span><h3>{language === "te" ? "ప్రస్తుత మరియు తదుపరి దశలు" : "Current and upcoming periods"}</h3>{full.timeline.map((period,index)=><button key={`${period.level}-${period.lord}`} onClick={()=>onAsk(`${period.lord} ${period.level}`)} className={period.current?"current":""}><i>{String(index+1).padStart(2,"0")}</i><span><small>{period.level}</small><strong>{period.lord}</strong><em>{month(period.startIso,language)} — {month(period.endIso,language)}</em></span></button>)}</section>:null}
            {previousVersion&&<p className="reading-version-note">{language === "te" ? "మునుపటి రీడింగ్‌తో పోల్చడానికి ఈ సంస్కరణ భద్రపరచబడింది." : `Updated reading · previous version from ${previousVersion.generatedAt ? new Date(previousVersion.generatedAt).toLocaleDateString("en-IN") : "this device"} retained for comparison.`}</p>}
          </section>}
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
