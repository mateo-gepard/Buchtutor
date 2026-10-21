'use client';
import {useEffect,useRef,useState} from 'react';
import {Eraser,X} from 'lucide-react';
import type {Prefs} from '@/lib/preferences';
type EraserPrefs=Pick<Prefs,'eraserMode'|'eraserSize'|'scribbleToErase'>;
export function PencilEraserOptions({prefs,onChange,onClose}:{prefs:EraserPrefs;onChange:(value:Partial<EraserPrefs>)=>Promise<void>;onClose:()=>void}){
 const [size,setSize]=useState(prefs.eraserSize),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const frame=requestAnimationFrame(()=>setSize(prefs.eraserSize));return()=>cancelAnimationFrame(frame);},[prefs.eraserSize]);
 const committing=useRef(false);
 async function change(patch:Partial<EraserPrefs>){if(committing.current)return;committing.current=true;setSaving(true);setError('');try{await onChange(patch);}catch(error){setError(error instanceof Error?error.message:'Die Einstellung konnte nicht gespeichert werden.');}finally{committing.current=false;setSaving(false);}}
 const commitSize=()=>{if(size!==prefs.eraserSize)void change({eraserSize:size});};
 return <div className="pencil-popover pencil-eraser-options" role="group" aria-label="Radierer-Einstellungen" aria-busy={saving} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}}}>
  <div className="pencil-sheet-heading"><strong><Eraser size={16}/>Radierer</strong><button className="icon-button" aria-label="Radierer-Einstellungen schließen" onClick={onClose}><X size={17}/></button></div>
  <div className="eraser-modes" role="group" aria-label="Radierart">{[['stroke','Strichradierer','Entfernt ganze Striche und markierte Wörter.'],['precise','Präziser Radierer','Radiert nur die berührte Stelle.']].map(([value,label,description])=><button key={value} aria-pressed={prefs.eraserMode===value} disabled={saving} onClick={()=>void change({eraserMode:value as EraserPrefs['eraserMode']})}><strong>{label}</strong><span>{description}</span></button>)}</div>
  <label className="eraser-size">Größe <output>{size}</output><input type="range" min={4} max={36} step={2} value={size} aria-label="Radierergröße" disabled={saving} onChange={event=>setSize(Number(event.target.value))} onPointerUp={commitSize} onKeyUp={commitSize} onBlur={commitSize}/><span className="eraser-size-preview" aria-hidden="true"><i style={{width:size,height:size}}/></span></label>
  <label className="eraser-scribble"><input type="checkbox" checked={prefs.scribbleToErase} disabled={saving} onChange={event=>void change({scribbleToErase:event.target.checked})}/><span><strong>Kritzeln zum Radieren</strong><small>Mehrmals hin und her kritzeln. Funktioniert lokal und lässt sich rückgängig machen.</small></span></label>
  <p className="eraser-shortcuts"><kbd>E</kbd>: Radierer ↔ vorheriges Werkzeug.</p><p className="eraser-platform-note">Doppeltippen am Pencil-Schaft: nur in nativen Apps.</p>
  {error&&<p className="inline-error" role="alert">{error}</p>}
 </div>;
}
