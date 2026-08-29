import type {ChartResult} from "./schema";
import {siderealPlacementAt,siderealSignAt} from "./jyotish";
import {jdToIso} from "./dashaCalendar";

type SlowPlanet="Saturn"|"Jupiter"|"Rahu"|"Ketu";
export type TransitPeriod={planet:SlowPlanet;sign:number;startJulianDay:number;endJulianDay:number;startIso:string;endIso:string;retrogradeAtStart:boolean};
const SLOW_PLANETS:SlowPlanet[]=["Saturn","Jupiter","Rahu","Ketu"];

export function calculatePlanetTransitPeriods(planet:SlowPlanet,startJulianDay:number,endJulianDay:number){
  if(endJulianDay<=startJulianDay)throw new Error("Transit calendar end must follow start");
  const events:Array<{julianDay:number;toSign:number;retrograde:boolean}>=[];let cursor=startJulianDay,currentSign=siderealSignAt(planet,cursor);
  while(cursor<endJulianDay){const next=Math.min(endJulianDay,cursor+2),nextSign=siderealSignAt(planet,next);if(nextSign!==currentSign){let low=cursor,high=next;for(let iteration=0;iteration<40;iteration++){const mid=(low+high)/2;if(siderealSignAt(planet,mid)===currentSign)low=mid;else high=mid;}const crossing=siderealPlacementAt(planet,high);events.push({julianDay:high,toSign:crossing.sign,retrograde:Boolean(crossing.retrograde)});currentSign=crossing.sign;}cursor=next;}
  const boundaries=[startJulianDay,...events.map((event)=>event.julianDay),endJulianDay],signs=[siderealPlacementAt(planet,startJulianDay).sign,...events.map((event)=>event.toSign)],retrogrades=[Boolean(siderealPlacementAt(planet,startJulianDay).retrograde),...events.map((event)=>event.retrograde)];
  return signs.map((sign,index)=>({planet,sign,startJulianDay:boundaries[index],endJulianDay:boundaries[index+1],startIso:jdToIso(boundaries[index]),endIso:jdToIso(boundaries[index+1]),retrogradeAtStart:retrogrades[index]}));
}

export function buildSlowTransitCalendar(chart:ChartResult,startJulianDay:number,endJulianDay:number){
  const moonSign=chart.placements.find((item)=>item.name==="Moon")!.sign,lagnaSign=chart.placements.find((item)=>item.name==="Lagna")!.sign,periods=SLOW_PLANETS.flatMap((planet)=>calculatePlanetTransitPeriods(planet,startJulianDay,endJulianDay)),saturn=periods.filter((period)=>period.planet==="Saturn").map((period)=>{const houseFromMoon=((period.sign-moonSign+12)%12)+1;return{...period,houseFromMoon,houseFromLagna:((period.sign-lagnaSign+12)%12)+1,sadeSatiStage:houseFromMoon===12?"rising":houseFromMoon===1?"middle":houseFromMoon===2?"setting":null,dhaiya:[4,8].includes(houseFromMoon)};});
  return{schemaVersion:"sahadeva-transits-1",startJulianDay,endJulianDay,periods,saturnPeriods:saturn.filter((period)=>period.sadeSatiStage||period.dhaiya),convention:{zodiac:"Lahiri sidereal mean",nodes:"mean node",boundaries:"geocentric sign ingress with retrograde re-entry retained"}};
}

export function intersectDashaTransits(chart:ChartResult,periods:TransitPeriod[]){return chart.advanced.vimshottariTimeline.flatMap((maha)=>maha.subPeriods.flatMap((antar)=>periods.map((transit)=>{const startJulianDay=Math.max(antar.startJulianDay,transit.startJulianDay),endJulianDay=Math.min(antar.endJulianDay,transit.endJulianDay);return endJulianDay>startJulianDay?{mahadasha:maha.lord,antardasha:antar.lord,planet:transit.planet,transitSign:transit.sign,startJulianDay,endJulianDay,startIso:jdToIso(startJulianDay),endIso:jdToIso(endJulianDay)}:null;}).filter((value):value is NonNullable<typeof value>=>value!==null)));}

const escape=(value:string)=>value.replace(/([,;\\])/g,"\\$1").replace(/\n/g,"\\n"),ics=(iso:string)=>iso.replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
export function transitCalendarIcs(periods:TransitPeriod[],subject:string){const events=periods.map((period)=>["BEGIN:VEVENT",`UID:${escape(`${period.planet}-${period.sign}-${period.startJulianDay}@sahadeva`)}`,`DTSTART:${ics(period.startIso)}`,`DTEND:${ics(period.endIso)}`,`SUMMARY:${escape(`${period.planet} transit in sidereal sign ${period.sign+1}`)}`,`DESCRIPTION:${escape(`Research transit period for ${subject}; no deterministic outcome is inferred.`)}`,"END:VEVENT"].join("\r\n"));return["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Sahadeva//Slow Transits//EN","CALSCALE:GREGORIAN",...events,"END:VCALENDAR",""].join("\r\n");}
