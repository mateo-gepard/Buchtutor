import {readFileSync} from 'node:fs';
import {test,expect,type Page} from './reader-test';
import {EMPTY_SNAPSHOT,type LocalSnapshot} from '../../lib/local-model';
import {firstReadable,makeAnchor,type Book,type SavedNote} from '../../lib/reader-model';
const iphigenie=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book;
const faust=JSON.parse(readFileSync('corpus/books/faust.json','utf8')) as Book;
const now='2026-10-25T08:00:00.000Z';
function note(id:string,book:Book,body:string,index=0):SavedNote{
 const section=firstReadable(book),line=section.blocks.filter(b=>b.kind==='verse'||b.kind==='prose')[index];
 return {id,workId:book.id,editionId:book.editionId,anchor:makeAnchor(section,line.id),kind:'note',body,pencil:{color:'green',meaning:'Stilmittel',ink:[],transcription:'manual'},createdAt:now,updatedAt:now};
}
const handwriting:SavedNote={...note('handwriting',iphigenie,''),pencil:{color:'green',meaning:'Stilmittel',transcription:'recognized',transcript:'Natur als Zuflucht zwischen schützenden Felsen.',ink:[[{x:30,y:40,pressure:.5},{x:160,y:90,pressure:.7}]],inkWidth:300,inkHeight:140}};
const explanation:SavedNote={...note('analysis',iphigenie,'',2),kind:'style',pencil:undefined,analysis:{id:'parallel-explanation',workId:iphigenie.id,editionId:iphigenie.editionId,anchor:note('anchor',iphigenie,'',2).anchor,mode:'style',title:'Schützende Landschaft',summary:'Die Szene stellt ihren Aufenthaltsort vor.',observations:[{label:'Bildsprache',text:'Die Szene beginnt ruhig. '.repeat(20)+'Ein Naturraum schafft Geborgenheit und bildet einen Schutzraum.',quotes:[]}],uncertainty:'Eine persönliche Deutung bleibt offen.',source:'prepared',model:'Test',promptVersion:'test',generatedAt:now}};
const collection=[handwriting,note('heimat',iphigenie,'Heimat als Hoffnung.',1),explanation,...Array.from({length:12},(_,i)=>note('faust-'+i,faust,'Studie zu Wissen und Streben '+i,i))];
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
async function stored(page:Page){return page.evaluate(async()=>new Promise<SavedNote[]>((resolve,reject)=>{const req=indexedDB.open('leseraum-local-v2');req.onsuccess=()=>{const db=req.result,r=db.transaction('state','readonly').objectStore('state').get('reader');r.onsuccess=()=>{resolve(r.result.notes);db.close();};r.onerror=()=>reject(r.error);};req.onerror=()=>reject(req.error);}));}
async function seed(page:Page,notes=collection){
 await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());
 await page.goto('/?view=notes');
 const snapshot:LocalSnapshot={...EMPTY_SNAPSHOT,preferences:{value:{...EMPTY_SNAPSHOT.preferences.value,handwritingCloud:false},updatedAt:now},notes};
 await page.evaluate(async snapshot=>new Promise<void>((resolve,reject)=>{const req=indexedDB.open('leseraum-local-v2',1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>{const db=req.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(snapshot,'reader');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};req.onerror=()=>reject(req.error);}),snapshot);
 await page.reload();await expect(page.locator('.note-card')).toHaveCount(notes.length);
}

