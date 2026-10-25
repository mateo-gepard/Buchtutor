'use client';
import {useId,useState,type ReactNode} from 'react';
import {Highlighter,MoreHorizontal,Plus,X} from 'lucide-react';
import {useReaderPopover} from '@/hooks/use-reader-popover';

/** Single selections use the existing study group, without a second toolbar. */
export function ReaderSelectionActions({reference,choosing,marking=false,onMark,onAdd,onClear,bookmark}:{reference:string;choosing:boolean;marking?:boolean;onMark:()=>void;onAdd:()=>void;onClear:()=>void;bookmark:ReactNode}){
 const [open,setOpen]=useState(false),id=useId();
 useReaderPopover(open,()=>setOpen(false),'.selection-actions-trigger,.selection-options','.selection-actions-trigger');
 return <>
  <button className="workspace-tool" aria-label="Ausgewählte Stellen markieren" title="Ausgewählten Text markieren" disabled={marking} onClick={onMark}><Highlighter size={19}/><span>Markieren</span></button>
  <button className="workspace-tool selection-actions-trigger" aria-label="Auswahloptionen" aria-expanded={open} aria-controls={open?id:undefined} title={`Auswahl: ${reference}`} onClick={()=>setOpen(!open)}><MoreHorizontal size={19}/><span>{reference}</span></button>
  {open&&<div id={id} className="workspace-popover selection-options" role="group" aria-label="Textauswahl bearbeiten">
   <strong>{reference}</strong>
   {choosing&&<p>Endvers antippen oder an den Versnummern ziehen.</p>}
   <button onClick={()=>{setOpen(false);onAdd();}}><Plus size={18}/>Weitere Stelle auswählen</button>
   <div className="selection-bookmark"><span>Lesezeichen</span>{bookmark}</div>
   <button onClick={onClear}><X size={18}/>Auswahl aufheben</button>
   <small>Zum Abwählen neben den Text tippen.</small>
  </div>}
 </>;
}
