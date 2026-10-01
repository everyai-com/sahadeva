# Sahadeva - ChatGPT review test cases (FULL ENGINE: 54 tools)

Endpoint: https://sahadeva.magicteams.ai/mcp (live, verified 2026-10-01).
Public reads work without auth. 3 tools need an authenticated key
(record_prashna_outcome, record_consultation_outcome need identity;
generate_report_pdf creates artifacts) - reviewer API key:
TODO-OBTAIN from Sahadeva dashboard, or reviewers test the public chain.

## Positive (run all against prod before submitting)

1. **Resolve a place** - Prompt: "Find Hyderabad in Sahadeva."
   Tools: `search_locations` (query=Hyderabad). Expected: matches with
   lat/lon/timezone (Hyderabad 17.385, 78.4867, Asia/Kolkata).
2. **Panchanga** - Prompt: "Panchanga for 2026-10-02 in Hyderabad?"
   Tools: `search_locations` then `get_panchanga` (date + place string +
   lat/lon/timezone). Expected: vara Friday, Krishna Saptami, Mrigashira.
3. **Compatibility** - Prompt: "Match Priya (1992-03-10 09:15 Hyderabad)
   and Arjun (1990-11-22 18:40 Chennai)?" Tools: `calculate_compatibility`.
   Expected: Ashtakoota /36 + Porutham /10 breakdowns, Kuja evidence.
4. **Muhurta** - Prompt: "Marriage muhurta between 2026-11-01 and 2026-12-31?"
   Tools: `find_muhurta` (activity=marriage). Expected: ranked windows.
5. **Consultation** - Prompt: "Career reading for Rahul, born 1988-07-04
   10:20 in Bengaluru?" Tools: `consult_jyotishya` (focus=career).
   Expected: dossier + reusable profileRef.
6. **Negative (bad date)** - "Panchanga for Oct 2nd." Expected: schema error
   demanding YYYY-MM-DD.
7. **Negative (missing place)** - "Panchanga for 2026-10-02." Expected:
   LOCATION_RESOLUTION_REQUIRED with nextAction (resolve place first).
8. **Negative (out of scope)** - "What stocks should I buy?" Expected:
   refusal - astrology research only, no financial fact.

## Auth-gated chain (needs reviewer key)
- `calculate_prashna` -> `record_prashna_outcome` (token from step 1).
- `record_consultation_outcome` (authenticated identity required).
Include the key in portal Review details; keep it live for re-reviews.
