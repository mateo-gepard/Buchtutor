'use client';
import type {ReactNode} from 'react';
export function SelectionSummary({count,onClear,children,label='ausgewählt'}:{count:number;onClear:()=>void;children?:ReactNode;label?:string}){
 return <div className="selection-summary"><span role="status"><strong>{count}</strong> {label}</span><button className="text-button" disabled={!count} onClick={onClear}>Alle abwählen</button>{children}</div>;
}
