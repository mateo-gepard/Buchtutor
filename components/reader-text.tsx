'use client';
import {Fragment,useLayoutEffect,useMemo,type ReactNode} from 'react';
import {Check,LoaderCircle,MessageSquare,TriangleAlert} from 'lucide-react';
import type {Anchor,Block,Book,Character,SavedNote,Section} from '@/lib/reader-model';
import {MODE_COLORS,MODE_LABELS,unitLabel} from '@/lib/reader-model';
import {pencilPalette} from '@/lib/pencil-model';
import {highlightRanges} from '@/lib/pencil-eraser';
import {aliasesAt} from '@/lib/mentions';
import {annotationGroups,compareAnnotations} from '@/lib/annotation-groups';
import {useVerseSelection} from '@/hooks/use-verse-selection';
import type {AudioPosition} from '@/lib/audiobook';
type Props={book:Book;section:Section;selection:Anchor|null;notes:SavedNote[];showNumbers:boolean;showCharacters:boolean;showHighlights?:boolean;showNotes?:boolean;selectMode:boolean;rangeOrigin:string|null;onCancelRange:()=>void;onRange:(start:string,end:string,complete:boolean)=>void;canActivate:(event:MouseEvent)=>boolean;onSelect:(id:string,extend?:boolean)=>void;onCharacter:(id:string)=>void;onNote:(note:SavedNote)=>void;onNotes?:(notes:SavedNote[])=>void;afterBlock?:Record<string,ReactNode>;listening?:AudioPosition|null};
function segments(text:string,characters:Character[],onCharacter:(id:string)=>void,key:string,canActivate:Props['canActivate'],selectMode:boolean){
 const aliases=characters.flatMap(c=>c.aliases.filter(a=>a.length>2).map(alias=>({alias,id:c.id}))).sort((a,b)=>b.alias.length-a.alias.length);
 if(!aliases.length)return text;
 const escaped=aliases.map(a=>a.alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 const re=new RegExp(`(?<![\\p{L}])(${[...new Set(escaped)].join('|')})(?![\\p{L}])`,'gu');
 const result:React.ReactNode[]=[];let start=0;
 for(const match of text.matchAll(re)){
  const at=match.index!,person=aliases.find(a=>a.alias===match[0]);
  if(at>start)result.push(text.slice(start,at));
  // Inline text remains ordinary selectable text on WebKit, with keyboard button semantics.
  result.push(<span role="button" tabIndex={selectMode?-1:0} className="character-mention" key={`${key}-${at}`} onClick={e=>{if(selectMode||!canActivate(e.nativeEvent))return;e.stopPropagation();onCharacter(person!.id)}} onKeyDown={e=>{if(!selectMode&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();onCharacter(person!.id);}}} title={`${person?.alias}: Figur ansehen`}>{match[0]}</span>);start=at+match[0].length;
 }
 if(start<text.length)result.push(text.slice(start));return result;
}
export function ReaderText({book,section,selection,notes,showNumbers,showCharacters,showHighlights=true,showNotes=true,selectMode,rangeOrigin,onRange,onCancelRange,canActivate,onSelect,onCharacter,onNote,onNotes,afterBlock,listening}:Props){
 const indices=useMemo(()=>new Map(section.blocks.map((b,i)=>[b.id,i])),[section]);
 const available=useMemo(()=>book.characters.filter(c=>(c.afterSection??0)<=book.sections.findIndex(s=>s.id===section.id)),[book,section.id]);
 const a=selection?indices.get(selection.startId)??-1:-1,b=selection?indices.get(selection.endId)??-1:-1;
 const relevant=useMemo(()=>notes.filter(n=>n.workId===book.id&&n.editionId===book.editionId&&n.anchor.sectionId===section.id),[notes,book.id,book.editionId,section.id]);
 const groups=useMemo(()=>annotationGroups(section,relevant),[section,relevant]);
 const numberDown=useVerseSelection({origin:rangeOrigin,onRange,onCancel:onCancelRange});
 const visibleMarks=useMemo(()=>relevant.flatMap(n=>highlightRanges(section,n.anchor,n.pencil).map(range=>({...range,n}))),[relevant,section]);
 useLayoutEffect(()=>{
  if(!('highlights' in CSS)||typeof Highlight==='undefined')return;
  CSS.highlights.delete('reader-audio');if(!listening||listening.sectionId!==section.id||listening.emphasis==='off'||listening.emphasis==='line')return;
  const el=document.getElementById(listening.blockId)?.querySelector('[data-text]');if(!el)return;
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),range=document.createRange();let node:Node|null,total=0,started=false;
  while((node=walker.nextNode())){const length=node.textContent?.length??0;if(!started&&listening.startOffset<total+length){range.setStart(node,Math.max(0,listening.startOffset-total));started=true;}if(started&&listening.endOffset<=total+length){range.setEnd(node,Math.max(0,listening.endOffset-total));CSS.highlights.set('reader-audio',new Highlight(range));break;}total+=length;}
  return()=>{CSS.highlights.delete('reader-audio');};
 },[listening,section,notes,showCharacters]);
 useLayoutEffect(()=>{
  if(!('highlights' in CSS)||typeof Highlight==='undefined')return;
  CSS.highlights.delete('reader-selection');if(!selection)return;
  const ranges:Range[]=[];
  for(const block of section.blocks.slice(a,b+1).filter(x=>x.kind==='verse'||x.kind==='prose')){
   const el=document.getElementById(block.id)?.querySelector('[data-text]');if(!el)continue;
   const start=block.id===selection.startId?selection.startOffset:0,end=block.id===selection.endId?selection.endOffset:block.text.length;
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node:Node|null,total=0;const range=document.createRange();let started=false;
   while((node=walker.nextNode())){const length=node.textContent?.length??0;if(!started&&start<=total+length){range.setStart(node,Math.max(0,start-total));started=true;}if(started&&end<=total+length){range.setEnd(node,Math.max(0,end-total));ranges.push(range);break;}total+=length;}
  }
  CSS.highlights.set('reader-selection',new Highlight(...ranges));return()=>{CSS.highlights.delete('reader-selection')};
 },[selection,section,a,b,notes]);
 function lineContent(block:Block,index:number){
  const attached=groups.filter(group=>group.anchor.startId===block.id).flatMap(group=>group.notes);
  const marks=showHighlights?visibleMarks.filter(m=>m.blockId===block.id):[];
  const pending=attached.some(n=>n.pencil?.transcription==='pending'),failed=attached.some(n=>n.pencil?.transcription==='failed'||n.pencil?.uncertain),recognized=attached.some(n=>n.pencil?.transcription==='recognized');
  const status=pending?' · Handschrift wird erkannt':failed?' · Schrifterkennung prüfen':recognized?' · Suchtext gespeichert':'';
  const isSelected=index>=a&&index<=b;
  const cuts=[...new Set([0,block.text.length,...marks.flatMap(m=>[m.start,m.end])])].sort((x,y)=>x-y);
  const content=cuts.slice(0,-1).map((start,i)=>{
   const end=cuts[i+1],active=marks.filter(m=>start>=m.start&&end<=m.end).sort((a,b)=>compareAnnotations(a.n,b.n));
   const children=showCharacters?segments(block.text.slice(start,end),aliasesAt(available,book.id,block.id),onCharacter,`${block.id}-${start}`,canActivate,selectMode):block.text.slice(start,end);
   return <span key={start} className={active.length?'saved-highlight':''} style={active.length?{background:active[0].n.pencil?pencilPalette[active[0].n.pencil.color].fill:MODE_COLORS[active[0].n.kind]}:undefined} onClick={active.length?e=>{if(!selectMode&&canActivate(e.nativeEvent)){e.stopPropagation();if(onNotes)onNotes([...new Map(active.flatMap(m=>groups.find(group=>group.notes.some(n=>n.id===m.n.id))?.notes??[m.n]).map(n=>[n.id,n])).values()]);else onNote(active[0].n);}}:undefined}>{children}</span>;
  });
  return <Fragment key={block.id}><div id={block.id} data-block={block.id} data-audio-emphasis={listening?.emphasis??'phrase'} aria-current={listening?.blockId===block.id&&listening.sectionId===section.id?'location':undefined} className={`source-row text-line ${block.kind==='prose'?'prose-row':''} ${isSelected?'row-selected':''} ${listening?.blockId===block.id&&listening.sectionId===section.id?'audio-current':''} ${isSelected&&selection?.startId===block.id?'selection-start':''} ${isSelected&&selection?.endId===block.id?'selection-end':''} ${selectMode?'selection-mode':''} ${block.part==='F'||block.part==='M'?'verse-continuation':''}`}>
   <button data-pencil-input className={`line-number line-select ${showNumbers?'':'numbers-hidden'}`} aria-label={`${unitLabel(block.unit)} ${block.number}${block.part==='F'||block.part==='M'?', Fortsetzung':''} auswählen`} aria-pressed={isSelected} onPointerDown={event=>{if(event.shiftKey){event.preventDefault();onSelect(block.id,true);}else numberDown(event,block.id);}} onClick={event=>{if(event.detail===0)onSelect(block.id,event.shiftKey);}} title="Vers auswählen: Nummer antippen und dann das Ende antippen, oder an den Nummern entlangziehen.">{showNumbers?block.numberEnd?`${block.number}–${block.numberEnd}`:block.number:'·'}</button>
   <span data-text className="text-content" onClick={selectMode?e=>{if(canActivate(e.nativeEvent))onSelect(block.id,e.shiftKey)}:undefined}>{content}</span>
   {attached.length>0&&(showHighlights||showNotes)&&<button className="annotation-marker" aria-label={`${attached.length} ${attached.some(n=>!n.createdAt)?'Markierungsentwürfe':'gespeicherte Einträge'}: ${[...new Set(attached.map(n=>MODE_LABELS[n.kind]))].join(', ')}${status}`} title={status.slice(3)||'Notiz öffnen'} onClick={()=>onNotes?onNotes(attached):onNote(attached[0])}>{pending?<LoaderCircle size={13} className="spin"/>:failed?<TriangleAlert size={13}/>:recognized?<Check size={13}/>:<MessageSquare size={13}/>}<span>{attached.length}</span></button>}
  </div>{afterBlock?.[block.id]}</Fragment>;
 }
 return <div className="source-text">{section.blocks.map((block,index)=>{
  if(block.kind==='verse'||block.kind==='prose')return lineContent(block,index);
  if(block.kind==='speaker')return <div className="speaker" key={block.id}>{block.speaker&&book.characters.some(c=>c.id===block.speaker)?<button onClick={e=>{if(canActivate(e.nativeEvent))onCharacter(block.speaker!);}}>{block.text}</button>:block.text}</div>;
  if(block.kind==='heading')return <h3 className="inline-heading" key={block.id}>{block.text}</h3>;
  return <p key={block.id} className="stage-direction">{showCharacters?segments(block.text,aliasesAt(available,book.id,block.id),onCharacter,block.id,canActivate,selectMode):block.text}</p>;
 })}</div>;
}
