import {snapshotSchema,type LocalSnapshot} from './local-model';

// The original format ID stays stable so existing encrypted backups still open.
const MAGIC=new TextEncoder().encode('LESERAUM2');
const MAX_FILE=12*1024*1024;
const MAX_PLAIN=24*1024*1024;
const encoder=new TextEncoder();
function bytes(value:Uint8Array){return value.slice().buffer as ArrayBuffer;}
async function collect(stream:ReadableStream<Uint8Array>,limit:number){
  const reader=stream.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw new Error('Die Sicherung ist zu groß.');chunks.push(value);}}
  catch(error){await reader.cancel();throw error;}
  const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length;}return out;
}
async function keyFromPassword(password:string,salt:Uint8Array){
  const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(salt),iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptSnapshot(snapshot:LocalSnapshot,password:string):Promise<Uint8Array>{
  if(password.length<12||password.length>300)throw new Error('Verwende ein Passwort mit mindestens 12 und höchstens 300 Zeichen.');
  const plain=encoder.encode(JSON.stringify(snapshotSchema.parse(snapshot)));
  if(plain.length>MAX_PLAIN)throw new Error('Die Sicherung ist zu groß.');
  const compressed=await collect(new Blob([bytes(plain)]).stream().pipeThrough(new CompressionStream('gzip')),MAX_FILE);
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await keyFromPassword(password,salt);
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:bytes(iv),additionalData:bytes(MAGIC)},key,bytes(compressed)));
  const out=new Uint8Array(MAGIC.length+salt.length+iv.length+encrypted.length);
  out.set(MAGIC);out.set(salt,MAGIC.length);out.set(iv,MAGIC.length+16);out.set(encrypted,MAGIC.length+28);
  if(out.length>MAX_FILE)throw new Error('Die Sicherung ist zu groß.');return out;
}
export async function decryptSnapshot(file:Uint8Array,password:string):Promise<LocalSnapshot>{
  if(file.length>MAX_FILE||file.length<MAGIC.length+44||!MAGIC.every((v,i)=>file[i]===v))throw new Error('Das ist keine unterstützte Sicherung.');
  if(password.length>300)throw new Error('Das Passwort ist zu lang.');
  const salt=file.slice(MAGIC.length,MAGIC.length+16),iv=file.slice(MAGIC.length+16,MAGIC.length+28);
  let compressed:ArrayBuffer;
  try{const key=await keyFromPassword(password,salt);compressed=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:bytes(MAGIC)},key,bytes(file.slice(MAGIC.length+28)));}
  catch{throw new Error('Das Passwort stimmt nicht oder die Datei wurde verändert.');}
  try{
    const plain=await collect(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),MAX_PLAIN);
    return snapshotSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain)));
  }catch{throw new Error('Die Sicherung enthält keine gültigen Lesedaten oder überschreitet die Größenbegrenzung.');}
}
export function downloadFile(content:Blob,filename:string){
  const url=URL.createObjectURL(content);const link=document.createElement('a');
  link.href=url;link.download=filename;link.hidden=true;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
