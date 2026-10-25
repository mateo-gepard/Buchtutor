'use client';
import {ArrowRight,Headphones,Search} from 'lucide-react';
import {hasAudiobook} from '@/lib/audiobook';
import {BookCover} from './book-cover';
import type {ReadingProgress,WorkMeta} from '@/lib/reader-model';

const proseGenres=new Set(['Erzählung','Erzählfragment','Novellenfragment','Novelle','Roman','Briefroman']);

export type LibraryFilters={query:string;filter:'all'|'drama'|'prose'};

export function ReaderLibrary({catalog,progress,onOpen,filters,onFiltersChange}:{catalog:WorkMeta[];progress:ReadingProgress[];onOpen:(id:string)=>void;filters:LibraryFilters;onFiltersChange:(next:LibraryFilters)=>void}){
  const {query,filter}=filters,search=query.trim().toLocaleLowerCase('de');
  const works=catalog.filter(w=>(filter==='all'||filter==='drama'&&!proseGenres.has(w.genre)||filter==='prose'&&proseGenres.has(w.genre))&&`${w.title} ${w.author}`.toLocaleLowerCase('de').includes(search)).sort((a,b)=>a.title.localeCompare(b.title,'de'));
  const showUnavailable=(filter==='all'||filter==='prose')&&'heimsuchung jenny erpenbeck'.includes(search);
  const latest=[...progress].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(p=>catalog.find(w=>w.id===p.workId&&w.editionId===p.editionId)).find(Boolean);
  return <main className="library-page" id="main-content">
    <div className="page-heading"><h1>Bibliothek</h1><label className="search-field"><Search size={18}/><input value={query} onChange={e=>onFiltersChange({...filters,query:e.target.value})} placeholder="Titel oder Autor" aria-label="Bibliothek durchsuchen"/></label></div>
    {latest&&!search&&filter==='all'&&<button className="resume-book" onClick={()=>onOpen(latest.id)}><span className="resume-cover"><BookCover {...latest}/></span><span><small>Zuletzt gelesen</small><strong>{latest.title}</strong><span>{latest.author}</span></span><span className="resume-action">Weiterlesen<ArrowRight size={17}/></span></button>}
    <div className="library-filter" role="group" aria-label="Bibliothek filtern">{([['all','Alle Werke'],['drama','Dramen'],['prose','Prosa']] as const).map(([id,label])=><button key={id} className={filter===id?'selected':''} aria-pressed={filter===id} onClick={()=>onFiltersChange({...filters,filter:id})}>{label}</button>)}</div>
    <div className="book-grid">{works.map((work,i)=>{
      const continuing=progress.some(p=>p.workId===work.id&&p.editionId===work.editionId);
      return <button className="library-book" key={work.id} data-work={work.id} onClick={()=>onOpen(work.id)} aria-label={`${work.title} – ${continuing?'weiterlesen':'öffnen'}`}>
        <BookCover {...work} priority={i<4}/><span className="book-details"><strong>{work.title}</strong><span>{work.author}</span><span className="book-audio-label"><Headphones size={12}/>{hasAudiobook(work.id)?'Hörbuch verfügbar':'Hörbuch nicht verfügbar'}</span><small>{continuing?'Weiterlesen':work.genre}<ArrowRight size={14}/></small></span>
      </button>;
    })}
    {showUnavailable&&<article className="library-book unavailable"><BookCover id="heimsuchung" title="Heimsuchung" author="Jenny Erpenbeck" genre="Roman" year={2008}/><div className="book-details"><strong>Heimsuchung</strong><span>Jenny Erpenbeck</span><span className="book-audio-label"><Headphones size={12}/>Hörbuch nicht verfügbar</span><small>Kein lizenzierter Volltext</small></div></article>}
    </div>
    {!works.length&&!showUnavailable&&<div className="empty-state"><p>Kein passendes Werk. Probiere einen anderen Titel oder Autor.</p>{search&&<button className="text-button" onClick={()=>onFiltersChange({...filters,query:''})}>Suche löschen</button>}{filter!=='all'&&<button className="text-button" onClick={()=>onFiltersChange({query:'',filter:'all'})}>Filter zurücksetzen</button>}</div>}
    <footer className="library-footer"><p>Bayern · Q12 / Q13 <a href="https://www.deutschabitur.bayern.de/informationen-zu-den-abiturjahrgaengen/" target="_blank" rel="noreferrer">Lehrplan und Lektürevorgaben ↗</a></p><p>Die Quelle und Zitierweise findest du im Inhaltsverzeichnis des jeweiligen Werkes.</p><div><a href="/datenschutz">Datenschutz</a><a href="/impressum">Impressum</a></div></footer>
  </main>;
}
