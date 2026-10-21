'use client';
import {X} from 'lucide-react';
import type {Anchor,Section} from '@/lib/reader-model';
import {referenceLabel} from '@/lib/reader-model';
import {sameAnchor} from '@/lib/dom-selection';
import {SelectionSummary} from './selection-summary';
export function ReaderPassageSelection({passages,active,section,onActivate,onRemove,onClear}:{passages:Anchor[];active:Anchor|null;section:Section;onActivate:(anchor:Anchor)=>void;onRemove:(anchor:Anchor)=>void;onClear:()=>void}){
 if(passages.length<2)return null;
 return <div className="passage-selection"><SelectionSummary count={passages.length} label="Stellen ausgewählt" onClear={onClear}/><p>Notiz und KI-Hilfe beziehen sich auf die aktive Stelle.</p><div className="passage-chips" role="group" aria-label="Ausgewählte Textstellen">{passages.map((anchor,index)=><div key={JSON.stringify(anchor)}><button aria-pressed={sameAnchor(active,anchor)} onClick={()=>onActivate(anchor)} aria-label={`Textstelle ${index+1}: ${referenceLabel(section,anchor)}`}>{referenceLabel(section,anchor)}</button><button aria-label={`Textstelle ${index+1} abwählen`} onClick={()=>onRemove(anchor)}><X size={14}/></button></div>)}</div></div>;
}
