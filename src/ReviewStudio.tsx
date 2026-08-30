import { useEffect, useMemo, useState } from "react";
import "./review.css";
import "./review-editor.css";

type QueueItem = {
  source_key: string;
  module: string;
  claim_summary: string;
  source_title?: string;
  locator?: string;
  rule_id?: string;
  rule_status: string;
  passage_status: string;
  approval_count: number;
  blocking_review_count: number;
  publishable: number;
  next_action: string;
};
type Coverage = {
  sections: number;
  classifications_approved: number;
  linked: number;
  regression_complete: number;
};
type RuleContext = {
  rule: {
    id: string;
    tradition: string;
    condition: unknown;
    interpretation: string;
    confidence: "textual" | "practitioner_consensus" | "contested";
    exceptions: unknown[];
    reviewStatus: string;
    revision: number;
    effect: string;
    weight: number;
    harmClass: string;
  };
  passage: {
    id: string;
    sourceId: string;
    sourceTitle: string;
    sourceRights: string;
    locator: string;
    originalText: string;
    transliteration: string | null;
    literalTranslation: string | null;
    interpretiveTranslation: string | null;
    reviewStatus: string;
    pageStart: number | null;
    pageEnd: number | null;
    parserProvenance: Record<string, unknown>;
    ocrQuality: "unknown" | "machine" | "corrected" | "verified";
    displayRights: "internal-only" | "short-excerpt" | "full-display";
  };
  examples: Array<{
    id: string;
    kind: string;
    expected_match: number;
    review_status: string;
    approvals: number;
    blockers: number;
  }>;
  contradictions: Array<{ id: string; resolution_status: string }>;
};
const sampleRule = (item: QueueItem) => ({
  passageId: "",
  confidence: "textual",
  rule: {
    id: item.rule_id || item.source_key.replace(/[^a-z0-9-]/gi, "-"),
    version: 1,
    sourceKey: item.source_key,
    tradition: "parashari",
    topic: item.module,
    effect: "qualify",
    weight: 0,
    condition: {
      type: "predicate",
      fact: { kind: "planet-house", planet: "Sun" },
      operator: "gte",
      value: 1,
    },
    exceptions: [],
    interpretation: item.claim_summary,
    harmClass: "general-cultural",
    reviewStatus: "draft",
  },
});
async function post(path: string, body: unknown) {
  const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    result = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(result.error || "Request failed"));
  return result;
}

