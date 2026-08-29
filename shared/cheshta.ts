import {jplMeanLongitudes} from "./jplApprox";
import type {Placement} from "./schema";

export const CHESHTA_CONVENTION={id:"bphs-jpl-mean-elements",version:"1.0.0",source:"BPHS mean/true midpoint and sighrocca rule; JPL SSD Table 1 mean-longitude elements",supportedPlanets:["Mars","Mercury","Jupiter","Venus","Saturn"]} as const;
const PLANETS=CHESHTA_CONVENTION.supportedPlanets;
const norm=(value:number)=>((value%360)+360)%360;
const separation=(a:number,b:number)=>{const value=Math.abs(norm(a-b));return Math.min(value,360-value);};
const circularMidpoint=(a:number,b:number)=>norm(a+(((b-a+540)%360)-180)/2);

export function calculateCheshtaBala(placements:Placement[],jd:number){
  const mean=jplMeanLongitudes(jd),values:Record<string,number>={Sun:0,Moon:0},details=[] as Array<{name:string;meanLongitude:number;trueLongitude:number;sighroccaLongitude:number;midpointLongitude:number;cheshtaKendraDegrees:number;virupas:number}>;
  for(const name of PLANETS){const planet=placements.find((placement)=>placement.name===name)!;const inner=name==="Mercury"||name==="Venus",meanLongitude=inner?mean.Sun:mean[name],sighroccaLongitude=inner?mean[name]:mean.Sun,trueLongitude=planet.tropicalLongitude!,midpointLongitude=circularMidpoint(meanLongitude,trueLongitude),cheshtaKendraDegrees=separation(sighroccaLongitude,midpointLongitude),virupas=cheshtaKendraDegrees/3;values[name]=virupas;details.push({name,meanLongitude,trueLongitude,sighroccaLongitude,midpointLongitude,cheshtaKendraDegrees,virupas});}
  return{convention:CHESHTA_CONVENTION,values,details};
}
