import { memo, useEffect, useRef, useState } from "react";
import "./ask.css";
import { useLang, LangToggle } from "../lang";
import { useData } from "../data";
import { StatusBar, TabBar } from "../shell";
import {
  fetchConversationAlignment,
  recordConversationInput,
  streamChat,
  submitClaimFeedback,
  saveConversationToAccount,
  type AlignmentSnapshot,
  type ChatSummary,
  type ChatTurn,
  type StoredConversation,
} from "../api";
import { analyticsCapture } from "../../analytics";
import { grahaName, signName, nakName } from "../format";
import { Markdown } from "../md";
import { getLifeContext } from "../lifeContext";
import { requestsFullProfile } from "../../../shared/chatEvidenceRouting";
import { AuthSheet } from "./AuthSheet";
import type { ReactNode } from "react";

type Turn = ChatTurn & { id?: string; summary?: ChatSummary | null; streaming?: boolean; error?: string };

// The top life areas people ask about first, shown as selectable cards.
type Topic = { id: string; en: string; te: string; icon: ReactNode; qEn: string; qTe: string };
const TOPICS: Topic[] = [
  {
    id: "career",
    en: "Career & work",
    te: "వృత్తి, ఉద్యోగం",
    icon: <path d="M4 8h16v11H4zM9 8V6a3 3 0 0 1 6 0v2" />,
    qEn: "What does my chart say about my career and work?",
    qTe: "నా జాతకం నా వృత్తి, ఉద్యోగం గురించి ఏం చెబుతుంది?",
  },
  {
    id: "marriage",
    en: "Marriage & love",
    te: "వివాహం, ప్రేమ",
    icon: <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9Z" />,
    qEn: "What does my chart say about marriage and relationships?",
    qTe: "నా జాతకం వివాహం, సంబంధాల గురించి ఏం చెబుతుంది?",
  },
  {
    id: "education",
    en: "Education",
    te: "చదువు",
    icon: <path d="M3 8l9-4 9 4-9 4-9-4Zm3 3v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />,
    qEn: "What does my chart say about my education and studies?",
    qTe: "నా జాతకం నా చదువు గురించి ఏం చెబుతుంది?",
  },
  {
    id: "health",
    en: "Health",
    te: "ఆరోగ్యం",
    icon: <path d="M20 8.5a4.5 4.5 0 0 0-8-2.8A4.5 4.5 0 0 0 4 8.5c0 4.5 8 10 8 10s8-5.5 8-10ZM8 11h2l1.5-3 2 5 1.5-2H18" />,
    qEn: "What does my chart say about my health and wellbeing?",
    qTe: "నా జాతకం నా ఆరోగ్యం గురించి ఏం చెబుతుంది?",
  },
  {
    id: "wealth",
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

// The reply format (short answer + collapsible reasoning) is requested server-side
// via responseStyle: "layered"; the heading below is where the two parts split.
const WHY_RE = /^##\s+(?:Why (?:Sahadeva|Sahadeva) says this|(?:సహదేవ|సహదేవ్) ఇలా ఎందుకు చెబుతున్నాడు)\s*$/im;

// Short greetings / small talk that should NOT trigger a full chart reading.
const GREETING_RE =
  /^(hi+|hey+|hello+|hii+|hiya|yo|hai|namaste|namaskar(am)?|vandanam|good\s?(morning|afternoon|evening|night)|thanks?|thank you|ok(ay)?|nice|cool|హాయ్|హలో|నమస్తే|నమస్కారం|వందనం|ధన్యవాదాలు|థాంక్స్|సరే|బాగుంది)[\s!.…]*$/i;

/* ── chat history (threads persisted locally, ChatGPT-style) ────────────── */
type StoredTurn = { id?: string; role: "user" | "assistant"; content: string; summary?: ChatSummary | null };
type Thread = { id: string; title: string; updatedAt: number; turns: StoredTurn[] };
const THREADS_KEY = "sahadev.webchat.threads.v2";

function loadThreads(scope: string): Thread[] {
  try {
    const raw = JSON.parse(localStorage.getItem(`${THREADS_KEY}:${scope}`) || "[]");
    return Array.isArray(raw) ? (raw as Thread[]) : [];
  } catch {
    return [];
  }
}
function saveThreads(scope: string, list: Thread[]) {
  try {
    localStorage.setItem(`${THREADS_KEY}:${scope}`, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

function serverThreads(value: StoredConversation | null): Thread[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.length
      ? normalizeThreads([{ id: "legacy-conversation", title: titleFrom(value), updatedAt: Date.now(), turns: value }])
      : [];
  }
  return normalizeThreads((value.threads || []).map((thread) => ({
    id: thread.id,
    title: thread.title || titleFrom(thread.messages),
    updatedAt: typeof thread.updatedAt === "number" ? thread.updatedAt : Date.parse(thread.updatedAt) || Date.now(),
    turns: thread.messages || [],
  })));
}

function normalizeThreads(threads: Thread[]): Thread[] {
  return threads.map((thread) => ({
    ...thread,
    turns: thread.turns.map((turn, index) => ({
      ...turn,
      id: turn.id || `r-legacy-${(thread.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "conversation")}-${index}`,
    })),
  }));
}
function titleFrom(turns: StoredTurn[]): string {
  const q = turns.find((x) => x.role === "user")?.content || "New chat";
  return q.length > 48 ? q.slice(0, 48).trimEnd() + "…" : q;
}
function newThreadId(): string {
  return `t-${crypto.randomUUID()}`;
}

function newTurnId(): string {
  return `r-${crypto.randomUUID()}`;
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

function rememberedUserContext(threads: Thread[], manualContext: string): string {
  const earlierUserMessages = threads
    .flatMap((thread) => thread.turns)
    .filter((turn) => turn.role === "user" && turn.content.trim())
    .slice(-16)
    .map((turn) => `Earlier user message: ${turn.content.replace(/\s+/g, " ").trim()}`);
  return [manualContext.trim(), ...earlierUserMessages]
    .filter(Boolean)
    .join("\n")
    .slice(-2000);
}

export function AskScreen() {
  const { lang, t } = useLang();
  const { profile, account, activePersonId, conversation } = useData();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [alignmentScore, setAlignmentScore] = useState(50);
  const [alignmentHistory, setAlignmentHistory] = useState<AlignmentSnapshot[]>([]);
  const threadRef = useRef<HTMLElement>(null);
  const recognitionRef = useRef<any>(null);
  const activeIdRef = useRef<string | null>(null);
  const threadsRef = useRef<Thread[]>(threads);
  const storageScope = account?.id && activePersonId
    ? `account:${account.id}:person:${activePersonId}`
    : profile
      ? `guest:${profile.date}:${profile.time}:${profile.latitude.toFixed(3)}:${profile.longitude.toFixed(3)}`
      : "guest:empty";
  const storageScopeRef = useRef(storageScope);
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    storageScopeRef.current = storageScope;
    const restored = account ? serverThreads(conversation) : loadThreads(storageScope);
    const localFallback = normalizeThreads(restored.length ? restored : loadThreads(storageScope));
    threadsRef.current = localFallback;
    setThreads(localFallback);
    setTurns([]);
    setActiveId(null);
    activeIdRef.current = null;
    setAlignmentScore(50);
    setAlignmentHistory([]);
  }, [account, activePersonId, conversation, storageScope]);

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
      .map((x) => ({ id: x.id, role: x.role, content: x.content, summary: x.summary ?? null }));
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
    saveThreads(storageScopeRef.current, list);
    if (account) void saveConversationToAccount(list, id);
  }

  function openThread(th: Thread) {
    activeIdRef.current = th.id;
    setActiveId(th.id);
    setTurns(th.turns.map((x) => ({ id: x.id, role: x.role, content: x.content, summary: x.summary ?? null })));
    setHistoryOpen(false);
    scrollToBottom();
  }

  function newChat() {
    activeIdRef.current = null;
    setActiveId(null);
    setTurns([]);
    setAlignmentScore(50);
    setAlignmentHistory([]);
    setHistoryOpen(false);
  }

  function deleteThread(id: string) {
    const list = threadsRef.current.filter((th) => th.id !== id);
    threadsRef.current = list;
    setThreads(list);
    saveThreads(storageScopeRef.current, list);
    if (account) void saveConversationToAccount(list, activeIdRef.current === id ? null : activeIdRef.current);
    if (activeIdRef.current === id) newChat();
  }

  async function ask(text: string, deep = false) {
    if (!profile || !text.trim() || busy) return;
    const question = text.trim();
    let sessionId = activeIdRef.current;
    if (!sessionId) {
      sessionId = newThreadId();
      activeIdRef.current = sessionId;
      setActiveId(sessionId);
    }
    analyticsCapture("prompt_submitted", {
      conversation_session_id: sessionId,
      input_length_band: question.length < 80 ? "short" : question.length < 300 ? "medium" : "long",
      input_method: listening ? "voice" : "text",
      response_depth: deep ? "deep" : "standard",
    });
    const base: Turn[] = turns.filter((x) => !x.streaming && !x.error);
    const userTurnId = newTurnId();
    const withUser: Turn[] = [...base, { id: userTurnId, role: "user", content: question }];
    // Save scoring in the background so a new chat appears immediately.
    void (async () => {
      try {
        const inputState = await recordConversationInput(sessionId, userTurnId, question);
        const next = await fetchConversationAlignment(sessionId);
        if (activeIdRef.current === sessionId) {
          setAlignmentScore(inputState.score);
          setAlignmentHistory(next.history);
        }
        analyticsCapture("alignment_score_changed", {
          conversation_session_id: sessionId,
          alignment_score: inputState.score,
          concern_open: inputState.concernOpen,
          source: "user_input",
        });
      } catch {
        // Conversation remains available if telemetry persistence is temporarily unavailable.
      }
    })();

    // Greetings / small talk: reply conversationally, don't run a reading.
    if (GREETING_RE.test(question)) {
      const greetText = t(
        `Namaste${firstName ? " " + firstName : ""}! I can read your chart with you. What would you like to know — your career, marriage, health, money, or the timing right now?`,
        `నమస్తే${firstName ? " " + firstName : ""}! మీ జాతకాన్ని మీతో కలిసి చదవగలను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు — వృత్తి, వివాహం, ఆరోగ్యం, డబ్బు, లేదా ప్రస్తుత సమయం?`,
      );
      const suggestions = TOPICS.slice(0, 4).map((tp) => (lang === "te" ? tp.qTe : tp.qEn));
      const synthetic = { everyday: { dailyLife: { questions: suggestions } } } as ChatSummary;
      const greetTurns: Turn[] = [...withUser, { id: newTurnId(), role: "assistant", content: greetText, summary: synthetic, streaming: false }];
      setInput("");
      setTurns(greetTurns);
      persistThread(greetTurns);
      pinQuestionTop();
      return;
    }

    const history: ChatTurn[] = [
      ...base.map((x) => ({ role: x.role, content: x.content })),
      { role: "user", content: question },
    ];
    const responseTurnId = newTurnId();
    setTurns([...withUser, { id: responseTurnId, role: "assistant", content: "", streaming: true }]);
    setInput("");
    setBusy(true);
    pinQuestionTop(); // bring the new question to the top; don't chase the bottom

    try {
      const { text: reply, summary } = await streamChat(
        { ...profile, language: lang },
        history,
        (cumulative) => {
          setTurns([...withUser, { id: responseTurnId, role: "assistant", content: cumulative, streaming: true }]);
        },
        undefined,
        {
          lifeContext: rememberedUserContext(threadsRef.current, getLifeContext()),
          deep,
          conversationSessionId: sessionId,
          conversationTurnId: userTurnId,
          fullProfile: requestsFullProfile(question),
        },
      );
      const finalTurns: Turn[] = [...withUser, { id: responseTurnId, role: "assistant", content: reply, summary, streaming: false }];
      setTurns(finalTurns);
      persistThread(finalTurns);
      analyticsCapture("response_completed", {
        conversation_session_id: sessionId,
        response_length_band: reply.length < 500 ? "short" : reply.length < 2500 ? "medium" : "long",
        reading_mode: summary?.readingMode || "unknown",
      });
      if (summary?.conversationAlignment?.recoveryAttempted)
        analyticsCapture("concern_recovery_attempted", {
          conversation_session_id: sessionId,
          alignment_score: summary.conversationAlignment.score,
        });
      void fetchConversationAlignment(sessionId).then((nextAlignment) => {
        if (activeIdRef.current === sessionId) {
          setAlignmentScore(nextAlignment.score);
          setAlignmentHistory(nextAlignment.history);
        }
      }).catch(() => {
        // A completed answer must not remain loading if scoring is unavailable.
      });
    } catch (e) {
      const msg = String((e as Error).message) === "rate"
        ? t("Too many questions just now — try again in a moment.", "ఇప్పుడే చాలా ప్రశ్నలు — కొద్ది సేపటిలో మళ్లీ ప్రయత్నించండి.")
        : t("The assistant is unavailable right now. Your calculated chart is unaffected.", "సహాయకుడు ప్రస్తుతం అందుబాటులో లేడు. మీ జాతకం ప్రభావితం కాలేదు.");
      setTurns([...withUser, { id: responseTurnId, role: "assistant", content: "", streaming: false, error: msg }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!activeId) return;
    void fetchConversationAlignment(activeId).then((state) => {
      setAlignmentScore(state.score);
      setAlignmentHistory(state.history);
    });
  }, [activeId]);

  async function reactToClaim(input: {
    turnId: string;
    claimId: string;
    claimKind: string;
    rating: "up" | "down";
    reason?: string;
    response: string;
  }) {
    const sessionId = activeIdRef.current;
    if (!sessionId) return;
    const result = await submitClaimFeedback(sessionId, input);
    const next = await fetchConversationAlignment(sessionId);
    setAlignmentScore(result.score);
    setAlignmentHistory(next.history);
    analyticsCapture("claim_feedback_submitted", {
      conversation_session_id: sessionId,
      claim_kind: input.claimKind,
      rating: input.rating,
      reason: input.reason,
      alignment_score: result.score,
    });
    if (result.concernResolved)
      analyticsCapture("concern_resolved", {
        conversation_session_id: sessionId,
        alignment_score: result.score,
      });
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
                    <svg viewBox="0 0 24 24">{tp.icon}</svg>
                  </span>
                  <span className="tlbl">{lang === "te" ? tp.te : tp.en}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, i) =>
            turn.role === "user" ? (
              <div className="msg-user" key={turn.id || i}>
                {turn.content}
              </div>
            ) : (
              <div className="assistant-turn" key={turn.id || i}>
                <Answer turn={turn} onFollowUp={ask} onReact={reactToClaim} />
                {!account && !turn.streaming && !turn.error && turns.slice(0, i + 1).filter((item) => item.role === "user").length === 3 && (
                  <aside className="save-chat-card" aria-label={t("Save this conversation", "ఈ సంభాషణను భద్రపరచండి")}>
                    <span className="save-chat-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 0-4 4v2M7 9h10a2 2 0 0 1 2 2v8H5v-8a2 2 0 0 1 2-2Z" /></svg>
                    </span>
                    <div>
                      <h3>{t("Keep this conversation", "ఈ సంభాషణను ఉంచుకోండి")}</h3>
                      <p>{t("Add your email to create an account. We’ll back up this chat and your chart so you can continue on any device.", "ఖాతా సృష్టించడానికి మీ ఇమెయిల్‌ను జోడించండి. ఈ చాట్, మీ జాతకాన్ని భద్రపరుస్తాం; ఏ పరికరంలోనైనా కొనసాగించవచ్చు.")}</p>
                      <button type="button" onClick={() => setAuthOpen(true)}>{t("Save with email", "ఇమెయిల్‌తో భద్రపరచండి")}</button>
                    </div>
                  </aside>
                )}
              </div>
            ),
          )
        )}
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
                if (e.key === "Enter") ask(input);
              }}
              autoComplete="off"
            />
          </label>
          <button className="iconbtn" type="button" aria-pressed={listening} aria-label={t("Speak your question", "మీ ప్రశ్న చెప్పండి")} onClick={toggleMic}>
            <svg viewBox="0 0 24 24">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
            </svg>
          </button>
          <button className="iconbtn sendbtn" type="button" aria-label={t("Send", "పంపు")} onClick={() => ask(input)}>
            <svg viewBox="0 0 24 24">
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* chat history drawer (ChatGPT / Claude style) */}
      <div className={`histscrim${historyOpen ? " on" : ""}`} onClick={() => setHistoryOpen(false)} />
      <aside className={`histdrawer${historyOpen ? " on" : ""}`} role="dialog" aria-modal="true" aria-label={t("Chat history", "చాట్ చరిత్ర")}>
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
      <AuthSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={() => saveConversationToAccount(threadsRef.current, activeIdRef.current)}
      />
    </>
  );
}

