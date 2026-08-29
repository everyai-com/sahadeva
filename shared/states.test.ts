import { describe, expect, it } from "vitest";
import { calculateChart } from "./jyotish";
import type { BirthInput } from "./schema";
import { ayanaBalaFromDeclination, grahaYuddhaWinner, sphutaDrishtiVirupas, tribhagaBala } from "./states";

const input: BirthInput = { name:"Strength", date:"2000-01-01", time:"12:00", place:"Greenwich", latitude:51.4779, longitude:0, timezoneOffset:0, language:"en", methodology:"parashari", focus:"general", birthTimeAccuracyMinutes:5 };
describe("partial Shadbala", () => {
  const states = calculateChart(input).advanced.planetaryStates;
  it("keeps implemented Virupa components within their classical maxima", () => {
    for (const value of states.avasthas) {
      expect(value.uchchaBalaVirupas).toBeGreaterThanOrEqual(0); expect(value.uchchaBalaVirupas).toBeLessThanOrEqual(60);
      expect(value.digBalaVirupas).toBeGreaterThanOrEqual(0); expect(value.digBalaVirupas).toBeLessThanOrEqual(60);
      expect([0,15,30]).toContain(value.ojhayugmaBalaVirupas);
      expect([15,30,60]).toContain(value.kendradiBalaVirupas);
      expect([0,15]).toContain(value.drekkanaBalaVirupas);
      expect(value.saptavargajaDetails).toHaveLength(7);
      expect(value.saptavargajaBalaVirupas).toBeCloseTo(value.saptavargajaDetails.reduce((sum, item) => sum + item.virupas, 0), 10);
      expect(Number.isFinite(value.drikBalaVirupas)).toBe(true);
      expect(value.drikContributions).toHaveLength(6);
      expect(value.declinationDegrees).not.toBeNull();
      expect(value.ayanaBalaVirupas).toBeGreaterThanOrEqual(0);
      expect(value.ayanaBalaVirupas).toBeLessThanOrEqual(value.name==="Sun"?120:60);
      expect(value.calendarLordBalaVirupas).not.toBeNull();
      expect(value.cheshtaBalaVirupas).not.toBeNull();
    }
  });

  it("implements the exact full-strength Sphuta Drishti points", () => {
    expect(sphutaDrishtiVirupas("Sun", 180)).toBe(60);
    expect(sphutaDrishtiVirupas("Mars", 120)).toBe(60);
    expect(sphutaDrishtiVirupas("Jupiter", 120)).toBe(60);
    expect(sphutaDrishtiVirupas("Jupiter", 240)).toBe(60);
    expect(sphutaDrishtiVirupas("Saturn", 60)).toBe(60);
    expect(sphutaDrishtiVirupas("Saturn", 270)).toBe(60);
    for (const planet of ["Sun", "Mars", "Jupiter", "Saturn"] as const) {
      for (let angle = 0; angle < 360; angle += 0.25) {
        expect(sphutaDrishtiVirupas(planet, angle)).toBeGreaterThanOrEqual(0);
        expect(sphutaDrishtiVirupas(planet, angle)).toBeLessThanOrEqual(60);
      }
    }
  });

  it("assigns the three day and night thirds without assuming equal day length", () => {
    const window = { sunrises:[100,101], sunsets:[100.6,101.6] };
    expect(tribhagaBala(100.1,window)).toMatchObject({period:"day",third:1,lord:"Mercury"});
    expect(tribhagaBala(100.3,window)).toMatchObject({period:"day",third:2,lord:"Sun"});
    expect(tribhagaBala(100.5,window)).toMatchObject({period:"day",third:3,lord:"Saturn"});
    expect(tribhagaBala(100.7,window)).toMatchObject({period:"night",third:1,lord:"Moon"});
    expect(tribhagaBala(100.85,window)).toMatchObject({period:"night",third:2,lord:"Venus"});
    expect(tribhagaBala(100.95,window)).toMatchObject({period:"night",third:3,lord:"Mars"});
    const result=tribhagaBala(100.3,window);
    expect(result.values.Jupiter).toBe(60);
    expect(Object.values(result.values).filter((value)=>value===60)).toHaveLength(2);
  });

  it("applies the BPHS north/south Ayana polarity and doubled Sun rule",()=>{
    expect(ayanaBalaFromDeclination("Sun",0)).toBe(60);
    expect(ayanaBalaFromDeclination("Mars",23.45)).toBe(60);
    expect(ayanaBalaFromDeclination("Moon",23.45)).toBe(0);
    expect(ayanaBalaFromDeclination("Saturn",-23.45)).toBe(60);
    expect(ayanaBalaFromDeclination("Mercury",23.45)).toBe(60);
    expect(ayanaBalaFromDeclination("Mercury",-23.45)).toBe(60);
    expect(ayanaBalaFromDeclination("Sun",23.45)).toBe(120);
  });
  it("exposes the calendar convention and all four lords",()=>{expect(states.calendarBala?.convention.id).toBe("bphs-solar-ingress-equal-hora");expect(states.calendarBala?.lords).toEqual(expect.objectContaining({year:expect.any(String),month:expect.any(String),day:expect.any(String),hora:expect.any(String)}));});
  it("exposes the Cheshta intermediates instead of only a total",()=>{expect(states.cheshtaBala?.details).toHaveLength(5);expect(states.cheshtaBala?.convention.id).toBe("bphs-jpl-mean-elements");});
  it("publishes complete raw totals and classical required-strength ratios",()=>{expect(states.shadbala.status).toBe("computed");expect(states.shadbala.unavailableComponents).toHaveLength(0);for(const value of states.avasthas){expect(Number.isFinite(value.shadbalaTotalVirupas)).toBe(true);expect(value.requiredStrengthRatio).toBeCloseTo(value.shadbalaTotalVirupas!/value.requiredVirupas,12);}});
  it("resolves planetary war by actual north/south latitude, not longitude order",()=>{expect(grahaYuddhaWinner({name:"Mars",eclipticLatitude:-1},{name:"Venus",eclipticLatitude:0.5})).toEqual({winner:"Venus",loser:"Mars"});expect(grahaYuddhaWinner({name:"Mars"},{name:"Venus",eclipticLatitude:0.5})).toBeNull();});
});
