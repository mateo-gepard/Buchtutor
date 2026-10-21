import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {annotationGroups,compareAnnotations} from '../lib/annotation-groups';
import {makeAnchor,type Book,type SavedNote} from '../lib/reader-model';
const book=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book,section=book.sections[0],lines=section.blocks.filter(b=>b.kind==='verse');
function note(id:string,start:number,end:number,offset=0,last?:number):SavedNote{return {id,workId:book.id,editionId:book.editionId,anchor:makeAnchor(section,lines[start].id,lines[end].id,offset,last),kind:'note',body:id,createdAt:'2026-10-20T00:00:00.000Z',updatedAt:'2026-10-20T00:00:00.000Z'};}
test('overlapping annotations share one context without merging or mutating their stored entries',()=>{
 const a=note('a',0,1),b=note('b',1,2),c=note('c',2,3),separate=note('d',5,5),input=[separate,c,b,a],before=structuredClone(input);
 const groups=annotationGroups(section,input);assert.equal(groups.length,2);assert.equal(groups[0].notes.length,3);
 assert.equal(groups[0].anchor.startId,lines[0].id);assert.equal(groups[0].anchor.endId,lines[3].id);assert.deepEqual(input,before);
 const touching=[note('x',0,0,0,6),note('y',0,0,6,12)];assert.equal(annotationGroups(section,touching).length,2);
});
test('hand-made color keeps priority over newer saved AI explanations and bookmarks',()=>{
 const manual={...note('manual',0,0),pencil:{color:'green' as const,meaning:'Stilmittel',ink:[],transcription:'none' as const}};
 const analysis={...note('ai',0,1),kind:'style' as const,updatedAt:'2026-10-21T00:00:00.000Z'};
 assert.ok(compareAnnotations(manual,analysis)<0);assert.equal(annotationGroups(section,[analysis,manual])[0].notes[0].id,'manual');
});
