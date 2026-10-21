import {makeAnchor,type Anchor,type SavedNote,type Section} from './reader-model';

/** Group overlapping contexts for display only. Stored entries and ink remain independent. */
export function annotationGroups(section:Section,notes:SavedNote[]){
 const starts=new Map<string,number>();let offset=0;
 for(const block of section.blocks){starts.set(block.id,offset);offset+=block.text.length+1;}
 const entries=notes.flatMap(note=>{
  const start=starts.get(note.anchor.startId),end=starts.get(note.anchor.endId);
  return note.anchor.sectionId===section.id&&start!==undefined&&end!==undefined?[{note,start:start+note.anchor.startOffset,end:end+note.anchor.endOffset}]:[];
 }).sort((a,b)=>a.start-b.start||b.end-a.end||a.note.id.localeCompare(b.note.id));
 const groups:{start:number;end:number;anchor:Anchor;notes:SavedNote[]}[]=[];
 for(const entry of entries){
  const last=groups.at(-1);
  if(last&&entry.start<last.end){
   last.notes.push(entry.note);
   if(entry.end>last.end){last.end=entry.end;last.anchor=makeAnchor(section,last.anchor.startId,entry.note.anchor.endId,last.anchor.startOffset,entry.note.anchor.endOffset);}
  }else groups.push({start:entry.start,end:entry.end,anchor:entry.note.anchor,notes:[entry.note]});
 }
 for(const group of groups)group.notes.sort(compareAnnotations);
 return groups;
}
/** A later saved analysis must never repaint a hand-made annotation. */
export function compareAnnotations(a:SavedNote,b:SavedNote){
 const rank=(note:SavedNote)=>note.pencil?0:note.kind==='note'?1:note.kind==='bookmark'?3:2;
 return rank(a)-rank(b)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id);
}
