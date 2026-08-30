import type { GrahaName, Placement } from "./schema";
import {calculateAspects,calculateVargas} from "./advanced";
import {calendarLordBala} from "./calendarBala";
import {calculateCheshtaBala} from "./cheshta";

const CLASSICAL = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
type Classical = typeof CLASSICAL[number];
type SolarEventWindow = { sunrises: number[]; sunsets: number[] };
const FRIENDS: Record<Classical, Classical[]> = {
  Sun:["Moon","Mars","Jupiter"], Moon:["Sun","Mercury"], Mars:["Sun","Moon","Jupiter"], Mercury:["Sun","Venus"],
  Jupiter:["Sun","Moon","Mars"], Venus:["Mercury","Saturn"], Saturn:["Mercury","Venus"],
};
const ENEMIES: Record<Classical, Classical[]> = {
  Sun:["Venus","Saturn"], Moon:[], Mars:["Mercury"], Mercury:["Moon"], Jupiter:["Mercury","Venus"], Venus:["Sun","Moon"], Saturn:["Sun","Moon","Mars"],
};
const NAISARGIKA_VIRUPAS: Record<Classical, number> = { Sun:60, Moon:51.43, Venus:42.85, Jupiter:34.28, Mercury:25.71, Mars:17.14, Saturn:8.57 };
const WAR_PLANETS = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
const EXALTATION: Record<Classical, number> = { Sun:10, Moon:33, Mars:298, Mercury:165, Jupiter:95, Venus:357, Saturn:200 };
const DIG_DIRECTION: Record<Classical, number> = { Sun:10, Mars:10, Moon:4, Venus:4, Jupiter:1, Mercury:1, Saturn:7 };
const FEMALE = new Set<Classical>(["Moon","Venus"]);
const MALE = new Set<Classical>(["Sun","Mars","Jupiter"]);
const SIGN_LORDS:Classical[]=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
const SAPTAVARGAS=["D1","D2","D3","D7","D9","D12","D30"] as const;
const RELATION_SCORE:Record<string,number>={"great-friend":22.5,friend:15,neutral:7.5,enemy:3.75,"great-enemy":1.875};
const MOOLATRIKONA:Record<Classical,{sign:number,start:number;end:number}>={Sun:{sign:4,start:0,end:20},Moon:{sign:1,start:4,end:30},Mars:{sign:0,start:0,end:12},Mercury:{sign:5,start:16,end:20},Jupiter:{sign:8,start:0,end:10},Venus:{sign:6,start:0,end:15},Saturn:{sign:10,start:0,end:20}};
const REQUIRED_SHADBALA_VIRUPAS:Record<Classical,number>={Sun:390,Moon:360,Mars:300,Mercury:420,Jupiter:390,Venus:330,Saturn:300};
export const GRAHA_YUDDHA_CONVENTION={id:"bphs-northern-latitude-transfer",version:"1.0.0",eligibility:"two Tara Grahas separated by less than one degree",winner:"greater geocentric ecliptic latitude",transfer:"absolute difference of preliminary Shadbala, added to winner and deducted from loser"} as const;
export function grahaYuddhaWinner(first:{name:GrahaName;eclipticLatitude?:number},second:{name:GrahaName;eclipticLatitude?:number}){if(first.eclipticLatitude===undefined||second.eclipticLatitude===undefined||first.eclipticLatitude===second.eclipticLatitude)return null;return first.eclipticLatitude>second.eclipticLatitude?{winner:first.name,loser:second.name}:{winner:second.name,loser:first.name};}

const distance = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
const permanent = (from: Classical, to: Classical) => FRIENDS[from].includes(to) ? "friend" : ENEMIES[from].includes(to) ? "enemy" : "neutral";
const compound = (natural: string, temporary: string) => {
  if (natural === "friend" && temporary === "friend") return "great-friend";
  if ((natural === "neutral" && temporary === "friend")) return "friend";
  if ((natural === "enemy" && temporary === "friend") || (natural === "friend" && temporary === "enemy")) return "neutral";
  if (natural === "neutral" && temporary === "enemy") return "enemy";
  return "great-enemy";
};

