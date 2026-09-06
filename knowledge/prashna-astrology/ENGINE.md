# Sahadeva Prashna Engine

Every emitted observation now resolves through the executable registry in `shared/prashnaRules.ts`. A registered family declares its tradition, sources, locators, normalized statement, required inputs, effect, exceptions, maturity and test obligations. Unregistered rule identifiers fail instead of appearing as uncited judgment evidence.

`knowledge:prashna:verify` also runs a registry-contract audit. It rejects duplicate or malformed rule families, empty source/locator/input/exception/test metadata, unknown source IDs, unresolved emitted observations, provenance drift, and duplicate rule-plus-fact evidence within a consultation. Its installed-state test exercises every question category across Classical, Tajaka and Systems namespaces; mutation fixtures prove each failure mode is detected.

## Contract

The engine is deterministic, tradition-aware and evidence-carrying. It calculates structural testimonies; it does not claim scientific validation or guarantee an outcome. Every observation carries a rule ID, convention version, source IDs and review status.

## Request inputs

- Exact question and question category.
- Place, latitude, longitude and IANA timezone.
- Server receipt time is the default question moment.
- Tradition: integrated comparison, classical, Tajaka, Systems' Approach, or Prashna Nadi/KP.
- Optional derived/reference house when asking for another person.
- A required 1–249 seed number when using the Prashna Nadi UI.

## Question topology

The engine no longer assumes that one topic equals one house. Each category has a source-located role map containing one primary house and supporting or conditional houses. Examples include physician/disease/patient/treatment for health, and querent/thief/property/recovery for lost objects. Derived-house rotation is applied to every role when the question concerns another person.

The primary lost-property house is the 4th, following Raman's worked example VIII; the 2nd remains the movable value. The primary litigation/opponent house is the 7th, while the 6th remains supporting conflict testimony. These distinctions prevent a supporting house from silently replacing the subject itself.

## Implemented calculations

### Common foundation

- Lahiri sidereal question-time D1.
- Whole-sign topic house and derived-house rotation.
- Event-house lord, placement, dignity and combustion.
- Event-house occupants and natural-benefic/malefic structural testimony.
- Moon house and boundary-sensitivity reporting without treating proximity as an automatic radicality veto.
- Source-aware observations, contradictions, uncertainty and outcome tracking.

### Classical

