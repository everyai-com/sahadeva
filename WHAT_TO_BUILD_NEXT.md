# Sahadeva: What to Build Next

Last updated: 2026-08-28  
Current engine: `cleanroom-0.15.0`  
Production: <https://sahadeva.everyai-com.workers.dev>

## Current product status

Sahadeva is a working research preview with deterministic South Indian Jyotish calculations, Telugu/English UI, Cloudflare Workers AI narration, and an MCP server.

It is not yet professionally certified. The most important remaining work is calculation accuracy and reviewed Telugu knowledge, not adding stronger predictive language.

## Completed foundation: high-precision Moon

The active ELP/MPP02 truncated model now has UT-to-dynamical-time conversion, six DE441 epochs spanning 1800-2050, all 108 Pada boundaries, all Tithi/Yoga/Karana transition classes, regression selection of the legacy model, and Vimshottari-balance tests. The DE441 boundary set measures maximum/mean/p95 angular errors of 0.050/0.036/0.048 arcseconds. Panchanga reference interpolation residual is below 0.5 arcsecond; the current combined Moon/Sun/Ayanamsa transition model is gated at 0.08 degree until the next two astronomy certifications finish.

This is the immediate priority because the Moon affects:

- Nakshatra
- Pada
- Tithi
- Yoga
- Karana
- Vimshottari starting balance
- Transit timing
- Panchanga transitions

### Required work

1. Select a high-precision lunar model suitable for Cloudflare Workers.
2. Keep the implementation isolated behind the existing astronomy boundary.
3. Calculate lunar longitude, latitude, distance, and speed.
4. Add multi-epoch JPL DE441 reference vectors.
5. Include dates near every Nakshatra and Pada boundary.
6. Include dates near Tithi, Yoga, and Karana transitions.
7. Compare the current preview and new implementation.
8. Publish maximum, mean, and percentile angular errors.
9. Reject deployment if configured tolerances fail.
10. Update engine metadata only after validation passes.

### Acceptance criteria

- Reference fixtures cover 1800-2050.
- Boundary tests cover all 27 Nakshatras and 108 Padas.
- Vimshottari birth balance changes are tested.
- Transition times have documented tolerances.
- The old lunar implementation can be selected temporarily for regression comparison.
- Production reports state the actual active lunar model.

## Completed foundation: Lahiri ayanamsa certification

The active convention is now `lahiri-iae-1985-mean@1.0.0`, compatible with the engine's mean geometric longitudes. It derives from the corrected IAE true anchor of 23°15′00.658″ at 1956-03-21 00:00 TT, uses Lieske IAU 1976 precession and removes IAU 1980 nutation explicitly. A separate versioned true convention remains available. Reference tests cover 1800, 1900, 1950, the 1956 anchor, 2000, 2025 and 2050 within one arcsecond.

### Required work

1. Select an authoritative Lahiri/Chitrapaksha reference.
2. Record its exact definition and epoch.
3. Add historical and future reference values.
4. Compare differences in arc-seconds.
5. Version the convention.
6. Store the selected convention in every chart result.
7. Prevent silent convention changes.
8. Add migration notes when the convention changes.

### Acceptance criteria

- Every chart includes ayanamsa ID, version, value, and source.
- Tests cover at least 1800, 1900, 1950, 2000, 2025, and 2050.
- Boundary-sensitive Vargas are retested after any change.

## Completed foundation: Sripati Bhava

The engine now calculates a sidereal Midheaven, all 12 Sripati Bhava Madhyas and Sandhis, separate whole-sign/equal/Sripati planet assignments, a user-selectable house-system preference, MCP evidence mappings, independent Porphyry/Sripati reference values, and explicit unsupported polar status. Bhava Bala is available only for explicitly selected equal or Sripati Madhyas and retains its component evidence.

### Required work

1. Calculate the Midheaven.
2. Calculate Sripati Bhava Madhyas.
3. Calculate Bhava Sandhis.
4. Assign planets to Sripati Bhavas.
5. Keep whole-sign, equal-house, and Sripati results separate.
6. Add a house-system selector.
7. Implement Bhava Bala only after cusps pass validation.
8. Add polar and near-polar behavior.
9. Compare published reference charts.

### Acceptance criteria

- No silent house-system mixing.
- Every result carries its house-system convention.
- UI and MCP expose whole-sign and Sripati differences clearly.
- Unsupported polar calculations return an explicit status.

## Completed: research Shadbala and Bhava Bala foundation

### Completed foundation

