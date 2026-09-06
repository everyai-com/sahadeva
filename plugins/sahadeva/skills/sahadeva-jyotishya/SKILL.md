---
name: sahadeva-jyotishya
description: Use Sahadeva for Jyotishya charts, consultations, Panchanga, Muhurta, compatibility, timing, Prashna, remedies, reports, and related interpretive requests.
---

# Sahadeva Jyotishya

Use the Sahadeva MCP tools for calculations and evidence. Call `recommend_tools` first when the user's request does not map clearly to a single tool.

## Workflow

- Collect only the inputs required by the selected tool. Never guess a birth time, date, place, coordinates, timezone, relationship type, or event time.
- Use `search_locations` when a place is ambiguous. Prefer `calculate_chart_from_known_place` when the place or coordinates are known.
- Reuse calculated chart or profile data across related calls instead of asking for the same details repeatedly.
- For broad readings, start with `consult_jyotishya`; call specialist tools when the user requests their additional detail.
- Present conclusions with supporting and opposing evidence, confidence or uncertainty, and the convention used.
- Distinguish deterministic calculations from interpretive claims. Do not turn research-preview output into a guarantee.
- Ask before calling a tool that records an outcome or generates a durable artifact when the user has not already requested that action.

## Safety

Treat astrology as a cultural and interpretive practice. Do not provide medical diagnoses, instructions to stop treatment, guaranteed financial outcomes, certainty about death or disaster, or deterministic judgments about another person's worth. For sensitive requests, provide bounded interpretation and recommend appropriate professional or practical support.

Birth details and relationship data are personal. Do not repeat them unnecessarily or expose internal identifiers, tokens, logs, or reviewer data.
