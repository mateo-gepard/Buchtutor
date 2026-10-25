'use client';
import {useState} from 'react';
import {ChevronDown,PenLine,Plus,Trash2} from 'lucide-react';
import type {SavedNote,Section} from '@/lib/reader-model';
import {MODE_COLORS,MODE_LABELS,noteText,referenceLabel} from '@/lib/reader-model';
import {inkPath,pencilPalette,type PencilColor} from '@/lib/pencil-model';
import {AnalysisContent} from './reader-assistant';
import {ReaderHighlightColors} from './reader-highlight-colors';

export function ReaderAnnotationDetails({notes,section,onEdit,onDelete,onAdd,onQuote,onRetry,onColorChange,meanings}:{notes:SavedNote[];section:Section;onEdit:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;onAdd:()=>void;onQuote:(id:string)=>void;onRetry?:(id:string)=>void;onColorChange:(note:SavedNote,color:PencilColor)=>Promise<boolean>;meanings?:Partial<Record<PencilColor,string>>}){
 const [colorsFor,setColorsFor]=useState<string|null>(null),[busy,setBusy]=useState(false);
 async function recolor(note:SavedNote,color:PencilColor){if(busy)return;setBusy(true);try{if(await onColorChange(note,color))setColorsFor(null);}finally{setBusy(false);}}
 return <section className="attached-annotations" aria-label="Gespeicherte Notizen und Erklärungen">
  {!notes.length&&<p className="small-note">Der Eintrag wurde gelöscht. Über „Rückgängig“ kannst du ihn wiederherstellen.</p>}
  {notes.map(note=><article className="annotation-detail" key={note.id}>
   <header><span>{note.pencil?<button className="annotation-color-trigger" aria-label="Farbe der Markierung ändern" aria-expanded={colorsFor===note.id} onClick={()=>setColorsFor(colorsFor===note.id?null:note.id)}><i style={{background:pencilPalette[note.pencil.color].fill}}/>{note.pencil.meaning}<ChevronDown size={13}/></button>:<><i style={{background:MODE_COLORS[note.kind]}}/>{note.analysis?'KI · ':''}{MODE_LABELS[note.kind]}</>}<small>{referenceLabel(section,note.anchor)}</small></span><div>
    {!note.analysis&&<button className="icon-button" aria-label="Notiz bearbeiten" title="Notiz bearbeiten" onClick={()=>onEdit(note)}><PenLine size={17}/></button>}
    {notes.length===1&&(noteText(note)||note.analysis||note.pencil?.ink.length||note.kind==='bookmark')?<button className="icon-button" aria-label="Weitere Notiz" title="Weitere Notiz zu dieser Stelle" onClick={onAdd}><Plus size={17}/></button>:null}
    <button className="icon-button" aria-label="Eintrag löschen" title="Diesen Eintrag löschen" onClick={()=>onDelete(note)}><Trash2 size={16}/></button>
   </div></header>
   {colorsFor===note.id&&note.pencil&&<ReaderHighlightColors color={note.pencil.color} meanings={meanings} disabled={busy} onColorChange={color=>void recolor(note,color)}/>}
   {noteText(note)&&<p className="annotation-body">{noteText(note)}</p>}
   {note.analysis&&<div className="analysis-result"><AnalysisContent analysis={note.analysis} onQuote={onQuote}/></div>}
   {!noteText(note)&&!note.analysis&&!note.pencil?.ink.length&&(note.kind==='bookmark'?<p className="small-note">Gespeichertes Lesezeichen.</p>:<button className="annotation-empty-note" onClick={()=>onEdit(note)}><Plus size={17}/><span>Notiz hinzufügen<small>Direkt zu dieser Markierung</small></span></button>)}
   {note.pencil?.transcription==='pending'&&<p className="small-note" role="status">Handschrift gespeichert · Suchtext wird erkannt …</p>}
   {note.pencil?.transcription==='failed'&&<div className="note-recognition-status" role="status"><span>{note.pencil.transcriptionError??'Erkennung nicht verfügbar. Das Original bleibt gespeichert.'}</span>{onRetry&&<button className="text-button" onClick={()=>onRetry(note.id)}>Erneut erkennen</button>}</div>}
   {!!note.pencil?.ink.length&&<details className="saved-ink" open={!noteText(note)}><summary>Originalhandschrift</summary><svg viewBox={`0 0 ${note.pencil.inkWidth??1000} ${note.pencil.inkHeight??320}`} role="img" aria-label="Gespeicherte Originalhandschrift">{note.pencil.ink.map((stroke,i)=><path key={i} d={inkPath(stroke)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}</svg></details>}
  </article>)}
  {notes.length>1&&notes.every(note=>noteText(note)||note.analysis||note.pencil?.ink.length||note.kind==='bookmark')&&<button className="text-button annotation-add" onClick={onAdd}><Plus size={16}/>Weitere Notiz</button>}
 </section>;
}
