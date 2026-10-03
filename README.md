# Sahadeva

[![CI](https://flare-actions.everyai-com.workers.dev/v1/badge.svg?repo=everyai-com/sahadeva)](https://flare-actions.everyai-com.workers.dev/dashboard)

A clean-room, Cloudflare-native research build for a transparent South Indian AI Jyotish workspace.

## Run locally

```bash
npm install
npm run dev
```

The Cloudflare Vite plugin serves the React application and Worker API together. `POST /api/chart` is deterministic. `POST /api/interpret` uses the configured Workers AI binding.

## AI narration

Narration uses only Cloudflare's native `AI` binding and Cloudflare-hosted `@cf/...` models. The default is `@cf/zai-org/glm-5.3-flash`; `AI_MODEL` selects it in `wrangler.jsonc`, and non-`@cf/` model names are rejected in favor of that safe default. No AI Gateway, third-party API, or provider token participates in this path. `GET /api/ai/status` exposes only non-secret readiness metadata, and successful narration identifies the Cloudflare model while keeping calculated evidence immutable.

The consultation surface adds deterministic topic judgments, house exploration, natal Panchanga, convention comparison, Prashna, timing fusion, rectification, and depth endpoints. Topic judgments share one evidence-ledger engine across web, MCP, reports, and the Expo mobile client. Opt-in snapshots store versioned ledgers and a hashed follow-up secret—not names, places, or raw birth input—and calibration remains descriptive rather than predictive.

## Connect through MCP

After deployment, compatible clients can connect to:

```text
https://your-worker.example/mcp
```

The Streamable HTTP endpoint exposes a high-signal catalog led by a comprehensive first-reading dossier. The returned profile reference lets later consultations answer focused questions from the verified natal context without repeating the dossier. It also supports chart reports, Prashna, timing, separate North Indian Ashtakoota and South Indian ten-Porutham compatibility, Panchanga, Muhurta and visual reports. Specialist tools remain directly callable and are documented through an MCP resource. Chart calculation does not require a language model. Public calls are rate-limited; optional scoped Bearer keys provide metering and vault integration. See [MCP integration examples](./docs/MCP_INTEGRATIONS.md).

Clients can call `assess_prediction_readiness` before interpretation to distinguish implemented calculation from reviewed rules and calibrated prediction. Lal Kitab currently provides source-linked structural inspection. All of its material is retained, including sensitive topics and remedies; reviewed claims can later use graduated caution-led disclosure, while unreviewed personalized output remains withheld. See [Prediction quality and MCP gap audit](./PREDICTION_QUALITY_AND_MCP_GAP_AUDIT.md).

The source-only `analyze_lal_kitab` workflow now converts natal placements to Lal Kitab fixed houses and returns locators for all relevant planet-house sections without publishing their unreviewed claims. The complete integration inventory is in [Lal Kitab integration map](./LAL_KITAB_INTEGRATION.md).

The web chart surfaces the same fixed-house map, source locators, retained-sensitive-material caution, and an independent calculation-quality audit. MCP clients can use the `lal_kitab_consultation` prompt or compose the equivalent tools from the published workflow resource.

For evidence-first use across AI clients, the MCP now publishes `sahadeva://prediction-quality` and the `evidence_first_prediction` prompt. Reviewed-rule search, rights-aware passage discovery, separate-tradition comparison, per-claim auditing, versioned outcome capture and conservative validation reporting are available as typed tools. These improve traceability and abstention; they do not guarantee prediction accuracy or convert unreviewed traditions into validated knowledge.

The primary consultation also supports a compact cross-tradition whole-person profile and consent-aware remedy selection. Its security contract is published at `sahadeva://security`; production profile references are keyed opaque identifiers, restricted knowledge remains server-side, and retrieved text is explicitly untrusted data. See [MCP AI orchestration and security](./MCP_AI_ORCHESTRATION_AND_SECURITY.md).

Workers AI has a limited daily free allocation. Sahadeva therefore describes hosted narration as optional and allowance-backed, not unlimited free inference. When no language model is reachable, `/api/chat` does not fail: it answers with `model: "sahadeva-evidence-composer"` and `degraded: true`, composing a plain answer (bilingual) directly from the same calculated evidence packet — focused judgment, practical next steps and current Dasha — without adding any claim (`shared/evidenceAnswer.ts`).

## Panchangam calendar

The **Panchangam** tab is a month calendar plus a full day view for the birth place or the device's current location: sunrise to next-sunrise limbs (tithi, nakshatra, yoga, karana) with exact end times, amanta lunar month with adhika detection, ritu and ayana, Sankranti instants, moonrise/moonset on the local date, Rahu kalam / Yamagandam / Gulika, Abhijit and Brahma muhurtam, day and night Choghadiya, all 24 horas, personal tara bala, and major Telugu festivals. Festivals are dated by their traditional time of day (sunrise, midday, afternoon, dusk or midnight tithi); regional and sectarian refinements are not applied and the basis is shown with every date.

- `GET /api/panchanga/month?lat&lon&tz&tzOffset&year&month` — one month (1800–2050), edge-cached.
- `GET /api/panchanga/day?lat&lon&tz&tzOffset&date=YYYY-MM-DD` — the daily panchanga plus the limb timeline, masa and observances (`/api/panchanga/today` is the same without `date`).

The calendar engine (`shared/panchangaCalendar.ts`) needs only the Sun and Moon: limb boundaries come from 6-hourly sampling refined by a secant solve and agree with the chart engine's bisection to within seconds; a month costs well under a second of CPU. Durmuhurtam (weekday muhurta table), varjyam and amrita kalam (classical per-nakshatra ghati tables, 4 ghatis scaled to the nakshatra's real length; Mula's two varjyam spells), the lunar month and the samvatsara (Telugu/Kannada cycle turning at Ugadi) are computed for every day and also feed `/api/panchanga/today`, the MCP tools and the AI chat.

**Best times for you** (`POST /api/panchanga/personal`, birth details in the body only, never cached; `shared/personalTiming.ts`): the waking day is cut at every choghadiya, hora, Rahu/Yama/Gulika, durmuhurtam, varjyam, amrita kalam, Abhijit and Moon nakshatra/sign boundary, and each slice is scored with the person's own tara bala and chandra bala at that moment (chandrashtama flagged), the hora lord (benefics and the person's ascendant lord), choghadiya quality, Abhijit and amrita kalam. Rahu kalam, Yamagandam, Gulika, durmuhurtam and varjyam are excluded. Windows come with their reasons and what the hora suits; Today, the Panchangam day view and Ask (including its no-model fallback) all use them.

## Design language and assets

The web app uses the Sahadeva design language from [`everyai-com/sahadeva-asset-library`](https://github.com/everyai-com/sahadeva-asset-library): warm paper and cultural-ink tokens with automatic dark mode, self-hosted Figtree / Fraunces / Anek Telugu fonts (no third-party font requests), and the canonical Navagraha, Rāśi, Nakṣatra, Pañcāṅga, life-area, remedy and daily-timing glyphs. Glyphs are vendored into `public/glyphs` and rendered as tintable CSS masks through `src/webapp/glyph.tsx`; brand icons replace the old placeholder PWA icons. To refresh them from a sibling checkout of the library:

```bash
npm run assets:sync -- ../sahadeva-asset-library
```

The synced commit is recorded in `public/glyphs/SOURCE.json`.

## Verify

```bash
npm run check
npm test
npm run build
npm run test:e2e
npm run migrations:verify
npm run mobile:verify
```

## Current status

The product interface and computation pipeline are functional. The Moon, Panchanga transitions, and Lahiri convention have high-precision reference fixtures; the application remains a research preview until independent Lagna, solar-event, complete-strength, and practitioner certification gates are satisfied. See [RESEARCH_AND_ARCHITECTURE.md](./RESEARCH_AND_ARCHITECTURE.md) for the calculation boundary, topology, and validation gates.

## Clean-room boundary

No third-party astrology engine is bundled. Repository research informed the capability map and test strategy only. Production algorithms must be derived from documented specifications and independently validated.

## Continuous integration

Pushes and pull requests run the `verify` pipeline on [Flare Actions](https://github.com/everyai-com/flare-actions) (`flare.yml`): typecheck, unit tests, migration and secret checks, audit, build, bundle budget, Playwright e2e, and the Expo mobile verify. Run completions email all registered users.

## License

MIT — see [LICENSE](./LICENSE).
