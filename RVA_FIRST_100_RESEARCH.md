# RVA Telugu — first 100 video research set

## Scope and provenance

- Publisher: RVA Telugu
- Playlist: `PLvmzzcGHiU3TfI5LO2G1JTHPmT3sZqJZe`
- Playlist title: *Learn Astrology in Telugu*
- Requested research slice: playlist positions 1–100 (introduction and episodes 1–99)
- Verified full playlist size on 2026-08-28: 215 items
- Source URL: https://www.youtube.com/playlist?list=PLvmzzcGHiU3TfI5LO2G1JTHPmT3sZqJZe
- Copyright status: third-party instructional material. Do not redistribute transcripts or copy presentation text into the product.

## Evidence status

The title and video ID for every item in positions 1–100 have been inventoried. A local transcript-harvester dataset was supplied on 2026-08-28 at `transcript-harvester/downloads/Learn Astrology in Telugu`.

- Full manifest: 215 public playlist items
- Successfully harvested: 103 videos / 43.41 hours
- First-100 coverage: 69 videos / 26.34 hours
- First-100 missing positions: 2, 5, 6, 10, 11, 12, 18, 19, 23, 24, 28, 33, 37, 38, 45, 46, 47, 48, 51, 52, 53, 58, 59, 60, 65, 67, 81, 87, 88, 95, 99
- Caption source: 102 auto-generated Telugu tracks and one manual Telugu track across the full harvested set
- Representations: timestamped JSON, Markdown, SRT and plain text
- Failure mode for missing items: YouTube HTTP 429 during harvesting

The harvested text is usable for source discovery and timestamped analysis, but automatic Telugu captions contain recognition errors, English-code-switching errors and overlapping subtitle intervals. They are not authoritative quotations or calculation specifications. No interpretive rule is approved merely because it appears in a transcript.

Status vocabulary:

- `catalogued`: identity, order and topic verified
- `transcribed`: Telugu speech captured for private analysis
- `summarised`: concepts and examples paraphrased with timestamps
- `cross_checked`: compared with named primary/traditional sources
- `reviewed`: checked by a Telugu-language practitioner or scholar
- `approved`: safe to expose through Sahadeva

Current status of positions 1–100: 69 `transcribed`; 31 `catalogued` only. All remain unapproved pending summarisation, cross-checking and review.

## Curriculum map

| Positions | Episodes | Topic family | Product destination |
|---|---:|---|---|
| 1–20 | intro–19 | foundations, signs, houses, dasha, transit, lagna, navamsa, remedies and reading workflow | glossary, methodology and chart facts |
| 21–46 | 20–45 | yogas, doshas, nakshatra introduction, house division, retrogression, combustion, dignity and badhaka | deterministic rule candidates plus interpretation evidence |
| 47–59 | 46–58 | Shadbala components, Ashtakavarga and reading/activation techniques | calculation specifications and test fixtures |
| 60–87 | 59–86 | 27 nakshatras plus Abhijit | Telugu knowledge cards; never calculation constants without independent verification |
| 88–97 | 87–96 | graha overview and Sun through Ketu | significations and interpretation evidence |
| 98–100 | 97–99 | Shodashavarga overview, D2 Hora and D3 Drekkana | varga calculation specifications and chart UI |

## Required extraction record per video

Each lesson must produce one record with:

1. playlist position, episode number, video ID, title and URL;
2. language and transcription method;
3. timestamped concept summaries in Telugu and English;
4. every explicit calculation rule, with inputs, output and boundary behaviour;
5. every interpretive claim, including exceptions and combinations;
6. the school or method claimed by the presenter (Parashari, KP, Western or RVA-specific);
7. worked examples and whether enough birth data is shown to reproduce them;
8. ethical warnings, uncertainty statements and remedy claims;
9. independent textual/astronomical corroboration;
10. reviewer identity, decision and review date.

## Admission rules for Sahadeva

- A video claim is evidence, not authority.
- Never silently combine Parashari, KP, Western and RVA-specific rules.
- Calculation rules require independent specifications and automated boundary tests.
- Interpretations must cite the lesson and show the active method to the user.
- Medical, legal, financial, fertility, longevity and death predictions are not promoted as facts.
- Remedy recommendations must be clearly framed as traditional/cultural practices, never guaranteed outcomes.
- Raw copyrighted transcripts are not shipped in the application or returned by MCP.

## Immediate implementation relevance

The final three videos in this slice directly inform the next chart milestone: the complete Shodashavarga engine. D2 and D3 mappings must be cross-checked against traditional specifications before changing the current clean-room implementation. Episodes 46–56 define a later calculation milestone for Shadbala and Ashtakavarga. Episodes 59–85 provide a coherent review set for the existing 27-nakshatra calculations and Telugu presentation.
