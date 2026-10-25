import {test,expect,type Page} from './reader-test';
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
async function notebook(page:Page){await button(page,'Zur Bibliothek').click();await button(page,'Meine Notizen').click();}
test.beforeEach(async({page})=>{
 await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());
 await page.goto('/?work=iphigenie&section=s001&view=reader');await expect(page.locator('.reader-bookmark')).toBeEnabled();
});
test('text highlighting saves immediately, deduplicates and shares its typed note',async({page},testInfo)=>{
 await button(page,'Vers 9 auswählen').click();await button(page,'Ausgewählte Stellen markieren').click();
 await expect(page.locator('.toast')).toContainText('Markierung auf diesem Gerät gespeichert');await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await button(page,'Ausgewählte Stellen markieren').click();await button(page,'Notiz schreiben').click();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Fremdsein als Leitmotiv.');await button(page,'Notiz speichern').click();
 await notebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('Fremdsein als Leitmotiv.');await expect(page.locator('.notebook-drafts')).toHaveCount(0);
 await page.reload();await page.locator('.note-open').click();await button(page,'Lesehilfe schließen').click();await page.locator('.saved-highlight').click();
 await expect(page.locator('.annotation-body')).toHaveText('Fremdsein als Leitmotiv.');await expect(page.locator('.attached-annotations .note-card')).toHaveCount(0);
 if(page.viewportSize()!.width>=1000)expect((await page.locator('.assistant-panel').boundingBox())!.height).toBeLessThan(320);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('direct-highlight-note.png')});
});
test('highlighting preserves an unfinished typed draft and reuses an existing saved note',async({page})=>{
 await button(page,'Vers 9 auswählen').click();await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Noch unvollständiger Gedanke.');await button(page,'Lesehilfe schließen').click();
 await button(page,'Ausgewählte Stellen markieren').click();await expect(page.locator('.toast')).toContainText('Markierung auf diesem Gerät gespeichert');await button(page,'Notiz schreiben').click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Noch unvollständiger Gedanke.');await button(page,'Notiz speichern').click();
 await button(page,'Lesehilfe schließen').click();await button(page,'Ausgewählte Stellen markieren').click();await notebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.typed-note-draft')).toHaveCount(0);
});
test('failed direct marking keeps the selection and succeeds when device storage recovers',async({page})=>{
 await button(page,'Vers 9 auswählen').click();
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as unknown as {restoreWrites:()=>void}).restoreWrites=()=>{IDBDatabase.prototype.transaction=original;};IDBDatabase.prototype.transaction=function(...args:Parameters<IDBDatabase['transaction']>){const tx=original.apply(this,args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};});
 await button(page,'Ausgewählte Stellen markieren').click();await expect(page.locator('.toast')).toContainText('Nicht gespeichert');await expect(page.locator('.row-selected')).toHaveCount(1);await expect(page.locator('.saved-highlight')).toHaveCount(0);
 await page.evaluate(()=>(window as unknown as {restoreWrites:()=>void}).restoreWrites());await button(page,'Ausgewählte Stellen markieren').click();await expect(page.locator('.toast')).toContainText('Markierung auf diesem Gerät gespeichert');await page.reload();await expect(page.locator('.saved-highlight')).toHaveCount(1);
});
