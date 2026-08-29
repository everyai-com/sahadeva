import {describe,expect,it} from "vitest";
import {calculateChart} from "./jyotish";
import {calculateCheshtaBala} from "./cheshta";
import type {BirthInput} from "./schema";

const input:BirthInput={name:"Cheshta",date:"2000-01-01",time:"12:00",place:"Greenwich",latitude:51.4779,longitude:0,timezoneOffset:0,language:"en",methodology:"parashari",focus:"general",birthTimeAccuracyMinutes:0};
describe("Cheshta Bala",()=>{
  const chart=calculateChart(input),result=calculateCheshtaBala(chart.placements,chart.engine.julianDay);
  it("retains each intermediate required by the BPHS midpoint rule",()=>{expect(result.details).toHaveLength(5);for(const row of result.details){expect(row.cheshtaKendraDegrees).toBeGreaterThanOrEqual(0);expect(row.cheshtaKendraDegrees).toBeLessThanOrEqual(180);expect(row.virupas).toBeCloseTo(row.cheshtaKendraDegrees/3,12);expect(row.virupas).toBeLessThanOrEqual(60);}});
  it("keeps the Sun and Moon at zero under the convention that doubles solar Ayana Bala",()=>{expect(result.values.Sun).toBe(0);expect(result.values.Moon).toBe(0);expect(result.convention.id).toBe("bphs-jpl-mean-elements");});
});
