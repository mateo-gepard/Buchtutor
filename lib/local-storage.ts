'use client';
import {openDB, type DBSchema, type IDBPTransaction} from 'idb';
import {EMPTY_SNAPSHOT, conflictCopy, mergeSnapshots, noteContent, snapshotSchema, type LocalSnapshot} from './local-model';
import {preferencesSchema,type Prefs} from './preferences';
import type {Anchor,ReadingProgress,SavedNote} from './reader-model';
import {matchesBookmark} from './bookmarks';

interface ReaderDB extends DBSchema {state:{key:string;value:unknown}}
// One bounded checkpoint, committed with the original reader key. Neither the
// IndexedDB name/version nor the portable snapshot/backup format changes.
const recoveryKey='reader:recovery:v1';
type Commit={version:1;revision:number;checksum:string;recovered?:true};
type Recovery=Commit&{data:LocalSnapshot};
const unavailable='Der Gerätespeicher ist nicht verfügbar. Änderungen können gerade nicht gesichert werden.';
const corrupt='Die gespeicherten Lesedaten sind beschädigt. Sie bleiben unverändert erhalten. Bitte eine Gerätesicherung importieren; neue Änderungen können hier noch nicht gespeichert werden.';
const recovered='Lesedaten wurden aus der letzten gültigen lokalen Sicherung geladen. Bitte prüfe deine Einträge und exportiere eine Gerätesicherung.';
let database:ReturnType<typeof openDB<ReaderDB>>|undefined;
let current={data:EMPTY_SNAPSHOT,ready:false,error:''};
const serverState=current;
const listeners=new Set<()=>void>();
let channel:BroadcastChannel|undefined;
let initialized:Promise<void>|undefined;
let readGeneration=0;
function db(){
  if(!database){
    const opened=openDB<ReaderDB>('leseraum-local-v2',1,{upgrade(store){store.createObjectStore('state');},terminated(){database=undefined;}});
    database=opened;void opened.catch(()=>{if(database===opened)database=undefined;});
  }
  return database;
}
function emit(){for(const listener of listeners)listener();}
// Accidental corruption detection, not encryption or an authenticity claim.
function checksum(data:LocalSnapshot){const text=JSON.stringify(data);let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16);}
function recovery(value:unknown):Recovery|null{
  if(!value||typeof value!=='object')return null;
  const record=value as Partial<Recovery>,parsed=snapshotSchema.safeParse(record.data);
  // Check the original payload before schema defaults/migrations are applied.
  return record.version===1&&typeof record.revision==='number'&&Number.isSafeInteger(record.revision)&&record.revision>0&&parsed.success&&record.checksum===checksum(record.data!)?{version:1,revision:record.revision,checksum:record.checksum,data:parsed.data,...(record.recovered===true?{recovered:true}:{})}:null;
}
function primary(value:unknown,backup:Recovery|null){
  const parsed=snapshotSchema.safeParse(value);if(!parsed.success)return null;
  const {_localCommit:stamp,...payload}=value as LocalSnapshot&{_localCommit?:Commit};
  if(stamp!==undefined&&(!stamp||stamp.version!==1||!Number.isSafeInteger(stamp.revision)||stamp.revision<1||stamp.checksum!==checksum(payload)||backup?.revision===stamp.revision&&backup.checksum!==stamp.checksum))return null;
  return parsed.data;
}
function legacyPreferences():LocalSnapshot|null{
  try{
    const parsed=preferencesSchema.safeParse(JSON.parse(localStorage.getItem('leseraum-reading-preferences-v1')??'null'));
    return parsed.success?{...EMPTY_SNAPSHOT,preferences:{value:parsed.data,updatedAt:new Date().toISOString()}}:null;
  }catch{return null;} // An unreadable legacy key remains untouched.
}
function storedSnapshot(stored:unknown,checkpoint:unknown){
  const backup=recovery(checkpoint),parsed=primary(stored,backup);
  if(parsed){const stamp=(stored as {_localCommit?:Commit})._localCommit;return {data:parsed,error:stamp?.recovered?recovered:'',revision:Math.max(backup?.revision??0,stamp?.revision??0),migrate:false};}
  if(backup)return {data:backup.data,error:recovered,revision:backup.revision,migrate:false};
  if(stored!==undefined||checkpoint!==undefined)throw new Error(corrupt);
  const legacy=legacyPreferences();
  return {data:legacy??structuredClone(EMPTY_SNAPSHOT),error:'',revision:0,migrate:!!legacy};
}
function writeTransaction(connection:Awaited<ReturnType<typeof db>>){
  try{return connection.transaction('state','readwrite',{durability:'strict'});}
  catch(error){if(!(error instanceof TypeError)&&!(error instanceof DOMException&&error.name==='NotSupportedError'))throw error;return connection.transaction('state','readwrite');}
}
async function checkpoint(transaction:IDBPTransaction<ReaderDB,['state'],'readwrite'>,data:LocalSnapshot,revision:number,notice=false){
  const stamp:Commit={version:1,revision,checksum:checksum(data),...(notice?{recovered:true}:{})};
  await transaction.store.put({...stamp,data} satisfies Recovery,recoveryKey);
  // Older clients ignore this additive field; exports still use snapshotSchema.
  await transaction.store.put({...data,_localCommit:stamp},'reader');
}
async function preserveUnreadable(transaction:IDBPTransaction<ReaderDB,['state'],'readwrite'>,values:[unknown,unknown]){
  for(const [index,name] of ['reader','checkpoint'].entries()){
    const value=values[index];if(value===undefined||(index===0?!!primary(value,recovery(values[1])):!!recovery(value)))continue;
    const key='reader:unreadable:v1:'+name,previous=await transaction.store.get(key);
    // Keep one quarantined raw record of each kind. Never replace an unknown
    // record or silently discard a second, different damaged snapshot.
    if(previous!==undefined){if(JSON.stringify(previous)!==JSON.stringify({version:1,value}))throw new Error(corrupt);}
    else await transaction.store.put({version:1,value},key);
  }
}
async function read(){
  const generation=++readGeneration,transaction=writeTransaction(await db()),done=transaction.done;
  // Observe aborts immediately, including validation/synchronous request errors.
  void done.catch(()=>{});
  try{
    const values=await Promise.all([transaction.store.get('reader'),transaction.store.get(recoveryKey)]);
    const loaded=storedSnapshot(...values);
    if(loaded.migrate)await checkpoint(transaction,loaded.data,1);
    await done;
    if(generation!==readGeneration)return;
    current={data:loaded.data,ready:true,error:loaded.error};emit();
  }catch(error){try{transaction.abort();}catch{/* Already completed/aborted. */}await done.catch(()=>{});throw error;}
}
export function initializeLocal(){
  if(!initialized)initialized=(async()=>{
    try{
      await read();
      if(typeof BroadcastChannel!=='undefined'){
        try{channel=new BroadcastChannel('leseraum-local-v2');channel.onmessage=()=>{void read().catch(error=>{current={...current,error:error instanceof Error&&error.message===corrupt?corrupt:unavailable};emit();});};}catch{/* IndexedDB remains usable without tab notifications. */}
      }
    }catch(error){
      current={...current,ready:true,error:error instanceof Error&&error.message===corrupt?corrupt:unavailable};emit();
    }
  })();
  return initialized;
}
export function subscribeLocal(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export function getLocalState(){return current;}
export function getServerLocalState(){return serverState;}
export function updateLocal(change:(data:LocalSnapshot)=>LocalSnapshot){return commitLocal(change);}
async function commitLocal(change:(data:LocalSnapshot)=>LocalSnapshot,explicitImport=false,acknowledgeRecovery=false){
  await initializeLocal();
  let transaction:IDBPTransaction<ReaderDB,['state'],'readwrite'>|undefined;
  try{
    transaction=writeTransaction(await db());void transaction.done.catch(()=>{});
    const values=await Promise.all([transaction.store.get('reader'),transaction.store.get(recoveryKey)]);
    let loaded:ReturnType<typeof storedSnapshot>;
    try{loaded=storedSnapshot(...values);}
    catch(error){if(!explicitImport||!(error instanceof Error)||error.message!==corrupt)throw error;loaded={data:structuredClone(EMPTY_SNAPSHOT),error:corrupt,revision:0,migrate:false};}
    const next=snapshotSchema.parse(change(loaded.data));
    await preserveUnreadable(transaction,values);
    const notice=!acknowledgeRecovery&&loaded.error===recovered;
    await checkpoint(transaction,next,loaded.revision+1,notice);
    await transaction.done;
    ++readGeneration;current={data:next,ready:true,error:notice?recovered:''};emit();
    // A closed/unsupported channel must not report a committed write as failed.
    try{channel?.postMessage('changed');}catch{/* Other tabs refresh on their next write. */}
    return next;
  }catch(error){
    try{transaction?.abort();}catch{/* Already completed/aborted. */}
    await transaction?.done.catch(()=>{});
    const message=error instanceof Error&&error.message===corrupt?'Nicht gespeichert: '+corrupt:'Nicht gespeichert: Der Gerätespeicher ist voll, gesperrt oder die Eingabe ist ungültig. Dein Entwurf bleibt geöffnet.';
    current={...current,error:message};emit();throw new Error(message);
  }
}
export function saveLocalNotes(notes:SavedNote[],baselines:readonly SavedNote[]=current.data.notes){
  // Capture before entering the serialized transaction. A stale tab may replace
  // an entry only while retaining the divergent version as a conflict copy.
  const expected=new Map(baselines.map(note=>[note.id,note]));
  return commitLocal(data=>{
    const next=new Map(data.notes.map(note=>[note.id,note]));
    for(const note of notes){
      const previous=next.get(note.id);
      if(previous?.deletedAt&&!note.deletedAt&&!expected.get(note.id)?.deletedAt){
        if(![...next.values()].some(item=>item.conflictOf===note.id&&noteContent(item)===noteContent(note))){const copy=conflictCopy(note);next.set(copy.id,copy);}
        continue; // A stale editor cannot undo another tab's explicit deletion.
      }
      if(previous&&noteContent(previous)!==noteContent(note)&&noteContent(previous)!==noteContent(expected.get(note.id))){
        if(![...next.values()].some(item=>item.conflictOf===note.id&&noteContent(item)===noteContent(previous))){const copy=conflictCopy(previous);next.set(copy.id,copy);}
      }
      next.set(note.id,note);
    }
    return {...data,notes:[...next.values()]};
  },false,true);
}
export function saveLocalNote(note:SavedNote,baseline?:SavedNote){return saveLocalNotes([note],baseline?[baseline]:undefined);}
export function deleteLocalNote(id:string){return updateLocal(data=>({...data,notes:data.notes.map(n=>n.id===id?{...n,deletedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:n)}));}
export function setLocalBookmark(workId:string,editionId:string,anchor:Anchor,enabled:boolean){return updateLocal(data=>{
  const matching=data.notes.filter(note=>matchesBookmark(note,workId,editionId,anchor));
  const now=new Date(Math.max(Date.now(),...matching.map(note=>Date.parse(note.updatedAt)+1))).toISOString();
  if(!enabled)return {...data,notes:data.notes.map(note=>matching.some(item=>item.id===note.id)&&!note.deletedAt?{...note,deletedAt:now,updatedAt:now}:note)};
  if(matching.some(note=>!note.deletedAt))return data;
  // Reuse a removed bookmark's identity so older backups cannot resurrect a duplicate.
  const previous=matching.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
  const note:SavedNote={id:previous?.id??crypto.randomUUID(),workId,editionId,anchor,kind:'bookmark',body:'',createdAt:previous?.createdAt??now,updatedAt:now};
  return {...data,notes:[note,...data.notes.filter(item=>item.id!==note.id)]};
});}
export function saveLocalProgress(progress:ReadingProgress){return updateLocal(data=>{
  // Check inside the transaction, including saves queued by another tab before the toggle.
  if(data.preferences.value.autoBookmark===false)return data;
  const previous=data.progress.find(p=>p.workId===progress.workId&&p.editionId===progress.editionId);
  return previous&&previous.updatedAt>progress.updatedAt?data:{...data,progress:[progress,...data.progress.filter(p=>p.workId!==progress.workId||p.editionId!==progress.editionId)]};
});}
export function saveLocalPreferences(value:Prefs){return updateLocal(data=>({...data,preferences:{value,updatedAt:new Date().toISOString()}}));}
export async function importLocal(incoming:LocalSnapshot,preferences:boolean){
  const validated=snapshotSchema.parse(incoming);
  let conflicts=0;
  await commitLocal(local=>{const result=mergeSnapshots(local,validated,preferences);conflicts=result.conflicts;return result.snapshot;},true,true);
  return conflicts;
}
export function deviceId(){
  const key='leseraum-device-v1';
  let id=localStorage.getItem(key);
  if(!id||!/^[a-f0-9]{32}$/.test(id)){
    id=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem(key,id);
  }
  return id;
}
