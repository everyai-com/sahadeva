# Prashna Astrology Collection

This folder groups Sahadeva's source books and AI-readable texts concerning Prashna, horary, and Nadi horary astrology.

## Collection

| Work | Author or translator | Original | AI-readable text |
|---|---|---|---|
| Application of Prasna Astrology | V. K. Choudhry and K. Rajesh Chaudhary | [PDF](books/application-of-prasna-astrology.pdf) | [Markdown](texts/application-of-prasna-astrology.md) |
| Chappanna or Prasana Sastra | B. Suryanarain Rao | [PDF](books/chappanna-or-prasana-sastra.pdf) | [Markdown](texts/chappanna-or-prasana-sastra.md) |
| Prasna Tantra | Sri Neelakanta, translated by B. V. Raman | [PDF](books/sri-neelakanta_prasna-tantra.pdf) | [Markdown](texts/sri-neelakanta_prasna-tantra.md) |
| Prashna Nadi Astrology A Contemporary Treatise | Umang Taneja | [DOCX](books/umang-taneja_prashna-nadi-astrology.docx) | [Markdown](texts/umang-taneja_prashna-nadi-astrology.md) - supplied file ends during Chapter 7 |
| Prashna Astrology and Remedies, Volume I | M. K. Viswanath Nair | [PDF](books/mk-viswanath-nair_prashna-astrology-remedies-vol-1.pdf) | [Markdown](texts/mk-viswanath-nair_prashna-astrology-remedies-vol-1.md) |
| Prasna Marga, Part I | Panangadu Nambudhiri; translated and annotated by B. V. Raman | [PDF](books/b-v-raman_prasna-marga-vol-1.pdf) | [Markdown](texts/b-v-raman_prasna-marga-vol-1.md) |
| Prasna Marga, Part II | Panangadu Nambudhiri; translated and annotated by B. V. Raman | [PDF](books/b-v-raman_prasna-marga-vol-2.pdf) | [Markdown](texts/b-v-raman_prasna-marga-vol-2.md) |
| Horary Astrology / KP Reader VI | K. S. Krishnamurti | [PDF](books/k-s-krishnamurti_horary-astrology-kp-reader-vi.pdf) | [Markdown](texts/k-s-krishnamurti_horary-astrology-kp-reader-vi.md) |
| Daivajna Vallabha | attributed to Varahamihira | [PDF](books/varahamihira_daivajna-vallabha.pdf) | [Markdown](texts/varahamihira_daivajna-vallabha.md) |

## Structure

- `books/` contains the preserved source documents.
- `texts/` contains searchable Markdown for AI retrieval.
- `assets/` contains figures extracted from source documents.
- [CORPUS-STUDY.md](CORPUS-STUDY.md) is the working study map, method crosswalk, coverage ledger, and reliability guide for the available corpus.
- [MISSING-SOURCES.md](MISSING-SOURCES.md) prioritizes the books, computational conventions, and validation data still required for a fuller engine.
- [ENGINE.md](ENGINE.md) documents the implemented calculation contract, tradition-specific capabilities, abstention rules, and remaining work.
- [ENGINE-MATURITY-PLAN.md](ENGINE-MATURITY-PLAN.md) defines the source-learning, implementation, evaluation, review, safety, and production gates required to mature the engine.
- [RULE-CONSTRUCTION.md](RULE-CONSTRUCTION.md) defines how passages become executable rules and how rule maturity is enforced.
- [PRASNA-TANTRA-EXAMPLE-AUDIT.md](PRASNA-TANTRA-EXAMPLE-AUDIT.md) records reconstruction status and unresolved convention gaps for Raman's twelve worked charts.
- [corpus-manifest.json](corpus-manifest.json) is a generated hash, completeness and structure ledger for every preserved Prashna source file. Run `npm run knowledge:prashna` after an intentional corpus update and `npm run knowledge:prashna:verify` in audits.

Astrological charts, degrees, numerical rules, and remedies should be verified against the corresponding source document before publication or precise use.

Firecrawl preserved substantial heading and table structure in the new Prasna Marga and KP Markdown files, but returned no extracted image assets. Chart geometry and image-only tables therefore remain PDF-verification requirements.

The supplied Umang Taneja DOCX is incomplete: its contents list Chapters 1-11, but the document body ends during Chapter 7 around printed page 170.
