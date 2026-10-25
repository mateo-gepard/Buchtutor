'use client';
import {useId,useRef,useState,type ReactNode} from 'react';
import {Check,ChevronDown,Highlighter,Plus,X} from 'lucide-react';
import type {Anchor,Section} from '@/lib/reader-model';
import {referenceLabel} from '@/lib/reader-model';
import {useReaderPopover} from '@/hooks/use-reader-popover';
import {ReaderPassageSelection} from './reader-passage-selection';
import {pencilPalette} from '@/lib/pencil-model';
import {ReaderHighlightColors,type HighlightColorsProps} from './reader-highlight-colors';

type Props={
 passages:Anchor[];active:Anchor;section:Section;adding:boolean;choosing:boolean;
 onActivate:(anchor:Anchor)=>void;onRemove:(anchor:Anchor)=>void;onClear:()=>void;
 onAdd:()=>void;onMark:()=>void;marking?:boolean;marked?:boolean;bookmark:ReactNode;
}&HighlightColorsProps;

/** Keep the collection out of the reading lane until the reader asks to change it. */
export function ReaderMultiSelection({passages,active,section,adding,choosing,onActivate,onRemove,onClear,onAdd,onMark,marking=false,marked=false,bookmark,...colors}:Props){
 const [open,setOpen]=useState(false),id=useId(),trigger=useRef<HTMLButtonElement>(null);
 useReaderPopover(open,()=>setOpen(false),'.multi-selection-trigger,.multi-selection-options','.multi-selection-trigger');
 function close(){setOpen(false);trigger.current?.focus({preventScroll:true});}
 function remove(anchor:Anchor){
  onRemove(anchor);
  // Removing the penultimate passage restores the ordinary selection controls.
  if(passages.length===2)requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.selection-actions-trigger')?.focus({preventScroll:true}));
 }
 const reference=referenceLabel(section,active);
 return <div className="selection-workflow multi-selection-workflow">
  <div className="selection-dock multi-selection-dock" role="group" aria-label="Aktionen zur Textauswahl">
   <button ref={trigger} className="multi-selection-trigger" aria-expanded={open} aria-controls={open?id:undefined} aria-label={`${passages.length} Stellen ausgewählt – Textstelle wechseln`} onClick={()=>setOpen(!open)} title={`Aktive Stelle: ${reference}`}>
    <span><strong>{passages.length}<span className="multi-selection-count-label"> Stellen</span></strong><small>{adding?'Weitere Stelle wählen':reference}</small></span><ChevronDown size={15}/>
   </button>
   <button className="multi-selection-mark selection-mark" aria-label="Ausgewählte Stellen markieren" data-marked={marked} title={`Alle Stellen · ${pencilPalette[colors.color].name}`} disabled={marking} onClick={onMark}><i style={{background:pencilPalette[colors.color].fill,color:pencilPalette[colors.color].ink}}>{marked?<Check size={18}/>:<Highlighter size={18}/>}</i><span>{marking?'Speichern':marked?'Markiert':'Markieren'}</span></button>
   <button className="icon-button" aria-label="Weitere Stelle auswählen" title="Weitere Stelle auswählen" onClick={()=>{setOpen(false);onAdd();}}><Plus size={18}/></button>
   <button className="icon-button" aria-label="Auswahl aufheben" title="Auswahl aufheben" onClick={onClear}><X size={18}/></button>
  </div>
  {choosing&&<span className="sr-only" role="status">{adding?'Weitere Stelle: Anfang und Ende wählen':'Endvers antippen oder am Rand ziehen'}</span>}
  {open&&<div id={id} className="workspace-popover multi-selection-options" role="group" aria-label="Ausgewählte Stellen verwalten">
   <div className="multi-selection-heading"><strong>Textstellen</strong><button className="icon-button" aria-label="Textstellen schließen" onClick={close}><X size={18}/></button></div>
   <ReaderHighlightColors {...colors} disabled={marking}/>
   <ReaderPassageSelection passages={passages} active={active} section={section} onActivate={anchor=>{onActivate(anchor);close();}} onRemove={remove} onClear={onClear}/>
   <div className="multi-selection-bookmark"><span>Lesezeichen · {reference}</span>{bookmark}</div>
  </div>}
 </div>;
}
