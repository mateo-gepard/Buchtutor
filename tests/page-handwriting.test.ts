import assert from 'node:assert/strict';
import {test} from 'node:test';
import {addPageStroke,linkInk,mergePageInk,nearestInkTarget,projectedInk,uncommittedPageInk,type InkLayout,type InkTarget,type PageInkGroup} from '../lib/page-handwriting';
import {pageInkGroupSchema,type InkStroke} from '../lib/pencil-model';

const layout:InkLayout={width:640,fontSize:20,tops:{a:100,b:400}};
const stroke=(x:number,y:number):InkStroke=>[{x,y,pressure:.2},{x:x+12,y:y+20,pressure:.8}];
const target=(id:string,left:number,top=100,right=left+80,bottom=top+25):InkTarget=>({id,boxes:[{left,right,top,bottom}]});
function group(id:string,x:number,y=0,targetId?:string):PageInkGroup{return {id,referenceId:'a',width:640,fontSize:20,targetId,strokes:[{id:`${id}-stroke`,order:1,points:stroke(x,y)}]};}

test('ambiguous or invalid targets stay unassigned independently of annotation order',()=>{
 const box={left:40,right:60,top:100,bottom:120},a=target('a',0),b=target('b',20);
 assert.equal(nearestInkTarget(box,[a,b],120),undefined);
 assert.equal(nearestInkTarget(box,[b,a],120),undefined);
 assert.equal(nearestInkTarget(box,[a,target('far',200)],120),'a');
 assert.equal(nearestInkTarget(box,[a,{...a,boxes:[...a.boxes]}],120),'a');
 assert.equal(nearestInkTarget(box,[{id:'empty',boxes:[]},{id:'invalid',boxes:[{...box,left:NaN}]}],120),undefined);
 assert.equal(nearestInkTarget(box,[a],NaN),undefined);
 const points=stroke(45,105),unassigned=addPageStroke([],points,layout,[a,b],'a',1);
 assert.equal(unassigned[0].targetId,undefined);assert.equal(linkInk(unassigned,layout,[b,a]),unassigned);
 assert.deepEqual(projectedInk(unassigned[0],layout),[points]);
});

test('an established target survives a missing render or deletion without silently switching to its neighbor',()=>{
 const original=group('ink',-10,5,'original'),points=structuredClone(original.strokes);
 const linked=linkInk([original],layout,[target('neighbor',0)]);
 assert.equal(linked[0],original);assert.equal(linked[0].targetId,'original');assert.deepEqual(linked[0].strokes,points);
});

test('target evidence follows actual strokes rather than empty interiors of their bounding boxes',()=>{
 const original:PageInkGroup={...group('corner',0),strokes:[{id:'corner-stroke',order:1,points:[{x:0,y:0,pressure:.5},{x:400,y:0,pressure:.5},{x:400,y:400,pressure:.5}]}]};
 const emptyInterior=target('interior',190,290,210,310),onStroke=target('on-stroke',20,95,40,105);
 assert.equal(linkInk([original],layout,[emptyInterior])[0].targetId,undefined);
 assert.equal(linkInk([original],layout,[emptyInterior,onStroke])[0].targetId,'on-stroke');
 const added=addPageStroke([original],stroke(80,200),layout,[],'a',2);
 assert.equal(added.length,2);assert.equal(added[0],original);
});

test('nearby writing for a different clear target and equidistant groups remain separate',()=>{
 const original=group('green',105,5,'green'),points=stroke(130,105);
 const added=addPageStroke([original],points,layout,[target('green',0),target('blue',150)],'a',2);
 assert.equal(added.length,2);assert.equal(added[0],original);assert.equal(added[1].targetId,'blue');
 const left=group('left',0),right=group('right',60);
 left.strokes[0].points[1].x=0;right.strokes[0].points[1].x=60;
 const pointsBetween:InkStroke=[{x:30,y:105,pressure:.5},{x:30,y:115,pressure:.7}],middle=addPageStroke([left,right],pointsBetween,layout,[],'a',3);
 assert.equal(middle.length,3);assert.equal(middle[0],left);assert.equal(middle[1],right);
 assert.deepEqual(projectedInk(middle[2],layout),[pointsBetween]);
});

