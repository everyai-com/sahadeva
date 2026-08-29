const RAD = Math.PI / 180;
const norm = (value:number)=>((value%360)+360)%360;
const sin = (value:number)=>Math.sin(value*RAD);
const cos = (value:number)=>Math.cos(value*RAD);

export type LunarState = { longitude:number; latitude:number; distanceKm:number; longitudeSpeedDegPerDay:number };
export type LunarVector = {x:number;y:number;z:number};
export type LunarModel = { id:string; version:string; validRange:[number,number]; source:string; position(jd:number):LunarState; vectorJ2000?(jd:number):LunarVector };
export type LunarVectorReference = LunarVector & {jd:number;source:string};
export type LunarReference = { jd:number; longitude:number; latitude:number; distanceKm:number; source:string };
export type LunarValidationThresholds = { maxLongitudeArcsec:number; p95LongitudeArcsec:number; maxLatitudeArcsec:number; maxDistanceKm:number };

function previewPosition(jd:number) {
  const d=jd-2451543.5,node=norm(125.1228-0.0529538083*d),inclination=5.1454,periapsis=norm(318.0634+0.1643573223*d),meanAnomaly=norm(115.3654+13.0649929509*d),eccentricity=0.0549,semiMajorEarthRadii=60.2666;
  const eccentricAnomaly=meanAnomaly+(180/Math.PI)*eccentricity*sin(meanAnomaly)*(1+eccentricity*cos(meanAnomaly));
  const xv=semiMajorEarthRadii*(cos(eccentricAnomaly)-eccentricity),yv=semiMajorEarthRadii*Math.sqrt(1-eccentricity**2)*sin(eccentricAnomaly),trueAnomaly=norm(Math.atan2(yv,xv)/RAD),radiusEarthRadii=Math.sqrt(xv*xv+yv*yv),argument=trueAnomaly+periapsis;
  const x=radiusEarthRadii*(cos(node)*cos(argument)-sin(node)*sin(argument)*cos(inclination));
  const y=radiusEarthRadii*(sin(node)*cos(argument)+cos(node)*sin(argument)*cos(inclination));
  const z=radiusEarthRadii*sin(argument)*sin(inclination);
  return {longitude:norm(Math.atan2(y,x)/RAD),latitude:Math.atan2(z,Math.sqrt(x*x+y*y))/RAD,distanceKm:radiusEarthRadii*6378.14};
}

export const analyticLunarPreview: LunarModel = {
  id:"analytic-lunar-preview",version:"1.0.0",validRange:[2378497,2469808],source:"Isolated legacy two-body preview; not certified",
  position(jd){const state=previewPosition(jd),before=previewPosition(jd-0.01),after=previewPosition(jd+0.01),speed=((after.longitude-before.longitude+540)%360-180)/0.02;return{...state,longitudeSpeedDegPerDay:speed};},
};

const angularError=(actual:number,reference:number)=>Math.abs(((actual-reference+540)%360)-180)*3600;
const percentile=(values:number[],fraction:number)=>values[Math.min(values.length-1,Math.ceil(values.length*fraction)-1)]??Infinity;

export function validateLunarModel(model:LunarModel,references:LunarReference[],thresholds:LunarValidationThresholds){
  if(!references.length)return{passed:false,count:0,maxLongitudeArcsec:Infinity,meanLongitudeArcsec:Infinity,p95LongitudeArcsec:Infinity,maxLatitudeArcsec:Infinity,maxDistanceKm:Infinity};
  const rows=references.map((reference)=>{const actual=model.position(reference.jd);return{longitudeArcsec:angularError(actual.longitude,reference.longitude),latitudeArcsec:Math.abs(actual.latitude-reference.latitude)*3600,distanceKm:Math.abs(actual.distanceKm-reference.distanceKm)};}),longitudes=rows.map((row)=>row.longitudeArcsec).sort((a,b)=>a-b);
  const report={count:rows.length,maxLongitudeArcsec:Math.max(...longitudes),meanLongitudeArcsec:longitudes.reduce((sum,value)=>sum+value,0)/longitudes.length,p95LongitudeArcsec:percentile(longitudes,.95),maxLatitudeArcsec:Math.max(...rows.map((row)=>row.latitudeArcsec)),maxDistanceKm:Math.max(...rows.map((row)=>row.distanceKm))};
  return{...report,passed:report.maxLongitudeArcsec<=thresholds.maxLongitudeArcsec&&report.p95LongitudeArcsec<=thresholds.p95LongitudeArcsec&&report.maxLatitudeArcsec<=thresholds.maxLatitudeArcsec&&report.maxDistanceKm<=thresholds.maxDistanceKm};
}

export function validateLunarVectors(model:LunarModel,references:LunarVectorReference[],thresholdKm:number){
  if(!model.vectorJ2000||!references.length)return{passed:false,count:0,maxPositionErrorKm:Infinity,meanPositionErrorKm:Infinity,maxAngularErrorArcsec:Infinity,meanAngularErrorArcsec:Infinity,p95AngularErrorArcsec:Infinity};
  const rows=references.map((reference)=>{const actual=model.vectorJ2000!(reference.jd),actualR=Math.hypot(actual.x,actual.y,actual.z),referenceR=Math.hypot(reference.x,reference.y,reference.z),cosine=Math.max(-1,Math.min(1,(actual.x*reference.x+actual.y*reference.y+actual.z*reference.z)/(actualR*referenceR)));return{positionKm:Math.hypot(actual.x-reference.x,actual.y-reference.y,actual.z-reference.z),angularArcsec:Math.acos(cosine)/RAD*3600};}),errors=rows.map((row)=>row.positionKm),angular=rows.map((row)=>row.angularArcsec).sort((a,b)=>a-b);
  const maxPositionErrorKm=Math.max(...errors),meanPositionErrorKm=errors.reduce((sum,value)=>sum+value,0)/errors.length,maxAngularErrorArcsec=Math.max(...angular),meanAngularErrorArcsec=angular.reduce((sum,value)=>sum+value,0)/angular.length,p95AngularErrorArcsec=percentile(angular,.95);
  return{passed:maxPositionErrorKm<=thresholdKm,count:errors.length,maxPositionErrorKm,meanPositionErrorKm,maxAngularErrorArcsec,meanAngularErrorArcsec,p95AngularErrorArcsec};
}

// ELP remains a validation candidate until its transition-search runtime is
// acceptable for Workers. Never switch this alias without accuracy and latency gates.
export const ACTIVE_LUNAR_MODEL: LunarModel = elpMpp02LunarModel;
import {elpMpp02LunarModel} from "./lunarElp";
