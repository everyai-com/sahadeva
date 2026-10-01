# Sahadeva - ChatGPT submission checklist

Portal: https://platform.openai.com/plugins (one publish covers ChatGPT + Codex)

## Before you upload
- [ ] MCP server live on HTTPS (POST /mcp answers `initialize`)
- [ ] `mcp.json` URL points at production; `plugin.json` TODOs filled
- [ ] Icons in `assets/` (small + large PNG per portal spec)
- [ ] Demo video recorded showing all 8 test cases; URL in plugin.json
- [ ] Org verified (individual/business) in org settings; submitter has Apps Management Write
- [ ] ZIP contains plugin.json, mcp.json, skills/, assets/, TEST_CASES.md - NO secrets
- [ ] Listing prompts filled from PROMPTS.md (include background-style jobs for Dots)

## In the portal
- [ ] Upload ZIP -> fix metadata findings (Copy issues -> fix -> re-upload)
- [ ] MCPs -> Connect server -> complete domain challenge
      (set OPENAI_APPS_CHALLENGE_TOKEN so /.well-known/openai-apps-challenge serves it)
- [ ] Wait for tool scan -> resolve findings
- [ ] Review details: paste test cases, reviewer creds (or "none required")
- [ ] Submit for review -> attestations; track status; feedback arrives by email
- [ ] On approval: Publish plugin (you choose timing)

## After publish
- [ ] Server changes go live via Rescan (MCPs tab) - no new ZIP needed
- [ ] Metadata/skill changes need a new versioned ZIP upload