test('viewport bounds never deform original document ink and adding after reflow is reversible',()=>{
 const original=group('ink',-60,5),before=structuredClone(original);
 const narrow={width:320,fontSize:24,tops:{a:200},minX:0,maxX:10};
 const projection=projectedInk(original,narrow);
 assert.deepEqual(projection[0][0],{x:-30,y:206,pressure:.2});
 assert.deepEqual(projection,projectedInk(original,{...narrow,minX:300,maxX:301}));
 const points=stroke(-20,215),added=addPageStroke([original],points,narrow,[],'a',2,'new-stroke');
 assert.equal(added.length,1);assert.equal(added[0].strokes[0],original.strokes[0]);
 assert.deepEqual(projectedInk(added[0],narrow)[1],points);
 assert.deepEqual(original,before);assert.equal(pageInkGroupSchema.safeParse(added[0]).success,true);
});

test('stroke IDs make interrupted recovery idempotent without discarding any original samples',()=>{
 const points=stroke(10,105),first=addPageStroke([],points,layout,[],'a',7,'recovered');
 assert.equal(first[0].strokes[0].id,'recovered');assert.equal(first[0].strokes[0].order,7);
 assert.equal(addPageStroke(first,points,layout,[],'a',7,'recovered'),first);
 const appended=addPageStroke(first,stroke(20,105),layout,[],'a',8,'next');
 assert.equal(appended[0].strokes[1].id,'next');assert.equal(appended[0].strokes[0],first[0].strokes[0]);
 assert.equal(addPageStroke(appended,[],layout,[],'a'),appended);
});

test('a commit-before-draft-clear replay removes only already saved stroke IDs',()=>{
 const first=group('ink',10,5,'note'),second={id:'new',order:2,points:stroke(30,5)},draft={...first,strokes:[...first.strokes,second]};
 const pending=uncommittedPageInk([draft],[first]);
 assert.equal(pending.length,1);assert.deepEqual(pending[0].strokes,[second]);assert.equal(pending[0].strokes[0],second);
 assert.equal(pending[0].referenceId,first.referenceId);assert.equal(pending[0].width,first.width);assert.equal(pending[0].fontSize,first.fontSize);
 const saved=mergePageInk([first],pending);
 assert.equal(saved.length,1);assert.deepEqual(saved[0].strokes,[...first.strokes,second]);assert.equal(saved[0].strokes[0],first.strokes[0]);
 assert.deepEqual(uncommittedPageInk([draft],saved),[]);
 assert.equal(mergePageInk(saved,[draft]),saved);
 const untouched=[draft];assert.equal(uncommittedPageInk(untouched,[]),untouched);
});

test('replayed groups deduplicate stroke IDs across group names and retain new samples in their own frame',()=>{
 const first=group('saved',10,5,'note'),duplicate={...first,id:'checkpoint'},second=group('saved',50,10,'note');
 second.strokes[0]={...second.strokes[0],id:'second-stroke'};second.width=320;second.fontSize=24;
 const original=[first],added=[duplicate,second,second],before=structuredClone(added),saved=mergePageInk(original,added);
 assert.equal(saved.length,2);assert.equal(saved[0],first);assert.notEqual(saved[1].id,first.id);
 assert.equal(saved[1].width,320);assert.equal(saved[1].fontSize,24);assert.equal(saved[1].strokes[0],second.strokes[0]);
 assert.deepEqual(added,before);assert.equal(mergePageInk(saved,added),saved);
 assert.ok(saved.every(item=>pageInkGroupSchema.safeParse(item).success));
 assert.deepEqual(uncommittedPageInk([duplicate],original),[]);
});
