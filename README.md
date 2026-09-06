# Sahadeva

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

For remedy questions, MCP clients use `analyze_lal_kitab_remedies` after the fixed-house calculation. The generated full-corpus catalog is inspectable through `explore_lal_kitab_remedy_catalog` and `sahadeva://lal-kitab-remedies`; unverified OCR instructions remain withheld.

The web chart surfaces the same fixed-house map, source locators, retained-sensitive-material caution, and an independent calculation-quality audit. MCP clients can use the `lal_kitab_consultation` prompt or compose the equivalent tools from the published workflow resource.

For evidence-first use across AI clients, the MCP now publishes `sahadeva://prediction-quality` and the `evidence_first_prediction` prompt. Reviewed-rule search, rights-aware passage discovery, separate-tradition comparison, per-claim auditing, versioned outcome capture and conservative validation reporting are available as typed tools. These improve traceability and abstention; they do not guarantee prediction accuracy or convert unreviewed traditions into validated knowledge.

The primary consultation also supports a compact cross-tradition whole-person profile and consent-aware remedy selection. Its security contract is published at `sahadeva://security`; production profile references are keyed opaque identifiers, restricted knowledge remains server-side, and retrieved text is explicitly untrusted data. See [MCP AI orchestration and security](./MCP_AI_ORCHESTRATION_AND_SECURITY.md).

Workers AI has a limited daily free allocation. Sahadeva therefore describes hosted narration as optional and allowance-backed, not unlimited free inference.

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
