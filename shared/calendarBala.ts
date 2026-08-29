import { jplApproximateLongitudes } from "./jplApprox";

export const CALENDAR_BALA_CONVENTION={id:"bphs-solar-ingress-equal-hora",version:"1.0.0",year:"weekday lord of preceding tropical Aries ingress",month:"weekday lord of preceding tropical sign ingress",day:"weekday lord at governing sunrise",hora:"60-minute horas from governing sunrise in Chaldean order"} as const;
const WEEKDAY_LORDS=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"] as const;
const CHALDEAN=["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"] as const;
const norm=(value:number)=>((value%360)+360)%360;
const signAt=(jd:number)=>Math.floor(norm(jplApproximateLongitudes(jd).Sun)/30);

export function localMeanWeekdayLord(jd:number,longitude:number){const weekday=((Math.floor(jd+1.5+longitude/360)%7)+7)%7;return WEEKDAY_LORDS[weekday];}

export function previousSolarIngress(jd:number,targetSign:number){
  let newer=jd,newerSign=signAt(newer);
  for(let elapsed=1;elapsed<=370;elapsed++){
    const older=jd-elapsed,olderSign=signAt(older);
    if(newerSign===targetSign&&olderSign!==targetSign){
      let low=older,high=newer;
      for(let iteration=0;iteration<40;iteration++){const mid=(low+high)/2;if(signAt(mid)===targetSign)high=mid;else low=mid;}
      return high;
    }
    newer=older;newerSign=olderSign;
  }
  throw new Error("No solar ingress found in the preceding 370 days");
}

export function calendarLordBala(jd:number,longitude:number,governingSunrise:number){
  const currentSolarSign=signAt(jd),yearIngressJulianDay=previousSolarIngress(jd,0),monthIngressJulianDay=previousSolarIngress(jd,currentSolarSign);
  const yearLord=localMeanWeekdayLord(yearIngressJulianDay,longitude),monthLord=localMeanWeekdayLord(monthIngressJulianDay,longitude),dayLord=localMeanWeekdayLord(governingSunrise,longitude);
  const dayLordIndex=CHALDEAN.indexOf(dayLord),horaIndex=Math.floor(Math.max(0,(jd-governingSunrise)*24))%24,horaLord=CHALDEAN[(dayLordIndex+horaIndex)%7];
  return{convention:CALENDAR_BALA_CONVENTION,yearIngressJulianDay,monthIngressJulianDay,governingSunriseJulianDay:governingSunrise,horaIndex:horaIndex+1,lords:{year:yearLord,month:monthLord,day:dayLord,hora:horaLord},values:Object.fromEntries(WEEKDAY_LORDS.map((planet)=>[planet,(planet===yearLord?15:0)+(planet===monthLord?30:0)+(planet===dayLord?45:0)+(planet===horaLord?60:0)])) as Record<typeof WEEKDAY_LORDS[number],number>};
}
