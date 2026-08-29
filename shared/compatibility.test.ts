import {describe,expect,it} from "vitest";
import {calculateChart} from "./jyotish";
import {calculateCompatibility} from "./compatibility";

const first={name:"A",date:"2000-01-28",time:"08:05",place:"Ravulapalem",latitude:16.7607,longitude:81.833,timezoneOffset:5.5,timezone:"Asia/Kolkata",language:"en",methodology:"parashari",focus:"general",birthTimeAccuracyMinutes:5} as const;
const second={...first,name:"B",date:"2001-06-10",time:"12:15"} as const;
describe("compatibility",()=>{it("returns an auditable 36-point breakdown and Kuja comparison",()=>{const result=calculateCompatibility(calculateChart(first),calculateChart(second));expect(result.ashtakoota.maximum).toBe(36);expect(result.ashtakoota.components).toHaveLength(8);expect(result.ashtakoota.components.reduce((sum,item)=>sum+item.score,0)).toBe(result.ashtakoota.score);expect(result.kujaDosha.bride.references).toHaveLength(3);expect(result.safety.status).toBe("research-preview");});});
