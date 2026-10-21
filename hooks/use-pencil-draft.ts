'use client';
import {useCallback,useLayoutEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {z} from 'zod';
import {portableAnchorSchema,portableNoteSchema} from '@/lib/local-model';
import {pencilAnnotationSchema} from '@/lib/pencil-model';
import {pageInkGroupSchema,type PageInkGroup} from '@/lib/page-handwriting';

const entrySchema=z.object({id:z.string(),anchor:portableAnchorSchema,pencil:pencilAnnotationSchema,body:z.string().max(12000),createdAt:z.string().optional(),prefix:z.string().optional(),recognizedInk:z.string().optional(),order:z.number().optional(),baseline:portableNoteSchema.optional()});
const entriesSchema=z.array(entrySchema).max(100);
const draftSchema=z.union([z.object({version:z.literal(2),entries:entriesSchema,groups:z.array(pageInkGroupSchema).max(100),recoveredStrokes:z.array(z.string().max(100)).max(5000).default([])}),entriesSchema.transform(entries=>({version:2 as const,entries,groups:[] as PageInkGroup[],recoveredStrokes:[] as string[]}))]);
export type PencilEntry=z.infer<typeof entrySchema>;
type Draft=z.infer<typeof draftSchema>;
const recordSchema=z.object({version:z.literal(1),at:z.number(),draft:draftSchema});
const activeSchema=z.object({version:z.literal(1),group:pageInkGroupSchema});
const empty=():Draft=>({version:2,entries:[],groups:[],recoveredStrokes:[]});
function parsed(raw:string|null){try{return raw===null?null:JSON.parse(raw);}catch{return null;}}
function preserveUnknown(key:string,raw:string){const previous=localStorage.getItem(key);if(previous!==null&&previous!==raw)throw new Error('Eine frühere beschädigte Fassung bleibt erhalten.');if(previous===null)localStorage.setItem(key,raw);}
let documentWriter:{id:string;previous:string|null}|undefined;
function tabIdentity(){
 if(documentWriter)return documentWriter;
 const id=crypto.randomUUID();let previous:string|null=null;
 try{const key='buchtutor-pencil-tab';previous=sessionStorage.getItem(key);sessionStorage.setItem(key,id);}catch{/* The current document still has its own journal identity. */}
 return documentWriter={id,previous};
}
const hasInk=(draft:Draft)=>draft.entries.length||draft.groups.length;

// Synchronous checkpoints complement the IndexedDB commit. A tab has its own
// journal; another tab can never overwrite its only copy. Empty checkpoints
// acknowledge a completed save, so old recovery data is not resurrected.
export function usePencilDraft(key:string,practice:boolean,onError:Dispatch<SetStateAction<string>>,beforeFlush:()=>void){
 const [draft,setDraft]=useState<Draft>(empty),[loaded,setLoaded]=useState(false),[recoveries,setRecoveries]=useState<{key:string;at:number;draft:Draft}[]>([]);
 const current=useRef(empty()),ready=useRef(false),persisted=useRef<string|null>(null),tab=useRef(''),previousTab=useRef<string|null>(null),journal=useRef(''),activeKey=useRef('');
 const persist=useCallback(()=>{
  if(!ready.current||practice)return false;
  const next=current.current,serialized=JSON.stringify(next);
  if(!draftSchema.safeParse(next).success){onError('Der Entwurf ist zu groß oder enthält ungültige Daten. Die letzte Sicherung bleibt erhalten. Bitte die Seite geöffnet lassen.');return false;}
  if(serialized===persisted.current)return true;
  try{
   // Preserve this tab's preceding valid state before replacing its journal.
   const previous=localStorage.getItem(journal.current);
   if(previous){if(recordSchema.safeParse(parsed(previous)).success)localStorage.setItem(journal.current+':previous',previous);else preserveUnknown(journal.current+':unreadable-journal',previous);}
   localStorage.setItem(journal.current,JSON.stringify({version:1,at:Date.now(),draft:next}));
   // Keep the original public key/format for existing devices and migrations.
   if(hasInk(next))localStorage.setItem(key,serialized);else localStorage.removeItem(key);
   persisted.current=serialized;return true;
  }catch{onError(previous=>previous.startsWith('Nicht gespeichert:')?previous:'Nicht gespeichert: Der Entwurf konnte nicht vollständig gesichert werden. Bitte mit „Fertig“ speichern, bevor du die Seite verlässt.');return false;}
 },[key,practice,onError]);
 useLayoutEffect(()=>{
  ready.current=false;persisted.current=null;
  if(!tab.current){const identity=tabIdentity();tab.current=identity.id;previousTab.current=identity.previous;}
  journal.current=`buchtutor-pencil-recovery:${key}:${tab.current}`;
  activeKey.current=`buchtutor-pencil-active:${key}:${tab.current}`;
  const frame=requestAnimationFrame(()=>{
   setLoaded(false);
   let next=empty(),raw:string|null=null;
   try{
    if(!practice){
     raw=localStorage.getItem(key);
     const value=parsed(raw),main=draftSchema.safeParse(value);
     // A future version must remain untouched, even if an older backup exists.
     if(raw!==null&&value&&typeof value==='object'&&!Array.isArray(value)&&'version'in value&&value.version!==2){onError('Dieser Handschriftentwurf konnte nicht geöffnet werden. Er bleibt unverändert auf diesem Gerät gespeichert.');return;}
     const records:{key:string;at:number;draft:Draft}[]=[];
     for(let i=0;i<localStorage.length;i++){
      const candidate=localStorage.key(i)!;if(!candidate.startsWith(`buchtutor-pencil-recovery:${key}:`))continue;
      const result=recordSchema.safeParse(parsed(localStorage.getItem(candidate)));if(result.success)records.push({key:candidate,at:result.data.at,draft:result.data.draft});
     }
     const own=records.find(record=>record.key===journal.current)??records.find(record=>record.key===`buchtutor-pencil-recovery:${key}:${previousTab.current}`);
     if(raw!==null&&!main.success){
      const fallback=own??records.sort((a,b)=>b.at-a.at)[0];
      if(!fallback){onError('Dieser Handschriftentwurf konnte nicht geöffnet werden. Er bleibt unverändert auf diesem Gerät gespeichert.');return;}
      // Preserve the unreadable original before allowing the recovered copy to write.
      preserveUnknown(journal.current+':unreadable',raw);next=fallback.draft;
      onError('Dein Handschriftentwurf wurde aus einer lokalen Sicherung wiederhergestellt.');
     }else next=main.success?main.data:own?.draft??empty();
     // Prefer the current tab's branch when the main key was changed by another
     // tab. Legacy array migrations intentionally take precedence over journals.
     if(own&&raw!==null&&main.success&&!Array.isArray(value)&&JSON.stringify(own.draft)!==JSON.stringify(main.data)){
      const other=records.find(record=>record.key!==journal.current&&!record.key.endsWith(':previous')&&JSON.stringify(record.draft)===JSON.stringify(main.data));
      if(other)next=own.draft;
     }
     const inheritedKey=`buchtutor-pencil-active:${key}:${previousTab.current}`,ownActive=localStorage.getItem(activeKey.current),inherited=ownActive===null&&previousTab.current!==null;
     const active=activeSchema.safeParse(parsed(ownActive??(inherited?localStorage.getItem(inheritedKey):null)));
     if(active.success){
      const ids=new Set(next.groups.flatMap(group=>group.strokes.map(stroke=>stroke.id)));
      const strokes=active.data.group.strokes.filter(stroke=>!ids.has(stroke.id)&&!next.recoveredStrokes.includes(stroke.id));
      const navigation=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type;
      // Duplicated tabs inherit sessionStorage. Their copy of a live partial
      // stroke must not claim the parent's stable ID and hide its later points.
      const copy=inherited&&navigation!=='reload'&&navigation!=='back_forward';
      if(strokes.length){next={...next,recoveredStrokes:[...next.recoveredStrokes,...strokes.map(stroke=>stroke.id)],groups:[...next.groups,{...active.data.group,id:copy?crypto.randomUUID():active.data.group.id,strokes:copy?strokes.map(stroke=>({...stroke,id:crypto.randomUUID()})):strokes}]};onError('Ein unterbrochener Schriftstrich wurde wiederhergestellt.');}
     }
     const serialized=JSON.stringify(next),seen=new Set([serialized]);
     setRecoveries(records.sort((a,b)=>b.at-a.at).filter(record=>{const value=JSON.stringify(record.draft);if(!hasInk(record.draft)||seen.has(value))return false;seen.add(value);return true;}));
    }
   }catch{onError('Der Entwurfsspeicher ist gesperrt. Bitte die Seite geöffnet lassen und den Gerätespeicher freigeben.');return;}
   current.current=next;ready.current=true;setDraft(next);setLoaded(true);persist();
  });
  const flush=()=>{beforeFlush();persist();};window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',flush);
  return()=>{cancelAnimationFrame(frame);beforeFlush();persist();ready.current=false;window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',flush);};
 },[key,practice,onError,persist,beforeFlush]);
 const update=useCallback((change:(previous:Draft)=>Draft)=>{
  if(!ready.current)return;
  const next=change(current.current);if(next===current.current)return;current.current=next;setDraft(next);persist();
 },[persist]);
 const setEntries=useCallback<Dispatch<SetStateAction<PencilEntry[]>>>(value=>update(old=>{const entries=typeof value==='function'?value(old.entries):value;return entries===old.entries?old:{...old,entries};}),[update]);
 const setGroups=useCallback<Dispatch<SetStateAction<PageInkGroup[]>>>(value=>update(old=>{const groups=typeof value==='function'?value(old.groups):value;return groups===old.groups?old:{...old,groups};}),[update]);
 const snapshot=useCallback(()=>current.current,[]);
 const checkpoint=useCallback((group:PageInkGroup)=>{
  if(practice||!ready.current)return;
  try{const previous=localStorage.getItem(activeKey.current);if(previous&&!activeSchema.safeParse(parsed(previous)).success)preserveUnknown(activeKey.current+':unreadable',previous);localStorage.setItem(activeKey.current,JSON.stringify({version:1,group}));}
  catch{onError('Der aktuelle Strich ist noch nicht gesichert. Bitte mit „Fertig“ speichern, bevor du die Seite verlässt.');}
 },[practice,onError]);
 const acknowledge=useCallback((strokeId:string)=>{
  if(practice||!persist())return;
  try{
   const active=activeSchema.safeParse(parsed(localStorage.getItem(activeKey.current)));
   if(active.success&&active.data.group.strokes.some(stroke=>stroke.id===strokeId))localStorage.removeItem(activeKey.current);
  }catch{/* A duplicate checkpoint is safer than removing an uncommitted original. */}
 },[practice,persist]);
 const restore=useCallback((recoveryKey:string)=>{
  const recovery=recoveries.find(record=>record.key===recoveryKey);if(!recovery||!persist())return;
  // Preserve the current branch as a selectable alternative before switching.
  setRecoveries(old=>[{key:journal.current+':memory',at:Date.now(),draft:current.current},...old.filter(record=>record.key!==recoveryKey)].filter(record=>hasInk(record.draft)));
  update(()=>recovery.draft);onError('Lokaler Handschriftentwurf wiederhergestellt.');
 },[recoveries,persist,update,onError]);
 return {...draft,setEntries,setGroups,loaded,snapshot,checkpoint,acknowledge,recoveries,restore};
}
