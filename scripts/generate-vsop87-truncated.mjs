import {writeFile} from "node:fs/promises";

const bodies=["mercury","venus","earth","mars","jupiter","saturn"],threshold=1e-6,data={};
for(const body of bodies){
  const {default:source}=await import(`astronomia/data/vsop87D${body}`),filtered={name:source.name,type:source.type,L:{},B:{},R:{}};
  for(const coordinate of ["L","B","R"])for(const [power,terms] of Object.entries(source[coordinate]))filtered[coordinate][power]=terms.filter(([amplitude])=>Math.abs(amplitude)>=threshold);
  data[body[0].toUpperCase()+body.slice(1)]=filtered;
}
const header=`// Generated from the public VSOP87D series distributed with astronomia 4.2.0.\n// Terms with amplitude below ${threshold} radians/AU are omitted; regenerate with npm run fixtures:vsop87.\n`;
await writeFile(new URL("../shared/vsop87Data.ts",import.meta.url),`${header}export const VSOP87_TRUNCATED=${JSON.stringify(data)} as const;\n`);
console.log(`Wrote truncated VSOP87 data for ${bodies.length} bodies.`);
