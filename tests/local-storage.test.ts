import {test} from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {initializeLocal,getLocalState,saveLocalNote,saveLocalProgress,deleteLocalNote,updateLocal,setLocalBookmark,saveLocalPreferences} from '../lib/local-storage';
import {EMPTY_SNAPSHOT,mergeSnapshots,snapshotSchema} from '../lib/local-model';
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

const recoveryKey='reader:recovery:v1';
const exampleNote=(id='durable',body='Original'):SavedNote=>({id,workId:'book',editionId:'edition',anchor:{sectionId:'s',startId:'b',endId:'b',startOffset:0,endOffset:4,quote:'Text'},kind:'note',body,createdAt:'2026-10-21T12:00:00.000Z',updatedAt:'2026-10-21T12:00:00.000Z'});
async function connection(){const {openDB}=await import('idb');return openDB('leseraum-local-v2',1);}
async function freshStorage(){return import(new URL('../lib/local-storage.ts?instance='+crypto.randomUUID(),import.meta.url).href) as Promise<typeof import('../lib/local-storage')>;}

test('a successful commit has one valid versioned checkpoint; invalid writes leave both copies unchanged',async()=>{
 await updateLocal(()=>structuredClone(EMPTY_SNAPSHOT));await saveLocalNote(exampleNote());
 const db=await connection(),before=await db.get('state','reader'),backup=await db.get('state',recoveryKey);
 assert.equal(backup.version,1);assert.ok(backup.revision>0);assert.deepEqual(backup.data,snapshotSchema.parse(before));
 await assert.rejects(saveLocalNote({...exampleNote(),body:'x'.repeat(12001)}),/Nicht gespeichert/);
 assert.deepEqual(await db.get('state','reader'),before);assert.deepEqual(await db.get('state',recoveryKey),backup);
 assert.match(getLocalState().error,/Nicht gespeichert/);db.close();
});

test('an aborted transaction rolls back checkpoint and reader and never acknowledges the new note',async()=>{
 await updateLocal(()=>structuredClone(EMPTY_SNAPSHOT));await saveLocalNote(exampleNote());
 const db=await connection(),before=await db.get('state','reader'),backup=await db.get('state',recoveryKey),put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(value,key){const request=put.call(this,value,key);if(key==='reader')request.addEventListener('success',()=>this.transaction.abort());return request;};
 try{await assert.rejects(saveLocalNote(exampleNote('new','Nicht bestätigt')),/Nicht gespeichert/);}finally{IDBObjectStore.prototype.put=put;}
 assert.deepEqual(await db.get('state','reader'),before);assert.deepEqual(await db.get('state',recoveryKey),backup);
 assert.equal(getLocalState().data.notes.some(note=>note.id==='new'),false);db.close();
});

test('quota rejection cannot replace the last good reader or checkpoint',async()=>{
 await updateLocal(()=>structuredClone(EMPTY_SNAPSHOT));await saveLocalNote(exampleNote());
 const db=await connection(),before=await db.get('state','reader'),backup=await db.get('state',recoveryKey),put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(value,key){if(key===recoveryKey)throw new DOMException('Quota','QuotaExceededError');return put.call(this,value,key);};
 try{await assert.rejects(saveLocalNote(exampleNote('quota')),/Nicht gespeichert/);}finally{IDBObjectStore.prototype.put=put;}
 assert.deepEqual(await db.get('state','reader'),before);assert.deepEqual(await db.get('state',recoveryKey),backup);db.close();
});

test('a corrupt primary recovers the latest committed notes and preserves the unreadable raw record before repair',async()=>{
 await updateLocal(()=>structuredClone(EMPTY_SNAPSHOT));await saveLocalNote(exampleNote());
 const db=await connection(),raw={schemaVersion:99,notes:'unreadable original'};await db.put('state',raw,'reader');
 const reader=await freshStorage();await reader.initializeLocal();
 assert.equal(reader.getLocalState().data.notes[0].body,'Original');assert.match(reader.getLocalState().error,/lokalen Sicherung/);
 assert.deepEqual(await db.get('state','reader'),raw);
 await reader.saveLocalProgress({workId:'book',editionId:'edition',sectionId:'s',blockId:'b',updatedAt:'2026-10-21T13:00:00.000Z'});
 const reloaded=await freshStorage();await reloaded.initializeLocal();assert.match(reloaded.getLocalState().error,/lokalen Sicherung/);
 await reader.saveLocalNote(exampleNote('recovered','Danach gespeichert'));
 assert.deepEqual(await db.get('state','reader:unreadable:v1:reader'),{version:1,value:raw});
 assert.deepEqual((await db.get('state',recoveryKey)).data,snapshotSchema.parse(await db.get('state','reader')));
 assert.equal(reader.getLocalState().data.notes.length,2);assert.equal(reader.getLocalState().error,'');db.close();
});