test('separate search words find handwriting in either order and show the original independently',async({page},testInfo)=>{
 await seed(page);await page.getByLabel('Notizen nach Werk filtern').selectOption('iphigenie');
 const search=page.getByRole('textbox',{name:'Notizen durchsuchen'});
 for(const query of ['Zuflucht Natur','  NATUR   ZUFLUCHT  ','Felsen Zuflucht']){await search.fill(query);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.notebook-search-preview')).toContainText('Erkannter Suchtext');await expect(page.locator('.notebook-search-preview mark')).toHaveCount(2);}
 await page.locator('.saved-ink summary').click();await expect(page.locator('.saved-ink path')).toHaveCount(1);expect((await stored(page)).find(n=>n.id===handwriting.id)).toEqual(handwriting);
 await page.screenshot({path:testInfo.outputPath('handwriting-search.png')});
 await page.locator('.note-open').click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue(handwriting.pencil!.transcript!);
 await page.goBack();await expect(search).toHaveValue('Felsen Zuflucht');await expect(page.getByLabel('Notizen nach Werk filtern')).toHaveValue('iphigenie');await expect(page.locator('.note-card')).toHaveCount(1);expect((await stored(page)).find(n=>n.id===handwriting.id)).toEqual(handwriting);
});

test('deep explanation matches have a useful snippet and literal search symbols remain safe',async({page},testInfo)=>{
 await seed(page);const search=page.getByRole('textbox',{name:'Notizen durchsuchen'});await search.fill('Geborgenheit Naturraum');
 await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.notebook-search-preview')).toContainText('Treffer in der Erklärung');await expect(page.locator('.notebook-search-preview')).toContainText('Ein Naturraum schafft Geborgenheit');await expect(page.locator('.notebook-search-preview mark')).toHaveCount(2);
 await page.screenshot({path:testInfo.outputPath('explanation-search-context.png')});
 await search.fill('[.*');await expect(page.locator('.note-card')).toHaveCount(0);await button(page,'Suche löschen').click();await expect(search).toBeFocused();await expect(page.locator('.note-card')).toHaveCount(collection.length);
});

test('removing one active filter preserves the work and search, including a reader round trip',async({page},testInfo)=>{
 await seed(page);await page.getByLabel('Notizen nach Werk filtern').selectOption('iphigenie');await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('Felsen');
 await page.locator('.notebook-filter-disclosure>summary').click();await page.getByLabel('Nach Markierungsfarbe filtern').selectOption('blue');await page.locator('.notebook-filter-disclosure>summary').click();await expect(page.locator('.note-card')).toHaveCount(0);
 await expect(page.getByRole('group',{name:'Aktive Notizfilter',exact:true})).toBeVisible();await expect(button(page,'Filter entfernen: Blau')).toBeVisible();await page.screenshot({path:testInfo.outputPath('empty-filter-recovery.png')});await button(page,'Filter entfernen: Blau').click();
 await expect(page.getByLabel('Notizen nach Werk filtern')).toHaveValue('iphigenie');await expect(page.getByRole('textbox',{name:'Notizen durchsuchen'})).toHaveValue('Felsen');await expect(page.locator('.note-card')).toHaveCount(1);
 await page.locator('.note-open').click();await page.goBack();await expect(page.locator('.notebook-filter-disclosure')).not.toHaveAttribute('open');await expect(page.getByLabel('Nach Markierungsfarbe filtern')).toHaveValue('all');await expect(page.getByRole('textbox',{name:'Notizen durchsuchen'})).toHaveValue('Felsen');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const target of await page.locator('.notebook-filter-chip,.notebook-search-clear').all())expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('visible and hidden selection can be removed separately before deletion and undo',async({page},testInfo)=>{
 await seed(page);await button(page,'Einträge auswählen').click();await button(page,'Sichtbare auswählen').click();await expect(page.getByRole('checkbox',{checked:true})).toHaveCount(collection.length);
 await page.locator('.note-card').last().scrollIntoViewIfNeeded();await expect.poll(()=>page.locator('.notebook-selection-tools').evaluate(el=>{const bar=el.getBoundingClientRect(),header=document.querySelector('.library-header')!.getBoundingClientRect();return bar.top>=header.bottom&&bar.bottom<innerHeight-44;})).toBe(true);
 await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('Felsen');await expect(page.locator('.notebook-hidden-selection')).toContainText('14 ausgewählte Einträge liegen außerhalb');await button(page,'Sichtbare abwählen').click();await expect(page.getByRole('checkbox',{checked:true})).toHaveCount(0);await expect(page.locator('.selection-summary')).toContainText('14 ausgewählt');
 await button(page,'Sichtbare auswählen').click();await button(page,'Ausgeblendete abwählen').click();await expect(page.locator('.selection-summary')).toContainText('1 ausgewählt');await expect(page.locator('.notebook-hidden-selection')).toHaveCount(0);await expect(page.locator('.note-open')).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:testInfo.outputPath('compact-selection.png')});await button(page,'Auswahl beenden').click();await button(page,'Auswahl fortsetzen (1)').click();await expect(page.locator('.selection-summary')).toContainText('1 ausgewählt');
 for(const target of await page.locator('.notebook-batch button').all())expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 await button(page,'Auswahl löschen').click();await expect(page.locator('.note-card')).toHaveCount(0);await button(page,'Rückgängig').click();await expect(page.locator('.note-card')).toHaveCount(1);await button(page,'Suche löschen').click();await expect(page.locator('.note-card')).toHaveCount(collection.length);await page.reload();await expect(page.locator('.note-card')).toHaveCount(collection.length);expect((await stored(page)).find(n=>n.id===handwriting.id)?.pencil).toEqual(handwriting.pencil);
});

