'use client';
import {useEffect,useState} from 'react';
import {Bookmark,Download,MessageSquare,Search,Trash2,ArrowUpRight,RotateCcw,SlidersHorizontal,ChevronDown,CheckSquare,X} from 'lucide-react';
import {SelectionSummary} from './selection-summary';
import {NotebookDrafts} from './notebook-drafts';
import {useBookReferences} from '@/hooks/use-book-references';
import {notebookReferenceLabel} from '@/lib/book-references';
import type {NoteDraftLocation} from '@/lib/note-draft-index';
import {toggleSelected} from '@/lib/reader-selection';
import type {SavedNote,WorkMeta} from '@/lib/reader-model';
import {MODE_COLORS,MODE_LABELS,noteText} from '@/lib/reader-model';
import {inkPath,pencilColors,pencilPalette} from '@/lib/pencil-model';
import {downloadFile} from '@/lib/portable';
export function NotesList({notes,catalog,onOpen,onDelete,compact=false,selected,selecting=false,onSelect}:{selected?:string[];selecting?:boolean;onSelect?:(id:string)=>void;notes:SavedNote[];catalog:WorkMeta[];onOpen:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;compact?:boolean}){
  const references=useBookReferences(catalog,notes.map(note=>note.workId));
  return <div className={`notes-list ${compact?'compact-notes':''}`}>{notes.map(note=><article className={"note-card "+(selecting&&selected?.includes(note.id)?"is-selected":"")} key={note.id}>
    <div className="note-card-heading">{selecting&&<label className="note-select"><input type="checkbox" checked={selected?.includes(note.id)??false} onChange={()=>onSelect?.(note.id)} aria-label={`Eintrag auswählen: ${note.anchor.quote.slice(0,65)}`}/></label>}<span className="note-type"><i style={{background:note.pencil?pencilPalette[note.pencil.color].fill:MODE_COLORS[note.kind]}}/>{note.kind==='bookmark'?<Bookmark size={14}/>:<MessageSquare size={14}/>} {note.pencil?`${pencilPalette[note.pencil.color].name} · ${note.pencil.meaning}`:MODE_LABELS[note.kind]}{note.conflictOf&&' · Konfliktkopie'}</span><button hidden={selecting} className="icon-button" aria-label={note.kind==='bookmark'?'Lesezeichen löschen':'Notiz löschen'} onClick={()=>onDelete(note)}><Trash2 size={16}/></button></div>
    <button className="note-open" onClick={()=>selecting?onSelect?.(note.id):onOpen(note)}>{!compact&&<h3>{catalog.find(w=>w.id===note.workId)?.title??note.workId}</h3>}<small className="note-reference">{notebookReferenceLabel(catalog.find(work=>work.id===note.workId),references[note.workId],note.editionId,note.anchor)}</small><blockquote>{note.anchor.quote.slice(0,190)}{note.anchor.quote.length>190?' …':''}</blockquote>{note.pencil?.uncertain&&<p className="small-note">Handschrift prüfen: Die Erkennung war an einigen Stellen unsicher.</p>}{!!note.pencil?.ink.length&&note.pencil.transcription==='none'&&<p className="small-note">Als Handschrift gespeichert · ohne Texterkennung.</p>}{note.pencil?.transcription==='pending'&&<p className="small-note">Original gespeichert · Suchtext wird erkannt …</p>}{note.pencil?.transcription==='failed'&&<p className="small-note">Original gespeichert · Erkennung erneut versuchen.</p>}{noteText(note)&&<p>{noteText(note).slice(0,240)}</p>}{note.analysis&&<p>{note.analysis.title}</p>}<span className="note-open-label">{selecting?(selected?.includes(note.id)?'Ausgewählt · antippen zum Abwählen':'Antippen zum Auswählen'):<>Im Text öffnen<ArrowUpRight size={15}/></>}</span></button>
    {!!note.pencil?.ink.length&&<details className="saved-ink"><summary>Originalhandschrift</summary><svg viewBox={`0 0 ${note.pencil.inkWidth??1000} ${note.pencil.inkHeight??320}`} role="img" aria-label="Gespeicherte Originalhandschrift">{note.pencil.ink.map((stroke,i)=><path key={i} d={inkPath(stroke)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}</svg></details>}
    <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString('de-DE')}</time>
  </article>)}</div>;
}
export type NotebookFilters={query:string;work:string;kind:string;color:string;meaning:string;expanded?:boolean};
export const defaultNotebookFilters:NotebookFilters={query:'',work:'all',kind:'all',color:'all',meaning:'all'};
export function Notebook({notes,catalog,onOpen,onDelete,onTransfer,filters,onFiltersChange,practice=false,deletedNotes=[],onRestore,selected=[],onSelectedChange,selecting=false,onSelectingChange,onDeleteMany,onBrowseBooks,onResumeDraft,typedDrafts=[],onResumeNoteDraft}:{typedDrafts?:NoteDraftLocation[];onResumeNoteDraft?:(draft:NoteDraftLocation)=>void;onResumeDraft?:(workId:string,sectionId:string)=>void;onBrowseBooks?:()=>void;selected?:string[];onSelectedChange?:(ids:string[])=>void;selecting?:boolean;onSelectingChange?:(value:boolean)=>void;onDeleteMany?:(notes:SavedNote[])=>Promise<void>;notes:SavedNote[];deletedNotes?:SavedNote[];onRestore?:(note:SavedNote)=>Promise<void>;catalog:WorkMeta[];onOpen:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;onTransfer:()=>void;filters:NotebookFilters;onFiltersChange:(filters:NotebookFilters)=>void;practice?:boolean}){
  const {query,work,kind,color,meaning}=filters;
  const references=useBookReferences(catalog,notes.map(note=>note.workId));
  const [pending,setPending]=useState(false),[batchError,setBatchError]=useState('');
  const chosen=notes.filter(note=>selected.includes(note.id));
  useEffect(()=>{if(!selecting)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('[role="dialog"]:not([data-state="closed"])')){event.preventDefault();onSelectingChange?.(false);}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[selecting,onSelectingChange]);
  async function deleteChosen(){if(pending||!chosen.length||!onDeleteMany)return;setPending(true);setBatchError('');try{await onDeleteMany(chosen);onSelectedChange?.(selected.filter(id=>!chosen.some(note=>note.id===id)));}catch(error){setBatchError(error instanceof Error?error.message:'Die Einträge konnten nicht gelöscht werden. Deine Auswahl bleibt erhalten.');}finally{setPending(false);}}

  const change=(value:Partial<NotebookFilters>)=>onFiltersChange({...filters,...value});
  const works=new Map(catalog.map(item=>[item.id,item]));
  const counts=new Map<string,number>();for(const note of notes)counts.set(note.workId,(counts.get(note.workId)??0)+1);
  // Keep a selected work available even after its last entry is removed.
  const workIds=[...new Set([...counts.keys(),...deletedNotes.map(note=>note.workId),...typedDrafts.map(draft=>draft.workId),...(work==='all'?[]:[work])])].sort((a,b)=>(works.get(a)?.title??a).localeCompare(works.get(b)?.title??b,'de'));
  const workNotes=work==='all'?notes:notes.filter(n=>n.workId===work);
  const meanings=[...new Set(workNotes.flatMap(n=>n.pencil?[n.pencil.meaning]:[]))].sort();
  const search=query.trim().toLocaleLowerCase('de');
  const filtered=workNotes.filter(n=>{
    const meta=works.get(n.workId),index=references[n.workId];
    const reference=meta&&index&&n.editionId===meta.editionId&&index.workId===meta.id&&index.editionId===meta.editionId&&index.revision===meta.revision&&index.sections.some(section=>section.id===n.anchor.sectionId)?notebookReferenceLabel(meta,index,n.editionId,n.anchor):'';
    return (color==='all'||n.pencil?.color===color)&&(meaning==='all'||n.pencil?.meaning===meaning)&&(kind==='all'||(kind==='bookmark'?n.kind==='bookmark':n.kind!=='bookmark'))&&`${meta?.title??n.workId} ${meta?.author??''} ${reference} ${n.anchor.quote} ${noteText(n)} ${n.pencil?.meaning??''} ${n.pencil?pencilPalette[n.pencil.color].name:''} ${analysisSearchText(n)}`.toLocaleLowerCase('de').includes(search);
  });
  const filterCount=[work,kind,color,meaning].filter(value=>value!=='all').length;
  const active=!!search||filterCount>0;
  const visibleTypedDrafts=typedDrafts.filter(draft=>work==='all'||draft.workId===work).length;
  function download(items=filtered){
    const content=items.map(n=>`## ${catalog.find(w=>w.id===n.workId)?.title??n.workId} · ${n.pencil?`${pencilPalette[n.pencil.color].name} · ${n.pencil.meaning}`:MODE_LABELS[n.kind]}\n\nAusgabe: ${n.editionId}\nTextanker: ${n.anchor.sectionId}/${n.anchor.startId}–${n.anchor.endId}\n\n> ${n.anchor.quote.replaceAll('\n','\n> ')}\n\n${noteText(n)}${n.analysis?`\n\n### ${n.analysis.title}\n\n${n.analysis.summary}\n\n${n.analysis.observations.map(o=>`**${o.label}**\n\n${o.text}\n\n${o.quotes.map(q=>'>'+q.quote).join('\n')}`).join('\n\n')}\n\n${n.analysis.uncertainty}\n\nKI-Lesehilfe (${n.analysis.model}).`:''}`).join('\n\n---\n\n');
  downloadFile(new Blob(['# Meine Buchtutor-Notizen\n\n'+content],{type:'text/markdown;charset=utf-8'}),'Buchtutor-Notizen.md');
  }
  const selectionLabel=selecting?'Auswahl beenden':chosen.length?`Auswahl fortsetzen (${chosen.length})`:'Einträge auswählen';
  return <main className="notebook-page" id="main-content">
    <div className="page-heading"><h1>Meine Notizen</h1><button className="text-button notebook-transfer" aria-label="Geräteübertragung" onClick={onTransfer}>Übertragen<ArrowUpRight size={17}/></button></div>
    <p className="small-note notebook-storage">{practice?'Übungsnotiz · nur für diese Einführung, nicht gespeichert.':'Auf diesem Gerät gespeichert.'}</p>
    <div className="notebook-controls">
      <label className="notebook-work-filter"><span>Werk</span><select value={work} onChange={e=>change({work:e.target.value,meaning:'all'})} aria-label="Notizen nach Werk filtern"><option value="all">Alle Werke · {notes.length}</option>{workIds.map(id=><option key={id} value={id}>{works.get(id)?.title??id} · {counts.get(id)??0}</option>)}</select></label>
      <label className="search-field"><Search size={18}/><input value={query} onChange={e=>change({query:e.target.value})} placeholder="Notizen durchsuchen" aria-label="Notizen durchsuchen"/></label>
    </div>
    <div className="notebook-toolbar">
      <details className="notebook-filter-disclosure" open={practice||!!filters.expanded} onToggle={event=>{if(!practice&&!!filters.expanded!==event.currentTarget.open)change({expanded:event.currentTarget.open});}}>
        <summary><SlidersHorizontal size={17}/><span>Filter</span>{filterCount>0&&<span className="notebook-filter-count">{filterCount} aktiv</span>}<ChevronDown size={16}/></summary>
        <div className="notebook-filter-content">
          <div className="notebook-filter segmented-control" role="group" aria-label="Einträge filtern">{[['all','Alle Einträge'],['bookmark','Lesezeichen'],['notes','Notizen & Analysen']].map(([value,label])=><button key={value} aria-pressed={kind===value} onClick={()=>change({kind:value})}>{label}</button>)}</div>
          <div className="pencil-notebook-filters"><label>Markierungsfarbe<select aria-label="Nach Markierungsfarbe filtern" value={color} onChange={e=>change({color:e.target.value})}><option value="all">Alle Farben</option>{pencilColors.map(c=><option key={c} value={c}>{pencilPalette[c].name}</option>)}</select></label><label>Bedeutung<select aria-label="Nach Markierungsbedeutung filtern" value={meaning} onChange={e=>change({meaning:e.target.value})}><option value="all">Alle Bedeutungen</option>{[...new Set([...meanings,...(meaning==='all'?[]:[meaning])])].map(m=><option key={m}>{m}</option>)}</select></label></div>
        </div>
      </details>
      <div className="notebook-results"><p role="status">{filtered.length} {filtered.length===1?'Eintrag':'Einträge'}{work!=='all'?` in ${works.get(work)?.title??work}`:''}</p><div className="notebook-result-actions">
        {active&&<button className="text-button notebook-reset" onClick={()=>onFiltersChange({...defaultNotebookFilters,expanded:filters.expanded})}>Filter zurücksetzen</button>}
        {!practice&&onSelectedChange&&!selecting&&<button className="text-button notebook-select-toggle" aria-label={selectionLabel} aria-pressed={selecting} disabled={pending} onClick={()=>onSelectingChange?.(!selecting)}><CheckSquare size={16}/>{selecting?'Auswahl beenden':chosen.length?`Auswahl (${chosen.length})`:'Auswählen'}</button>}
        <button className="icon-button notebook-export" title="Lesbare Markdown-Datei exportieren (unverschlüsselt)" aria-label="Notizen als unverschlüsselte Markdown-Datei exportieren" onClick={()=>download()} disabled={!filtered.length}><Download size={18}/></button>
      </div></div>
    </div>
    {!practice&&onSelectedChange&&selecting&&<div className="notebook-selection-tools"><div className="notebook-batch" aria-busy={pending}><div className="notebook-batch-heading"><button className="text-button notebook-selection-end" aria-label="Auswahl beenden" disabled={pending} onClick={()=>onSelectingChange?.(false)}><X size={17}/>Fertig</button><SelectionSummary count={chosen.length} onClear={()=>{if(!pending)onSelectedChange([]);}}><button className="text-button" disabled={pending||!filtered.length} onClick={()=>onSelectedChange([...new Set([...selected,...filtered.map(note=>note.id)])])}>Sichtbare auswählen</button></SelectionSummary></div>{chosen.some(note=>!filtered.some(item=>item.id===note.id))&&<p className="small-note">{chosen.filter(note=>!filtered.some(item=>item.id===note.id)).length} ausgewählte Einträge liegen außerhalb des aktuellen Filters.</p>}<div className="batch-actions"><button className="secondary-button" disabled={pending||!chosen.length} onClick={()=>download(chosen)}><Download size={16}/>Auswahl exportieren</button><button className="secondary-button" disabled={pending||!chosen.length} onClick={()=>void deleteChosen()}><Trash2 size={16}/>{pending?'Löschen …':'Auswahl löschen'}</button></div><p className="small-note">Gelöschte Einträge bleiben wiederherstellbar. Export: unverschlüsselte Markdown-Datei.</p>{batchError&&<p role="alert" className="inline-error">{batchError}</p>}</div></div>}
    {!practice&&(onResumeDraft||onResumeNoteDraft)&&<NotebookDrafts catalog={catalog} onResume={onResumeDraft} typedDrafts={typedDrafts} onResumeNoteDraft={onResumeNoteDraft} work={work}/>}
    <NotesList notes={filtered} catalog={catalog} onOpen={onOpen} onDelete={onDelete} selected={selected} selecting={selecting} onSelect={id=>{if(!pending)onSelectedChange?.(toggleSelected(selected,id));}}/>
    {!filtered.length&&<div className="empty-state"><Bookmark size={26}/><h2>{notes.length?'Keine passenden Notizen':visibleTypedDrafts?'Noch keine abgeschlossenen Notizen':'Noch keine Notizen'}</h2><p>{notes.length?'Ändere die Suche oder setze die Filter zurück, um deine Einträge wieder anzuzeigen.':visibleTypedDrafts?'Deine angefangenen Notizen findest du oben unter „Entwürfe“. Öffne einen Entwurf und wähle „Notiz speichern“.':'Wähle beim Lesen eine Textstelle und speichere eine Notiz, ein Lesezeichen oder eine Analyse.'}</p>{!notes.length&&onBrowseBooks&&<button className="primary-button" onClick={onBrowseBooks}>Werk zum Lesen wählen<ArrowUpRight size={17}/></button>}</div>}
    {!practice&&onRestore&&<DeletedNotes notes={work==='all'?deletedNotes:deletedNotes.filter(note=>note.workId===work)} catalog={catalog} onRestore={onRestore}/>}
  </main>;
}
function analysisSearchText(note:SavedNote){
  const analysis=note.analysis;
  return analysis?[analysis.title,analysis.summary,analysis.question??'',analysis.uncertainty,...analysis.observations.flatMap(observation=>[observation.label,observation.text,...observation.quotes.map(quote=>quote.quote)])].join(' '):'';
}


function DeletedNotes({notes,catalog,onRestore}:{notes:SavedNote[];catalog:WorkMeta[];onRestore:(note:SavedNote)=>Promise<void>}){
 const [pending,setPending]=useState(''),[error,setError]=useState('');
 async function restore(note:SavedNote){if(pending)return;setPending(note.id);setError('');try{await onRestore(note);}catch(error){setError(error instanceof Error?error.message:'Der Eintrag konnte nicht wiederhergestellt werden.');}finally{setPending('');}}
 if(!notes.length)return null;
 return <details className="notebook-trash"><summary><Trash2 size={15}/>Gelöschte Einträge ({notes.length})</summary><p>Auf diesem Gerät aufbewahrt. Notizen, Markierungen und Originalhandschrift lassen sich wiederherstellen.</p>{error&&<p className="inline-error" role="alert">{error}</p>}{notes.map(note=><article className="deleted-note" key={note.id}><div><strong>{catalog.find(work=>work.id===note.workId)?.title??note.workId}</strong><blockquote>{note.anchor.quote.slice(0,150)}</blockquote>{noteText(note)&&<p>{noteText(note).slice(0,160)}</p>}{!!note.pencil?.ink.length&&<small>Originalhandschrift vorhanden</small>}</div><button className="secondary-button" disabled={!!pending} onClick={()=>void restore(note)}><RotateCcw size={15}/>{pending===note.id?'Wiederherstellen …':'Eintrag wiederherstellen'}</button></article>)}</details>;
}