export function sphutaDrishtiVirupas(aspector:Classical,angle:number){const a=((angle%360)+360)%360;let value=a<30?0:a<60?(a-30)/2:a<90?a-45:a<120?30+(120-a)/2:a<150?150-a:a<180?2*(a-150):a<300?(300-a)/2:0;if(aspector==="Mars"){if(a>=90&&a<120)value=45+(a-90)/2;else if(a>=120&&a<150)value=2*(150-a);else if(a>=180&&a<210)value=60;else if(a>=210&&a<240)value=270-a;}else if(aspector==="Jupiter"){if(a>=90&&a<120)value=45+(a-90)/2;else if(a>=120&&a<150)value=2*(150-a);else if(a>=210&&a<=240)value=45+(a-210)/2;else if(a>240&&a<270)value=15+2*(270-a)/3;}else if(aspector==="Saturn"){if(a>=30&&a<60)value=2*(a-30);else if(a>=60&&a<90)value=45+(90-a)/2;else if(a>=240&&a<270)value=a-210;else if(a>=270&&a<300)value=2*(300-a);}return Math.max(0,Math.min(60,value));}

function saptavargaja(planet:Placement&{name:Classical},classical:Array<Placement&{name:Classical}>){const vargas=calculateVargas(classical),details=SAPTAVARGAS.map((varga)=>{const sign=vargas[varga].find((item)=>item.name===planet.name)!.sign,lord=SIGN_LORDS[sign];if(sign===Math.floor(EXALTATION[planet.name]/30))return{varga,sign,lord,relationship:"exalted",virupas:60};if(varga==="D1"){const mt=MOOLATRIKONA[planet.name];if(sign===mt.sign&&planet.degree>=mt.start&&planet.degree<mt.end)return{varga,sign,lord,relationship:"moolatrikona",virupas:45};}if(lord===planet.name)return{varga,sign,lord,relationship:"own",virupas:30};const lordSign=vargas[varga].find((item)=>item.name===lord)!.sign,house=((lordSign-sign+12)%12)+1,relation=compound(permanent(planet.name,lord),[2,3,4,10,11,12].includes(house)?"friend":"enemy");return{varga,sign,lord,relationship:relation,virupas:RELATION_SCORE[relation]};});return{totalVirupas:details.reduce((sum,item)=>sum+item.virupas,0),details};}

export function tribhagaBala(julianDay:number,window:SolarEventWindow){
  const events=[...window.sunrises.map((jd)=>({jd,type:"sunrise" as const})),...window.sunsets.map((jd)=>({jd,type:"sunset" as const}))].sort((a,b)=>a.jd-b.jd);
  const start=[...events].reverse().find((event)=>event.jd<=julianDay),end=events.find((event)=>event.jd>julianDay);
  const values=Object.fromEntries(CLASSICAL.map((name)=>[name,name==="Jupiter"?60:0])) as Record<Classical,number>;
  if(!start||!end||start.type===end.type)return{status:"unavailable" as const,period:null,third:null,lord:null,values,notice:"A bracketing sunrise/sunset pair is required."};
  const period=start.type==="sunrise"?"day":"night",lords=period==="day"?["Mercury","Sun","Saturn"] as const:["Moon","Venus","Mars"] as const;
  const third=Math.min(2,Math.floor(3*(julianDay-start.jd)/(end.jd-start.jd))),lord=lords[third];values[lord]=60;
  return{status:"computed" as const,period,third:third+1,lord,values,notice:"BPHS day/night thirds; Jupiter receives 60 Virupas at all times."};
}

const AYANA_NORTH = new Set<Classical>(["Sun","Mars","Jupiter","Venus"]);
export function ayanaBalaFromDeclination(planet:Classical,declinationDegrees:number,maximumDeclination=23.45){
  const signed=planet==="Mercury"?Math.abs(declinationDegrees):AYANA_NORTH.has(planet)?declinationDegrees:-declinationDegrees;
  const ordinary=Math.max(0,Math.min(60,30+30*signed/maximumDeclination));
  return planet==="Sun"?ordinary*2:ordinary;
}

function declination(longitude:number,latitude:number,julianDay:number){const rad=Math.PI/180,epsilon=(23.439291-.0130042*(julianDay-2451545)/36525)*rad,lambda=longitude*rad,beta=latitude*rad;return Math.asin(Math.sin(beta)*Math.cos(epsilon)+Math.cos(beta)*Math.sin(epsilon)*Math.sin(lambda))/rad;}