test('a work with only a Pencil draft remains discoverable without changing its stored bytes',async({page})=>{
 await seed(page,[handwriting]);const draftNote=note('unfinished-pencil',faust,'Noch unvollständig.');const key=`buchtutor-pencil-draft:${faust.id}:${faust.editionId}:${draftNote.anchor.sectionId}`;
 const raw=JSON.stringify({version:2,entries:[{id:draftNote.id,anchor:draftNote.anchor,body:draftNote.body,pencil:draftNote.pencil}],groups:[]});
 await page.evaluate(({key,raw})=>{localStorage.setItem(key,raw);localStorage.setItem(key+'-future','{"version":99,"preserve":true}');},{key,raw});await page.reload();
 const work=page.getByLabel('Notizen nach Werk filtern');await expect(work.getByRole('option',{name:'Faust I · 0 · 1 Entwurf',exact:true})).toHaveCount(1);await work.selectOption('faust');await expect(page.locator('.note-card')).toHaveCount(0);await expect(page.locator('.notebook-drafts')).toContainText('Faust I');await expect(page.getByRole('heading',{name:'Noch keine abgeschlossenen Notizen',exact:true})).toBeVisible();expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(raw);
});

test('several drafts stay compact and every draft can still be resumed',async({page},testInfo)=>{
 await seed(page,[handwriting]);await page.getByRole('button',{name:'Bibliothek',exact:true}).click();await page.getByRole('button',{name:/Iphigenie auf Tauris –/}).click();
 for(const line of [5,6,7,8]){await button(page,`Vers ${line} auswählen`).click();await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Entwurf für Vers '+line);await button(page,'Lesehilfe schließen').click();}
 await button(page,'Zur Bibliothek').click();await button(page,'Meine Notizen').click();await expect(page.locator('.notebook-drafts>summary')).toContainText('4 Entwürfe');await expect(page.locator('.notebook-drafts')).not.toHaveAttribute('open');await expect(page.locator('.note-card')).toBeVisible();
 await page.locator('.notebook-drafts>summary').click();await expect(page.locator('.typed-note-draft')).toHaveCount(3);await button(page,'1 weiteren Entwurf anzeigen').click();await expect(page.locator('.typed-note-draft')).toHaveCount(4);await page.screenshot({path:testInfo.outputPath('draft-discovery.png')});
 await page.locator('.typed-note-draft').filter({hasText:'Entwurf für Vers 8'}).getByRole('button').click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Entwurf für Vers 8');
});
