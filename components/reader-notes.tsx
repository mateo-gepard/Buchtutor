'use client';
import {useEffect,useRef,useState} from 'react';
import {Bookmark,Download,MessageSquare,Search,Trash2,ArrowUpRight,RotateCcw,SlidersHorizontal,ChevronDown,CheckSquare,X} from 'lucide-react';
import {SelectionSummary} from './selection-summary';
import {NotebookDrafts,useNotebookPencilDrafts} from './notebook-drafts';
import {matchesNotebookQuery,notebookSearchTerms,NotebookSearchPreview,NotebookSearchText} from './notebook-search';
import {useBookReferences} from '@/hooks/use-book-references';
import {notebookReferenceLabel} from '@/lib/book-references';
import type {NoteDraftLocation} from '@/lib/note-draft-index';
import {toggleSelected} from '@/lib/reader-selection';
import type {SavedNote,WorkMeta} from '@/lib/reader-model';
import {MODE_COLORS,MODE_LABELS,noteText} from '@/lib/reader-model';
import {inkPath,pencilColors,pencilPalette} from '@/lib/pencil-model';
import {downloadFile} from '@/lib/portable';
export function NotesList({notes,catalog,onOpen,onDelete,compact=false,query='',selected,selecting=false,onSelect}:{query?:string;selected?:string[];selecting?:boolean;onSelect?:(id:string)=>void;notes:SavedNote[];catalog:WorkMeta[];onOpen:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;compact?:boolean}){
  const references=useBookReferences(catalog,notes.map(note=>note.workId));
  return <div className={`notes-list ${compact?'compact-notes':''}`}>{notes.map(note=><article className={"note-card "+(selecting&&selected?.includes(note.id)?"is-selected":"")} key={note.id}>
    <div className="note-card-heading">{selecting&&<label className="note-select"><input type="checkbox" checked={selected?.includes(note.id)??false} onChange={()=>onSelect?.(note.id)} aria-label={`Eintrag auswählen: ${note.anchor.quote.slice(0,65)}`}/></label>}<span className="note-type"><i style={{background:note.pencil?pencilPalette[note.pencil.color].fill:MODE_COLORS[note.kind]}}/>{note.kind==='bookmark'?<Bookmark size={14}/>:<MessageSquare size={14}/>} {note.pencil?`${pencilPalette[note.pencil.color].name} · ${note.pencil.meaning}`:MODE_LABELS[note.kind]}{note.conflictOf&&' · Konfliktkopie'}</span><button hidden={selecting} className="icon-button" aria-label={note.kind==='bookmark'?'Lesezeichen löschen':'Notiz löschen'} onClick={()=>onDelete(note)}><Trash2 size={16}/></button></div>
    <button className="note-open" aria-pressed={selecting?selected?.includes(note.id)??false:undefined} onClick={()=>selecting?onSelect?.(note.id):onOpen(note)}>{!compact&&<h3><NotebookSearchText text={catalog.find(w=>w.id===note.workId)?.title??note.workId} query={query}/></h3>}<small className="note-reference">{notebookReferenceLabel(catalog.find(work=>work.id===note.workId),references[note.workId],note.editionId,note.anchor)}</small><blockquote><NotebookSearchText text={note.anchor.quote.slice(0,190)} query={query}/>{note.anchor.quote.length>190?' …':''}</blockquote>{note.pencil?.uncertain&&<p className="small-note">Handschrift prüfen: Die Erkennung war an einigen Stellen unsicher.</p>}{!!note.pencil?.ink.length&&note.pencil.transcription==='none'&&<p className="small-note">Als Handschrift gespeichert · ohne Texterkennung.</p>}{note.pencil?.transcription==='pending'&&<p className="small-note">Original gespeichert · Suchtext wird erkannt …</p>}{note.pencil?.transcription==='failed'&&<p className="small-note">Original gespeichert · Erkennung erneut versuchen.</p>}{noteText(note)&&(compact?<p>{noteText(note).slice(0,240)}</p>:<NotebookSearchPreview text={noteText(note)} query={query} label={note.pencil?.ink.length?(note.pencil.transcription==='recognized'?'Erkannter Suchtext':'Notiz zur Handschrift'):undefined}/>)}{note.analysis&&<><p><NotebookSearchText text={note.analysis.title} query={query}/></p>{!compact&&query.trim()&&<NotebookSearchPreview text={analysisSearchText(note)} query={query} label="Treffer in der Erklärung" onlyMatches/>}</>}<span className="note-open-label">{selecting?(selected?.includes(note.id)?'Ausgewählt · antippen zum Abwählen':'Antippen zum Auswählen'):<>Im Text öffnen<ArrowUpRight size={15}/></>}</span></button>
    {!!note.pencil?.ink.length&&<details className="saved-ink"><summary>Originalhandschrift</summary><svg viewBox={`0 0 ${note.pencil.inkWidth??1000} ${note.pencil.inkHeight??320}`} role="img" aria-label="Gespeicherte Originalhandschrift">{note.pencil.ink.map((stroke,i)=><path key={i} d={inkPath(stroke)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}</svg></details>}
    <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString('de-DE')}</time>
  </article>)}</div>;
}
export type NotebookFilters={query:string;work:string;kind:string;color:string;meaning:string;expanded?:boolean};
export const defaultNotebookFilters:NotebookFilters={query:'',work:'all',kind:'all',color:'all',meaning:'all'};
export function Notebook({notes,catalog,onOpen,onDelete,onTransfer,filters,onFiltersChange,practice=false,deletedNotes=[],onRestore,selected=[],onSelectedChange,selecting=false,onSelectingChange,onDeleteMany,onBrowseBooks,onResumeDraft,typedDrafts=[],onResumeNoteDraft}:{typedDrafts?:NoteDraftLocation[];onResumeNoteDraft?:(draft:NoteDraftLocation)=>void;onResumeDraft?:(workId:string,sectionId:string)=>void;onBrowseBooks?:()=>void;selected?:string[];onSelectedChange?:(ids:string[])=>void;selecting?:boolean;onSelectingChange?:(value:boolean)=>void;onDeleteMany?:(notes:SavedNote[])=>Promise<void>;notes:SavedNote[];deletedNotes?:SavedNote[];onRestore?:(note:SavedNote)=>Promise<void>;catalog:WorkMeta[];onOpen:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;onTransfer:()=>void;filters:NotebookFilters;onFiltersChange:(filters:NotebookFilters)=>void;practice?:boolean}){
  const {query,work,kind,color,meaning}=filters;
  const searchInput=useRef<HTMLInputElement>(null);
  const references=useBookReferences(catalog,notes.map(note=>note.workId));
  const [pending,setPending]=useState(false),[batchError,setBatchError]=useState('');
  const pencilDrafts=useNotebookPencilDrafts(catalog,!practice);
  const selectedIds=new Set(selected),chosen=notes.filter(note=>selectedIds.has(note.id));
  useEffect(()=>{if(!selecting)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('[role="dialog"]:not([data-state="closed"])')){event.preventDefault();onSelectingChange?.(false);}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[selecting,onSelectingChange]);
  async function deleteChosen(){if(pending||!chosen.length||!onDeleteMany)return;setPending(true);setBatchError('');try{await onDeleteMany(chosen);onSelectedChange?.(selected.filter(id=>!chosen.some(note=>note.id===id)));}catch(error){setBatchError(error instanceof Error?error.message:'Die Einträge konnten nicht gelöscht werden. Deine Auswahl bleibt erhalten.');}finally{setPending(false);}}

  const change=(value:Partial<NotebookFilters>)=>onFiltersChange({...filters,...value});
  function clearSearch(){change({query:''});searchInput.current?.focus({preventScroll:true});}
  const works=new Map(catalog.map(item=>[item.id,item]));
  const counts=new Map<string,number>();for(const note of notes)counts.set(note.workId,(counts.get(note.workId)??0)+1);
  // Keep a selected work available even after its last entry is removed.
  const workIds=[...new Set([...counts.keys(),...deletedNotes.map(note=>note.workId),...typedDrafts.map(draft=>draft.workId),...pencilDrafts.map(draft=>draft.workId),...(work==='all'?[]:[work])])].sort((a,b)=>(works.get(a)?.title??a).localeCompare(works.get(b)?.title??b,'de'));
  const workNotes=work==='all'?notes:notes.filter(n=>n.workId===work);
  const meanings=[...new Set(workNotes.flatMap(n=>n.pencil?[n.pencil.meaning]:[]))].sort();
  const search=query.trim().toLocaleLowerCase('de'),terms=notebookSearchTerms(query);
  const filtered=workNotes.filter(n=>{
    const meta=works.get(n.workId),index=references[n.workId];
    const reference=meta&&index&&n.editionId===meta.editionId&&index.workId===meta.id&&index.editionId===meta.editionId&&index.revision===meta.revision&&index.sections.some(section=>section.id===n.anchor.sectionId)?notebookReferenceLabel(meta,index,n.editionId,n.anchor):'';
    return (color==='all'||n.pencil?.color===color)&&(meaning==='all'||n.pencil?.meaning===meaning)&&(kind==='all'||(kind==='bookmark'?n.kind==='bookmark':n.kind!=='bookmark'))&&matchesNotebookQuery(`${meta?.title??n.workId} ${meta?.author??''} ${reference} ${n.anchor.quote} ${noteText(n)} ${n.pencil?.meaning??''} ${n.pencil?pencilPalette[n.pencil.color].name:''} ${analysisSearchText(n)}`,terms);
  });
  const filterCount=[work,kind,color,meaning].filter(value=>value!=='all').length;
  const active=!!search||filterCount>0;
  const visibleDrafts=[...typedDrafts,...pencilDrafts].filter(draft=>work==='all'||draft.workId===work).length;
  const visibleIds=new Set(filtered.map(note=>note.id)),hiddenChosen=chosen.filter(note=>!visibleIds.has(note.id)),hiddenChosenIds=new Set(hiddenChosen.map(note=>note.id));
  const allVisibleChosen=filtered.length>0&&filtered.every(note=>selectedIds.has(note.id));
  const additionalFilters=kind!=='all'||color!=='all'||meaning!=='all';
  const filterChips=[
    ...(work!=='all'?[{key:'work' as const,label:works.get(work)?.title??work}]:[]),
    ...(kind!=='all'?[{key:'kind' as const,label:kind==='bookmark'?'Lesezeichen':'Notizen & Analysen'}]:[]),
    ...(color!=='all'?[{key:'color' as const,label:pencilColors.includes(color as typeof pencilColors[number])?pencilPalette[color as typeof pencilColors[number]].name:color}]:[]),
    ...(meaning!=='all'?[{key:'meaning' as const,label:meaning}]:[]),
  ];
  function draftCount(workId:string){return [...typedDrafts,...pencilDrafts].filter(draft=>draft.workId===workId).length;}
  function toggleVisible(){if(pending)return;onSelectedChange?.(allVisibleChosen?selected.filter(id=>!visibleIds.has(id)):[...new Set([...selected,...filtered.map(note=>note.id)])]);}

  function download(items=filtered){
    const content=items.map(n=>`## ${catalog.find(w=>w.id===n.workId)?.title??n.workId} · ${n.pencil?`${pencilPalette[n.pencil.color].name} · ${n.pencil.meaning}`:MODE_LABELS[n.kind]}\n\nAusgabe: ${n.editionId}\nTextanker: ${n.anchor.sectionId}/${n.anchor.startId}–${n.anchor.endId}\n\n> ${n.anchor.quote.replaceAll('\n','\n> ')}\n\n${noteText(n)}${n.analysis?`\n\n### ${n.analysis.title}\n\n${n.analysis.summary}\n\n${n.analysis.observations.map(o=>`**${o.label}**\n\n${o.text}\n\n${o.quotes.map(q=>'>'+q.quote).join('\n')}`).join('\n\n')}\n\n${n.analysis.uncertainty}\n\nKI-Lesehilfe (${n.analysis.model}).`:''}`).join('\n\n---\n\n');
  downloadFile(new Blob(['# Meine Buchtutor-Notizen\n\n'+content],{type:'text/markdown;charset=utf-8'}),'Buchtutor-Notizen.md');
  }
  const selectionLabel=selecting?'Auswahl beenden':chosen.length?`Auswahl fortsetzen (${chosen.length})`:'Einträge auswählen';
  return <main className="notebook-page" id="main-content">
    <div className="page-heading"><h1>Meine Notizen</h1><button className="text-button notebook-transfer" aria-label="Geräteübertragung" onClick={onTransfer}>Übertragen<ArrowUpRight size={17}/></button></div>
    <p className="small-note notebook-storage">{practice?'Übungsnotiz · nur für diese Einführung, nicht gespeichert.':'Auf diesem Gerät gespeichert.'}</p>
    <div className="notebook-controls">
      <label className="notebook-work-filter"><span>Werk</span><select value={work} onChange={e=>change({work:e.target.value,meaning:'all'})} aria-label="Notizen nach Werk filtern"><option value="all">Alle Werke · {notes.length}</option>{workIds.map(id=><option key={id} value={id}>{works.get(id)?.title??id} · {counts.get(id)??0}{draftCount(id)?` · ${draftCount(id)} ${draftCount(id)===1?'Entwurf':'Entwürfe'}`:''}</option>)}</select></label>
      <label className="search-field"><Search size={18}/><input ref={searchInput} value={query} onChange={e=>change({query:e.target.value})} placeholder="Notizen durchsuchen" aria-label="Notizen durchsuchen"/>{query&&<button type="button" className="notebook-search-clear" aria-label="Suche löschen" title="Suche löschen" onClick={clearSearch}><X size={17}/></button>}</label>
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
    {filterChips.length>0&&<div className="notebook-active-filters" role="group" aria-label="Aktive Notizfilter">{filterChips.map(chip=><button key={chip.key} className="notebook-filter-chip" aria-label={`Filter entfernen: ${chip.label}`} title={`${chip.label} entfernen`} onClick={()=>change(chip.key==='work'?{work:'all',meaning:'all'}:{[chip.key]:'all'})}><span>{chip.label}</span><X size={14}/></button>)}</div>}
    {!practice&&onSelectedChange&&selecting&&<div className="notebook-selection-tools"><div className="notebook-batch" aria-busy={pending}><div className="notebook-batch-heading"><button className="text-button notebook-selection-end" aria-label="Auswahl beenden" disabled={pending} onClick={()=>onSelectingChange?.(false)}><X size={17}/>Fertig</button><SelectionSummary count={chosen.length} onClear={()=>{if(!pending)onSelectedChange([]);}}>{(!allVisibleChosen||hiddenChosen.length>0)&&<button className="text-button" disabled={pending||!filtered.length} onClick={toggleVisible}>{allVisibleChosen?'Sichtbare abwählen':'Sichtbare auswählen'}</button>}</SelectionSummary></div>{hiddenChosen.length>0&&<div className="notebook-hidden-selection"><p className="small-note">{hiddenChosen.length} {hiddenChosen.length===1?'ausgewählter Eintrag liegt':'ausgewählte Einträge liegen'} außerhalb des aktuellen Filters.</p><button className="text-button" disabled={pending} onClick={()=>onSelectedChange(selected.filter(id=>!hiddenChosenIds.has(id)))}>Ausgeblendete abwählen</button></div>}<div className="batch-actions"><button className="secondary-button" aria-label="Auswahl exportieren" title="Ausgewählte Einträge als unverschlüsselte Markdown-Datei exportieren" disabled={pending||!chosen.length} onClick={()=>download(chosen)}><Download size={16}/>Exportieren</button><button className="secondary-button" aria-label={pending?'Löschen …':'Auswahl löschen'} disabled={pending||!chosen.length} onClick={()=>void deleteChosen()}><Trash2 size={16}/>{pending?'Löschen …':'Löschen'}</button></div><p className="small-note notebook-batch-hint">Export unverschlüsselt. Löschen rückgängig machbar.</p>{batchError&&<p role="alert" className="inline-error">{batchError}</p>}</div></div>}
    {!practice&&(onResumeDraft||onResumeNoteDraft)&&<NotebookDrafts pencilDrafts={pencilDrafts} catalog={catalog} onResume={onResumeDraft} typedDrafts={typedDrafts} onResumeNoteDraft={onResumeNoteDraft} work={work}/>}
    <NotesList query={query} notes={filtered} catalog={catalog} onOpen={onOpen} onDelete={onDelete} selected={selected} selecting={selecting} onSelect={id=>{if(!pending)onSelectedChange?.(toggleSelected(selected,id));}}/>
    {!filtered.length&&<div className="empty-state"><Bookmark size={26}/><h2>{workNotes.length?'Keine passenden Notizen':visibleDrafts?'Noch keine abgeschlossenen Notizen':notes.length?'Keine Notizen zu diesem Werk':'Noch keine Notizen'}</h2><p>{workNotes.length?'Ändere die Suche oder setze die Filter zurück, um deine Einträge wieder anzuzeigen.':visibleDrafts?'Deine angefangenen Notizen findest du oben unter „Entwürfe“. Öffne einen Entwurf und wähle „Notiz speichern“.':'Wähle beim Lesen eine Textstelle und speichere eine Notiz, ein Lesezeichen oder eine Analyse.'}</p>{active&&<div className="notebook-empty-actions">{query.trim()&&<button className="secondary-button" onClick={clearSearch}>Suche entfernen</button>}{additionalFilters&&<button className="secondary-button" onClick={()=>change({kind:'all',color:'all',meaning:'all'})}>Weitere Filter zurücksetzen</button>}</div>}{!notes.length&&onBrowseBooks&&<button className="primary-button" onClick={onBrowseBooks}>Werk zum Lesen wählen<ArrowUpRight size={17}/></button>}</div>}
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
