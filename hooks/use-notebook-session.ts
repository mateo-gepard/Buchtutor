'use client';
import {useEffect,useEffectEvent,useLayoutEffect,useRef,useState,type RefObject} from 'react';
import type {NotebookFilters} from '@/components/reader-notes';
import {readNotebookSession,writeNotebookSession} from '@/lib/notebook-session';

type Options={filters:NotebookFilters;selected:string[];selecting:boolean;scrollRef:RefObject<number>;view:string;ready:boolean;practice:boolean;setFilters:(value:NotebookFilters)=>void;setSelected:(value:string[])=>void;setSelecting:(value:boolean)=>void};

/** Reload resumes this tab's notebook without changing the personal-data store. */
export function useNotebookSession({filters,selected,selecting,scrollRef,view,ready,practice,setFilters,setSelected,setSelecting}:Options){
 const [loaded,setLoaded]=useState(false),initialView=useRef(view),restoreScroll=useRef(false);
 useLayoutEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   try{
    const saved=readNotebookSession(sessionStorage);
    if(saved){setFilters(saved.filters);setSelected(saved.selected);setSelecting(saved.selecting);scrollRef.current=saved.scroll;restoreScroll.current=initialView.current==='notes';}
   }catch{/* Browsers may deny access to sessionStorage itself. */}
   setLoaded(true);
  });
  return()=>cancelAnimationFrame(frame);
 },[scrollRef,setFilters,setSelected,setSelecting]);

 const persist=useEffectEvent(()=>{
  if(!loaded||!ready||practice)return;
  try{writeNotebookSession(sessionStorage,{version:1,filters,selected,selecting,scroll:scrollRef.current});}catch{/* Keep the in-memory state when tab storage is unavailable. */}
 });
 useEffect(()=>{persist();},[loaded,ready,practice,filters,selected,selecting]);

 useLayoutEffect(()=>{
  if(!loaded||!ready||practice||view!=='notes'||!restoreScroll.current)return;
  let second=0;
  const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
   window.scrollTo({top:scrollRef.current,behavior:'instant'});restoreScroll.current=false;
  });});
  return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};
 },[loaded,ready,practice,view,scrollRef]);

 const capture=useEffectEvent(()=>{
  if(!loaded||!ready||practice||view!=='notes'||restoreScroll.current)return false;
  scrollRef.current=window.scrollY;return true;
 });
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const onScroll=()=>{if(!capture())return;clearTimeout(timer);timer=setTimeout(()=>persist(),150);};
  const flush=()=>{clearTimeout(timer);capture();persist();};
  const onVisibility=()=>{if(document.visibilityState==='hidden')flush();};
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',onVisibility);
  return()=>{clearTimeout(timer);window.removeEventListener('scroll',onScroll);window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',onVisibility);};
 },[]);
}
