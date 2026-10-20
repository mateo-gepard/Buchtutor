import {readFileSync} from 'node:fs';
import {test,expect,type Page} from './reader-test';
import {EMPTY_SNAPSHOT,type LocalSnapshot} from '../../lib/local-model';
import {firstReadable,makeAnchor,type Book,type SavedNote} from '../../lib/reader-model';

const iphigenie=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book;
const faust=JSON.parse(readFileSync('corpus/books/faust.json','utf8')) as Book;
function note(id:string,book:Book,body:string,color:'green'|'blue',meaning:string):SavedNote{
 const section=firstReadable(book),block=section.blocks.find(b=>b.kind==='verse'||b.kind==='prose')!;
 return {id,workId:book.id,editionId:book.editionId,anchor:makeAnchor(section,block.id),kind:'note',body,pencil:{color,meaning,ink:[],transcription:'manual'},createdAt:'2026-10-20T08:00:00.000Z',updatedAt:'2026-10-20T08:00:00.000Z'};
}
const notes=[note('natur',iphigenie,'Natur als Zuflucht','green','Stilmittel'),note('freiheit',iphigenie,'Äußere Freiheit','blue','Interpretation'),note('motiv',faust,'Motiv des Strebens','green','Motiv')];
async function seed(page:Page,items=notes){
 await page.goto('/?view=library');
 await page.evaluate(async data=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('leseraum-local-v2',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(data,'reader');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
 },{...EMPTY_SNAPSHOT,notes:items} satisfies LocalSnapshot);
 await page.reload();await page.getByRole('button',{name:'Meine Notizen',exact:true}).click();
 await expect(page.locator('.note-card')).toHaveCount(items.length);
}
test('work, search, color and reset filters combine; removing the last entry keeps its work selectable',async({page},testInfo)=>{
 await seed(page);const work=page.getByRole('combobox',{name:'Notizen nach Werk filtern'});
 for(const select of await page.locator('.notebook-page select').all())expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(work).toBeVisible();await expect(work.getByRole('option',{name:/Iphigenie auf Tauris · 2/})).toHaveCount(1);
 await work.selectOption('iphigenie');await expect(page.locator('.note-card')).toHaveCount(2);
 await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('  Natur  ');await expect(page.locator('.note-card')).toHaveCount(1);
 await page.getByRole('combobox',{name:'Nach Markierungsfarbe filtern'}).selectOption('blue');await expect(page.locator('.note-card')).toHaveCount(0);
 await expect(page.getByText('Ändere die Suche oder setze die Filter zurück, um deine Einträge wieder anzuzeigen.')).toBeVisible();
 await page.getByRole('button',{name:'Filter zurücksetzen',exact:true}).click();await expect(page.locator('.note-card')).toHaveCount(3);await expect(work).toHaveValue('all');
 await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('Goethe');await expect(page.locator('.note-card')).toHaveCount(3);
 await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('');await work.selectOption('iphigenie');await page.getByRole('combobox',{name:'Nach Markierungsbedeutung filtern'}).selectOption('Stilmittel');
 await work.selectOption('faust');await expect(page.getByRole('combobox',{name:'Nach Markierungsbedeutung filtern'})).toHaveValue('all');await expect(page.locator('.note-card')).toHaveCount(1);
 await page.screenshot({path:testInfo.outputPath('notebook-work-filter.png')});
 await page.getByRole('button',{name:'Notiz löschen',exact:true}).click();await expect(page.locator('.note-card')).toHaveCount(0);await expect(work).toHaveValue('faust');await expect(work.getByRole('option',{name:'Faust I · 0',exact:true})).toHaveCount(1);
 await page.getByRole('button',{name:'Rückgängig',exact:true}).click();await expect(page.locator('.note-card')).toHaveCount(1);
});
test('opening a note and returning keeps filters, scroll and an unsaved correction',async({page})=>{
 const many=Array.from({length:18},(_,i)=>note('study-'+i,iphigenie,'Studie zur Natur '+i,'green','Stilmittel'));
 await seed(page,[...notes,...many]);
 await page.getByRole('combobox',{name:'Notizen nach Werk filtern'}).selectOption('iphigenie');await page.getByRole('combobox',{name:'Nach Markierungsfarbe filtern'}).selectOption('green');
 await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('Studie');await expect(page.locator('.note-card')).toHaveCount(18);
 await page.locator('.note-open').last().scrollIntoViewIfNeeded();const scroll=await page.evaluate(()=>window.scrollY);
 await page.locator('.note-open').last().click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Meine noch ungespeicherte Korrektur');
 await page.goBack();await expect(page.getByRole('heading',{name:'Meine Notizen',exact:true})).toBeVisible();await expect(page.locator('.reader-workspace')).toHaveCount(0);
 await expect(page.getByRole('combobox',{name:'Notizen nach Werk filtern'})).toHaveValue('iphigenie');await expect(page.getByRole('textbox',{name:'Notizen durchsuchen'})).toHaveValue('Studie');await expect(page.locator('.note-card')).toHaveCount(18);
 await expect.poll(async()=>Math.abs(await page.evaluate(()=>window.scrollY)-scroll)).toBeLessThan(8);
 await page.locator('.note-open').last().click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Meine noch ungespeicherte Korrektur');
});
test('newer navigation and cancel win over delayed book responses',async({page})=>{
 await page.goto('/?view=library');let release!:()=>void;let finished!:()=>void;let completed=new Promise<void>(resolve=>finished=resolve);
 await page.route('**/api/books/faust',async route=>{await new Promise<void>(resolve=>release=resolve);await route.fulfill({json:{book:faust}}).catch(()=>{});finished();});
 const requested=page.waitForRequest('**/api/books/faust');await page.getByRole('button',{name:'Faust I – öffnen',exact:true}).click();await requested;
 await expect(page.getByRole('button',{name:'Öffnen des Werkes abbrechen',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Meine Notizen',exact:true}).click();release();await completed;
 await expect(page.getByRole('heading',{name:'Meine Notizen',exact:true})).toBeVisible();await expect(page.locator('.loading-overlay,.reader-workspace')).toHaveCount(0);await expect(page).toHaveURL(/view=notes/);
 await page.getByRole('button',{name:'Bibliothek',exact:true}).click();completed=new Promise<void>(resolve=>finished=resolve);
 const again=page.waitForRequest('**/api/books/faust');await page.getByRole('button',{name:'Faust I – öffnen',exact:true}).click();await again;
 await page.getByRole('button',{name:'Öffnen des Werkes abbrechen',exact:true}).click();release();await completed;
 await expect(page.getByRole('heading',{name:'Bibliothek',exact:true})).toBeVisible();await expect(page.locator('.loading-overlay,.reader-workspace')).toHaveCount(0);
});
