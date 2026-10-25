import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {Book,WorkMeta} from '../lib/reader-model';
import {makeAnchor,validateAnchor} from '../lib/reader-model';

const catalog=JSON.parse(readFileSync('corpus/catalog.json','utf8')) as WorkMeta[];
const additions=[
 {id:'lenz',paragraphs:33,start:'Den 20. ging Lenz durchs Gebirg.',end:'So lebte er hin. …',excluded:'Anmerkung zu „Lenz“'},
 {id:'sandmann',paragraphs:41,start:'Gewiß seid ihr alle voll Unruhe',end:'niemals hätte gewähren können.',excluded:'Ignaz Denner'},
 {id:'kleider',paragraphs:173,start:'An einem unfreundlichen Novembertage',end:'sei es aus Undank oder aus Rache.',excluded:'Der Schmied seines Glückes'},
];

test('new prose sources are complete bounded works with stable canonical references',()=>{
 for(const spec of additions){
  const book=JSON.parse(readFileSync(`corpus/books/${spec.id}.json`,'utf8')) as Book&{sourceFile:string};
  const readable=book.sections.flatMap(section=>section.blocks.filter(block=>block.kind==='prose'||block.kind==='verse'));
  assert.equal(readable.length,spec.paragraphs);
  assert.ok(readable[0].text.startsWith(spec.start));
  assert.ok(readable.at(-1)!.text.endsWith(spec.end));
  assert.ok(!readable.some(block=>block.text.includes(spec.excluded)));
  assert.ok(!readable.some(block=>/[ſ\u0364¬]/u.test(block.text)), 'print glyphs must not break ordinary text search');
  assert.equal(createHash('sha256').update(readFileSync(`corpus/sources/${book.sourceFile}`)).digest('hex'),book.revision);
  assert.equal(catalog.find(work=>work.id===spec.id)?.editionId,book.editionId);
  assert.deepEqual(readable.map(block=>block.number),Array.from({length:spec.paragraphs},(_,index)=>index+1));
  for(const section of book.sections){
   const blocks=section.blocks.filter(block=>block.kind==='prose'||block.kind==='verse');
   const anchor=makeAnchor(section,blocks[0].id,blocks.at(-1)!.id);
   assert.deepEqual(validateAnchor(book,anchor),anchor);
  }
 }
});

test('adding books leaves all existing personal-data edition identities intact',()=>{
 const editions={iphigenie:'iphigenie-v1-8d157fb7f0a3',krug:'krug-v1-4a90b9aef41c',faust:'faust-v1-ddad9d5cdd4a',woyzeck:'woyzeck-v1-4b5ad114ace0',nathan:'nathan-v1-589407953df5',emilia:'emilia-v1-65021f1ab582',kabale:'kabale-v1-17841859ae29',maria:'maria-v1-d1dcf6f3dfd1',verwandlung:'verwandlung-pg-359d3f5983c8'};
 for(const [id,edition] of Object.entries(editions))assert.equal(catalog.find(work=>work.id===id)?.editionId,edition,id);
 assert.equal(new Set(catalog.map(work=>work.id)).size,catalog.length);
});

test('source typography is readable without removing legitimate compound hyphens',()=>{
 const sandmann=JSON.parse(readFileSync('corpus/books/sandmann.json','utf8')) as Book;
 const text=sandmann.sections.flatMap(section=>section.blocks).map(block=>block.text).join(' ');
 assert.ok(text.includes('Wetterglas-Händler'));
 assert.ok(text.includes('himmlisch-schöne'));
 assert.ok(text.includes('Wald- und Blumenflur'));
 const kleider=JSON.parse(readFileSync('corpus/books/kleider.json','utf8')) as Book;
 assert.ok(kleider.sections[0].blocks[63].text.includes('Bürgertugend a, zur Bürgertugend b'));
 assert.ok(!kleider.sections[0].blocks.some(block=>block.text.includes('#')));
});
