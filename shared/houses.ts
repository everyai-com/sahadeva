import type { GrahaName, Placement } from "./schema";
import {sphutaDrishtiVirupas} from "./states";

const LORDS: GrahaName[] = ["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
const norm = (value: number) => ((value % 360) + 360) % 360;
const forwardArc=(from:number,to:number)=>norm(to-from);

export function calculateMidheaven(jd:number,longitude:number,ayanamsaDegrees:number){const t=(jd-2451545)/36525,gmst=norm(280.46061837+360.98564736629*(jd-2451545)+.000387933*t*t),theta=norm(gmst+longitude)*Math.PI/180,epsilon=(23.439291-.0130042*t)*Math.PI/180,tropical=norm(Math.atan2(Math.sin(theta),Math.cos(theta)*Math.cos(epsilon))*180/Math.PI);return{tropicalLongitude:tropical,siderealLongitude:norm(tropical-ayanamsaDegrees)};}

export function calculateSripati(placements:Placement[],jd:number,latitude:number,longitude:number,ayanamsaDegrees:number){
  const lagna=placements.find((item)=>item.name==="Lagna")!;
  if(Math.abs(latitude)>=66.562)return{status:"unsupported-polar",convention:"Sripati quadrant trisection",midheaven:null,madhyas:[],sandhis:[],planetHouses:[],notice:"Sripati is disabled at polar and near-polar latitudes where quadrant cusps can become discontinuous."};
  const midheaven=calculateMidheaven(jd,longitude,ayanamsaDegrees),asc=lagna.longitude,desc=norm(asc+180),ic=norm(midheaven.siderealLongitude+180),anchors=[asc,ic,desc,midheaven.siderealLongitude,asc],anchorHouses=[0,3,6,9],madhyaValues=Array<number>(12);
  for(let quadrant=0;quadrant<4;quadrant++){const start=anchors[quadrant],arc=forwardArc(start,anchors[quadrant+1]),house=anchorHouses[quadrant];for(let third=0;third<3;third++)madhyaValues[(house+third)%12]=norm(start+arc*third/3);}
  const madhyas=madhyaValues.map((midpointLongitude,index)=>({house:index+1,midpointLongitude}));
  const sandhis=madhyaValues.map((midpoint,index)=>{const previous=madhyaValues[(index+11)%12],startLongitude=norm(previous+forwardArc(previous,midpoint)/2),next=madhyaValues[(index+1)%12],endLongitude=norm(midpoint+forwardArc(midpoint,next)/2);return{house:index+1,startLongitude,endLongitude,widthDegrees:forwardArc(startLongitude,endLongitude)};});
  const houseAt=(planetLongitude:number)=>{for(const sandhi of sandhis)if(forwardArc(sandhi.startLongitude,planetLongitude)<sandhi.widthDegrees)return sandhi.house;return 12;};
  const planetHouses=placements.filter((item)=>item.name!=="Lagna").map((planet)=>({name:planet.name,sripatiHouse:houseAt(planet.longitude)}));
  return{status:"supported",convention:"Sripati: trisect each ecliptic quadrant from sidereal Ascendant/Descendant and MC/IC; Sandhis bisect adjacent Bhava Madhyas",midheaven,madhyas,sandhis,planetHouses,notice:"Whole-sign, equal-house, and Sripati assignments are retained separately."};
}

type PlanetStrength={name:string;shadbalaTotalVirupas:number|null};
function calculateBhavaBala(placements:Placement[],madhyas:Array<{house:number;midpointLongitude:number}>,midheavenLongitude:number,strengths:Array<{name:string;shadbalaTotalVirupas:number}>,houseSystem:string){
  const classical=new Set<GrahaName>(["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]),lagna=placements.find((item)=>item.name==="Lagna")!,sun=placements.find((item)=>item.name==="Sun")!,moon=placements.find((item)=>item.name==="Moon")!,elongation=norm(moon.longitude-sun.longitude),benefics=new Set<GrahaName>(["Mercury","Jupiter","Venus",...(elongation<=180?["Moon" as GrahaName]:[])]),strengthByPlanet=Object.fromEntries(strengths.map((item)=>[item.name,item.shadbalaTotalVirupas]));
  const values=madhyas.map(({house,midpointLongitude})=>{const sign=Math.floor(midpointLongitude/30),degree=midpointLongitude%30,lord=LORDS[sign],bhavadhipatiBalaVirupas=strengthByPlanet[lord];let anchor:number;if([2,5,6,10].includes(sign)||(sign===8&&degree<15))anchor=norm(lagna.longitude+180);else if([0,1,4].includes(sign)||(sign===9&&degree<15)||(sign===8&&degree>=15))anchor=norm(midheavenLongitude+180);else if([3,7].includes(sign))anchor=lagna.longitude;else anchor=midheavenLongitude;const bhavaDigBalaVirupas=Math.min(forwardArc(anchor,midpointLongitude),forwardArc(midpointLongitude,anchor))/3,drishtiContributions=placements.filter((item)=>classical.has(item.name)).map((aspector)=>{const aspectVirupas=sphutaDrishtiVirupas(aspector.name as "Sun"|"Moon"|"Mars"|"Mercury"|"Jupiter"|"Venus"|"Saturn",forwardArc(aspector.longitude,midpointLongitude)),multiplier=aspector.name==="Mercury"||aspector.name==="Jupiter"?1:.25,signedVirupas=(benefics.has(aspector.name)?1:-1)*aspectVirupas*multiplier;return{aspector:aspector.name,aspectVirupas,multiplier,signedVirupas};}),bhavaDrishtiBalaVirupas=drishtiContributions.reduce((sum,item)=>sum+item.signedVirupas,0);return{house,midpointLongitude,sign,lord,bhavadhipatiBalaVirupas,bhavaDigBalaVirupas,bhavaDrishtiBalaVirupas,totalVirupas:bhavadhipatiBalaVirupas+bhavaDigBalaVirupas+bhavaDrishtiBalaVirupas,drishtiContributions};});
  return{status:"computed",houseSystem,convention:"BPHS Bhavadhipati + sign-specific Bhava Dig Bala + Sphuta Drishti (Mercury/Jupiter full; other aspects quartered)",values,notice:"Raw research Virupas only; no deterministic outcome is inferred."};
}

export function calculateHouses(placements: Placement[], birthJulianDay?: number, sunriseJulianDay?: number | null, sunriseSunLongitude?: number, latitude?:number, longitude?:number, ayanamsaDegrees?:number,selectedSystem:"whole-sign"|"equal"|"sripati"="whole-sign",planetStrengths:PlanetStrength[]=[] ) {
  const lagna = placements.find((p) => p.name === "Lagna")!;
  const boundaries = Array.from({ length: 12 }, (_, house) => ({ house: house + 1, midpointLongitude: norm(lagna.longitude + house * 30), startLongitude: norm(lagna.longitude + house * 30 - 15), endLongitude: norm(lagna.longitude + house * 30 + 15) }));
  const planetHouses = placements.filter((p) => p.name !== "Lagna").map((planet) => ({ name: planet.name, wholeSignHouse: ((planet.sign - lagna.sign + 12) % 12) + 1, equalBhavaHouse: Math.floor(norm(planet.longitude - lagna.longitude + 15) / 30) + 1 }));
  const values = Array.from({ length: 12 }, (_, houseIndex) => {
    const houseSign = (lagna.sign + houseIndex) % 12;
    const lord = LORDS[houseSign];
    const lordSign = placements.find((p) => p.name === lord)!.sign;
    const lordDistance = (lordSign - houseSign + 12) % 12;
    let padaSign = (lordSign + lordDistance) % 12;
    if (padaSign === houseSign || padaSign === (houseSign + 6) % 12) padaSign = (lordSign + 9) % 12;
    return { house: houseIndex + 1, houseSign, lord, lordSign, padaSign, label: houseIndex === 0 ? "Arudha Lagna" : houseIndex === 11 ? "Upapada Lagna" : `A${houseIndex + 1}` };
  });
  const elapsedGhatis = birthJulianDay !== undefined && sunriseJulianDay != null ? (birthJulianDay - sunriseJulianDay) * 60 : null;
  const temporalValues = elapsedGhatis !== null && sunriseSunLongitude !== undefined ? [
    { name:"Bhava Lagna", longitude:norm(sunriseSunLongitude + elapsedGhatis * 6), rate:"30 degrees per 5 ghatis" },
    { name:"Hora Lagna", longitude:norm(sunriseSunLongitude + elapsedGhatis * 12), rate:"30 degrees per 2.5 ghatis" },
    { name:"Ghati Lagna", longitude:norm(sunriseSunLongitude + elapsedGhatis * 30), rate:"30 degrees per ghati" },
  ].map((item) => ({ ...item, sign:Math.floor(item.longitude / 30), degree:item.longitude % 30 })) : [];
  const moon=placements.find((item)=>item.name==="Moon")!,ninthFromLagna=(lagna.sign+8)%12,ninthFromMoon=(moon.sign+8)%12,kala:Record<string,number>={Sun:30,Moon:16,Mars:6,Mercury:8,Jupiter:10,Venus:12,Saturn:1},induUnits=kala[LORDS[ninthFromLagna]]+kala[LORDS[ninthFromMoon]],induOffset=(induUnits%12||12)-1,induSign=(moon.sign+induOffset)%12,induLongitude=induSign*30+moon.degree;
  const nakshatraSpan=360/27,nakshatraFraction=(moon.longitude%nakshatraSpan)/nakshatraSpan,sreeLongitude=norm(lagna.longitude+nakshatraFraction*360);
  const targetedValues:Array<{name:string;longitude:number;sign:number;degree:number;evidence:Record<string,string|number>}>= [{name:"Indu Lagna",longitude:induLongitude,sign:induSign,degree:induLongitude%30,evidence:{ninthLordFromLagna:LORDS[ninthFromLagna],ninthLordFromMoon:LORDS[ninthFromMoon],kalaSum:induUnits}},{name:"Sree Lagna",longitude:sreeLongitude,sign:Math.floor(sreeLongitude/30),degree:sreeLongitude%30,evidence:{moonNakshatraFraction:nakshatraFraction}}];
  const targetedLagnas={status:"structural-research-preview",values:targetedValues,convention:"Indu: sum Kala values of ninth lords from Lagna and Moon, count remainder from Moon. Sree: add Moon's traversed Nakshatra fraction scaled to 360° to Lagna.",notice:"Structural positions only; prosperity outcomes require reviewed interpretive rules."};
  const sripati=birthJulianDay!==undefined&&latitude!==undefined&&longitude!==undefined&&ayanamsaDegrees!==undefined?calculateSripati(placements,birthJulianDay,latitude,longitude,ayanamsaDegrees):{status:"unavailable",convention:"Sripati quadrant trisection",midheaven:null,madhyas:[],sandhis:[],planetHouses:[],notice:"Birth instant and location are required."};
  const midheavenSidereal=birthJulianDay!==undefined&&longitude!==undefined&&ayanamsaDegrees!==undefined?calculateMidheaven(birthJulianDay,longitude,ayanamsaDegrees).siderealLongitude:norm(lagna.longitude+270);
  const completeStrengths=planetStrengths.every((item)=>item.shadbalaTotalVirupas!==null);
  const bhavaBala=selectedSystem==="whole-sign"?{status:"unsupported-house-system",houseSystem:selectedSystem,values:[],notice:"Bhava Bala requires explicit Bhava Madhyas; select equal or Sripati rather than silently mixing whole-sign houses with cusps."}:!planetStrengths.length||!completeStrengths?{status:"unavailable",houseSystem:selectedSystem,values:[],notice:"Complete planetary Shadbala is required."}:selectedSystem==="sripati"&&sripati.status!=="supported"?{status:"unavailable",houseSystem:selectedSystem,values:[],notice:"Sripati Madhyas are unavailable at this location."}:calculateBhavaBala(placements,selectedSystem==="sripati"?sripati.madhyas:boundaries,midheavenSidereal,planetStrengths as Array<{name:string;shadbalaTotalVirupas:number}>,selectedSystem);
  return {
    selectedSystem,
    wholeSign: { status: "supported", convention: "one sidereal sign per house from Lagna" },
    equalBhava: { status: "preview", convention: "30-degree houses centered on the sidereal Lagna; not Sripati", boundaries, planetHouses },
    sripati,
    bhavaBala,
    arudhas: { status: "supported-with-declared-convention", exceptionRule: "same or seventh result moves ten signs from the lord", values },
    temporalLagnas: { status: temporalValues.length ? "preview" : "unavailable", convention: "BPHS elapsed-ghati method, measured from local apparent sunrise and added to the sidereal Sun at sunrise", elapsedGhatis, values: temporalValues, notice: temporalValues.length ? "Formula implemented; external reference-chart certification remains pending." : "Unavailable when no sunrise is found, including some polar dates." },
    targetedLagnas,
  };
}
