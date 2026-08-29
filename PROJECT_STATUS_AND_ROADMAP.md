# Sahadeva: Project Status and Roadmap

Last updated: 2026-08-28  
Production application: <https://sahadeva.everyai-com.workers.dev>  
MCP endpoint: <https://sahadeva.everyai-com.workers.dev/mcp>  
Current calculation engine: `cleanroom-0.14.0`

The expanded engine, MCP, app, validation, privacy, and platform backlog is tracked in [CATEGORY_DEFINING_ROADMAP.md](./CATEGORY_DEFINING_ROADMAP.md). That document distinguishes deployed capability from planned systems so roadmap items are never mistaken for production claims.

## 1. Product vision

Sahadeva is a Telugu-first, South Indian Jyotish research application and MCP server. It is intended to provide deterministic chart calculations and carefully constrained AI narration through a Cloudflare-native stack.

The intended architecture separates:

1. Astronomy and chart calculation.
2. Traditional rules and their sources.
3. Human review and regional conventions.
4. AI narration.

The AI is not allowed to invent or modify calculated chart facts. Astrology is presented as a cultural and interpretive tradition, not as scientifically established, medical, legal, or financial fact.

## 2. Cloudflare architecture

The deployed system uses:

- Cloudflare Workers
- Hono
- React and Vite
- Cloudflare D1
- Cloudflare Workers AI
- Cloudflare native rate-limit bindings
- Cloudflare Workers observability
- Stateless HTTP MCP transport

Production bindings:

- `DB`: D1 database `sahadeva`
- `AI`: Cloudflare Workers AI
- `CALC_RATE_LIMITER`: 60 requests per 60 seconds
- `AI_RATE_LIMITER`: 10 requests per 60 seconds

The application and API are deployed together on one Worker.

## 3. Implemented calculation features

### 3.1 Birth chart and astronomy

- Sidereal planetary placements
- South Indian fixed-sign chart rendering
- Lagna calculation
- Retrograde estimation
- Rahu and Ketu
- Approximate Lahiri ayanamsa
- JPL Solar System Dynamics approximate planetary elements for 1800-2050
- ELP/MPP02 truncated lunar model with an initial six-epoch DE441 vector gate
- Historical IANA timezone resolution
- Daylight-saving correction for the entered historical date
- Explicit calculation-version and validation metadata

Accuracy status: **research preview**. Planetary smoke tests exist, but the Moon, ayanamsa, Lagna, and solar-event calculations are not yet professionally certified.

### 3.2 Shodashavarga charts

All 16 Parashari Shodashavarga charts are generated:

- D1 Rasi
- D2 Hora
- D3 Drekkana
- D4 Chaturthamsa
- D7 Saptamsa
- D9 Navamsa
- D10 Dasamsa
- D12 Dwadasamsa
- D16 Shodasamsa
- D20 Vimshamsa
- D24 Chaturvimshamsa
- D27 Saptavimshamsa
- D30 Trimsamsa
- D40 Khavedamsa
- D45 Akshavedamsa
- D60 Shashtiamsa

Boundary sensitivity is surfaced because the higher vargas can change with small birth-time differences.

### 3.3 Panchanga

- Vara
- Tithi and Paksha
- Nakshatra and Pada
- Yoga
- Karana
- Sunrise and sunset
- Next Tithi transition
- Next Nakshatra transition
- Next Yoga transition
- Next Karana transition

### 3.4 Vimshottari Dasha

- Correct birth Mahadasha balance
- Full 120-year Mahadasha timeline
- Nine Antardashas under every Mahadasha
- Nine Pratyantardashas under every Antardasha
- Active birth period
- Date-queryable active periods
- Exact start and end timestamps
- Age at period boundaries
- Current-period highlighting
- Downloadable `.ics` calendar containing 81 Antardasha events

### 3.5 Ashtakavarga

- Seven Bhinnashtakavarga calculations
- Classical invariant totals:
  - Sun: 48
  - Moon: 49
  - Mars: 39
  - Mercury: 54
  - Jupiter: 56
  - Venus: 52
  - Saturn: 39
- Sarvashtakavarga total: 337
- Trikona Shodhana
- Ekadhipatya Shodhana
- Rasi Pinda
- Graha Pinda
- Yoga Pinda
- Explicit occupancy and multiplier conventions

### 3.6 Houses and special Lagnas

- Whole-sign houses
- Equal 30-degree Bhava preview
- Sripati Bhava Madhyas and Sandhis with independently separated planet assignments
- Whole-sign, equal-house, and Sripati selector with explicit polar status
- Planet comparison between whole-sign and equal-Bhava positions
- Arudha Lagna
- All 12 Arudha Padas
- Upapada Lagna
- Bhava Lagna
- Hora Lagna
- Ghati Lagna

