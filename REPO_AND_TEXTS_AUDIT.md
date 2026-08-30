# Sahadeva — Repository and Three-Text Product Audit

Date: 2026-08-30

## Executive conclusion

Sahadeva already has an unusually broad deterministic Jyotish foundation. Its next important step is not “add RAG.” The product needs a **source-governed reasoning system** that turns reviewed passages into executable, testable, lineage-specific rules; a **chart synthesis engine** that reasons in the same order as a practitioner; and **user workflows** that make those judgments understandable, revisable, and safe.

The three books support three distinct product layers:

- **Sarvarth Chintamani** supplies house-by-house judgment, lord/occupant/aspect combinations, yoga cancellation, and Dasha results.
- **Jyotisha Fundamentals** supplies a practitioner reasoning sequence: Panchanga as a natal layer, functional lordship, relationships, Rasi/Graha Drishti, Avasthas, Karakas, Arudha, house triads, Badhaka, and worked-chart reasoning.
- **Vedic Remedies in Astrology** supplies a remedy ontology: diagnosis before remedy, Dasha/Ashtakavarga timing, deity selection, divisional-chart deities, mantra suitability, procedural constraints, and remedy burden. This cannot safely be represented as a flat “planet → mantra/gem” lookup.

The recommended product direction is therefore:

> deterministic calculation → reviewed rule graph → contradiction-aware synthesis → evidence ledger → optional narration

RAG is useful only for passage discovery and citation support inside that system.

## What the repository already contains

The current implementation is much broader than the older top-level documentation suggests:

- Natal chart, Vargas, Panchanga, Vimshottari, additional Dashas, transits, Ashtakavarga, Shadbala, Bhava Bala, Jaimini structures, KP preview, Varshaphal, Prashna, Muhurta, compatibility, Doshas, rectification, timing fusion, life-theme detection, reports, sharing, push, accounts, billing, MCP, and AI narration.
- A strong separation between calculated facts and narration.
- Good safety language around medical, legal, financial, fertility, death, relationship, and guaranteed-event claims.
- Review tables for passages, rules, reviewers, contradictions, bindings, and publishability.
- 159 tests at audit time: 158 passed; one MCP instruction-contract test failed.

This is a strong calculation and platform base, but many interpretation modules are intentionally structural, heuristic, unreviewed, or only partially implemented. The product currently exposes far more calculated data than reviewed interpretive intelligence.

## What the texts add that is not yet represented well

### 1. A real practitioner synthesis pipeline — P0

The existing `buildEverydayReading`, `assessNatalPromise`, `detectLifeThemes`, and report builders use compact heuristics. They do not yet implement a complete ordered judgment.

Add a versioned `JudgmentPlan` with stages:

1. verify input, timezone, birth-time uncertainty, and calculation convention;
2. judge Lagna, Lagna lord, Moon, Sun, and natal Panchanga;
3. establish functional lordships for the selected Lagna;
4. judge each relevant house through house, lord, occupants, aspects, Karakas, Arudha, and opposing evidence;
5. assess dignity, Sambandha, Avasthas, Shadbala, Ashtakavarga, combustion, retrogression, and war;
6. confirm or weaken the promise in the topic-specific Varga;
7. apply yogas, cancellations, Badhaka, and exceptions;
8. only then apply Dasha and transit timing;
9. produce supporting evidence, contrary evidence, unresolved conflicts, uncertainty, and prohibited conclusions.

Every conclusion should be an object, not prose:

```ts
type Judgment = {
  topic: string;
  status: "supported" | "mixed" | "unsupported" | "unknown";
  supportingFactIds: string[];
  opposingFactIds: string[];
  appliedRuleIds: string[];
  exceptionRuleIds: string[];
  sourceCitations: Citation[];
  convention: MethodConvention;
  confidence: ConfidenceExplanation;
};
```

### 2. Rule compiler and rule graph, not raw chunks — P0

The database schema has rules, but there is no complete authoring/compiler/runtime path from these books into executable conditions. Build:

