import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coverImage} from '../lib/reader-art';

// A new catalog entry must ship its actual cover, even without cast portraits.
test('every library title has a shipped, documented cover asset',()=>{
 const catalog=JSON.parse(readFileSync('corpus/catalog.json','utf8')) as {id:string}[];
 const provenance=JSON.parse(readFileSync('docs/art-prompts.json','utf8')) as {file:string;width:number;height:number}[];
 for(const id of [...catalog.map(work=>work.id),'heimsuchung']){
  const url=coverImage(id);
  assert.ok(url,`Missing cover registration for ${id}`);
  const entry=provenance.find(item=>item.file==='public'+url);
  assert.ok(entry,`Missing cover provenance for ${id}`);
  const bytes=readFileSync('public'+url);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF',id);
  assert.equal(bytes.subarray(8,12).toString(),'WEBP',id);
  assert.equal(entry.width/entry.height,2/3,id);
 }
});
