# Sahadeva research and architecture

## Product contract

Sahadeva is a transparent South Indian Jyotish workspace. It calculates a chart deterministically, shows the conventions used, retrieves versioned interpretive rules, and asks an AI model to explain only those facts. The AI is a narrator, not the ephemeris and not the authority.

Astrology is treated as a cultural and interpretive practice. The product must not present predictions as scientific, medical, legal, or financial fact.

The companion [scripture and practice research program](./SCRIPTURE_AND_PRACTICE_RESEARCH.md) defines the canon map, senior-practitioner reasoning workflow, edge-case catalog and approval standard. It prevents the system from replacing scholarship with model confidence.

## Clean-room policy

Open repositories were inspected to understand the capability landscape, terminology, failure modes, test categories, and product patterns. Their implementation code is not copied. Every production algorithm must be derived from a documented astronomical or classical textual specification and covered by independent reference vectors.

Permissive repositories may later be used only after a dependency review. AGPL, GPL, dual-licensed Swiss Ephemeris, and unlicensed repositories are excluded from the proprietary runtime unless an explicit licensing decision changes that boundary.

## The computation pipeline

```text
Civil birth record
  -> strict local date/time and IANA timezone resolution
  -> UTC instant and Julian day
  -> tropical apparent geocentric coordinates
  -> selected ayanamsa subtraction
  -> sidereal longitudes
  -> lagna and house model
  -> nakshatra, pada, tithi, yoga, karana
  -> varga transforms
  -> dasha timelines
  -> strengths, relationships, yogas and doshas
  -> immutable ChartFacts JSON
  -> evidence retrieval
  -> constrained AI narration
```

### Astronomy layer

The production engine needs these independently testable parts:

- Gregorian/Julian calendar conversion, Delta T, UT1, TT and Julian day.
- Precession, nutation, aberration and true obliquity.
- Geocentric apparent positions for Sun, Moon and planets.
- Lunar ascending and descending nodes, with mean/true mode recorded.
- Topocentric correction where required for rise/set and parallax.
- Local apparent sidereal time and ascendant.
- Sunrise, sunset, moonrise and transition root-finding.
- A coefficient evaluator for VSOP87 planets and ELP-style lunar theory, or a Cloudflare R2 hosted public-domain JPL kernel evaluator compiled to WebAssembly.

The current `cleanroom-0.14.0` engine uses a coefficient-truncated VSOP87D evaluator for apparent planets and ELP/MPP02 for the Moon. Five multi-epoch NASA/JPL Horizons planet fixtures remain below five arcseconds; the lunar vector and transition gates are documented separately. The product remains a research preview because calculation-strength reference charts and interpretive practitioner approval are independent requirements.

### Sidereal conversion

Jyotish uses nirayana longitude. A tropical longitude is normalized after subtracting the configured ayanamsa. Lahiri should be the default product preset, while Raman, KP and user-selected alternatives remain explicit. The ayanamsa identifier, value and model version must be persisted with every chart because a small difference can move boundary placements and divisional charts.

### Rashi and bhava

Each rashi spans 30 degrees. A South Indian chart fixes the signs in their spatial cells and marks the ascendant in the rising sign. This differs visually from the North Indian fixed-house layout. The initial product should use whole-sign houses. Sripati and KP bhava models can be added later as separately named views.

### Nakshatra and pada

The zodiac is divided into 27 equal nakshatras of 13 degrees 20 minutes. Each has four padas of 3 degrees 20 minutes. The Moon's birth nakshatra determines the starting Vimshottari lord and the fraction of its mahadasha remaining at birth.

### Panchanga

- Vara: weekday, with the traditional day boundary handled at sunrise for regional calendars.
- Tithi: each 12-degree increment of Moon minus Sun longitude.
- Nakshatra: each 13 degree 20 minute increment of lunar sidereal longitude.
- Yoga: each 13 degree 20 minute increment of normalized Sun plus Moon sidereal longitude.
- Karana: each 6-degree increment of Moon minus Sun longitude, with recurring and fixed names.

A production panchanga must compute start and end instants through numerical root-finding, not merely the value at a single instant. It also needs sunrise-based assignment, skipped/repeated tithis, local elevation, polar-region behavior and regional month rules.

### Vargas

Vargas are deterministic mappings from a planet's position within a sign to another twelve-sign chart. They are not generic multiplication alone for every division. D9 Navamsa is the first priority, followed by the Shodashavarga set. Every mapping requires parity/modality fixtures at exact boundaries.

### Vimshottari dasha

The nine-lord cycle is Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17, totaling 120 years. The birth Moon's nakshatra selects the first lord. The unused fraction of that nakshatra sets the balance at birth. Sub-periods recursively allocate a parent's duration in proportion to the same 120-year weights. The year-length convention must be explicit.

### South Indian compatibility

The matching engine must keep individual poruthams rather than reduce everything to one score. Initial rules should cover Dina, Gana, Mahendra, Sthree Dheergha, Yoni, Rashi, Rasyadhipati, Vashya, Rajju and Vedha. Regional variants, exceptions, Kuja dosha cancellation and dasha-sandhi checks must be named configuration profiles reviewed by practicing Tamil, Telugu, Kannada and Malayalam astrologers.

## Interpretation model

An interpretation is assembled from atomic claims:

