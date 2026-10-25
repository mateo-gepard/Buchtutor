import {portableAnchorSchema} from './local-model';
import {noteText,type Anchor,type SavedNote,type WorkMeta} from './reader-model';

export type NoteDraftLocation={
 key:string;workId:string;workTitle:string;editionId:string;anchor:Anchor;
 noteId?:string;body:string;sectionLabel:string;originalDeleted:boolean;
};

/** Index the hook's current drafts, including text retained only in memory after
 * a storage failure. Reading this index never repairs or acknowledges a draft. */
export function parseNoteDraftLocations(drafts:Record<string,string>,catalog:WorkMeta[],notes:SavedNote[]):NoteDraftLocation[]{
 const locations:NoteDraftLocation[]=[],works=[...catalog].sort((a,b)=>b.editionId.length-a.editionId.length);
 const sameAnchor=(a:Anchor,b:Anchor)=>a.sectionId===b.sectionId&&a.startId===b.startId&&a.endId===b.endId&&a.startOffset===b.startOffset&&a.endOffset===b.endOffset&&a.quote===b.quote;
 for(const [key,body] of Object.entries(drafts)){
  if(typeof body!=='string'||body.length>12000)continue;
  const work=works.find(item=>key.startsWith(item.editionId+':'));if(!work)continue;
  const split=key.lastIndexOf(':'),prefix=work.editionId+':';
  if(split<prefix.length)continue;
  const suffix=key.slice(split+1);if(!suffix||suffix.length>200)continue;
  try{
   const parsed=portableAnchorSchema.safeParse(JSON.parse(key.slice(prefix.length,split)));if(!parsed.success)continue;
   const anchor=parsed.data,noteId=suffix==='new'?undefined:suffix;
   const original=noteId?notes.find(note=>note.id===noteId&&note.workId===work.id&&note.editionId===work.editionId):undefined;
   // A blank new note and an already saved identical edit need no recovery.
   // Edits of deleted/missing notes remain available, including a blank edit.
   if(!noteId&&!body.trim())continue;
   if(original&&!original.deletedAt&&noteText(original)===body&&sameAnchor(original.anchor,anchor))continue;
   const ordinal=/^s(\d+)$/.exec(anchor.sectionId);
   locations.push({key,workId:work.id,workTitle:work.title,editionId:work.editionId,anchor,...(noteId?{noteId}:{}),body,sectionLabel:ordinal?`Abschnitt ${Number(ordinal[1])}`:'Textabschnitt',originalDeleted:!!original?.deletedAt});
  }catch{/* Unknown keys and unreadable anchors stay untouched. */}
 }
 return locations.sort((a,b)=>a.workTitle.localeCompare(b.workTitle,'de')||a.anchor.sectionId.localeCompare(b.anchor.sectionId,'de')||a.key.localeCompare(b.key));
}
