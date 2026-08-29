# Sahadeva: Complete System Structure

Last updated: 2026-08-28  
Workspace: `/Users/satyaphanindra/Documents/ChatGPT/sahadeva`  
Production: <https://sahadeva.everyai-com.workers.dev>  
MCP: <https://sahadeva.everyai-com.workers.dev/mcp>

## 1. Top-level structure

```text
sahadeva/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.worker.json
├── vite.config.ts
├── vitest.config.ts
├── wrangler.jsonc
├── README.md
├── PROJECT_STATUS_AND_ROADMAP.md
├── WHAT_TO_BUILD_NEXT.md
├── SYSTEM_STRUCTURE.md
├── RESEARCH_AND_ARCHITECTURE.md
├── SCRIPTURE_AND_PRACTICE_RESEARCH.md
├── RVA_FIRST_100_RESEARCH.md
├── migrations/
├── shared/
├── src/
├── worker/
└── transcript-harvester/
```

## 2. Runtime topology

```text
Browser or MCP client
        |
        v
Cloudflare Worker / Hono
   |          |           |
   |          |           +--> Cloudflare Workers AI
   |          +--------------> Cloudflare D1
   +-------------------------> Deterministic shared calculation engine
```

The same Worker serves:

- React static assets
- Chart APIs
- Interpretation API
- Privacy and validation APIs
- API-key and encrypted-vault APIs
- Private-share APIs
- MCP JSON-RPC endpoint

## 3. Frontend structure

### `src/main.tsx`

React application entry point.

### `src/App.tsx`

Main application UI and client orchestration:

- Birth-data form
- Location selection
- Device geolocation
- Historical timezone submission
- Chart calculation
- Uncertainty calculation
- Ingress calculation
- Dasha-calendar loading
- Workers AI interpretation
- ICS download
- Print/PDF action
- Private-vault key creation
- Browser-side AES-GCM encryption
- Encrypted chart saving
- Private-share creation
- Shared-chart decryption

### `src/SouthChart.tsx`

South Indian fixed-sign chart renderer used for D1 and selected Vargas.

### `src/styles.css`

Application design system and responsive styling:

- Layout
- Forms
- Charts
- Evidence panels
- Dasha calendar
- Vault UI
- Mobile behavior
- Dark mode
- A4 print/PDF rules

## 4. Shared calculation engine

All deterministic calculation code lives under `shared/` so it can be used by the Worker, UI types, MCP, and tests.

### `shared/schema.ts`

Central input validation and TypeScript contracts:

- Birth input
- IANA timezone
- Placement types
- Chart result
- Panchanga
- Vargas
- Dasha timelines
- Ashtakavarga
- Houses
- Planetary states
- Shadbala preview
- Yogas
- Guidance and confidence

### `shared/jyotish.ts`

Main orchestration engine:

- Julian Day conversion
- Historical timezone resolution
- Approximate tropical longitudes
- Lahiri approximation
- Sidereal conversion
- Lagna
- Placements
- Chart assembly
- Ingress timelines
- Birth-time uncertainty sampling

### `shared/jplApprox.ts`

JPL Solar System Dynamics approximate planetary element evaluator for 1800-2050.

### `shared/panchanga.ts`

- Sunrise and sunset root finding
- Tithi transitions
- Nakshatra transitions
- Yoga transitions
- Karana transitions

### `shared/advanced.ts`

- Shodashavarga functions
- Dignities
- Combustion
- Graha Drishti
- Vimshottari timeline
- Active-period lookup
- Boundary warnings

### `shared/ashtakavarga.ts`

- Bhinna rules
- Sarvashtakavarga
- Invariant totals
- Trikona Shodhana
- Ekadhipatya Shodhana
- Rasi Pinda
- Graha Pinda
- Yoga Pinda

### `shared/houses.ts`

- Whole-sign houses
- Equal 30-degree Bhavas
- Planet house comparison
- Arudha Padas
- Arudha Lagna
- Upapada Lagna
- Bhava Lagna
- Hora Lagna
- Ghati Lagna

### `shared/states.ts`

- Natural relationships
- Temporary relationships
- Compound relationships
- Balaadi Avastha
- Retrograde state
- Graha Yuddha candidates, latitude winner resolution, and transfers
- Complete research Shadbala components, totals, ratios, and convention evidence

