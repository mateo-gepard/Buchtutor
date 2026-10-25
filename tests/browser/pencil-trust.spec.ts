import {test,expect,useLocalHandwriting,type Page} from './reader-test';
import type {SavedNote} from '../../lib/reader-model';

const reader='/?work=iphigenie&section=s001&view=reader';
const safari='Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
test.use({userAgent:safari,hasTouch:true});
test.beforeEach(async({context,page})=>{
 await useLocalHandwriting(context);
 await context.addInitScript(()=>{
  localStorage.setItem('buchtutor-pencil-handwriting-hint-v1','1');
  localStorage.setItem('buchtutor-pencil-cloud-hint-v1','1');
 });
 // Every provider endpoint is intercepted, including when a regression enables
 // recognition unexpectedly. These journeys must never make a paid request.
 await page.route('**/api/analysis',route=>route.fulfill({status:503,json:{error:'Test: Analyse nicht verfügbar.'}}));
 await page.route('**/api/handwriting',route=>route.fulfill({status:503,json:{error:'Test: Erkennung nicht verfügbar.'}}));
 await page.goto(reader);
 await expect(page.locator('[data-text]').first()).toContainText('Heraus');
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.getByRole('button',{name:'Fertig',exact:true})).toBeDisabled();
});

async function mark(page:Page){
 await page.locator('[data-text]').first().evaluate(el=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,range=document.createRange();
  range.setStart(node,1);range.setEnd(node,5);const box=range.getBoundingClientRect();
  for(const [type,x] of [['pointerdown',box.left],['pointermove',box.right],['pointerup',box.right]] as const)
   el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:901,clientX:x,clientY:box.top+box.height/2,buttons:type==='pointerup'?0:1}));
 });
 await expect(page.locator('.saved-highlight')).toHaveCount(1);
}

async function writeStroke(page:Page,offset=0){
 const count=await page.locator('[data-ink-group] path').count();
 await page.locator('.pencil-text').evaluate((el,offset)=>{
  const box=el.getBoundingClientRect(),line=el.querySelector('[data-block]')!.getBoundingClientRect();
  for(const [type,x,y] of [['pointerdown',-30,4],['pointermove',-36,21],['pointerup',-18,27]] as const)
   el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:902,clientX:box.left+x+offset,clientY:line.top+y,pressure:.7,buttons:type==='pointerup'?0:1}));
 },offset);
 await expect(page.locator('[data-ink-group] path')).toHaveCount(count+1);
}

async function localNotes(page:Page){
 return page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   const request=indexedDB.open('leseraum-local-v2',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  return await new Promise<SavedNote[]>((resolve,reject)=>{
   const request=db.transaction('state').objectStore('state').get('reader');
   request.onsuccess=()=>{db.close();resolve(request.result.notes);};request.onerror=()=>reject(request.error);
  });
 });
}

