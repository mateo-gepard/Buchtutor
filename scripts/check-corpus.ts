import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {makeAnchor,validateAnchor,firstReadable,type Analysis,type Book} from '../lib/reader-model.ts';
import {aliasesAt} from '../lib/mentions.ts';
const base=new URL('../corpus/',import.meta.url);
const books=readdirSync(new URL('books/',base)).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(new URL(`books/${f}`,base),'utf8')) as Book);
let checks=0;
for(const book of books){
 const blocks=book.sections.flatMap(s=>s.blocks),text=blocks.filter(b=>b.kind==='verse'||b.kind==='prose');
 assert.equal(new Set(blocks.map(b=>b.id)).size,blocks.length);assert.equal(new Set(book.sections.map(s=>s.id)).size,book.sections.length);
 assert.equal(text.length,book.validation.textBlocks);assert(blocks.every(b=>b.text.trim().length));
 const bytes=readFileSync(new URL(`sources/${book.id}.${book.id==='verwandlung'?'txt':'xml'}`,base));assert.equal(createHash('sha256').update(bytes).digest('hex'),book.revision);
 const section=firstReadable(book),lines=section.blocks.filter(b=>b.kind==='verse'||b.kind==='prose');
 const anchor=makeAnchor(section,lines[0].id,lines[Math.min(2,lines.length-1)].id,2,lines[Math.min(2,lines.length-1)].text.length-2);
 assert.deepEqual(validateAnchor(book,anchor),anchor);assert.throws(()=>validateAnchor(book,{...anchor,quote:anchor.quote+' changed'}));assert.throws(()=>makeAnchor(section,'unknown'));
 const reverse=makeAnchor(section,lines[1].id,lines[0].id);assert.equal(reverse.startId,lines[0].id);
 for(const s of book.sections)for(const b of s.blocks.filter(b=>b.number!==undefined)){assert(b.number!>0);assert(b.unit)}
 checks+=10;
}
const iph=books.find(b=>b.id==='iphigenie')!;const verses=iph.sections.flatMap(s=>s.blocks).filter(b=>b.kind==='verse');
assert.equal(verses.length,2203);assert.equal(new Set(verses.map(b=>b.number)).size,2174);
for(let i=0;i<verses.length;i++){const b=verses[i];if(b.part==='M'||b.part==='F')assert.equal(b.number,verses[i-1].number);}
const faust=books.find(b=>b.id==='faust')!;const actual=new Set(faust.sections.flatMap(s=>s.blocks).filter(b=>b.unit==='verse').flatMap(b=>Array.from({length:(b.numberEnd??b.number!)-b.number!+1},(_,i)=>b.number!+i)));
assert.deepEqual(Array.from({length:4612},(_,i)=>i+1).filter(n=>!actual.has(n)),[4335,4336,4337,4338,4339,4340,4341,4342]);
const prepared=JSON.parse(readFileSync(new URL('prepared-analyses.json',base),'utf8')) as Analysis[];
for(const analysis of prepared){const book=books.find(b=>b.id===analysis.workId)!;assert.equal(analysis.editionId,book.editionId);validateAnchor(book,analysis.anchor);const section=book.sections.find(s=>s.id===analysis.anchor.sectionId)!;const start=section.blocks.findIndex(b=>b.id===analysis.anchor.startId),end=section.blocks.findIndex(b=>b.id===analysis.anchor.endId);const selected=section.blocks.slice(start,end+1);for(const o of analysis.observations)for(const q of o.quotes){assert(selected.find(b=>b.id===q.blockId)?.text.includes(q.quote));checks++;}}
assert.equal(new Set(prepared.map(a=>a.id)).size,prepared.length);
const clerk={id:'licht',name:'Licht',aliases:['Licht'],description:'',evidence:''};
assert.equal(aliasesAt([clerk],'krug','b02117')[0].aliases.length,0);
assert.deepEqual(aliasesAt([clerk],'krug','b00559')[0].aliases,['Licht']);
console.log(JSON.stringify({passed:true,books:books.length,preparedAnalyses:prepared.length,assertionGroups:checks+5,iphigenieVerses:2174,faustLastVerse:4612,faustSourceGap:[4335,4342]}));
