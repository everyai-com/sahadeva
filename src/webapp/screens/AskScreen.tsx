import { useEffect, useRef, useState } from "react";
import "./ask.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { StatusBar, TabBar } from "../shell";
import { streamChat, type ChatSummary, type ChatTurn } from "../api";
import { grahaName, signName, nakName } from "../format";
import { Markdown } from "../md";
import { Glyph } from "../glyph";
import { peekAskPrefill, clearAskPrefill } from "../prefill";
import type { ReactNode } from "react";

type Turn = ChatTurn & { summary?: ChatSummary | null; streaming?: boolean; error?: string; retry?: string };

// The top life areas people ask about first, shown as selectable cards.
// `glyph` names the canonical Sahadeva life-area icon from the asset library.
type Topic = { id: string; en: string; te: string; icon: ReactNode; glyph?: string; qEn: string; qTe: string };
const TOPICS: Topic[] = [
  {
    id: "career",
    glyph: "career",
    en: "Career & work",
    te: "వృత్తి, ఉద్యోగం",
    icon: <path d="M4 8h16v11H4zM9 8V6a3 3 0 0 1 6 0v2" />,
    qEn: "What does my chart say about my career and work?",
    qTe: "నా జాతకం నా వృత్తి, ఉద్యోగం గురించి ఏం చెబుతుంది?",
  },
  {
    id: "marriage",
    glyph: "marriage",
    en: "Marriage & love",
    te: "వివాహం, ప్రేమ",
    icon: <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9Z" />,
    qEn: "What does my chart say about marriage and relationships?",
    qTe: "నా జాతకం వివాహం, సంబంధాల గురించి ఏం చెబుతుంది?",
  },
  {
    id: "education",
    glyph: "education",
    en: "Education",
    te: "చదువు",
    icon: <path d="M3 8l9-4 9 4-9 4-9-4Zm3 3v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />,
    qEn: "What does my chart say about my education and studies?",
    qTe: "నా జాతకం నా చదువు గురించి ఏం చెబుతుంది?",
  },
  {
    id: "health",
    glyph: "health",
    en: "Health",
    te: "ఆరోగ్యం",
    icon: <path d="M20 8.5a4.5 4.5 0 0 0-8-2.8A4.5 4.5 0 0 0 4 8.5c0 4.5 8 10 8 10s8-5.5 8-10ZM8 11h2l1.5-3 2 5 1.5-2H18" />,
    qEn: "What does my chart say about my health and wellbeing?",
    qTe: "నా జాతకం నా ఆరోగ్యం గురించి ఏం చెబుతుంది?",
  },
  {
    id: "wealth",
    glyph: "money",
    en: "Money & wealth",
    te: "డబ్బు, సంపద",
    icon: <path d="M12 3v18M8 7h6a2.5 2.5 0 0 1 0 5H9a2.5 2.5 0 0 0 0 5h7" />,
    qEn: "What does my chart say about money and wealth?",
    qTe: "నా జాతకం డబ్బు, సంపద గురించి ఏం చెబుతుంది?",
  },
  {
    id: "timing",
    en: "Timing now",
    te: "ప్రస్తుత సమయం",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    qEn: "What is happening in my chart right now, and what should I focus on?",
    qTe: "ప్రస్తుతం నా జాతకంలో ఏం జరుగుతోంది, నేను దేనిపై దృష్టి పెట్టాలి?",
  },
];

// Appended to the message sent to the model (not shown to the user) so replies
// stay short and easy to read — this directly answers the "too much info" issue.
const STYLE_EN =
  "\n\nAnswer in simple, everyday language a normal person understands. Start with the single main takeaway in one short sentence, then at most 3 short bullet points. Keep it under about 130 words. Do not use house numbers, planet strength percentages, or technical jargon. But do not leave out the most important detail — if there is a key timing, a caution, or a condition that matters, include it plainly in one of the points.";
