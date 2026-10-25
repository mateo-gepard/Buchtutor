'use client';
import {useEffect,useState} from 'react';
import {ChevronDown,PencilLine,ArrowUpRight} from 'lucide-react';
import type {WorkMeta} from '@/lib/reader-model';
import {readPencilDraftLocations,type PencilDraftLocation} from '@/lib/pencil-draft-index';

export function NotebookDrafts({catalog,onResume}:{catalog:WorkMeta[];onResume:(workId:string,sectionId:string)=>void}){
 const [drafts,setDrafts]=useState<PencilDraftLocation[]>([]);
 useEffect(()=>{
  const refresh=()=>{try{setDrafts(readPencilDraftLocations(localStorage,catalog));}catch{setDrafts([]);}};
  const frame=requestAnimationFrame(refresh);window.addEventListener('storage',refresh);window.addEventListener('pageshow',refresh);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('storage',refresh);window.removeEventListener('pageshow',refresh);};
 },[catalog]);
 if(!drafts.length)return null;
 return <details className="notebook-drafts" open={drafts.length===1}>
  <summary><PencilLine size={17}/><span>{drafts.length===1?'Pencil-Entwurf':`${drafts.length} Pencil-Entwürfe`}</span><small>Noch nicht als Notiz gespeichert</small><ChevronDown size={16}/></summary>
  <div className="notebook-draft-list">{drafts.map(draft=><div className="notebook-draft-entry" key={draft.key}><div><strong>{draft.workTitle}</strong><small>{draft.sectionLabel} · auf diesem Gerät gesichert</small></div><button className="text-button" onClick={()=>onResume(draft.workId,draft.sectionId)}>Weiterbearbeiten<ArrowUpRight size={16}/></button></div>)}</div>
 </details>;
}
