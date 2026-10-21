'use client';
import {PenLine,Plus,Trash2} from 'lucide-react';
import type {SavedNote,Section} from '@/lib/reader-model';
import {MODE_COLORS,MODE_LABELS,noteText,referenceLabel} from '@/lib/reader-model';
import {inkPath,pencilPalette} from '@/lib/pencil-model';
import {AnalysisContent} from './reader-assistant';

export function ReaderAnnotationDetails({notes,section,onEdit,onDelete,onAdd,onQuote,onRetry}:{notes:SavedNote[];section:Section;onEdit:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;onAdd:()=>void;onQuote:(id:string)=>void;onRetry?:(id:string)=>void}){
 return <section className="attached-annotations" aria-label="Gespeicherte Notizen und Erklärungen">
  {!notes.length&&<p className="small-note">Der Eintrag wurde gelöscht. Über „Rückgängig“ kannst du ihn wiederherstellen.</p>}
  {notes.map(note=><article className="annotation-detail" key={note.id}>
   <header><span><i style={{background:note.pencil?pencilPalette[note.pencil.color].fill:MODE_COLORS[note.kind]}}/>{note.analysis?'KI · ':''}{note.pencil?.meaning||MODE_LABELS[note.kind]}<small>{referenceLabel(section,note.anchor)}</small></span><div>
    {!note.analysis&&<button className="icon-button" aria-label="Notiz bearbeiten" title="Notiz bearbeiten" onClick={()=>onEdit(note)}><PenLine size={17}/></button>}
    <button className="icon-button" aria-label="Eintrag löschen" title="Diesen Eintrag löschen" onClick={()=>onDelete(note)}><Trash2 size={16}/></button>
   </div></header>
   {noteText(note)&&<p className="annotation-body">{noteText(note)}</p>}
   {note.analysis&&<div className="analysis-result"><AnalysisContent analysis={note.analysis} onQuote={onQuote}/></div>}
   {!noteText(note)&&!note.analysis&&!note.pencil?.ink.length&&<p className="small-note">{note.kind==='bookmark'?'Gespeichertes Lesezeichen.':'Markierung ohne Textnotiz.'}</p>}
   {note.pencil?.transcription==='pending'&&<p className="small-note" role="status">Handschrift gespeichert · Suchtext wird erkannt …</p>}
   {note.pencil?.transcription==='failed'&&<div className="note-recognition-status" role="status"><span>{note.pencil.transcriptionError??'Erkennung nicht verfügbar. Das Original bleibt gespeichert.'}</span>{onRetry&&<button className="text-button" onClick={()=>onRetry(note.id)}>Erneut erkennen</button>}</div>}
   {!!note.pencil?.ink.length&&<details className="saved-ink" open={!noteText(note)}><summary>Originalhandschrift</summary><svg viewBox={`0 0 ${note.pencil.inkWidth??1000} ${note.pencil.inkHeight??320}`} role="img" aria-label="Gespeicherte Originalhandschrift">{note.pencil.ink.map((stroke,i)=><path key={i} d={inkPath(stroke)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}</svg></details>}
  </article>)}
  <button className="text-button annotation-add" onClick={onAdd}><Plus size={16}/>Notiz hinzufügen</button>
 </section>;
}