- a passage segmentation format with stable page/chapter/verse or section locators;
- claim classification: definition, calculation, interpretation, exception, cancellation, timing, remedy, worked example, restricted claim;
- a typed rule DSL for house/lord/aspect/dignity/Varga/Dasha/Panchanga conditions;
- a compiler that validates referenced facts and produces an executable predicate;
- golden examples and counterexamples per rule;
- a rule dependency graph for “base rule,” “exception,” “cancellation,” “requires,” and “contradicts”;
- immutable versions and a diff view for reviewer approval.

Retrieval should never directly turn an arbitrary matched paragraph into a prediction. It should retrieve approved rules and their source passages; runtime execution should determine whether the rules actually match the chart.

### 3. Source-aware interpretation studio — P0

The repo has review tables and an MCP review queue, but no full reviewer product. Add a restricted web workspace for:

- PDF/Markdown passage on the left, structured rule editor on the right;
- page image and OCR text comparison;
- transliteration, literal translation, interpretive translation, and notes;
- lineage/method, jurisdiction, language, sensitivity, and rights metadata;
- example chart replay against the proposed rule;
- automatic counterexample generation around sign, house, aspect, and Varga boundaries;
- two-person approval, blocking objections, contradiction resolution, supersession, and audit history;
- a coverage dashboard showing which implemented modules still depend on unreviewed rules.

### 4. House judgment engine from Sarvarth Chintamani — P0/P1

The application identifies house lords and offers broad house-topic prose, but the text is organized around detailed house judgment. Build a `BhavaJudgment` engine that evaluates, for each house:

- house sign and house strength;
- lord placement, dignity, strength, combustion, retrogression, conjunctions, and aspects;
- occupants and their functional nature;
- natural and topic Karakas;
- relevant Arudha/Pada;
- supporting and damaging combinations;
- cancellations and restoration of results;
- Dasha periods capable of activating the result;
- source disagreement and birth-time sensitivity.

Ship it first for lower-risk topics: skills/communication, education, home, career, resources, mentors, and spiritual practice. Keep illness, lifespan, death, pregnancy, sexuality, criminality, and family-stigma verses research-only.

### 5. Full relationship and Sambandha layer — P1

`states.ts` calculates natural/temporary/compound relationships, but synthesis does not fully use the relationship theory present in *Jyotisha Fundamentals*. Add:

- dispositorship chains;
- mutual aspect, conjunction, exchange, same-dispositor, and sign relationship edges;
- Rasi Drishti and Graha Drishti as distinct evidence types;
- Argalas and their obstruction;
- yoga formation as a graph pattern rather than isolated booleans;
- strength propagation through dispositor and association chains;
- explicit relationship diagrams in Pro mode.

### 6. Complete Avastha and functional-status system — P1

The repo has Balaadi Avastha and dignity, but the book calls for a richer state model. Add reviewed implementations for:

- Diptadi Avasthas;
- Lajjitadi Avasthas;
- Marana Karaka Sthana;
- day/night strength and sign gender/sect-style conditions where supported by the chosen lineage;
- functional benefic/malefic and Yogakaraka determination by Lagna;
- Badhaka lord and Badhaka type, with strong safety restrictions;
- state interactions and cancellation rules.

Do not collapse these into one “good/bad planet” score.

### 7. Natal Panchanga interpretation — P1

The calculation engine has Tithi, Vara, Nakshatra, Yoga, and Karana, but the natal interpretation layer is thin. *Jyotisha Fundamentals* treats Panchanga as five areas of life and includes Tattva conflicts, Nandadi Tithi, Tithi Dosha, Bhadra/Vishti, Sankranti, and Ghataka logic.

Add a reviewed natal Panchanga card with:

- the five limbs and their lords/deities/tattvas;
- Paksha Bala and Tithi class;
- Tattva harmony/conflict;
- repeated/skipped limb and boundary warnings;
- Sankranti/Gandanta proximity;
- clearly separated natal, daily, and Muhurta interpretations;
- local-tradition preset and citation for each rule.

