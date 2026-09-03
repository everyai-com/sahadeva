import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import { buildTopicJudgment } from "./judgment";
import {
  assessTraditionalRemedyCandidate,
  buildChartRemedyProtocol,
  buildRemedyProtocol,
  evaluateRemedyFamilyEligibility,
  REMEDY_POLICY_RULES,
  type RemedyFamily,
  type TraditionalRemedyGateContext,
} from "./remedies";
const input = {
  name: "R",
  date: "1990-05-17",
  time: "10:30",
  place: "Hyderabad",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
  timezoneOffset: 5.5,
  language: "en",
  methodology: "parashari",
  focus: "career",
  birthTimeAccuracyMinutes: 5,
} as const;
describe("remedy protocol", () => {
  it("honours beliefs and withholds unreviewed chart prescriptions", () => {
    const preferences = {
        beliefMode: "hindu",
        maximumBurden: "minimal",
        maximumCost: "free",
        allowPrayer: false,
        allowCharity: false,
      } as const,
      judgment = buildTopicJudgment(
        calculateChart(input),
        "career",
        "2026-08-30T00:00:00.000Z",
      ),
      result = buildRemedyProtocol(judgment, preferences),
      families = evaluateRemedyFamilyEligibility(preferences);
    expect(
      result.eligiblePractices.every((item) => item.family !== "prayer"),
    ).toBe(true);
    expect(result.traditionalChartRemedies).toEqual([]);
    expect(result.contraindications.join(" ")).toContain("gemstones");
    expect(families.find((item) => item.family === "conduct")?.eligible).toBe(
      true,
    );
    for (const family of ["fasting", "mantra", "ritual", "gemstone"]) {
      const gate = families.find((item) => item.family === family);
      expect(gate?.status).toMatch(/^available-/);
      expect(gate?.reasons).toContain(
        "requires the listed checks before personalized instruction",
      );
    }
  });
  it("returns a traceable chart protocol without casual mantra or gemstone prescriptions", () => {
    const chart = calculateChart(input),
      judgment = buildTopicJudgment(
        chart,
        "career",
        "2026-08-30T00:00:00.000Z",
      ),
      result = buildChartRemedyProtocol(chart, judgment, {
        beliefMode: "spiritual",
        tradition: "family tradition",
        maximumBurden: "minimal",
        maximumCost: "free",
        allowPrayer: true,
        allowCharity: true,
      });
    expect(result.schemaVersion).toBe("sahadeva-remedy-protocol-4");
    expect(result.traditionalChartRemedies.map((item) => item.family)).toEqual([
      "muhurta",
      "charity",
      "devata",
    ]);
    expect(
      result.remedyFamilyEligibility.find((item) => item.family === "gemstone")
        ?.status,
    ).toMatch(/^available-/);
    expect(
      result.chartDiagnosis.devataProfile.ishtaDevata.deityCandidates.length,
    ).toBeGreaterThan(0);
    expect(result.sourceCoverage.policyCatalog.rules).toHaveLength(8);
    expect(result.availableChoices).toHaveLength(10);
    expect(result.intakeQuestions.map((item) => item.id)).toEqual(
      expect.arrayContaining(["tradition", "guru", "health", "budget"]),
    );
    expect(
      result.availableChoices.find((item) => item.family === "mantra")
        ?.examples,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Mahamrityunjaya Mantra",
          mantraText: expect.stringMatching(/Tryambaka/),
          guruConfirmationRequired: true,
        }),
      ]),
    );
    const mantraExamples = result.availableChoices.find(
      (item) => item.family === "mantra",
    )?.examples;
    expect(mantraExamples).toHaveLength(4);
    expect(
      mantraExamples?.every(
        (example) =>
          example.optional &&
          /pronunciation/.test(example.guruConfirmationPrompt) &&
          /repetition count/.test(example.guruConfirmationPrompt) &&
          /timing/.test(example.guruConfirmationPrompt) &&
          /diksha/.test(example.guruConfirmationPrompt) &&
          /Guru/.test(example.guruConfirmationPrompt),
      ),
    ).toBe(true);
    expect(
      result.traditionalChartRemedies.every(
        (item) => item.policyAssessment.publishable === false,
      ),
    ).toBe(true);
    expect(
      result.traditionalChartRemedies.find((item) => item.family === "muhurta")
        ?.policyAssessment.blockers,
    ).toContainEqual(
      expect.objectContaining({ requirement: "separateCalculationCompleted" }),
    );
    // The legacy protocol sections and the low-risk affliction plan stay free of
    // casual gemstone/mantra prescriptions. Specific gemstone and mantra guidance
    // now lives, deliberately and fully caveated, in `comprehensiveRepertoire`.
    expect(
      JSON.stringify({
        traditionalChartRemedies: result.traditionalChartRemedies,
        eligiblePractices: result.eligiblePractices,
        afflictionRemedies: result.afflictionRemedies,
      }),
    ).not.toMatch(/wear|carat|initiation-only mantra:/i);
  });
  it("pins a passing and blocked policy context for every source-located remedy rule", () => {
    const passed: TraditionalRemedyGateContext = {
        diagnosisEstablished: true,
        userConsented: true,
        nonFearBased: true,
        doesNotReplaceProfessionalCare: true,
        withinMeans: true,
        sourceApproved: true,
        rightsCleared: true,
        lineageApproved: true,
        initiationSatisfied: true,
        healthScreened: true,
        practitionerApproved: true,
        strengtheningRiskReviewed: true,
        exactProcedureReviewed: true,
        separateCalculationCompleted: true,
      },
      blocked = Object.fromEntries(
        Object.keys(passed).map((key) => [key, false]),
      ) as TraditionalRemedyGateContext;
    for (const rule of REMEDY_POLICY_RULES) {
      const family: RemedyFamily =
        rule.appliesTo === "all-traditional" ? "muhurta" : rule.appliesTo[0];
      const positive = assessTraditionalRemedyCandidate(family, passed),
        negative = assessTraditionalRemedyCandidate(family, blocked),
        positiveRule = positive.evaluations.find(
          (row) => row.ruleId === rule.id,
        ),
        negativeRule = negative.evaluations.find(
          (row) => row.ruleId === rule.id,
        );
      expect(rule.sourceKey).toMatch(/^book-.+:L\d+/);
      expect(positiveRule?.passed).toBe(true);
      expect(negativeRule?.passed).toBe(false);
      expect(negativeRule?.failedRequirements.length).toBeGreaterThan(0);
    }
  });
});
