import{mkdtemp,rm}from"node:fs/promises";import{tmpdir}from"node:os";import{join}from"node:path";import{spawnSync}from"node:child_process";
const directory=await mkdtemp(join(tmpdir(),"sahadeva-migrations-"));
try{const command=process.platform==="win32"?"npx.cmd":"npx",result=spawnSync(command,["wrangler","d1","migrations","apply","sahadeva","--local","--persist-to",directory],{stdio:"inherit"});if(result.status!==0)process.exitCode=result.status||1;}finally{await rm(directory,{recursive:true,force:true});}
