'use client';
import {Users,X,ArrowRight,Info,Maximize2} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import type {Book,Character,Relation,Section} from '@/lib/reader-model';
import {CAST_ART,portraitStyle} from '@/lib/reader-art';
import {useMemo,useState} from 'react';

type Props={book:Book;section:Section;selected:string[];onSelect:(id:string)=>void};
const RELATION_LABELS:Record<string,string>={parent_of:'Elternteil und Kind',siblings:'Geschwister',spouses:'Verheiratet oder verlobt',friends:'Freundschaft',lover_of:'Liebesbeziehung',related_with:'Verwandtschaft',associated_with:'Zugehörigkeit'};
function relationPairs(relation:Relation):[string,string][] {
 const ids=(value:string)=>value.split(/\s+/).map(s=>s.replace(/^#/,'')).filter(Boolean);
 if(relation.mutual.length)return relation.mutual.flatMap((a,i)=>relation.mutual.slice(i+1).map(b=>[a,b] as [string,string]));
 return ids(relation.active).flatMap(a=>ids(relation.passive).map(b=>[a,b] as [string,string]));
}
function connects(relation:Relation,a:string,b:string){
 return relationPairs(relation).some(([x,y])=>(x===a&&y===b)||(x===b&&y===a));
}
function CharacterPortrait({workId,person,className=''}:{workId:string;person:Character;className?:string}){
 const style=portraitStyle(workId,person.id);
 return <span className={['character-portrait',style?'has-portrait':'portrait-initials',className].join(' ')} style={style} aria-hidden="true">
  {!style&&person.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
 </span>;
}
function Constellation({book,people,relationships,selected,onSelect,large=false}:{
 book:Book;people:Character[];relationships:Relation[];selected:string[];onSelect:(id:string)=>void;large?:boolean;
}){
 const points=people.map((person,i)=>{
  const angle=i/people.length*Math.PI*2-Math.PI/2;
  return {person,x:50+Math.cos(angle)*34,y:48+Math.sin(angle)*34};
 });
 const edgeKeys=new Set<string>();
 const edges=relationships.flatMap(relation=>relationPairs(relation).flatMap(([a,b])=>{
  const from=points.find(p=>p.person.id===a),to=points.find(p=>p.person.id===b);
  const key=[a,b].sort().join('|');
  if(!from||!to||edgeKeys.has(key))return [];
  edgeKeys.add(key);
  const highlighted=selected.length===1?selected.includes(a)||selected.includes(b):selected.includes(a)&&selected.includes(b);
  return [{key,from,to,highlighted}];
 }));
 return <div className={'constellation '+(large?'constellation-large':'')} role="group" aria-label={'Figurenkonstellation: '+book.title}>
  <svg className="constellation-lines" viewBox="0 0 100 100" aria-hidden="true">
   <circle cx="50" cy="48" r="34" className="constellation-orbit"/>
   {edges.map(({key,from,to,highlighted})=><line key={key} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={highlighted?'is-highlighted':selected.length?'is-muted':''}/>)}
  </svg>
  <div className="constellation-center" aria-hidden="true"><span>FIGUREN</span><span>&</span><span>BEZIEHUNGEN</span></div>
  {points.map(({person,x,y})=><button key={person.id} type="button" className={'constellation-node '+(selected.includes(person.id)?'is-selected':'')} style={{left:x+'%',top:y+'%'}} aria-label={person.name+' auswählen'} aria-pressed={selected.includes(person.id)} onClick={()=>onSelect(person.id)}>
   <CharacterPortrait workId={book.id} person={person}/>
   <span className="constellation-name">{person.name}</span>
  </button>)}
 </div>;
}
function FigureDetail({book,picked,relationship}:{book:Book;picked:Character[];relationship:Relation|undefined}){
 if(picked.length===2)return <section className="relation-card" aria-live="polite">
  <div className="relation-portraits"><CharacterPortrait workId={book.id} person={picked[0]}/><ArrowRight size={19}/><CharacterPortrait workId={book.id} person={picked[1]}/></div>
  <div className="section-label">BEZIEHUNG</div><h3>{picked[0].name} <ArrowRight size={16}/> {picked[1].name}</h3>
  <p>{relationship?.description??(relationship?RELATION_LABELS[relationship.type]??'Beziehung aus dem Figurenverzeichnis':'Für dieses Paar ist bis zu dieser Stelle noch keine geprüfte Beziehung hinterlegt.')}</p>
  <p className="source-caption">{relationship?'Lesehilfe · am Originaltext prüfen':'Keine Beziehung aus bloßem gemeinsamen Auftreten abgeleitet.'}</p>
 </section>;
 if(picked.length===1)return <section className="character-card" aria-live="polite">
  <CharacterPortrait workId={book.id} person={picked[0]} className="profile-portrait"/>
  <h3>{picked[0].name}</h3><p>{picked[0].description}</p>
  {picked[0].aliases.length>1&&<p className="alias-list">Auch im Text: {picked[0].aliases.filter(a=>a!==picked[0].name).join(', ')}</p>}
  <p className="source-caption">{picked[0].evidence}</p>
  <p className="character-nudge">Eine zweite Figur wählen, um die Beziehung anzusehen.</p>
 </section>;
 return <div className="tiny-note"><Info size={16}/><span>Wähle ein Porträt aus. Mit einer zweiten Figur öffnest du ihre Beziehung.</span></div>;
}
export function ReaderFigures({book,section,selected,onSelect}:Props){
 const [spoilers,setSpoilers]=useState(false),[filter,setFilter]=useState(''),[expanded,setExpanded]=useState(false);
 const current=book.sections.findIndex(s=>s.id===section.id);
 const all=useMemo(()=>book.characters.filter(c=>spoilers||(c.afterSection??0)<=current),[book,spoilers,current]);
 const people=all.filter(c=>c.name.toLowerCase().includes(filter.toLowerCase()));
 const picked=selected.map(id=>all.find(c=>c.id===id)).filter((c):c is Character=>!!c);
 const visibleSelected=picked.map(c=>c.id);
 const relationships=book.relations.filter(r=>spoilers||(r.afterSection??0)<=current);
 const relationship=picked.length===2?relationships.find(r=>connects(r,picked[0].id,picked[1].id)):undefined;
 const order=CAST_ART[book.id]?.characters??[];
 const ranked=[...all].sort((a,b)=>{
  const first=order.indexOf(a.id),second=order.indexOf(b.id);
  return (first<0?1000:first)-(second<0?1000:second);
 });
 const featured=ranked.slice(0,8);
 for(const person of picked){
  if(!featured.some(c=>c.id===person.id)){
   const replace=featured.findLastIndex(c=>!visibleSelected.includes(c.id));
   if(featured.length<8)featured.push(person);else if(replace>=0)featured[replace]=person;
  }
 }
 const graphProps={book,people:featured,relationships,selected:visibleSelected,onSelect};
 return <div className="figure-view">
  <div className="setting-inline"><div><strong>Spätere Abschnitte ausblenden</strong><span>Wissen aus dem aktuellen Abschnitt</span></div><Switch checked={!spoilers} onCheckedChange={v=>setSpoilers(!v)} aria-label="Spoiler verbergen"/></div>
  <div className="constellation-heading"><div><h3>Figurenkonstellation</h3></div><button type="button" className="icon-button" aria-label="Figurenkonstellation vergrößern" onClick={()=>setExpanded(true)}><Maximize2 size={17}/></button></div>
  {featured.length>0&&<Constellation {...graphProps}/>}
  <p className="art-caption">KI-Illustrationen · künstlerische Darstellung</p>
  <label className="search-field compact"><Users size={17}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Figur finden" aria-label="Figuren durchsuchen"/></label>
  <div className="character-chips">{people.map(c=><button key={c.id} className={'character-chip '+(visibleSelected.includes(c.id)?'selected':'')} aria-pressed={visibleSelected.includes(c.id)} onClick={()=>onSelect(c.id)}>{c.name}{visibleSelected.includes(c.id)&&<X size={13}/>}</button>)}</div>
  {people.length===0&&<p className="empty-copy">Keine passende Figur gefunden.</p>}
  <FigureDetail book={book} picked={picked} relationship={relationship}/>
  <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="reader-dialog constellation-dialog"><DialogHeader><DialogTitle>Figurenkonstellation</DialogTitle><DialogDescription>{book.title} · Eine oder zwei Figuren auswählen.</DialogDescription></DialogHeader>
   <Constellation {...graphProps} large/>
   <p className="art-caption">KI-Illustrationen · künstlerische Darstellung. Linien zeigen hinterlegte Beziehungen.</p>
   <FigureDetail book={book} picked={picked} relationship={relationship}/>
  </DialogContent></Dialog>
 </div>;
}

