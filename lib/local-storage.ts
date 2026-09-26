'use client';
import {openDB, type DBSchema} from 'idb';
import {EMPTY_SNAPSHOT, mergeSnapshots, snapshotSchema, type LocalSnapshot} from './local-model';
import {preferencesSchema,type Prefs} from './preferences';
import type {Anchor,ReadingProgress,SavedNote} from './reader-model';
import {matchesBookmark} from './bookmarks';

interface ReaderDB extends DBSchema {state:{key:string;value:LocalSnapshot}}
let database:ReturnType<typeof openDB<ReaderDB>>|undefined;
let current={data:EMPTY_SNAPSHOT,ready:false,error:''};
const serverState=current;
const listeners=new Set<()=>void>();
let channel:BroadcastChannel|undefined;
let initialized:Promise<void>|undefined;
function db(){return database??=openDB<ReaderDB>('leseraum-local-v2',1,{upgrade(store){store.createObjectStore('state');}});}
function emit(){for(const listener of listeners)listener();}
async function read(){
  let stored=await (await db()).get('state','reader');
  if(!stored&&typeof localStorage!=='undefined'){
    try{
      const previous=JSON.parse(localStorage.getItem('leseraum-reading-preferences-v1')??'null');
      const value=preferencesSchema.safeParse(previous);
      if(value.success){
        stored={...EMPTY_SNAPSHOT,preferences:{value:value.data,updatedAt:new Date().toISOString()}};
        await (await db()).put('state',stored,'reader');
      }
    }catch{/* A corrupt legacy preference must not prevent opening the local reader. */}
  }
  current={data:stored?snapshotSchema.parse(stored):EMPTY_SNAPSHOT,ready:true,error:''};emit();
}
export function initializeLocal(){
  if(!initialized)initialized=(async()=>{
    try{
      await read();
      if(typeof BroadcastChannel!=='undefined'){
        channel=new BroadcastChannel('leseraum-local-v2');
        channel.onmessage=()=>{void read().catch(()=>{});};
      }
    }catch{
      current={...current,ready:true,error:'Der Gerätespeicher ist nicht verfügbar. Änderungen können gerade nicht gesichert werden.'};emit();
    }
  })();
  return initialized;
}
export function subscribeLocal(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export function getLocalState(){return current;}
export function getServerLocalState(){return serverState;}
export async function updateLocal(change:(data:LocalSnapshot)=>LocalSnapshot){
  await initializeLocal();
  try{
    const transaction=(await db()).transaction('state','readwrite');
    const latest=(await transaction.store.get('reader'))??EMPTY_SNAPSHOT;
    const next=snapshotSchema.parse(change(latest));
    await transaction.store.put(next,'reader');
    await transaction.done;
    current={data:next,ready:true,error:''};emit();channel?.postMessage('changed');
    return next;
  }catch{
    throw new Error('Nicht gespeichert: Der Gerätespeicher ist voll oder gesperrt. Dein Entwurf bleibt geöffnet.');
  }
}
export function saveLocalNote(note:SavedNote){return updateLocal(data=>({...data,notes:[note,...data.notes.filter(n=>n.id!==note.id)]}));}
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
  let conflicts=0;
  await updateLocal(local=>{const result=mergeSnapshots(local,incoming,preferences);conflicts=result.conflicts;return result.snapshot;});
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
