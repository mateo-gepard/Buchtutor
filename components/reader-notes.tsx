'use client';
import {Bookmark,Download,MessageSquare,Search,Trash2,ArrowUpRight} from 'lucide-react';
import {useState} from 'react';
import type {SavedNote,WorkMeta} from '@/lib/reader-model';
import {MODE_COLORS,MODE_LABELS} from '@/lib/reader-model';
import {downloadFile} from '@/lib/portable';
export function NotesList({notes,catalog,onOpen,onDelete,compact=false}:{notes:SavedNote[];catalog:WorkMeta[];onOpen:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;compact?:boolean}){
  return <div className={`notes-list ${compact?'compact-notes':''}`}>{notes.map(note=><article className="note-card" key={note.id}>
    <div className="note-card-heading"><span className="note-type"><i style={{background:MODE_COLORS[note.kind]}}/>{note.kind==='bookmark'?<Bookmark size={14}/>:<MessageSquare size={14}/>} {MODE_LABELS[note.kind]}{note.conflictOf&&' · Konfliktkopie'}</span><button className="icon-button" aria-label={note.kind==='bookmark'?'Lesezeichen löschen':'Notiz löschen'} onClick={()=>onDelete(note)}><Trash2 size={16}/></button></div>
    <button className="note-open" onClick={()=>onOpen(note)}>{!compact&&<h3>{catalog.find(w=>w.id===note.workId)?.title??note.workId}</h3>}<blockquote>{note.anchor.quote.slice(0,190)}{note.anchor.quote.length>190?' …':''}</blockquote>{note.body&&<p>{note.body.slice(0,240)}</p>}{note.analysis&&<p>{note.analysis.title}</p>}<span className="note-open-label">Im Text öffnen<ArrowUpRight size={15}/></span></button>
    <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString('de-DE')}</time>
  </article>)}</div>;
}
export function Notebook({notes,catalog,onOpen,onDelete,onTransfer}:{notes:SavedNote[];catalog:WorkMeta[];onOpen:(note:SavedNote)=>void;onDelete:(note:SavedNote)=>void;onTransfer:()=>void}){
  const [query,setQuery]=useState(''),[work,setWork]=useState('all'),[kind,setKind]=useState('all');
  const filtered=notes.filter(n=>(work==='all'||n.workId===work)&&(kind==='all'||(kind==='bookmark'?n.kind==='bookmark':n.kind!=='bookmark'))&&`${n.anchor.quote} ${n.body} ${n.analysis?.summary??''}`.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')));
  function download(){
    const content=filtered.map(n=>`## ${catalog.find(w=>w.id===n.workId)?.title??n.workId} · ${MODE_LABELS[n.kind]}\n\nAusgabe: ${n.editionId}\nTextanker: ${n.anchor.sectionId}/${n.anchor.startId}–${n.anchor.endId}\n\n> ${n.anchor.quote.replaceAll('\n','\n> ')}\n\n${n.body}${n.analysis?`\n\n### ${n.analysis.title}\n\n${n.analysis.summary}\n\n${n.analysis.observations.map(o=>`**${o.label}**\n\n${o.text}\n\n${o.quotes.map(q=>'>'+q.quote).join('\n')}`).join('\n\n')}\n\n${n.analysis.uncertainty}\n\nKI-Lesehilfe (${n.analysis.model}).`:''}`).join('\n\n---\n\n');
  downloadFile(new Blob(['# Meine Buchtutor-Notizen\n\n'+content],{type:'text/markdown;charset=utf-8'}),'Buchtutor-Notizen.md');
  }
  return <main className="notebook-page" id="main-content"><div className="page-heading"><h1>Meine Notizen</h1><button className="secondary-button" onClick={onTransfer}>Geräteübertragung<ArrowRightIcon/></button></div><p className="small-note">Auf diesem Gerät gespeichert. Mit einer Sicherung kannst du deine Einträge übertragen.</p>
    <div className="notebook-controls"><label className="search-field"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Notizen durchsuchen" aria-label="Notizen durchsuchen"/></label><select value={work} onChange={e=>setWork(e.target.value)} aria-label="Notizen nach Werk filtern"><option value="all">Alle Werke</option>{catalog.filter(w=>notes.some(n=>n.workId===w.id)).map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select><button className="icon-button" title="Lesbare Markdown-Datei exportieren (unverschlüsselt)" aria-label="Notizen als unverschlüsselte Markdown-Datei exportieren" onClick={download} disabled={!filtered.length}><Download size={18}/></button></div>
    <div className="notebook-filter segmented-control" role="group" aria-label="Einträge filtern">{[['all','Alle Einträge'],['bookmark','Lesezeichen'],['notes','Notizen & Analysen']].map(([value,label])=><button key={value} aria-pressed={kind===value} onClick={()=>setKind(value)}>{label}</button>)}</div>
    <NotesList notes={filtered} catalog={catalog} onOpen={onOpen} onDelete={onDelete}/>
    {!filtered.length&&<div className="empty-state"><Bookmark size={26}/><h2>{notes.length?'Keine passenden Notizen':'Noch keine Notizen'}</h2><p>Wähle beim Lesen eine Textstelle und speichere eine Notiz, ein Lesezeichen oder eine Analyse.</p></div>}
  </main>;
}
function ArrowRightIcon(){return <ArrowUpRight size={17}/>;}
