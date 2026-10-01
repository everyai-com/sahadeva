# Sahadeva - Claude Connectors Directory submission (FULL ENGINE)

Portal: https://claude.ai/directory/manage -> Submit new -> MCP connector
Endpoint: https://sahadeva.magicteams.ai/mcp (live, 54 tools, all annotated)

## Pre-submission checklist
- [ ] Tested as custom connector in Claude (place chain works)
- [ ] All 54 tools carry title + readOnly/destructive/openWorld (verified
      2026-10-01 via tools/list audit - 54/54 compliant)
- [ ] Reviewer API key obtained for the 3 gated tools (record_prashna_outcome,
      record_consultation_outcome, generate_report_pdf if gated)
- [ ] Docs URL, privacy URL, support contact, icon ready
- [ ] Submitter on any paid Claude plan

## Portal values

**Connection**: paste `https://sahadeva.magicteams.ai/mcp`

**Tools**: auto-sync. 54 tools: 51 read-only (panchanga, compatibility,
muhurta, dashas, transits, yogas, Lal Kitab, consultations), 3 additive
writes (report PDF, outcome records; destructive=false).

**Listing**
- Name: `Sahadeva`
- One-liner (<=200): `Vedic astrology workspace: panchanga, kundli matching, muhurta, dashas.`
- Description (<=2000): `Sahadeva is a transparent Vedic astrology
  workspace: daily panchanga, Ashtakoota + Porutham matching with Kuja
  evidence, muhurta search, dashas, transits, Ashtakavarga, vargas, yogas
  and Lal Kitab sources. Deterministic calculations with a published
  safety envelope. Free public reads. Research preview - no medical,
  mortality, fertility, legal or financial fact.`
- Categories: Lifestyle (+ fitting others)
- Docs URL: https://github.com/everyai-com/sahadeva | Privacy URL:
  https://magicteams.ai/privacy (must be live)
- Support: support@magicteams.ai | Icon: upload | Slug: `sahadeva`

**Use cases**: "Today's panchanga for Hyderabad"; "Match two kundlis";
"Marriage muhurta this December." Prerequisites: birth details as asked.
Reads + additive writes.

**Company**: MagicTeams, https://magicteams.ai, support@magicteams.ai.

**Authentication**: No authentication for reads (public, rate-limited);
API key (Bearer) for outcome-recording tools. Reviewer key in Test step.

**Data handling**: underlying API is our own; no health data; no
sponsored content.

**Test & launch**: "Public reads need no sign-in: search_locations, then
get_panchanga with place + coords (verified 2026-10-01: Krishna Saptami,
Mrigashira). Reviewer API key <KEY> exercises record_* chains."

**Compliance**: accept all 7 attestations.
