# Lal Kitab integration map

Source: B. M. Gosvami, *Lal Kitab*, English edition based on the 1952 text, 778 parsed pages.

This document records the complete-book integration inventory. The generated machine-readable companion is `knowledge/lal-kitab-manifest.json`.

## What the book adds

Lal Kitab is not another Parashari commentary. Its runtime must be a separate method namespace.

### Chart conversion

- Prepare the ordinary natal chart first.
- Retain planet positions but remove sign labels from interpretation.
- Number the Ascendant house as fixed house 1 and continue through house 12.
- Judge planets through numerical fixed houses rather than ordinary sign lordship.
- Keep natal, Moon-chart, rectified and annual-chart operations distinct.
- The source's annual framework allows planet independence that cannot be reproduced by merely advancing astronomical Rahu/Ketu or Mercury.

Implemented now: natal fixed-house conversion and source-section location. Annual charts and rectification are not implemented.

### Foundational rule families

- fixed houses and joint houses;
- fixed-house planetary ownership;
- natural friendship, enmity, confronting planets and intermediary planets;
- planet effect versus sign effect;
- exaltation, debilitation, alive, dormant, blind, half-blind, pious, companion, adult and non-adult states;
- prior/latter house directionality;
- normal, inverse, mutual-assistance, foundation, deception, joint-wall and sudden-strike aspects;
- scapegoat or transferred-effect relationships;
- effective ages of planets and houses;
- 35-year planetary circulation and general periods;
- artificial planets formed by conjunctions.

These need typed primitives before planet-in-house prose is executable.

### High-value interpretation corpus

- 108 planet-in-house monographs;
- lone-planet behavior;
- joint-house behavior;
- all major two-planet conjunctions;
- three-planet and four-or-more conjunction summaries;
- Rajayoga combinations;
- articles, relations and professions associated with planets and houses;
- residential-house structure, doors and environmental indications;
- service and travel indications;
- money, transactions, savings and donation conditions;
- marriage, children and family material;
- health, age and death material.

The last three groups are high-impact. They remain part of the learned and reviewed corpus rather than being discarded. Reviewed claims may be disclosed with an explicit caution, uncertainty, contrary evidence and practical support. They must not become medical diagnoses, certain death/lifespan forecasts, guaranteed fertility outcomes or deterministic relationship verdicts.

### Annual timing and rectification

The book contains:

- a nine-planet 35-year circulation;
- planet effective ages and house-duration logic;
- general life-period tables;
- event-based rectification;
- palmistry and residential-house rectification;
- Moon-chart logic;
- annual chart ordering and worked examples;
- timing tied to house number, remainder and planet periods.

These mechanisms must not be approximated with Vimshottari Dasha. They require a distinct Lal Kitab annual-chart specification and regression suite.

### Remedies

The text includes general planetary remedies, debt remedies, marriage-time remedies, residential remedies, donations, conduct restrictions, devotional practices, material placement, animal-related actions, intoxicant-related actions and other culturally specific procedures.

Required representation:

```text
structural diagnosis
  -> contrary evidence
  -> remedy eligibility
  -> remedy family
  -> burden/cost/accessibility
  -> contraindications
  -> source and scan verification
  -> lineage review
  -> optional user consent
```

Reviewed remedies can be disclosed with graduated safeguards. Low-risk practices may be offered as optional cultural support. Costly, burdensome, intoxicant-related or initiation-dependent practices require explicit warnings and consent. Animal-related practices remain available as historical source context, while animal harm is never recommended and should be replaced with a harmless symbolic or charitable alternative.

## Complete-book coverage

The generated manifest inventories:

- 1,698 Markdown headings;
- 23 major rule families covering the full file;
- 108 of 108 planet-in-house sections;
- 403 headings containing multi-planet candidates;
- all eleven original PDF chunk markers;
- a SHA-256 fingerprint of the parsed source;
- source-line and PDF-chunk locators;
- lexical risk signals per family;
- explicit automatic-output policy per family.

## Executable build sequence

### Phase 1 — structural primitives

1. Fixed-house chart conversion.
2. Planet/house ages and 35-year cycles.
3. Lal Kitab friendship/enmity and fixed-house status.
4. Prior/latter and special-aspect graph.
5. Dormant, blind, half-blind, pious and companion states.
6. Artificial-planet and joint-planet representation.

### Phase 2 — atomic source rules

For each of the 108 planet-house sections, extract separately:

