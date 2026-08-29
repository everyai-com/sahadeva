import {describe,expect,it} from "vitest";
import {calculateLahiriAyanamsa} from "./ayanamsa";

describe("versioned Lahiri IAE 1985 convention",()=>{
  const references=[[2378496.5,21.064602051866],[2415020.5,22.460530592388],[2433282.5,23.158725143876],[2451544.5,23.857073231355],[2460676.5,24.206343096584],[2469807.5,24.555613102881]] as const;
  it("matches independent Lahiri reference values from 1800 through 2050 within one arcsecond",()=>{for(const [jd,expected] of references)expect(Math.abs(calculateLahiriAyanamsa(jd,"mean").valueDegrees-expected)*3600).toBeLessThan(1);});
  it("reproduces the corrected IAE true anchor",()=>{const result=calculateLahiriAyanamsa(2435553.5-31.411589/86400,"true");expect(result.valueDegrees).toBeCloseTo(23+15/60+.658/3600,7);expect(result.id).toBe("lahiri-iae-1985-true");});
  it("keeps mean and true conventions explicit",()=>{const mean=calculateLahiriAyanamsa(2451545,"mean"),truth=calculateLahiriAyanamsa(2451545,"true");expect(mean.id).not.toBe(truth.id);expect(Math.abs(mean.valueDegrees-truth.valueDegrees)*3600).toBeGreaterThan(1);});
});