- Saptavargaja Bala now retains all seven dignity contributions and their compound-relationship convention.
- Drik Bala now exposes every directed Sphuta Drishti contribution before the benefic-minus-malefic quartering rule is applied.
- Tribhaga Bala now uses actual bracketing sunrise and sunset times, assigns the day/night thirds, and preserves Jupiter's full strength at all times.
- Ayana Bala now derives equatorial declination from tropical longitude plus true ecliptic latitude, applies the BPHS north/south polarity, and doubles the Sun's result.
- Varsha, Masa, Dina, and Hora Bala now use a versioned solar-ingress, sunrise-weekday, and equal-60-minute-Hora convention, retaining the four lords and ingress instants as evidence.
- Cheshta Bala retains mean, true, sighrocca, midpoint, and reduced-kendra evidence under a versioned JPL mean-element convention.
- Graha Yuddha uses true ecliptic latitude, retains winner/loser evidence, and transfers the preliminary-strength difference.
- Complete raw totals and classical required-strength ratios are enabled; Bhava Bala is enabled only when equal or Sripati Madhyas are explicitly selected.

### Required work

1. Document the source and formula for each component.
2. Make disputed conventions configurable.
3. Validate every component independently.
4. Add component-level reference fixtures.
5. Produce totals only when all active components are compatible.
6. Add classical required-strength ratios.
7. Keep raw Virupas visible.
8. Do not convert totals into deterministic life outcomes.

### Acceptance criteria

- Component totals reproduce reviewed reference charts.
- Total Shadbala remains unavailable if any required component input is missing.
- MCP returns component evidence and convention IDs.

## Location-system expansion

### Required work

- Add Andhra Pradesh and Telangana villages, Mandals, and districts.
- Add historical and alternate place names.
- Add worldwide cities.
- Store coordinate source and accuracy.
- Add ambiguity selection for duplicate names. (implemented)
- Assign IANA timezones.
- Keep historical timezone resolution.
- Host the dataset on Cloudflare/D1 rather than leaking searches to a third-party geocoder.

### Suggested D1 structure

```sql
locations(
  id,
  name,
  normalized_name,
  aliases_json,
  district,
  state,
  country,
  latitude,
  longitude,
  timezone,
  source,
  accuracy_meters
)
```

### Acceptance criteria

- Search returns an ambiguity list rather than silently choosing.
- Coordinates and timezone are visible before calculation.
- Village searches remain private.

## Telugu knowledge review

The complete 215-video corpus is now catalogued in `knowledge/rva-telugu-catalog.json`: 106 transcripts are provisionally usable, 2 need repair, and 107 need retranscription after retrying YouTube captions. Follow the quality-first sequencing and topic priorities in `RVA_FULL_215_RESEARCH_PLAN.md`; quality labels do not confer knowledge approval.

### Required work

1. Import transcript passages with video IDs and timestamps.
2. Correct automated-caption errors.
3. Add original Telugu, transliteration, and literal translation.
4. Extract candidate rules without treating them as approved.
5. Record tradition and teacher attribution.
6. Track contradictions.
7. Recruit at least two independent Telugu practitioners.
8. Require both approvals for publication.
9. Allow the AI to retrieve only publishable rules.
10. Show citations in every interpretation that uses a rule.

### Acceptance criteria

- No draft rule reaches the AI interpretation prompt.
- Every rule has a source locator.
- Contradictory traditions remain distinct.
- Reviewer identities are real and auditable.

## Direct Telugu/English PDF reports

### Required work

- Direct PDF download rather than browser printing alone.
- Embedded Telugu-compatible fonts.
- South Indian charts rendered sharply.
- Panchanga and Dasha tables.
- Selected Vargas.
- Evidence and uncertainty sections.
- Engine, ayanamsa, house-system, and methodology versions.
- Privacy-safe report without birth details.
- Full report with explicit consent.
- Render every test PDF to PNG for visual QA.

### Acceptance criteria

- No missing Telugu glyphs.
- No clipped charts or tables.
- A4 page breaks are stable.
- PDF metadata does not leak excluded birth details.

## Private-vault product updates

The backend and browser encryption exist. The following product capabilities are implemented:

- Saved-chart list
- Reopen and decrypt a saved chart
- Rename chart
- Delete confirmation
- Share list
- Revoke share
- Access count and expiration
- API-key backup
- API-key import
- Key rotation
- Multiple named keys
- Usage dashboard
- Data export
- Automated expiration cleanup

### Acceptance criteria

