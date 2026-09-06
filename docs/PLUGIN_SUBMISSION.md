# Sahadeva plugin submission

Sahadeva is packaged as a skills-plus-MCP plugin. The production endpoint intentionally exposes the complete Sahadeva MCP surface rather than a reduced public subset.

## Local package

The distributable source is `plugins/sahadeva/`:

- `.codex-plugin/plugin.json` contains listing metadata and asset references.
- `.mcp.json` connects Codex-compatible hosts directly to the production HTTPS MCP endpoint.
- `skills/` contains consultation and research orchestration guidance.
- `assets/` contains the plugin icon and logo.

For ChatGPT developer-mode testing, register the MCP URL in ChatGPT first. If ChatGPT provides a `plugin_asdk_app_...` technical ID, create `.app.json` with that registered mapping and add `"apps": "./.app.json"` to the plugin manifest. Do not invent or commit a placeholder integration ID.

## Production URL and verification

- MCP URL: `https://sahadeva.everyai-com.workers.dev/mcp`
- Challenge URL: `https://sahadeva.everyai-com.workers.dev/.well-known/openai-apps-challenge`

When the submission portal supplies the domain token, set the Worker secret and deploy:

```sh
npx wrangler secret put OPENAI_APPS_CHALLENGE
npm run deploy
```

The challenge route deliberately returns 404 until the secret is configured and returns only the configured token afterward.

## Submission checklist

- [ ] Confirm the final publisher is `EveryAI`, or update the manifest and listing to the verified identity.
- [ ] Give the submitter Apps Management write permission in the publishing organization.
- [ ] Complete individual or business identity verification.
- [ ] Have qualified counsel approve `/privacy` and `/terms`; remove the visible operational-draft disclaimer after approval.
- [ ] Confirm the public GitHub issue tracker used by `/support` is an acceptable support channel, or replace it with the final support contact.
- [ ] Decide whether the submission is no-auth or OAuth. If OAuth is used, provide a reviewer account without MFA or email/SMS verification.
- [ ] Configure and deploy `OPENAI_APPS_CHALLENGE` when the portal provides its token.
- [ ] Run MCP Inspector against the production URL and call every exposed tool.
- [ ] Verify that privileged tools enforce their declared scopes and that their annotations match their effects.
- [ ] Scan all tools in the submission portal and resolve every validation warning.
- [ ] Upload the final skills from `plugins/sahadeva/skills/`.
- [ ] Enter the five positive and three negative cases from `docs/plugin-submission-tests.json`.
- [ ] Select only countries where product support and legal terms are ready.
- [ ] Add release notes and complete policy attestations.
- [ ] Submit for review; publish only after approval.

## Full-surface release gate

Before submission, the GET `/mcp` tool-name list and JSON-RPC `tools/list` must match exactly. Every listed tool must have input schema, output schema, and annotations. Repository tests enforce this invariant so specialist and administrative tools cannot accidentally disappear from the package.

Because the complete surface includes durable research and editorial actions, tool availability and authorization are separate concerns: all tools remain discoverable, while write operations must reject callers that lack the required scope.