- Lagna Navamsa index.
- Odd/even-sign Dhatu–Moola–Jeeva cycle from Chappanna. Daivajna Vallabha Chapter X verses 12–13 now supplies a separate sign-and-influence classifier: its three planet families are checked by conjunction and classical graha drishti, strict sign matches are distinguished from influence-only candidates, and mixed families remain visibly mixed. Neither non-scoring classifier overwrites the other.
- *Daivajna Vallabha* Chapter X verses 6–8: all twelve rising-sign long/medium/short rows and all seven classical planet color/shape pairs are encoded. Verse 4's local strength instruction is implemented using the natural friendship table in *Prasna Marga* Part II: own, friendly, neutral and inimical D9 lords rank in that order. A unique highest tier selects one descriptor; missing D9 input or an equal highest tier abstains. Generic Shadbala is never used as an unstated tie-break.
- *Daivajna Vallabha* Chapter X verses 3–4: the same unique local-strength planet supplies a neutral house-to-subject classification for houses 1, 3–7, 9 and 10. Houses 2, 8, 11 and 12 remain unmapped. The translation names both “sister” and “enemy” after one remaining house, so house 6 retains both candidates. A strength tie or missing D9 data produces no inferred subject.
- Dignity, angular/dusthana placement and event-house occupants.
- *Daivajna Vallabha*, Chapter III verses 1–5: natural-benefic and malefic gain houses, status/honour/wealth placements, Moon-aspect branches, the complete quick-gain arrangement, all four Sun–Moon combinations, and fixed/movable/dual status testimony. Correlated placements are aggregated while genuine opposing axes—including verse 2's shared third-house branch—remain independent. “Immediate” is not converted into a date.
- *Daivajna Vallabha*, Chapter VI verses 1–3, 5–6 and 10: return combinations for a person abroad, quick/happy/with-gains/home-entry refinements, and independent untroubled-journey versus difficulty testimony. All return clauses form one correlated observation; deterministic death, imprisonment and permanent-confinement claims in verses 4 and 7–9 are catalogued but never executed.
- *Daivajna Vallabha*, Chapter VIII verses 3, 4, 6 and 7: malefic-aspect hardship, literal multi-gate recovery, Moon-Upachaya/benefic-house or benefic-ascendant-aspect relocation testimony, full-Moon/Jupiter, and angular Jupiter–Venus clauses. Recovery clauses aggregate once and are explicitly symbolic—not diagnosis, prognosis or medical advice. Deterministic death passages and verse 8's contradictory reverse branch are catalogued but not executed.
- *Prasna Marga* Part II, Chapter XVII stanza 27: Venus and the seventh lord must both occupy Upachayas (3, 6, 10 or 11). Raman's immediately following children analogue is separately encoded for Jupiter and the fifth lord, and is labelled as prosperity after birth rather than a promise of conception or birth.
- *Prasna Marga* Part II, Chapter XVIII stanzas 18 and 22: the specified Mars–fifth-house–Jupiter-aspect combination and strong Jupiter in houses 1, 5 or 7 without natural-malefic aspect. Stanza 22 uses only the strength definition supplied by Raman's adjacent note and evaluates the Moon and Mercury conditionally rather than treating them as permanently benefic.
- *Daivajna Vallabha*, Lost Property chapter verse 10: Venus in the second, Jupiter in the twelfth and a conditionally natural benefic in the ascendant. It is emitted as recovery support, never as a guarantee.
- *Daivajna Vallabha*, Lost Property chapter verse 14: full Moon, Jupiter, Venus or eligible Mercury in the ascendant, or a natural benefic in the seventh. Multiple simultaneous alternatives are aggregated into one weighted observation to prevent evidence multiplication.
- *Daivajna Vallabha*, Lost Property chapter verse 8: the rising decanate classifies the case as stolen, fallen, or forgotten within the house. This remains neutral symbolic classification and is never presented as proof of theft or culpability.
- *Daivajna Vallabha* Lost Articles verse 9 plus *Chappanna/Prasana Sastra* stanza 41: direction comes from a sole angular planet, the unique Shadbala-strongest angular planet when several occur, or the rising-sign cardinal direction when angles are empty. All eight planet directions and twelve sign directions are locked. Ketu, ties, incomplete strength, and the unavailable whole-sign Lagna/Bhava-Bala comparison cause visible abstention. The rising Navamsa ordinal, completed count, and fifth-Navamsa marker are exposed, but the damaged “elapsed/from the 5th” wording prevents selection of one Yojana distance.
- *Daivajna Vallabha*, Lost Articles verses 1–3: D1 modality, D9 modality and Vargottama supply location-only testimony for same place, elsewhere or outside the house. Every matching clause is retained in one neutral observation; directly incompatible D1/D9 indications are labelled conflicting. The accompanying known-person, outsider, neighbour, sex and form claims are excluded and cannot identify or accuse anyone.
- *Daivajna Vallabha*, Lost Property chapter verses 11–15: verse 11's explicit full-Moon-in-ascendant alternative and the overlapping benefic-house recovery clauses in verses 12, 13 and 15 are evaluated separately but collapsed into one correlated observation and one weight. Verse 11's undefined “very strong benefic” threshold and ambiguous Sirshodaya grammar remain inactive. Verse 16 retains its adverse malefic-owned/aspected ascendant clause and supportive benefic-occupant/aspector clause in one mixed-capable observation. Verse 17 contributes one non-recovery observation from either its named-sign own-Navamsa/aspect gate or its Mars-in-eighth named-Navamsa gate; simultaneous alternatives are deduplicated.
- *Daivajna Vallabha*, Chapter IV verse 1: movable, fixed and half-dual rising modes for travel, with the dual-sign transition fixed at the exact 15° boundary.
- *Daivajna Vallabha*, Chapter IV verses 2–4: named ascendant occupants, the verse-2 retrograde reversal, fixed-sign journey interruption, and distinct eleventh-house early-journey versus twelfth-house return testimony. Opposing clauses remain separate observations.
- *Daivajna Vallabha*, Chapter IV verses 5–6: the dual Jupiter/Saturn aspect no-return predicate and the literal three-house, independently malefic-aspected no-travel arrangement. Verse 7 is catalogued but not executed because the installed translation states placements without an outcome.
- *Daivajna Vallabha*, Chapter IV verses 8–10: every planet's sign-count × Navamsa-modality return-month candidate is calculated, but none is selected until the source's strongest-planet hierarchy is verified. A bounded ephemeris search separately exposes retrograde windows for the seventh lord under verse 10, refining bracketed station boundaries to one minute and labelling interval-edge truncation; neither mechanism creates a guaranteed return date.
- *Daivajna Vallabha*, Chapter XII verses 1, 3, 4 and 11–13: overlapping Moon-house/aspect, strong-Venus and movable-sign promise clauses and malefic-contact obstacle clauses are each clustered into one observation to prevent evidence multiplication. Verse 12 narrowly treats “strong Venus” as own-sign or exalted; verse 13 requires every stated conjunctive gate. Verse 3's Saturn-in-seventh even/odd sign branch remains separate. The ambiguous count in verse 1's “benefics in quadrants and trines” phrase is explicitly unresolved.

