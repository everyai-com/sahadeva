import type { JudgmentDirection, QuestionCategory } from "./consultation";

export type PrashnaEvaluationRecord = {
  caseId: string;
  caseFingerprint: string;
  tradition: string;
  category: QuestionCategory;
  cohort: "known-outcome-regression" | "retrospective-holdout" | "prospective-blind";
  direction: JudgmentDirection;
  outcome: "occurred" | "did-not-occur" | "partly-occurred" | "unresolved";
  outcomeBlinded: boolean;
  sealedPredictionHash: string;
  engineVersion: string;
  frozenAt: string;
  outcomeRecordedAt?: string;
};

export type PrashnaConformanceCheck = {
  checkId: string;
  kind: "activation" | "non-activation" | "verdict" | "timing-method";
  expected: string;
  actual: string;
  passed: boolean;
};

export type PrashnaConformanceRecord = {
  caseId: string;
  sourceId: string;
  chapter: string;
  category: QuestionCategory;
  ruleId: string;
  inputReproduction: "exact" | "sign-only" | "failed";
  checks: PrashnaConformanceCheck[];
  notes: string[];
};

type Evaluated = PrashnaEvaluationRecord & { predicted: boolean; actual: boolean };

const wilson95 = (successes: number, total: number) => {
  if (!total) return null;
  const z = 1.959963984540054;
  const p = successes / total;
  const denominator = 1 + z * z / total;
  const centre = (p + z * z / (2 * total)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denominator;
  return { low: Math.max(0, centre - margin), high: Math.min(1, centre + margin) };
};

function metricRows(rows: Evaluated[]) {
  const tp = rows.filter((row) => row.predicted && row.actual).length;
  const tn = rows.filter((row) => !row.predicted && !row.actual).length;
  const fp = rows.filter((row) => row.predicted && !row.actual).length;
  const fn = rows.filter((row) => !row.predicted && row.actual).length;
  const accuracy = rows.length ? (tp + tn) / rows.length : null;
  const sensitivity = tp + fn ? tp / (tp + fn) : null;
  const specificity = tn + fp ? tn / (tn + fp) : null;
  return {
    count: rows.length,
    confusion: { truePositive: tp, trueNegative: tn, falsePositive: fp, falseNegative: fn },
    accuracy,
    accuracyWilson95: accuracy === null ? null : wilson95(tp + tn, rows.length),
    balancedAccuracy: sensitivity === null || specificity === null ? null : (sensitivity + specificity) / 2,
  };
}

/**
 * Descriptive evaluation for frozen Prashna predictions. Known-outcome book
 * examples remain conformance fixtures and are never admitted as blind outcome
 * evidence. No Brier score is manufactured from structural rule weights.
 */
export function evaluatePrashnaCohort(records: PrashnaEvaluationRecord[]) {
  const excluded: Array<{ caseId: string; reason: string }> = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const eligible: PrashnaEvaluationRecord[] = [];
  for (const row of records) {
    let reason: string | null = null;
    if (seenIds.has(row.caseId)) reason = "duplicate-case-id";
    else if (seenFingerprints.has(row.caseFingerprint)) reason = "duplicate-case-fingerprint";
    else if (row.cohort === "known-outcome-regression") reason = "known-outcome-conformance-only";
    else if (!row.outcomeBlinded) reason = "outcome-not-blinded";
    else if (!/^[a-f0-9]{64}$/i.test(row.sealedPredictionHash)) reason = "invalid-sealed-prediction-hash";
    else if (!row.engineVersion.trim()) reason = "missing-engine-version";
    else if (!Number.isFinite(Date.parse(row.frozenAt))) reason = "invalid-freeze-time";
    else if (row.outcome !== "unresolved" && !row.outcomeRecordedAt) reason = "missing-outcome-recorded-time";
    else if (row.outcomeRecordedAt && Date.parse(row.outcomeRecordedAt) < Date.parse(row.frozenAt)) reason = "outcome-precedes-freeze";
    seenIds.add(row.caseId);
    seenFingerprints.add(row.caseFingerprint);
    if (reason) excluded.push({ caseId: row.caseId, reason });
    else eligible.push(row);
  }

  const resolved = eligible.filter((row) => row.outcome !== "unresolved");
  const directional = resolved.filter((row) => row.direction === "supportive" || row.direction === "challenging");
  const scored: Evaluated[] = directional
    .filter((row) => row.outcome !== "partly-occurred")
    .map((row) => ({ ...row, predicted: row.direction === "supportive", actual: row.outcome === "occurred" }));
  const group = (key: "tradition" | "category") => Object.entries(
    scored.reduce<Record<string, Evaluated[]>>((all, row) => {
      (all[row[key]] ??= []).push(row);
      return all;
    }, {}),
  ).map(([value, rows]) => ({ [key]: value, ...metricRows(rows) }));
  const positives = scored.filter((row) => row.actual).length;
  const negatives = scored.length - positives;
  return {
    schemaVersion: "sahadeva-prashna-evaluation-1" as const,
    sample: {
      supplied: records.length,
      eligible: eligible.length,
      excluded: excluded.length,
      resolved: resolved.length,
      unresolved: eligible.length - resolved.length,
      directional: directional.length,
      partiallyResolved: directional.length - scored.length,
      scored: scored.length,
    },
    exclusions: excluded,
    metrics: {
      ...metricRows(scored),
      abstentionRate: resolved.length ? (resolved.length - directional.length) / resolved.length : null,
      unresolvedRate: eligible.length ? (eligible.length - resolved.length) / eligible.length : null,
      brierScore: null,
      brierStatus: "unavailable-no-calibrated-probabilities" as const,
    },
    baselines: {
      randomAccuracy: scored.length ? 0.5 : null,
      majorityOutcomeAccuracy: scored.length ? Math.max(positives, negatives) / scored.length : null,
      categoryPriorAccuracy: null,
      categoryPriorStatus: "requires-training-cohort-disjoint-from-evaluation" as const,
    },
    byTradition: group("tradition"),
    byCategory: group("category"),
    limitations: [
      "Book examples written to demonstrate a rule are conformance fixtures, not independent validation cases.",
      "Retrospective and self-reported outcomes remain vulnerable to selection, verification and follow-up bias.",
      "Structural scores are not probabilities; Brier score remains unavailable until a disjoint calibration cohort exists.",
      "These metrics describe recorded engine behavior and do not scientifically validate astrology.",
    ],
  };
}

/** Source conformance is deliberately separate from outcome accuracy. Every
 * supplied case, invalid row and failing check remains in the report. */
export function evaluatePrashnaSourceConformance(records: PrashnaConformanceRecord[]) {
  const seen = new Set<string>();
  const cases = records.map((record) => {
    const validationFailures = [
      ...(!record.caseId.trim() ? ["missing-case-id"] : []),
      ...(seen.has(record.caseId) ? ["duplicate-case-id"] : []),
      ...(!record.sourceId.trim() ? ["missing-source-id"] : []),
      ...(!record.chapter.trim() ? ["missing-chapter"] : []),
      ...(!record.ruleId.trim() ? ["missing-rule-id"] : []),
      ...(!record.checks.length ? ["no-conformance-checks"] : []),
    ];
    seen.add(record.caseId);
    const passedChecks = record.checks.filter((check) => check.passed).length;
    return {
      ...record,
      validationFailures,
      valid: validationFailures.length === 0,
      passedChecks,
      failedChecks: record.checks.length - passedChecks,
      passed: validationFailures.length === 0
        && record.inputReproduction === "exact"
        && passedChecks === record.checks.length,
    };
  });
  const summarize = (rows: typeof cases) => {
    const checks = rows.flatMap((row) => row.checks);
    const passedChecks = checks.filter((check) => check.passed).length;
    return {
      cases: rows.length,
      fullyConformantCases: rows.filter((row) => row.passed).length,
      exactInputCases: rows.filter((row) => row.inputReproduction === "exact").length,
      signOnlyInputCases: rows.filter((row) => row.inputReproduction === "sign-only").length,
      failedInputCases: rows.filter((row) => row.inputReproduction === "failed").length,
      checks: checks.length,
      passedChecks,
      failedChecks: checks.length - passedChecks,
      checkPassRate: checks.length ? passedChecks / checks.length : null,
    };
  };
  const group = (key: "sourceId" | "chapter" | "category" | "ruleId") => Object.entries(
    cases.reduce<Record<string, typeof cases>>((all, row) => {
      (all[row[key]] ??= []).push(row);
      return all;
    }, {}),
  ).map(([value, rows]) => ({ [key]: value, ...summarize(rows) }));
  return {
    schemaVersion: "sahadeva-prashna-source-conformance-1" as const,
    summary: summarize(cases),
    cases,
    bySource: group("sourceId"),
    byChapter: group("chapter"),
    byCategory: group("category"),
    byRule: group("ruleId"),
    outcomeUse: "prohibited" as const,
    notice: "This report tests source-input and rule behavior only. Known outcomes are neither stored nor converted into predictive accuracy.",
  };
}