### `shared/yogas.ts`

Evidence-only structural Yoga candidates.

### `shared/guidance.ts`

- Methodology boundary
- Reading focus
- Relevant house
- Karakas
- Recommended Varga
- Evidence path
- Confidence score

### `shared/dashaCalendar.ts`

- Human-readable Dasha calendar
- ISO timestamps
- Age at period boundaries
- Date-queryable Dasha state
- ICS generation
- Compact AI evidence packet

### `shared/telugu.ts`

- Telugu signs
- Telugu Nakshatras
- Telugu Graha names
- Telugu chart summary

### `shared/locations.ts`

Offline curated location catalogue with coordinates and IANA timezone metadata.

## 5. Worker structure

### `worker/index.ts`

Hono Worker containing:

- Security headers
- Request IDs
- Payload limits
- Rate limiting
- API-key hashing and authentication
- Usage metering
- Calculation endpoints
- Dasha endpoints
- ICS endpoint
- Interpretation endpoint
- Knowledge readiness
- Privacy and validation status
- Encrypted chart storage
- Private shares
- MCP protocol handling

### `worker/index.test.ts`

Worker-level protocol and endpoint tests.

## 6. HTTP API structure

### Public calculation APIs

- `POST /api/prashna`
- `POST /api/prashna/outcome`
- `POST /api/timing/fusion`
- `POST /api/rectification`
- `POST /api/depth`

- `GET /api/health`
- `GET /api/privacy`
- `GET /api/validation`
- `GET /api/knowledge/status`
- `POST /api/chart`
- `POST /api/uncertainty`
- `POST /api/ingresses`
- `POST /api/dasha/calendar`
- `POST /api/dasha.ics`
- `POST /api/interpret`

### API-key and usage APIs

- `POST /api/keys`
- `DELETE /api/keys/current`
- `GET /api/usage`

### Encrypted chart APIs

- `GET /api/charts`
- `POST /api/charts`
- `GET /api/charts/:id`
- `DELETE /api/charts/:id`

The chart-storage API expects ciphertext. It must not receive plain chart JSON.

### Private-share APIs

- `POST /api/shares`
- `GET /api/shared/:token`
- `DELETE /api/shares/:id`

## 7. MCP structure

Endpoint:

```text
POST /mcp
```

Supported protocol operations:

- `initialize`
- `server/discover`
- `notifications/initialized`
- `ping`
- `tools/list`
- `tools/call`

Tools:

- `calculate_south_indian_chart`
- `describe_methodology`
- `calculate_gochara`
- `calculate_ingress_timeline`
- `simulate_birth_time_uncertainty`
- `knowledge_status`
- `query_vimshottari_date`
- `get_compact_chart_evidence`
- `get_timing_context`
- `build_slow_transit_calendar`

Authentication behavior:

- Public deterministic access remains available.
- A Bearer Sahadeva API key may be supplied.
- Authenticated MCP requests require `mcp:calculate`.
- Authenticated calls are metered per key.
- Every tool publishes input and output JSON Schema.
- Integration examples are documented in `docs/MCP_INTEGRATIONS.md`.

## 8. D1 database structure

### Migration `0001_knowledge_and_audit.sql`

- `sources`
- `passages`
- `rules`
- `reviewers`
- `rule_reviews`
- `chart_facts`
- `interpretations`
- `audit_events`

### Migration `0002_validation_and_reviews.sql`

- `astronomy_reference_vectors`
- `validation_runs`
- `terminology`
- `contradictions`

### Migration `0003_telugu_terminology.sql`

- Telugu terminology seed data
- `publishable_rules` view

### Migration `0004_keys_storage_shares.sql`

- `api_keys`
- `saved_chart_blobs`
- `private_shares`
- `api_usage_daily`

### Migration `0009_rva_knowledge_catalog.sql`

- Metadata-only source rows for all 215 RVA Telugu videos
- `knowledge_source_assets` with playlist identity, artifact provenance, method namespace, sensitivity, and transcript-quality status
- No copyrighted transcript text and no fabricated passage, rule, or reviewer records

## 9. Knowledge publication flow

```text
Source
  -> Passage
  -> Translation review
  -> Candidate rule
  -> Practitioner reviews
  -> Contradiction resolution
  -> Publishable rule
  -> AI retrieval
```

