# Sahadeva category-defining roadmap

Updated: 2026-08-29

This document incorporates the complete feature list requested for a category-defining Jyotish engine, MCP server, and consumer application. It deliberately separates what is live from work that still needs engineering, source review, independent numerical validation, privacy review, or commercial decisions.

## P0 — trustworthy core and usable one-call reading

### Implemented

- `get_full_reading_context` and `generate_full_life_report` one-call MCP workflows.
- Display-safe `signName`, documented zero-based sign indexing, and enriched placements with selected, whole-sign, equal, and Sripati houses; dignity, combustion, and retrograde flags.
- All 16 Parashari Vargas, Graha Drishti, Ashtakavarga, measured strengths, structural Yoga candidates, Vimshottari timing, slow-transit periods, Dasha/transit intersections, and plain-language synthesis.
- Location search, verified known-place calculation, IANA timezone handling, uncertainty simulation, MCP schemas, prompts, resources, compact evidence, and bounded report sections.
- API-key scopes, rate limits, private saved-chart storage controls, calculation metadata, safety framing, and web/PDF report presentation.

### Release gates still required

- Independent golden-chart validation for the Moon, Lagna, houses, Vargas, Shadbala, Ashtakavarga, dashas, and transit boundaries across historical timezones and high latitudes.
- Professionally reviewed Telugu and English interpretation rules with passage-level citations; catalogued transcripts must not be presented as approved knowledge.
- A published benchmark suite and versioned calculation-change policy.
- Calibrated confidence per narrated statement, derived only after rule/source confidence and birth-time stability are validated.
- Explicit planet-to-house aspect matrix in the public response, in addition to existing aspect evidence.
- MCP elicitation and completions after client support is stable enough to test interoperably.

## P1 — advanced Jyotish systems

These are planned systems, not claims about the current production engine:

- Higher-precision ephemeris work: JPL DE440/DE441 integration, topocentric corrections, Delta-T, atmospheric/refraction conventions, and documented error budgets.
- User-selectable ayanamsas and true/mean node modes, with each convention recorded in the calculation receipt.
- KP astrology: cusps, Placidus houses, star/sub/sub-sub lords, ruling planets, significators, and event-oriented period logic.
- Jaimini: Chara Karakas, Chara Dasha, Arudha Padas, Upapada, and Jaimini aspects.
- Varshaphal/Tajika: annual chart, Muntha, Sahams, Tajika aspects, and annual timing.
- Alternate Dasha systems: Yogini, Ashtottari, Kalachakra, and conditional applicability rules.
- Expanded Yoga and Dosha engine with cancellation and strength conditions: Raja, Dhana, Pancha Mahapurusha, Vipareeta, Neecha Bhanga, Kemadruma, Mangal, Kala Sarpa, Pitru, and tradition-specific variants.
- Compatibility: Ashtakoota/36-guna, Mangal Dosha, Dasha overlap, communication and values lenses, plus family profile comparison.
- Panchanga and electional additions: Rahu Kalam, Yamaganda, Gulika/Mandi, Abhijit, Choghadiya, Hora, Tarabala, Chandrabala, Muhurta scoring, Prashna, and electional search.
- Birth-time rectification assistance that ranks transparent hypotheses; it must never claim a fabricated exact birth time.

## P1 — normal-person product experience

- Multiple private profiles for self, family, and partner, with consent-aware comparison.
- Interactive life timeline combining Maha/Antar/Pratyantar periods, Sade Sati/Dhaiya, returns, and slow transits.
- North and South Indian chart styles, divisional chart explorer, Ashtakavarga grids, and accessible mobile layouts.
- Daily/weekly personalized Panchanga and opt-in transit/Muhurta alerts.
- Grounded conversational history, share links, print/PDF reports, and evidence expansion for every important claim.
- Sourced and disclaimered Upaya only after expert review; no medical, financial, legal, fertility, lifespan, or guaranteed-event advice.
- Export/delete controls, consent records, retention choices, and privacy-first defaults for sensitive birth data.

## P2 — developer platform and operations

- TypeScript and Python SDKs, OpenAPI parity, examples, notebooks, and generated client contracts.
- Deterministic caching keyed by normalized input plus engine/ruleset versions; batch endpoints and idempotency keys.
- Webhooks, scheduled reports, calendar feeds, billing/usage tiers, and an MCP marketplace submission.
- Evaluation harnesses for numerical correctness, rule retrieval, citation coverage, contradiction handling, hallucination resistance, and bias/fairness checks.
- DPDP/GDPR implementation and independent privacy/security review before broader commercial storage or sharing.
- Cross-engine comparisons recorded as test evidence, not used to silently choose whichever answer looks preferable.

## Interpretation contract

Every future feature must preserve the separation between deterministic calculation, sourced traditional interpretation, reviewer approval, uncertainty, and AI narration. Astrology is presented as a cultural interpretive system rather than scientifically established prediction. The product may describe tendencies and timing themes, but must not promise events or make high-stakes decisions for the user.