Marriage verse 2 and verses 5–10 are present in the source but are catalogued as non-executable because they profile a third party's appearance or make deterministic mortality, widowhood, sexual-character or moral-character claims from isolated placements. Lost-article identity/profile verses are likewise retained for study without being used to accuse a person. Chapter VI verses 4 and 7–9 are preserved without executing their deterministic death, imprisonment and permanent-confinement claims about an absent third party. Chapter VIII verses 1–2, verse 5's death branch and verse 8 are preserved without producing mortality or contradictory medical-course verdicts. This is explicit rule disposition, not silent omission or replacement with a softened invented rule.

### Tajaka

- Planet-specific deepthamsas from *Prasna Tantra*, Chapter IV, stanzas 52–53.
- Friendly trine/sextile and hostile square/opposition classification with stated aspect strengths.
- Circular aspect geometry treats 0° and 360° as the same conjunction, including applying and separating motion across the Aries boundary.
- Applying Ithasala and separating Easarapha candidates, including Poorna status within one degree.
- Nakta and Yamaya light-transfer candidates using the source's planetary speed order. Both intermediary contacts must be applying; Nakta additionally requires the faster intermediary to perfect with the faster principal before carrying the light to the slower one, while Yamaya requires both faster principals to apply to the slower collector. Stationary, separating and reversed/crossed sample geometries are rejected.
- Kamboola eligibility plus Uttamottama, Uttamadhama, and the D3/D9/D12-decidable Madhyamottama and Madhyama grades. Conditions needing Hadda or Panchadhikara remain explicitly unresolved.
- The career-specific Kamboola of *Prasna Tantra* stanza 112: the ascendant and tenth lords must form Ithasala, the Moon must apply to either and occupy an angle, and an own-sign angular Moon is retained as the text's stronger `enlarged-position` qualification. When it fires, this topic rule replaces rather than duplicates the generic Kamboola score.
- The stanza-109 career exchange: the ascendant lord must occupy the tenth sign and the tenth lord the ascendant sign. Support fires only when neither receives an encoded conjunction or in-deepthamsa aspect from a third-party malefic; a failed affliction gate abstains rather than inventing a denial. Nodes are conjunction-only because this edition gives them no deepthamsa.
- Stanza 113 object-realisation obstruction: the ascendant-lord dispositor in houses 6, 8 or 12, combustion of the ascendant lord, and 4th/10th sign-based squares involving that dispositor are computed. The sign geometry follows Raman's 31 January 1969 job-interview example, where Moon is 10th from Jupiter despite being outside combined deepthamsa. Simultaneous clauses become one evidence observation, preventing correlated obstruction language from being counted two or three times.
- Stanzas 108, 109(b), and 110–111 remain catalogued but non-executable where they depend on an unspecified planet-to-house aspect convention, an unspecified benefic, or an undefined strong/weak threshold. Their executable sibling clauses are not withheld with them.

