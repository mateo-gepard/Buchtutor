'use client';
import {useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,GripVertical,Move,Settings2,X} from 'lucide-react';
import {usePencilPlacement} from '@/hooks/use-pencil-placement';
import type {Dock} from '@/lib/pencil-placement';

type Props={
 children:ReactNode;selection:ReactNode;panel:ReactNode;practice:boolean;
 inline:boolean;detailHost:HTMLDivElement|null;
 audioHost:(element:HTMLDivElement|null)=>void;
 onBeforeChange:()=>void;
 onDismiss:()=>void;
};
/** One persistent surface. Opening an accessory never remounts the audio player. */
export function ReaderWorkspace({children,selection,panel,practice,inline,detailHost,audioHost,onBeforeChange,onDismiss}:Props){
 const [settings,setSettings]=useState(false);
 const {element:workspaceRef,preview,dragging,dock,compact,grip,announcement,dockAt:placeAt}=usePencilPlacement(true,()=>{setSettings(false);onDismiss();},practice,'top','Werkzeugleiste');
 function dockAt(dock:Dock){placeAt(dock);}
 const details=<div className={'workspace-details'+(inline?' workspace-inline-details':'')}>{panel}<div ref={audioHost} className="workspace-audio-slot"/></div>;
 return <>
  {preview!=='floating'&&<div className={'pencil-dock-preview dock-'+preview} aria-hidden="true"/>}
  <section ref={workspaceRef} className={'reader-workspace '+(dragging?'is-dragging':'')} data-dock={dock} data-compact={compact} aria-label="Lesewerkzeuge" onClickCapture={e=>{if((e.target as Element).closest('button'))onBeforeChange();if(!(e.target as Element).closest('.workspace-settings,.workspace-placement'))setSettings(false);}} onKeyDown={e=>{if(e.key==='Escape'&&settings){e.stopPropagation();setSettings(false);}}}>
   <div className="workspace-main" role="group" aria-label="Werkzeug auswählen">
    <button className="workspace-grip" aria-label="Werkzeugleiste verschieben" title="Ziehen zum Verschieben · Umschalt + Pfeiltaste zum Andocken" {...grip}><GripVertical size={16}/></button>
    {children}
    <button className="workspace-settings icon-button" aria-label="Werkzeugleiste anordnen" aria-expanded={settings} onClick={()=>{onDismiss();setSettings(!settings);}} title="Leiste anordnen"><Settings2 size={18}/></button>
   </div>
   {selection}
   {inline?(detailHost&&createPortal(details,detailHost)):details}
   {settings&&<div className="workspace-popover workspace-placement" aria-label="Werkzeugleiste anordnen">
    <div className="pencil-sheet-heading"><strong>Dein Platz zum Lesen</strong><button className="icon-button" aria-label="Anordnung schließen" onClick={()=>setSettings(false)}><X size={17}/></button></div>
    <p>Ziehe die Leiste am Griff dorthin, wo sie dich nicht stört.</p>
    <div className="pencil-dock-options" role="group" aria-label="Werkzeugleiste andocken">{([['top','Oben',ArrowUp],['bottom','Unten',ArrowDown],['left','Links',ArrowLeft],['right','Rechts',ArrowRight],['floating','Frei',Move]] as const).map(([edge,label,Icon])=><button key={edge} aria-pressed={dock===edge} aria-label={`Werkzeugleiste ${label.toLowerCase()} andocken`} onClick={()=>dockAt(edge)}><Icon size={17}/>{label}</button>)}</div>
   </div>}
   <span className="sr-only" role="status">{announcement}</span>
  </section>
 </>;
}
