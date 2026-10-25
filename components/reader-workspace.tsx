'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Check,Eye,EyeOff,Highlighter,PenLine,GripVertical,Move,SlidersHorizontal,X} from 'lucide-react';
import type {Prefs} from '@/lib/preferences';
import {usePencilPlacement} from '@/hooks/use-pencil-placement';
import {useReaderPopover} from '@/hooks/use-reader-popover';
import type {Dock} from '@/lib/pencil-placement';

type Props={
 children:ReactNode;selection:ReactNode;panel:ReactNode;zoom:ReactNode;practice:boolean;
 inline:boolean;detailHost:HTMLDivElement|null;
 audioHost:(element:HTMLDivElement|null)=>void;
 onBeforeChange:()=>void;
 onDismiss:()=>void;
 contextKey:string;
 visibility:Prefs['annotationVisibility'];
 onVisibilityChange:(value:Prefs['annotationVisibility'])=>void;
};
/** One persistent surface. Opening an accessory never remounts the audio player. */
export function ReaderWorkspace({children,selection,panel,zoom,practice,inline,detailHost,audioHost,onBeforeChange,onDismiss,visibility,onVisibilityChange,contextKey}:Props){
 const [viewOpen,setViewOpen]=useState(false);
 useReaderPopover(viewOpen,()=>setViewOpen(false),'.workspace-view,.workspace-view-options','.workspace-view');
 useEffect(()=>{const frame=requestAnimationFrame(()=>setViewOpen(false));return()=>cancelAnimationFrame(frame);},[contextKey]);
 const layerOptions=[['all','Alles anzeigen','Alles',Eye],['marks','Nur Markierungen','Markierungen',Highlighter],['notes','Nur Notizen','Notizen',PenLine],['none','Alles ausblenden','Aus',EyeOff]] as const;
 const {element:workspaceRef,preview,dragging,dock,compact,grip,announcement,dockAt:placeAt}=usePencilPlacement(true,()=>{setViewOpen(false);onDismiss();},practice,'top','Werkzeugleiste');
 function dockAt(dock:Dock){placeAt(dock);}
 const details=<div className={'workspace-details'+(inline?' workspace-inline-details':'')}>{panel}<div ref={audioHost} className="workspace-audio-slot"/></div>;
 return <>
  {preview!=='floating'&&<div className={'pencil-dock-preview dock-'+preview} aria-hidden="true"/>}
  <section ref={workspaceRef} className={'reader-workspace '+(dragging?'is-dragging':'')} data-dock={dock} data-compact={compact} aria-label="Lesewerkzeuge" onClickCapture={e=>{if((e.target as Element).closest('button'))window.dispatchEvent(new Event('buchtutor-document-transform'));if((e.target as Element).closest('button')&&!(e.target as Element).closest('.document-zoom-controls'))onBeforeChange();if(!(e.target as Element).closest('.workspace-view,.workspace-view-options'))setViewOpen(false);}}>
   <div className="workspace-main" role="group" aria-label="Werkzeug auswählen">
    <button className="workspace-grip" aria-label="Werkzeugleiste verschieben" title="Ziehen zum Verschieben · Umschalt + Pfeiltaste zum Andocken" {...grip}><GripVertical size={16}/></button>
    {children}
    <button className="workspace-tool workspace-view" aria-label="Ansicht einstellen" aria-expanded={viewOpen} title="Dokumentzoom, Markierungen und Werkzeugleiste einstellen" onClick={()=>{if(!viewOpen)onDismiss();setViewOpen(!viewOpen);}}><SlidersHorizontal size={18}/><span>Ansicht</span>{visibility!=='all'&&<i/>}</button>
   </div>
   {selection}
   {inline?(detailHost&&createPortal(details,detailHost)):details}
   {viewOpen&&<div className="workspace-popover workspace-view-options" role="group" aria-label="Ansicht einstellen">
    <div className="pencil-sheet-heading"><strong>Ansicht</strong><button className="icon-button" aria-label="Ansicht schließen" onClick={()=>setViewOpen(false)}><X size={17}/></button></div>
    <div className="workspace-view-section"><strong>Dokumentzoom</strong>{zoom}</div>
    <div className="workspace-view-section"><strong>Auf der Seite</strong><div className="workspace-view-layers" role="group" aria-label="Sichtbarkeit auf der Seite">{layerOptions.map(([value,label,shortLabel,Icon])=><button key={value} aria-label={label} aria-pressed={visibility===value} onClick={()=>{onVisibilityChange(value);setViewOpen(false);}}><Icon size={17}/><span>{shortLabel}</span>{visibility===value&&<Check size={15}/>}</button>)}</div></div>
    <div className="workspace-view-section"><strong>Leiste</strong><p>Am Griff verschieben oder am Rand andocken.</p><div className="pencil-dock-options" role="group" aria-label="Werkzeugleiste andocken">{([['top','Oben',ArrowUp],['bottom','Unten',ArrowDown],['left','Links',ArrowLeft],['right','Rechts',ArrowRight],['floating','Frei',Move]] as const).map(([edge,label,Icon])=><button key={edge} aria-pressed={dock===edge} aria-label={`Werkzeugleiste ${label.toLowerCase()} andocken`} onClick={()=>dockAt(edge)}><Icon size={17}/>{label}</button>)}</div></div>
   </div>}
   <span className="sr-only" role="status">{announcement}</span>
  </section>
 </>;
}
