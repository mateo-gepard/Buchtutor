import {test,expect,type Page} from './reader-test';
import type {SavedNote} from '../../lib/reader-model';

const reader='/?work=iphigenie&section=s001&view=reader';
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
async function notebook(page:Page){await button(page,'Zur Bibliothek').click();await button(page,'Meine Notizen').click();}
async function storedOriginalInk(page:Page){
 return page.evaluate(()=>new Promise<string>((resolve,reject)=>{
  const open=indexedDB.open('leseraum-local-v2');open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{const db=open.result,request=db.transaction('state').objectStore('state').get('reader');request.onerror=()=>{db.close();reject(request.error);};request.onsuccess=()=>{const notes=request.result.notes as SavedNote[];resolve(JSON.stringify(notes.flatMap(note=>note.pencil?[{id:note.id,ink:note.pencil.ink,pageInk:note.pencil.pageInk,inkWidth:note.pencil.inkWidth,inkHeight:note.pencil.inkHeight}]:[])));db.close();};};
 }));
}
async function createDraft(page:Page,body:string){
 await page.goto(reader);await button(page,'Vers 9 auswählen').click();await button(page,'Notiz schreiben').click();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill(body);
}
test.beforeEach(async({context})=>{
 await context.route('**/api/analysis',route=>route.fulfill({status:503,json:{error:'Draft test: no model request.'}}));
 await context.route('**/api/handwriting',route=>route.fulfill({status:503,json:{error:'Draft test: no recognition request.'}}));
});

test('a deselected typed draft can be found after reload and completed from the notebook',async({page},testInfo)=>{
 const body='Unfertige These: Iphigenie fühlt sich trotz der Jahre noch fremd.';
 await createDraft(page,body);await expect(page.locator('.workspace-note-actions')).toContainText('Entwurf auf diesem Gerät gesichert');
 await button(page,'Lesehilfe schließen').click();await page.locator('[data-text]').nth(12).click();await expect(page.locator('.row-selected')).toHaveCount(0);
 await notebook(page);await page.reload();
 const draft=page.locator('.typed-note-draft');await expect(draft).toContainText(body);await expect(draft).toContainText('Doch immer bin ich, wie im ersten, fremd.');await expect(page.locator('.note-card')).toHaveCount(0);
 await page.screenshot({path:testInfo.outputPath('typed-draft-discovered.png')});
 await draft.getByRole('button',{name:/Notizentwurf weiterbearbeiten:/}).click();
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue(body);await expect(page.locator('.selection-excerpt')).toContainText('V. 9');
 await button(page,'Notiz speichern').click();await notebook(page);await expect(page.locator('.typed-note-draft')).toHaveCount(0);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText(body);
 await page.reload();await expect(page.locator('.note-card')).toContainText(body);
});

test('an edit draft survives deletion of its saved note and remains recoverable',async({page})=>{
 await createDraft(page,'Erste gespeicherte Fassung.');await button(page,'Notiz speichern').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Überarbeitete Fassung, deren Original versehentlich gelöscht wurde.');
 await notebook(page);await button(page,'Notiz löschen').click();await expect(page.locator('.note-card')).toHaveCount(0);await page.reload();
 const draft=page.locator('.typed-note-draft');await expect(draft).toContainText('Entwurf zu gelöschter Notiz');await expect(draft).toContainText('Überarbeitete Fassung');
 await draft.getByRole('button',{name:/Notizentwurf weiterbearbeiten:/}).click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Überarbeitete Fassung, deren Original versehentlich gelöscht wurde.');
 await button(page,'Notiz speichern').click();await notebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('Überarbeitete Fassung');
});

test('backup states that unfinished drafts are excluded and opens them for completion',async({page},testInfo)=>{
 await createDraft(page,'Dieser Entwurf braucht vor der Übertragung einen Abschluss.');await button(page,'Leseeinstellungen').first().click();await button(page,'Geräteübertragung').click();
 const warning=page.locator('.transfer-draft-warning');await expect(warning).toContainText('1 Entwurf ist nicht in der Sicherung enthalten.');await expect(warning).toContainText('Beim Löschen der Browserdaten gehen diese Entwürfe verloren.');
 await page.getByLabel('Passwort für die Sicherung').fill('Synthetische Sicherung 2026!');await page.getByLabel('Passwort wiederholen').fill('Synthetische Sicherung 2026!');const pending=page.waitForEvent('download');await button(page,'Sicherung herunterladen').click();await(await pending).saveAs(testInfo.outputPath('saved-entries-only.buchtutor'));await expect(page.locator('.success-note')).toContainText('1 Entwurf ist nicht enthalten.');
 await page.screenshot({path:testInfo.outputPath('backup-draft-boundary.png')});await button(page,'Entwürfe abschließen').click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.typed-note-draft')).toContainText('Dieser Entwurf braucht');
});

