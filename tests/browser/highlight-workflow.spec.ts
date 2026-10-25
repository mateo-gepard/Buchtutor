import {test,expect,type Page} from './reader-test';
import {readFileSync} from 'node:fs';
import {EMPTY_SNAPSHOT} from '../../lib/local-model';
import {makeAnchor,type Book,type SavedNote} from '../../lib/reader-model';

const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
const book=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book,section=book.sections[0];
const line=section.blocks.find(block=>block.kind==='verse')!;
const saved:SavedNote={id:'10000000-0000-4000-a000-000000000001',workId:book.id,editionId:book.editionId,anchor:makeAnchor(section,line.id),kind:'note',body:'Meine unveränderte Deutung.',pencil:{color:'green',meaning:'Stilmittel',ink:[[{x:10,y:20,pressure:.5},{x:30,y:40,pressure:.8}]],transcript:'Original',transcription:'recognized'},createdAt:'2026-10-25T00:00:00.000Z',updatedAt:'2026-10-25T00:00:00.000Z'};
async function stored(page:Page){return page.evaluate(async()=>new Promise<SavedNote[]>((resolve,reject)=>{const open=indexedDB.open('leseraum-local-v2');open.onsuccess=()=>{const db=open.result,tx=db.transaction('state','readonly'),r=tx.objectStore('state').get('reader');r.onsuccess=()=>{resolve(r.result.notes);db.close();};r.onerror=()=>reject(r.error);};}));}
async function seed(page:Page){
 await page.evaluate(async snapshot=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('leseraum-local-v2');open.onsuccess=()=>{const db=open.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(snapshot,'reader');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),{...EMPTY_SNAPSHOT,notes:[saved]});
 await page.reload();await expect(page.locator('.saved-highlight')).toBeVisible();
}
test.beforeEach(async({page})=>{
 await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());
 await page.goto('/?work=iphigenie&section=s001&view=reader');await expect(page.locator('.reader-bookmark')).toBeEnabled();
});

test('active tools toggle off without throwing away a selected passage or its draft',async({page})=>{
 const choose=button(page,'Bereich durch Antippen auswählen'),pencil=button(page,'Apple Pencil Modus');
 await choose.click();await button(page,'Vers 2 auswählen').click();await choose.click();
 await expect(choose).toHaveAttribute('aria-pressed','false');await expect(page.locator('.row-selected')).toHaveCount(1);
 await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Gedanke bleibt beim Werkzeugwechsel.');await button(page,'Lesehilfe schließen').click();
 await pencil.click();await expect(pencil).toHaveAttribute('aria-pressed','true');await pencil.click();await expect(pencil).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('.row-selected')).toHaveCount(1);await button(page,'Notiz schreiben').click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Gedanke bleibt beim Werkzeugwechsel.');
});

test('selection colors and saved feedback work without Pencil or duplicate entries',async({page},testInfo)=>{
 await button(page,'Vers 3 auswählen').click();await button(page,'Auswahloptionen').click();await button(page,'Blau: Interpretationsansatz').click();await page.keyboard.press('Escape');
 const mark=button(page,'Ausgewählte Stellen markieren');await expect(mark).toHaveAttribute('data-marked','false');await mark.click();await expect(mark).toHaveAttribute('data-marked','true');await expect(mark).toContainText('Markiert');await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Ein einzelner Eintrag.');await button(page,'Notiz speichern').click();await button(page,'Lesehilfe schließen').click();
 await button(page,'Auswahloptionen').click();await button(page,'Violett: Offene Frage').click();await page.keyboard.press('Escape');await expect(mark).toHaveAttribute('data-marked','false');await mark.click();await expect(mark).toHaveAttribute('data-marked','true');
 const notes=await stored(page);expect(notes).toHaveLength(1);expect(notes[0].pencil?.color).toBe('purple');expect(notes[0].body).toBe('Ein einzelner Eintrag.');
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('selection-feedback.png')});
});

test('empty highlights lead straight into the same note and back to a focused inspector',async({page},testInfo)=>{
 await button(page,'Vers 1 auswählen').click();await button(page,'Ausgewählte Stellen markieren').click();await page.locator('.saved-highlight').click();
 await expect(page.locator('.assistant-panel .companion-tabs')).toHaveCount(0);await expect(page.locator('[data-annotation-active=true]')).toHaveCount(1);
 await page.getByRole('button',{name:'Notiz hinzufügen Direkt zu dieser Markierung',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'Deine Notiz',exact:true});await expect(editor).toBeFocused();await editor.fill('Eine Notiz ohne Umwege.');await button(page,'Notiz speichern').click();await button(page,'Zur Markierung').click();
 await expect(page.locator('.annotation-body')).toHaveText('Eine Notiz ohne Umwege.');expect(await stored(page)).toHaveLength(1);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('focused-inspector.png')});
 await page.locator('.saved-highlight').click();await expect(page.locator('.assistant-panel')).toBeHidden();await expect(page.locator('[data-annotation-active=true]')).toHaveCount(0);
});

test('recoloring an existing annotation preserves its original ink, text and identity after reload',async({page},testInfo)=>{
 await seed(page);await page.locator('.saved-highlight').click();await button(page,'Farbe der Markierung ändern').click();await button(page,'Rosa: Figuren & Beziehungen').click();await expect(page.locator('.toast')).toContainText('Markierungsfarbe gespeichert');
 const notes=await stored(page);expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject({id:saved.id,body:saved.body,pencil:{...saved.pencil,color:'pink',meaning:'Figuren & Beziehungen'}});
 await page.reload();await page.locator('.saved-highlight').click();await expect(page.locator('.annotation-body')).toHaveText(saved.body+'\nOriginal');await expect(button(page,'Farbe der Markierung ändern')).toContainText('Figuren & Beziehungen');await expect(page.locator('.saved-ink path')).toHaveCount(1);
 await button(page,'Farbe der Markierung ändern').click();await page.screenshot({animations:'disabled',path:testInfo.outputPath('saved-color-picker.png')});
});

test('a failed color change is not reported as saved and leaves the original available',async({page})=>{
 await seed(page);await page.locator('.saved-highlight').click();await button(page,'Farbe der Markierung ändern').click();
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as unknown as {restoreWrites:()=>void}).restoreWrites=()=>{IDBDatabase.prototype.transaction=original;};IDBDatabase.prototype.transaction=function(...args:Parameters<IDBDatabase['transaction']>){const tx=original.apply(this,args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};});
 await button(page,'Blau: Interpretationsansatz').click();await expect(page.locator('.toast')).toContainText('Nicht gespeichert');expect((await stored(page))[0]).toEqual(saved);await expect(button(page,'Grün: Stilmittel')).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>(window as unknown as {restoreWrites:()=>void}).restoreWrites());await button(page,'Blau: Interpretationsansatz').click();await expect(page.locator('.toast')).toContainText('Markierungsfarbe gespeichert');expect((await stored(page))[0].pencil?.color).toBe('blue');
});

test('saved highlights can be opened and dismissed with a keyboard',async({page})=>{
 await seed(page);const highlight=page.locator('.saved-highlight');await highlight.focus();await highlight.press('Enter');await expect(page.locator('.annotation-body')).toHaveText(saved.body+'\nOriginal');await expect(highlight).toHaveAttribute('aria-expanded','true');
 await highlight.focus();await highlight.press('Space');await expect(page.locator('.assistant-panel')).toBeHidden();await expect(highlight).toHaveAttribute('aria-expanded','false');
});
