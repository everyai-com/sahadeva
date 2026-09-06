import { useState } from "react";
import type {
  QuestionCategory,
  ConsultationResult,
} from "../shared/consultation";
type Props = {
  place: string;
  latitude: number;
  longitude: number;
  timezone: string;
  language: "en" | "te";
};
export function PrashnaPanel(props: Props) {
  const [question, setQuestion] = useState(""),
    [category, setCategory] = useState<QuestionCategory>("career"),
    [tradition, setTradition] = useState("integrated"),
    [seedNumber, setSeedNumber] = useState(1),
    [referenceHouse, setReferenceHouse] = useState(1),
    [result, setResult] = useState<ConsultationResult | null>(null),
    [status, setStatus] = useState<"idle" | "loading" | "error">("idle"),
    [outcome, setOutcome] = useState(""),
    [narration, setNarration] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setResult(null);
    setNarration("");
    const response = await fetch("/api/prashna", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...props,
        question,
        category,
        tradition,
        referenceHouse,
        ...(tradition === "prashna-nadi" ? { seedNumber } : {}),
      }),
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setResult(await response.json());
    setStatus("idle");
  };
  const explain = async () => {
    if (!result) return;
    setNarration("Explaining the immutable judgment…");
    const response = await fetch("/api/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        consultation: result,
        question,
        language: props.language === "te" ? "Telugu" : "English",
      }),
    });
    if (!response.ok) {
      setNarration(
        "Narration is unavailable. The deterministic judgment remains above.",
      );
      return;
    }
    const data = (await response.json()) as { response?: string };
    setNarration(data.response || "No narration returned.");
  };
  const confirm = async (value: string) => {
    if (!result) return;
    const response = await fetch("/api/prashna/outcome", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        confirmationToken: result.feedback.confirmationToken,
        outcome: value,
        resolvedAt: new Date().toISOString(),
      }),
    });
    setOutcome(
      response.ok
        ? "Outcome recorded for calibration."
        : "Outcome could not be recorded.",
    );
  };
  return (
    <section className="prashna-panel" id="prashna">
      <div>
        <p className="eyebrow">Prashna · Horary consultation</p>
        <h2>Ask from this moment.</h2>
        <p>
          The chart uses the server time when your question reaches Sahadeva.
          Its structural judgment is auditable and distinct from cited,
          practitioner-reviewed interpretation.
        </p>
      </div>
      <form onSubmit={submit}>
        <label>
          One clear question
          <textarea
            required
            minLength={3}
            maxLength={500}
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will this role move forward?"
          />
        </label>
        <label>
          Question area
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as QuestionCategory)}
          >
            <option value="career">Career or job</option>
            <option value="relationship">Relationship</option>
            <option value="money">Money or agreement</option>
            <option value="property">Property</option>
            <option value="travel">Travel</option>
            <option value="lost-object">Lost object</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="litigation">Litigation</option>
            <option value="children">Children</option>
            <option value="missing-person">Missing person</option>
            <option value="general">General</option>
          </select>
        </label>
        <label>
          Prashna tradition
          <select value={tradition} onChange={(e) => setTradition(e.target.value)}>
            <option value="integrated">Compare available traditions</option>
            <option value="classical">Classical · Chappanna</option>
            <option value="tajaka">Tajaka · Prasna Tantra</option>
            <option value="systems-approach">Systems' Approach</option>
            <option value="prashna-nadi">Prashna Nadi / KP</option>
          </select>
        </label>
        {tradition === "prashna-nadi" && (
          <label>
            Horary seed number (1–249)
            <input
              type="number"
              min={1}
              max={249}
              required
              value={seedNumber}
              onChange={(event) => setSeedNumber(Number(event.target.value))}
            />
          </label>
        )}
        <label>
          Question concerns
          <select value={referenceHouse} onChange={(event) => setReferenceHouse(Number(event.target.value))}>
            <option value={1}>Myself</option>
            <option value={3}>Younger sibling / neighbour</option>
            <option value={4}>Mother</option>
            <option value={5}>Child</option>
            <option value={7}>Spouse / other party</option>
            <option value={9}>Father</option>
            <option value={10}>Employer</option>
            <option value={11}>Elder sibling</option>
          </select>
        </label>
        <small>
          {props.place} · {props.timezone}
        </small>
        <button disabled={status === "loading"}>
          {status === "loading"
            ? "Casting the question chart…"
            : "Ask Sahadeva now"}
        </button>
        {status === "error" && (
          <p className="error">
            The Prashna consultation could not be calculated.
          </p>
        )}
      </form>
      {result && (
        <article className={`prashna-result ${result.judgment.direction}`}>
          <span>
            {result.chartFitness.status === "unfit"
              ? "Chart judgment unavailable under the selected source rule"
              : `${result.judgment.direction} · ${result.judgment.confidence} confidence${result.chartFitness.status === "sensitive" ? " · boundary-sensitive" : ""}`}
          </span>
          <h3>
            {result.judgment.score === null
              ? "No judgment forced"
              : `Structural score ${result.judgment.score}`}
          </h3>
          {result.judgment.rationale.slice(0, 6).map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
          <button type="button" onClick={explain}>
            Explain this judgment compassionately
          </button>
          {narration && <div className="reading-result">{narration}</div>}
          <details>
            <summary>Evidence and uncertainty</summary>
            {result.methodSelection.unavailableCapabilities?.map((item) => (
              <small key={item}>Not yet calculated: {item}</small>
            ))}
            {result.observations.map((item) => (
              <p key={item.id}>
                <strong>{item.label}</strong>
                <small>
                  {item.facts.join(" · ")} · {item.provenance.tier}
                </small>
              </p>
            ))}
            {result.uncertainty.map((item) => (
              <small key={item}>{item}</small>
            ))}
          </details>
          {result.remedies.length > 0 && (
            <div className="prashna-remedies">
              <strong>Optional low-risk practice</strong>
              {result.remedies.map((remedy) => (
                <div key={remedy.id}>
                  <h4>{remedy.label}</h4>
                  <p>{remedy.instructions}</p>
                  <small>
                    {remedy.timing} · {remedy.reviewStatus}
                  </small>
                </div>
              ))}
            </div>
          )}
          {result.feedback.suggestedFollowUpAt && (
            <div className="prashna-feedback">
              <strong>
                When the matter resolves, help calibrate this engine:
              </strong>
              <button type="button" onClick={() => confirm("confirmed")}>
                Confirmed
              </button>
              <button type="button" onClick={() => confirm("partly-confirmed")}>
                Partly
              </button>
              <button type="button" onClick={() => confirm("not-confirmed")}>
                Not confirmed
              </button>
              {outcome && <small>{outcome}</small>}
            </div>
          )}
          <small>{result.safety.notice}</small>
        </article>
      )}
    </section>
  );
}
