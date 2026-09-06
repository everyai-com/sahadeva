# Prashna Engine Maturity Plan

## Objective

Advance Sahadeva's Prashna engine from a deterministic structural preview to a source-faithful, independently reviewed, thoroughly tested consultation system. “Mature” means the software calculates its declared conventions correctly, reproduces reviewed source examples, separates traditions, communicates uncertainty, and measures prospective outcomes without claiming scientific validity that the evidence does not support.

## Current baseline

### Working

- Question-time Lahiri sidereal D1 calculation.
- Twelve question categories and explicit derived houses.
- Separate classical, Tajaka, Systems' Approach, Prashna Nadi/KP and integrated namespaces.
- Independent Classical Dhatu–Moola–Jeeva calculations: Chappanna's odd/even Navamsa sequence and Daivajna Vallabha Chapter X's sign-plus-planetary-influence families, including mixed testimony.
- Daivajna Vallabha Chapter X verses 6–8 sign-length and complete planet color/shape tables, with local own/friendly/neutral/inimical Navamsa tiers sourced through *Prasna Marga*. A unique highest tier is selected; missing D9 data or a tie abstains without a Shadbala override.
- Daivajna Vallabha Chapter X verses 3–4 subject-house classification uses that same unique local-strength selector. All stated houses and unstated houses are tested, and the translation's house-6 “sister or enemy” ambiguity remains visible rather than being silently resolved.
- Systems' Approach MEP, complete twelve-ascendant functional nature/MMP tables, and graded close-affliction influence.
- Tajaka applying/separating motion and conservative Ithasala/Easarapha/Kamboola candidates.
- Algorithmic KP 1–249 partition and star/sub/sub-sub lords.
- Source IDs, rule IDs, versioned conventions, uncertainty, abstention and outcome capture.
- Type checks, unit tests, API tests and production build.

### Not yet mature

- OCR-derived rules do not yet have page-level verification.
- The corpus-specified KP New Ayanamsa correction is calculated but lacks independent certification; Placidus cusps reproduce six independent Swiss Ephemeris vectors within the declared sub-arcsecond fixture tolerance.
- KP timestamp and numbered-horary Placidus cusps, cuspal star/sub/sub-sub lords, Reader VI ruling planets, its separate node-representative hierarchy, and Taneja's node-house significations are calculated. The selected sub beginning anchors numbered cusp 1; the solver is checked against six Swiss Ephemeris vectors and Reader VI's number-203 table. Four direct cusp predicates, current activation and forward conjoined Dasa-Bhukti-Antara candidate search execute across the event registry, with Vimshottari recomputed from the 6′-corrected KP Moon. Eight event-specific Reader VI transit patterns are registered with scale and locator; bounded searches group windows and refine bracketed boundaries to one minute. The 1969 vehicle-disposal, 1969 friend-arrival and 1968 messenger civil-time refinements reproduce. The messenger's printed longitude is an internal source conflict. The 1974 vehicle, 1971 foreign-travel, 1969 medicine and 1969 trunk-call mismatches are preserved as named astronomy conflicts; the trunk-call's printed longitude itself reproduces all four rulers even though the stated civil minute does not. Wider worked-topic registration and independent astronomy certification remain incomplete.
- Tajaka planet-specific deeptamsas, circular directed aspect geometry, Ithasala/Easarapha, application/perfection-ordered Nakta and Yamaya, and four D1/D3/D9/D12-decidable Kamboola grades are implemented. Career stanza 109(a), stanza-112 Kamboola, and the aggregated stanza-113 object-realisation obstruction are executable. The separate 31 January 1969 stanza-113 job-interview chart reproduces and proves that rule's square is sign-based rather than deepthamsa-gated. The career-specific Kamboola requires an angular Moon and distinguishes the source's ordinary and own-sign-Moon result scales without double-scoring the generic yoga. Every Raman “Some Examples” case has a sign reconstruction plus at least one printed-geometry or structural fixture; central chains reproduce in II–IV and VI–XI, I is partial, V has a pending image-level motion discrepancy, and XII conflicts. Full verdict/timing chains, topic-specific interference conditions and Hadda/Panchadhikara-dependent grades remain incomplete.
- Classical rising-mode and a growing source-located topic pack are implemented: the complete safe rule set of Daivajna Vallabha Chapter III gains/losses verses 1–5; its Chapter VI return rules 1–3, 5–6 and journey-condition verse 10; Chapter VIII safe symbolic health verses 3, 4, 6 and 7; the Prasna Marga marriage and children rules; Daivajna Vallabha marriage verses 1, 3, 4 and 11–13; its lost-property verses 1–3 as non-scoring location testimony plus verses 8 and 10–17 (with only the explicit full-Moon clause active from verse 11); and travel Chapter IV verses 1–6 plus neutral verses 8–9 timing candidates and bounded verse-10 retrograde search. D1/D9 location conflicts remain visible. Correlated gain, return, health, marriage and recovery clauses are evidence-aggregated, while genuine opposing axes remain distinct or mixed. The verse-17 non-recovery alternatives are likewise one correlated observation. Deterministic mortality, imprisonment, morality and thief-profile clauses are catalogued as non-executable rather than silently omitted; incomplete or algorithmically undefined clauses remain explicitly withheld. The wider topic corpus, strongest-planet selection and timing validation remain incomplete.
- Systems' Approach weak-planet evaluation, close full-aspect projection to houses and planets, neutral main/sub/sub-sub period activation profiles, the readable sub-period/transit interaction, and bounded forward transit-contact search are implemented. The event-house MEP and natal/transit sub-period-lord positions remain separate; contiguous windows have one-minute bracketed ingress/egress refinement and visible interval-edge truncation. Each best sampled peak is retained for audit and its local time bracket is continuously minimized for degree difference to the same tolerance; neither value implies an outcome. Worked Chart 36's Ketu-to-Moon ninth-aspect topology is reproduced with controlled degree fixtures because the printed degrees are OCR-uncertain. Exact-degree worked-chart reproduction and the OCR-corrupt major-period favorable/adverse paragraph remain incomplete.
- Rule weights are expert-configured structural weights, not calibrated probabilities.
- A leakage-resistant evaluation contract now enforces frozen hashes, engine versions, blinding, deduplication, temporal order and separation of known-outcome conformance examples. A source-hash-frozen Prasna Tantra conformance ledger reports all 12 examples and 21 checks (17 pass, 4 fail) by source/chapter/category/rule; because every ascendant input is still sign-only, it honestly reports zero fully conformant cases. No populated locked retrospective accuracy benchmark or prospective cohort exists yet.
- A registry-contract audit now fails the dedicated Prashna verifier on duplicate/malformed families, incomplete metadata, unknown sources, unresolved observations, provenance drift, or duplicate rule-plus-fact evidence inside one consultation. A category-by-tradition installed-state matrix and mutation fixtures verify the audit itself; this is implementation integrity, not outcome accuracy.

