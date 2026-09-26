import assert from 'node:assert/strict';
import {prepared} from '../lib/analysis';
import {catalog,getBook} from '../lib/corpus';
import {firstReadable,makeAnchor} from '../lib/reader-model';
const origin=process.argv[2]||'http://localhost:3001';
const selected=prepared[0];
const payload={workId:selected.workId,editionId:selected.editionId,anchor:selected.anchor,mode:selected.mode};
const post=(data:unknown,extra={})=>fetch(origin+'/api/analysis',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...extra},body:JSON.stringify(data)});
let response=await post(payload);assert.equal(response.status,200);assert.equal((await response.json()).analysis.source,'prepared');
response=await post({...payload,mode:'question',question:'Generier mir ein Python-Skript für Snake.'});assert.equal(response.status,422);
response=await post({...payload,anchor:{...payload.anchor,quote:'falscher Text'}});assert.equal(response.status,400);
response=await post({...payload,editionId:'other-edition'});assert.equal(response.status,409);
response=await post(payload,{Origin:'https://other.example'});assert.equal(response.status,403);
const prose=(await getBook('verwandlung'))!,section=firstReadable(prose);
response=await post({workId:prose.id,editionId:prose.editionId,anchor:makeAnchor(section,section.blocks.find(b=>b.kind==='prose')!.id),mode:'meter'});assert.equal(response.status,400);
for(const path of ['/api/notes','/api/progress']){
 assert.equal((await fetch(origin+path)).status,410);
 assert.equal((await fetch(origin+path,{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}})).status,410);
}
for(const work of catalog){assert.equal((await fetch(origin+'/api/books/'+work.id)).status,200,work.id);}
const status=await (await fetch(origin+'/api/analysis')).json();assert.equal(status.provider,'GPT-6 Luna');assert.equal(status.reasoning,'max');
if(!status.live){
 const work=(await getBook('iphigenie'))!,scene=firstReadable(work),first=scene.blocks.find(b=>b.kind==='verse')!;
 response=await post({workId:work.id,editionId:work.editionId,anchor:makeAnchor(scene,first.id),mode:'summary'});
 assert.equal(response.status,503);assert.match((await response.json()).error,/OpenRouter/);
}
console.log('PASS: API prepared analysis, canonical anchors, edition boundaries, off-topic guard, origin/prose checks, 9 book routes, private-data endpoints disabled. Live AI: '+status.live);
