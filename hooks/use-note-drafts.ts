'use client';
import {useCallback,useLayoutEffect,useRef,useState} from 'react';

const prefix='buchtutor-note-draft:';
const journalPrefix='buchtutor-note-draft-journal-v2:';
const unreadablePrefix='buchtutor-note-draft-unreadable-v1:';
let documentWriter:string|undefined;
function tabWriter(){
 if(documentWriter)return documentWriter;
 let writer=crypto.randomUUID();
 try{
  const previous=sessionStorage.getItem('buchtutor-note-draft-tab-v2'),navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  // A newly opened tab can inherit sessionStorage. Reuse only on reload/back,
  // while a new navigation gets its own writer and cannot replace that tab.
  if(previous&&/^[a-f0-9-]{36}$/.test(previous)&&(navigation?.type==='reload'||navigation?.type==='back_forward'))writer=previous;
  sessionStorage.setItem('buchtutor-note-draft-tab-v2',writer);
 }catch{/* Journal ownership still works for this document. */}
 return documentWriter=writer;
}
export type NoteDraftVersion={version:2;body:string;revision:string;writer:string;updatedAt:number};
type DraftState={drafts:Record<string,string>;alternatives:Record<string,NoteDraftVersion[]>;error:string};
const storageError='Entwurf konnte nicht vollständig gesichert werden. Bitte geöffnet lassen und vor dem Verlassen als Notiz speichern.';
function parseDraft(raw:string|null):NoteDraftVersion|null{
 if(raw===null)return null;
 try{
  const value=JSON.parse(raw);
  if(typeof value?.body!=='string'||value.body.length>12000)return null;
  if(value.version===1){
   // Stable identity for the previous format, without copying its body into a key.
   let hash=2166136261;for(let i=0;i<value.body.length;i++)hash=Math.imul(hash^value.body.charCodeAt(i),16777619);
   const id='legacy-'+(hash>>>0).toString(16);return {version:2,body:value.body,revision:id,writer:id,updatedAt:0};
  }
  return value.version===2&&typeof value.revision==='string'&&value.revision.length>0&&value.revision.length<=160&&typeof value.writer==='string'&&value.writer.length>0&&value.writer.length<=200&&Number.isSafeInteger(value.updatedAt)&&value.updatedAt>=0?{version:2,body:value.body,revision:value.revision,writer:value.writer,updatedAt:value.updatedAt}:null;
 }catch{return null;}
}

/** One latest record per tab/passage protects independent, unsaved edits. The
 * legacy key stays readable; journals remain local and are removed on exact ack. */
