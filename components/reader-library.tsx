'use client';
import {useState} from 'react';
import {ArrowRight,Search} from 'lucide-react';
import {BookCover} from './book-cover';
import type {ReadingProgress,WorkMeta} from '@/lib/reader-model';

export function ReaderLibrary({catalog,progress,onOpen}:{catalog:WorkMeta[];progress:ReadingProgress[];onOpen:(id:string)=>void}){
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const works=catalog.filter(w=>(filter==='all'||filter==='drama'&&w.genre!=='Erzählung'||filter==='prose'&&w.genre==='Erzählung')&&`${w.title} ${w.author}`.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')));
  const latest=[...progress].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(p=>catalog.find(w=>w.id===p.workId&&w.editionId===p.editionId)).find(Boolean);
  return <main className="library-page" id="main-content">
    <div className="page-heading"><h1>Bibliothek</h1><label className="search-field"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Titel oder Autor" aria-label="Bibliothek durchsuchen"/></label></div>
    {latest&&!query&&filter==='all'&&<button className="resume-book" onClick={()=>onOpen(latest.id)}><span className="resume-cover"><BookCover {...latest}/></span><span><small>Zuletzt gelesen</small><strong>{latest.title}</strong><span>{latest.author}</span></span><span className="resume-action">Weiterlesen<ArrowRight size={17}/></span></button>}
    <div className="library-filter" role="group" aria-label="Bibliothek filtern">{[['all','Alle Werke'],['drama','Dramen'],['prose','Prosa']].map(([id,label])=><button key={id} className={filter===id?'selected':''} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
    <div className="book-grid">{works.map((work,i)=>{
      const continuing=progress.some(p=>p.workId===work.id&&p.editionId===work.editionId);
      return <button className="library-book" key={work.id} onClick={()=>onOpen(work.id)} aria-label={`${work.title} – ${continuing?'weiterlesen':'öffnen'}`}>
        <BookCover {...work} priority={i<4}/><span className="book-details"><strong>{work.title}</strong><span>{work.author}</span><small>{continuing?'Weiterlesen':work.genre}<ArrowRight size={14}/></small></span>
      </button>;
    })}
    {(filter==='all'||filter==='prose')&&(!query||'heimsuchung jenny erpenbeck'.includes(query.toLocaleLowerCase('de')))&&<article className="library-book unavailable"><BookCover id="heimsuchung" title="Heimsuchung" author="Jenny Erpenbeck" genre="Roman" year={2008}/><div className="book-details"><strong>Heimsuchung</strong><span>Jenny Erpenbeck</span><small>Kein lizenzierter Volltext</small></div></article>}
    </div>
    {!works.length&&!('heimsuchung jenny erpenbeck'.includes(query.toLocaleLowerCase('de')))&&<p className="empty-state">Kein passendes Werk. Probiere einen anderen Titel oder Autor.</p>}
    <footer className="library-footer"><p>Bayern · Q12 / Q13 <a href="https://www.deutschabitur.bayern.de/informationen-zu-den-abiturjahrgaengen/" target="_blank" rel="noreferrer">Lehrplan und Lektürevorgaben ↗</a></p><p>Die Quelle und Zitierweise findest du im Inhaltsverzeichnis des jeweiligen Werkes.</p><div><a href="/datenschutz">Datenschutz</a><a href="/impressum">Impressum</a></div></footer>
  </main>;
}
