import type {SavedNote} from './reader-model';
import type {PencilAnnotation} from './pencil-model';
import {croppedInk,mergePageInk,projectedInk,type InkLayout,type PageInkGroup} from './page-handwriting';
type Entry={id:string;body:string;pencil:PencilAnnotation;createdAt?:string;baseline?:SavedNote};

/** A commit can outlive the following draft cleanup. Stable original stroke IDs
 * are the receipt: replay keeps committed ink, rather than cropping it twice. */
export function recoverCommittedPencilEntry<T extends Entry>(entry:T,draft:PageInkGroup[],saved:SavedNote|undefined,layout:InkLayout):Omit<T,'pencil'|'createdAt'>&{pencil:PencilAnnotation;createdAt?:string}{
 if(!saved?.pencil)return entry;
 const stored=saved.pencil,ids=new Set(stored.pageInk?.flatMap(group=>group.strokes.map(stroke=>stroke.id)));
 if(!draft.some(group=>group.targetId===entry.id&&group.strokes.some(stroke=>ids.has(stroke.id))))return entry;
 const present=new Set(entry.pencil.pageInk?.flatMap(group=>group.strokes.map(stroke=>stroke.id)));
 const removed=new Set(entry.baseline?.pencil?.pageInk?.flatMap(group=>group.strokes.filter(stroke=>!present.has(stroke.id)).map(stroke=>stroke.id)));
 const originals=(stored.pageInk??[]).flatMap(group=>{const strokes=group.strokes.filter(stroke=>!removed.has(stroke.id));return strokes.length?[{...group,strokes}]:[];});
 const pageInk=mergePageInk(originals,entry.pencil.pageInk??[]);
 const ink=removed.size?(pageInk.length?croppedInk(pageInk.flatMap(group=>projectedInk(group,layout))):{ink:[],inkWidth:undefined,inkHeight:undefined}):{ink:stored.ink,inkWidth:stored.inkWidth,inkHeight:stored.inkHeight};
 const manual=stored.transcript&&saved.body.endsWith(stored.transcript)?saved.body.slice(0,-stored.transcript.length).trimEnd():saved.body;
 const retainText=!removed.size&&(entry.body===saved.body||entry.body.trimEnd()===manual);
 return {...entry,createdAt:entry.createdAt??saved.createdAt,body:retainText?saved.body:entry.body,pencil:{...entry.pencil,...ink,pageInk,transcription:retainText?stored.transcription:entry.pencil.transcription,transcript:retainText?stored.transcript:entry.pencil.transcript,transcriptionError:retainText?stored.transcriptionError:entry.pencil.transcriptionError}};
}
