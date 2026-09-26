import type {Anchor,SavedNote} from './reader-model';

export function matchesBookmark(note:SavedNote,workId:string,editionId:string,anchor:Anchor){
  return note.kind==='bookmark'&&note.workId===workId&&note.editionId===editionId
    &&note.anchor.sectionId===anchor.sectionId&&note.anchor.startId===anchor.startId
    &&note.anchor.endId===anchor.endId&&note.anchor.startOffset===anchor.startOffset
    &&note.anchor.endOffset===anchor.endOffset;
}
