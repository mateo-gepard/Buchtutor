import assert from 'node:assert/strict';
import {test} from 'node:test';
import {eraseHighlightedWords,erasePageLines,erasePagePrecisely,isEraseScribble,highlightRanges} from '../lib/pencil-eraser';
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
test('erasing after reflow retains surviving original coordinates, pressure and frame exactly',()=>{
 const rotated={width:320,fontSize:24,tops:{a:200},minX:0,maxX:50},before=structuredClone(group);
 const remaining=erasePageLines([group],rotated,[{x:25,y:260}],3);
 assert.equal(remaining.length,1);assert.equal(remaining[0].width,group.width);assert.equal(remaining[0].fontSize,group.fontSize);
 assert.equal(remaining[0].strokes[0],group.strokes[1]);assert.deepEqual(group,before);
 assert.deepEqual(projectedInk(remaining[0],layout)[0],projectedInk(group,layout)[1]);
 assert.deepEqual(projectedInk(remaining[0],rotated)[0],projectedInk(group,rotated)[1]);
 assert.equal(erasePageLines(remaining,rotated,[{x:NaN,y:0}]),remaining);
 assert.equal(erasePageLines(remaining,rotated,[{x:0,y:0}],NaN),remaining);
});
test('foreign anchors and malformed word bounds do not erase a neighboring passage',()=>{
 const anchor=makeAnchor(section,'a');
 assert.deepEqual(highlightRanges(section,{...anchor,sectionId:'other'}),[]);
 assert.deepEqual(highlightRanges(section,{...anchor,startOffset:-1}),[]);
 const forged=[{...boxes[0],start:-1},{...boxes[0],end:1000},{...boxes[0],right:NaN}];
 assert.equal(eraseHighlightedWords(section,anchor,pencil,[{x:10,y:10}],forged),pencil);
 assert.equal(eraseHighlightedWords(section,anchor,pencil,[{x:NaN,y:10}],boxes),pencil);
});
test('erased words survive encrypted transfer with the note body and original handwriting',async()=>{
 const now=new Date().toISOString(),anchor=makeAnchor(section,'a'),changed=eraseHighlightedWords(section,anchor,pencil,[{x:80,y:10}],boxes);
 const snapshot=snapshotSchema.parse({...EMPTY_SNAPSHOT,notes:[{id:'n',workId:'w',editionId:'e',anchor,kind:'note',body:'Notiz bleibt erhalten',pencil:changed,createdAt:now,updatedAt:now}]});
 assert.deepEqual(await decryptSnapshot(await encryptSnapshot(snapshot,'Radieren ohne Notizverlust'),'Radieren ohne Notizverlust'),snapshot);
 assert.equal(snapshotSchema.safeParse({...snapshot,notes:[{...snapshot.notes[0],pencil:{...changed,erasedRanges:[{blockId:'a',start:10,end:2}]}}]}).success,false);
});

test('precise erasing cuts a fast crossing segment at the brush boundary and preserves originals',()=>{
 const a={x:0,y:0,pressure:.4},b={x:100,y:0,pressure:.8};
 const group:PageInkGroup={id:'g',referenceId:'a',width:100,fontSize:20,strokes:[{id:'original',order:1,points:[a,b]}]};
 const layout:InkLayout={width:100,fontSize:20,tops:{a:40}},original=[group];
 const cut=erasePagePrecisely(original,layout,[{x:50,y:20},{x:50,y:60}],5);
 assert.equal(cut.length,1);assert.equal(cut[0].strokes.length,2);assert.equal(cut[0].width,group.width);assert.equal(cut[0].referenceId,'a');
 const [left,right]=cut[0].strokes;assert.equal(left.points[0],a);assert.equal(right.points.at(-1),b);
 assert.equal(left.points.at(-1)!.x,45);assert.ok(Math.abs(right.points[0].x-55)<1e-9);assert.ok(Math.abs(left.points.at(-1)!.pressure-.58)<1e-9);
 assert.notEqual(left.id,right.id);assert.deepEqual(original,[group]);
 assert.equal(erasePagePrecisely(cut,layout,[{x:50,y:20},{x:50,y:60}],5),cut);
 assert.equal(erasePagePrecisely(original,layout,[{x:50,y:80}],5),original);
});
test('precise erasing respects document scale and removes only hit dots',()=>{
 const group:PageInkGroup={id:'g',referenceId:'a',width:100,fontSize:20,strokes:[{id:'line',order:1,points:[{x:0,y:0,pressure:.5},{x:100,y:0,pressure:.5}]},{id:'dot',order:2,points:[{x:50,y:0,pressure:.5}]},{id:'safe',order:3,points:[{x:0,y:10,pressure:.5}]}]};
 const original=[group],layout={width:200,fontSize:30,tops:{a:60}},cut=erasePagePrecisely(original,layout,[{x:100,y:60}],10);
 assert.equal(cut[0].strokes.length,3);assert.equal(cut[0].strokes[0].points.at(-1)!.x,45);assert.ok(Math.abs(cut[0].strokes[1].points[0].x-55)<1e-9);assert.equal(cut[0].strokes[2],group.strokes[2]);
 for(const point of [{x:NaN,y:0},{x:0,y:Infinity}])assert.equal(erasePagePrecisely(original,layout,[point]),original);
 assert.equal(erasePagePrecisely(original,layout,[],5),original);assert.equal(erasePagePrecisely(original,layout,[{x:0,y:60}],-1),original);
});
test('character boxes permit precise highlights without deleting the surrounding word',()=>{
 const anchor=makeAnchor(section,'a'),characters=Array.from('Heraus',(_,start)=>({blockId:'a',start,end:start+1,left:start*10,right:(start+1)*10,top:0,bottom:20}));
 const result=eraseHighlightedWords(section,anchor,pencil,[{x:25,y:10}],characters,1);
 assert.deepEqual(result.erasedRanges,[{blockId:'a',start:2,end:3}]);assert.deepEqual(highlightRanges(section,anchor,result),[{blockId:'a',start:0,end:2},{blockId:'a',start:3,end:23}]);
});
test('scribble recognition requires repeated broad reversals and rejects ordinary handwriting',()=>{
 const scratch=Array.from({length:11},(_,i)=>({x:i%2?50:0,y:i*2}));assert.equal(isEraseScribble(scratch),true);
 for(const stroke of [[{x:0,y:0},{x:60,y:0}],Array.from({length:15},(_,i)=>({x:i*3,y:Math.sin(i)*12})),Array.from({length:12},(_,i)=>({x:i%2?2:0,y:i}))])assert.equal(isEraseScribble(stroke),false);
});