The equal-house view is explicitly labelled as not being Sripati.

### 3.7 Planetary states and complete research Shadbala

Implemented components:

- Naisargika Bala
- Uchcha Bala
- Dig Bala using declared equal-house midpoints
- Ojhayugma Rasiamsa Bala
- Kendradi Bala
- Drekkana Bala
- Nathonnata Bala using a local-mean-time preview convention
- Paksha Bala
- Tribhaga Bala
- Varsha, Masa, Dina, and Hora Bala
- Ayana Bala from true ecliptic latitude
- Cheshta Bala from versioned mean-element and sighrocca inputs
- Drik Bala with directed contribution evidence
- Graha Yuddha correction by northern ecliptic latitude
- Raw totals and classical required-strength ratios
- Balaadi Avastha
- Natural, temporary, and compound relationships
- Graha Yuddha candidate detection, winner resolution, and strength transfer

The system creates complete research totals while retaining every component and convention as evidence. Independent professional reference-chart certification remains outstanding, and totals are never translated into deterministic life outcomes.

### 3.8 Structural Yoga candidates

- Pancha Mahapurusha candidates
- Gajakesari candidate
- Budha-Aditya conjunction candidate

These are reported as structural matches with evidence. They are not presented as guaranteed outcomes.

### 3.9 Transits and uncertainty

- Sidereal Gochara calculation
- Transit houses from natal Lagna
- Exact sign-ingress timeline for 1-366 days
- Retrograde ingress identification
- Saturn, Jupiter, Rahu, and Ketu houses from natal Moon and Lagna
- Structural Sade Sati detection
- Rising, middle, and setting Sade Sati stages
- Structural Dhaiya detection
- Dasha-transit evidence intersection
- Nine-sample birth-time uncertainty simulation
- Lagna stability
- Moon Nakshatra and Pada stability
- Navamsa Lagna stability

The uncertainty simulator is not represented as birth-time rectification.

## 4. User interface

Implemented UI capabilities:

- English and Telugu modes
- Responsive South Indian charts
- Divisional-chart selector
- Panchanga display
- Confidence and evidence path
- Ashtakavarga display
- Complete research Shadbala display
- Bhava and Arudha details
- Special Lagnas
- Yoga candidates
- Vimshottari calendar
- Ingress timeline
- Birth-time uncertainty report
- Workers AI interpretation field
- Browser Print/PDF report layout
- ICS calendar download

### Location entry

- Searchable offline catalogue
- Telangana and Andhra Pradesh prioritization
- More than 30 major Indian cities
- Automatic coordinates for known locations
- Automatic `Asia/Kolkata` timezone
- Historical IANA timezone calculation
- Device geolocation
- Manual coordinates for unsupported places
- No third-party geocoder receives typed birth-place searches

## 5. MCP and AI compatibility

The MCP endpoint uses stateless HTTP and exposes:

- `calculate_south_indian_chart`
- `describe_methodology`
- `calculate_gochara`
- `calculate_ingress_timeline`
- `simulate_birth_time_uncertainty`
- `knowledge_status`
- `query_vimshottari_date`
- `get_compact_chart_evidence`
- `get_timing_context`

AI-oriented MCP responses include stable schema versions, calculation metadata, confidence, evidence, and safety boundaries.

`get_compact_chart_evidence` avoids forcing an AI client to parse the complete chart and its large timelines. `get_timing_context` combines Dasha and transit facts but does not infer an outcome without reviewed rules.

Public deterministic calculation remains possible. Authenticated MCP requests may use a scoped Sahadeva API key and are metered per key.

## 6. Privacy, storage, and sharing

Default behavior: birth data is processed transiently and is not saved.

Optional private-vault behavior:

- Explicit consent is required
- A scoped API key is created for the browser
- The raw API key is shown once
- D1 stores only its SHA-256 hash
- The browser generates a fresh encryption key per chart
- The chart is encrypted with AES-256-GCM before upload
- D1 receives only an encrypted blob
- Saved charts have retention expiration
- Charts can be deleted
- Dependent private shares are removed with the chart
- Share tokens are hashed, expiring, and revocable
- The decryption key is carried in the URL fragment and is not sent to the server
- Usage is recorded per key and operation

Losing the browser API key or chart decryption key makes the encrypted chart unrecoverable. Sahadeva currently has no password-recovery service.

## 7. Knowledge and review system

D1 contains schema for:

- Sources
- Passages
- Translations
- Candidate rules
- Exceptions
- Reviewers
- Rule reviews
- Contradictions
- Telugu terminology
- Astronomy reference vectors
- Validation runs
- Audit events

A rule is publishable only when:

1. It is marked approved.
2. At least two distinct reviewers approve it.
3. No reviewer has rejected it or requested changes.
4. Open contradictions have been resolved or explicitly split by tradition.

Current production knowledge readiness remains `not_reviewed` because no real practitioners and no publishable rules have been added. This must not be bypassed with invented reviewer records.

## 8. Transcript research completed

The supplied Telugu astrology corpus was inspected at:

`transcript-harvester/downloads/Learn Astrology in Telugu`

Known corpus state (rechecked 2026-08-28 after the additional transcripts were added):

- 215 public playlist videos in the manifest
- 215 of 215 positions marked complete, with JSON, Markdown, SRT, and TXT for every video
- Approximately 149.63 hours represented across 81,893 timestamped segments, measured from final segment timestamps
- Sources after retrying YouTube captions: 105 automatic Telugu caption tracks, one manual Telugu track, and 109 local transcriptions
- First-pass transcript quality: 106 usable, 2 needing repair, and 107 needing retranscription
- Caption errors, code switching, overlapping segments, and severe corruption in parts of the local-ASR subset exist
- Manifest `complete` means artifacts exist; it does not mean the text or its claims are reviewed

Research notes are recorded in:

- `RVA_FIRST_100_RESEARCH.md`
- `RVA_FULL_215_RESEARCH_PLAN.md`
- `knowledge/rva-telugu-catalog.json` (metadata and quality metrics only; no transcript text)
- `SCRIPTURE_AND_PRACTICE_RESEARCH.md`
- `RESEARCH_AND_ARCHITECTURE.md`

Transcript statements are evidence candidates, not automatically approved authority.

## 9. Validation completed

Current automated suite:

- 22 unit/integration test files with 88 passing tests
- 4 passing desktop/mobile Chromium end-to-end cases

Validated properties include:

- JPL Horizons planetary smoke vectors for 1900, 1950, 2000, 2020, and 2049
- Ashtakavarga invariant totals
- Reduction non-negativity
- Pinda identities
- Varga structural behavior
- Nested Dasha boundaries
- ICS calendar event generation
- Historical timezone and DST resolution
- House and Arudha structure
- Special-Lagna structure
- Partial Shadbala component ranges
- Ingress ordering
- Uncertainty interval sampling
- Compact AI evidence schema
- Encrypted save/share/delete production flow

The production validation endpoint is:

<https://sahadeva.everyai-com.workers.dev/api/validation>

## 10. Security and operations

Implemented controls:

- Cloudflare native calculation rate limiting
- Separate Workers AI rate limiting
- Payload-size limits
- Origin checks on MCP
- `Cache-Control: no-store`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- Content Security Policy and frame-ancestor denial
- Strict Permissions Policy
- Cross-origin opener isolation
- Request IDs
- Workers observability
- Privacy-preserving rate-limit security events
- API-key hashing
- Scoped permissions
- Key revocation
- Usage metering
- Encrypted chart storage
- Expiring and revocable shares

## 11. Important honesty boundaries

The following claims must not be made:

- That the system has read every Jyotish scripture.
- That the system has 30 years of human astrological experience.
- That all Telugu video teachings are understood or approved.
- That astrology is scientifically proven.
- That the current astronomy is professionally certified.
- That partial Shadbala is complete Shadbala.
- That a structural Yoga guarantees an outcome.
- That birth-time sensitivity simulation is rectification.
- That Workers AI is unlimited or permanently free.

## 12. Remaining work

### Priority 1: high-precision lunar engine

- Replace the analytic Moon preview
- Implement or embed a validated high-precision lunar coefficient model
- Compare against JPL DE441 across many epochs
- Validate longitude, latitude, speed, and station behavior
- Test every Nakshatra and Pada boundary
- Test Tithi, Yoga, Karana, and Vimshottari boundary effects
- Publish arc-second errors and accepted tolerances

### Priority 2: Lahiri ayanamsa certification

- Select an authoritative reference source
- Record exact convention and epoch
- Test historical and future dates
- Version the convention
- Prevent silent changes between engine releases

### Priority 3: Sripati Bhava and Bhava Bala

- Calculate the Midheaven
- Calculate Sripati cusps and Sandhis
- Add a validated Bhava Chalit view
- Assign planets to Sripati Bhavas
- Implement Bhava Bala
- Handle polar and near-polar locations
- Compare against published reference charts

### Priority 4: complete Shadbala

- Saptavargaja Bala (implemented; seven per-varga contributions exposed)
- Remaining Kala Bala components
- Tribhaga Bala (implemented from actual day/night event intervals)
- Varsha, Masa, Dina, and Hora Bala (implemented with versioned ingress/Hora convention)
- Ayana Bala (implemented from longitude, ecliptic latitude, and dated obliquity)
- Cheshta Bala
- Validated Graha Yuddha Bala
- Drik Bala (implemented; directed contribution evidence exposed)
- Classical totals and required-strength ratios
- Reference comparisons and convention metadata

