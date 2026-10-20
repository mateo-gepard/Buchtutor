import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {audioTime,cueAt,speechUnits,validateAudiobook,audioProgressSchema,type Audiobook} from '../lib/audiobook';
import type {Book} from '../lib/reader-model';
const book=JSON.parse(readFileSync(new URL('../corpus/books/iphigenie.json',import.meta.url),'utf8')) as Book;
const section=book.sections[0],block=section.blocks.find(b=>b.kind==='verse')!;
const cue={start:1,end:3,sectionId:section.id,blockId:block.id,startOffset:0,endOffset:block.text.length,confidence:1};
const fixture:Audiobook={version:1,workId:book.id,editionId:book.editionId,revision:book.revision,recordingId:'fixture',sourceLabel:'Test',sourceUrl:'https://librivox.org/',licenseUrl:'https://librivox.org/pages/public-domain/',narrator:'Test',note:'',alignment:{method:'test',matchedBlocks:1,totalBlocks:1},tracks:[{id:'t1',title:'Test',url:'https://archive.org/download/test/a.mp3',duration:10,sha256:'a'.repeat(64),cues:[cue]}]};
test('audio manifests bind timestamps to the exact canonical edition and valid text offsets',()=>{
 assert.equal(validateAudiobook(fixture,book).tracks.length,1);
 for(const change of [{revision:'old'},{editionId:'foreign'},{workId:'foreign'}])assert.throws(()=>validateAudiobook({...fixture,...change},book));
 for(const change of [{blockId:'missing'},{sectionId:'foreign'},{endOffset:block.text.length+1},{end:11.1},{end:1},{startOffset:cue.endOffset}])assert.throws(()=>validateAudiobook({...fixture,tracks:[{...fixture.tracks[0],cues:[{...cue,...change}]}]},book));
 assert.throws(()=>validateAudiobook({...fixture,tracks:[{...fixture.tracks[0],url:'https://example.com/audio.mp3'}]},book));
 assert.throws(()=>validateAudiobook({...fixture,tracks:[{...fixture.tracks[0],cues:[{...cue,start:4,end:5},cue]}]},book));
 assert.equal(validateAudiobook({...fixture,synthetic:true,tracks:[{...fixture.tracks[0],url:'/audio/krug/s002.mp3'}]},book).tracks[0].url,'/audio/krug/s002.mp3');
 for(const url of ['/audio/../private.mp3','//example.com/file.mp3','http://archive.org/file.mp3'])assert.throws(()=>validateAudiobook({...fixture,tracks:[{...fixture.tracks[0],url}]},book));
});
test('audio lookup clears highlights in gaps and handles exact boundaries',()=>{
 const cues=[cue,{...cue,start:8,end:9}];assert.equal(cueAt(cues,0),null);assert.equal(cueAt(cues,1),cue);assert.equal(cueAt(cues,4),null);assert.equal(cueAt(cues,8),cues[1]);assert.equal(cueAt([],9),null);
 assert.equal(audioTime(3661.9),'1:01:01');assert.equal(audioTime(-1),'0:00');assert.equal(audioTime(NaN),'0:00');assert.equal(audioProgressSchema.safeParse({time:Infinity}).success,false);
});
test('device narration covers every readable canonical block without changing text or offsets',()=>{
 for(const file of readdirSync(new URL('../corpus/books',import.meta.url)).filter(n=>n.endsWith('.json'))){
  const book=JSON.parse(readFileSync(new URL('../corpus/books/'+file,import.meta.url),'utf8')) as Book,units=speechUnits(book);
  for(const section of book.sections)for(const block of section.blocks){
   if(!['verse','prose'].includes(block.kind)||!block.text.trim())continue;
   const parts=units.filter(u=>u.blockId===block.id&&u.sectionId===section.id);
   assert.equal(parts.map(u=>u.text).join(''),block.text,`${file}: ${block.id}`);
   for(const part of parts)assert.equal(block.text.slice(part.startOffset,part.endOffset),part.text);
  }
 }
});
