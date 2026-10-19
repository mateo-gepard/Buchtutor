import assert from 'node:assert/strict';
import {test} from 'node:test';
import {eraseHighlightedWords,erasePageLines,highlightRanges} from '../lib/pencil-eraser';
import {makeAnchor,type Section} from '../lib/reader-model';
import type {PencilAnnotation,WordBox} from '../lib/pencil-model';
import {projectedInk,type InkLayout,type PageInkGroup} from '../lib/page-handwriting';
import {EMPTY_SNAPSHOT,snapshotSchema} from '../lib/local-model';
import {encryptSnapshot,decryptSnapshot} from '../lib/portable';
const section={id:'s',blocks:[{id:'a',kind:'verse',text:'Heraus in eure Schatten'},{id:'b',kind:'verse',text:'Des alten Haines'}]} as Section;
const pencil:PencilAnnotation={color:'green',meaning:'Stilmittel',ink:[],transcription:'none'};
const boxes:WordBox[]=[{blockId:'a',start:0,end:6,left:0,right:60,top:0,bottom:20},{blockId:'a',start:7,end:9,left:70,right:90,top:0,bottom:20},{blockId:'a',start:10,end:14,left:100,right:140,top:0,bottom:20},{blockId:'b',start:0,end:3,left:0,right:30,top:40,bottom:60}];
test('erasing a middle word splits only its highlight while preserving canonical context and other colors',()=>{
 const anchor=makeAnchor(section,'a'),cut=eraseHighlightedWords(section,anchor,pencil,[{x:80,y:10}],boxes);
 assert.deepEqual(highlightRanges(section,anchor,cut),[{blockId:'a',start:0,end:6},{blockId:'a',start:10,end:23}]);
 assert.equal(anchor.quote,'Heraus in eure Schatten');assert.equal(pencil.erasedRanges,undefined);assert.equal(cut.color,'green');
 assert.equal(eraseHighlightedWords(section,anchor,cut,[{x:80,y:10}],boxes),cut);
 assert.equal(eraseHighlightedWords(section,makeAnchor(section,'b'),pencil,[{x:80,y:10}],boxes),pencil);
 const all=eraseHighlightedWords(section,anchor,cut,[{x:-20,y:10},{x:150,y:10}],boxes.map(b=>b.blockId==='a'&&b.start===10?{...b,end:23,right:220}:b));
 assert.deepEqual(highlightRanges(section,anchor,all),[]);
});
test('fast eraser sweeps test segments and never erase untraversed words between two verses',()=>{
 const anchor=makeAnchor(section,'a','b'),cut=eraseHighlightedWords(section,anchor,pencil,[{x:10,y:-20},{x:10,y:80}],boxes);
 assert.deepEqual(cut.erasedRanges,[{blockId:'a',start:0,end:6},{blockId:'b',start:0,end:3}]);
 assert.equal(highlightRanges(section,anchor,cut)[0].start,7);
});
const layout:InkLayout={width:640,fontSize:20,tops:{a:100}};
const group:PageInkGroup={id:'g',referenceId:'a',width:640,fontSize:20,targetId:'note',strokes:[{id:'diagonal',order:1,points:[{x:0,y:0,pressure:.5},{x:100,y:100,pressure:.5}]},{id:'other',order:2,points:[{x:200,y:0,pressure:.5},{x:200,y:100,pressure:.5}]}]};
test('line erasing detects crossings between sparse pointer samples without deleting empty bounding-box interiors',()=>{
 const groups=[group];assert.equal(erasePageLines(groups,layout,[{x:0,y:200}],5),groups);
 const remaining=erasePageLines(groups,layout,[{x:0,y:200},{x:100,y:100}],5);
 assert.equal(remaining[0].strokes.length,1);assert.equal(remaining[0].strokes[0].id,'other');assert.equal(remaining[0].targetId,'note');assert.equal(group.strokes.length,2);
 assert.deepEqual(erasePageLines(remaining,layout,[{x:200,y:80},{x:200,y:220}]),[]);
 const rotated={...layout,width:320,fontSize:24,tops:{a:200}};const projected=projectedInk(group,rotated);
 const changed=erasePageLines(groups,rotated,[{x:25,y:260}]);assert.deepEqual(projectedInk(changed[0],rotated)[0],projected[1]);
});
test('erased words survive encrypted transfer with the note body and original handwriting',async()=>{
 const now=new Date().toISOString(),anchor=makeAnchor(section,'a'),changed=eraseHighlightedWords(section,anchor,pencil,[{x:80,y:10}],boxes);
 const snapshot=snapshotSchema.parse({...EMPTY_SNAPSHOT,notes:[{id:'n',workId:'w',editionId:'e',anchor,kind:'note',body:'Notiz bleibt erhalten',pencil:changed,createdAt:now,updatedAt:now}]});
 assert.deepEqual(await decryptSnapshot(await encryptSnapshot(snapshot,'Radieren ohne Notizverlust'),'Radieren ohne Notizverlust'),snapshot);
 assert.equal(snapshotSchema.safeParse({...snapshot,notes:[{...snapshot.notes[0],pencil:{...changed,erasedRanges:[{blockId:'a',start:10,end:2}]}}]}).success,false);
});
