import {z} from 'zod';
import {portableAnchorSchema,portableNoteSchema} from './local-model';
import {pencilAnnotationSchema,pageInkGroupSchema} from './pencil-model';
import type {WorkMeta} from './reader-model';

// Read the public draft key only. Recovery journals belong to the Pencil editor;
// discovering a draft must not migrate, repair or acknowledge any stored data.
const entrySchema=z.object({id:z.string(),anchor:portableAnchorSchema,pencil:pencilAnnotationSchema,body:z.string().max(12000),createdAt:z.string().optional(),prefix:z.string().optional(),recognizedInk:z.string().optional(),order:z.number().optional(),baseline:portableNoteSchema.optional()});
const entriesSchema=z.array(entrySchema).max(100);
const draftSchema=z.union([
 z.object({version:z.literal(2),entries:entriesSchema,groups:z.array(pageInkGroupSchema).max(100),recoveredStrokes:z.array(z.string().max(100)).max(5000).default([])}),
 entriesSchema.transform(entries=>({version:2 as const,entries,groups:[]})),
]);
export type PencilDraftLocation={key:string;workId:string;workTitle:string;sectionId:string;sectionLabel:string};
export function readPencilDraftLocations(storage:Pick<Storage,'length'|'key'|'getItem'>,catalog:WorkMeta[]):PencilDraftLocation[]{
 const found:PencilDraftLocation[]=[];
 for(let index=0;index<storage.length;index++){
  const key=storage.key(index);if(!key?.startsWith('buchtutor-pencil-draft:'))continue;
  const work=catalog.find(item=>key.startsWith(`buchtutor-pencil-draft:${item.id}:${item.editionId}:`));if(!work)continue;
  const sectionId=key.slice(`buchtutor-pencil-draft:${work.id}:${work.editionId}:`.length);
  if(!sectionId||sectionId.length>200||sectionId.includes(':'))continue;
  try{
   const raw=storage.getItem(key);if(!raw)continue;
   const parsed=draftSchema.safeParse(JSON.parse(raw));if(!parsed.success)continue;
   const {entries,groups}=parsed.data;if(!entries.length&&!groups.length)continue;
   if(entries.some(entry=>entry.anchor.sectionId!==sectionId))continue;
   const ordinal=/^s(\d+)$/.exec(sectionId);
   found.push({key,workId:work.id,workTitle:work.title,sectionId,sectionLabel:ordinal?`Abschnitt ${Number(ordinal[1])}`:'Textabschnitt'});
  }catch{/* Unknown or unreadable data stays untouched for the editor to handle. */}
 }
 return found.sort((a,b)=>a.workTitle.localeCompare(b.workTitle,'de')||a.sectionId.localeCompare(b.sectionId,'de'));
}
