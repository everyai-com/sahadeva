# Classical Jyotish Texts — Parsed Corpus

Source PDFs parsed to markdown via Firecrawl Fire-PDF (`/v2/parse`), 2026-08-29.
Large books were split into 75-page chunks locally (pypdf), parsed per-chunk, and stitched.

| File | Author | Work | Pages | Words |
|------|--------|------|-------|-------|
| [sanjay-rath_vedic-remedies-in-astrology.md](sanjay-rath_vedic-remedies-in-astrology.md) | Sanjay Rath | Vedic Remedies in Astrology | ~200 | ~133k |
| [jn-bhasin_sarvarth-chintamani.md](jn-bhasin_sarvarth-chintamani.md) | J.N. Bhasin | Sarvarth Chintamani (12 Houses) | 374 | ~130k |
| [visti-larsen_jyotisha-fundamentals.md](visti-larsen_jyotisha-fundamentals.md) | Visti Larsen (2003) | Jyotisha Fundamentals — A Traditional Approach ("My Master's Words") | 383 | ~152k |
| [bm-gosvami_lal-kitab.md](bm-gosvami_lal-kitab.md) | B. M. Gosvami | Lal Kitab | 778 | ~211k |
| [application-of-prasna-astrology.md](../prashna-astrology/texts/application-of-prasna-astrology.md) | V. K. Choudhry and K. Rajesh Chaudhary | Application of Prasna Astrology | 119 | ~33k |
| [chappanna-or-prasana-sastra.md](../prashna-astrology/texts/chappanna-or-prasana-sastra.md) | B. Suryanarain Rao | Chappanna or Prasana Sastra | 100 | ~26k |
| [sri-neelakanta_prasna-tantra.md](../prashna-astrology/texts/sri-neelakanta_prasna-tantra.md) | Sri Neelakanta; translated by B. V. Raman | Prasna Tantra | 123 | ~50k |
| [umang-taneja_prashna-nadi-astrology.md](../prashna-astrology/texts/umang-taneja_prashna-nadi-astrology.md) | Umang Taneja | Prashna Nadi Astrology A Contemporary Treatise (incomplete supplied DOCX) | Chapters 1-7 | ~46k |

## Notes
- Fire-PDF preserves reading order, tables, and multi-column layout; occasional Sanskrit/Devanagari OCR glyphs may appear inline.
- `bm-gosvami_lal-kitab.md` was parsed through Firecrawl Fire-PDF in eleven bounded source-page chunks and stitched in order; rule-critical wording and numerical combinations still require comparison with the scan before publication.
- `prashna-astrology.md` was parsed through Firecrawl Fire-PDF with forced OCR across all 119 pages; astrological charts were reconstructed where possible, but chart degrees and OCR-sensitive wording still require comparison with the scan.
- `chappanna-or-prasana-sastra.md` was parsed through Firecrawl Fire-PDF with forced OCR across all 100 pages; the source is an aged scan, so damaged type, Sanskrit transliteration, numerical rules, and charts require comparison with the PDF.
- `sri-neelakanta_prasna-tantra.md` was parsed through Firecrawl Fire-PDF with forced OCR across all 123 PDF pages; many scans contain two printed pages, and rule-critical tables, charts, and examples require comparison with the PDF.
- `umang-taneja_prashna-nadi-astrology.md` was extracted from the supplied DOCX using its native paragraph, table, and image structure. The source renders with many blank or fragmented pages and ends during Chapter 7 despite listing Chapters 1-11, so it is an incomplete reference; chart details require source verification.
- These are copyrighted classical/modern texts held for reference and grounding only — do not republish verbatim.
