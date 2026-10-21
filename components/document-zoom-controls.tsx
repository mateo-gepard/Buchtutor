'use client';
import {useEffect,useRef,useState} from 'react';
import {Minus,Plus,X} from 'lucide-react';

type Props={scale:number;minimum:number;maximum:number;onChange:(value:number)=>void;dismissKey:string;onOpen:()=>void};
export function DocumentZoomControls({scale,minimum,maximum,onChange,dismissKey,onOpen}:Props){
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const frame=requestAnimationFrame(()=>setOpen(false));return()=>cancelAnimationFrame(frame);},[dismissKey]);
 useEffect(()=>{
  if(!open)return;
  function outside(event:globalThis.PointerEvent){if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);}
  function keyboard(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);root.current?.querySelector('button')?.focus({preventScroll:true});}}
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keyboard,true);
  return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keyboard,true);};
 },[open]);
 return <div ref={root} className="document-zoom-controls">
  <button className="workspace-tool document-zoom-trigger" aria-label="Dokumentzoom" aria-expanded={open} title="Dokument vergrößern · Text und Handschrift bleiben zusammen" onClick={()=>{if(!open)onOpen();setOpen(!open);}}><strong>{Math.round(scale*100)}<small>%</small></strong><span>Zoom</span></button>
  {open&&<div className="workspace-popover document-zoom-popover" role="group" aria-label="Dokumentzoom einstellen" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);}}}>
   <div className="pencil-sheet-heading"><strong>Dokumentzoom</strong><button className="icon-button" aria-label="Dokumentzoom schließen" onClick={()=>setOpen(false)}><X size={17}/></button></div>
   <div className="document-zoom-buttons"><button className="icon-button" aria-label="Dokument verkleinern" disabled={scale<=minimum} onClick={()=>onChange(Math.round((scale-.25)*100)/100)}><Minus size={19}/></button><output aria-live="polite">{Math.round(scale*100)} %</output><button className="icon-button" aria-label="Dokument vergrößern" disabled={scale>=maximum} onClick={()=>onChange(Math.round((scale+.25)*100)/100)}><Plus size={19}/></button></div>
   <button className="secondary-button document-zoom-reset" disabled={scale===1} onClick={()=>onChange(1)}>Auf 100 % zurücksetzen</button>
   <p>Mit zwei Fingern vergrößern und verschieben. Text und Handschrift behalten ihre Anordnung.</p>
  </div>}
 </div>;
}