### 8. Remedy protocol engine — P1, gated

`shared/remedies.ts` currently contains three deliberately generic, unreviewed low-burden suggestions and returns nothing in publishable-only mode. The remedies book implies a much richer—but also much riskier—system.

Build remedies as an optional, belief-respecting protocol:

- diagnosis: exact structural condition, active period, severity, uncertainty, and contrary evidence;
- remedy family: conduct/service, prayer, charity, fasting, mantra, worship, pilgrimage, ritual, gem, or referral to a qualified practitioner;
- eligibility and contraindications;
- tradition/lineage and deity relationship;
- timing and duration;
- cost and burden ceiling;
- required initiation or practitioner supervision;
- evidence status and source locator;
- “no remedy needed” as a first-class outcome;
- user belief/preferences, accessibility, diet, health, budget, and consent;
- follow-up journal without claiming causal efficacy.

Default product output should remain limited to safe, optional, low-cost conduct/reflection. Mantra initiation, ritual procedure, gemstones, animal-related offerings, costly donations, and fear-based “curse” remedies must not be auto-prescribed.

### 9. Deity and spiritual-practice mapping — P2, gated

The remedies book describes Ishta Devata, Dharma Devata, Palana Karta, Guru Devata, Kula/Grama/Sthana Devata, divisional-chart deities, and mantra suitability. This could become a culturally valuable spiritual-practice explorer, but it needs explicit lineage review and should not be framed as objective diagnosis.

Requirements:

- selected lineage and calculation convention;
- explanation of every chart factor used;
- user’s existing family/community practice takes precedence;
- no replacement of a living Guru or community authority;
- no initiation-only mantra displayed as a casual recommendation;
- pronunciation/audio only from rights-cleared, reviewed sources;
- respectful opt-out for secular users and other faiths.

### 10. Worked-example regression suite — P0

All three books contain worked charts. Convert eligible, rights-safe examples into private validation fixtures:

- source chart data and uncertainty;
- independently recalculated placements;
- author’s stated chain of reasoning;
- expected matched rules and expected non-matches;
- calculation discrepancies caused by ayanamsa, historical timezone, node mode, or data ambiguity;
- adjudication status.

This is more valuable than measuring retrieval similarity. It tests whether the product reconstructs the reasoning chain.

### 11. Contradiction and convention explorer — P1

The schema can record contradictions, but users and reviewers need to see them. Add a comparison view for:

- author/lineage A versus B;
- house, node, ayanamsa, Dasha-year, Varga, and Karaka conventions;
- differing conditions and exceptions;
- whether the current chart changes under each convention;
- reviewer decision: preserve split, choose preset, or reject.

Never average conflicting rules into a hidden score.

### 12. Evidence ledger in every reading — P0

Each narrative sentence should be traceable to:

- immutable calculated fact IDs;
- rule ID and version;
- source and locator;
- selected tradition/convention;
- supporting and opposing observations;
- review status;
- confidence reason;
- safety transformation applied to the original claim.

Users need toggles for “plain reading,” “show reasoning,” and “show sources.” Pro mode should expose the full ledger.

### 13. Topic-specific consultation workflows — P1

Replace one generic focus selector with structured consultations:

- career/work: role, skills, current constraints, decision horizon;
- education: subject, stage, learning objective;
- home/property: rent/buy/move, location, timeline;
- relationships: self-reflection and communication, never a verdict;
- spiritual practice: existing tradition and desired level of depth;
- Muhurta: event type, location, participants, hard constraints, regional preset;
- Prashna: question clarity, consent, timestamp provenance, outcome follow-up.

Each workflow should call the relevant judgment plan and collect practical non-astrological context before narration.

### 14. Calibration and outcomes research — P1

The repo already has event confirmations and blind life-theme scaffolding. Expand it into a real research protocol:

- preregistered hypotheses and metrics;
- consented cohorts and deletion controls;
- frozen engine/rule versions;
- blind holdout sets;
- base-rate comparisons and abstention metrics;
- separate textual fidelity from predictive validity;
- no learning directly from self-confirming AI narration;
- public model cards and validation reports.

