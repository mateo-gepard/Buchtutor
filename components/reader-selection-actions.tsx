'use client';
import {useId,useState,type ReactNode} from 'react';
import {Check,Highlighter,MoreHorizontal,Plus,X} from 'lucide-react';
import {useReaderPopover} from '@/hooks/use-reader-popover';
import {pencilPalette} from '@/lib/pencil-model';
import {ReaderHighlightColors,type HighlightColorsProps} from './reader-highlight-colors';

/** Single selections use the existing study group, without a second toolbar. */
export function ReaderSelectionActions({reference,choosing,marking=false,marked=false,onMark,onAdd,onClear,bookmark,...colors}:{reference:string;choosing:boolean;marking?:boolean;marked?:boolean;onMark:()=>void;onAdd:()=>void;onClear:()=>void;bookmark:ReactNode}&HighlightColorsProps){
 const [open,setOpen]=useState(false),id=useId();
 useReaderPopover(open,()=>setOpen(false),'.selection-actions-trigger,.selection-options','.selection-actions-trigger');
 return <>
  <button className="workspace-tool selection-mark" aria-label="Ausgewählte Stellen markieren" data-marked={marked} title={`${marked?'Bereits markiert':'Markieren'} · ${pencilPalette[colors.color].name}`} disabled={marking} onClick={onMark}><i style={{background:pencilPalette[colors.color].fill,color:pencilPalette[colors.color].ink}}>{marked?<Check size={18}/>:<Highlighter size={18}/>}</i><span>{marking?'Speichern':marked?'Markiert':'Markieren'}</span></button>
  <button className="workspace-tool selection-actions-trigger" aria-label="Auswahloptionen" aria-expanded={open} aria-controls={open?id:undefined} title={`Auswahl: ${reference}`} onClick={()=>setOpen(!open)}><MoreHorizontal size={19}/><span>{reference}</span></button>
  {open&&<div id={id} className="workspace-popover selection-options" role="group" aria-label="Textauswahl bearbeiten">
   <strong>{reference}</strong>
   <ReaderHighlightColors {...colors} disabled={marking}/>
   {choosing&&<p>Endvers antippen oder an den Versnummern ziehen.</p>}
   <button onClick={()=>{setOpen(false);onAdd();}}><Plus size={18}/>Weitere Stelle auswählen</button>
   <div className="selection-bookmark"><span>Lesezeichen</span>{bookmark}</div>
   <button onClick={onClear}><X size={18}/>Auswahl aufheben</button>
   <small>Zum Abwählen neben den Text tippen.</small>
  </div>}
 </>;
}