test('two corrupt records block mutations instead of replacing user data with an empty snapshot',async()=>{
 const db=await connection(),before=await db.get('state','reader'),backup=await db.get('state',recoveryKey),primary={schemaVersion:7,notes:['raw']},damaged={version:1,data:EMPTY_SNAPSHOT,revision:3,checksum:'wrong'};
 await db.put('state',primary,'reader');await db.put('state',damaged,recoveryKey);
 try{
  const reader=await freshStorage();await reader.initializeLocal();assert.match(reader.getLocalState().error,/beschädigt/);
  await assert.rejects(reader.saveLocalNote(exampleNote('blocked')),/beschädigt/);
  assert.deepEqual(await db.get('state','reader'),primary);assert.deepEqual(await db.get('state',recoveryKey),damaged);
 }finally{await db.put('state',before,'reader');await db.put('state',backup,recoveryKey);db.close();}
});

test('same-note concurrent or stale edits retain both variants; unrelated notes remain intact',async()=>{
 await updateLocal(()=>structuredClone(EMPTY_SNAPSHOT));const baseline=exampleNote();await saveLocalNote(baseline);
 const a=await freshStorage(),b=await freshStorage();await Promise.all([a.initializeLocal(),b.initializeLocal()]);
 await Promise.all([a.saveLocalNote({...baseline,body:'Tab A'},baseline),b.saveLocalNote({...baseline,body:'Tab B'},baseline)]);
 const db=await connection(),persisted=snapshotSchema.parse(await db.get('state','reader'));db.close();
 assert.deepEqual(new Set(persisted.notes.map(note=>note.body)),new Set(['Tab A','Tab B']));
 const copy=persisted.notes.find(note=>note.conflictOf===baseline.id);assert.ok(copy);assert.notEqual(copy.id,baseline.id);
 await saveLocalNote(exampleNote('unrelated','Unverändert'));
 assert.equal(getLocalState().data.notes.find(note=>note.id==='unrelated')?.body,'Unverändert');
});

test('a stale editor preserves its work as a conflict copy without resurrecting a deleted note',async()=>{
 await updateLocal(()=>structuredClone(EMPTY_SNAPSHOT));const baseline=exampleNote();await saveLocalNote(baseline);await deleteLocalNote(baseline.id);
 await saveLocalNote({...baseline,body:'Parallel weitergeschrieben'},baseline);
 assert.ok(getLocalState().data.notes.find(note=>note.id===baseline.id)?.deletedAt);
 assert.equal(getLocalState().data.notes.find(note=>note.conflictOf===baseline.id)?.body,'Parallel weitergeschrieben');
});

test('legacy preferences migrate only after an atomic commit, with their original storage key preserved',async()=>{
 const db=await connection(),prior=await db.get('state','reader'),backup=await db.get('state',recoveryKey),legacy=JSON.stringify({...EMPTY_SNAPSHOT.preferences.value,theme:'sepia'});
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>key==='leseraum-reading-preferences-v1'?legacy:null}});
 await db.delete('state','reader');await db.delete('state',recoveryKey);
 try{
  const reader=await freshStorage();await reader.initializeLocal();assert.equal(reader.getLocalState().data.preferences.value.theme,'sepia');
  assert.deepEqual((await db.get('state',recoveryKey)).data,snapshotSchema.parse(await db.get('state','reader')));assert.equal(localStorage.getItem('leseraum-reading-preferences-v1'),legacy);
 }finally{if(old)Object.defineProperty(globalThis,'localStorage',old);else Reflect.deleteProperty(globalThis,'localStorage');await db.put('state',prior,'reader');await db.put('state',backup,recoveryKey);db.close();}
});

