import type {NotebookFilters} from '@/components/reader-notes';

export const NOTEBOOK_SESSION_KEY='buchtutor-notebook-session-v1';
export type NotebookSession={version:1;filters:NotebookFilters;selected:string[];selecting:boolean;scroll:number};

/** Optional, per-tab navigation state. It contains no note bodies or originals. */
export function readNotebookSession(storage:Pick<Storage,'getItem'>):NotebookSession|null{
 try{
  const raw=storage.getItem(NOTEBOOK_SESSION_KEY);if(!raw||raw.length>2100000)return null;
  const value=JSON.parse(raw),f=value?.filters;
  if(value?.version!==1||!f||typeof f.query!=='string'||f.query.length>2000||!['work','kind','color','meaning'].every(key=>typeof f[key]==='string'&&f[key].length<=200)||f.expanded!==undefined&&typeof f.expanded!=='boolean'||!Array.isArray(value.selected)||value.selected.length>10000||!value.selected.every((id:unknown)=>typeof id==='string'&&id.length>0&&id.length<=200)||typeof value.selecting!=='boolean'||!Number.isFinite(value.scroll)||value.scroll<0||value.scroll>10000000)return null;
  return {version:1,filters:{query:f.query,work:f.work,kind:f.kind,color:f.color,meaning:f.meaning,...(f.expanded===undefined?{}:{expanded:f.expanded})},selected:[...new Set<string>(value.selected)],selecting:value.selecting,scroll:value.scroll};
 }catch{return null;}
}
export function writeNotebookSession(storage:Pick<Storage,'setItem'>,value:NotebookSession){
 try{storage.setItem(NOTEBOOK_SESSION_KEY,JSON.stringify(value));}catch{/* Optional view state must never block note storage or navigation. */}
}
