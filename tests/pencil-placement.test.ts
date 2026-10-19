import assert from 'node:assert/strict';
import {test} from 'node:test';
import {palettePosition,placementAt,nearestDock,popoverPosition,validPlacement,type Dock} from '../lib/pencil-placement';
import {addPageStroke,croppedInk,combineInk,linkInk,projectedInk,pageInkGroupSchema,type InkLayout} from '../lib/page-handwriting';
import {pencilAnnotationSchema} from '../lib/pencil-model';
import {EMPTY_SNAPSHOT} from '../lib/local-model';
import {decryptSnapshot,encryptSnapshot} from '../lib/portable';
const viewport={x:12,y:12,width:810,height:1170};
test('palette edges, normalized free placement and popovers stay within changed viewport bounds',()=>{
 assert.equal(validPlacement({dock:'left',x:0,y:.4}),true);assert.equal(validPlacement({dock:'invalid',x:0,y:0}),false);assert.equal(validPlacement({dock:'floating',x:Infinity,y:0}),false);
 for(const dock of ['floating','left','right','top','bottom'] as Dock[]){
  const size=dock==='left'||dock==='right'?{width:58,height:510}:{width:510,height:54};
  const bar=palettePosition({dock,x:.5,y:.7},size,viewport);assert.ok(bar.x>=viewport.x&&bar.y>=viewport.y);assert.ok(bar.x+bar.width<=822&&bar.y+bar.height<=1182);
  const popup=popoverPosition(bar,{width:420,height:360},viewport,dock);assert.ok(popup.x>=12&&popup.y>=12&&popup.x+420<=822&&popup.y+360<=1182);
  const rotated=palettePosition({dock,x:.5,y:.7},size,{x:12,y:12,width:1170,height:810});assert.ok(rotated.x>=12&&rotated.y>=12&&rotated.x+rotated.width<=1182&&rotated.y+rotated.height<=822);
 }
 const free=placementAt({x:400,y:100,width:500,height:54},viewport);assert.ok(free.x<=1);assert.equal(nearestDock({x:12,y:200,width:58,height:500},viewport),'left');assert.equal(nearestDock({x:300,y:300,width:100,height:50},viewport),'floating');
});
const layout:InkLayout={width:640,fontSize:20,tops:{a:100,b:400}},targets=[{id:'green',boxes:[{left:0,right:90,top:100,bottom:125}]},{id:'blue',boxes:[{left:0,right:90,top:400,bottom:425}]}];
const stroke=(x:number,y:number)=>[{x,y,pressure:.6},{x:x+12,y:y+20,pressure:.8}];
test('connected handwriting extends one note past the distance threshold without changing its original mark',()=>{
 let groups=addPageStroke([],stroke(-30,105),layout,targets,'a',1);assert.equal(groups[0].targetId,'green');
 for(let x=-10;x<300;x+=20)groups=addPageStroke(groups,stroke(x,105),layout,targets,'a',x+50);
 assert.equal(groups.length,1);assert.equal(groups[0].targetId,'green');assert.ok(groups[0].strokes.length>10);
 const longGroup={...groups[0],strokes:Array.from({length:1200},(_,i)=>({...groups[0].strokes[0],id:String(i)}))};assert.equal(pageInkGroupSchema.parse(longGroup).strokes.length,1200);
 groups=addPageStroke(groups,stroke(-30,405),layout,targets,'b',500);assert.equal(groups.length,2);assert.equal(groups[1].targetId,'blue');
 const resized=projectedInk(groups[0],{width:320,fontSize:24,tops:{a:200,b:500}});assert.equal(resized[0][0].x,-15);assert.equal(resized[0][0].y,206);
 const narrow=projectedInk(groups[0],{width:200,fontSize:20,tops:{a:100},minX:-10,maxX:180});assert.ok(narrow.flat().every(p=>p.x>=-10&&p.x<=180));
});
test('unassigned ink survives until a nearby mark exists; distant text is never silently attached',()=>{
 let groups=addPageStroke([],stroke(-30,105),layout,[],'a');assert.equal(groups[0].targetId,undefined);
 groups=linkInk(groups,layout,[targets[1]]);assert.equal(groups[0].targetId,undefined);groups=linkInk(groups,layout,targets);assert.equal(groups[0].targetId,'green');
});
test('cropped multi-line ink and appended original ink retain aspect ratio and fit the existing portable storage',async()=>{
 const added=croppedInk([stroke(-100,200),stroke(150,460)]);assert.ok(added.inkWidth<=1800&&added.inkHeight<=1000);assert.ok(added.ink.every(s=>s.every(p=>p.x>=0&&p.y>=0)));
 const original={ink:[stroke(20,10)],inkWidth:1000,inkHeight:320},combined=combineInk(original,added);
 const pencil=pencilAnnotationSchema.parse({color:'green',meaning:'Stilmittel',...combined,transcription:'recognized'});
 assert.equal(pencil.ink.length,3);assert.ok(pencil.inkHeight!<=1000);assert.equal(pencil.ink[0][0].x,original.ink[0][0].x);
 const now=new Date().toISOString(),snapshot={...EMPTY_SNAPSHOT,notes:[{id:'ink',workId:'work',editionId:'edition',anchor:{sectionId:'s',startId:'a',endId:'a',startOffset:0,endOffset:4,quote:'Text'},kind:'note' as const,body:'Erkannte Notiz',pencil,createdAt:now,updatedAt:now}]};
 assert.deepEqual(await decryptSnapshot(await encryptSnapshot(snapshot,'Handschrift am Seitenrand 2026'),'Handschrift am Seitenrand 2026'),snapshot);
});