export function createNoteDraftStore(storage:Storage|undefined,writer=crypto.randomUUID()){
 const memory=new Map<string,NoteDraftVersion>();let lastError='';
 function scan(){
  const main=new Map<string,NoteDraftVersion>(),versions=new Map<string,NoteDraftVersion[]>();let damaged=false;
  const add=(key:string,record:NoteDraftVersion)=>{const found=versions.get(key)??[];if(!found.some(item=>item.revision===record.revision))found.push(record);versions.set(key,found);};
  if(!storage)return {main,versions,damaged:true};
  try{
   for(let i=0;i<storage.length;i++){
    const name=storage.key(i);if(!name)continue;
    if(name.startsWith(prefix)){
     const record=parseDraft(storage.getItem(name)),key=name.slice(prefix.length);
     if(record){main.set(key,record);add(key,record);}else damaged=true;
    }else if(name.startsWith(journalPrefix)){
     try{const [key]=JSON.parse(name.slice(journalPrefix.length)),record=parseDraft(storage.getItem(name));if(typeof key==='string'&&record)add(key,record);else damaged=true;}catch{damaged=true;}
    }
   }
  }catch{lastError=storageError;}
  return {main,versions,damaged};
 }
 function snapshot():DraftState{
  const {main,versions,damaged}=scan(),drafts:Record<string,string>={},alternatives:Record<string,NoteDraftVersion[]>={};
  for(const key of new Set([...versions.keys(),...memory.keys()])){
   const candidates=versions.get(key)??[],newest=candidates.slice().sort((a,b)=>b.updatedAt-a.updatedAt)[0],primary=main.get(key);
   const selected=memory.get(key)??(primary&&(!newest||primary.updatedAt>=newest.updatedAt)?primary:newest);
   if(!selected)continue;drafts[key]=selected.body;
   const distinct=new Map<string,NoteDraftVersion>();
   for(const item of candidates.slice().sort((a,b)=>b.updatedAt-a.updatedAt))if(item.body!==selected.body&&!distinct.has(item.body))distinct.set(item.body,item);
   const other=[...distinct.values()];
   if(other.length)alternatives[key]=other;
  }
  return {drafts,alternatives,error:lastError||(!storage?storageError:damaged?'Ein beschädigter Entwurf bleibt unverändert erhalten. Verfügbare lokale Entwurfsfassungen wurden geladen.':Object.keys(alternatives).length?'Zu dieser Textstelle gibt es abweichende Entwürfe aus einem anderen Tab. Beide Fassungen bleiben auf diesem Gerät erhalten.':'')};
 }
 function preserveUnknown(name:string,raw:string){
  if(!storage)throw new Error(storageError);
  const key=unreadablePrefix+name,previous=storage.getItem(key);
  if(previous!==null&&previous!==raw)throw new Error(storageError);
  if(previous===null)storage.setItem(key,raw);
 }
 function putSlot(key:string,slot:string,record:NoteDraftVersion){
  if(!storage)throw new Error(storageError);
  const name=journalPrefix+JSON.stringify([key,slot]),raw=storage.getItem(name);
  if(raw!==null&&!parseDraft(raw))preserveUnknown(name,raw);
  storage.setItem(name,JSON.stringify(record));
 }
 function change(key:string,body:string){
  if(body.length>12000){lastError='Der Entwurf ist zu lang und wurde nicht überschrieben.';return '';}
  let previous:NoteDraftVersion|null=null;try{previous=parseDraft(storage?.getItem(prefix+key)??null);}catch{/* Report the write failure below. */}
  const updatedAt=Math.max(Date.now(),(memory.get(key)?.updatedAt??0)+1,(previous?.updatedAt??0)+1);
  const record:NoteDraftVersion={version:2,body,revision:crypto.randomUUID(),writer,updatedAt};memory.set(key,record);
  try{
   if(!storage)throw new Error(storageError);
   // Journal first: even a quota failure writing the compatibility key leaves
   // the latest text recoverable. A failed journal never replaces that key.
   putSlot(key,writer,record);
   const name=prefix+key,raw=storage.getItem(name),displaced=parseDraft(raw);
   if(raw!==null&&!displaced)preserveUnknown(name,raw);
   if(displaced&&displaced.writer!==writer&&!(displaced.writer.startsWith('legacy-')&&displaced.body===body)){
    const newer=parseDraft(storage.getItem(journalPrefix+JSON.stringify([key,displaced.writer])));
    if(!newer||newer.updatedAt<displaced.updatedAt)putSlot(key,displaced.writer,displaced);
   }
   storage.setItem(name,JSON.stringify(record));lastError='';
  }catch{lastError=storageError;}
  return record.revision;
 }
 function clear(key:string,savedBody:string,revision=memory.get(key)?.revision){
  if(!revision)return;
  const pending=memory.get(key);if(pending&&(pending.body!==savedBody||pending.revision!==revision))return;
  try{
   if(!storage)throw new Error(storageError);
   const primary=parseDraft(storage.getItem(prefix+key));
   if(primary?.revision===revision&&primary.body===savedBody)storage.removeItem(prefix+key);
   const names=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter((name):name is string=>!!name&&name.startsWith(journalPrefix));
   for(const name of names){
    let storedKey:unknown;try{[storedKey]=JSON.parse(name.slice(journalPrefix.length));}catch{continue;}
    if(storedKey!==key)continue;const record=parseDraft(storage.getItem(name));
    if(record?.revision===revision&&record.body===savedBody)storage.removeItem(name);
   }
   if(pending?.revision===revision)memory.delete(key);lastError='';
  }catch{lastError='Notiz gespeichert; die zugehörige Entwurfsfassung konnte nicht bereinigt werden und bleibt erhalten.';}
 }
 function restore(key:string,revision:string){
  const {versions}=scan(),record=versions.get(key)?.find(item=>item.revision===revision);if(!record)return;
  try{const pending=memory.get(key);if(pending&&pending.body!==record.body)putSlot(key,'restored-'+pending.revision,pending);}
  catch{lastError=storageError;return;}
  return change(key,record.body);
 }
 return {snapshot,change,clear,restore};
}

export function useNoteDrafts(){
 const [state,setState]=useState<DraftState>({drafts:{},alternatives:{},error:''}),[ready,setReady]=useState(false);
 const store=useRef<ReturnType<typeof createNoteDraftStore>|null>(null);
 useLayoutEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   let storage:Storage|undefined;try{storage=localStorage;}catch{/* Keep text in memory and report unavailable storage. */}
   store.current=createNoteDraftStore(storage,tabWriter());setState(store.current.snapshot());setReady(true);
  });
  const refresh=(event:StorageEvent)=>{if(event.key===null||event.key.startsWith(prefix)||event.key.startsWith(journalPrefix)){if(store.current)setState(store.current.snapshot());}};
  window.addEventListener('storage',refresh);return()=>{cancelAnimationFrame(frame);window.removeEventListener('storage',refresh);};
 },[]);
 const change=useCallback((key:string,body:string)=>{const revision=store.current?.change(key,body);if(store.current)setState(store.current.snapshot());return revision;},[]);
 const clear=useCallback((key:string,body:string,revision?:string)=>{store.current?.clear(key,body,revision);if(store.current)setState(store.current.snapshot());},[]);
 const restore=useCallback((key:string,revision:string)=>{const changed=store.current?.restore(key,revision);if(store.current)setState(store.current.snapshot());return changed;},[]);
 return {...state,ready,change,clear,restore};
}
