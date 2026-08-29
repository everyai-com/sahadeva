import {describe,expect,it} from "vitest";
import {calendarLordBala,localMeanWeekdayLord,previousSolarIngress} from "./calendarBala";

describe("calendar-lord Kala Bala",()=>{
  it("uses the astronomical Julian weekday in local mean time",()=>{expect(localMeanWeekdayLord(2451545,0)).toBe("Saturn");});
  it("finds the preceding tropical Aries ingress",()=>{const ingress=previousSolarIngress(2451545,0);expect(ingress).toBeLessThan(2451545);expect(2451545-ingress).toBeLessThan(366);});
  it("preserves exactly 15+30+45+60 Virupas across the four lord awards",()=>{const result=calendarLordBala(2451545,0,2451544.75);expect(Object.values(result.values).reduce((sum,value)=>sum+value,0)).toBe(150);expect(result.horaIndex).toBe(7);expect(result.convention.id).toBe("bphs-solar-ingress-equal-hora");});
});