test('a draft held in memory after a storage failure remains reachable and can be saved',async({page})=>{
 await page.goto(reader);await button(page,'Vers 9 auswählen').click();await button(page,'Notiz schreiben').click();
 await page.evaluate(()=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key.startsWith('buchtutor-note-draft'))throw new DOMException('Synthetic draft quota failure','QuotaExceededError');return original.call(this,key,value);};
 });
 const body='Dieser Text ist nur im geöffneten Browser erhalten und braucht einen Abschluss.';
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill(body);await expect(page.locator('.workspace-note-actions')).toContainText('Entwurf konnte nicht vollständig gesichert werden');
 await notebook(page);const draft=page.locator('.typed-note-draft');await expect(draft).toContainText(body);await draft.getByRole('button',{name:/Notizentwurf weiterbearbeiten:/}).click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue(body);await button(page,'Notiz speichern').click();await notebook(page);await expect(page.locator('.note-card')).toContainText(body);await expect(page.locator('.typed-note-draft')).toHaveCount(0);
});

 test('saved note status remains clear after feedback closes and becomes editable again',async({page})=>{
  await createDraft(page,'Gespeicherter Gedanke zur Fremde.');await button(page,'Notiz speichern').click();
  await expect(page.locator('.workspace-note-actions')).toContainText('Gespeichert · auf diesem Gerät');
  await expect(button(page,'Gespeichert')).toBeDisabled();
  await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Überarbeiteter Gedanke zur Fremde.');
  await expect(page.locator('.workspace-note-actions')).toContainText('Entwurf auf diesem Gerät gesichert');
  await expect(button(page,'Notiz speichern')).toBeEnabled();await button(page,'Notiz speichern').click();
  await notebook(page);await page.reload();await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('Überarbeiteter Gedanke zur Fremde.');
 });

test('resuming one draft cannot replace another note draft at the same passage',async({page})=>{
 const field=()=>page.getByRole('textbox',{name:'Deine Notiz',exact:true});
 await createDraft(page,'These A: Fremde als Konflikt.');await button(page,'Notiz speichern').click();await expect(button(page,'Gespeichert')).toBeDisabled();
 await button(page,'Lesehilfe schließen').click();await page.locator('.annotation-marker').click();await button(page,'Notiz hinzufügen').click();await field().fill('These B: Heimat als Sehnsucht.');await button(page,'Notiz speichern').click();await expect(button(page,'Gespeichert')).toBeDisabled();await notebook(page);await expect(page.locator('.note-card')).toHaveCount(2);
 await page.locator('.note-card').filter({hasText:'These A: Fremde'}).locator('.note-open').click();await field().fill('Entwurf A: neuer Konfliktgedanke.');await notebook(page);
 await page.locator('.note-card').filter({hasText:'These B: Heimat'}).locator('.note-open').click();await field().fill('Entwurf B: neuer Heimatgedanke.');await notebook(page);await expect(page.locator('.typed-note-draft')).toHaveCount(2);
 await page.locator('.typed-note-draft').filter({hasText:'Entwurf A:'}).getByRole('button').click();await expect(field()).toHaveValue('Entwurf A: neuer Konfliktgedanke.');await notebook(page);
 await page.locator('.note-card').filter({hasText:'These B: Heimat'}).locator('.note-open').click();await expect(field()).toHaveValue('Entwurf B: neuer Heimatgedanke.');await button(page,'Notiz speichern').click();await expect(button(page,'Gespeichert')).toBeDisabled();await notebook(page);
 await expect(page.locator('.note-card')).toHaveCount(2);await expect(page.locator('.note-card').filter({hasText:'These A: Fremde'})).toHaveCount(1);await expect(page.locator('.note-card').filter({hasText:'Entwurf B: neuer Heimatgedanke.'})).toHaveCount(1);await expect(page.locator('.typed-note-draft')).toHaveCount(1);await expect(page.locator('.typed-note-draft')).toContainText('Entwurf A: neuer Konfliktgedanke.');
});

for(const order of ['mark-first','draft-first'] as const)test(`mark and draft order keeps one colored note after reload and resume: ${order}`,async({page})=>{
 const body=`Fremde und Heimat: ${order}`;
 await page.goto(reader);await button(page,'Vers 9 auswählen').click();
 if(order==='mark-first'){await button(page,'Ausgewählte Stellen markieren').click();await expect(page.locator('.saved-highlight')).toHaveCount(1);}
 await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill(body);await button(page,'Lesehilfe schließen').click();
 if(order==='draft-first'){await button(page,'Ausgewählte Stellen markieren').click();await expect(page.locator('.saved-highlight')).toHaveCount(1);}
 await notebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await page.reload();await page.locator('.typed-note-draft').getByRole('button').click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue(body);await button(page,'Notiz speichern').click();await expect(button(page,'Gespeichert')).toBeDisabled();await notebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText(body);await expect(page.locator('.note-card .note-type')).toContainText('Grün');await expect(page.locator('.typed-note-draft')).toHaveCount(0);
});

