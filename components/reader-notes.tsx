'use client';
import {useState} from 'react';
import {Bookmark,Download,MessageSquare,Search,Trash2,ArrowUpRight,RotateCcw} from 'lucide-react';
import type {SavedNote,WorkMeta} from '@/lib/reader-model';
import {MODE_COLORS,MODE_LABELS,noteText} from '@/lib/reader-model';
import {inkPath,pencilColors,pencilPalette} from '@/lib/pencil-model';
import {downloadFile} from '@/lib/portable';
export function NotesList({notes,catalog,onOpen,onDelete,compact=false}:{notes:SavedNote[];catalog:WorkMeta[];onOpen:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;compact?:boolean}){
  return <div className={`notes-list ${compact?'compact-notes':''}`}>{notes.map(note=><article className="note-card" key={note.id}>
    <div className="note-card-heading"><span className="note-type"><i style={{background:note.pencil?pencilPalette[note.pencil.color].fill:MODE_COLORS[note.kind]}}/>{note.kind==='bookmark'?<Bookmark size={14}/>:<MessageSquare size={14}/>} {note.pencil?`${pencilPalette[note.pencil.color].name} · ${note.pencil.meaning}`:MODE_LABELS[note.kind]}{note.conflictOf&&' · Konfliktkopie'}</span><button className="icon-button" aria-label={note.kind==='bookmark'?'Lesezeichen löschen':'Notiz löschen'} onClick={()=>onDelete(note)}><Trash2 size={16}/></button></div>
    <button className="note-open" onClick={()=>onOpen(note)}>{!compact&&<h3>{catalog.find(w=>w.id===note.workId)?.title??note.workId}</h3>}<blockquote>{note.anchor.quote.slice(0,190)}{note.anchor.quote.length>190?' …':''}</blockquote>{note.pencil?.uncertain&&<p className="small-note">Handschrift prüfen: Die Erkennung war an einigen Stellen unsicher.</p>}{!!note.pencil?.ink.length&&note.pencil.transcription==='none'&&<p className="small-note">Als Handschrift gespeichert · ohne Texterkennung.</p>}{note.pencil?.transcription==='pending'&&<p className="small-note">Original gespeichert · Suchtext wird erkannt …</p>}{note.pencil?.transcription==='failed'&&<p className="small-note">Original gespeichert · Erkennung erneut versuchen.</p>}{noteText(note)&&<p>{noteText(note).slice(0,240)}</p>}{note.analysis&&<p>{note.analysis.title}</p>}<span className="note-open-label">Im Text öffnen<ArrowUpRight size={15}/></span></button>
    {!!note.pencil?.ink.length&&<details className="saved-ink"><summary>Originalhandschrift</summary><svg viewBox={`0 0 ${note.pencil.inkWidth??1000} ${note.pencil.inkHeight??320}`} role="img" aria-label="Gespeicherte Originalhandschrift">{note.pencil.ink.map((stroke,i)=><path key={i} d={inkPath(stroke)} fill="none" stroke="#263b34" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}</svg></details>}
    <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString('de-DE')}</time>
  </article>)}</div>;
}
export type NotebookFilters={query:string;work:string;kind:string;color:string;meaning:string};
export const defaultNotebookFilters:NotebookFilters={query:'',work:'all',kind:'all',color:'all',meaning:'all'};
export function Notebook({notes,catalog,onOpen,onDelete,onTransfer,filters,onFiltersChange,practice=false,deletedNotes=[],onRestore}:{notes:SavedNote[];deletedNotes?:SavedNote[];onRestore?:(note:SavedNote)=>Promise<void>;catalog:WorkMeta[];onOpen:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;onTransfer:()=>void;filters:NotebookFilters;onFiltersChange:(filters:NotebookFilters)=>void;practice?:boolean}){
  const {query,work,kind,color,meaning}=filters;
  const change=(value:Partial<NotebookFilters>)=>onFiltersChange({...filters,...value});
  const works=new Map(catalog.map(item=>[item.id,item]));
  const counts=new Map<string,number>();for(const note of notes)counts.set(note.workId,(counts.get(note.workId)??0)+1);
  // Keep a selected work available even after its last entry is removed.
  const workIds=[...new Set([...counts.keys(),...deletedNotes.map(note=>note.workId),...(work==='all'?[]:[work])])].sort((a,b)=>(works.get(a)?.title??a).localeCompare(works.get(b)?.title??b,'de'));
  const workNotes=work==='all'?notes:notes.filter(n=>n.workId===work);
  const meanings=[...new Set(workNotes.flatMap(n=>n.pencil?[n.pencil.meaning]:[]))].sort();
  const search=query.trim().toLocaleLowerCase('de');
  const filtered=workNotes.filter(n=>(color==='all'||n.pencil?.color===color)&&(meaning==='all'||n.pencil?.meaning===meaning)&&(kind==='all'||(kind==='bookmark'?n.kind==='bookmark':n.kind!=='bookmark'))&&`${works.get(n.workId)?.title??n.workId} ${works.get(n.workId)?.author??''} ${n.anchor.quote} ${noteText(n)} ${n.pencil?.meaning??''} ${n.pencil?pencilPalette[n.pencil.color].name:''} ${n.analysis?.title??''} ${n.analysis?.summary??''}`.toLocaleLowerCase('de').includes(search));
  const active=!!search||work!=='all'||kind!=='all'||color!=='all'||meaning!=='all';
  function download(){
    const content=filtered.map(n=>`## ${catalog.find(w=>w.id===n.workId)?.title??n.workId} · ${n.pencil?`${pencilPalette[n.pencil.color].name} · ${n.pencil.meaning}`:MODE_LABELS[n.kind]}\n\nAusgabe: ${n.editionId}\nTextanker: ${n.anchor.sectionId}/${n.anchor.startId}–${n.anchor.endId}\n\n> ${n.anchor.quote.replaceAll('\n','\n> ')}\n\n${noteText(n)}${n.analysis?`\n\n### ${n.analysis.title}\n\n${n.analysis.summary}\n\n${n.analysis.observations.map(o=>`**${o.label}**\n\n${o.text}\n\n${o.quotes.map(q=>'>'+q.quote).join('\n')}`).join('\n\n')}\n\n${n.analysis.uncertainty}\n\nKI-Lesehilfe (${n.analysis.model}).`:''}`).join('\n\n---\n\n');
  downloadFile(new Blob(['# Meine Buchtutor-Notizen\n\n'+content],{type:'text/markdown;charset=utf-8'}),'Buchtutor-Notizen.md');
  }
  return <main className="notebook-page" id="main-content"><div className="page-heading"><h1>Meine Notizen</h1><button className="secondary-button" onClick={onTransfer}>Geräteübertragung<ArrowRightIcon/></button></div><p className="small-note">{practice?'Übungsnotiz · nur für diese Einführung, nicht gespeichert.':'Auf diesem Gerät gespeichert. Mit einer Sicherung kannst du deine Einträge übertragen.'}</p>
    <div className="notebook-controls"><label className="notebook-work-filter"><span>Werk</span><select value={work} onChange={e=>change({work:e.target.value,meaning:'all'})} aria-label="Notizen nach Werk filtern"><option value="all">Alle Werke · {notes.length}</option>{workIds.map(id=><option key={id} value={id}>{works.get(id)?.title??id} · {counts.get(id)??0}</option>)}</select></label><label className="search-field"><Search size={18}/><input value={query} onChange={e=>change({query:e.target.value})} placeholder="Notizen durchsuchen" aria-label="Notizen durchsuchen"/></label><button className="icon-button notebook-export" title="Lesbare Markdown-Datei exportieren (unverschlüsselt)" aria-label="Notizen als unverschlüsselte Markdown-Datei exportieren" onClick={download} disabled={!filtered.length}><Download size={18}/></button></div>
    <div className="notebook-filter segmented-control" role="group" aria-label="Einträge filtern">{[['all','Alle Einträge'],['bookmark','Lesezeichen'],['notes','Notizen & Analysen']].map(([value,label])=><button key={value} aria-pressed={kind===value} onClick={()=>change({kind:value})}>{label}</button>)}</div>
    <div className="pencil-notebook-filters"><label>Markierungsfarbe<select aria-label="Nach Markierungsfarbe filtern" value={color} onChange={e=>change({color:e.target.value})}><option value="all">Alle Farben</option>{pencilColors.map(c=><option key={c} value={c}>{pencilPalette[c].name}</option>)}</select></label><label>Bedeutung<select aria-label="Nach Markierungsbedeutung filtern" value={meaning} onChange={e=>change({meaning:e.target.value})}><option value="all">Alle Bedeutungen</option>{[...new Set([...meanings,...(meaning==='all'?[]:[meaning])])].map(m=><option key={m}>{m}</option>)}</select></label></div>
    <div className="notebook-results"><p role="status">{filtered.length} {filtered.length===1?'Eintrag':'Einträge'}{work!=='all'?` in ${works.get(work)?.title??work}`:''}</p>{active&&<button className="text-button" onClick={()=>onFiltersChange(defaultNotebookFilters)}>Filter zurücksetzen</button>}</div>
    <NotesList notes={filtered} catalog={catalog} onOpen={onOpen} onDelete={onDelete}/>
    {!filtered.length&&<div className="empty-state"><Bookmark size={26}/><h2>{notes.length?'Keine passenden Notizen':'Noch keine Notizen'}</h2><p>{notes.length?'Ändere die Suche oder setze die Filter zurück, um deine Einträge wieder anzuzeigen.':'Wähle beim Lesen eine Textstelle und speichere eine Notiz, ein Lesezeichen oder eine Analyse.'}</p></div>}
    {!practice&&onRestore&&<DeletedNotes notes={work==='all'?deletedNotes:deletedNotes.filter(note=>note.workId===work)} catalog={catalog} onRestore={onRestore}/>}
  </main>;
}
function ArrowRightIcon(){return <ArrowUpRight size={17}/>;}

function DeletedNotes({notes,catalog,onRestore}:{notes:SavedNote[];catalog:WorkMeta[];onRestore:(note:SavedNote)=>Promise<void>}){
 const [pending,setPending]=useState(''),[error,setError]=useState('');
 async function restore(note:SavedNote){if(pending)return;setPending(note.id);setError('');try{await onRestore(note);}catch(error){setError(error instanceof Error?error.message:'Der Eintrag konnte nicht wiederhergestellt werden.');}finally{setPending('');}}
 if(!notes.length)return null;
 return <details className="notebook-trash"><summary><Trash2 size={15}/>Gelöschte Einträge ({notes.length})</summary><p>Auf diesem Gerät aufbewahrt. Notizen, Markierungen und Originalhandschrift lassen sich wiederherstellen.</p>{error&&<p className="inline-error" role="alert">{error}</p>}{notes.map(note=><article className="deleted-note" key={note.id}><div><strong>{catalog.find(work=>work.id===note.workId)?.title??note.workId}</strong><blockquote>{note.anchor.quote.slice(0,150)}</blockquote>{noteText(note)&&<p>{noteText(note).slice(0,160)}</p>}{!!note.pencil?.ink.length&&<small>Originalhandschrift vorhanden</small>}</div><button className="secondary-button" disabled={!!pending} onClick={()=>void restore(note)}><RotateCcw size={15}/>{pending===note.id?'Wiederherstellen …':'Eintrag wiederherstellen'}</button></article>)}</details>;
}
