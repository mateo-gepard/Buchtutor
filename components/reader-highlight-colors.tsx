'use client';
import {Check} from 'lucide-react';
import {pencilColors,pencilPalette,type PencilColor} from '@/lib/pencil-model';

export type HighlightColorsProps={color:PencilColor;meanings?:Partial<Record<PencilColor,string>>;onColorChange:(color:PencilColor)=>void;disabled?:boolean};

/** The same color vocabulary is used for selection, saved marks and Pencil. */
export function ReaderHighlightColors({color,meanings,onColorChange,disabled=false}:HighlightColorsProps){
 return <div className="highlight-colors">
  <div role="group" aria-label="Markierungsfarbe">{pencilColors.map(value=><button key={value} type="button" disabled={disabled} aria-label={`${pencilPalette[value].name}: ${meanings?.[value]||pencilPalette[value].meaning}`} aria-pressed={color===value} onClick={()=>onColorChange(value)}><i style={{background:pencilPalette[value].fill,color:pencilPalette[value].ink}}>{color===value&&<Check size={17}/>}</i></button>)}</div>
  <p><strong>{pencilPalette[color].name}</strong> · {meanings?.[color]||pencilPalette[color].meaning}</p>
 </div>;
}
