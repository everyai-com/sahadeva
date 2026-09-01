# Prediction quality and MCP gap audit

Last updated: 2026-08-31

## Outcome

Sahadeva already has broad deterministic calculation and a large MCP catalog. The limiting factor is not the number of astrology features. It is the absence of a completed chain from independently certified chart facts to reviewed atomic rules, adjudicated worked examples, and blinded outcome calibration.

The product may provide research-preview calculations and structurally labelled traditional interpretations. It must not describe event probabilities, reviewed doctrine, or Lal Kitab predictions as ready.

## Current quality gates

| Gate | Status | Main limitation |
|---|---|---|
| Astronomy and calendar | Research preview | Independent Lagna, solar-event and complete-strength certification is incomplete |
| Typed executable rules | Partial | Book-derived rules are drafts; broad source coverage is not rule coverage |
| Evidence ledger | Implemented structurally | Many source keys remain unresolved or unreviewed |
| Worked examples | Partial scaffolding | No certified multi-book reconstruction corpus |
| Practitioner review | Not started | No real two-reviewer approval cohort |
| Outcome calibration | Not started | Scores are rankings, not probabilities |
| Lal Kitab | Source only | Parsed book exists; no dedicated convention, rule or remedy engine |

`assess_prediction_readiness` exposes these gates to MCP clients. Clients should call it when deciding whether a requested tradition or claim type is supported.

## MCPs to build, in order

### P0 — `audit_chart_calculation`

Returns reference-vector coverage, boundary distance, birth-time sensitivity, timezone provenance, cross-convention changes, certification status and abstention reasons. An interpretation cannot be more dependable than the Lagna, Moon, houses, Vargas and transitions it consumes.

### P0 — `reconstruct_worked_example`

Recalculates a reviewed source example and compares expected and actual facts, fired rules, expected non-matches and discrepancies. Discrepancies must be classified as OCR, timezone, ayanamsa, node, house, rule or source ambiguity.

### P1 — `search_reviewed_rules` — implemented

Searches by topic, tradition, required facts, convention, language and harm class. It returns only rules whose passages, rights, approvals, contradictions and version state satisfy the publication gate. Draft discovery must remain reviewer-only.

### P1 — `compare_traditions` — implemented

Returns a separate evidence ledger for every explicitly selected tradition, followed by agreements and contradictions. It must never average rules or silently use one lineage to fill another lineage's gaps.

### P1 — `analyze_lal_kitab` (source inspector implemented; predictions blocked)

Required foundation:

1. Specify Lal Kitab fixed-house and annual-chart conventions independently of Parashari signs and Vargas.
2. Create stable page/section locators tied to the original scan.
3. Extract typed planet-in-house, conjunction, debt, age-period, residential and remedy claims.
4. Separate observations, interpretations, symptoms and remedies.
5. Encode exceptions, prerequisites, contrary indications, duration, burden, cost and contraindications.
6. Verify numerical combinations and rule-critical wording against scan images.
7. Reconstruct worked examples and obtain Lal Kitab practitioner review.

Until then, the book supports research, extraction and source-context explanation. Sensitive material is retained. Personalized use requires reviewed atomic rules and graduated cautions; diagnosis, certainty, coercion and harmful instructions remain prohibited.

### P1 — `record_consultation_outcome` — implemented

Generalizes the Prashna outcome mechanism to versioned natal and timing claims. Store consent, frozen chart/rule versions, claim IDs, resolution window, outcome, missingness and whether the user saw the prediction before reporting. Do not train directly on free-form narration.

### P2 — `get_validation_report` — implemented

Reports chart-vector error, rule-fixture precision/recall, worked-example reconstruction, reviewer agreement, contradiction count, coverage, abstention, blind holdouts and base-rate comparisons by version and tradition.

## Knowledge and ingestion gaps

- Parsed books are not verified passages. Preserve PDF page, Markdown line, parser version, OCR status and correction history.
- General corpus discovery and executable rule selection need different indexes and trust levels.
- Resolve the stale FTS create/drop pipeline before claiming production corpus search.
- Rights metadata must separately control internal search, embedding, quotation and display.
- Transcript completion measures artifact presence, not transcription or doctrinal quality.
- Rules need a method namespace, required facts, exceptions, examples, contraindications, supersession and review state.

## Required synthesis sequence

```text
verified input
  -> calculation audit
  -> immutable facts
  -> birth-time and convention sensitivity
  -> approved rule search
  -> deterministic rule execution and exceptions
  -> supporting and opposing evidence ledger
  -> abstention/publication gate
  -> constrained narration
  -> optional, consented outcome follow-up
```

Confidence must remain five-dimensional: input confidence, calculation certification, rule/source review, synthesis completeness and empirical calibration. None should be converted into a probability until a preregistered blind validation program supports it.

## Immediate build sequence

1. Keep `assess_prediction_readiness` in default MCP discovery. **Implemented.**
2. Implement `audit_chart_calculation` using existing uncertainty and convention modules. **Implemented as a declared-provenance and boundary audit; external ephemeris recomputation remains pending.**
3. Add one end-to-end worked-example reconstruction fixture per source book. **The deterministic reconstruction tool is implemented; independent source-book adjudication remains pending.**
4. Repair knowledge search and implement approved-rule search. **Publication-gated SQL search is implemented; scalable FTS remains pending.**
5. Recruit reviewers and complete one narrow topic before expanding breadth.
6. Start Lal Kitab with a manifest and 108 planet-in-house candidate rules, not remedies.
7. Add conjunctions and remedies only after the base set passes reconstruction and review.
