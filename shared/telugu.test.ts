import {describe,expect,it} from "vitest";
import {calculateChart} from "./jyotish";
import {TELUGU_KARANAS,TELUGU_TITHIS,TELUGU_VARAS,TELUGU_YOGAS,teluguChartSummary} from "./telugu";
import type {BirthInput} from "./schema";
const input:BirthInput={name:"తెలుగు",date:"2000-01-01",time:"12:00",place:"గ్రీన్విచ్",latitude:51.4779,longitude:0,timezoneOffset:0,language:"te",methodology:"parashari",focus:"general",birthTimeAccuracyMinutes:0};
describe("Telugu deterministic terminology",()=>{it("covers every computed Panchanga class",()=>{expect(Object.keys(TELUGU_VARAS)).toHaveLength(7);expect(Object.keys(TELUGU_TITHIS)).toHaveLength(15);expect(Object.keys(TELUGU_YOGAS)).toHaveLength(27);expect(Object.keys(TELUGU_KARANAS)).toHaveLength(11);});it("returns Telugu rather than leaking English Panchanga labels",()=>{const chart=calculateChart(input),summary=teluguChartSummary(chart);expect(summary.panchanga.varam).not.toBe(chart.panchanga.vara);expect(summary.panchanga.tithi).not.toBe(chart.panchanga.tithi);expect(summary.panchanga.yogam).not.toBe(chart.panchanga.yoga);expect(summary.panchanga.karanam).not.toBe(chart.panchanga.karana);});});
