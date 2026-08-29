import {describe,expect,it} from "vitest";
import {findSolarEvents} from "./panchanga";
import {jplApproximateLongitudes} from "./jplApprox";
import {tropicalAscendant} from "./jyotish";

const angularError=(a:number,b:number)=>Math.abs(((a-b+540)%360)-180);
const lagnaFixtures=[
  {jd:2451545,latitude:51.4779,longitude:0,expected:24.276256690624223},
  {jd:2460676,latitude:17.385,longitude:78.4867,expected:96.09757525284658},
  {jd:2444239.5,latitude:-33.8688,longitude:151.2093,expected:344.00731675543386},
  {jd:2469807.25,latitude:40.7128,longitude:-74.006,expected:43.10736786612512},
];
const solarFixtures=[
  {jd:2460755,latitude:51.4779,longitude:0,rise:2460754.751606365,set:2460755.259314591},
  {jd:2460483,latitude:17.385,longitude:78.4867,rise:2460482.508902301,set:2460483.057666985},
  // UTC civil day spans two local Sydney dates: Jan 1 local sunset and Jan 2 local sunrise.
  {jd:2451544.5,latitude:-33.8688,longitude:151.2093,rise:2451545.2831884213,set:2451544.88147511},
];

describe("independent Lagna and solar-event astronomy vectors",()=>{
  it("matches four Meeus/IAU-1982 mean-sidereal Lagna vectors within one arcsecond",()=>{for(const fixture of lagnaFixtures)expect(angularError(tropicalAscendant(fixture.jd,fixture.latitude,fixture.longitude),fixture.expected)*3600).toBeLessThan(1);});
  it("matches independent Meeus apparent-Sun rise/set vectors within three minutes",()=>{for(const fixture of solarFixtures){const result=findSolarEvents(fixture.jd,fixture.latitude,fixture.longitude,(jd)=>({Sun:jplApproximateLongitudes(jd).Sun,Moon:0}));expect(result.sunriseJulianDay).not.toBeNull();expect(result.sunsetJulianDay).not.toBeNull();expect(Math.abs(result.sunriseJulianDay!-fixture.rise)*1440).toBeLessThan(3);expect(Math.abs(result.sunsetJulianDay!-fixture.set)*1440).toBeLessThan(3);}});
});