const STYLE_TE =
  "\n\nసామాన్యులకు అర్థమయ్యే సరళమైన, రోజువారీ భాషలో సమాధానం ఇవ్వండి. ముందుగా ముఖ్య విషయాన్ని ఒక్క చిన్న వాక్యంలో చెప్పండి, తర్వాత గరిష్ఠంగా 3 చిన్న పాయింట్లు. సుమారు 130 పదాల లోపు ఉంచండి. ఇంటి సంఖ్యలు, గ్రహ బల శాతాలు, సాంకేతిక పదాలు వాడకండి. కానీ ముఖ్యమైన విషయాన్ని వదిలివేయకండి — ముఖ్యమైన సమయం, ఒక హెచ్చరిక, లేదా ఒక షరతు ఉంటే దాన్ని ఒక పాయింట్‌లో స్పష్టంగా చెప్పండి.";

// Short greetings / small talk that should NOT trigger a full chart reading.
const GREETING_RE =
  /^(hi+|hey+|hello+|hii+|hiya|yo|hai|namaste|namaskar(am)?|vandanam|good\s?(morning|afternoon|evening|night)|thanks?|thank you|ok(ay)?|nice|cool|హాయ్|హలో|నమస్తే|నమస్కారం|వందనం|ధన్యవాదాలు|థాంక్స్|సరే|బాగుంది)[\s!.…]*$/i;

/* ── chat history (threads persisted locally, ChatGPT-style) ────────────── */
type StoredTurn = { role: "user" | "assistant"; content: string; summary?: ChatSummary | null };
type Thread = { id: string; title: string; updatedAt: number; turns: StoredTurn[] };
const THREADS_KEY = "sahadev.webchat.threads";

function loadThreads(): Thread[] {
  try {
    const raw = JSON.parse(localStorage.getItem(THREADS_KEY) || "[]");
    return Array.isArray(raw) ? (raw as Thread[]) : [];
  } catch {
    return [];
  }
}
function saveThreads(list: Thread[]) {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* ignore */
  }
}
function titleFrom(turns: StoredTurn[]): string {
  const q = turns.find((x) => x.role === "user")?.content || "New chat";
  return q.length > 48 ? q.slice(0, 48).trimEnd() + "…" : q;
}
function newThreadId(): string {
  return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function relativeTime(ms: number, lang: "en" | "te"): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return lang === "te" ? "ఇప్పుడే" : "just now";
  if (min < 60) return lang === "te" ? `${min} నిమి క్రితం` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return lang === "te" ? `${hr} గం క్రితం` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return lang === "te" ? `${day} రోజుల క్రితం` : `${day}d ago`;
  return new Date(ms).toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", { day: "numeric", month: "short" });
}

