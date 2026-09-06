# Prashna Rule Construction Standard

The engine does not turn a sentence into a prediction merely because it occurs in a book. It separates textual interpretation, astronomical calculation, rule execution and evaluation.

## How a rule is created

1. **Locate the passage.** Record the named edition, chapter, verse, page, table or chart. OCR line numbers are navigation aids, not final citations.
2. **Classify the passage.** Mark it as definition, calculation, testimony, exception, priority instruction, worked example, commentary or remedy. Commentary is not silently promoted to the status of a verse.
3. **Normalize the statement.** Express the rule without changing its scope. Preserve alternatives where Raman or another commentator supplies a different reading.
4. **Declare inputs.** List every required fact: chart basis, house system, significators, longitude, motion, dignity, aspect, divisional placement or topic. Before applying testimony, resolve the topic topology: actors, object, process, obstruction and fulfilment may belong to different houses. Exactly one role is primary; other houses remain supporting or conditional.
5. **Declare the effect.** A rule may support, oppose, qualify, classify or abstain. Promise, quality and timing are never collapsed into one effect.
6. **Record exceptions and conflicts.** Upachaya exceptions, derived houses, combustion, retrogression, interference and contradictory passages remain explicit.
7. **Assign a tradition.** Classical, Tajaka, Systems' Approach and KP/Nadi rules execute in separate namespaces. Integrated mode may compare them but may not rewrite them into a synthetic doctrine.
8. **Implement deterministic predicates.** The AI may explain results; it may not invent chart facts or decide that an unimplemented condition was met.
9. **Reproduce examples.** Add positive, negative, boundary and source-example fixtures. A rule with only a positive example is incomplete.
10. **Advance maturity.** Structural → located → reproduced → reviewed → calibrated. Public confidence cannot exceed rule maturity.

## Executable registry

The machine-readable registry is [`shared/prashnaRules.ts`](../../shared/prashnaRules.ts). Every emitted observation must resolve to one registry family. Automated tests reject observations without a definition or definitions without sources, locators, inputs and test obligations.

Dynamic observations use registered families. For example, `prashna:benefic-jupiter` resolves to the `prashna:benefic-` family, while keeping Jupiter as calculated evidence rather than creating an undocumented new doctrine.

## Current interpretation policy

- A verse and a translator's explanatory note are distinguishable evidence.
- OCR-damaged numbers and chart geometry are checked against the PDF before activation.
- A general rule does not override a more specific topic rule unless the source states that priority.
- Repeated statements are corroboration, not additional score weight.
- A planet can supply multiple independent testimonies, but the same fact cannot be counted twice under renamed rules.
- Missing inputs produce abstention, never a substituted house system or guessed longitude.
- Fatalistic statements about death, crime, pregnancy outcome or medical diagnosis are not automatically exposed as user-facing conclusions.

## What “understanding a book” means

A chapter is complete only when every substantive section is assigned to at least one of: vocabulary, executable rule candidate, exception, conflict, example, commentary, remedy or non-computational background. The chapter ledger must also record unresolved OCR and image dependencies. Merely generating Markdown or a prose summary does not meet this standard.
