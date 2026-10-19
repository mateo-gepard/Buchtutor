import assert from 'node:assert/strict';
import {test} from 'node:test';
import {segmentHitsBox,strokeAnchor,type WordBox} from '../lib/pencil-model';
import {makeAnchor,type Section,type SavedNote} from '../lib/reader-model';
import {EMPTY_SNAPSHOT,mergeSnapshots,snapshotSchema} from '../lib/local-model';
import {decryptSnapshot,encryptSnapshot} from '../lib/portable';
import {canonicalCitations} from '../lib/analysis-quotes';
import {completion} from '../lib/ai-provider';
const section={id:'s',blocks:[{id:'a',kind:'verse',text:'Heraus in eure Schatten'},{id:'b',kind:'verse',text:'Des alten Haines'}]} as Section;
const boxes:WordBox[]=[{blockId:'a',start:0,end:6,left:0,right:60,top:0,bottom:20},{blockId:'a',start:7,end:9,left:70,right:90,top:0,bottom:20},{blockId:'a',start:10,end:14,left:100,right:140,top:0,bottom:20},{blockId:'b',start:0,end:3,left:0,right:30,top:40,bottom:60}];
test('fast, reverse, slanted and slightly imprecise Pencil sweeps snap to full canonical words',()=>{
 const points=[{x:137,y:23},{x:73,y:16}];
 assert.deepEqual(strokeAnchor(section,points,boxes),makeAnchor(section,'a','a',7,14));
 assert.deepEqual(strokeAnchor(section,[...points].reverse(),boxes),makeAnchor(section,'a','a',7,14));
 assert.equal(segmentHitsBox({x:-100,y:10},{x:200,y:10},boxes[0]),true);
 assert.equal(segmentHitsBox({x:-100,y:30},{x:200,y:30},boxes[0]),false);
 assert.equal(strokeAnchor(section,[{x:400,y:400}],boxes),null);
 assert.deepEqual(strokeAnchor(section,[{x:5,y:10},{x:5,y:55}],boxes),makeAnchor(section,'a','b',0,3));
});
test('Pencil colors, custom meanings and original handwriting survive encrypted transfer and conflict merging',async()=>{
 const now='2026-10-19T18:00:00.000Z';
 const note:SavedNote={id:'pencil',workId:'book',editionId:'edition',anchor:makeAnchor(section,'a'),kind:'note',body:'Natur als Zuflucht',pencil:{color:'green',meaning:'Eigene Stilmittel',ink:[[{x:10,y:20,pressure:0.7},{x:20,y:30,pressure:0.9}]],transcription:'recognized'},createdAt:now,updatedAt:now};
 const snapshot=snapshotSchema.parse({...EMPTY_SNAPSHOT,notes:[note],preferences:{value:{...EMPTY_SNAPSHOT.preferences.value,pencilMeanings:{green:'Eigene Stilmittel'}},updatedAt:now}});
 assert.deepEqual(await decryptSnapshot(await encryptSnapshot(snapshot,'Mein sicheres iPad-Passwort'),'Mein sicheres iPad-Passwort'),snapshot);
 const changed={...snapshot,notes:[{...note,pencil:{...note.pencil!,color:'blue' as const},updatedAt:'2026-10-19T19:00:00.000Z'}]};
 const merged=mergeSnapshots(snapshot,changed);assert.equal(merged.conflicts,1);assert.equal(merged.snapshot.notes.length,2);
 assert.equal(snapshotSchema.parse({...EMPTY_SNAPSHOT,notes:[{...note,pencil:undefined}]}).notes[0].pencil,undefined);
 assert.equal(snapshotSchema.safeParse({...snapshot,notes:[{...note,pencil:{...note.pencil,ink:[[{x:Infinity,y:0,pressure:0.5}]]}}]}).success,false);
});
test('provider surfaces billing/auth/rate/embedded errors and rejects truncated or empty results without storing them',async()=>{
 const originalFetch=globalThis.fetch,originalKey=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='test-no-network';
 try{
  for(const [status,message] of [[402,/Guthaben/],[401,/authentifiziert/],[429,/Limit/]] as const){globalThis.fetch=async()=>Response.json({error:{code:status}},{status});await assert.rejects(completion([],24000),message);}
  globalThis.fetch=async()=>Response.json({error:{code:429}});await assert.rejects(completion([],24000),/Limit/);
  globalThis.fetch=async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{"partial":'}}]});await assert.rejects(completion([],24000),/vollständig/);
  globalThis.fetch=async()=>Response.json({choices:[{message:{content:''}}]});await assert.rejects(completion([],24000),/keine lesbare/);
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=originalKey;}
});

test('quote grounding repairs unique source IDs, typography and multi-verse citations while rejecting invented or ambiguous text',()=>{
 const blocks=[{blockId:'a',text:"Heraus in eure Schatten"},{blockId:'b',text:"Des alten, heil'gen Haines"}];
 assert.deepEqual(canonicalCitations(blocks,{blockId:'b',quote:'Heraus in eure Schatten'}),[{blockId:'a',quote:'Heraus in eure Schatten'}]);
 assert.deepEqual(canonicalCitations(blocks,{blockId:'a',quote:'heil’gen Haines'}),[{blockId:'b',quote:"heil'gen Haines"}]);
 assert.deepEqual(canonicalCitations(blocks,{blockId:'a',quote:'eure Schatten  Des alten,'}),[{blockId:'a',quote:'eure Schatten'},{blockId:'b',quote:'Des alten,'}]);
 assert.throws(()=>canonicalCitations(blocks,{blockId:'a',quote:'Iphigenie ist glücklich'}),/Beleg/);
 assert.throws(()=>canonicalCitations([{blockId:'a',text:'gleich gleich'}],{blockId:'wrong',quote:'gleich'}),/Beleg/);
});
