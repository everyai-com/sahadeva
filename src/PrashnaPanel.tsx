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
      body: JSON.stringify({ ...props, question, category }),
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
            <option value="general">General</option>
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
              ? "Chart not fit—ask again later"
              : `${result.judgment.direction} · ${result.judgment.confidence} confidence`}
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