test('conflict copies remap independent page ink and repeated stale/import writes do not multiply copies',async()=>{
 await updateLocal(()=>structuredClone(EMPTY_SNAPSHOT));
 const baseline:SavedNote={...exampleNote(),pencil:{color:'green',meaning:'Gedanke',ink:[],transcription:'none',pageInk:[{id:'group',targetId:'durable',referenceId:'b',width:600,fontSize:20,strokes:[{id:'stroke',order:1,points:[{x:10,y:10,pressure:.5},{x:15,y:20,pressure:.6}]}]}]}};
 const prior=structuredClone(baseline);await saveLocalNote(baseline);await saveLocalNote({...baseline,body:'Tab A'},baseline);await saveLocalNote({...baseline,body:'Tab B'},baseline);
 const copy=getLocalState().data.notes.find(note=>note.conflictOf===baseline.id)!;
 assert.equal(copy.pencil?.pageInk?.[0].targetId,copy.id);assert.notEqual(copy.pencil?.pageInk?.[0].id,'group');assert.deepEqual(baseline,prior);
 const merged=mergeSnapshots({...structuredClone(EMPTY_SNAPSHOT),notes:[{...baseline,body:'Import'}]}, {...structuredClone(EMPTY_SNAPSHOT),notes:[baseline]});
 const importedCopy=merged.snapshot.notes.find(note=>note.conflictOf===baseline.id)!;assert.equal(importedCopy.pencil?.pageInk?.[0].targetId,importedCopy.id);
 assert.equal(mergeSnapshots(merged.snapshot,{...structuredClone(EMPTY_SNAPSHOT),notes:[baseline]}).conflicts,0);
});

test('commit metadata detects schema-valid text corruption and stays outside the portable snapshot',async()=>{
 await updateLocal(()=>structuredClone(EMPTY_SNAPSHOT));await saveLocalNote(exampleNote());
 const db=await connection(),before=await db.get('state','reader'),quarantine=await db.get('state','reader:unreadable:v1:reader');
 assert.equal(before._localCommit.version,1);assert.equal('_localCommit' in snapshotSchema.parse(before),false);
 await db.delete('state','reader:unreadable:v1:reader');
 try{
  const damaged=structuredClone(before);damaged.notes[0].body='Schema-valid but damaged';await db.put('state',damaged,'reader');
  const reader=await freshStorage();await reader.initializeLocal();assert.equal(reader.getLocalState().data.notes[0].body,'Original');assert.match(reader.getLocalState().error,/lokalen Sicherung/);
  await reader.saveLocalNote(exampleNote('repair'));assert.deepEqual(await db.get('state','reader:unreadable:v1:reader'),{version:1,value:damaged});
 }finally{if(quarantine!==undefined)await db.put('state',quarantine,'reader:unreadable:v1:reader');else await db.delete('state','reader:unreadable:v1:reader');db.close();}
});

test('only an explicit valid import can replace two unreadable records, preserving both raw originals',async()=>{
 const db=await connection(),before=await db.get('state','reader'),backup=await db.get('state',recoveryKey),priorRaw=await db.get('state','reader:unreadable:v1:reader'),priorCheckpoint=await db.get('state','reader:unreadable:v1:checkpoint');
 const bad={schemaVersion:50,notes:'raw notes'},badBackup={version:50,data:'raw checkpoint'};
 await db.delete('state','reader:unreadable:v1:reader');await db.delete('state','reader:unreadable:v1:checkpoint');await db.put('state',bad,'reader');await db.put('state',badBackup,recoveryKey);
 try{
  const reader=await freshStorage();await reader.initializeLocal();await assert.rejects(reader.saveLocalNote(exampleNote()),/beschädigt/);
  await reader.importLocal({...structuredClone(EMPTY_SNAPSHOT),notes:[exampleNote('imported','Aus Sicherung')]},true);
  assert.equal(reader.getLocalState().data.notes[0].body,'Aus Sicherung');assert.deepEqual(await db.get('state','reader:unreadable:v1:reader'),{version:1,value:bad});assert.deepEqual(await db.get('state','reader:unreadable:v1:checkpoint'),{version:1,value:badBackup});
 }finally{
  await db.put('state',before,'reader');await db.put('state',backup,recoveryKey);
  for(const [key,value] of [['reader:unreadable:v1:reader',priorRaw],['reader:unreadable:v1:checkpoint',priorCheckpoint]] as const){if(value===undefined)await db.delete('state',key);else await db.put('state',value,key);}
  db.close();
 }
});
