# Sahadeva MCP integration

Endpoint: `https://your-worker.example/mcp`

Sahadeva uses stateless HTTP JSON-RPC. Deterministic calculation is publicly available behind the deployment rate limiter. When a Sahadeva API key is supplied as a Bearer token, it must include `mcp:calculate`; authenticated calls are metered to that key.

Consultation tools include:

- `consult_jyotishya`: the default one-call, compact consultation surface for a focused question. It returns a stable chart reference, essential anchors, three priorities, current Dasha, measured strengths, confidence and safety without duplicating the full chart payload.
- `calculate_prashna`: server-time Prashna with chart fitness, structural judgment, optional low-risk practice, and an outcome-confirmation hook.
- `record_prashna_outcome`: securely records what later happened using the private confirmation token returned by `calculate_prashna`; the token is hashed at rest and is not the consultation ID.
- `get_depth_analysis`: Vimsopaka, Ishta/Kashta, cross-Varga synthesis, special Lagnas, expanded Yogas, and versioned additional Dashas.
- `fuse_timing`: promise-gated Vimshottari, alternate-Dasha, transit, double-transit, Ashtakavarga, and Varga timing windows.
- `rectify_birth_time`: ranked time hypotheses with a held-out life event; it never certifies an exact minute.

All interpretive tool responses carry the Sahadeva safety envelope. Structural scores are relative activations, not calibrated probabilities.

The MCP server also publishes a `prashna_consultation` prompt and a `sahadeva://mcp-workflows` resource. Clients should retain the confirmation token for the user, call `record_prashna_outcome` only after the user reports what happened, and never manufacture feedback from the original judgment.

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
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"example","version":"1.0"}}}'
```

List tools:

```bash
curl https://your-worker.example/mcp \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

For authenticated access, add `-H "authorization: Bearer $SAHADEVA_API_KEY"`.

## Scopes

- `mcp:calculate`: authenticated MCP calls
- `ai:narrate`: authenticated `/api/interpret` calls
- `charts:read` / `charts:write`: encrypted vault data
- `shares:write`: private-share management
- `usage:read`: usage dashboard

Every listed MCP tool publishes both an input and output JSON Schema. Protocol and authentication behavior is covered by the Worker conformance suite.

For normal questions, prefer `consult_jyotishya` with `detail: "brief"`. Request `detail: "standard"` only when the user wants the supporting life-area reading, and use the full report or expert calculation tools only for technical inspection. This keeps the default MCP response within a bounded context budget.

## Location safety

Call `search_locations` before a chart tool when coordinates are not independently known. It searches deterministic local data and returns the label, latitude, longitude, IANA timezone and offset. MCP tools never invoke Workers AI or another hidden model. If no match is returned, the host agent (Claude, Codex, ChatGPT, or another MCP client) should use its own available location capabilities, then pass the place label, latitude, longitude and IANA timezone to `calculate_chart_from_known_place`. Never silently reuse coordinates from another place.

For a catalogued location, `calculate_chart_from_known_place` combines resolution and calculation safely; for any other location it accepts host-supplied coordinates and timezone in the same call. Use `generate_full_life_report` when an AI client needs a complete, evidence-linked, normal-person report instead of the raw calculation matrices. Its timing is explicitly anchored by `asOfDate`, and its traditional interpretations remain marked as unreviewed rather than presented as facts.
