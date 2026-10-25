import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {selectionHighlights} from '../lib/selection-highlights';
import {makeAnchor,type Book,type SavedNote} from '../lib/reader-model';
const book=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book,section=book.sections[0],line=section.blocks.find(b=>b.kind==='verse')!;
const anchor=makeAnchor(section,line.id);
test('direct marking is idempotent and reuses a note without discarding its body or ink',()=>{
 const base:SavedNote={id:'own-note',workId:book.id,editionId:book.editionId,anchor,kind:'note',body:'Meine Deutung',createdAt:'2026-10-20T00:00:00.000Z',updatedAt:'2026-10-20T00:00:00.000Z'};
 const first=selectionHighlights(book,[anchor,anchor],[base],'green');assert.equal(first.notes.length,1);assert.equal(first.selected[0].id,base.id);assert.equal(first.notes[0].body,base.body);assert.equal(base.pencil,undefined);
 const withInk={...first.notes[0],pencil:{...first.notes[0].pencil!,ink:[[{x:1,y:2,pressure:.5}]],transcript:'Handschrift',transcription:'recognized' as const,erasedRanges:[{blockId:line.id,start:0,end:3}]}};
 const restored=selectionHighlights(book,[anchor],[withInk],'green');assert.equal(restored.notes[0].id,base.id);assert.deepEqual(restored.notes[0].pencil?.ink,withInk.pencil.ink);assert.equal(restored.notes[0].pencil?.transcript,'Handschrift');assert.deepEqual(restored.notes[0].pencil?.erasedRanges,[]);
 const repeat=selectionHighlights(book,[anchor],restored.notes,'green');assert.deepEqual(repeat.notes,restored.notes);
});
test('direct marking never edits a tombstone or another edition and rejects a stale quote',()=>{
 const first=selectionHighlights(book,[anchor],[],'green').notes[0];
 const deleted={...first,deletedAt:first.updatedAt},other={...first,id:'older',editionId:'other-edition'};
 const result=selectionHighlights(book,[anchor],[deleted,other],'green');assert.equal(result.notes.length,3);assert.deepEqual(result.notes.slice(0,2),[deleted,other]);
 assert.throws(()=>selectionHighlights(book,[anchor,{...anchor,quote:'Wrong text'}],[first],'blue'),/Ausgabe/);assert.equal(first.pencil?.color,'green');
});
