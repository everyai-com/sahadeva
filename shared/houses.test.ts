import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import type { BirthInput } from "./schema";

const input: BirthInput = { name:"Houses", date:"2000-01-01", time:"12:00", place:"Greenwich", latitude:51.4779, longitude:0, timezoneOffset:0, language:"en", methodology:"parashari", focus:"general", birthTimeAccuracyMinutes:5 };

describe("houses and arudhas", () => {
  const houses = calculateChart(input).advanced.houses;
  it("returns complete equal-house boundaries and planet mappings", () => {
    expect(houses.equalBhava.boundaries).toHaveLength(12);
    expect(houses.equalBhava.planetHouses).toHaveLength(9);
    expect(houses.equalBhava.planetHouses.every((p) => p.equalBhavaHouse >= 1 && p.equalBhavaHouse <= 12)).toBe(true);
  });
  it("returns all twelve padas with explicit exceptions", () => {
    expect(houses.arudhas.values).toHaveLength(12);
    expect(houses.arudhas.values.every((p) => p.padaSign >= 0 && p.padaSign < 12)).toBe(true);
    expect(houses.temporalLagnas.status).toBe("preview");
    expect(houses.temporalLagnas.values).toHaveLength(3);
  });
  it("matches a published Porphyry/Sripati quadrant reference chart",()=>{expect(houses.sripati.status).toBe("supported");expect(houses.sripati.madhyas).toHaveLength(12);expect(houses.sripati.sandhis).toHaveLength(12);const reference=[.41296672,25.52793292,50.64289912,75.75786531,110.64289912,145.52793292,180.41296672,205.52793292,230.64289912,255.75786531,290.64289912,325.52793292];for(let index=0;index<12;index++)expect(houses.sripati.madhyas[index].midpointLongitude).toBeCloseTo(reference[index],1);expect(houses.sripati.sandhis.reduce((sum,item)=>sum+item.widthDegrees,0)).toBeCloseTo(360,8);expect(houses.sripati.planetHouses.every((item)=>item.sripatiHouse>=1&&item.sripatiHouse<=12)).toBe(true);});
  it("returns an explicit unsupported status near the poles",()=>{const polar=calculateChart({...input,latitude:70,place:"Arctic"}).advanced.houses.sripati;expect(polar.status).toBe("unsupported-polar");expect(polar.madhyas).toHaveLength(0);});
  it("records selection without mixing house assignments",()=>{const selected=calculateChart({...input,houseSystem:"sripati"});expect(selected.input.houseSystem).toBe("sripati");expect(selected.advanced.houses.selectedSystem).toBe("sripati");const compact=selected.advanced.houses;expect(compact.equalBhava.planetHouses[0]).toHaveProperty("wholeSignHouse");expect(compact.sripati.planetHouses[0]).toHaveProperty("sripatiHouse");});
  it("computes Bhava Bala only for an explicitly compatible cusp system",()=>{expect(houses.bhavaBala.status).toBe("unsupported-house-system");const selected=calculateChart({...input,houseSystem:"sripati"}).advanced.houses.bhavaBala;expect(selected.status).toBe("computed");expect(selected.houseSystem).toBe("sripati");expect(selected.values).toHaveLength(12);for(const value of selected.values as Array<{totalVirupas:number;drishtiContributions:unknown[]}>){expect(Number.isFinite(value.totalVirupas)).toBe(true);expect(value.drishtiContributions).toHaveLength(7);}});
});
