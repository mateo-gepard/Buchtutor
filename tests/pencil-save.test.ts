import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recoverCommittedPencilEntry} from '../lib/pencil-save';
import {croppedInk,projectedInk,type PageInkGroup} from '../lib/page-handwriting';
import type {SavedNote} from '../lib/reader-model';
const layout={width:640,fontSize:20,tops:{b:40}};
const group:PageInkGroup={id:'group',referenceId:'b',width:640,fontSize:20,targetId:'note',strokes:[{id:'stroke',order:1,points:[{x:10,y:0,pressure:.5},{x:20,y:20,pressure:.5}]}]};
const pencil={color:'green' as const,meaning:'Stilmittel',...croppedInk(projectedInk(group,layout)),pageInk:[group],transcription:'recognized' as const,transcript:'Natur als Zuflucht'};
const saved:SavedNote={id:'note',workId:'book',editionId:'edition',anchor:{sectionId:'s',startId:'b',endId:'b',startOffset:0,endOffset:4,quote:'Text'},kind:'note',body:'Natur als Zuflucht',pencil,createdAt:'2026-10-21T08:00:00Z',updatedAt:'2026-10-21T08:01:00Z'};
test('commit-before-draft-cleanup reuses durable ink and recognized search text',()=>{
 const draft={id:'note',body:'',pencil:{color:'green' as const,meaning:'Stilmittel',ink:[],transcription:'none' as const}};
 const recovered=recoverCommittedPencilEntry(draft,[group],saved,layout);
 assert.equal(recovered.pencil.ink,pencil.ink);assert.equal(recovered.pencil.transcription,'recognized');assert.equal(recovered.body,saved.body);
 assert.equal(recovered.pencil.pageInk?.flatMap(group=>group.strokes).length,1);
 assert.deepEqual(recoverCommittedPencilEntry(recovered,[group],saved,layout),recovered);
});
test('replay does not replace a deliberate manual correction or unrelated draft',()=>{
 const draft={id:'note',body:'Meine eigene Auslegung',pencil:{...pencil,transcription:'manual' as const,transcript:undefined}};
 assert.equal(recoverCommittedPencilEntry(draft,[group],saved,layout).body,draft.body);
 assert.equal(recoverCommittedPencilEntry(draft,[group],saved,layout).pencil.transcription,'manual');
 assert.equal(recoverCommittedPencilEntry(draft,[],saved,layout),draft);
});
test('replay retains an explicit erasure instead of resurrecting stored strokes or OCR',()=>{
 const removed={...group,id:'old-group',strokes:[{...group.strokes[0],id:'old-stroke'}]};
 const baseline={...saved,pencil:{...pencil,pageInk:[removed]}};
 const entry={id:'note',body:'',baseline,pencil:{...pencil,pageInk:[],ink:[],transcript:undefined,transcription:'none' as const}};
 const result=recoverCommittedPencilEntry(entry,[group],{...saved,pencil:{...pencil,pageInk:[group,removed]}},layout);
 assert.deepEqual(result.pencil.pageInk?.flatMap(group=>group.strokes.map(stroke=>stroke.id)),['stroke']);
 assert.equal(result.body,'');assert.equal(result.pencil.transcript,undefined);
});
