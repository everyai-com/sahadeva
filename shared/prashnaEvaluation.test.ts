import { describe, expect, it } from "vitest";
import { evaluatePrashnaCohort, evaluatePrashnaSourceConformance, type PrashnaConformanceRecord, type PrashnaEvaluationRecord } from "./prashnaEvaluation";

const hash = "a".repeat(64);
const row = (overrides: Partial<PrashnaEvaluationRecord> = {}): PrashnaEvaluationRecord => ({
  caseId: "case-1", caseFingerprint: "question-1", tradition: "classical", category: "career",
  cohort: "prospective-blind", direction: "supportive", outcome: "occurred", outcomeBlinded: true,
  sealedPredictionHash: hash, engineVersion: "prashna-4", frozenAt: "2026-01-01T00:00:00Z",
  outcomeRecordedAt: "2026-02-01T00:00:00Z", ...overrides,
});

describe("Prashna source conformance", () => {
  const conformance = (overrides: Partial<PrashnaConformanceRecord> = {}): PrashnaConformanceRecord => ({
    caseId: "tantra-vi", sourceId: "book-neelakanta-prasna-tantra", chapter: "Some Examples VI",
    category: "relationship", ruleId: "prashna:tajaka-kamboola-candidate",
    inputReproduction: "exact", notes: [], checks: [
      { checkId: "ithasala", kind: "activation", expected: "active", actual: "active", passed: true },
      { checkId: "timing-unit", kind: "timing-method", expected: "fixed-sign months", actual: "fixed-sign months", passed: true },
    ],
    ...overrides,
  });
  it("reports every check by source, chapter, category and rule without outcome scoring", () => {
    const report = evaluatePrashnaSourceConformance([
      conformance(),
      conformance({
        caseId: "tantra-xii", chapter: "Some Examples XII", category: "career",
        ruleId: "prashna:tajaka-ithasala-candidate", inputReproduction: "sign-only",
        checks: [{ checkId: "sun-venus", kind: "activation", expected: "applying", actual: "separating", passed: false }],
      }),
    ]);
    expect(report.summary).toEqual({
      cases: 2, fullyConformantCases: 1, exactInputCases: 1, signOnlyInputCases: 1,
      failedInputCases: 0, checks: 3, passedChecks: 2, failedChecks: 1, checkPassRate: 2 / 3,
    });
    expect(report.bySource).toHaveLength(1);
    expect(report.byChapter).toHaveLength(2);
    expect(report.byCategory).toHaveLength(2);
    expect(report.byRule).toHaveLength(2);
    expect(report).toMatchObject({ outcomeUse: "prohibited" });
    expect(JSON.stringify(report)).not.toContain("occurred");
  });
  it("keeps duplicate, invalid and empty-check cases visible as failures", () => {
    const report = evaluatePrashnaSourceConformance([
      conformance(),
      conformance({ checks: [] }),
      conformance({ caseId: "", sourceId: "", chapter: "", ruleId: "" }),
    ]);
    expect(report.cases).toHaveLength(3);
    expect(report.cases[1]).toMatchObject({ valid: false, validationFailures: ["duplicate-case-id", "no-conformance-checks"] });
    expect(report.cases[2].validationFailures).toEqual(expect.arrayContaining([
      "missing-case-id", "missing-source-id", "missing-chapter", "missing-rule-id",
    ]));
    expect(report.summary.fullyConformantCases).toBe(1);
  });
});

describe("Prashna evaluation", () => {
  it("computes confusion, accuracy, balanced accuracy, abstention and baselines", () => {
    const result = evaluatePrashnaCohort([
      row(),
      row({ caseId: "case-2", caseFingerprint: "question-2", direction: "challenging", outcome: "did-not-occur" }),
      row({ caseId: "case-3", caseFingerprint: "question-3", direction: "supportive", outcome: "did-not-occur", tradition: "tajaka" }),
      row({ caseId: "case-4", caseFingerprint: "question-4", direction: "mixed", outcome: "occurred" }),
      row({ caseId: "case-5", caseFingerprint: "question-5", outcome: "unresolved", outcomeRecordedAt: undefined }),
    ]);
    expect(result.sample).toMatchObject({ eligible: 5, resolved: 4, directional: 3, scored: 3 });
    expect(result.metrics).toMatchObject({ accuracy: 2 / 3, balancedAccuracy: 0.75, abstentionRate: 0.25, unresolvedRate: 0.2, brierScore: null });
    expect(result.metrics.confusion).toEqual({ truePositive: 1, trueNegative: 1, falsePositive: 1, falseNegative: 0 });
    expect(result.baselines).toMatchObject({ randomAccuracy: 0.5, majorityOutcomeAccuracy: 2 / 3, categoryPriorAccuracy: null });
    expect(result.byTradition).toHaveLength(2);
  });

  it("excludes known-outcome, unblinded, unsealed, post-outcome and duplicate cases", () => {
    const result = evaluatePrashnaCohort([
      row({ cohort: "known-outcome-regression" }),
      row({ caseId: "case-2", caseFingerprint: "question-2", outcomeBlinded: false }),
      row({ caseId: "case-3", caseFingerprint: "question-3", sealedPredictionHash: "bad" }),
      row({ caseId: "case-4", caseFingerprint: "question-4", outcomeRecordedAt: "2025-12-01T00:00:00Z" }),
      row({ caseId: "case-4", caseFingerprint: "question-5" }),
      row({ caseId: "case-6", caseFingerprint: "question-4" }),
    ]);
    expect(result.sample).toMatchObject({ supplied: 6, eligible: 0, excluded: 6 });
    expect(result.exclusions.map((item) => item.reason)).toEqual([
      "known-outcome-conformance-only", "outcome-not-blinded", "invalid-sealed-prediction-hash",
      "outcome-precedes-freeze", "duplicate-case-id", "duplicate-case-fingerprint",
    ]);
    expect(result.metrics.accuracy).toBeNull();
  });

  it("does not force partial outcomes into binary accuracy or invent probabilities", () => {
    const result = evaluatePrashnaCohort([row({ outcome: "partly-occurred" })]);
    expect(result.sample).toMatchObject({ resolved: 1, directional: 1, partiallyResolved: 1, scored: 0 });
    expect(result.metrics.brierStatus).toBe("unavailable-no-calibrated-probabilities");
    expect(result.metrics.accuracy).toBeNull();
  });
});