export function calculatePlanetaryStates(placements: Placement[], julianDay?: number, geographicLongitude = 0,solarWindow?:SolarEventWindow) {
  const classical = placements.filter((p): p is Placement & { name: Classical } => CLASSICAL.includes(p.name as Classical));
  const lagna = placements.find((p) => p.name === "Lagna")!;
  const sun = placements.find((p) => p.name === "Sun")!;
  const moon = placements.find((p) => p.name === "Moon")!;
  const localMeanDayFraction = julianDay === undefined ? null : (((julianDay - 0.5 + geographicLongitude / 360) % 1) + 1) % 1;
  const distanceFromMidnightGhatis = localMeanDayFraction === null ? null : Math.min(localMeanDayFraction * 60, (1 - localMeanDayFraction) * 60);
  const unnataBala = distanceFromMidnightGhatis === null ? null : distanceFromMidnightGhatis * 2;
  const nataBala = unnataBala === null ? null : 60 - unnataBala;
  const elongation = ((moon.longitude - sun.longitude) % 360 + 360) % 360;
  const pakshaBenefic = Math.min(elongation, 360 - elongation) / 3;
  const benefics=new Set<Classical>(["Jupiter","Venus","Mercury",...(elongation<=180?["Moon" as Classical]:[])]);
  const tribhaga=julianDay===undefined||!solarWindow?null:tribhagaBala(julianDay,solarWindow);
  const governingSunrise=julianDay===undefined||!solarWindow?undefined:[...solarWindow.sunrises].filter((value)=>value<=julianDay).sort((a,b)=>b-a)[0];
  const calendarBala=julianDay===undefined||governingSunrise===undefined?null:calendarLordBala(julianDay,geographicLongitude,governingSunrise);
  const cheshtaBala=julianDay===undefined?null:calculateCheshtaBala(placements,julianDay);
  const relationships = classical.flatMap((from) => classical.filter((to) => to !== from).map((to) => {
    const house = ((to.sign - from.sign + 12) % 12) + 1;
    const temporary = [2,3,4,10,11,12].includes(house) ? "friend" : "enemy";
    const natural = permanent(from.name, to.name);
    return { from: from.name, to: to.name, natural, temporary, compound: compound(natural, temporary), houseDistance: house };
  }));
  const grahaAspects=calculateAspects(placements),DIPTADI_PRECEDENCE=["kopa","khala","dipta","svastha","vikala","pramudita","santa","duhkhita","dina"];
  const baseAvasthas = classical.map((planet) => {
    const directStage = Math.min(4, Math.floor(planet.degree / 6));
    const signStage = planet.sign % 2 === 0 ? directStage : 4 - directStage;
    const stage = planet.retrograde ? 4 - signStage : signStage;
    const names = ["bala", "kumara", "yuva", "vriddha", "mrita"];
    const strengths = [25, 50, 100, 50, 0];
    const signLord=SIGN_LORDS[planet.sign],signRelation=signLord===planet.name?"own":permanent(planet.name,signLord),signCompound=signLord===planet.name?"own":relationships.find(row=>row.from===planet.name&&row.to===signLord)?.compound??signRelation,exaltationSign=Math.floor(EXALTATION[planet.name]/30),debilitationSign=(exaltationSign+6)%12,mt=MOOLATRIKONA[planet.name],inMoolatrikona=planet.sign===mt.sign&&planet.degree>=mt.start&&planet.degree<mt.end,joined=classical.filter(other=>other.name!==planet.name&&other.sign===planet.sign).map(other=>other.name),joinedHarsh=joined.some(name=>["Sun","Mars","Saturn"].includes(name)),joinedNode=placements.some(other=>(other.name==="Rahu"||other.name==="Ketu")&&other.sign===planet.sign),joinedBenefic=joined.some(name=>["Moon","Mercury","Jupiter","Venus"].includes(name)),joinedEnemy=joined.some(name=>permanent(planet.name,name)==="enemy"),joinedFriend=joined.some(name=>permanent(planet.name,name)==="friend"),aspectorNames=grahaAspects.filter(row=>row.to===planet.name).map(row=>row.from).filter((name):name is Classical=>CLASSICAL.includes(name as Classical)),maleficAspect=aspectorNames.some(name=>["Sun","Mars","Saturn"].includes(name)),beneficAspect=aspectorNames.some(name=>["Moon","Mercury","Jupiter","Venus"].includes(name)),enemyAspect=aspectorNames.some(name=>permanent(planet.name,name)==="enemy"),combust=distance(planet.longitude,sun.longitude)<=(["Mercury","Venus"].includes(planet.name)?10:8)&&planet.name!=="Sun",diptadiCandidates=[...(planet.sign===exaltationSign?["dipta"]:[]),...(inMoolatrikona||signRelation==="own"?["svastha"]:[]),...(signCompound==="great-friend"?["pramudita"]:[]),...(signCompound==="friend"||signRelation==="friend"?["santa"]:[]),...(signRelation==="neutral"?["dina"]:[]),...(signRelation==="enemy"?["duhkhita"]:[]),...(joinedEnemy?["vikala"]:[]),...(planet.sign===debilitationSign?["khala"]:[]),...(combust?["kopa"]:[])],diptadiAvastha=DIPTADI_PRECEDENCE.find(name=>diptadiCandidates.includes(name))??"dina",lajjitadiAvasthas=[...(joinedNode||joinedHarsh?["lajjita"]:[]),...(planet.sign===exaltationSign||inMoolatrikona?["garvita"]:[]),...((signRelation==="enemy"||joinedEnemy||enemyAspect)&&(joinedHarsh||maleficAspect)?["kshudhita"]:[]),...([3,7,11].includes(planet.sign)&&enemyAspect&&!beneficAspect?["trshita"]:[]),...((joinedFriend||signRelation==="friend")&&(joinedBenefic||beneficAspect)?["mudita"]:[]),...(combust&&maleficAspect&&enemyAspect?["kshobhita"]:[])];
    const debilitation = (EXALTATION[planet.name] + 180) % 360;
    const uchchaBalaVirupas = distance(planet.longitude, debilitation) / 3;
    const strongestMidpoint = (lagna.longitude + (DIG_DIRECTION[planet.name] - 1) * 30) % 360;
    const powerlessMidpoint = (strongestMidpoint + 180) % 360;
    const digBalaVirupas = distance(planet.longitude, powerlessMidpoint) / 3;
    const navamsaSign = Math.floor((((planet.longitude * 9) % 360) + 360) % 360 / 30);
    const preferredParity = FEMALE.has(planet.name) ? 1 : 0;
    const ojhayugmaBalaVirupas = (planet.sign % 2 === preferredParity ? 15 : 0) + (navamsaSign % 2 === preferredParity ? 15 : 0);
    const houseFromLagna = ((planet.sign - lagna.sign + 12) % 12) + 1;
    const kendradiBalaVirupas = [1,4,7,10].includes(houseFromLagna) ? 60 : [2,5,8,11].includes(houseFromLagna) ? 30 : 15;
    const drekkanaIndex = Math.min(2, Math.floor(planet.degree / 10));
    const preferredDrekkana = MALE.has(planet.name) ? 0 : FEMALE.has(planet.name) ? 1 : 2;
    const drekkanaBalaVirupas = drekkanaIndex === preferredDrekkana ? 15 : 0;
    const nathonnataBalaVirupas = planet.name === "Mercury" ? 60 : ["Sun","Jupiter","Venus"].includes(planet.name) ? unnataBala : nataBala;
    const pakshaBalaVirupas = ["Moon","Mercury","Jupiter","Venus"].includes(planet.name) ? pakshaBenefic : 60 - pakshaBenefic;
    const saptavargajaBala=saptavargaja(planet,classical),drikContributions=classical.filter((aspector)=>aspector.name!==planet.name).map((aspector)=>{const aspectVirupas=sphutaDrishtiVirupas(aspector.name,normAngle(planet.longitude-aspector.longitude)),benefic=benefics.has(aspector.name);return{aspector:aspector.name,aspectVirupas,polarity:benefic?"benefic":"malefic",signedVirupas:(benefic?1:-1)*aspectVirupas/4};}),drikBalaVirupas=drikContributions.reduce((sum,item)=>sum+item.signedVirupas,0);
    const declinationDegrees=julianDay!==undefined&&planet.tropicalLongitude!==undefined&&planet.eclipticLatitude!==undefined?declination(planet.tropicalLongitude,planet.eclipticLatitude,julianDay):null,ayanaBalaVirupas=declinationDegrees===null?null:ayanaBalaFromDeclination(planet.name,declinationDegrees);
    return { name: planet.name, balaadiAvastha: names[stage],diptadiAvastha,diptadiCandidates,lajjitadiAvasthas,avasthaSource:{work:"Jyotisha Fundamentals",sections:["5.2.1","5.2.2","5.2.3"],selectionPrecedence:DIPTADI_PRECEDENCE}, avasthaStrengthPercent: strengths[stage], naisargikaBalaVirupas: NAISARGIKA_VIRUPAS[planet.name], uchchaBalaVirupas, digBalaVirupas, ojhayugmaBalaVirupas, kendradiBalaVirupas, drekkanaBalaVirupas, saptavargajaBalaVirupas:saptavargajaBala.totalVirupas,saptavargajaDetails:saptavargajaBala.details,nathonnataBalaVirupas, pakshaBalaVirupas,tribhagaBalaVirupas:tribhaga?.values[planet.name]??null,calendarLordBalaVirupas:calendarBala?.values[planet.name]??null,declinationDegrees,ayanaBalaVirupas,cheshtaBalaVirupas:cheshtaBala?.values[planet.name]??null,drikBalaVirupas,drikContributions, retrograde: Boolean(planet.retrograde) };
  });
  const preliminaryTotals=Object.fromEntries(baseAvasthas.map((value)=>[value.name,value.uchchaBalaVirupas+value.saptavargajaBalaVirupas+value.ojhayugmaBalaVirupas+value.kendradiBalaVirupas+value.drekkanaBalaVirupas+value.digBalaVirupas+(value.nathonnataBalaVirupas??0)+value.pakshaBalaVirupas+(value.tribhagaBalaVirupas??0)+(value.calendarLordBalaVirupas??0)+(value.ayanaBalaVirupas??0)+(value.cheshtaBalaVirupas??0)+value.naisargikaBalaVirupas+value.drikBalaVirupas])) as Record<Classical,number>;
  const inputsComplete=tribhaga?.status==="computed"&&calendarBala!==null&&cheshtaBala!==null&&baseAvasthas.every((value)=>value.nathonnataBalaVirupas!==null&&value.ayanaBalaVirupas!==null);
  const yuddhaAdjustments=Object.fromEntries(CLASSICAL.map((name)=>[name,0])) as Record<Classical,number>;
  const grahaYuddhaCandidates: Array<{ first: GrahaName; second: GrahaName; separationDegrees: number; winner:GrahaName|null;loser:GrahaName|null;transferVirupas:number;status: string }> = [];
  for (let i = 0; i < WAR_PLANETS.length; i++) for (let j = i + 1; j < WAR_PLANETS.length; j++) {
    const first = placements.find((p) => p.name === WAR_PLANETS[i])!;
    const second = placements.find((p) => p.name === WAR_PLANETS[j])!;
    const separationDegrees = distance(first.longitude, second.longitude);
    if (separationDegrees < 1) {const result=grahaYuddhaWinner(first,second);if(!result||!inputsComplete)grahaYuddhaCandidates.push({first:first.name,second:second.name,separationDegrees,winner:result?.winner??null,loser:result?.loser??null,transferVirupas:0,status:!result?"unresolved: distinct ecliptic latitudes required":"unresolved: complete preliminary Shadbala required"});else{const winner=result.winner as Classical,loser=result.loser as Classical,transferVirupas=Math.abs(preliminaryTotals[first.name as Classical]-preliminaryTotals[second.name as Classical]);yuddhaAdjustments[winner]+=transferVirupas;yuddhaAdjustments[loser]-=transferVirupas;grahaYuddhaCandidates.push({first:first.name,second:second.name,separationDegrees,winner,loser,transferVirupas,status:"resolved"});}}
  }
  const avasthas=baseAvasthas.map((value)=>{const total=inputsComplete?preliminaryTotals[value.name]+yuddhaAdjustments[value.name]:null;return{...value,yuddhaBalaVirupas:inputsComplete?yuddhaAdjustments[value.name]:null,shadbalaTotalVirupas:total,requiredVirupas:REQUIRED_SHADBALA_VIRUPAS[value.name],requiredStrengthRatio:total===null?null:total/REQUIRED_SHADBALA_VIRUPAS[value.name]};});
  return {
    avasthas,
    relationships,
    grahaYuddhaCandidates,
    shadbala: { status:inputsComplete?"computed":"unavailable", computedComponents:["naisargika-bala","uchcha-bala","ojhayugma-rasiamsa-bala","kendradi-bala","drekkana-bala","saptavargaja-bala","dig-bala (equal-bhava convention)","nathonnata-bala (local mean time)","paksha-bala",...(tribhaga?.status==="computed"?["tribhaga-bala"]:[]),...(calendarBala?["varsha-masa-dina-hora-bala"]:[]),"ayana-bala (true ecliptic latitude)",...(cheshtaBala?["cheshta-bala (JPL mean elements)"]:[]),"drik-bala (sphuta-drishti)",...(inputsComplete?["graha-yuddha-bala (northern latitude transfer)"]:[])], unavailableComponents:inputsComplete?[]:[...(tribhaga?.status==="computed"?[]:["tribhaga-bala"]),...(calendarBala?[]:["varsha-masa-dina-hora-bala"]),...(cheshtaBala?[]:["cheshta-bala"]),"graha-yuddha-bala"], conventionIds:["bphs-jpl-mean-elements","bphs-solar-ingress-equal-hora","bphs-northern-latitude-transfer"], notice:inputsComplete?"Complete raw Virupa totals and classical required-strength ratios are exposed as research calculations. They are not deterministic life-outcome scores.":"Totals are unavailable because one or more required astronomical or solar-event inputs are missing." },
    grahaYuddhaConvention:GRAHA_YUDDHA_CONVENTION,
    tribhaga,
    calendarBala,
    cheshtaBala,
  };
}

const normAngle=(value:number)=>((value%360)+360)%360;
