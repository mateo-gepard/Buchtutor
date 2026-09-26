import {test} from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {initializeLocal,getLocalState,saveLocalNote,saveLocalProgress,deleteLocalNote,updateLocal} from '../lib/local-storage';
import type {SavedNote} from '../lib/reader-model';

// No cross-window channel is needed in the isolated in-memory browser storage test.
Object.defineProperty(globalThis,'BroadcastChannel',{value:undefined,configurable:true});
test('IndexedDB transactions preserve concurrent notes, persist tombstones, reject invalid data and keep newer progress',async()=>{
 await initializeLocal();assert.equal(getLocalState().ready,true);
 const note:SavedNote={id:'a',workId:'book',editionId:'edition',anchor:{sectionId:'s',startId:'b',endId:'b',startOffset:0,endOffset:4,quote:'Text'},kind:'note',body:'A',createdAt:'2026-09-25T12:00:00.000Z',updatedAt:'2026-09-25T12:00:00.000Z'};
 await Promise.all([saveLocalNote(note),saveLocalNote({...note,id:'b',body:'B'})]);
 assert.equal(getLocalState().data.notes.length,2);
 await deleteLocalNote('a');assert.ok(getLocalState().data.notes.find(n=>n.id==='a')?.deletedAt);
 await assert.rejects(updateLocal(data=>({...data,notes:[{...note,body:'x'.repeat(12001)}]})),/Nicht gespeichert/);
 assert.equal(getLocalState().data.notes.length,2);
 const progress={workId:'book',editionId:'edition',sectionId:'s',blockId:'new',updatedAt:'2026-09-25T12:00:00.000Z'};
 await saveLocalProgress(progress);
 await saveLocalProgress({...progress,blockId:'old',updatedAt:'2026-09-25T11:00:00.000Z'});
 assert.equal(getLocalState().data.progress[0].blockId,'new');
});

