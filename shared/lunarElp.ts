import {Moon as ElpMoon} from "astronomia/elp";
import elpMppDe from "astronomia/data/elpMppDe";
import {deltaT} from "astronomia/deltat";
import type {LunarModel} from "./lunar";

const RAD=Math.PI/180,norm=(value:number)=>((value%360)+360)%360,moon=new ElpMoon(elpMppDe);
export const dynamicalJulianDay=(utJulianDay:number)=>utJulianDay+deltaT(2000+(utJulianDay-2451545)/365.2425)/86400;
const position=(utJulianDay:number)=>{const jd=dynamicalJulianDay(utJulianDay),value=moon.position(jd);return{longitude:norm(value.lon/RAD),latitude:value.lat/RAD,distanceKm:value.range,get longitudeSpeedDegPerDay(){const before=moon.position(jd-.01),after=moon.position(jd+.01),delta=((after.lon-before.lon)/RAD+540)%360-180;return delta/.02;}};};

export const elpMpp02LunarModel:LunarModel={
  id:"elp-mpp02-de405-truncated",version:"1.0.0",validRange:[2378496.5,2469807.5],
  source:"Chapront & Francou ELP/MPP02, DE405-fit truncated series via astronomia 4.2.0",
  position,
  // Reference fixtures use Horizons TDB numeric Julian dates directly.
  vectorJ2000(jd){return moon.positionXYZ(jd);},
};