No total should be released until all selected components use compatible conventions.

### Priority 5: location coverage

- Andhra Pradesh and Telangana district, Mandal, town, and representative village coverage (implemented; not an exhaustive village gazetteer)
- District and Mandal aliases (implemented for bundled records)
- Historical place names
- Worldwide cities (implemented for a bundled starter set)
- Ambiguous-place selection (implemented; duplicate normalized names require an explicit catalogue choice)
- Coordinate source and accuracy metadata (implemented)
- Offline or Cloudflare-hosted geographic dataset (implemented as an offline bundled dataset)

Do not silently introduce a third-party geocoder that receives private birth-place searches.

### Priority 6: reviewed Telugu knowledge

- Import transcript passages with video IDs and timestamps
- Correct caption errors
- Create literal and interpretive Telugu translations
- Extract candidate rules
- Link every rule to a passage
- Record teacher-specific and tradition-specific claims
- Track contradictions and edge cases
- Recruit at least two independent Telugu Jyotish practitioners
- Approve or reject rules through the review workflow
- Allow AI to use only publishable rules

### Priority 7: report generation

- Generate direct downloadable PDFs, not only browser Print/PDF (implemented client-side)
- Embed fonts that correctly support Telugu (Noto Sans Telugu embedded)
- Include selected South Indian charts (D1 and D9 included)
- Include Panchanga and Dasha tables (implemented)
- Include uncertainty and evidence labels (implemented)
- Include engine version and methodology (implemented)
- Verify every PDF by rendering pages to images (sample report passes three-page Poppler QA)
- Provide privacy-safe report variants without birth details (implemented)

### Priority 8: private-vault product completion

- Saved-chart list and reopen UI (implemented)
- Key backup and import flow (implemented)
- Share management and revocation UI (implemented)
- Usage dashboard UI (implemented)
- Key rotation (implemented; prior key atomically revoked)
- Multiple named API keys (implemented with vault grouping and scope selection)
- Optional password-wrapped encryption keys (implemented as PBKDF2/AES-GCM recovery bundles)
- Automated expired-record cleanup (implemented during authenticated vault activity)
- Data export (implemented; ciphertext remains encrypted)
- Account recovery design that does not weaken zero-knowledge storage (implemented as client-only password-wrapped export/restore)

### Priority 9: additional timing systems

- Exact Saturn period timelines rather than current-date structural status only (implemented with retrograde re-entry boundaries)
- Jupiter transit-period calendar (implemented)
- Node transit-period calendar (implemented for Rahu and Ketu)
- Dasha-transit intersection calendar (implemented at Antardasha resolution)
- Calendar export for selected transit events (implemented as ICS)
- Additional Dasha systems only after their formulas and regional conventions are reviewed

### Priority 10: accessibility and product quality

- Keyboard navigation and skip navigation (implemented and browser-tested)
- Screen-reader descriptions for South Indian charts (implemented)
- Telugu typography support (font coverage verified; independent language review remains external)
- Mobile overflow and long-table behavior (implemented and browser-tested)
- Print/PDF visual QA (implemented for the three-page sample report)
- Empty, loading, error, offline, rate-limit, and polar-location states (implemented)
- End-to-end Chromium tests for desktop and mobile (implemented)
- Performance and bundle-size budgets (implemented in CI)

## 13. Recommended execution order

1. High-precision Moon and lunar reference suite.
2. Lahiri certification.
3. Sripati Bhava and Bhava Bala.
4. Complete Shadbala.
5. Expand the Telugu-region location dataset.
6. Build direct Telugu/English PDFs.
7. Complete saved-chart, share-management, and usage interfaces.
8. Import and review Telugu knowledge.
9. Add more timing systems.
10. Conduct external practitioner and astronomical validation before calling the system professional-grade.

## 14. Definition of professional readiness

Sahadeva should be called professionally ready only when all of the following are true:

- High-precision planetary and lunar calculations pass published tolerances.
- Lahiri and house conventions are fixed and versioned.
- Boundary-sensitive charts pass reference testing.
- Complete Shadbala and Bhava Bala are validated.
- Telugu terminology is reviewed.
- Interpretive rules have traceable sources.
- At least two qualified practitioners approve every publishable rule.
- Contradictions are visible and tradition-specific.
- Privacy, deletion, key rotation, and recovery flows are tested.
- PDF and MCP outputs pass accessibility and end-to-end tests.
- The application never represents interpretive tradition as scientific certainty.

Until then, the correct product label is **research preview with deterministic calculations and explicit validation boundaries**.