These remain labelled candidates until Raman's worked examples reproduce under a reconciled edition-specific chart convention and the remaining interference conditions are implemented.

All twelve Raman examples now have at least a sign reconstruction and one printed-geometry or structural fixture. Central aspect chains reproduce in examples II–IV and VI–XI; example I is partial, example V contains an applying/separating discrepancy awaiting image recheck, and example XII conflicts. Example I's two Mars Ithasala claims and example XII's Sun–Venus Ithasala claim calculate as separating under the same printed positions and stated speed order; they are retained in an exported conflict ledger rather than forced. Full verdict/timing-chain reproduction and the reconstructed ascendant degrees remain incomplete.

### Systems' Approach

- MEP projected from the effective ascendant degree.
- Functional-malefic candidates from moolatrikona ownership of houses 6, 8 or 12, with Rahu and Ketu included.
- Close event-house MEP affliction within the currently versioned five-degree structural convention.
- Close functional-malefic conjunction or declared full-aspect affliction to a planet, kept distinct from intrinsic weakness. Worked Chart 36's Gemini-lagna Ketu-in-Aries ninth-aspect topology to the Moon in Sagittarius is reproduced; its OCR-uncertain printed degrees are not claimed as an exact numerical fixture.
- Dignity, combustion and event-house structure.
- Operating Vimshottari main/sub/sub-sub lords with the source's three explicit activation layers: general significations, moolatrikona-owned house and occupied house. Functional nature and weakness remain separate qualifiers; the damaged OCR passage is not used to invent favorable/adverse period synthesis.
- Source-located sub-period/transit interaction: the sub-period lord sets the trend; close functional-malefic conjunctions or full aspects are tested against the event-house MEP, the natal sub-period-lord position and the transit sub-period-lord position. The five-degree influence scale is reused, self-contact is not double-counted, and a functional benefic is marked capable of blessing fully only when strong in both radix and transit. Consultations expose a neutral snapshot.
- Bounded forward transit-contact search uses the shared Lahiri ephemeris, retains event-MEP, natal-sub-lord and moving-sub-lord contacts separately, groups contiguous samples, and records the strongest sampled point. Bracketed ingress and egress are refined to one minute when the sampling step is coarser; interval-edge windows remain visibly truncated. Peaks remain sample-based and windows are never event promises.

### Prashna Nadi/KP

- Algorithmic Vimshottari star, sub and sub-sub division.
- A generated 249-segment zodiac formed by splitting the 243 stellar sub spans at sign boundaries.
- Continuous 0°–360° validation and seed range checks.
- Seed segment start, end and midpoint are exposed, but Reader VI's beginning-of-sub rule now makes the segment start—not its midpoint—the effective numbered-horary ascendant.
- Numbered-horary Placidus cusps are calculated by inverting the selected sidereal first cusp to local apparent sidereal time at the judgment latitude; timestamp cusps are not substituted for a seed-selected ascendant.
- Seed ascendant and relevant planet star/sub/sub-sub evidence.
- Existing KP preview API remains backward compatible.

The installed Taneja source's KP convention is implemented by adding 6′ to Lahiri ascendant and planetary longitudes (equivalently subtracting 6′ from Lahiri ayanamsa). It remains source-located but unreproduced against Reader VI examples. Placidus unequal cusps and their star/sub/sub-sub rulers are calculated without substituting whole-sign/Sripati values and reproduce six independent Swiss Ephemeris vectors across 1950–2026, both hemispheres, the equator and 64° north within a 0.54-arcsecond fixture tolerance. Event judgment remains gated on source-rule reproduction.

The Taneja node-coordinate sequence is also calculated separately: conjoined planets, aspecting planets, sign lord, then the node's occupied house. Rahu and Ketu are not assigned sign lordship. The distinct Reader VI hierarchy is now calculated as conjoined planets, node star lord, aspecting planets, then sign lord; duplicates retain their earliest precedence. The two conventions remain visibly separate.

A source-located event-house registry now retains Reader VI combinations for first marriage, child birth, competitive examinations, employment, foreign travel, litigation success, lost-property recovery/non-recovery, disease and cure. Its evaluator reports complete, incomplete or mixed matches; it does not turn a static match into a promise until the topic's required cusp, retrograde and period conditions are reproduced.

