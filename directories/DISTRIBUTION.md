# Sahadeva - submit EVERYWHERE (runbook)

Prereqs (HUMAN): prod HTTPS URL live, GitHub repo public, support email,
privacy+terms URLs, icon (done: chatgpt-plugin/assets/), demo video.
Fill every TODO-, then work this list top to bottom. Target: 100 users.

## Tier 1 - the big 3 (users live here)
- [ ] **Muse**: muse.ai/platform form (see muse/SUBMISSION.md). Owner submits.
- [ ] **Claude**: claude.ai/directory/manage (see claude/SUBMISSION.md).
- [ ] **ChatGPT**: platform.openai.com/plugins ZIP upload (see
      chatgpt-plugin/SUBMISSION.md + TEST_CASES.md + PROMPTS.md + video).
      This listing also = Dots distribution (no separate Dots submit).

## Tier 2 - MCP registries (developers + agent discovery)
- [ ] **Official MCP registry** (first - others mirror it):
      `brew install mcp-publisher && mcp-publisher login github &&
      mcp-publisher publish` from mcp-server/ (uses server.json).
- [ ] **Smithery**: `npx @smithery/cli auth login` then publish URL-based
      remote server pointing at prod /mcp. Watch per-server usage counts.
- [ ] **Glama**: repo public -> claim listing at glama.ai/mcp (GitHub
      sign-in). Add glama.json for claimed badge.
- [ ] **mcp.so** (paid): submit listing.
- [ ] **PulseMCP**: submit (also auto-mirrors official registry ~weekly).

## Tier 3 - lists + IDE catalogs (SEO + long tail)
- [ ] PR to punkpeye/awesome-mcp-servers (remote section).
- [ ] Cursor catalog: https://cursor.directory (auto-detects .mcp.json).
- [ ] xAI marketplace entry.
- [ ] awesome-codex-plugins style lists (ChatGPT plugin mirrors).

## Tier 4 - communities (first 100 users come from here)
- [ ] Anthropic MCP Discord #third-party-servers: announce with endpoint.
- [ ] Reddit: r/vedicastrology, r/hinduism, r/ChatGPTPro (tool Tuesdays),
      r/ClaudeAI - demo video + "free, no account" angle. Read rules first.
- [ ] X: launch thread (panchang-in-chat demo GIF) + tag MCP community.
- [ ] Product Hunt launch (astrology + AI angle) once ChatGPT listing live.
- [ ] IndieHackers / relevant WhatsApp-Telegram astro groups (India volume).

## Tracking (log everything in tracking/products.csv + notes)
- Portal statuses + case IDs; Smithery counts; Glama score; registry stars;
  weekly connects/installs per directory; rejection reasons -> fix template.
- 100-user math: directories (30) + registries/SEO (20) + Reddit/X (30) +
  Product Hunt + communities (20). Review weekly, double down on winners.
