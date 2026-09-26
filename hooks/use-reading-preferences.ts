'use client';
import {useSyncExternalStore} from 'react';
export type Prefs={fontSize:number;lineHeight:number;theme:'paper'|'sepia'|'night';numbers:boolean;characters:boolean;font:'serif'|'sans'};
export const defaultPrefs:Prefs={fontSize:19,lineHeight:1.9,theme:'paper',numbers:true,characters:true,font:'serif'};
const key='leseraum-reading-preferences-v1';
let current=defaultPrefs,loaded=false;
const listeners=new Set<()=>void>();
function read(){if(!loaded){loaded=true;try{const value=JSON.parse(localStorage.getItem(key)??'null');if(value)current={fontSize:Math.min(30,Math.max(16,Number(value.fontSize)||19)),lineHeight:Math.min(2.3,Math.max(1.5,Number(value.lineHeight)||1.9)),theme:['paper','sepia','night'].includes(value.theme)?value.theme:'paper',numbers:value.numbers!==false,characters:value.characters!==false,font:value.font==='sans'?'sans':'serif'};}catch{}}return current;}
function subscribe(listener:()=>void){listeners.add(listener);const changed=(e:StorageEvent)=>{if(e.key===key){loaded=false;listener();}};window.addEventListener('storage',changed);return()=>{listeners.delete(listener);window.removeEventListener('storage',changed)};}
function set(value:Prefs){current=value;loaded=true;try{localStorage.setItem(key,JSON.stringify(value))}catch{}for(const listener of listeners)listener();}
export function useReadingPreferences(){return [useSyncExternalStore(subscribe,read,()=>defaultPrefs),set] as const;}
