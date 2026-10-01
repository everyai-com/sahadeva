# Sahadeva - Meta Muse directory submission (FULL ENGINE)

Portal: https://muse.ai/platform -> "Submit a connector" (owner only)
Endpoint: https://sahadeva.magicteams.ai/mcp (live, 54 tools, all annotated)

## Before submitting
- [ ] Tested as a Muse CUSTOM connector (search_locations -> get_panchanga)
- [ ] Icon 512x512 (assets/icon-512.png), privacy + terms URLs live
- [ ] Reviewer API key for gated tools (or document public-only path)
- [ ] Payments: does not accept payments; owner available to submit

## Form values

### Step 1: Overview
- Connector name: `Sahadeva` | Company: MagicTeams | Website: https://magicteams.ai
- Icon: upload | Payments: no | Contact: support@magicteams.ai
- Privacy: https://magicteams.ai/privacy | Terms: https://magicteams.ai/terms
- Example prompts:

```text
What is today's panchanga for Hyderabad?
Match two kundlis for marriage with Ashtakoota and Porutham.
Find a marriage muhurta this December.
Give me a career reading - born 1988-07-04 10:20 in Bengaluru.
What dasha am I running and what does it activate?
Every morning, tell me today's tithi, nakshatra and sunrise for my city.
```

- Anything else?: `Sahadeva is a transparent Vedic astrology workspace:
  panchanga, Ashtakoota + Porutham matching, muhurta, dashas, transits,
  Lal Kitab sources. 54 annotated tools over streamable HTTP; deterministic
  calculations with a safety envelope. Free public reads (rate-limited);
  outcome-recording tools need an API key. Research preview, no
  medical/mortality/fertility/legal/financial fact.`

### Step 2: Technical specs
- Connection type: **Existing MCP**
- Hosted MCP endpoint: `https://sahadeva.magicteams.ai/mcp`
- Docs URL: https://github.com/everyai-com/sahadeva
- Auth: API keys (for recording tools); none for reads
- Access requirements: `Public reads, no account needed. Rate limits
  apply (60 calc/min). Recording tools need an API key with mcp scopes;
  reviewer key supplied separately. No personal data stored beyond
  request processing.`

### Step 3: Review (owner only)
1. Authorized to submit connector + brand assets
2. Submission doesn't guarantee approval; promotion is editorial
3. Agree to Muse Connector Terms (read at submit time)
