import { evaluatePrashnaSourceConformance, type PrashnaConformanceRecord } from "./prashnaEvaluation";

export const PRASNA_TANTRA_CONFORMANCE_FIXTURE = {
  fixtureVersion: "prasna-tantra-examples-1",
  sourceId: "book-neelakanta-prasna-tantra",
  sourceMarkdownSha256: "e3f405bf218550635593937879ad87463f9044c31e9340cd9a634115298b1c1e",
  records: [
    [1, "money", "prashna:tajaka-ithasala-candidate", [["venus-mercury", true], ["mars-venus", false], ["mars-mercury", false]]],
    [2, "health", "prashna:tajaka-ithasala-candidate", [["mercury-jupiter", true]]],
    [3, "children", "prashna:tajaka-ithasala-candidate", [["mars-jupiter", true], ["jupiter-mercury", true]]],
    [4, "missing-person", "prashna:tajaka-ithasala-candidate", [["venus-mars", true]]],
    [5, "health", "prashna:tajaka-ithasala-candidate", [["jupiter-venus", true], ["venus-saturn", false]]],
    [6, "relationship", "prashna:tajaka-kamboola-candidate", [["jupiter-mercury", true], ["moon-jupiter", true], ["kamboola", true]]],
    [7, "litigation", "prashna:tajaka-ithasala-candidate", [["moon-jupiter-applying", true], ["moon-sun-separating", true]]],
    [8, "lost-object", "prashna:tajaka-ithasala-candidate", [["venus-jupiter", true], ["moon-saturn", true]]],
    [9, "litigation", "prashna:tajaka-ithasala-candidate", [["saturn-moon", true]]],
    [10, "travel", "prashna:tajaka-ithasala-candidate", [["mars-jupiter-no-direct-aspect", true]]],
    [11, "career", "prashna:tajaka-ithasala-candidate", [["saturn-mars", true], ["venus-jupiter", true]]],
    [12, "career", "prashna:tajaka-ithasala-candidate", [["sun-venus", false]]],
  ].map(([example, category, ruleId, checks]) => ({
    caseId: `prasna-tantra-example-${example}`,
    sourceId: "book-neelakanta-prasna-tantra",
    chapter: `Some Examples ${example}`,
    category,
    ruleId,
    inputReproduction: "sign-only",
    checks: (checks as Array<[string, boolean]>).map(([checkId, passed]) => ({
      checkId,
      kind: checkId.includes("no-direct") || checkId.includes("separating") ? "non-activation" as const : "activation" as const,
      expected: passed ? "printed geometry reproduced" : "printed claim",
      actual: passed ? "engine geometry agrees" : "engine motion disagrees",
      passed,
    })),
    notes: ["Ascendant sign reproduces; printed ascendant degree does not reproduce within one degree."],
  })) as PrashnaConformanceRecord[],
} as const;

export function installedPrasnaTantraConformanceReport() {
  return {
    fixtureVersion: PRASNA_TANTRA_CONFORMANCE_FIXTURE.fixtureVersion,
    sourceMarkdownSha256: PRASNA_TANTRA_CONFORMANCE_FIXTURE.sourceMarkdownSha256,
    ...evaluatePrashnaSourceConformance([...PRASNA_TANTRA_CONFORMANCE_FIXTURE.records]),
  };
}
