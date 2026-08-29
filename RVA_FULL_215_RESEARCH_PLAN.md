# RVA Telugu — full 215-video corpus review and research plan

## Corpus state

Checked on 2026-08-28 against `transcript-harvester/downloads/Learn Astrology in Telugu`.

- Playlist: *Learn Astrology in Telugu* (`PLvmzzcGHiU3TfI5LO2G1JTHPmT3sZqJZe`)
- Coverage: 215 of 215 public playlist positions marked `complete`
- Runtime represented: approximately 149.63 hours, measured from final segment timestamps
- Transcript sources after the 2026-08-28 caption retry: 105 YouTube automatic Telugu captions, 1 manual Telugu caption track, and 109 locally transcribed recordings
- Stored forms: 215 each of timestamped JSON, Markdown, SRT, and plain text, plus the manifest
- Total timestamped segments: 81,893
- Missing per-video artifacts: none
- Automated first-pass quality classification: 106 `usable`, 2 `repair`, and 107 `retranscribe`; these labels describe transcript legibility, not knowledge approval

This supersedes the corpus counts in `RVA_FIRST_100_RESEARCH.md`, while that document remains the research description for positions 1–100.

## Quality findings

The collection is complete as a discovery corpus, but it is not yet a reviewed knowledge base.

- YouTube automatic captions are generally usable for topic discovery and timestamp navigation, with ordinary recognition and code-switching errors.
- Several locally transcribed videos contain severe Telugu corruption, replacement characters, unrelated Unicode scripts, fragmented words, and English hallucinations. Segment count is not a quality score.
- Titles identify the subject but do not prove that the transcript supports a complete, coherent rule set.
- No transcript claim is approved for product interpretation until it passes correction, attribution, independent cross-checking, and practitioner review.
- Raw transcripts remain private research inputs and must not be redistributed or shipped with the product.

## Curriculum map for positions 101–215

| Positions | Topic family | Product/research destination | Priority |
|---|---|---|---|
| 101–113 | D4 through D60 divisional charts | Shodashavarga verification, chart UI, calculation fixtures | P0 |
| 114–127 | Western aspects, progressions, transits, compatibility, critique | Separate Western-method namespace; comparison research only | P2 |
| 128–139 | KP sub-lords, significators, ruling planets, aspects and applications | Separate KP engine/research track; never merge silently with Parashari | P2 |
| 140–158 | Worked chart readings, career, foreign travel/settlement and finance | Interpretation case studies and evidence records | P1 |
| 159–182 | Marriage timing, matching, love, second marriage, divorce and separation | Sensitive relationship interpretation; strong uncertainty and harm controls | P1 |
| 183–192 | Occupation-specific and government-career readings | Career ontology and teacher-specific rule candidates | P2 |
| 193–202 | Health and education topics | Restricted research; no diagnosis or deterministic outcome claims | P3/restricted |
| 203–204 | Muhurta and Caesarean-delivery muhurta | Muhurta research; medical scheduling topic remains restricted | P2/restricted |
| 205–207 | Birth-time rectification | Rectification workflow research and reproducible case testing | P0 after retranscription |
| 208–212 | Childbirth and fertility | Restricted research; no fertility prediction claims | P3/restricted |
| 213 | Baby naming | Nakshatra/pada syllable review and culturally framed naming aid | P1 |
| 214–215 | Retrograde-practice reflection and astrology philosophy | Methodology/provenance notes, not deterministic rules | P2 |

## Execution plan

### Phase 1 — inventory and quality scoring

1. Generate a machine-readable index for all 215 videos with position, episode, ID, URL, source type, runtime, segment count, topic family, and artifact paths.
2. Score transcript quality using Telugu-script ratio, replacement-character rate, non-Telugu-script contamination, repetition, segment overlap, and a short human sample from the beginning/middle/end.
3. Assign `usable`, `repair`, or `retranscribe` status. Do not infer semantic completeness from manifest status `complete`.
4. Preserve the existing files as immutable provenance; store corrected text as a separate version.

### Phase 2 — repair the highest-value material

1. Start with positions 101–113 because they can validate the existing divisional-chart engine.
2. Retranscribe positions 205–207 before extracting any birth-time rectification method; the current local ASR is visibly unreliable.
3. Correct position 213 for the naming feature and sample positions 140–182 for interpretation workflows.
4. Record correction author, model/tool, date, confidence, and links back to original timestamps.

### Phase 3 — structured extraction

For each usable lesson, create an extraction record containing source identity, bilingual timestamped summary, explicit rules, inputs and boundaries, examples, stated tradition, exceptions, ethical claims, and uncertainty. Classify every claim as:

- deterministic calculation candidate;
- interpretation candidate;
- teacher/practice opinion;
- worked example;
- ethical or safety statement; or
- restricted sensitive claim.

Keep Parashari, KP, Western, and RVA-specific claims in separate method namespaces.

### Phase 4 — validation and review

1. Cross-check calculation candidates against named traditional texts or independently specified astronomical/mathematical references.
2. Turn reproducible D4–D60 and naming mappings into boundary fixtures before considering code changes.
3. Recalculate worked examples where complete birth data is available; mark incomplete examples as non-reproducible.
4. Require two real Telugu-language practitioner approvals and no unresolved rejection before a rule becomes publishable.
5. Record contradictions rather than averaging or silently choosing between traditions.

### Phase 5 — product integration

1. Ship only approved rules through the existing knowledge-review gate.
2. Attach video ID, timestamp, method, reviewer decision, and confidence to every interpretation citation.
3. Add D4–D60 explanatory cards only after calculation cross-checks pass.
4. Treat rectification as an auditable hypothesis-ranking workflow, never as certainty.
5. Keep medical, mental-health, fertility, Caesarean timing, divorce, finance, and other high-impact predictions out of deterministic guidance. At most, expose carefully reviewed cultural/educational context with explicit limitations.

## Recommended implementation order

1. Corpus index and automated quality report.
2. D4–D60 transcript correction and calculation cross-check matrix.
3. Birth-time rectification retranscription and method specification.
4. Nakshatra/pada naming cross-check and naming-aid design.
5. General chart-reading, career, foreign-travel, and relationship evidence extraction.
6. Western and KP tracks as explicitly separate, optional methods.
7. Restricted-topic review only after safety policy and expert-review capacity exist.

## Definition of done

- Every one of the 215 videos has a quality status and topic classification.
- Every extracted claim has an exact timestamp and method attribution.
- Corrected transcripts are versioned separately from source artifacts.
- Calculation rules have independent references and automated fixtures.
- No unreviewed or restricted claim reaches AI prompts or user-facing reports.
- Publishable rules have two real approvals and an auditable contradiction history.