For numbered consultations, the directly sourced cusp predicates for college admission, foreign travel, litigation success and property sale execute against the seed-derived Placidus chart. A clear match is supporting evidence, a source-defined retrograde gate is opposing evidence, and a missing static combination remains neutral rather than becoming an unsupported denial.

The currently operating Dasa, Bhukti and Antara are also evaluated against the event registry for marriage, children, education, career, travel, litigation, property sale, lost-property recovery and health. Their house portfolios are combined, every level must contribute at least one required house, adverse houses remain a separate mixed axis, a retrograde constellation lord blocks activation, and a retrograde period lord is labelled delay. This is neutral current-period structure—not a future-period search or transit date.

The operating Vimshottari timeline is recalculated from the KP-corrected Moon rather than inherited from the Lahiri chart. A locked boundary test proves that the 6′ correction can cross into the next nakshatra and change the Dasa lord.

The same timeline is searched forward for broad conjoined Dasa–Bhukti–Antara candidates. Every period lord must be common to the Reader VI ruling-planet set and the topic's significators, every level must contribute, their combined houses must complete the event predicate, and retrograde-star rejection still applies. Returned intervals are explicitly marked `transitPinning: required`; they are exposed as neutral research evidence and are not placed in the consultation's completed timing windows.

Transit pinning now has a source-constrained event registry and bounded forward search. Five Reader VI worked patterns are registered for vehicle purchase, vehicle-disposal day, vehicle-disposal clock time, foreign-travel date and medicine receipt. The examples use the Sun to narrow a broad period to a date, the Moon to select a day or fast delivery, and the ascendant to select a clock time; the engine decomposes the relevant KP longitude into sign, star, sub and sub-sub rulers and searches only the exact levels stored for that event. Matching samples are grouped into windows, bracketed ingress/egress is refined to one minute, and interval-edge truncation is explicit. The same VSOP87 Sun, active lunar model, sidereal-time ascendant, mean Lahiri ayanamsa and corpus-specified KP 6′ correction are used throughout; a 50,000-point guard prevents accidental unbounded scans.

The dated 23 June 1969 vehicle-disposal refinements reproduce: the Moon occupies Moon-ruled Hasta and the 3:30 PM Bombay ascendant is approximately Libra 18°, Venus sign–Rahu star–Sun sub. The 9 February 1969 friend-arrival example also reproduces at both printed Taurus 22°50′ and the stated 1:48 PM Bombay instant, including Venus sign–Moon star–Sun sub–Rahu sub-sub and a refined window containing that instant. The 13 December 1968 cash-messenger return reproduces Venus/Sun/Saturn/Mercury at 4:00 PM Madras, although its separately printed Taurus 2°30′ falls in Jupiter sub/Moon sub-sub and is retained as an internal source-coordinate conflict. Four other registered printed patterns conflict partly with installed historical astronomy: 18 October 1974 gives Mercury rather than Ketu sub; 28 April 1971 is already in Venus rather than Ketu star; the 15 September 1969 medicine-receipt Moon reproduces Libra, Rahu star and Venus sub-sub but gives Saturn rather than Jupiter sub; and the 21 September 1969 trunk-call's printed Libra 29°20′ matches Venus/Jupiter/Sun/Venus exactly while the stated 9:41 AM civil instant computes Moon sub/Rahu sub-sub and a matching window ending before that minute. All mismatches are stored by name. Because Reader VI varies which levels are decisive, no universal match count, exact date or automatic verdict is asserted; wider event registration and independent ephemeris certification remain maturity gates.

Reader VI worked-case conformance includes printed horary-number boundaries 48, 184 and 203 plus the 21-9-1969 trunk-call ruling-planet roles. That example omits Rahu/Ketu node agents implied by the chapter's general rule even though its chart places the nodes in Aquarius/Leo. The engine exposes this as a named source conflict and returns core roles plus separately labelled rule-driven node agents.

