import {writeFile} from "node:fs/promises";
import {Moon} from "astronomia/elp";
import data from "astronomia/data/elpMppDe";

const moon=new Moon(data),RAD=Math.PI/180,SEGMENT=360/108,norm=(value)=>((value%360)+360)%360;
const ayanamsa=(jd)=>23.85675+(jd-2451545)/365.2425*(50.290966/3600);
const sidereal=(jd)=>norm(moon.position(jd).lon/RAD-ayanamsa(jd));

function findBoundaries(startJd){
  const fixtures=[],seen=new Set();let low=startJd,lowIndex=Math.floor(sidereal(low)/SEGMENT);
  while(fixtures.length<108&&low<startJd+35){const high=low+1/48,highIndex=Math.floor(sidereal(high)/SEGMENT);if(highIndex!==lowIndex){let a=low,b=high;for(let i=0;i<36;i++){const mid=(a+b)/2;if(Math.floor(sidereal(mid)/SEGMENT)===lowIndex)a=mid;else b=mid;}const boundaryIndex=highIndex%108;if(!seen.has(boundaryIndex)){seen.add(boundaryIndex);fixtures.push({boundaryIndex,nakshatraIndex:Math.floor(boundaryIndex/4),pada:boundaryIndex%4+1,jd:b,modelSiderealLongitude:sidereal(b)});}lowIndex=highIndex;}low=high;}
  if(fixtures.length!==108)throw new Error(`Expected 108 boundaries, found ${fixtures.length}`);
  return fixtures.sort((a,b)=>a.boundaryIndex-b.boundaryIndex);
}

async function horizonsVectors(fixtures){
  const rows=[];
  for(let offset=0;offset<fixtures.length;offset+=20){const chunk=fixtures.slice(offset,offset+20),params=new URLSearchParams({format:"text",COMMAND:"'301'",OBJ_DATA:"'NO'",MAKE_EPHEM:"'YES'",EPHEM_TYPE:"'VECTORS'",CENTER:"'500@399'",TLIST:chunk.map((item)=>item.jd.toFixed(12)).join("\n"),VEC_TABLE:"'2'",REF_PLANE:"'ECLIPTIC'",OUT_UNITS:"'KM-S'",CSV_FORMAT:"'YES'"});let response;for(let attempt=0;attempt<3;attempt++){response=await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`);if(response.ok)break;await new Promise((resolve)=>setTimeout(resolve,500*(attempt+1)));}if(!response?.ok)throw new Error(`Horizons returned ${response?.status}`);const text=await response.text(),block=text.match(/\$\$SOE\n([\s\S]*?)\n\$\$EOE/)?.[1];if(!block)throw new Error(text.slice(0,500));rows.push(...block.trim().split("\n").map((line)=>{const values=line.split(",").map((value)=>value.trim());return{jd:Number(values[0]),x:Number(values[2]),y:Number(values[3]),z:Number(values[4])};}));}
  if(rows.length!==fixtures.length)throw new Error(`Expected ${fixtures.length} vectors, received ${rows.length}`);return rows;
}

const fixtures=findBoundaries(2460676.5),vectors=await horizonsVectors(fixtures),payload={schemaVersion:"sahadeva-de441-lunar-boundaries-1",generatedAt:new Date().toISOString(),source:"NASA/JPL Horizons API, Moon 301 relative to Earth 399, DE441, J2000 ecliptic vectors, km",boundaryConvention:"ELP/MPP02 candidate sidereal longitude using Sahadeva Lahiri preview; vector values remain independent DE441 references",fixtures:fixtures.map((item,index)=>({...item,...vectors[index]}))};
await writeFile(new URL("../shared/fixtures/de441-lunar-boundaries.json",import.meta.url),`${JSON.stringify(payload,null,2)}\n`);
console.log(`Wrote ${payload.fixtures.length} DE441 boundary fixtures.`);
