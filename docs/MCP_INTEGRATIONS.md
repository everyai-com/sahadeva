# Sahadeva MCP integration

## Web-created evidence profiles

Signed-in web onboarding creates an encrypted, versioned evidence profile. AI chat
reuses its opaque `profileRef` only after the server confirms that birth inputs and
engine version match. Cross-tradition findings stay labeled rather than blended,
and remedies preserve their source tradition, review status, safety cautions and
user-selected burden limits. High-risk topics remain available as traditional
research material, but must carry explicit caution and cannot be presented as
medical, mortality, fertility, legal or financial fact.

Endpoint: `https://your-worker.example/mcp`

Sahadeva uses MCP Streamable HTTP with the stable `2025-11-25` protocol revision and a JSON response profile. Deterministic calculation is publicly available behind the deployment rate limiter. When a Sahadeva API key is supplied as a Bearer token, it must include `mcp:calculate`; authenticated calls are metered to that key.

Consultation tools include:

- `assess_prediction_readiness`: reports independent calculation, rule, worked-example, practitioner-review and calibration gates. It explicitly marks Lal Kitab as source-only until a dedicated reviewed engine exists.
- `audit_chart_calculation`: checks declared engine certification, timezone provenance, conventions and important boundary sensitivity before interpretation.
- `analyze_lal_kitab`: converts natal placements to Lal Kitab fixed houses and locates the corresponding source sections. It retains all sensitive source families and publishes the graduated caution policy; unreviewed personalized claims remain withheld pending extraction and review.
- `explore_lal_kitab_sources`: returns all 23 complete-book source families, coverage counts, locators, risk signals and controlled-disclosure policy without reproducing the book body. The same information is available as the `sahadeva://lal-kitab` MCP resource.
- `consult_jyotishya`: the master consultation. Its first call creates a whole-person dossier covering identity, education, employment, business, money, love, marriage, health routines, family/property, children and spirituality, then returns a reusable `profileRef`. Later calls verify that reference and answer the new question without repeating the dossier.
- `calculate_prashna`: server-time Prashna with chart fitness, structural judgment, optional low-risk practice, and an outcome-confirmation hook.
- `calculate_devata_profile`: calculates Iṣṭa, Dharma, Pālana, Guru and Kula Devatā candidates from the declared eight-kāraka, Navāṃśa and D20 lineage. It returns every anchor, selection step, tie-break and birth-time warning; it does not prescribe a mantra or claim a uniquely correct deity.
- `analyze_remedies`: builds the source-grounded remedy protocol after collecting belief, burden, cost, prayer and charity preferences. It separates practical support, calculated traditional candidates, publication status and contraindications. Specific gemstones, initiation-only mantras, fasting and costly rituals remain withheld until their extracted rules are independently reviewed.
- `record_prashna_outcome`: securely records what later happened using the private confirmation token returned by `calculate_prashna`; the token is hashed at rest and is not the consultation ID.
- `get_depth_analysis`: Vimsopaka, Ishta/Kashta, cross-Varga synthesis, special Lagnas, expanded Yogas, and versioned additional Dashas.
- `fuse_timing`: promise-gated Vimshottari, alternate-Dasha, transit, double-transit, Ashtakavarga, and Varga timing windows.
- `rectify_birth_time`: ranked time hypotheses with a held-out life event; it never certifies an exact minute.
- `search_reviewed_rules`: searches only two-reviewer publication-gated rules with approved passages and no open contradiction.
- `search_source_passages`: searches source metadata while enforcing source and passage display rights; discovery never makes a passage executable doctrine.
- `compare_traditions`: keeps every selected tradition in a separate evidence ledger and refuses score averaging.
- `audit_prediction_claim`: gates each material claim on calculation status, approved rules, opposition, unresolved sources, calibration and harm class.
- `record_consultation_outcome`: stores an authenticated, versioned atomic claim and consent-scoped outcome for descriptive validation.
- `get_validation_report`: reports calculation, knowledge, reviewer, worked-example and blinded-outcome gates without claiming scientific validation.

