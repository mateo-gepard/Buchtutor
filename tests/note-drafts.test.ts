import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNoteDraftStore} from '../hooks/use-note-drafts';

class MemoryStorage implements Storage{
 private values=new Map<string,string>();fail:(key:string)=>boolean=()=>false;
 get length(){return this.values.size;}
 clear(){this.values.clear();}
 getItem(key:string){return this.values.get(key)??null;}
 key(index:number){return [...this.values.keys()][index]??null;}
 removeItem(key:string){if(this.fail(key))throw new DOMException('Blocked','SecurityError');this.values.delete(key);}
 setItem(key:string,value:string){if(this.fail(key))throw new DOMException('Full','QuotaExceededError');this.values.set(key,String(value));}
}
const primary='buchtutor-note-draft:passage';
const slot=(writer:string)=>'buchtutor-note-draft-journal-v2:'+JSON.stringify(['passage',writer]);

test('legacy drafts remain readable and damaged primary text recovers from the last journal without erasing raw data',()=>{
 const storage=new MemoryStorage();storage.setItem(primary,JSON.stringify({version:1,body:'Alter Entwurf'}));
 const store=createNoteDraftStore(storage,'tab-a');assert.equal(store.snapshot().drafts.passage,'Alter Entwurf');
 store.change('passage','Neuer Entwurf');storage.setItem(primary,'{unlesbar');
 const reloaded=createNoteDraftStore(storage,'new-tab');assert.equal(reloaded.snapshot().drafts.passage,'Neuer Entwurf');assert.match(reloaded.snapshot().error,/beschädigt/);assert.equal(storage.getItem(primary),'{unlesbar');
 reloaded.change('passage','Wieder bearbeitet');assert.equal(storage.getItem('buchtutor-note-draft-unreadable-v1:'+primary),'{unlesbar');
});

test('a late save acknowledgement never clears a newer revision, even when its text matches again',()=>{
 const storage=new MemoryStorage(),store=createNoteDraftStore(storage,'tab-a'),first=store.change('passage','A');
 store.change('passage','B');const latest=store.change('passage','A');store.clear('passage','A',first);
 assert.equal(store.snapshot().drafts.passage,'A');assert.equal(JSON.parse(storage.getItem(primary)!).revision,latest);
 store.clear('passage','A',latest);assert.equal(store.snapshot().drafts.passage,undefined);assert.equal(storage.length,0);
});

test('simultaneous tabs retain separate recoverable drafts and acknowledgement removes only its exact version',()=>{
 const storage=new MemoryStorage(),a=createNoteDraftStore(storage,'tab-a'),b=createNoteDraftStore(storage,'tab-b');
 const av=a.change('passage','Fassung A'),bv=b.change('passage','Fassung B');
 assert.equal(a.snapshot().drafts.passage,'Fassung A');assert.equal(b.snapshot().drafts.passage,'Fassung B');assert.equal(a.snapshot().alternatives.passage[0].body,'Fassung B');
 a.clear('passage','Fassung A',av);assert.equal(JSON.parse(storage.getItem(primary)!).revision,bv);assert.equal(storage.getItem(slot('tab-a')),null);assert.ok(storage.getItem(slot('tab-b')));
 const reloaded=createNoteDraftStore(storage,'reload');assert.equal(reloaded.snapshot().drafts.passage,'Fassung B');
});

test('quota failure of the compatibility key retains the journal; failure of the journal retains old persisted and new in-memory text',()=>{
 const storage=new MemoryStorage(),store=createNoteDraftStore(storage,'tab-a');store.change('passage','Gesichert');
 storage.fail=key=>key===primary;store.change('passage','Neu im Journal');assert.match(store.snapshot().error,/nicht vollständig/);
 assert.equal(JSON.parse(storage.getItem(slot('tab-a'))!).body,'Neu im Journal');
 storage.fail=key=>key.startsWith('buchtutor-note-draft-journal-v2:');store.change('passage','Nur im Speicher');
 assert.equal(store.snapshot().drafts.passage,'Nur im Speicher');assert.equal(JSON.parse(storage.getItem(slot('tab-a'))!).body,'Neu im Journal');assert.equal(JSON.parse(storage.getItem(primary)!).body,'Gesichert');
});

test('restoring a foreign draft preserves the unsaved local variant and needs its own acknowledgement',()=>{
 const storage=new MemoryStorage(),a=createNoteDraftStore(storage,'tab-a'),b=createNoteDraftStore(storage,'tab-b');
 a.change('passage','Fassung A');const other=b.change('passage','Fassung B'),restored=a.restore('passage',other);
 assert.ok(restored);assert.equal(a.snapshot().drafts.passage,'Fassung B');assert.equal(a.snapshot().alternatives.passage[0].body,'Fassung A');
 a.clear('passage','Fassung B',other);assert.equal(a.snapshot().drafts.passage,'Fassung B');
});

test('unknown drafts and failed cleanup remain intact and unavailable storage keeps text with an explicit error',()=>{
 const storage=new MemoryStorage();storage.setItem(primary,JSON.stringify({version:9,body:'Unbekanntes Format'}));
 const store=createNoteDraftStore(storage,'tab-a');assert.match(store.snapshot().error,/beschädigt/);
 const revision=store.change('passage','Neuer Text');assert.ok(storage.getItem('buchtutor-note-draft-unreadable-v1:'+primary));
 storage.fail=()=>true;store.clear('passage','Neuer Text',revision);assert.equal(store.snapshot().drafts.passage,'Neuer Text');assert.match(store.snapshot().error,/nicht bereinigt/);
 const unavailable=createNoteDraftStore(undefined,'tab-c');unavailable.change('passage','Im Arbeitsspeicher');assert.equal(unavailable.snapshot().drafts.passage,'Im Arbeitsspeicher');assert.match(unavailable.snapshot().error,/nicht vollständig/);
});

test('reload chooses a newer journal after primary quota failure and another tab cannot overwrite that newer journal',()=>{
 const storage=new MemoryStorage(),a=createNoteDraftStore(storage,'tab-a');a.change('passage','A alt');
 storage.fail=key=>key===primary;a.change('passage','A neu im Journal');storage.fail=()=>false;
 const reloaded=createNoteDraftStore(storage,'reload');assert.equal(reloaded.snapshot().drafts.passage,'A neu im Journal');
 const b=createNoteDraftStore(storage,'tab-b');b.change('passage','B');
 assert.equal(JSON.parse(storage.getItem(slot('tab-a'))!).body,'A neu im Journal');assert.equal(b.snapshot().alternatives.passage.some(version=>version.body==='A neu im Journal'),true);
});

test('acknowledging an unchanged legacy draft does not leave a duplicate that reappears after reload',()=>{
 const storage=new MemoryStorage();storage.setItem(primary,JSON.stringify({version:1,body:'Schon gesichert'}));
 const store=createNoteDraftStore(storage,'tab-a'),revision=store.change('passage','Schon gesichert');store.clear('passage','Schon gesichert',revision);
 assert.equal(createNoteDraftStore(storage,'reload').snapshot().drafts.passage,undefined);assert.equal(storage.length,0);
});