Reader VI's number-203 cusp example is also locked. The OCR reads 25°20′ near its ayanamsa instruction, while the same section's 1970 convention and printed Aquarius 16° ascendant require 23°20′; the latter reproduces the printed cusp table within its historical rounding precision. This is exposed as a named source conflict and is not used to certify the modern 6′ correction.

Tajaka worked-case conformance locks printed-longitude checks across all twelve Raman examples. The current machine-readable report has 12 cases and 21 checks: 17 pass and 4 fail. Every input remains sign-only because the printed ascendant degrees do not reproduce, so zero cases are labelled fully conformant. The fixture is frozen to the installed source Markdown hash and remains separate from historical chart reconstruction and outcome evaluation.

The algorithmic 1–249 partition reproduces Reader VI's printed number 203 interval (Capricorn 22°40′–23°20′, Moon star, Sun sub) and number 184 start (Sagittarius 25°53′20″, Venus star, Ketu sub). These are locked source fixtures rather than self-consistency tests.

Outcome follow-up dates are evaluation reminders only. They are not returned as astrological timing windows; timing remains unavailable until source-located rules reproduce reviewed worked examples.

## Scoring and abstention

- Neutral calculation facts carry no score.
- Supportive and challenging testimonies have explicit weights.
- The normalized structural score is bounded to −100…100.
- Boundary-sensitive charts remain usable but receive reduced confidence and explicit reasons. Only a source-defined radicality failure may return `chart-unfit`.
- Missing capabilities appear in the response and UI.
- Integrated mode keeps school-specific source IDs, but its final conflict-resolution precedence remains unreviewed; users should inspect the separate testimonies.
- Standalone Systems and KP/Nadi results reject Classical/Tajaka natural-benefic, dignity, angular/dusthana and Moon-house heuristics; those school verdicts remain namespace-isolated.

## Evaluation contract

`shared/prashnaEvaluation.ts` evaluates only frozen retrospective-holdout or prospective-blind records. Every eligible record requires an engine version, a pre-outcome 64-character prediction hash, a question fingerprint and explicit outcome blinding. Duplicate IDs and fingerprints, unblinded records, predictions frozen after the outcome, and known-outcome book examples are excluded with machine-readable reasons.

The report includes confusion counts, accuracy with a Wilson 95% interval, balanced accuracy, abstention and unresolved rates, majority/random baselines, and separate rows by tradition and category. Partial outcomes are reported but not forced into a binary accuracy calculation. Brier score remains explicitly unavailable because structural rule weights are not calibrated probabilities; a category-prior baseline likewise requires a disjoint training cohort.

Worked book examples continue to test source conformance only. `evaluatePrashnaSourceConformance` reports every case and failed check—without exclusions—by source, chapter, category and rule, while separately counting exact, sign-only and failed input reconstruction. It stores no outcomes and cannot be recycled as evidence that the engine predicts independent events.

## Source namespaces

- `book-application-prasna-astrology`
- `book-chappanna-prasana-sastra`
- `book-neelakanta-prasna-tantra`
- `book-umang-taneja-prashna-nadi`

No source is marked publishable merely because it is present. Page-level rule extraction and practitioner review remain separate gates.

## Remaining high-value implementation

1. Independent KP New Ayanamsa validation and Reader VI event-rule reproduction.
2. Cuspal sub-lord, ruling-planet and node-signification precedence.
3. Reviewed category-specific KP house combinations and DBA/transit delivery.
4. Hadda/Panchadhikara support from the external *Varshaphal* Chapter III explicitly referenced by Raman, source-specific Tajaka prohibitions, and remaining Kamboola grades.
5. Classical stanza rules for theft, direction, traveller, illness, conflict and timing.
6. Reproduce exact-degree Systems' Approach worked charts and verify the damaged major-period favorable/adverse paragraph from a cleaner scan. Transit contact peaks now retain the best sample and refine its local bracket continuously to one-minute time tolerance.
7. Page-level citations and worked/counterexample fixtures for every activated rule.

## Tests

- KP partition length, continuity, first rulership and invalid seeds.
- Tajaka applying versus separating motion.
- Tradition isolation, provenance, seed use, derived houses, remedies and structural safety.
- Worker API/MCP regression coverage.
