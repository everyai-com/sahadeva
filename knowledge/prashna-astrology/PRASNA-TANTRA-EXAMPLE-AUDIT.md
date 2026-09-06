# Prasna Tantra Worked-Example Audit

Source: B. V. Raman's translation of Sri Neelakanta's *Prasna Tantra*, “Some Examples”. The chapter contains twelve examples: wealth, mother's longevity, children, absent person, illness, marriage, strike, stolen property, lawsuit, foreign travel, job change and profession.

## Current reconstruction result

All twelve ascendant **signs** reproduce from the printed date, clock time and stated city using Sahadeva's current historical IANA timezone and Lahiri calculation. The printed ascendant **degrees do not yet reproduce** within one degree.

| Example | Printed ascendant | Current ascendant | Absolute gap |
|---|---:|---:|---:|
| 1 | 55.5333° | 52.2119° | 3.3215° |
| 2 | 162.1333° | 160.7220° | 1.4113° |
| 3 | 232.8667° | 231.5219° | 1.3448° |
| 4 | 279.2167° | 270.4482° | 8.7685° |
| 5 | 49.3167° | 55.3167° | 6.0000° |
| 6 | 248.0000° | 241.4121° | 6.5879° |
| 7 | 254.0000° | 252.1626° | 1.8374° |
| 8 | 2.3500° | 0.8147° | 1.5353° |
| 9 | 289.6000° | 277.8101° | 11.7899° |
| 10 | 24.6667° | 23.2678° | 1.3988° |
| 11 | 291.8500° | 290.4887° | 1.3613° |
| 12 | 136.6667° | 135.1490° | 1.5176° |

The cluster near 1.3°–1.8° suggests an edition-specific ayanamsa or historical computational convention. Larger gaps require checking the printed PDF charts, original city coordinates, whether local mean time or IST was actually used, rounding, typographical errors and the ascendant method employed by the edition.

## Release consequence

- These examples are `sign-reproduced`, not `reproduced` at the rule-registry maturity level.
- They may validate house/sign selection where the sign is stable.
- They must not validate degree-sensitive deepthamsa, timing, Navamsa or cusp rules.
- No convention should be tuned separately for each example merely to force agreement.

## Printed-rule geometry reproduction

Degree-sensitive geometry is also tested directly from the printed planetary longitudes, independently of the unresolved reconstructed ascendant degrees:

| Example | Geometry status | Evidence |
|---|---|---|
| I — wealth | Partial plus conflict | Venus–Mercury applying conjunction reproduces. The printed Mars–Venus and Mars–Mercury Ithasala claims calculate as in-orb but separating under the book's own speed order. |
| II — mother's longevity | Reproduced core | Mercury–Jupiter querent/mother applying conjunction reproduces; the remaining derived-house longevity synthesis is not treated as a degree-sensitive conformance rule. |
| III — child | Reproduced | Mars–Jupiter applying trine and Jupiter–Mercury applying sextile reproduce. |
| IV — absent person | Reproduced | Venus–Mars friendly applying sextile used for return reproduces. |
| V — illness | Partial plus conflict | Jupiter–Venus applying sextile reproduces. The text's explicitly applying Venus–Saturn claim calculates in-orb but separating from the printed positions. |
| VI — marriage | Reproduced | Jupiter–Mercury applying trine, Moon–Jupiter applying conjunction and core Kamboola geometry reproduce. |
| VII — strike | Reproduced | Moon–Jupiter applying trine and Moon–Sun separating trine reproduce the text's stated distinction. |
| VIII — stolen property | Reproduced | Venus–Jupiter applying trine and Moon–Saturn applying square reproduce. |
| IX — lawsuit | Reproduced core | Saturn–Moon plaintiff/defendant applying trine reproduces. |
| X — foreign travel | Reproduced structural negative | The absence of a direct Mars–Jupiter in-deepthamsa aspect reproduces. The house-to-planet Ithasala and later transit claim require a separately specified house-aspect convention. |
| XI — job change | Reproduced core | Retrograde Saturn–Mars applying opposition and Venus–Jupiter applying trine reproduce the strongest change links. |
| XII — profession | Conflict | The printed Sun 22°50′ and Venus 27°36′ Aries conjunction is separating because faster Venus is already ahead, despite the text calling it Ithasala. |

The two currently exported contradiction classes are `PRASNA_TANTRA_SOURCE_CONFLICTS`. Example V's Venus–Saturn applying/separating discrepancy is retained here pending a second inspection of the chart image before promoting it to that code ledger. The engine does not weaken the applying-motion definition to make examples pass. All twelve examples now have at least a sign reconstruction plus one printed-geometry or structural fixture; full verdict and timing-chain reproduction remains incomplete.

The executable fixtures are in `shared/prashnaExamples.test.ts`.

## Bhava Prasna job-interview example

The separate chart under stanza 113 (31 January 1969, 11:50 a.m. IST, Bangalore) is now reproduced from its fixed-sign South-Indian diagram: Libra rises; Venus is in Pisces; Venus's dispositor Jupiter is in Virgo, the twelfth house; and the Moon in Gemini is tenth by sign from Jupiter. The printed Jupiter–Moon separation is about 285.88°, or 15.88° from the exact 270° direction, yet the commentary explicitly calls the Moon tenth from Jupiter and a square. The stanza-113 implementation therefore uses the example's sign-based 4th/10th geometry rather than incorrectly imposing Chapter-IV deepthamsa. This case is locked in `shared/tajaka.test.ts`.

The machine-readable conformance fixture is in `shared/prashnaConformance.ts`, frozen to the installed Markdown SHA-256. Its current report contains all 12 cases and all 21 declared geometry checks: 17 pass and 4 fail. All 12 inputs remain `sign-only`, so the report correctly records zero fully conformant cases. Known outcomes are prohibited from this report and from accuracy evaluation.
