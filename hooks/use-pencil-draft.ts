'use client';
import {useCallback,useLayoutEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {z} from 'zod';
import {portableAnchorSchema} from '@/lib/local-model';
import {pencilAnnotationSchema} from '@/lib/pencil-model';
import {pageInkGroupSchema,type PageInkGroup} from '@/lib/page-handwriting';

const entrySchema=z.object({id:z.string(),anchor:portableAnchorSchema,pencil:pencilAnnotationSchema,body:z.string().max(12000),createdAt:z.string().optional(),prefix:z.string().optional(),recognizedInk:z.string().optional(),order:z.number().optional()});
const entriesSchema=z.array(entrySchema).max(100);
const draftSchema=z.union([z.object({version:z.literal(2),entries:entriesSchema,groups:z.array(pageInkGroupSchema).max(100)}),entriesSchema.transform(entries=>({version:2 as const,entries,groups:[] as PageInkGroup[]}))]);
export type PencilEntry=z.infer<typeof entrySchema>;
type Draft=z.infer<typeof draftSchema>;
const empty=():Draft=>({version:2,entries:[],groups:[]});

// Commit at the end of every input/stroke, before yielding to the browser.
// Mobile Safari may suspend a page without running a timer or beforeunload.
export function usePencilDraft(key:string,practice:boolean,onError:Dispatch<SetStateAction<string>>){
 const [draft,setDraft]=useState<Draft>(empty),[loaded,setLoaded]=useState(false);
 const current=useRef(empty()),ready=useRef(false),persisted=useRef<string|null>(null);
 const persist=useCallback(()=>{
  if(!ready.current||practice)return;
  const next=current.current,serialized=next.entries.length||next.groups.length?JSON.stringify(next):null;
  if(serialized===persisted.current)return;
  try{
   if(serialized===null)localStorage.removeItem(key);else localStorage.setItem(key,serialized);
   persisted.current=serialized;
  }catch{onError('Der Entwurf konnte nicht gesichert werden. Bitte mit „Fertig“ speichern, bevor du die Seite verlässt.');}
 },[key,practice,onError]);
 useLayoutEffect(()=>{
  ready.current=false;
  const frame=requestAnimationFrame(()=>{
   let next=empty(),raw:string|null=null;
   try{if(!practice)raw=localStorage.getItem(key);}
   catch{onError('Der Entwurfsspeicher ist gesperrt. Bitte vor dem Verlassen mit „Fertig“ speichern.');}
   if(raw!==null){
    const parsed=draftSchema.safeParse((()=>{try{return JSON.parse(raw);}catch{return null;}})());
    if(!parsed.success){
     // An unknown/corrupt version is valuable user data, not an empty draft.
     onError('Dieser Handschriftentwurf konnte nicht geöffnet werden. Er bleibt unverändert auf diesem Gerät gespeichert.');
     return;
    }
    next=parsed.data;
   }
   current.current=next;persisted.current=next.entries.length||next.groups.length?JSON.stringify(next):null;
   ready.current=true;setDraft(next);setLoaded(true);
  });
  const flush=()=>persist();
  window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',flush);
  return()=>{cancelAnimationFrame(frame);persist();ready.current=false;window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',flush);};
 },[key,practice,onError,persist]);
 const update=useCallback((change:(previous:Draft)=>Draft)=>{
  if(!ready.current)return;
  const next=change(current.current);current.current=next;setDraft(next);persist();
 },[persist]);
 const setEntries=useCallback<Dispatch<SetStateAction<PencilEntry[]>>>(value=>update(old=>({...old,entries:typeof value==='function'?value(old.entries):value})),[update]);
 const setGroups=useCallback<Dispatch<SetStateAction<PageInkGroup[]>>>(value=>update(old=>({...old,groups:typeof value==='function'?value(old.groups):value})),[update]);
 const snapshot=useCallback(()=>current.current,[]);
 return {...draft,setEntries,setGroups,loaded,snapshot};
}
