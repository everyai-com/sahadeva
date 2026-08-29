import fs from "node:fs";
import path from "node:path";

// Cloudflare D1 rejects very large individual INSERT statements even when the
// migration file itself is valid. Split only top-level multi-row INSERTs while
// preserving every escaped value and the migration's ordering.
const file=path.join(process.cwd(),"migrations/0009_rva_knowledge_catalog.sql");
const input=fs.readFileSync(file,"utf8");
const splitValues=(statement,size=20)=>{
  const marker=" VALUES\n",markerIndex=statement.indexOf(marker);
  if(markerIndex<0)return statement;
  const prefix=statement.slice(0,markerIndex+marker.length),body=statement.slice(markerIndex+marker.length,-1);
  const rows=[];let start=0,inString=false;
  for(let index=0;index<body.length;index++){
    if(body[index]==="'"){
      if(inString&&body[index+1]==="'"){index++;continue;}
      inString=!inString;
    }
    if(!inString&&body.slice(index,index+3)===",\n("){rows.push(body.slice(start,index));start=index+2;}
  }
  rows.push(body.slice(start));
  return Array.from({length:Math.ceil(rows.length/size)},(_,index)=>`${prefix}${rows.slice(index*size,(index+1)*size).join(",\n")};`).join("\n\n");
};
const output=input.replace(/INSERT OR (?:IGNORE|REPLACE) INTO [\s\S]*?;(?=\n\n|\n?$)/g,(statement)=>splitValues(statement));
fs.writeFileSync(file,output);
console.log(JSON.stringify({file,bytesBefore:input.length,bytesAfter:output.length,maxStatementBytes:Math.max(...output.split(";").map((statement)=>Buffer.byteLength(statement)))}));
