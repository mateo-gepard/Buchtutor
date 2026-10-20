'use client';
import {useCallback,useLayoutEffect,useRef,useState} from 'react';
const prefix='buchtutor-note-draft:';
/** Independent keys prevent editing one passage from replacing another tab's drafts. */
export function useNoteDrafts(){
 const [drafts,setDrafts]=useState<Record<string,string>>({}),[ready,setReady]=useState(false),[error,setError]=useState('');
 const current=useRef<Record<string,string>>({});
 useLayoutEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   const found:Record<string,string>={};
   try{
    for(const key of Object.keys(localStorage)){
     if(!key.startsWith(prefix))continue;
     try{
      const data=JSON.parse(localStorage.getItem(key)??'null');
      if(data?.version===1&&typeof data.body==='string'&&data.body.length<=12000)found[key.slice(prefix.length)]=data.body;
     }catch{/* Preserve unreadable drafts in storage. */}
    }
   }catch{setError('Entwurfsspeicher nicht verfügbar. Bitte vor dem Verlassen speichern.');}
   current.current=found;setDrafts(found);setReady(true);
  });return()=>cancelAnimationFrame(frame);
 },[]);
 const change=useCallback((key:string,body:string)=>{
  current.current={...current.current,[key]:body};setDrafts(current.current);
  try{localStorage.setItem(prefix+key,JSON.stringify({version:1,body}));setError('');}
  catch{setError('Entwurf konnte nicht gesichert werden. Bitte vor dem Verlassen speichern.');}
 },[]);
 const clear=useCallback((key:string,savedBody:string)=>{
  if(current.current[key]!==savedBody)return;
  const next={...current.current};delete next[key];current.current=next;setDrafts(next);
  try{const stored=JSON.parse(localStorage.getItem(prefix+key)??'null');if(stored?.body===savedBody)localStorage.removeItem(prefix+key);}catch{setError('Notiz gespeichert; der ältere Entwurf konnte nicht bereinigt werden.');}
 },[]);
 return {drafts,ready,error,change,clear};
}
