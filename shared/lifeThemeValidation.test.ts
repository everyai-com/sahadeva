import{describe,expect,it}from"vitest";
import{evaluateBlindLifeThemePredictions,LIFE_THEME_VALIDATION_PROTOCOL}from"./lifeThemeValidation";

describe("blind life-theme validation",()=>{
  it("scores a separately supplied outcome without claiming calibration",()=>{const result=evaluateBlindLifeThemePredictions([{caseId:"sealed-1",rankedThemes:[{themeId:"restriction_and_duty",score:72},{themeId:"career_and_public_role",score:60}]}],[{caseId:"sealed-1",observedThemeIds:["restriction_and_duty"]}]);expect(result.metrics.top3Recall).toBe(1);expect(result.status).toBe("insufficient-sample");expect(result.calibratedProbabilities).toBe(false);});
  it("requires a real cohort rather than treating one known case as validation",()=>{expect(LIFE_THEME_VALIDATION_PROTOCOL.minimumCases).toBeGreaterThanOrEqual(30);});
});