## Non-negotiable architecture

1. Never blend traditions inside a rule. Each rule belongs to one namespace and named edition.
2. Integrated mode displays separate school verdicts before any synthesis.
3. Every active rule requires source, edition, page/verse, normalized statement, inputs, output, exceptions and review status.
4. Every calculable rule requires a worked example, counterexample and boundary fixture.
5. AI explains deterministic results but cannot create chart facts, alter scores or hide contradictions.
6. Unsupported calculations abstain explicitly.
7. Source text is untrusted reference data, never executable instruction.
8. Medical, legal, financial, death, crime and missing-person outputs receive stricter safety handling.

## Maturity ladder

| Level | Meaning | Release permission |
|---|---|---|
| L0 Catalogued | Source stored, checksummed and OCR assessed | Retrieval only |
| L1 Extracted | Rule structured with exact locator | Internal inspection |
| L2 Reproduced | Source example passes mechanically | Research preview |
| L3 Reviewed | Two reviewers approve interpretation and exceptions | User-visible with “traditional” label |
| L4 Calibrated | Locked dataset and prospective outcomes measured | Confidence language based on observed calibration |
| L5 Monitored | Drift, failures, overrides and outcomes continuously audited | Production |

No rule may skip a level.

## Workstream A — Source acquisition and learning

### A1. Complete the corpus

Acquire lawful complete editions in this order:

1. Complete Umang Taneja source.
2. Viswanath Nair, *Prashna Astrology and Remedies*, Volumes I–III.
3. B. V. Raman, *Prasna Marga*, Volumes I–II.
4. K. S. Krishnamurti, *Horary Astrology / Reader VI*.
5. *Bhuvana Deepika*.
6. *Tajika Nilakanthi*.
7. *Daivajna Vallabha*, *Prasna Jnana* and *Prasna Vaishnava*.
8. A reliable Shatpanchashika edition for comparison with Chappanna.

### A2. Build a source manifest

For every edition record:

- Work, author, translator/commentator and publisher.
- Edition/year, ISBN and language.
- File checksum, page count and rights classification.
- OCR engine/version and quality by page.
- Missing pages, illegible charts, tables and duplicate editions.
- Whether full text, short excerpts or only derived rules may be displayed.

### A3. Learn each book systematically

Process one chapter at a time into a study ledger:

- Vocabulary and definitions.
- Required chart inputs.
- Rule statements and exceptions.
- Priority or conflict-resolution instructions.
- Timing units and direction conventions.
- Worked cases and stated outcomes.
- Remedies, with safety classification.
- Disagreements with other chapters or books.

Completion gate: every substantive source section maps to at least one topic, rule candidate, example, definition or explicit “commentary only” classification.

## Workstream B — Rule DSL and provenance

Define a Prashna rule schema containing:

```text
rule_id
tradition
source_id + edition
page/verse/table/chart locator
normalized statement
required inputs
predicate
effect: support | oppose | qualify | abstain
weight policy
exceptions
conflicts
harm class
review status
example IDs
```

Add rule families for:

- Radicality and chart fitness.
- Querent/event/derived-house selection.
- Lord strength, dignity, combustion and retrogression.
- Occupants, aspects and Moon testimony.
- Promise/denial, quality and timing as separate outputs.
- Domain-specific rules.
- Remedies as a separate optional catalogue.

Gate: a rule cannot affect a public judgment unless its source locator and reviewer status are present.

## Workstream C — Astronomy and calculation certification

### C1. Shared chart foundation

- Validate longitude, ayanamsa, ascendant, timezone and house boundary fixtures.
- Test DST, timezone transitions, polar latitudes and sign/nakshatra boundaries.
- Record engine and ephemeris version in every consultation.

### C2. KP/Nadi

- Implement and independently verify KP New Ayanamsa.
- Maintain the six-vector Swiss Ephemeris regression gate for implemented Placidus/KP unequal cusps without substituting whole-sign or Sripati.
- Validate the 249 table against an authoritative printed table.
- Reproduce the implemented cuspal star/sub/sub-sub lords against printed reference examples.
- Formalize significator order, ruling planets and node representation.
- Implement category-specific house combinations.
- Implement DBA and transit delivery with boundary fixtures.

Gate: reproduce a reviewed set of Reader VI/Taneja examples exactly before enabling KP verdicts.

### C3. Tajaka