const TOPIC_TE: Record<string, string> = {
  "career and work": "వృత్తి, ఉద్యోగం",
  "marriage and partnership": "వివాహం, భాగస్వామ్యం",
  "money and resources": "డబ్బు, వనరులు",
  "education and learning": "చదువు, అభ్యాసం",
  "children and creativity": "సంతానం, సృజనాత్మకత",
  "home, property and vehicles": "ఇల్లు, ఆస్తి, వాహనాలు",
  "meaning and spiritual practice": "ఆధ్యాత్మిక సాధన",
  "health and vitality": "ఆరోగ్యం, శక్తి",
  "overall momentum": "మొత్తం గమనం",
};

type ClaimFeedbackInput = {
  turnId: string;
  claimId: string;
  claimKind: string;
  rating: "up" | "down";
  reason?: string;
  response: string;
};

function materialClaims(text: string, prefix: string): Array<{ id: string; kind: string; text: string }> {
  const claims: Array<{ id: string; kind: string; text: string }> = [];
  let heading = "";
  let kind = prefix;
  let paragraph: string[] = [];
  const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 42);
  const push = (body: string) => {
    const value = `${heading}${heading ? "\n" : ""}${body}`.trim();
    if (!value) return;
    const index = claims.length;
    claims.push({ id: `${prefix}_${index}_${slug(value.slice(0, 70)) || "point"}`, kind, text: value });
    heading = "";
  };
  const flushParagraph = () => {
    if (paragraph.length) push(paragraph.join("\n"));
    paragraph = [];
  };
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      heading = trimmed;
      kind = slug(headingMatch[2]) || prefix;
    } else if (/^(?:[-*+]\s+|\d+[.)]\s+)/.test(trimmed)) {
      flushParagraph();
      push(trimmed);
    } else if (!trimmed) {
      flushParagraph();
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  if (heading) push(heading);
  return claims;
}

