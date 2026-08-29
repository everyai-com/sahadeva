import type { GrahaName, Placement } from "./schema";

type YogaEvidence = { yoga: string; detected: boolean; evidence: string[]; sourceKey: string; status: "structural-only" };
const own: Partial<Record<GrahaName, number[]>> = { Mars:[0,7], Mercury:[2,5], Jupiter:[8,11], Venus:[1,6], Saturn:[9,10] };
const exalted: Partial<Record<GrahaName, number>> = { Mars:9, Mercury:5, Jupiter:3, Venus:11, Saturn:6 };

export function detectStructuralYogas(placements: Placement[]): YogaEvidence[] {
  const lagna = placements.find((p) => p.name === "Lagna")!;
  const byName = (name: GrahaName) => placements.find((p) => p.name === name)!;
  const house = (planet: Placement, origin = lagna) => ((planet.sign - origin.sign + 12) % 12) + 1;
  const kendras = [1,4,7,10];
  const results: YogaEvidence[] = [];
  const mahapurushaNames:Record<string,string>={Mars:"Ruchaka",Mercury:"Bhadra",Jupiter:"Hamsa",Venus:"Malavya",Saturn:"Shasha"};
  for (const planetName of ["Mars","Mercury","Jupiter","Venus","Saturn"] as const) {
    const planet = byName(planetName);
    const qualifiedSign = own[planetName]!.includes(planet.sign) || exalted[planetName] === planet.sign;
    const detected=kendras.includes(house(planet)) && qualifiedSign,evidence=[`${planetName} sign=${planet.sign}`, `houseFromLagna=${house(planet)}`, `ownOrExalted=${qualifiedSign}`,`namedForm=${mahapurushaNames[planetName]}`];
    results.push({ yoga: `${planetName} Mahapurusha candidate`, detected, evidence, sourceKey: "BPHS-pancha-mahapurusha", status: "structural-only" });
    results.push({ yoga: `${mahapurushaNames[planetName]} Yoga candidate`, detected, evidence, sourceKey: `BPHS-pancha-mahapurusha:${mahapurushaNames[planetName].toLowerCase()}`, status: "structural-only" });
  }
  const moon = byName("Moon"), jupiter = byName("Jupiter"), mercury = byName("Mercury"), sun = byName("Sun");
  results.push({ yoga: "Gajakesari candidate", detected: kendras.includes(house(jupiter, moon)), evidence: [`JupiterHouseFromMoon=${house(jupiter, moon)}`], sourceKey: "BPHS-gajakesari", status: "structural-only" });
  results.push({ yoga: "Budha-Aditya conjunction candidate", detected: mercury.sign === sun.sign, evidence: [`SunSign=${sun.sign}`, `MercurySign=${mercury.sign}`, `angularSeparation=${Math.min(Math.abs(sun.longitude-mercury.longitude),360-Math.abs(sun.longitude-mercury.longitude)).toFixed(4)}`], sourceKey: "traditional-budha-aditya", status: "structural-only" });
  const mars=byName("Mars"),venus=byName("Venus"),saturn=byName("Saturn"),rahu=byName("Rahu"),ketu=byName("Ketu");
  results.push({yoga:"Chandra-Mangala conjunction candidate",detected:moon.sign===mars.sign,evidence:[`MoonSign=${moon.sign}`,`MarsSign=${mars.sign}`],sourceKey:"traditional-chandra-mangala",status:"structural-only"});
  const fromMoon=(p:Placement)=>house(p,moon),beneficPlanets=[mercury,jupiter,venus];
  results.push({yoga:"Adhi Yoga candidate",detected:beneficPlanets.some(p=>[6,7,8].includes(fromMoon(p)))&&[6,7,8].every(h=>beneficPlanets.some(p=>fromMoon(p)===h)),evidence:beneficPlanets.map(p=>`${p.name}HouseFromMoon=${fromMoon(p)}`),sourceKey:"traditional-adhi",status:"structural-only"});
  results.push({yoga:"Amala Yoga candidate",detected:beneficPlanets.some(p=>fromMoon(p)===10||house(p)===10),evidence:beneficPlanets.map(p=>`${p.name}:H${house(p)} from Lagna,H${fromMoon(p)} from Moon`),sourceKey:"traditional-amala",status:"structural-only"});
  const adjacentMoon=placements.filter(p=>p.name!=="Lagna"&&!['Sun','Rahu','Ketu'].includes(p.name)&&[2,12].includes(fromMoon(p)));
  results.push({yoga:"Kemadruma structural candidate",detected:adjacentMoon.length===0,evidence:[`Qualifying planets in 2nd/12th from Moon=${adjacentMoon.map(p=>p.name).join(',')||'none'}`],sourceKey:"traditional-kemadruma",status:"structural-only"});
  const arc=(a:number,b:number)=>(b-a+360)%360,nodeArc=arc(rahu.longitude,ketu.longitude),inside=(p:Placement)=>arc(rahu.longitude,p.longitude)<nodeArc,nonNodes=placements.filter(p=>!['Lagna','Rahu','Ketu'].includes(p.name)),insideCount=nonNodes.filter(inside).length,kalaDetected=insideCount===0||insideCount===nonNodes.length;
  results.push({yoga:"Kala Sarpa enclosure candidate",detected:kalaDetected,evidence:[`${insideCount}/${nonNodes.length} classical planets lie on Rahu-to-Ketu arc`,`RahuHouse=${house(rahu)}`,`KetuHouse=${house(ketu)}`],sourceKey:"modern-kala-sarpa-structural",status:"structural-only"});
  const lords:GrahaName[]=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"],exchanges:Array<{a:number;b:number;first:GrahaName;second:GrahaName}>=[];for(let a=0;a<12;a++)for(let b=a+1;b<12;b++){const first=lords[(lagna.sign+a)%12],second=lords[(lagna.sign+b)%12];if(first!==second&&byName(first).sign===(lagna.sign+b)%12&&byName(second).sign===(lagna.sign+a)%12)exchanges.push({a:a+1,b:b+1,first,second});}
  results.push({yoga:"Parivartana Yoga candidate",detected:exchanges.length>0,evidence:exchanges.map(e=>`H${e.a} lord ${e.first} exchanges with H${e.b} lord ${e.second}`),sourceKey:"traditional-parivartana",status:"structural-only"});
  const dusthana=[6,8,12],vip=dusthana.filter(h=>dusthana.includes(house(byName(lords[(lagna.sign+h-1)%12]))));
  results.push({yoga:"Vipareeta Raja Yoga cluster candidate",detected:vip.length>0,evidence:vip.map(h=>`Lord of H${h} occupies another 6/8/12 house`),sourceKey:"traditional-vipareeta-raja",status:"structural-only"});
  const debilitated=Object.entries({Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0}) as Array<[GrahaName,number]>;for(const [name,sign] of debilitated){const p=byName(name),signLord=lords[sign],cancellation=p.sign===sign&&(kendras.includes(house(byName(signLord)))||kendras.includes(house(byName(signLord),moon)));results.push({yoga:`${name} Neechabhanga candidate`,detected:cancellation,evidence:[`${name}InDebilitation=${p.sign===sign}`,`${signLord}HouseFromLagna=${house(byName(signLord))}`,`${signLord}HouseFromMoon=${house(byName(signLord),moon)}`],sourceKey:"traditional-neechabhanga-partial",status:"structural-only"});}
  return results.map(result=>result.evidence.length?result:{...result,evidence:["No qualifying structural configuration detected"]});
}
