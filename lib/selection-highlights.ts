import {sameAnchor} from './dom-selection';
import {validateAnchor,type Anchor,type Book,type SavedNote} from './reader-model';
import {pencilPalette,type PencilColor} from './pencil-model';

/** Run against the current transaction snapshot; repeated taps reuse an entry. */
export function selectionHighlights(book:Book,anchors:Anchor[],stored:SavedNote[],color:PencilColor,meaning=pencilPalette[color].meaning){
 const notes=[...stored],selected:SavedNote[]=[];
 for(const value of anchors){
  const anchor=validateAnchor(book,value);
  const matches=notes.filter(note=>!note.deletedAt&&note.workId===book.id&&note.editionId===book.editionId&&note.kind==='note'&&!note.analysis&&sameAnchor(note.anchor,anchor));
  const existing=matches.find(note=>note.pencil?.color===color)??matches.find(note=>!note.pencil);
  if(existing?.pencil&&!existing.pencil.erasedRanges?.length){selected.push(existing);continue;}
  const now=new Date(Math.max(Date.now(),existing?Date.parse(existing.updatedAt)+1:0)).toISOString();
  const note:SavedNote=existing?{...existing,pencil:existing.pencil?{...existing.pencil,erasedRanges:[]}:{color,meaning,ink:[],transcription:'none'},updatedAt:now}:{id:crypto.randomUUID(),workId:book.id,editionId:book.editionId,anchor,kind:'note',body:'',pencil:{color,meaning,ink:[],transcription:'none'},createdAt:now,updatedAt:now};
  const index=notes.findIndex(item=>item.id===note.id);if(index<0)notes.push(note);else notes[index]=note;selected.push(note);
 }
 return {notes,selected};
}