test('failed draft checkpoints stay visible and cannot be lost by leaving the reader',async({page})=>{
 await page.evaluate(()=>{
  const set=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(key.startsWith('buchtutor-pencil-'))throw new DOMException('Test: draft quota exceeded','QuotaExceededError');
   return set.call(this,key,value);
  };
 });
 await mark(page);await writeStroke(page);
 const body='Würde und Freiheit bleiben trotz vollem Entwurfsspeicher erhalten.';
 await page.getByRole('textbox',{name:'Notiz zu V. 1',exact:true}).fill(body);
 const original=await page.locator('[data-ink-group] path').getAttribute('d');
 const warning=page.locator('[role="alert"],[role="status"]').filter({hasText:/Nicht gespeichert|Entwurf.*nicht.*gesichert/i}).first();
 await expect(warning).toBeVisible();
 await page.getByRole('button',{name:'Rückgängig',exact:true}).click();
 await page.getByRole('button',{name:'Wiederholen',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Notiz zu V. 1',exact:true})).toHaveValue(body);
 await expect(warning).toBeVisible();
 await page.getByRole('button',{name:'Lesemodus',exact:true}).click();
 await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await expect(warning).toBeVisible();

 // Internal view and section changes used to unmount the only surviving copy.
 await page.getByRole('button',{name:'Zur Bibliothek',exact:true}).click();
 await expect(page.locator('.pencil-text')).toBeVisible();
 await expect(page.locator('[data-text]').first()).toContainText('Heraus');
 await expect(warning).toBeVisible();
 await page.getByRole('button',{name:'Nächster Abschnitt',exact:true}).first().click();
 await expect(page.locator('[data-text]').first()).toContainText('Heraus');
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Notiz zu V. 1',exact:true})).toHaveValue(body);
 await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',original!);

 // IndexedDB still works: explicitly saving must recover the complete note,
 // rather than requiring draft-storage availability or dropping the ink.
 await page.getByRole('button',{name:'Fertig',exact:true}).click();
 await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await expect.poll(async()=>(await localNotes(page)).map(note=>note.body)).toEqual([body]);
 const before=(await localNotes(page))[0];
 expect(before.pencil?.ink).toHaveLength(1);
 expect(before.pencil?.pageInk?.flatMap(group=>group.strokes)).toHaveLength(1);
 await page.reload();
 await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
 const after=(await localNotes(page))[0];
 expect(after.body).toBe(body);expect(after.pencil?.ink).toEqual(before.pencil?.ink);expect(after.pencil?.pageInk).toEqual(before.pencil?.pageInk);
});

test('handwriting created before a mark has a direct path to saving its original stroke',async({page})=>{
 await page.getByRole('button',{name:'Auf der Seite schreiben',exact:true}).click();
 await writeStroke(page);const original=await page.locator('[data-ink-group] path').getAttribute('d');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();
 await expect(page.locator('.pencil-error')).toBeVisible();
 await page.getByRole('button',{name:'Textstelle markieren',exact:true}).click();
 await expect(page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.pencil-settings')).toHaveCount(0);
 await mark(page);
 await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',original!);
 await expect(page.locator('.pencil-ink-label')).toHaveText('↳ V. 1');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();
 await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
 const saved=(await localNotes(page))[0];
 expect(saved.pencil?.ink).toHaveLength(1);expect(saved.pencil?.pageInk?.flatMap(group=>group.strokes)).toHaveLength(1);
 await page.reload();
 await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
 expect((await localNotes(page))[0].pencil?.ink).toEqual(saved.pencil?.ink);
});

test('undo and redo restore an eraser gesture and a new stroke abandons redo',async({page})=>{
 await mark(page);await writeStroke(page);await writeStroke(page,22);
 const originals=await page.locator('[data-ink-group] path').evaluateAll(paths=>paths.map(path=>path.getAttribute('d')));
 await expect(page.getByRole('button',{name:'Wiederholen',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Radiergummi',exact:true}).click();
 await page.locator('.pencil-text').evaluate(el=>{
  const box=el.querySelector('[data-ink-group] path')!.getBoundingClientRect();
  for(const type of ['pointerdown','pointerup'])el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:903,clientX:box.left+box.width/2,clientY:box.top+box.height/2}));
 });
 await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
 await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',originals[1]!);
 await page.getByRole('button',{name:'Rückgängig',exact:true}).click();
 await expect.poll(()=>page.locator('[data-ink-group] path').evaluateAll(paths=>paths.map(path=>path.getAttribute('d')))).toEqual(originals);
 await expect(page.getByRole('button',{name:'Wiederholen',exact:true})).toBeInViewport();
 await page.getByRole('button',{name:'Wiederholen',exact:true}).click();
 await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',originals[1]!);
 await page.keyboard.press('Meta+z');
 await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
 await expect(page.getByRole('button',{name:'Wiederholen',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Auf der Seite schreiben',exact:true}).click();
 await writeStroke(page,44);
 await expect(page.getByRole('button',{name:'Wiederholen',exact:true})).toHaveCount(0);
 await page.keyboard.press('Meta+Shift+z');
 await expect(page.locator('[data-ink-group] path')).toHaveCount(3);
});

test('keyboard history respects text editing and cannot replay drafts into committed notes',async({page})=>{
 await mark(page);await writeStroke(page);
 const field=page.getByRole('textbox',{name:'Notiz zu V. 1',exact:true}),body='Eigene Formulierung bleibt erhalten.';
 await field.fill(body);
 // Synthetic key events have no native edit default. This verifies that the
 // document shortcut does not consume a text field's own undo command.
 const prevented=await field.evaluate(el=>{
  const event=new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'z',metaKey:true});el.dispatchEvent(event);return event.defaultPrevented;
 });
 expect(prevented).toBe(false);await expect(field).toHaveValue(body);
 await page.getByRole('button',{name:'Rückgängig',exact:true}).focus();
 await page.keyboard.press('Control+z');await expect(field).toHaveValue('');
 await page.keyboard.press('Meta+Shift+z');await expect(field).toHaveValue(body);
 const original=await page.locator('[data-ink-group] path').getAttribute('d');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();
 await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 const committed=await localNotes(page);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.getByRole('button',{name:'Rückgängig',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Wiederholen',exact:true})).toHaveCount(0);
 await page.keyboard.press('Meta+z');
 await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
 expect(await localNotes(page)).toEqual(committed);
});