- Independently certify the transcribed planet-specific deeptamsa/orb rules.
- Independently certify the directed aspect geometry (including the source's asymmetric 3rd/11th strengths) and faster/slower planet rules.
- Reproduce Ithasala and Easarapha against additional printed examples.
- Complete Kamboola divisional/Panchadhikara grades only after obtaining the external *Varshaphal* Chapter III to which the installed text explicitly refers, and add any prohibiting/interfering conditions found in a selected source; do not invent a Manau rule absent from the current Prasna Tantra edition.
- Separate yoga presence from benefic/malefic outcome.

Gate: every enabled yoga passes positive, negative, separating, retrograde and boundary fixtures.

### C4. Classical

- Encode stanza-specific rules by domain.
- Finish Drekkana, remaining location and time-unit rules. Lost-property planet/sign direction and rising-Navamsa evidence are implemented; selecting one Yojana distance remains blocked by contradictory English wording, not by missing arithmetic.
- Preserve alternative readings from commentary as separate rule versions.
- Create a human-reviewed image representation of all 36 Drekkanas.

Gate: do not activate OCR-damaged numerical rules until visually checked against the scan.

### C5. Systems' Approach

- Maintain the twelve-ascendant printed-table regression gate for functional benefics/malefics.
- Maintain the versioned MEP, MMP precedence and exact-to-five-degree close-affliction fixtures.
- Implement house strength, planet strength and non-moolatrikona handling.
- Extend the implemented sub-period/transit interaction from a supplied transit chart into bounded forward calendar search.
- Add source-specific remedy selection only after independent safety review.

Gate: reproduce the book's worked charts without retrospective manual adjustment.

## Workstream D — Judgment architecture

Return a separate result for each selected tradition:

```text
chart fitness
question/derived house
promise: supportive | challenging | mixed | indeterminate
quality indicators
timing: calculated | unavailable
supporting testimonies
opposing testimonies
contradictions
source citations
review maturity
```

Integrated mode must show a comparison matrix. Synthesis is allowed only when:

- Every participating school has an independent result.
- A documented synthesis policy exists.
- Disagreement remains visible.
- The combined score is not presented as a probability.

Remove the arbitrary category-based follow-up horizon as “timing.” Use it only as an outcome-reminder date until actual timing modules are reviewed.

## Workstream E — Evaluation program

### E1. Software correctness

- Unit and property tests for every mathematical primitive.
- Golden fixtures for charts and source examples.
- Boundary tests around signs, nakshatras, subs, cusps, orbs and dates.
- Mutation tests to ensure tests fail when rule direction changes.
- API schema, privacy, security and deterministic-repeatability tests.

Target gates:

- 100% of activated rules have positive and negative fixtures.
- 100% of calculation conventions have boundary fixtures.
- Zero unexplained nondeterministic result changes.

### E2. Source conformance

Create a locked benchmark from worked examples without using their outcomes while implementing the rule:

- Exact input reproducibility.
- Expected rule activation.
- Expected non-activation and exceptions.
- Expected school verdict.
- Expected timing method and unit, where stated.

Report conformance by book, chapter, category and rule—not one flattering aggregate.

### E3. Retrospective evaluation

- Deduplicate cases and disclose selection bias.
- Separate examples authored to demonstrate a rule from independent historical cases.
- Freeze an untouched holdout set.
- Measure accuracy, balanced accuracy, Brier score when probabilities exist, abstention rate and timing error.
- Compare against simple baselines: majority outcome, category prior and random rule weights.

Retrospective results may guide debugging but cannot establish prospective reliability.

### E4. Prospective evaluation

Before revealing a result, store its immutable hash, engine version and timing window. Later collect:

- User-reported outcome and resolution date.
- Optional evidence status: unverified, document-supported or independently reviewed.
- Whether the question changed, the event became impossible, or follow-up was lost.
- Consent and retention controls.

Prevent leakage: never revise a recorded prediction after learning the outcome.

Minimum release report:

- Total eligible cases and follow-up rate.
- Outcome distribution.
- Accuracy and confidence intervals.
- Abstention and unresolved rates.
- Calibration by confidence bin.
- Timing error.
- Results by tradition and category.
- Known biases and failure cases.

### E5. Human review

Use at least two qualified reviewers per tradition. Track agreement on:

- Rule extraction.
- Chart calculation.
- Rule activation.
- Conflict resolution.
- Final verdict.

Measure inter-reviewer agreement and adjudicate disagreements without silently overwriting them.

## Workstream F — Safety and user experience

- Ask for one clear question and show the timestamp convention before casting.
- Do not infer sincerity, guilt, death, disease or criminal identity as fact.
- Missing-person outputs must encourage appropriate real-world authorities and never delay urgent action.
- Health, legal and financial outputs must remain non-professional traditional interpretation.
- Remedies must be optional, low-risk, source-linked and never promise cures or outcomes.
- Show “why,” opposing evidence, missing capabilities and source maturity.
- Allow users to choose one school or compare schools.
- Preserve correction and appeal paths for chart inputs and outcomes.

## Workstream G — Observability and change control

Record without storing unnecessary question text:

- Engine/rulebook/source versions.
- Calculation failures and abstention reason.
- Rules activated and latency.
- Confidence, category and tradition.
- Outcome status and resolution lag.
- Reviewer overrides and reason.

Every rule change requires:

1. Version bump.
2. Source or defect rationale.
3. Regression fixtures.
4. Benchmark comparison.
5. Reviewer approval.
6. Rollback path.

## Delivery sequence

### Milestone 1 — Certified foundation

- Finish source manifest and chapter ledger.
- Add page-level locators.
- Remove false timing horizon terminology.
- Certify shared chart boundaries.

Exit: current structural engine is transparent and reproducible.

### Milestone 2 — One mature vertical slice

Choose **career/job** and implement it completely in one tradition before widening scope. Recommended first slice: Tajaka, because its significator relationship is bounded and mechanically testable with the available Prasna Tantra examples.

Exit: reviewed rules, worked examples, counterexamples, timing convention and user-facing evidence all pass.

### Milestone 3 — Complete school engines

- Tajaka.
- Classical Chappanna.
- Systems' Approach.
- KP/Nadi after required source and cusp work.

Exit: each school independently returns a reviewed result or explicit abstention.

### Milestone 4 — Domain expansion

Add relationship, property, travel, education, litigation, children, health, lost object and missing person only after their rule packs pass the same gates.

### Milestone 5 — Prospective calibration

Run a consented research-preview cohort. Freeze predictions, collect outcomes and publish complete metrics including failures.

### Milestone 6 — Production readiness

- Security/privacy review.
- Accessibility and Telugu terminology review.
- Load, latency and failure-mode testing.
- Monitoring and rollback.
- Published model card and evaluation report.

## Definition of done

The engine is mature only when:

- All public rules are L3 reviewed or higher.
- Calculation fixtures cover all activated conventions and boundaries.
- Source-example conformance is reported without exclusions.
- Each tradition can operate independently.
- Integrated disagreement remains visible.
- Timing is produced only by a reviewed timing method.
- Prospective results and uncertainty are published honestly.
- Safety-critical categories abstain or redirect appropriately.
- Every output is reproducible from saved non-sensitive inputs, versions and rule IDs.

Until then, Sahadeva should call it a **traditional structural research preview**, not a validated predictive engine.
