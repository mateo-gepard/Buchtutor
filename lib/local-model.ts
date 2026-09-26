import {z} from 'zod';
import {defaultPrefs, preferencesSchema} from './preferences';
import type {ReadingProgress, SavedNote} from './reader-model';

const timestamp=z.string().datetime();
const identifier=z.string().min(1).max(200);
export const portableAnchorSchema=z.object({
  sectionId:identifier,startId:identifier,endId:identifier,
  startOffset:z.number().int().min(0).max(1000000),
  endOffset:z.number().int().min(0).max(1000000),
  quote:z.string().min(1).max(24000),
});
export const portableAnalysisSchema=z.object({
  id:identifier,mode:z.enum(['summary','style','meter','context','conflict','question']),
  title:z.string().max(180),summary:z.string().max(6000),
  observations:z.array(z.object({label:z.string().max(180),text:z.string().max(2000),
    quotes:z.array(z.object({blockId:identifier,quote:z.string().max(1200)})).max(4)})).max(8),
  uncertainty:z.string().max(1500),source:z.enum(['prepared','live','cache']),model:z.string().max(150),
  generatedAt:timestamp,promptVersion:z.string().max(100),anchor:portableAnchorSchema,
  workId:identifier,editionId:identifier,question:z.string().max(1200).optional(),
});
export const portableNoteSchema=z.object({
  id:identifier,workId:identifier,editionId:identifier,anchor:portableAnchorSchema,
  kind:z.enum(['summary','style','meter','context','conflict','question','note','bookmark']),
  body:z.string().max(12000),analysis:portableAnalysisSchema.nullable().optional(),
  createdAt:timestamp,updatedAt:timestamp,deletedAt:timestamp.optional(),conflictOf:identifier.optional(),
});
const progressSchema=z.object({workId:identifier,editionId:identifier,sectionId:identifier,blockId:identifier,updatedAt:timestamp});
export const snapshotSchema=z.object({
  schemaVersion:z.literal(2),
  preferences:z.object({value:preferencesSchema,updatedAt:timestamp}),
  notes:z.array(portableNoteSchema).max(10000),
  progress:z.array(progressSchema).max(1000),
});
export type LocalSnapshot=z.infer<typeof snapshotSchema>;
export const EMPTY_SNAPSHOT:LocalSnapshot={schemaVersion:2,preferences:{value:defaultPrefs,updatedAt:'1970-01-01T00:00:00.000Z'},notes:[],progress:[]};

function noteContent(n:SavedNote) {
  return JSON.stringify([n.workId,n.editionId,n.anchor,n.kind,n.body,n.analysis??null]);
}
export function mergeSnapshots(local:LocalSnapshot,incoming:LocalSnapshot,importPreferences=true):{snapshot:LocalSnapshot;conflicts:number} {
  const notes=new Map(local.notes.map(note=>[note.id,note]));
  let conflicts=0;
  for(const note of incoming.notes){
    const previous=notes.get(note.id);
    if(!previous){notes.set(note.id,note);continue;}
    if(previous.deletedAt||note.deletedAt){
      if(note.updatedAt>previous.updatedAt)notes.set(note.id,note);
      continue;
    }
    if(noteContent(previous)===noteContent(note)){
      if(note.updatedAt>previous.updatedAt)notes.set(note.id,note);
      continue;
    }
    const latest=note.updatedAt>previous.updatedAt?note:previous;
    const other=latest===note?previous:note;
    const alreadyKept=[...notes.values()].some(n=>n.conflictOf===note.id&&noteContent(n)===noteContent(other));
    notes.set(note.id,latest);
    if(!alreadyKept){const id=crypto.randomUUID();notes.set(id,{...other,id,conflictOf:note.id});conflicts++;}
  }
  const progress=new Map<string,ReadingProgress>(local.progress.map(p=>[p.workId+':'+p.editionId,p]));
  for(const p of incoming.progress){const key=p.workId+':'+p.editionId;const prior=progress.get(key);if(!prior||p.updatedAt>prior.updatedAt)progress.set(key,p);}
  return {snapshot:snapshotSchema.parse({
    schemaVersion:2,notes:[...notes.values()],progress:[...progress.values()],
    preferences:importPreferences&&incoming.preferences.updatedAt>local.preferences.updatedAt?incoming.preferences:local.preferences,
  }),conflicts};
}