```ts
type EvidenceClaim = {
  id: string;
  tradition: "parashari" | "jaimini" | "kp" | "tamil" | "kerala";
  appliesWhen: RuleExpression;
  observation: string;
  interpretation: string;
  sourceId: string;
  sourceLocation: string;
  reviewerIds: string[];
  confidence: "textual" | "practitioner-consensus" | "contested";
  contraindications: RuleExpression[];
};
```

The deterministic rule engine selects claims. Vector search can retrieve explanatory passages, but it must not decide whether a yoga exists. The model receives ChartFacts plus selected claim IDs and returns a structured response with observation, tradition, interpretation, uncertainty and citations.

## Cloudflare-only topology

```text
React + Vite static assets
  -> Cloudflare Worker + Hono API
      -> calculation modules in Worker/Wasm
      -> D1: users, charts, rule metadata, consent, audit
      -> R2: coefficient files, source documents, generated reports
      -> Vectorize: source passage embeddings
      -> Workers AI: embeddings, translation and constrained narration
      -> AI Gateway: model policy, observability, caching and limits
      -> Durable Object: one live conversation coordinator per reading
      -> Queues: ingestion, report generation and evaluation jobs
      -> Workflows: source review and publication approval
```

No container is required for the calculation path. Coefficient tables that exceed Worker bundle limits belong in R2 and should be range-read and cached. Frequently used epochs can be placed in Cache API. CPU-heavy coefficient evaluation should be compiled from original Rust/Clean-room code to WebAssembly.

### Connectable intelligence

`/mcp` exposes stateless HTTP tools for chart calculation and methodology inspection. Deterministic tools remain usable when Workers AI is unavailable or its free allocation is exhausted. The web chat uses the same immutable ChartFacts contract. Authentication and per-user rate limits are required before public deployment.

Workers AI currently provides a daily free allocation, not unlimited free hosting. The UI and API must fail transparently when that allowance is exhausted and continue serving deterministic calculations.

## Data model

- `people`: encrypted identifying fields and consent state.
- `birth_records`: original civil record, timezone resolution and uncertainty.
- `charts`: canonical input hash, engine version and configuration.
- `chart_facts`: immutable versioned computed JSON.
- `sources`: bibliographic and rights metadata.
- `passages`: reviewed source excerpts and translations.
- `rules`: deterministic condition AST and provenance.
- `interpretations`: model, prompt version, evidence IDs and output.
- `corrections`: practitioner feedback without silently mutating published rules.
- `audit_events`: actor, action, object and timestamp.

Birth data is sensitive personal data. Logs should redact it, analytics should use anonymous events, and deletion/export controls should be built before accounts are enabled.

## Validation gates

1. Calendar and timescale tests across Gregorian reform, leap years and timezone transitions.
2. Planetary longitude vectors against public astronomical references at historical and modern epochs.
3. Ascendant vectors across latitudes, DST boundaries and near-polar locations.
4. Exact boundary tests for every sign, nakshatra, pada, tithi and varga.
5. Panchanga transition tests for Chennai, Hyderabad, Bengaluru, Kochi and diaspora locations.
6. Cross-engine comparison is diagnostic only. Published reference vectors remain authoritative.
7. Golden South Indian charts reviewed visually and numerically.
8. Fuzz tests for normalization, node opposition and dasha duration invariants.
9. AI evaluations that insert adversarial questions and verify no computed fact is changed.
10. Practitioner review for every regional ruleset before it is labeled production-ready.

## Expanded repository findings

The broader scan added useful patterns beyond the first thirty projects:

- `hseshadr/almamesh`: local-first pure-function chart model, reproducible exports and privacy boundary.
- `ranganc007/mayaastrolib`: granular tests around nakshatras and divisional-chart boundaries.
- `prisriorg/jyotish`: TypeScript package boundaries for kundli, panchanga, matching and festivals.
- `adarshsrii/astrology`: focused Shodashavarga API design.
- `VicharaVandana/jyotichart_package`: fixed-sign South Indian rendering contract.
- `HariEshwar-J-A/node-jhora`: useful capability inventory for South Indian Dasha Kuta, but no reusable license was detected.

These findings reinforce four design decisions: pure deterministic functions, explicit configuration, immutable facts, and an interpretation layer that cannot modify calculations.

## Delivery sequence

### Foundation

- Finish astronomical specification and coefficient provenance.
- Implement high-precision Sun, Moon, planets and nodes in Wasm.
- Add historical timezone resolution and location search.
- Publish a reference-vector test suite before predictions.

### Jyotish core

- Production panchanga transition solver.
- D1, D9 and remaining Shodashavarga mappings.
- Recursive Vimshottari periods and transit engine.
- Strength, aspect, dignity and lordship primitives.

### South Indian practice

- Regional panchanga presets and terminology packs.
- Ten-porutham matching with variant profiles.
- Tamil, Telugu, Kannada and Malayalam review workflows.
- Source-backed yoga/dosha and exception rules.

### AI Pundit

- Evidence ingestion into R2, D1 and Vectorize.
- Rule selection service and citation contract.
- Workers AI narration with multilingual evaluation.
- Practitioner corrections through approval-based Workflows.

### Product hardening

- Account, encryption, retention and deletion controls.
- Durable Object chat sessions and streamed responses.
- Queued report generation, observability and abuse controls.
- Accuracy dashboard and public methodology page.
