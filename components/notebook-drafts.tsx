'use client';
import {useEffect,useState} from 'react';
import {ChevronDown,PencilLine,ArrowUpRight} from 'lucide-react';
import type {WorkMeta} from '@/lib/reader-model';
import type {NoteDraftLocation} from '@/lib/note-draft-index';
import {readPencilDraftLocations,type PencilDraftLocation} from '@/lib/pencil-draft-index';
import {useBookReferences} from '@/hooks/use-book-references';
import {notebookReferenceLabel} from '@/lib/book-references';

const noTypedDrafts:NoteDraftLocation[]=[];
export function useNotebookPencilDrafts(catalog:WorkMeta[],enabled=true){
 const [drafts,setPencilDrafts]=useState<PencilDraftLocation[]>([]);
 useEffect(()=>{
  if(!enabled)return;
  const refresh=()=>{try{setPencilDrafts(readPencilDraftLocations(localStorage,catalog));}catch{setPencilDrafts([]);}};
  const frame=requestAnimationFrame(refresh);window.addEventListener('storage',refresh);window.addEventListener('pageshow',refresh);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('storage',refresh);window.removeEventListener('pageshow',refresh);};
 },[catalog,enabled]);
 return drafts;
}
export function NotebookDrafts({catalog,onResume,typedDrafts=noTypedDrafts,onResumeNoteDraft,work='all',pencilDrafts:providedPencilDrafts}:{catalog:WorkMeta[];onResume?:(workId:string,sectionId:string)=>void;typedDrafts?:NoteDraftLocation[];onResumeNoteDraft?:(draft:NoteDraftLocation)=>void;work?:string;pencilDrafts?:PencilDraftLocation[]}){
 const localPencilDrafts=useNotebookPencilDrafts(catalog,providedPencilDrafts===undefined),pencilDrafts=providedPencilDrafts??localPencilDrafts;
 const [expanded,setExpanded]=useState<boolean|null>(null),[showAll,setShowAll]=useState(false);
 const references=useBookReferences(catalog,[...pencilDrafts,...typedDrafts].map(draft=>draft.workId));

 const pencil=pencilDrafts.filter(draft=>work==='all'||draft.workId===work),typed=typedDrafts.filter(draft=>work==='all'||draft.workId===work),count=pencil.length+typed.length;
 const visibleTyped=showAll?typed:typed.slice(0,3),visiblePencil=showAll?pencil:pencil.slice(0,Math.max(0,3-visibleTyped.length));
 if(!count)return null;
 return <details className="notebook-drafts" open={expanded??count<=2} onToggle={event=>setExpanded(event.currentTarget.open)}>
  <summary><PencilLine size={17}/><span>{count===1?'1 Entwurf':`${count} Entwürfe`}</span><small>Noch nicht als Notiz gespeichert</small><ChevronDown size={16}/></summary>
  <div className="notebook-draft-list">
   {visibleTyped.map(draft=><div className="notebook-draft-entry typed-note-draft" key={draft.key}><div><strong>{draft.workTitle}</strong><small>{draft.originalDeleted?'Entwurf zu gelöschter Notiz':draft.noteId?'Bearbeitungsentwurf':'Notizentwurf'} · {notebookReferenceLabel(catalog.find(item=>item.id===draft.workId),references[draft.workId],draft.editionId,draft.anchor)}</small><blockquote>{draft.anchor.quote.slice(0,150)}{draft.anchor.quote.length>150?' …':''}</blockquote><p>{draft.body.trim()?draft.body.slice(0,120)+(draft.body.length>120?' …':''):'Leerer Bearbeitungsentwurf'}</p></div>{onResumeNoteDraft&&<button className="text-button" aria-label={`Notizentwurf weiterbearbeiten: ${draft.body.trim().slice(0,70)||draft.anchor.quote.slice(0,70)}`} onClick={()=>onResumeNoteDraft(draft)}>Weiterbearbeiten<ArrowUpRight size={16}/></button>}</div>)}
   {visiblePencil.map(draft=><div className="notebook-draft-entry" key={draft.key}><div><strong>{draft.workTitle}</strong><small>Pencil-Entwurf · {notebookReferenceLabel(catalog.find(item=>item.id===draft.workId),references[draft.workId],catalog.find(item=>item.id===draft.workId)?.editionId??'',{sectionId:draft.sectionId})} · auf diesem Gerät gesichert</small></div>{onResume&&<button className="text-button" onClick={()=>onResume(draft.workId,draft.sectionId)}>Weiterbearbeiten<ArrowUpRight size={16}/></button>}</div>)}
   {count>3&&<button className="text-button notebook-drafts-more" aria-expanded={showAll} onClick={()=>setShowAll(!showAll)}>{showAll?'Weniger Entwürfe anzeigen':count===4?'1 weiteren Entwurf anzeigen':`${count-3} weitere Entwürfe anzeigen`}</button>}
  </div>
 </details>;
}