- Nothing is stored without an explicit checkbox.
- Plain chart JSON never reaches D1 storage.
- Decryption failures do not destroy stored ciphertext.
- Deleting a chart removes its shares.

## Timing-system updates

- Exact future Saturn sign-period timeline (implemented)
- Full Sade Sati date ranges (implemented as rising/middle/setting structural periods)
- Full Dhaiya date ranges (implemented)
- Jupiter transit-period calendar (implemented)
- Rahu/Ketu transit calendar (implemented)
- Dasha-transit intersection calendar (implemented)
- Selected-event ICS export (implemented)
- Additional Dasha systems only after convention review

## MCP updates

- Add documented JSON output schemas to every tool. (implemented)
- Add small task-specific tools instead of returning the full chart for every question. (implemented for compact evidence, date-specific Dasha, timing context, and slow-transit calendars)
- Add API-key creation and management documentation. (implemented)
- Add scope-specific keys. (implemented)
- Add authenticated AI narration scope. (implemented)
- Add per-key rate policies. (implemented with configurable D1 fixed-minute windows)
- Add usage-dashboard UI.
- Add MCP integration examples for Claude, ChatGPT, Codex, and generic clients. (implemented)
- Add conformance tests for initialization, discovery, tool listing, calls, errors, and authentication. (implemented)

## Accessibility and quality updates

- Keyboard and skip navigation (implemented)
- Screen-reader chart descriptions (implemented)
- Telugu font coverage and line-height support (implemented; practitioner review remains external)
- High contrast and forced-colors modes (implemented)
- Mobile Dasha-table behavior (implemented)
- Loading skeletons (implemented)
- Offline and rate-limit errors (implemented)
- Polar-location errors (implemented)
- Browser end-to-end tests (implemented for desktop and mobile Chromium)
- Print/PDF rendered-page QA (implemented for the sample report)
- Bundle-size and performance budgets (implemented in CI)

## Security updates

- Key rotation (implemented)
- Optional password-wrapped chart keys (implemented in recovery bundles)
- Automated expired-record cleanup (implemented)
- Share management UI (implemented)
- Rate-limit abuse analytics (implemented with privacy-preserving client hashes)
- Security-event audit table (implemented)
- Content Security Policy (implemented)
- Strict Permissions Policy (implemented)
- Dependency and secret scanning (implemented in CI)
- Backup and recovery testing for D1 ciphertext

## Recommended implementation sequence

1. High-precision Moon.
2. Lahiri certification.
3. Sripati Bhava.
4. Complete Shadbala.
5. Expanded private location dataset.
6. Direct PDF generation.
7. Private-vault management UI.
8. Telugu knowledge import and practitioner review.
9. Timing-period calendars.
10. Accessibility, security, and end-to-end hardening.

## Do not mark complete until

- Astronomy passes published tolerances.
- Boundary-sensitive calculations are tested.
- House and Shadbala conventions are versioned.
- Telugu rules are approved by two real practitioners.
- Direct PDFs pass rendered visual QA.
- Private-vault recovery and deletion flows are tested.
- MCP conformance and authentication tests pass.
- The product continues to label astrology as interpretive rather than scientific certainty.
# 2026-08-29 implementation audit

Completed in the current tree:

- All nine formerly place-only MCP tools accept catalogue names or explicit latitude, longitude, and IANA timezone inputs, including each compatibility subject and optional natal Muhurta/Panchanga data.
- Location-resolution failures are MCP tool results with retry candidates rather than JSON-RPC `-32602` failures; bare names and full labels are supported.
- A reproducible `cities500` + `allCountries` GeoNames importer is available through `npm run locations:geonames -- <cities500.txt> <allCountries.txt>`. The generated catalogue is intentionally not represented as populated until the upstream dumps are staged and the Worker bundle budget is checked.
- Every MCP tool has an output schema.
- Compatibility, Varshaphal, and full-life reports now publish the shared prohibited-inference envelope.
- Muhurta supports `important_conversation` and `new_venture` activities.
- API-key authentication, per-key rate limiting, and daily usage metering already exist.

Evidence-gated and still open:

- Passage extraction and two independent human reviews. No rule may be marked approved merely to move the counter.
- Blind-validation completion. The frozen protocol requires the full minimum cohort; one jail chart is only a seed case.
- Full-ephemeris production certification and JPL benchmark publication.
- Moonrise/moonset certification, marriage-window/readiness tools, chart caching, event-confirmation ingestion, and production GeoNames bundle generation.