Publication requires two distinct approvals and no rejection or requested changes.

Corpus availability is tracked separately from publication. `complete` means transcript artifacts exist, `usable` describes machine-scored legibility, and neither state means that a passage or rule is approved.

## 10. Chart-calculation flow

```text
Birth details
  -> Zod validation
  -> Historical timezone resolution
  -> Julian Day
  -> Tropical astronomy
  -> Ayanamsa
  -> Sidereal placements
  -> Lagna and houses
  -> Vargas
  -> Panchanga
  -> Vimshottari
  -> Ashtakavarga
  -> Planetary states
  -> Evidence and confidence
  -> Immutable chart JSON
```

Workers AI receives the completed chart after calculation. It does not calculate placements.

## 11. AI interpretation flow

```text
Calculated chart
  + selected methodology
  + reading focus
  + confidence metadata
  + approved knowledge rules when available
  -> guarded Workers AI prompt
  -> cultural/interpretive response
```

Prompt rules prohibit:

- Invented placements
- Silent methodology blending
- Medical certainty
- Death predictions as facts
- Fertility certainty
- Legal or financial certainty
- Guaranteed remedies
- Fear-based language

## 12. Encrypted-vault flow

```text
User consent
  -> Browser creates Sahadeva API key
  -> Server stores only API-key hash
  -> Browser creates random AES-256 key
  -> Browser encrypts chart JSON
  -> D1 stores ciphertext
```

Private sharing:

```text
Saved encrypted chart
  -> Server creates hashed expiring share token
  -> Browser creates share URL
  -> Token goes in URL path
  -> Decryption key goes in URL fragment
  -> Server returns ciphertext
  -> Recipient browser decrypts locally
```

URL fragments are not sent in HTTP requests.

## 13. Cloudflare configuration

### `wrangler.jsonc`

Contains:

- Worker name and entry point
- Compatibility date
- Node compatibility flag
- Static assets
- SPA fallback
- Worker-first API and MCP routes
- Workers AI binding
- Native rate-limit bindings
- D1 binding
- Observability
- Environment variables

### Current environment values

- `APP_ENV=production`
- `ENGINE_VERSION=cleanroom-0.14.0`

## 14. Testing structure

Current suite: 14 test files and 44 tests.

Test areas:

- Jyotish orchestration
- Panchanga
- Vargas and Dasha
- Ashtakavarga
- Houses
- Guidance
- Planetary states
- Yogas
- Locations
- Historical timezones
- Timelines and uncertainty
- Dasha calendar and ICS
- Truncated VSOP87D apparent planets and JPL mean elements for Cheshta evidence
- Worker/MCP behavior

Commands:

```bash
npm test
npm run check
npm run build
```

## 15. Deployment flow

```bash
npm test
npm run build
npx wrangler d1 migrations apply sahadeva --remote
npx wrangler deploy
```

After deployment verify:

```text
/api/health
/api/validation
/api/knowledge/status
/mcp tools/list
representative chart calculation
encrypted save/share/delete flow
```

## 16. Transcript-harvester structure

`transcript-harvester/` is a separate Vite/Worker utility with:

- Browser extension
- Playlist downloading scripts
- Cloudflare transcription script
- Export functions
- Tests
- Supplied transcript downloads

It is research tooling and is not part of the production Sahadeva Worker bundle.

## 17. Local documentation

- `PROJECT_STATUS_AND_ROADMAP.md`: full project status and long roadmap
- `WHAT_TO_BUILD_NEXT.md`: prioritized actionable backlog
- `SYSTEM_STRUCTURE.md`: this architecture and structure reference
- `RESEARCH_AND_ARCHITECTURE.md`: original research and architectural decisions
- `SCRIPTURE_AND_PRACTICE_RESEARCH.md`: textual and practice research
- `RVA_FIRST_100_RESEARCH.md`: supplied Telugu-video research ledger

## 18. Current boundaries

The following remain previews or incomplete:

- Lunar astronomy
- Lahiri certification
- Sripati Bhava
- Bhava Bala
- Complete Shadbala
- Village-scale worldwide location coverage
- Direct generated Telugu PDFs
- Saved-chart management UI
- Real practitioner-reviewed rules

The correct current product label is:

> Research preview with deterministic calculations, explicit conventions, and visible validation boundaries.