for(const resume of [false,true])test(`marking a new same-passage draft cannot overwrite an existing note: ${resume?'resume after reload':'save immediately'}`,async({page})=>{
 const field=()=>page.getByRole('textbox',{name:'Deine Notiz',exact:true});
 await createDraft(page,'Vorhandene These A muss unabhängig erhalten bleiben.');await button(page,'Notiz speichern').click();await expect(button(page,'Gespeichert')).toBeDisabled();await button(page,'Lesehilfe schließen').click();await page.locator('.annotation-marker').click();await button(page,'Notiz hinzufügen').click();await field().fill('Neue unabhängige These B zur selben Stelle.');await button(page,'Lesehilfe schließen').click();await button(page,'Ausgewählte Stellen markieren').click();await expect(page.locator('.saved-highlight')).toHaveCount(1);if(resume){await notebook(page);await page.reload();await page.locator('.typed-note-draft').getByRole('button').click();}else await button(page,'Notiz schreiben').click();await expect(field()).toHaveValue('Neue unabhängige These B zur selben Stelle.');await button(page,'Notiz speichern').click();await expect(button(page,'Gespeichert')).toBeDisabled();await notebook(page);await expect(page.locator('.note-card')).toHaveCount(2);await expect(page.locator('.note-card').filter({hasText:'Vorhandene These A'})).toHaveCount(1);await expect(page.locator('.note-card').filter({hasText:'Neue unabhängige These B'})).toHaveCount(1);await page.reload();await expect(page.locator('.note-card')).toHaveCount(2);
});

test('a pending Pencil original survives direct marking and both saves',async({page,context})=>{
 await context.addInitScript(()=>{localStorage.setItem('buchtutor-pencil-handwriting-hint-v1','1');localStorage.setItem('buchtutor-pencil-cloud-hint-v1','1');});
 await page.goto(reader);await button(page,'Vers 9 auswählen').click();await button(page,'Apple Pencil Modus').click();await button(page,'Markierungsfarbe wählen').click();await button(page,'Farbbedeutungen anpassen').click();await button(page,'Textauswahl übernehmen').click();await button(page,'Farbbedeutungen schließen').click();await button(page,'Auf der Seite schreiben').click();
 await page.locator('.pencil-text').evaluate(el=>{
  const root=el.getBoundingClientRect(),row=el.querySelector('.source-row.row-selected')?.getBoundingClientRect()??el.querySelectorAll('[data-block]')[9].getBoundingClientRect();
  for(const [type,x,y] of [['pointerdown',-25,4],['pointermove',-30,21],['pointerup',-10,15]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:905,clientX:root.left+x,clientY:row.top+y,pressure:.6}));
 });
 const ink=page.locator('[data-ink-group] path');await expect(ink).toHaveCount(1);const original=await ink.getAttribute('d');await button(page,'Lesemodus').click();await button(page,'Ausgewählte Stellen markieren').click();await expect(page.locator('.toast')).toContainText('Fertig');await button(page,'Apple Pencil Modus').click();await expect(ink).toHaveAttribute('d',original!);await button(page,'Fertig').click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);await notebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.saved-ink path')).toHaveCount(1);
});

test('resuming a new typed draft can reuse an empty saved mark without changing its original ink',async({page,context})=>{
 await context.addInitScript(()=>{localStorage.setItem('buchtutor-pencil-handwriting-hint-v1','1');localStorage.setItem('buchtutor-pencil-cloud-hint-v1','1');});
 await page.goto(reader);await button(page,'Vers 9 auswählen').click();await button(page,'Apple Pencil Modus').click();await button(page,'Markierungsfarbe wählen').click();await button(page,'Farbbedeutungen anpassen').click();await button(page,'Textauswahl übernehmen').click();await button(page,'Farbbedeutungen schließen').click();await button(page,'Auf der Seite schreiben').click();
 await page.locator('.pencil-text').evaluate(el=>{
  const root=el.getBoundingClientRect(),row=el.querySelector('.source-row.row-selected')?.getBoundingClientRect()??el.querySelectorAll('[data-block]')[9].getBoundingClientRect();
  for(const [type,x,y] of [['pointerdown',-25,4],['pointermove',-30,21],['pointerup',-10,15]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:906,clientX:root.left+x,clientY:row.top+y,pressure:.6}));
 });
 const original=await page.locator('[data-ink-group] path').getAttribute('d');await button(page,'Fertig').click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/prüfen/);const originalData=await storedOriginalInk(page);
 await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Zusätzlicher Gedanke zur dauerhaft gespeicherten Handschrift.');await button(page,'Lesehilfe schließen').click();await button(page,'Ausgewählte Stellen markieren').click();await notebook(page);await page.reload();await page.locator('.typed-note-draft').getByRole('button').click();await button(page,'Notiz speichern').click();await expect(button(page,'Gespeichert')).toBeDisabled();expect(await storedOriginalInk(page)).toBe(originalData);await button(page,'Lesehilfe schließen').click();await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);await notebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('Zusätzlicher Gedanke zur dauerhaft gespeicherten Handschrift.');await expect(page.locator('.saved-ink path')).toHaveCount(1);
});
