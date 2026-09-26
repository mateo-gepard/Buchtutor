import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='http://localhost:5173';
let checks=0;
async function call(path,options={},expected=200){const response=await fetch(base+path,options);assert.equal(response.status,expected,path+': '+await response.clone().text());checks++;return response.headers.get("content-type")?.includes("application/json")?response.json():response.text();}
await call('/api/books/constructor',{},404);await call('/api/books/not-a-book',{},404);
await call('/api/notes',{},401);await call('/api/progress',{},401);
await call('/api/notes',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'forged@example.test'}},401);
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});const cookie=login.headers.get('set-cookie').split(';')[0];
const headers={Cookie:cookie,'Content-Type':'application/json',Origin:base};
const prepared=JSON.parse(readFileSync(new URL('../corpus/prepared-analyses.json',import.meta.url),'utf8'));
const a=prepared.find(p=>p.workId==='iphigenie'&&p.mode==='summary');
const input={workId:a.workId,editionId:a.editionId,anchor:a.anchor,mode:a.mode};
const {analysis}=await call('/api/analysis',{method:'POST',headers,body:JSON.stringify(input)});assert.equal(analysis.id,a.id);
await call('/api/analysis',{method:'POST',headers,body:JSON.stringify({...input,anchor:{...a.anchor,quote:a.anchor.quote+'x'}})},400);
await call('/api/analysis',{method:'POST',headers,body:JSON.stringify({...input,mode:'question',question:'Was bedeutet Hain?'})},503);
await call('/api/notes',{method:'POST',headers:{...headers,Origin:'https://foreign.example'},body:'{}'},403);
const id=crypto.randomUUID(),note={id,workId:a.workId,editionId:a.editionId,anchor:a.anchor,kind:'note',body:'Automatischer Persistenztest'};
await call('/api/notes',{method:'POST',headers,body:JSON.stringify(note)});
let saved=await call('/api/notes',{headers});assert(saved.notes.some(n=>n.id===id&&n.body===note.body));
await call('/api/notes',{method:'POST',headers,body:JSON.stringify({...note,body:'Bearbeitung geprüft'})});
saved=await call('/api/notes',{headers});assert.equal(saved.notes.find(n=>n.id===id).body,'Bearbeitung geprüft');
await call('/api/notes',{method:'DELETE',headers,body:JSON.stringify({id})});
saved=await call('/api/notes',{headers});assert(!saved.notes.some(n=>n.id===id));
await call('/api/notes',{method:'DELETE',headers,body:JSON.stringify({id,restore:true})});
saved=await call('/api/notes',{headers});assert(saved.notes.some(n=>n.id===id));
await call('/api/notes',{method:'DELETE',headers,body:JSON.stringify({id})});
await call('/api/notes',{method:'POST',headers,body:JSON.stringify({...note,id:crypto.randomUUID(),editionId:'wrong-edition'})},409);
await call('/api/progress',{method:'POST',headers,body:JSON.stringify({workId:a.workId,editionId:a.editionId,sectionId:a.anchor.sectionId,blockId:a.anchor.startId})});
const p=await call('/api/progress',{headers});assert(p.progress.some(p=>p.workId===a.workId&&p.blockId===a.anchor.startId));
for(const workId of ['iphigenie','krug','faust','woyzeck','nathan','emilia','kabale','maria','verwandlung']){const {book}=await call('/api/books/'+workId);assert.equal(book.id,workId);assert(book.sections.length>0)}
console.log(JSON.stringify({passed:true,httpChecks:checks,flows:['anonymous isolation','forged auth headers rejected','source-anchor validation','prepared analysis','honest no-key response','CSRF rejection','note create/read/edit/delete/restore','edition mismatch','reading progress','all nine books']}));