The expert catalog additionally exposes `review_lal_kitab_rule`. It requires an authenticated key with `knowledge:review`; two distinct qualified approvals and scan verification are required before a Lal Kitab rule enters the dedicated publishable view.

All interpretive tool responses carry the Sahadeva safety envelope. Structural scores are relative activations, not calibrated probabilities.

The MCP server also publishes `prashna_consultation`, `lal_kitab_consultation`, and `evidence_first_prediction` prompts plus `sahadeva://mcp-workflows` and `sahadeva://prediction-quality` resources. The Lal Kitab prompt composes readiness, calculation auditing, source-linked analysis, and optional catalog exploration while retaining sensitive material under the same caution-led disclosure policy. Clients should retain the Prashna confirmation token for the user, call `record_prashna_outcome` only after the user reports what happened, and never manufacture feedback from the original judgment.

## Codex

Add the remote server from the CLI:

```bash
codex mcp add sahadeva --url https://your-worker.example/mcp
```

Or add it to Codex `config.toml`:

```toml
[mcp_servers.sahadeva]
url = "https://your-worker.example/mcp"
bearer_token_env_var = "SAHADEVA_API_KEY"
```

Omit `bearer_token_env_var` when using public deterministic access. Never commit the environment variable value.

## ChatGPT

In a ChatGPT workspace where custom MCP apps are available, enable developer mode, create an app for the Sahadeva HTTPS MCP URL, and choose no authentication for public deterministic access. Sahadeva API keys are static Bearer credentials rather than OAuth, so do not paste one into an OAuth configuration.

## Claude-compatible clients

Clients supporting remote HTTP MCP commonly accept this server entry:

```json
{
  "mcpServers": {
    "sahadeva": {
      "type": "http",
      "url": "https://your-worker.example/mcp"
    }
  }
}
```

Client configuration formats vary by release. If the client supports Bearer headers, store the Sahadeva key in its secret or environment-variable facility, not directly in a committed JSON file.

## Generic HTTP client

Initialize:

```bash
curl https://your-worker.example/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"example","version":"1.0"}}}'
```

List tools:

```bash
curl https://your-worker.example/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

For authenticated access, add `-H "authorization: Bearer $SAHADEVA_API_KEY"`.

## Scopes

- `mcp:calculate`: authenticated MCP calls
- `ai:narrate`: authenticated `/api/interpret` calls
- `charts:read` / `charts:write`: encrypted vault data
- `shares:write`: private-share management
- `usage:read`: usage dashboard
- `knowledge:review`: specialist Lal Kitab rule-review mutation

Every listed MCP tool publishes both an input and output JSON Schema. Protocol and authentication behavior is covered by the Worker conformance suite.

Default discovery intentionally exposes a compact task-oriented catalog so host models choose tools reliably. Specialist calculation and audit tools remain callable by their existing names for backwards compatibility and are documented by the `sahadeva://expert-tools` resource.

For every first reading and normal question, use `consult_jyotishya`. On the first call, omit `profileRef`: Sahadeva returns the complete life-domain dossier and a stable `profileRef`. Retain that reference. On later questions, pass `profileRef` together with the same birth details; Sahadeva verifies the match and returns a focused answer without repeating the dossier. A reference cannot be reused with different birth data or a changed engine version.

The same call accepts `traditions` (`parashari`, `jaimini`, `kp`, `lal-kitab`) and optional `remedyPreferences`. Its `crossTraditionProfile` keeps methods separate while connecting them to the same life question. `crossTraditionRemedies` includes only preference-eligible reviewed output and explicitly withholds unavailable tradition remedies. Read `sahadeva://security` before using any returned source content. See [AI orchestration and security](../MCP_AI_ORCHESTRATION_AND_SECURITY.md).

