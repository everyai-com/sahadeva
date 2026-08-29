import { describe,expect,it } from "vitest";
import { calculateChart } from "./jyotish";
import { assessNatalPromise,fuseTiming } from "./timingFusion";
const chart=calculateChart({name:"Test",date:"1990-01-01",time:"12:00",latitude:17.385,longitude:78.4867,timezoneOffset:5.5,timezone:"Asia/Kolkata",place:"Hyderabad",language:"en",methodology:"parashari",focus:"career",birthTimeAccuracyMinutes:5,houseSystem:"whole-sign"});
describe("timing fusion",()=>{it("treats promise as a gate and keeps factor weights learnable",()=>{const promise=assessNatalPromise(chart,"career"),result=fuseTiming(chart,"career","2026-01-01T00:00:00Z","2027-01-01T00:00:00Z");expect(result.promise.present).toBe(promise.present);expect(result.windows.length===0||result.windows.every(window=>window.factors.every(f=>f.learnable))).toBe(true);if(!promise.present)expect(result.windows).toEqual([]);});});
