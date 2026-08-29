export type BrowserRecovery = { schemaVersion:"sahadeva-browser-recovery-1"; apiKey:string; chartKeys:Record<string,string>; createdAt:string };
export type WrappedRecovery = { schemaVersion:"sahadeva-password-wrapped-recovery-1"; kdf:{name:"PBKDF2-SHA-256";iterations:number;salt:string}; encryption:{name:"AES-256-GCM";iv:string}; ciphertext:string };
const encoder=new TextEncoder(),decoder=new TextDecoder();
const buffer=(bytes:Uint8Array)=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
export const encodeRecoveryBytes=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
export const decodeRecoveryBytes=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=")),(character)=>character.charCodeAt(0));
async function recoveryKey(password:string,salt:Uint8Array,iterations:number,usage:KeyUsage){
  const material=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt:buffer(salt),iterations},material,{name:"AES-GCM",length:256},false,[usage]);
}
export async function wrapRecovery(recovery:BrowserRecovery,password:string,iterations=310000):Promise<WrappedRecovery>{
  if(password.length<10)throw new Error("Recovery password must contain at least 10 characters.");
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await recoveryKey(password,salt,iterations,"encrypt"),cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:buffer(iv)},key,encoder.encode(JSON.stringify(recovery))));
  return {schemaVersion:"sahadeva-password-wrapped-recovery-1",kdf:{name:"PBKDF2-SHA-256",iterations,salt:encodeRecoveryBytes(salt)},encryption:{name:"AES-256-GCM",iv:encodeRecoveryBytes(iv)},ciphertext:encodeRecoveryBytes(cipher)};
}
export async function unwrapRecovery(bundle:WrappedRecovery,password:string):Promise<BrowserRecovery>{
  if(bundle.schemaVersion!=="sahadeva-password-wrapped-recovery-1"||bundle.kdf.name!=="PBKDF2-SHA-256"||bundle.encryption.name!=="AES-256-GCM"||bundle.kdf.iterations<100000||bundle.kdf.iterations>2000000)throw new Error("Unsupported recovery bundle.");
  const iv=decodeRecoveryBytes(bundle.encryption.iv);if(iv.length!==12)throw new Error("Invalid recovery IV.");
  const key=await recoveryKey(password,decodeRecoveryBytes(bundle.kdf.salt),bundle.kdf.iterations,"decrypt"),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:buffer(iv)},key,buffer(decodeRecoveryBytes(bundle.ciphertext))),recovery=JSON.parse(decoder.decode(plain)) as BrowserRecovery;
  if(recovery.schemaVersion!=="sahadeva-browser-recovery-1"||typeof recovery.apiKey!=="string"||!recovery.apiKey.startsWith("sah_")||!recovery.chartKeys||typeof recovery.chartKeys!=="object")throw new Error("Invalid recovery payload.");
  return recovery;
}
