import {test} from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {initializeLocal,getLocalState,saveLocalNote,saveLocalProgress,deleteLocalNote,updateLocal,setLocalBookmark,saveLocalPreferences} from '../lib/local-storage';
import {EMPTY_SNAPSHOT,mergeSnapshots} from '../lib/local-model';
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

test('bookmark writes are idempotent and removal survives an older device backup',async()=>{
 await updateLocal(()=>structuredClone(EMPTY_SNAPSHOT));
 const anchor={sectionId:'s',startId:'b',endId:'b',startOffset:0,endOffset:4,quote:'Text'};
 await Promise.all([setLocalBookmark('book','edition',anchor,true),setLocalBookmark('book','edition',anchor,true)]);
 const before=structuredClone(getLocalState().data);
 assert.equal(before.notes.length,1);
 assert.equal(before.notes[0].kind,'bookmark');
 await setLocalBookmark('book','edition',anchor,false);
 const removed=structuredClone(getLocalState().data);
 assert.ok(mergeSnapshots(removed,before).snapshot.notes[0].deletedAt);
 assert.ok(mergeSnapshots(before,removed).snapshot.notes[0].deletedAt);
 await setLocalBookmark('book','edition',anchor,true);
 assert.equal(getLocalState().data.notes.length,1);
 assert.equal(getLocalState().data.notes[0].id,before.notes[0].id);
 assert.equal(getLocalState().data.notes[0].deletedAt,undefined);
});

test('turning automatic bookmarks off blocks queued saves without deleting manual bookmarks',async()=>{
 const before=structuredClone(getLocalState().data.notes);
 await saveLocalPreferences({...getLocalState().data.preferences.value,autoBookmark:false});
 const progress={workId:'book',editionId:'edition',sectionId:'s',blockId:'new',updatedAt:new Date().toISOString()};
 await saveLocalProgress(progress);
 assert.equal(getLocalState().data.progress.length,0);
 assert.deepEqual(getLocalState().data.notes,before);
 await saveLocalPreferences({...getLocalState().data.preferences.value,autoBookmark:true});
 await saveLocalProgress(progress);
 assert.deepEqual(getLocalState().data.progress,[progress]);
});
