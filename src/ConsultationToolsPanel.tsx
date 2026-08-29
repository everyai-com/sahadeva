import { useState } from "react";
import type { BirthInput, ChartResult } from "../shared/schema";
import type { TimingTopic } from "../shared/timingFusion";

const TOPICS: TimingTopic[] = [
  "career",
  "marriage",
  "wealth",
  "education",
  "children",
  "property",
  "spirituality",
];
type Depth = {
  vargaSynthesis: {
    judgment: string;
    score: number;
    rows: Array<{ varga: string; confirmation: string }>;
  };
  strengthLineage: {
    vimsopaka: {
      sets: { shodashavarga: Array<{ name: string; score20: number }> };
    };
  };
  additionalDashas: {
    precision: { current: { levels?: Record<string, string> } };
  };
};
type Fusion = {
  promise: {
    present: boolean;
    score: number;
    supportingEvidence: string[];
    contradictions: string[];
  };
  windows: Array<{
    start: string;
    end: string;
    score: number;
    crossSystem?: { confirmations: string[]; disagreements: string[] };
  }>;
  notice: string;
};
type Rectification = {
  rankedCandidates: Array<{
    date: string;
    time: string;
    score: number;
    holdoutScore: number | null;
  }>;
  rankedClusters: Array<{
    startTime: string;
    endTime: string;
    bestScore: number;
    holdoutScore: number | null;
  }>;
  notice: string;
};
export function ConsultationToolsPanel({
  form,
  chart,
}: {
  form: BirthInput;
  chart: ChartResult;
}) {
  const [topic, setTopic] = useState<TimingTopic>("career"),
    [depth, setDepth] = useState<Depth | null>(null),
    [fusion, setFusion] = useState<Fusion | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [earliest, setEarliest] = useState(form.time),
    [latest, setLatest] = useState(form.time),
    [event1, setEvent1] = useState(""),
    [event2, setEvent2] = useState(""),
    [rectification, setRectification] = useState<Rectification | null>(null);
  const analyze = async () => {
    setLoading(true);
    setError("");
    const start = new Date(),
      end = new Date(start);
    end.setUTCFullYear(end.getUTCFullYear() + 2);
    const body = {
        ...form,
        topic,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
      },
      [d, t] = await Promise.all([
        fetch("/api/depth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        fetch("/api/timing/fusion", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      ]);
    if (!d.ok || !t.ok) {
      setError("Depth or timing analysis could not be calculated.");
      setLoading(false);
      return;
    }
    setDepth(await d.json());
    setFusion(await t.json());
    setLoading(false);
  };
  const rectify = async () => {
    if (!event1 || !event2) {
      setError(
        "Add two dated life events; the second is held out for validation.",
      );
      return;
    }
    setLoading(true);
    setError("");
    const response = await fetch("/api/rectification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        baseInput: form,
        earliestTime: earliest,
        latestTime: latest,
        stepMinutes: 5,
        events: [
          {
            id: "training-event",
            date: `${event1}T00:00:00.000Z`,
            topic,
            importance: 4,
          },
          {
            id: "holdout-event",
            date: `${event2}T00:00:00.000Z`,
            topic,
            importance: 4,
          },
        ],
        holdoutEventId: "holdout-event",
      }),
    });
    if (!response.ok) {
      setError(
        "Rectification requires a valid same-day time range and two events.",
      );
      setLoading(false);
      return;
    }
    setRectification(await response.json());
    setLoading(false);
  };
  return (
    <section className="consultation-tools" id="consultation-depth">
      <div>
        <p className="eyebrow">Consultation depth</p>
        <h2>Cross-confirm the promise and the timing.</h2>
        <p>
          Natal promise is a gate. Vimshottari, Yogini, Ashtottari, Chara,
          Narayana, Kalachakra, transits, Ashtakavarga and the relevant Varga
          remain independently visible.
        </p>
      </div>
      <div className="consultation-toolbox">
        <label>
          Life area
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as TimingTopic)}
          >
            {TOPICS.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button type="button" disabled={loading} onClick={analyze}>
          {loading ? "Calculating…" : "Analyze depth and next two years"}
        </button>
        {error && <p className="error">{error}</p>}
        {depth && fusion && (
          <div className="consultation-results">
            <article>
              <span>Natal and Varga promise</span>
              <h3>
                {fusion.promise.present
                  ? "Promise gate passed"
                  : "Promise gate not established"}{" "}
                · {fusion.promise.score}/100
              </h3>
              <p>
                {depth.vargaSynthesis.judgment} · {depth.vargaSynthesis.score}
                /100 across{" "}
                {depth.vargaSynthesis.rows.map((r) => r.varga).join(" + ")}
              </p>
              {[
                ...fusion.promise.supportingEvidence,
                ...fusion.promise.contradictions,
              ].map((item) => (
                <small key={item}>{item}</small>
              ))}
            </article>
            <article>
              <span>Cross-system windows</span>
              <h3>{fusion.windows.length} structural windows</h3>
              {fusion.windows.slice(0, 5).map((window) => (
                <p key={window.start}>
                  <strong>
                    {window.start.slice(0, 10)} – {window.end.slice(0, 10)} ·{" "}
                    {window.score}
                  </strong>
                  <small>
                    {" "}
                    confirms:{" "}
                    {window.crossSystem?.confirmations.join(", ") || "none"} ·
                    disagrees:{" "}
                    {window.crossSystem?.disagreements.join(", ") || "none"}
                  </small>
                </p>
              ))}
              <small>{fusion.notice}</small>
            </article>
            <article>
              <span>Strength lineage</span>
              {depth.strengthLineage.vimsopaka.sets.shodashavarga
                .slice()
                .sort((a, b) => b.score20 - a.score20)
                .map((row) => (
                  <p key={row.name}>
                    <strong>{row.name}</strong> {row.score20.toFixed(2)}/20
                  </p>
                ))}
            </article>
          </div>
        )}
        <details className="rectification-box">
          <summary>Rank an uncertain birth-time range</summary>
          <p>
            Use confirmed dates. The second event is held out and does not train
            the ranking.
          </p>
          <div>
            <label>
              Earliest time
              <input
                type="time"
                value={earliest}
                onChange={(e) => setEarliest(e.target.value)}
              />
            </label>
            <label>
              Latest time
              <input
                type="time"
                value={latest}
                onChange={(e) => setLatest(e.target.value)}
              />
            </label>
            <label>
              Training event
              <input
                type="date"
                value={event1}
                onChange={(e) => setEvent1(e.target.value)}
              />
            </label>
            <label>
              Held-out event
              <input
                type="date"
                value={event2}
                onChange={(e) => setEvent2(e.target.value)}
              />
            </label>
          </div>
          <button type="button" disabled={loading} onClick={rectify}>
            Rank hypotheses
          </button>
          {rectification && (
            <div>
              <h3>Best candidate ranges</h3>
              {rectification.rankedClusters.slice(0, 5).map((row) => (
                <p key={`${row.startTime}-${row.endTime}`}>
                  <strong>
                    {row.startTime}–{row.endTime}
                  </strong>{" "}
                  training {row.bestScore} · holdout {row.holdoutScore ?? "—"}
                </p>
              ))}
              <small>{rectification.notice}</small>
            </div>
          )}
        </details>
      </div>
    </section>
  );
}