export default function ReviewStudio() {
  const [items, setItems] = useState<QueueItem[]>([]),
    [coverage, setCoverage] = useState<Coverage | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [module, setModule] = useState(""),
    [selected, setSelected] = useState<QueueItem | null>(null),
    [context, setContext] = useState<RuleContext | null>(null),
    [ruleJson, setRuleJson] = useState(""),
    [passageJson, setPassageJson] = useState(""),
    [chartJson, setChartJson] = useState(
      '{"name":"Review example","date":"2000-01-28","time":"08:05","place":"Verified coordinates","latitude":16.6123,"longitude":81.9456,"timezone":"Asia/Kolkata"}',
    ),
    [exampleId, setExampleId] = useState(""),
    [exampleKind, setExampleKind] = useState<
      "worked-example" | "counterexample" | "boundary-example"
    >("worked-example"),
    [expectedMatch, setExpectedMatch] = useState(true);
  const load = () =>
    fetch(
      `/api/review/queue${module ? `?module=${encodeURIComponent(module)}` : ""}`,
    )
      .then(async (response) => {
        const body = (await response.json()) as {
          items?: QueueItem[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(body.error || "Review queue unavailable");
        setItems(body.items || []);
        setError("");
      })
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Review queue unavailable",
        ),
      );
  useEffect(() => {
    void load();
  }, [module]);
  useEffect(() => {
    void fetch("/api/review/book-coverage").then(async (response) => {
      const body = (await response.json()) as { summary?: Coverage };
      if (response.ok) setCoverage(body.summary || null);
    });
  }, []);
  useEffect(() => {
    if (selected) {
      setExampleId(
        `${selected.rule_id || selected.source_key.replace(/[^a-z0-9-]/gi, "-")}-worked-1`,
      );
      setContext(null);
      if (!selected.rule_id) {
        setRuleJson(JSON.stringify(sampleRule(selected), null, 2));
        setPassageJson("");
        return;
      }
      void fetch(`/api/review/rules/${selected.rule_id}/context`).then(
        async (response) => {
          const body = (await response.json()) as RuleContext & {
            error?: string;
          };
          if (!response.ok) {
            setNotice(body.error || "Rule context unavailable");
            return;
          }
          setContext(body);
          setRuleJson(
            JSON.stringify(
              {
                passageId: body.passage.id,
                confidence: body.rule.confidence,
                rule: {
                  id: body.rule.id,
                  version: body.rule.revision,
                  sourceKey: selected.source_key,
                  tradition: body.rule.tradition,
                  topic: selected.module,
                  effect: body.rule.effect,
                  weight: body.rule.weight,
                  condition: body.rule.condition,
                  exceptions: body.rule.exceptions,
                  interpretation: body.rule.interpretation,
                  harmClass: body.rule.harmClass,
                  reviewStatus: "draft",
                },
              },
              null,
              2,
            ),
          );
          setPassageJson(
            JSON.stringify(
              {
                id: body.passage.id,
                sourceId: body.passage.sourceId,
                locator: body.passage.locator,
                originalText: body.passage.originalText,
                transliteration: body.passage.transliteration,
                literalTranslation: body.passage.literalTranslation,
                interpretiveTranslation: body.passage.interpretiveTranslation,
                pageStart: body.passage.pageStart,
                pageEnd: body.passage.pageEnd,
                ocrQuality: body.passage.ocrQuality,
                displayRights: body.passage.displayRights,
                parserProvenance: body.passage.parserProvenance,
              },
              null,
              2,
            ),
          );
        },
      );
    }
  }, [selected]);
  const modules = useMemo(
      () => [...new Set(items.map((item) => item.module))].sort(),
      [items],
    ),
    act = async (label: string, fn: () => Promise<unknown>) => {
      setNotice(`${label}…`);
      try {
        await fn();
        setNotice(`${label} complete.`);
        await load();
        setSelected((current) => (current ? { ...current } : current));
      } catch (reason) {
        setNotice(reason instanceof Error ? reason.message : "Action failed");
      }
    };
  return (
    <main className="review-studio">
      <header>
        <div>
          <span>SAHADEVA</span>
          <h1>Knowledge review studio</h1>
          <p>
            Passage → executable rule → examples → two approvals → publication
          </p>
          {coverage && (
            <p>
              {coverage.sections} book sections ·{" "}
              {coverage.classifications_approved} classified · {coverage.linked}{" "}
              rule-linked · {coverage.regression_complete} regression-complete
            </p>
          )}
        </div>
        <a href="#pro">Return to workspace</a>
      </header>
      {error ? (
        <section className="review-access">
          <h2>Reviewer access</h2>
          <p>{error}</p>
          <p>
            Sign in with an account whose user ID is registered as an active
            reviewer.
          </p>
        </section>
      ) : (
        <div className="review-layout">
          <aside>
            <label>
              Module
              <select
                value={module}
                onChange={(event) => setModule(event.target.value)}
              >
                <option value="">All modules</option>
                {modules.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <button
              className="sync-rules"
              onClick={() =>
                void act("Runtime book-rule sync", () =>
                  post("/api/review/runtime-book-rules/sync", {}),
                )
              }
            >
              Sync runtime book rules
            </button>
            <strong>{items.length} review bindings</strong>
            <nav>
              {items.map((item) => (
                <button
                  key={item.source_key}
                  className={
                    selected?.source_key === item.source_key ? "on" : ""
                  }
                  onClick={() => setSelected(item)}
                >
                  <span>{item.module}</span>
                  <b>{item.claim_summary}</b>
                  <em>{item.next_action}</em>
                </button>
              ))}
            </nav>
          </aside>
          <section className="review-detail">
            {selected ? (
              <>
                <div className="review-title">
                  <div>
                    <span>{selected.source_key}</span>
                    <h2>{selected.claim_summary}</h2>
                  </div>
                  <i className={selected.publishable ? "ready" : "pending"}>
                    {selected.publishable
                      ? "publishable"
                      : selected.next_action}
                  </i>
                </div>
                <div className="review-grid">
                  <article>
                    <span>Source</span>
                    <strong>{selected.source_title || "Not linked"}</strong>
                    <p>
                      {selected.locator ||
                        "Link an exact source passage before review."}
                    </p>
                  </article>
                  <article>
                    <span>Passage / rule</span>
                    <strong>
                      {selected.passage_status} / {selected.rule_status}
                    </strong>
                    <p>
                      Approvals: {selected.approval_count || 0}/2 · blockers:{" "}
                      {selected.blocking_review_count || 0}
                    </p>
                  </article>
                </div>
                <div className="review-editor">
                  {selected.rule_id && passageJson && (
                    <div className="review-passage">
                      <h3>Restricted source passage</h3>
                      <p>
                        Internal reviewer view only. Replace staged placeholder
                        text with the exact passage, translations, page locator,
                        and parser provenance before requesting approval.
                      </p>
                      <textarea
                        value={passageJson}
                        onChange={(event) => setPassageJson(event.target.value)}
                        spellCheck={false}
                      />
                      <div className="review-actions">
                        <button
                          onClick={() =>
                            void act("Passage save", () => {
                              const draft = JSON.parse(passageJson);
                              if (
                                String(draft.originalText || "").startsWith(
                                  "Restricted source text must be imported",
                                )
                              )
                                throw new Error(
                                  "Replace the staged placeholder with the exact internal passage first.",
                                );
                              draft.parserProvenance = {
                                ...(draft.parserProvenance || {}),
                                requiresExactTextImport: false,
                                manualReviewerImport: true,
                              };
                              return post("/api/review/passages", draft);
                            })
                          }
                        >
                          Import exact passage
                        </button>
                        {(["translation", "practice", "rights"] as const).map(
                          (reviewKind) => (
                            <button
                              key={reviewKind}
                              onClick={() =>
                                void act(`${reviewKind} approval`, () =>
                                  post(
                                    `/api/review/passages/${context?.passage.id}/decisions`,
                                    {
                                      reviewKind,
                                      decision: "approve",
                                      notes: `Approved ${reviewKind} review in Knowledge Studio`,
                                    },
                                  ),
                                )
                              }
                            >
                              Approve {reviewKind}
                            </button>
                          ),
                        )}
                        <button
                          className="warn"
                          onClick={() =>
                            void act("Passage change request", () =>
                              post(
                                `/api/review/passages/${context?.passage.id}/decisions`,
                                {
                                  reviewKind: "practice",
                                  decision: "request_changes",
                                  notes:
                                    "Passage or interpretation requires correction",
                                },
                              ),
                            )
                          }
                        >
                          Request passage changes
                        </button>
                      </div>
                    </div>
                  )}
                  <h3>Executable rule draft</h3>
                  <p>
                    Save returns the rule to draft. Validation replays it
                    without publishing.
                  </p>
                  <textarea
                    value={ruleJson}
                    onChange={(event) => setRuleJson(event.target.value)}
                    spellCheck={false}
                  />
                  <label>
                    Replay chart JSON
                    <textarea
                      className="chart-json"
                      value={chartJson}
                      onChange={(event) => setChartJson(event.target.value)}
                      spellCheck={false}
                    />
                  </label>
                  <div className="review-actions">
                    <button
                      onClick={() =>
                        void act("Validation", () => {
                          const draft = JSON.parse(ruleJson);
                          return post("/api/review/rules/validate", {
                            rule: draft.rule,
                            chart: JSON.parse(chartJson),
                          });
                        })
                      }
                    >
                      Validate & replay
                    </button>
                    <button
                      onClick={() =>
                        void act("Draft save", () =>
                          post("/api/review/rules", JSON.parse(ruleJson)),
                        )
                      }
                    >
                      Save draft
                    </button>
                    {selected.rule_id && (
                      <>
                        <button
                          onClick={() =>
                            void act("Approval", () =>
                              post(
                                `/api/review/rules/${selected.rule_id}/decisions`,
                                {
                                  decision: "approve",
                                  notes: "Reviewed in Knowledge Studio",
                                },
                              ),
                            )
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="warn"
                          onClick={() =>
                            void act("Change request", () =>
                              post(
                                `/api/review/rules/${selected.rule_id}/decisions`,
                                {
                                  decision: "request_changes",
                                  notes: "Requires revision",
                                },
                              ),
                            )
                          }
                        >
                          Request changes
                        </button>
                      </>
                    )}
                  </div>
                  {selected.rule_id && (
                    <div className="review-example">
                      <h3>Regression fixture</h3>
                      {context && (
                        <p>
                          {context.examples.length} fixtures ·{" "}
                          {
                            context.examples.filter(
                              (item) => item.kind === "worked-example",
                            ).length
                          }{" "}
                          worked ·{" "}
                          {
                            context.examples.filter(
                              (item) => item.kind === "counterexample",
                            ).length
                          }{" "}
                          counterexamples · {context.contradictions.length}{" "}
                          contradiction records
                        </p>
                      )}
                      <label>
                        Fixture ID
                        <input
                          value={exampleId}
                          onChange={(event) => setExampleId(event.target.value)}
                        />
                      </label>
                      <label>
                        Kind
                        <select
                          value={exampleKind}
                          onChange={(event) =>
                            setExampleKind(
                              event.target.value as typeof exampleKind,
                            )
                          }
                        >
                          <option value="worked-example">Worked example</option>
                          <option value="counterexample">Counterexample</option>
                          <option value="boundary-example">
                            Boundary example
                          </option>
                        </select>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={expectedMatch}
                          onChange={(event) =>
                            setExpectedMatch(event.target.checked)
                          }
                        />{" "}
                        Expected to match
                      </label>
                      <div className="review-actions">
                        <button
                          onClick={() =>
                            void act("Fixture replay", () =>
                              post(
                                `/api/review/rules/${selected.rule_id}/examples`,
                                {
                                  id: exampleId,
                                  kind: exampleKind,
                                  chart: JSON.parse(chartJson),
                                  expectedMatch,
                                  expectedExceptionIds: [],
                                  sourceLocator: selected.locator || null,
                                },
                              ),
                            )
                          }
                        >
                          Save & replay fixture
                        </button>
                        <button
                          onClick={() =>
                            void act("Fixture approval", () =>
                              post(
                                `/api/review/rule-examples/${exampleId}/decisions`,
                                {
                                  decision: "approve",
                                  notes:
                                    "Regression result independently reviewed",
                                },
                              ),
                            )
                          }
                        >
                          Approve fixture
                        </button>
                        <button
                          className="warn"
                          onClick={() =>
                            void act("Fixture change request", () =>
                              post(
                                `/api/review/rule-examples/${exampleId}/decisions`,
                                {
                                  decision: "request_changes",
                                  notes: "Fixture requires correction",
                                },
                              ),
                            )
                          }
                        >
                          Request fixture changes
                        </button>
                      </div>
                    </div>
                  )}
                  {notice && <output>{notice}</output>}
                </div>
                <div className="review-next">
                  <h3>Publication checklist</h3>
                  <ol>
                    <li>Confirm rights and exact edition/page locator.</li>
                    <li>
                      Review literal meaning separately from practitioner
                      interpretation.
                    </li>
                    <li>Replay worked, counter, and boundary examples.</li>
                    <li>
                      Collect two independent approvals and resolve
                      contradictions.
                    </li>
                  </ol>
                </div>
              </>
            ) : (
              <p>
                Select a rule binding to inspect and author its publication
                path.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