- base observation;
- benefic conditions;
- malefic conditions;
- modifying placements;
- age ranges;
- exceptions and cancellations;
- related-person or material correspondences;
- remedy candidates.

Do not turn an entire section into one positive/negative score.

### Phase 3 — conjunctions

- Link conjunction headings to canonical planet sets.
- Encode house-dependent combinations separately.
- Preserve ordering such as prior/latter planet where stated.
- Represent artificial planets without overwriting the original planets.

### Phase 4 — annual and rectification workflows

- Formalize natal-to-annual transformation.
- Encode the 35-year cycle and example charts.
- Add event-based rectification with held-out validation.
- Keep palm/residential observations optional and separately consented.

### Phase 5 — review and publication

- Verify every numerical rule against the PDF scan.
- Reconstruct the source's worked examples.
- Add counterexamples and boundary fixtures.
- Obtain two independent Lal Kitab reviewer approvals.
- Resolve or preserve contradictions by edition/lineage.
- Publish only low-harm, approved claims.

## Current MCP behavior

`analyze_lal_kitab` now:

- calculates the natal chart through Sahadeva's deterministic engine;
- converts the nine planets to Lal Kitab fixed houses;
- returns the exact source locator for each relevant planet-house section;
- detects same-house planet groups for later conjunction linking;
- states the natal/annual convention limitation;
- withholds unreviewed personalized predictions, event ages and remedies;
- retains sensitive and remedy material for later caution-led controlled disclosure rather than deleting it;
- never blends its output into Parashari synthesis.

This is intentionally a source inspection tool, not yet a prediction tool.

## Remedy candidate engine

The complete parsed corpus now feeds a generated remedy catalog and chart matcher:

- `scripts/build-lal-kitab-remedy-catalog.mjs` scans every source family and every planet-house monograph;
- `knowledge/lal-kitab-remedies.json` stores source-located OCR candidates, condition context, remedy-family classification and risk flags;
- `shared/lalKitabRemedies.ts` matches the nine fixed-house placements without exposing unreviewed instruction text;
- `analyze_lal_kitab_remedies` returns chart-specific candidate provenance;
- `explore_lal_kitab_remedy_catalog` returns whole-book coverage and publication status.

The generated catalog currently contains 200 explicit remedy blocks: 81 inside planet-house monographs and 119 in general, debt, marriage, residential, health, timing and conjunction material. Sixty of the 108 planet-house sections contain an explicit remedy-labelled block; the remaining sections can still depend on referenced general remedies or conditional cross-planet rules and therefore must not be filled with invented defaults.

This completes the source-discovery and matching layer, not the publication gate. Candidate wording remains OCR-derived and unpublished until its full condition graph is modeled, checked against the scan, tested with counterexamples and approved by two independent reviewers.

## Deterministic inference kernel

`shared/lalKitabInference.ts` is the shared reasoning core used by both MCP and the web remedy experience. It calculates a fact graph directly from the chart and currently resolves:

- Lal Kitab fixed-house placement for all nine planets;
- fixed Planet Effect versus remediable Sign Effect;
- same-house friendship, enmity, dormancy and eclipse relationships;
- non-conjunction house relationships: mutual assistance, general condition, 6/8 confrontation, foundation, deception, friendly joint wall, inverse 8-to-2 influence and sudden-strike candidates;
- blind, half-blind and empty-side dormancy chart states;
- artificial-planet synthesis for the source-defined Sun/Venus, Mercury/Venus, Sun/Jupiter, Rahu/Ketu, Sun/Mercury, Sun/Saturn, Jupiter/Rahu, Venus/Jupiter, Mercury/Mars, Mars/Saturn, Venus/Saturn and Moon/Saturn combinations;
- speaking, silent and conditional expression states based on planet class and occupied house;
- current Mahadasha/Antardasha activation priority;
- whether no remedy is indicated, a fixed effect stops the remedy path, or a fixed-house-lord remedy principle is available;
- the book's remedy sequencing and fallback order;
- a source-linked explanation trace showing each inference step.

The kernel explicitly reports `retrievalRequired: false`. Corpus retrieval is used only after inference for provenance or review. The web `/api/remedies` response embeds this same reasoning object, `/api/lal-kitab/reason` exposes it directly, and MCP publishes it as `reason_lal_kitab`.

Still unresolved rather than guessed: quantitative confrontation fractions, full house-specific outcome prose for artificial planets, debt graphs, annual-chart state and the conditional prose inside all 108 monographs. These must be added as verified executable rule packs to the same kernel.
