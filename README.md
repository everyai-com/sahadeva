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

The Streamable HTTP endpoint exposes a high-signal catalog led by a comprehensive first-reading dossier. The returned profile reference lets later consultations answer focused questions from the verified natal context without repeating the dossier. It also supports chart reports, Prashna, timing, compatibility, Panchanga, Muhurta and visual reports. Specialist tools remain directly callable and are documented through an MCP resource. Chart calculation does not require a language model. Public calls are rate-limited; optional scoped Bearer keys provide metering and vault integration. See [MCP integration examples](./docs/MCP_INTEGRATIONS.md).

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
