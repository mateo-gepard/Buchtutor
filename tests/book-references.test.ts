import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBookReferenceIndex,matchesReferenceIndex,notebookReferenceLabel,referenceSectionLabel} from '../lib/book-references';
import {loadBookReferenceIndex} from '../lib/book-reference-client';
import {makeAnchor,type Book} from '../lib/reader-model';

const faust=JSON.parse(readFileSync('corpus/books/faust.json','utf8')) as Book;
const prose=JSON.parse(readFileSync('corpus/books/verwandlung.json','utf8')) as Book;
const section=faust.sections[1],first=section.blocks.find(block=>block.kind==='verse')!,anchor=makeAnchor(section,first.id);

test('all nine current corpus editions produce valid public reference indexes',()=>{
  const catalog=JSON.parse(readFileSync('corpus/catalog.json','utf8')) as Book[];
  for(const work of catalog){const book=JSON.parse(readFileSync(`corpus/books/${work.id}.json`,'utf8')) as Book;assert.equal(matchesReferenceIndex(buildBookReferenceIndex(book),work),true,work.id);}
});

test('the public index contains readable IDs and canonical references, without source text or private fields',()=>{
  const index=buildBookReferenceIndex(faust),serialized=JSON.stringify(index);
  assert.equal(matchesReferenceIndex(index,faust),true);
  assert.equal(serialized.includes(first.text),false);
  assert.equal(serialized.includes('quote'),false);
  assert.equal(serialized.includes('offset'),false);
  assert.deepEqual(index.sections.find(item=>item.id===section.id)!.blocks[0],[first.id,33,null,'verse']);
  assert.equal(index.sections.flatMap(item=>item.blocks).length,faust.sections.flatMap(item=>item.blocks).filter(block=>block.kind==='verse'||block.kind==='prose').length);
});

test('citation numbers come from canonical fields rather than the digits in a block ID',()=>{
  const index=buildBookReferenceIndex(faust);
  assert.equal(first.id,'b00035');
  assert.equal(notebookReferenceLabel(faust,index,faust.editionId,anchor),'Vorspiel auf dem Theater · V. 33');
  index.sections.find(item=>item.id===section.id)!.blocks[0][2]=35;
  assert.equal(notebookReferenceLabel(faust,index,faust.editionId,anchor),'Vorspiel auf dem Theater · V. 33–35');
  index.sections.find(item=>item.id===section.id)!.blocks[0][1]=null;
  assert.equal(notebookReferenceLabel(faust,index,faust.editionId,anchor),'Vorspiel auf dem Theater');
});

test('paragraph ranges, section-only Pencil labels and repeated path titles remain literal',()=>{
  const index=buildBookReferenceIndex(prose),first=prose.sections[0],rows=first.blocks.filter(block=>block.kind==='prose');
  assert.equal(notebookReferenceLabel(prose,index,prose.editionId,makeAnchor(first,rows[0].id,rows[1].id)),'I. Kapitel · Abs. 1–2');
  assert.equal(notebookReferenceLabel(prose,index,prose.editionId,{sectionId:first.id}),'I. Kapitel');
  assert.equal(referenceSectionLabel({path:['Erster Akt',' Erster Akt '],title:'Erste Szene'}),'Erster Akt · Erste Szene');
});

test('missing metadata stays quiet and incompatible editions never receive current citation numbers',()=>{
  const index=buildBookReferenceIndex(faust);
  assert.equal(notebookReferenceLabel(faust,undefined,faust.editionId,anchor),'Textstelle');
  assert.equal(notebookReferenceLabel(faust,index,'old-edition',anchor),'Andere Ausgabe · Originalzitat');
  assert.equal(notebookReferenceLabel(faust,{...index,revision:'old'},faust.editionId,anchor),'Textstelle');
  assert.equal(notebookReferenceLabel(faust,index,faust.editionId,{...anchor,startId:'b99999'}),'Vorspiel auf dem Theater');
  assert.equal(matchesReferenceIndex({...index,editionId:'old-edition'},faust),false);
  const broken=structuredClone(index);broken.sections[0].blocks[0][1]=-1;
  assert.equal(matchesReferenceIndex(broken,faust),false);
});

test('simultaneous client loads share one public request and a validated in-memory cache',async()=>{
  const original=globalThis.fetch,work={...faust,revision:'reference-cache-check'},index={...buildBookReferenceIndex(faust),revision:work.revision},calls:{input:string;init?:RequestInit}[]=[];
  globalThis.fetch=async(input,init)=>{calls.push({input:String(input),init});return Response.json(index);};
  try{
    const [one,two]=await Promise.all([loadBookReferenceIndex(work),loadBookReferenceIndex(work)]);
    assert.equal(one,two);assert.equal(await loadBookReferenceIndex(work),one);assert.equal(calls.length,1);
    const url=new URL(calls[0].input,'https://public.example');
    assert.equal(url.pathname,'/api/books/faust/references');
    assert.deepEqual([...url.searchParams],[['revision',work.revision]]);
    assert.equal(calls[0].init?.body,undefined);
    assert.equal(calls[0].init?.method,undefined);
  }finally{globalThis.fetch=original;}
});

test('an incompatible response is rejected and may be retried rather than poisoning the cache',async()=>{
  const original=globalThis.fetch,work={...faust,revision:'reference-retry-check'},index={...buildBookReferenceIndex(faust),revision:work.revision};let calls=0;
  globalThis.fetch=async()=>Response.json(++calls===1?{...index,editionId:'other-edition'}:index);
  try{assert.equal(await loadBookReferenceIndex(work),null);assert.ok(await loadBookReferenceIndex(work));assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
