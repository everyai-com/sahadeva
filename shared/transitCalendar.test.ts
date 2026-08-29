import {describe,expect,it} from "vitest";
import {calculateChart,julianDay} from "./jyotish";
import {buildSlowTransitCalendar,calculatePlanetTransitPeriods,intersectDashaTransits,transitCalendarIcs} from "./transitCalendar";
import type {BirthInput} from "./schema";

const input:BirthInput={name:"Transit",date:"2000-01-01",time:"12:00",place:"Greenwich",latitude:51.4779,longitude:0,timezoneOffset:0,language:"en",methodology:"parashari",focus:"general",birthTimeAccuracyMinutes:0},start=julianDay(input);
describe("slow transit calendars",()=>{
  it("retains exact contiguous ingress periods and retrograde re-entries",()=>{const periods=calculatePlanetTransitPeriods("Jupiter",start,start+1000);expect(periods.length).toBeGreaterThan(2);expect(periods[0].startJulianDay).toBe(start);expect(periods.at(-1)?.endJulianDay).toBe(start+1000);for(let index=1;index<periods.length;index++)expect(periods[index].startJulianDay).toBe(periods[index-1].endJulianDay);});
  it("labels Saturn structural periods and intersects transits with Vimshottari boundaries",()=>{const chart=calculateChart(input),calendar=buildSlowTransitCalendar(chart,start,start+400);expect(calendar.periods.some((period)=>period.planet==="Saturn")).toBe(true);expect(calendar.saturnPeriods.every((period)=>period.sadeSatiStage!==null||period.dhaiya)).toBe(true);const intersections=intersectDashaTransits(chart,calendar.periods);expect(intersections.length).toBeGreaterThan(0);expect(intersections.every((item)=>item.endJulianDay>item.startJulianDay)).toBe(true);});
  it("exports selected periods as a standards-shaped calendar",()=>{const periods=calculatePlanetTransitPeriods("Rahu",start,start+400),ics=transitCalendarIcs(periods,"Transit");expect(ics).toContain("BEGIN:VCALENDAR");expect(ics).toContain("BEGIN:VEVENT");expect(ics).toContain("END:VCALENDAR");});
});