Heuristic scores should remain rankings, not probabilities, until calibration succeeds.

### 15. A real mobile app — P0 product gap

`ios-app/` is still the Expo starter (“Welcome to Expo” and tutorial content). Either remove it from product claims or build the actual client:

- authenticated profile and multiple-person vault;
- birth entry and location resolution;
- consultation/chat;
- chart overview and Pro evidence views;
- Panchanga and calendars;
- report/share flows;
- notification preferences;
- offline-safe cached calculated facts without leaking sensitive birth data.

## Knowledge architecture changes

### Current problem

Migration `0022_knowledge_fts.sql` creates `knowledge_fts`; migration `0023_drop_knowledge_fts.sql` immediately drops it, while `scripts/build-knowledge-chunks.mjs` still generates inserts for that dropped table. Therefore the three-book chunk pipeline is stale/non-deployable. The live Worker only retrieves approved citations by explicit `source_key`; it does not provide general corpus search.

### Recommended architecture

Use four separate stores with different trust levels:

1. **Source assets** — restricted original PDFs/page images and parsed Markdown.
2. **Passages** — locator-stable segments, OCR quality, rights, language, translations, and review state.
3. **Rules** — typed executable claims, exceptions, examples, contradictions, sensitivity, and approvals.
4. **Indexes** — lexical/vector indexes over rights-permitted fields for discovery only.

Retrieval flow:

```text
question + chart facts
  -> identify topic and required fact types
  -> retrieve approved rule candidates by structured filters
  -> execute predicates against the chart
  -> resolve exceptions and convention splits
  -> retrieve short citation context
  -> construct evidence ledger
  -> narrate within the ledger
```

Required metadata additions:

- source edition, publication year, page range, ISBN/library fingerprint;
- source type: root text, translation, commentary, modern teaching, worked example;
- exact page/section locator and parser provenance;
- OCR confidence and manual correction status;
- rights-permitted operations: internal search, quotation, user display, embedding;
- method namespace and lineage;
- topic, entities, required chart facts, rule sensitivity, and harm class;
- supersedes/superseded-by and version hash.

## Repository engineering improvements

### P0

1. Fix the failing MCP answer-contract test or restore the exact-question instruction contract.
2. Split `worker/index.ts` (~7,300 lines) into route/MCP/domain services and `src/ChatApp.tsx` (~3,300 lines) into feature modules.
3. Replace stale top-level feature lists with generated capability metadata; current docs understate the implemented MCP tools and engines.
4. Resolve the FTS create/drop/script mismatch before claiming the books are queryable.
5. Add CI jobs for type-check, unit tests, e2e, secret scan, build, budget, migration replay, and schema compatibility.
6. Add tests that every public interpretive claim either has publishable rule coverage or is labeled unreviewed/structural.

### P1

1. Expand tests for dense one-line domain modules; many advanced engines have only one small structural test file.
2. Introduce shared domain types instead of large inferred anonymous result shapes and `any` in timing fusion.
3. Version API/MCP schemas independently and add backward-compatibility fixtures.
4. Add migration integrity tests and verify fresh-database plus upgrade paths.
5. Add observability for abstentions, unresolved source keys, narration-without-citation attempts, rule execution failures, and safety transformations.
6. Generate coverage maps: UI → API → calculation → rule → source → reviewer.

### P2

1. Decide whether `src/App.tsx` and `src/ChatApp.tsx` are both supported products; remove duplicated flows or establish clear roles.
2. Treat the transcript harvester as a separate package/workspace with its own release and security boundary.
3. Remove or isolate generated/temp/report artifacts from the core repository where appropriate.

## Safety and rights findings from the books

The corpus contains many claims involving disease, death/longevity, fertility, sexuality, parentage, caste, curses, spirits, black magic, imprisonment, and deterministic relationship outcomes. These are not ordinary RAG content.

Implement a passage/rule harm taxonomy:

- `general-cultural` — eligible after normal review;
- `sensitive-reflective` — paraphrase only, uncertainty and practical framing required;
- `high-impact-restricted` — research/reviewer access only;
- `prohibited-output` — never used for user-specific inference.

The app’s current `PROHIBITED_INFERENCES` is a good start, but enforcement should happen when rules are selected, when evidence packets are built, and after narration—not only through prompt wording.

Because all three books are marked restricted reference material, do not ship the full Markdown, expose corpus-wide search excerpts, or include unrestricted `original_text` in MCP responses. The current citation endpoint can return up to 500 characters of `original_text`; that should be governed by per-source display rights and a shorter excerpt policy.

## Recommended delivery sequence

### Phase 0 — trust and cleanup (1–2 sprints)

- fix the failing MCP contract test;
- repair knowledge migrations/scripts;
- create exact source manifests and page locators for all three books;
- add harm and rights classifications;
- modularize Worker knowledge/MCP code enough to support the next phases.

### Phase 1 — rule operating system (2–4 sprints)

- rule DSL, compiler, graph, reviewer studio, and coverage dashboard;
- ingest a small reviewed set from each book;
- build worked-example regression harness;
- add evidence ledger and abstention behavior.

### Phase 2 — practitioner synthesis MVP (3–5 sprints)

- ordered judgment plan;
- functional lordship, Sambandha, dispositors, complete Avastha set;
- house judgment for career, education, home, resources, and spirituality;
- natal Panchanga synthesis;
- source/contradiction explorer.

### Phase 3 — user product (2–4 sprints)

- topic-specific consultation intake;
- plain/reasoning/source views;
- real mobile client or explicit mobile de-scope;
- notifications, follow-ups, and consented outcome research.

### Phase 4 — remedies and advanced traditions (only after expert review)

- safe remedy protocol and user preferences;
- deity/spiritual-practice explorer;
- advanced Badhaka, mantra, and ritual material behind appropriate gates;
- separately validated Jaimini/KP/other-lineage expansions.

## The first vertical slice to build

Build **Career Judgment with Evidence** end to end:

1. Review 20–40 career/10th-house passages across *Sarvarth Chintamani* and *Jyotisha Fundamentals*.
2. Encode house/lord/occupant/aspect/dignity/D10/strength/Dasha rules and their exceptions.
3. Add two worked examples and boundary counterexamples per rule family.
4. Execute them against a chart through the new judgment plan.
5. Show a plain summary, supporting evidence, contrary evidence, source view, uncertainty, and practical questions.
6. Measure reviewer agreement, rule coverage, abstention rate, and citation correctness.

This slice exercises the architecture without beginning with the most harmful domains. Once it works, the same system can expand to education, home/property, resources, spiritual practice, and later carefully constrained relationship material.

## Definition of success

Sahadeva should not be judged by how many books or chunks it can search. It should be judged by whether:

- each calculation is validated and convention-labeled;
- each interpretation is executable, reviewed, cited, and contradiction-aware;
- the complete reasoning chain can be inspected;
- the system abstains when evidence or review is insufficient;
- sensitive source material cannot leak into harmful personalized claims;
- worked examples reproduce under declared conventions;
- user feedback is collected without turning confirmation bias into training data;
- the same rule version produces the same evidence ledger across web, MCP, reports, and mobile.

## Implementation checkpoint — 2026-08-30

The engineering roadmap above is now represented in code: a shared topic registry and evidence ledger; typed rule DSL with exceptions and harm gates; reviewer-authoring APIs and studio; rights-aware manifests for all three restricted books; house, relationship, Panchanga, sensitivity, convention and safe-practice analysis; versioned opt-in follow-up snapshots; and a real Expo client. Fresh migration replay, root verification, and mobile export are CI gates.

This does **not** mean the books' interpretive claims are approved. Publication still requires exact passage locators, translation/practice review, worked/counter/boundary examples, two independent reviewers, and contradiction resolution. Until that human work exists, the application must continue to label structural reasoning as unreviewed and abstain from claiming a classical citation.