export function AskScreen() {
  const { lang, t } = useLang();
  const { profile } = useData();
  const [turns, setTurns] = useState<Turn[]>([]);
  // A question handed over from another screen ("Ask about this house") is
  // placed in the box for the person to review and send.
  const [input, setInput] = useState(peekAskPrefill);
  useEffect(clearAskPrefill, []);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const threadRef = useRef<HTMLElement>(null);
  const recognitionRef = useRef<any>(null);
  const activeIdRef = useRef<string | null>(null);
  const threadsRef = useRef<Thread[]>(threads);
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const scrollToBottom = () =>
    requestAnimationFrame(() => {
      const el = threadRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });

  // ChatGPT behaviour: bring the just-sent question to the top and let the
  // answer stream in below it — do NOT keep yanking the view to the bottom.
  const pinQuestionTop = () =>
    requestAnimationFrame(() => {
      const el = threadRef.current;
      const q = el?.querySelector<HTMLElement>(".msg-user:last-of-type");
      if (q) q.scrollIntoView({ block: "start" });
    });

  // Persist the current conversation as a thread (create or update). Kept pure:
  // the new list is computed from a ref, so no side effects run inside setState.
  function persistThread(turnsArr: Turn[]) {
    const stored: StoredTurn[] = turnsArr
      .filter((x) => !x.streaming && (x.content || x.summary))
      .map((x) => ({ role: x.role, content: x.content, summary: x.summary ?? null }));
    if (!stored.some((x) => x.role === "user")) return;
    const now = Date.now();
    const prev = threadsRef.current;
    let id = activeIdRef.current;
    let list: Thread[];
    if (!id) {
      id = newThreadId();
      list = [{ id, title: titleFrom(stored), updatedAt: now, turns: stored }, ...prev];
    } else {
      const idx = prev.findIndex((th) => th.id === id);
      const entry: Thread = { id, title: idx >= 0 ? prev[idx].title : titleFrom(stored), updatedAt: now, turns: stored };
      list = [entry, ...prev.filter((th) => th.id !== id)];
    }
    activeIdRef.current = id;
    threadsRef.current = list;
    setActiveId(id);
    setThreads(list);
    saveThreads(list);
  }

  function openThread(th: Thread) {
    activeIdRef.current = th.id;
    setActiveId(th.id);
    setTurns(th.turns.map((x) => ({ role: x.role, content: x.content, summary: x.summary ?? null })));
    setHistoryOpen(false);
    scrollToBottom();
  }

  function newChat() {
    activeIdRef.current = null;
    setActiveId(null);
    setTurns([]);
    setHistoryOpen(false);
  }

  function deleteThread(id: string) {
    const list = threadsRef.current.filter((th) => th.id !== id);
    threadsRef.current = list;
    setThreads(list);
    saveThreads(list);
    if (activeIdRef.current === id) newChat();
  }

  async function ask(text: string) {
    if (!profile || !text.trim() || busy) return;
    const question = text.trim();
    const style = lang === "te" ? STYLE_TE : STYLE_EN;
    // History shown to the user stays clean; the model gets a brevity instruction
    // appended only to the current question.
    let base: Turn[] = turns.filter((x) => !x.streaming && !x.error);
    // A trailing unanswered question is left over from a failed attempt; a retry replaces it.
    if (base.length && base[base.length - 1].role === "user") base = base.slice(0, -1);
    const withUser: Turn[] = [...base, { role: "user", content: question }];

    // Greetings / small talk: reply conversationally, don't run a reading.
    if (GREETING_RE.test(question)) {
      const greetText = t(
        `Namaste${firstName ? " " + firstName : ""}! I can read your chart with you. What would you like to know — your career, marriage, health, money, or the timing right now?`,
        `నమస్తే${firstName ? " " + firstName : ""}! మీ జాతకాన్ని మీతో కలిసి చదవగలను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు — వృత్తి, వివాహం, ఆరోగ్యం, డబ్బు, లేదా ప్రస్తుత సమయం?`,
      );
      const suggestions = TOPICS.slice(0, 4).map((tp) => (lang === "te" ? tp.qTe : tp.qEn));
      const synthetic = { everyday: { dailyLife: { questions: suggestions } } } as ChatSummary;
      const greetTurns: Turn[] = [...withUser, { role: "assistant", content: greetText, summary: synthetic, streaming: false }];
      setInput("");
      setTurns(greetTurns);
      persistThread(greetTurns);
      pinQuestionTop();
      return;
    }

    const history: ChatTurn[] = [
      ...base.map((x) => ({ role: x.role, content: x.content })),
      { role: "user", content: question + style },
    ];
    setTurns([...withUser, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setBusy(true);
    pinQuestionTop(); // bring the new question to the top; don't chase the bottom

    try {
      const { text: reply, summary } = await streamChat({ ...profile, language: lang }, history, (cumulative) => {
        setTurns([...withUser, { role: "assistant", content: cumulative, streaming: true }]);
      });
      const finalTurns: Turn[] = [...withUser, { role: "assistant", content: reply, summary, streaming: false }];
      setTurns(finalTurns);
      persistThread(finalTurns);
    } catch (e) {
      const msg = String((e as Error).message) === "rate"
        ? t("Too many questions just now — try again in a moment.", "ఇప్పుడే చాలా ప్రశ్నలు — కొద్ది సేపటిలో మళ్లీ ప్రయత్నించండి.")
        : t("The assistant is unavailable right now. Your calculated chart is unaffected.", "సహాయకుడు ప్రస్తుతం అందుబాటులో లేడు. మీ జాతకం ప్రభావితం కాలేదు.");
      setTurns([...withUser, { role: "assistant", content: "", streaming: false, error: msg, retry: question }]);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setListening((v) => !v);
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = lang === "te" ? "te-IN" : "en-IN";
    rec.interimResults = true;
    rec.onresult = (ev: any) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      setInput(text);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const firstName = profile?.name ? profile.name.split(" ")[0] : "";
  const speechSupported =
    typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  return (
    <>
      <StatusBar />
      <div className="askhead ask-screen">
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="histbtn"
            type="button"
            aria-label={t("Chat history", "చాట్ చరిత్ర")}
            onClick={() => setHistoryOpen(true)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 4v4h4M12 8v4l3 2" />
            </svg>
          </button>
          <h2>{t("Ask", "అడగండి")}</h2>
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LangToggle />
          <button className="newbtn" type="button" onClick={newChat}>
            {t("New", "కొత్తది")}
          </button>
        </span>
      </div>

      <main className="thread ask-screen" ref={threadRef}>
        {turns.length === 0 ? (
          <div className="empty">
            <h2>{firstName ? t(`Hello ${firstName}. What would you like to know?`, `నమస్తే ${firstName}. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?`) : t("What would you like to know?", "మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?")}</h2>
            <p className="sub">{t("Choose a topic to start, or type your own question below.", "మొదలుపెట్టడానికి ఒక అంశాన్ని ఎంచుకోండి, లేదా కింద మీ ప్రశ్న టైప్ చేయండి.")}</p>
            <div className="topicgrid">
              {TOPICS.map((tp) => (
                <button key={tp.id} className="topiccard" type="button" onClick={() => ask(lang === "te" ? tp.qTe : tp.qEn)}>
                  <span className="tic">
                    {tp.glyph ? <Glyph family="life-area" id={tp.glyph} size={20} /> : <svg viewBox="0 0 24 24">{tp.icon}</svg>}
                  </span>
                  <span className="tlbl">{lang === "te" ? tp.te : tp.en}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, i) =>
            turn.role === "user" ? (
              <div className="msg-user" key={i}>
                {turn.content}
              </div>
            ) : (
              <Answer key={i} turn={turn} onFollowUp={ask} busy={busy} />
            ),
          )
        )}
        {/* room to keep the current question pinned near the top while streaming */}
        {busy && <div className="tailspace" aria-hidden="true" />}
      </main>

      <div className="composer ask-screen">
        <div className={`listen${listening ? " on" : ""}`}>
          <span className="wave" aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </span>
          <span className="small muted">{t("Listening… tap the microphone again to stop.", "వింటోంది… ఆపడానికి మైక్ మళ్లీ నొక్కండి.")}</span>
        </div>
        <div className="crow">
          <label className="cfield">
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              {t("Your question", "మీ ప్రశ్న")}
            </span>
            <input
              type="text"
              placeholder={t("Ask anything…", "ఏదైనా అడగండి…")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Ignore Enter while an IME (e.g. a Telugu keyboard) is still composing.
                if (e.key === "Enter" && !e.nativeEvent.isComposing) ask(input);
              }}
              autoComplete="off"
            />
          </label>
          {speechSupported && (
            <button className="iconbtn" type="button" aria-pressed={listening} aria-label={t("Speak your question", "మీ ప్రశ్న చెప్పండి")} onClick={toggleMic}>
              <svg viewBox="0 0 24 24">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
              </svg>
            </button>
          )}
          <button className="iconbtn sendbtn" type="button" aria-label={t("Send", "పంపు")} disabled={busy || !input.trim()} onClick={() => ask(input)}>
            <svg viewBox="0 0 24 24">
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* chat history drawer (ChatGPT / Claude style) */}
      <div className={`histscrim${historyOpen ? " on" : ""}`} onClick={() => setHistoryOpen(false)} />
      <aside className={`histdrawer${historyOpen ? " on" : ""}`} role="dialog" aria-modal="true" aria-label={t("Chat history", "చాట్ చరిత్ర")} inert={!historyOpen} onKeyDown={(e) => e.key === "Escape" && setHistoryOpen(false)}>
        <div className="histhead">
          <h3>{t("Chat history", "చాట్ చరిత్ర")}</h3>
          <button className="histclose" type="button" aria-label={t("Close", "మూసివేయి")} onClick={() => setHistoryOpen(false)}>
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <button className="histnew" type="button" onClick={newChat}>
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          {t("New chat", "కొత్త చాట్")}
        </button>
        <div className="histlist">
          {threads.length === 0 ? (
            <p className="histempty">{t("Your past chats will appear here.", "మీ పాత చాట్‌లు ఇక్కడ కనిపిస్తాయి.")}</p>
          ) : (
            threads.map((th) => (
              <div className={`histrow${activeId === th.id ? " active" : ""}`} key={th.id}>
                <button className="histopen" type="button" onClick={() => openThread(th)}>
                  <span className="httitle">{th.title}</span>
                  <span className="httime">{relativeTime(th.updatedAt, lang)}</span>
                </button>
                <button className="histdel" type="button" aria-label={t("Delete", "తొలగించు")} onClick={() => deleteThread(th.id)}>
                  <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" /></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <TabBar current="ask" />
    </>
  );
}

function Answer({ turn, onFollowUp, busy }: { turn: Turn; onFollowUp: (q: string) => void; busy: boolean }) {
  const { lang, t } = useLang();
  if (turn.streaming && !turn.content) {
    return (
      <div className="skel">
        <p className="lbl">{t("Reading your chart…", "మీ జాతకం చదువుతోంది…")}</p>
        <div className="bar" style={{ width: "100%" }} />
        <div className="bar" style={{ width: "92%" }} />
        <div className="bar" style={{ width: "64%" }} />
      </div>
    );
  }
  if (turn.error) {
    return (
      <article className="answer">
        <p className="averdict">{turn.error}</p>
        {turn.retry && (
          <button className="fup aretry" type="button" disabled={busy} onClick={() => onFollowUp(turn.retry!)}>
            {t("Try again", "మళ్ళీ ప్రయత్నించండి")}
          </button>
        )}
      </article>
    );
  }

  const s = turn.summary;
  const followUps =
    (s?.everyday?.dailyLife?.questions && s.everyday.dailyLife.questions.length
      ? s.everyday.dailyLife.questions
      : s?.fullProfile?.nextQuestions) || [];

  const jrows: Array<[string, string]> = [];
  if (s?.anchors?.lagna?.signName) jrows.push([`Ascendant ${signName2(s.anchors.lagna.signName, lang)}`, "Lagna · లగ్నం"]);
  if (s?.anchors?.moon?.signName) jrows.push([`Moon in ${signName2(s.anchors.moon.signName, lang)}${s.anchors.moon.nakshatra ? `, ${nakName(s.anchors.moon.nakshatra, lang)}` : ""}`, "Chandra · చంద్రుడు"]);
  if (s?.currentTiming?.mahadasha) jrows.push([`${grahaName(s.currentTiming.mahadasha, lang)} mahadasha${s.currentTiming.antardasha ? `, ${grahaName(s.currentTiming.antardasha, lang)} antardasha` : ""}`, "Vimshottari · వింశోత్తరి"]);
  if (s?.panchanga?.nakshatra) jrows.push([`${s.panchanga.tithi || ""} · ${s.panchanga.nakshatra}`, "Panchanga · పంచాంగం"]);

  return (
    <article className="answer">
      <div className="md">
        <Markdown text={turn.content} />
      </div>

      {jrows.length > 0 && (
        <details className="jy">
          <summary>{t("Show the jyotisha", "జ్యోతిష వివరాలు చూడండి")}</summary>
          <div className="jybody">
            {jrows.map((r, i) => (
              <div className="jrow" key={i}>
                <b>{r[0]}</b>
                <span className="tr">{r[1]}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {s && (
        <div className="ev">
          {s.anchors?.moon?.signName && <span className="evchip">Moon · {signName2(s.anchors.moon.signName, lang)}</span>}
          {s.currentTiming?.mahadasha && <span className="evchip">{grahaName(s.currentTiming.mahadasha, lang)} dasha</span>}
        </div>
      )}

      {followUps.length > 0 && (
        <div className="fups">
          {followUps.slice(0, 3).map((q) => (
            <button key={q} className="fup" type="button" onClick={() => onFollowUp(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <p className="limitnote">
        {t(
          "Sahadeva does not predict outcomes. It reports what the classical rules say and where they disagree.",
          "సహదేవ ఫలితాలను జోస్యం చెప్పదు. శాస్త్ర నియమాలు ఏమి చెబుతున్నాయో, అవి ఎక్కడ విభేదిస్తున్నాయో మాత్రమే చెబుతుంది.",
        )}
      </p>
    </article>
  );
}

// Summary sign names arrive as English canonical (e.g. "Kumbha"); map to Telugu when possible.
function signName2(name: string, lang: "en" | "te"): string {
  if (lang === "en") return name;
  const EN = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"];
  const i = EN.indexOf(name);
  return i >= 0 ? signName(i, "te") : name;
}