function InsightCard({
  turnId,
  claim,
  onReact,
}: {
  turnId: string;
  claim: { id: string; kind: string; text: string };
  onReact: (input: ClaimFeedbackInput) => Promise<void>;
}) {
  const { t } = useLang();
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [chooseReason, setChooseReason] = useState(false);
  const [busy, setBusy] = useState(false);
  const reasons = [
    ["incorrect", t("Incorrect", "తప్పు")],
    ["not_relevant", t("Not relevant", "సంబంధం లేదు")],
    ["unclear", t("Unclear", "అస్పష్టం")],
    ["missed_concern", t("Missed my concern", "నా ఆందోళనను గుర్తించలేదు")],
    ["too_generic", t("Too generic", "చాలా సాధారణం")],
    ["other", t("Other", "ఇతర")],
  ];
  async function submit(next: "up" | "down", reason?: string, keepReasonPicker = false) {
    setBusy(true);
    try {
      await onReact({ turnId, claimId: claim.id, claimKind: claim.kind, rating: next, reason, response: claim.text });
      setRating(next);
      if (!keepReasonPicker) setChooseReason(false);
    } catch {
      // Keep the controls available so the person can retry after a transient failure.
    } finally {
      setBusy(false);
    }
  }
  const plain = claim.text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\*\*|__|`/g, "")
    .trim();
  return (
    <details className={`insight-card${rating ? ` reacted ${rating}` : ""}`}>
      <summary><span>{plain}</span></summary>
      <div className="insight-body">
        <p className="insight-question">{rating ? t("Response saved. Sahadeva will consider it in your next question.", "మీ స్పందన భద్రపరచబడింది. మీ తదుపరి ప్రశ్నలో సహదేవ దాన్ని పరిగణిస్తుంది.") : t("Does this match your experience or belief?", "ఇది మీ అనుభవం లేదా నమ్మకానికి సరిపోతుందా?")}</p>
        <div className="insight-actions">
          <button type="button" disabled={busy} className={rating === "up" ? "selected" : ""} aria-pressed={rating === "up"} onClick={() => void submit("up")}>↑ <span>{t("Matches", "సరిపోతుంది")}</span></button>
          <button type="button" disabled={busy} className={rating === "down" ? "selected" : ""} aria-pressed={rating === "down"} onClick={() => { setChooseReason(true); void submit("down", "other", true); }}>↓ <span>{t("Conflicts", "విరుద్ధంగా ఉంది")}</span></button>
        </div>
        {chooseReason && (
          <div className="claim-reasons" role="group" aria-label={t("What did not match?", "ఏది సరిపోలలేదు?")}>
            {reasons.slice(0, -1).map(([value, label]) => (
              <button key={value} type="button" disabled={busy} onClick={() => void submit("down", value)}>{label}</button>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

// Memoised: streaming updates only re-render the turn that is changing.
const Answer = memo(function Answer({ turn, onFollowUp, onReact }: {
  turn: Turn;
  onFollowUp: (q: string) => void;
  onReact: (input: ClaimFeedbackInput) => Promise<void>;
}) {
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
      </article>
    );
  }

  const s = turn.summary;
  const followUps =
    (s?.followUps && s.followUps.length
      ? s.followUps
      : s?.everyday?.dailyLife?.questions && s.everyday.dailyLife.questions.length
        ? s.everyday.dailyLife.questions
        : s?.fullProfile?.nextQuestions) || [];

  // Layered reply: the short answer, then reasoning behind a disclosure.
  const whyMatch = WHY_RE.exec(turn.content);
  const shortPart = whyMatch ? turn.content.slice(0, whyMatch.index) : turn.content;
  const whyPart = whyMatch ? turn.content.slice(whyMatch.index + whyMatch[0].length) : "";
  const shortClaims = materialClaims(shortPart, "answer");
  const detailClaims = materialClaims(whyPart, "reasoning");
  const outlook = s?.timingOutlook;
  const pastTiming = s?.retrospectiveTiming;

  const jrows: Array<[string, string]> = [];
  if (s?.anchors?.lagna?.signName) jrows.push([`Ascendant ${signName2(s.anchors.lagna.signName, lang)}`, "Lagna · లగ్నం"]);
  if (s?.anchors?.moon?.signName) jrows.push([`Moon in ${signName2(s.anchors.moon.signName, lang)}${s.anchors.moon.nakshatra ? `, ${nakName(s.anchors.moon.nakshatra, lang)}` : ""}`, "Chandra · చంద్రుడు"]);
  if (s?.currentTiming?.mahadasha) jrows.push([`${grahaName(s.currentTiming.mahadasha, lang)} mahadasha${s.currentTiming.antardasha ? `, ${grahaName(s.currentTiming.antardasha, lang)} antardasha` : ""}`, "Vimshottari · వింశోత్తరి"]);
  if (s?.panchanga?.nakshatra) jrows.push([`${s.panchanga.tithi || ""} · ${s.panchanga.nakshatra}`, "Panchanga · పంచాంగం"]);

  return (
    <article className="answer">
      <div className="insight-list">
        {shortClaims.map((claim) => (
          turn.id ? <InsightCard key={claim.id} turnId={turn.id} claim={claim} onReact={onReact} /> : <div className="md" key={claim.id}><Markdown text={claim.text} /></div>
        ))}
      </div>

      {(whyPart.trim() || (turn.streaming && whyMatch)) && (
        <details className="jy why">
          <summary>{t("Why Sahadeva says this", "సహదేవ ఇలా ఎందుకు చెబుతోంది")}</summary>
          <div className="jybody insight-list detail-insights">
            {detailClaims.map((claim) => (
              turn.id ? <InsightCard key={claim.id} turnId={turn.id} claim={claim} onReact={onReact} /> : <div className="md" key={claim.id}><Markdown text={claim.text} /></div>
            ))}
          </div>
        </details>
      )}

      {outlook && !turn.streaming && (outlook.windows.length > 0 || outlook.sadeSati.active) && (
        <div className="timing">
          <p className="tmtitle">
            {t("Timing windows", "అనుకూల సమయాలు")}
            <span className="tmtopic"> · {lang === "te" ? TOPIC_TE[outlook.topicLabel] || outlook.topicLabel : outlook.topicLabel}</span>
          </p>
          <p className="tmnow">
            <span className={`tmband ${outlook.now.band}`} aria-hidden="true" />
            {t("Now", "ఇప్పుడు")}: {t(outlook.now.band === "strong" ? "strong support" : outlook.now.band === "moderate" ? "moderate support" : "building phase", outlook.now.band === "strong" ? "బలమైన మద్దతు" : outlook.now.band === "moderate" ? "మధ్యస్థ మద్దతు" : "నిర్మాణ దశ")}
          </p>
          <div className="tmwins">
            {outlook.windows.map((w) => (
              <details className={`tmwin ${w.strength}`} key={w.startIso}>
                <summary><b>{w.label}</b><span>{t("View why", "ఎందుకో చూడండి")}</span></summary>
                <p>{w.reasons.join(" · ")}</p>
              </details>
            ))}
          </div>
          {outlook.sadeSati.active && (
            <p className="tmsade">{t(`Sade Sati is active (${outlook.sadeSati.stage} phase).`, `సాడే సాతి కొనసాగుతోంది (${outlook.sadeSati.stage} దశ).`)}</p>
          )}
          <p className="tmnote">{t("Calculated period-and-transit support, not a promise of events.", "గణించిన దశ-గోచార మద్దతు మాత్రమే, సంఘటనల హామీ కాదు.")}</p>
        </div>
      )}

      {pastTiming && !turn.streaming && (
        <div className="timing retrospective-timing">
          <p className="tmtitle">{t("Plausible past periods", "గతంలో సంభావ్య కాలాలు")}</p>
          <p className="tmnow">{pastTiming.range.label}</p>
          <div className="tmwins">
            {pastTiming.windows.length > 0 ? pastTiming.windows.map((w) => (
              <details className={`tmwin ${w.strength}`} key={w.startIso}>
                <summary><b>{w.label}</b><span>{t("View Dasha", "దశ చూడండి")}</span></summary>
                <p>{[...w.periods, ...w.reasons].join(" · ")}</p>
              </details>
            )) : pastTiming.dashaSequence.filter((step) => step.relevance !== "neutral").slice(0, 4).map((step) => (
              <details className="tmwin moderate" key={step.label}>
                <summary><b>{step.label}</b><span>{t("View why", "ఎందుకో చూడండి")}</span></summary>
                <p>{step.activates.join(" · ")}</p>
              </details>
            ))}
          </div>
          <p className="tmnote">{t("Calculated Dasha and transit candidates—not proof that a relationship happened or succeeded.", "గణించిన దశ మరియు గోచార సూచనలు మాత్రమే—సంబంధం జరిగింది లేదా విజయవంతమైంది అన్న నిర్ధారణ కాదు.")}</p>
        </div>
      )}

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
});

// Summary sign names arrive as English canonical (e.g. "Kumbha"); map to Telugu when possible.
function signName2(name: string, lang: "en" | "te"): string {
  if (lang === "en") return name;
  const EN = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"];
  const i = EN.indexOf(name);
  return i >= 0 ? signName(i, "te") : name;
}