Use `readingMode: "full-profile"` to deliberately regenerate the complete dossier or `readingMode: "follow-up"` to require an existing reference; normal clients should leave it as `auto`. Use the full report or expert calculation tools only for technical matrices, printable artifacts, compatibility with a second person, rectification from dated events, Varshaphal for a target year, Prashna, or Muhurta with a date range.

For marriage compatibility, call `calculate_compatibility` with `bride` and `groom` birth details. The response keeps three traditional layers separate: `ashtakoota` contains the North Indian eight-component score out of 36, `porutham` contains the South Indian Dina, Gana, Mahendra, Sthree Dheergha, Yoni, Rashi, Rasyadhipati, Vashya, Rajju and Vedha checks, and `kujaDosha` contains the Mars comparison. Porutham deliberately exposes individual agreements and objections rather than manufacturing a combined relationship verdict. The same complete compatibility object is included by `get_marriage_readiness` and partner-aware `consult_jyotishya` calls.

For any **non-marital** bond, call `calculate_relationship_compatibility` with `personA`, `personB` and a `relationship` type (`business_partner`, `friend`, `sibling`, `colleague`, `mentor_student`, `roommate` or `general`). It skips the gender/marriage-specific Ashtakoota factors (Varna hierarchy, Nadi/fertility) and instead reports the gender-neutral Nakshatra factors that describe any human relationship — `tara` (mutual star fortune, both directions), `grahaMaitri` (mental rapport of the Moon lords), `gana` (temperament), `yoni` (instinct), `bhakoot` (emotional flow) and Moon-sign `element` harmony. Each factor carries its own score, maximum and evidence; the six are then blended with weights tuned to the chosen relationship (e.g. business partners emphasise Graha Maitri, Sampat Tara and Bhakoot money-flow) into a bounded 0-100 `harmony.index` with a `band` and named strengths/frictions. Like the marriage tool it is a research preview and never issues a verdict on a relationship.

## Location safety

Call `search_locations` before a chart tool when coordinates are not independently known. It searches deterministic local data and returns the label, latitude, longitude, IANA timezone and offset. MCP tools never invoke Workers AI or another hidden model. If no match is returned, the host agent (Claude, Codex, ChatGPT, or another MCP client) should use its own available location capabilities, then pass the place label, latitude, longitude and IANA timezone to `calculate_chart_from_known_place`. Never silently reuse coordinates from another place.

For a catalogued location, `calculate_chart_from_known_place` combines resolution and calculation safely; for any other location it accepts host-supplied coordinates and timezone in the same call. Use `generate_full_life_report` when an AI client needs a complete, evidence-linked, normal-person report instead of the raw calculation matrices. Its timing is explicitly anchored by `asOfDate`, and its traditional interpretations remain marked as unreviewed rather than presented as facts.

## Advanced evidence engines

The default catalog also exposes `analyze_transit_activation`, `calculate_strength_profile`, `calculate_ashtakavarga`, `analyze_varga`, `analyze_yogas`, `calculate_dasha_system`, `analyze_arudha_and_upapada`, `explain_chart_sources`, `audit_reading_evidence`, and `compare_reading_versions`. These return calculation evidence, convention boundaries, source-review status, and explicit safety notices rather than unsupported certainty.

`analyze_badhaka` is available only in the expert catalog. It reports the lineage-specific obstruction structure and explicitly prohibits curse, black-magic, disease, deity-anger, or fear-based remedy claims. Devatā and remedy workflows remain separate calls because they require visible method choices and user preference consent.

The domain layer adds `analyze_nakshatra_profile`, `analyze_marriage_structure`, `analyze_career_structure`, `analyze_education_structure`, `analyze_property_and_vehicle`, `analyze_finance_structure`, and `analyze_spiritual_path`. `find_muhurta_with_natal_fit` requires natal details and ranks Tara Bala and Chandra Bala alongside the ordinary Muhurta checks. `build_claim_evidence_ledger` keeps calculated support, opposition, reviewed citations, unresolved sources, and uncertainty separate. The expert-only `run_longitudinal_validation` produces descriptive outcome calibration and explicitly does not claim scientific validation.
