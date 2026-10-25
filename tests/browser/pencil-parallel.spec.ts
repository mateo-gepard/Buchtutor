import {test,expect,useLocalHandwriting,type Page} from './reader-test';
import type {SavedNote} from '../../lib/reader-model';
const reader='/?work=iphigenie&section=s001&view=reader';
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});

test.beforeEach(async({page,context})=>{
 await useLocalHandwriting(context);
 await context.addInitScript(()=>{
  localStorage.setItem('buchtutor-pencil-handwriting-hint-v1','1');
  localStorage.setItem('buchtutor-pencil-cloud-hint-v1','1');
 });
 await page.route('**/api/analysis',route=>route.fulfill({status:503,json:{error:'Synthetischer Test.'}}));
 await page.route('**/api/handwriting',route=>route.fulfill({status:503,json:{error:'Test: Erkennung nicht verfügbar. Original gespeichert.'}}));
 await page.goto(reader);await expect(page.locator('.reader-bookmark')).toBeEnabled();await button(page,'Apple Pencil Modus').click();
});
async function mark(page:Page){
 await page.locator('[data-text]').first().evaluate(el=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,range=document.createRange();range.setStart(node,1);range.setEnd(node,6);const r=range.getBoundingClientRect();
  for(const [type,x] of [['pointerdown',r.left],['pointermove',r.right],['pointerup',r.right]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,isPrimary:true,pointerType:'pen',pointerId:1901,clientX:x,clientY:r.top+r.height/2,buttons:type==='pointerup'?0:1,pressure:.6}));
 });
 await expect(page.locator('.saved-highlight')).toHaveCount(1);
}
async function stroke(page:Page,offset=0,ending='pointerup'){
 await page.locator('.pencil-text').evaluate((el,{offset,ending})=>{
  const r=el.getBoundingClientRect(),line=el.querySelector('[data-block]')!.getBoundingClientRect(),scale=Number(el.closest('[data-document-scale]')!.getAttribute('data-document-scale'));
  for(const [type,x,y] of [['pointerdown',-28,3],['pointermove',-35,15],['pointermove',-24,25],[ending,-14,19]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,isPrimary:true,pointerType:'pen',pointerId:1902,clientX:r.left+(x+offset)*scale,clientY:line.top+y*scale,buttons:type==='pointerup'||type==='pointercancel'?0:1,pressure:.7}));
 },{offset,ending});
}
async function notes(page:Page){return page.evaluate(async()=>new Promise<SavedNote[]>((resolve,reject)=>{
 const open=indexedDB.open('leseraum-local-v2');open.onsuccess=()=>{const db=open.result,r=db.transaction('state').objectStore('state').get('reader');r.onsuccess=()=>{db.close();resolve(r.result.notes.filter((note:SavedNote)=>!note.deletedAt));};r.onerror=()=>reject(r.error);};open.onerror=()=>reject(open.error);
}));}
async function online(page:Page){
 await button(page,'Markierungsfarbe wählen').click();await button(page,'Farbbedeutungen anpassen').click();await page.getByRole('checkbox',{name:/Handschrift automatisch erkennen/}).check();await button(page,'Farbbedeutungen schließen').click();
}

test('tapping the eraser again restores writing or highlighting and keeps original strokes',async({page},info)=>{
 await mark(page);await button(page,'Auf der Seite schreiben').click();await stroke(page);
 const original=await page.locator('[data-ink-group] path').getAttribute('d');
 await button(page,'Radiergummi').click();await expect(button(page,'Radiergummi')).toHaveAttribute('aria-pressed','true');
 await button(page,'Radiergummi').click();await expect(button(page,'Auf der Seite schreiben')).toHaveAttribute('aria-pressed','true');await expect(button(page,'Radiergummi')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',original!);await button(page,'Radiergummi').dblclick();await expect(button(page,'Auf der Seite schreiben')).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('group',{name:'Radierer-Einstellungen',exact:true})).toHaveCount(0);await stroke(page,24);await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
 await button(page,'Markierungsfarbe wählen').click();await button(page,'Grün: Stilmittel').click();await button(page,'Radiergummi').click();await button(page,'Radiergummi').click();await expect(button(page,'Markierungsfarbe wählen')).toHaveAttribute('aria-pressed','true');
 await button(page,'Apple Pencil Modus').click();await expect(page.locator('.pencil-draft-notice')).toContainText('Pencil-Entwurf gesichert');await button(page,'Apple Pencil Modus').click();await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
 await button(page,'Fertig').click();await page.reload();expect((await notes(page))[0].pencil?.ink).toHaveLength(2);await expect(page.locator('[data-ink-saved=true] path')).toHaveCount(2);
 await page.screenshot({animations:'disabled',path:info.outputPath('saved-originals.png')});
});

test('eraser cursor shows the actual scaled size, ignores fingers and closes with its tool',async({page},info)=>{
 const eraser=button(page,'Radiergummi');await eraser.focus();await eraser.press('ArrowDown');await expect(page.getByRole('group',{name:'Radierer-Einstellungen',exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Präziser Radierer/}).click();const size=page.getByRole('slider',{name:'Radierergröße',exact:true});await expect(size).toBeEnabled();
 await size.evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,'8');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});await size.dispatchEvent('pointerup');await expect(size).toBeEnabled();await button(page,'Radierer-Einstellungen schließen').click();await expect(eraser).toBeFocused();
 await button(page,'Ansicht einstellen').click();await button(page,'Dokument vergrößern').click();await button(page,'Dokument vergrößern').click();await button(page,'Ansicht schließen').click();
 await expect.poll(()=>page.locator('.pencil-text').evaluate(el=>el.getBoundingClientRect().width/(el as HTMLElement).offsetWidth)).toBeCloseTo(1.5,2);
 await page.mouse.move(20,40);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const point=await page.locator('.pencil-text').evaluate(el=>{
  const root=el.getBoundingClientRect(),row=el.querySelector('[data-block]')!.getBoundingClientRect(),x=Math.round(Math.max(80,root.left+80)),y=Math.round(row.top+12);
  return {x,y,scale:Number(el.closest('[data-document-scale]')!.getAttribute('data-document-scale'))};
 });
 const pen=info.project.use.browserName==='webkit';
 if(pen){for(const type of ['pointerdown','pointermove'])await page.locator('.pencil-text').dispatchEvent(type,{pointerType:'pen',pointerId:1903,isPrimary:true,buttons:1,clientX:point.x,clientY:point.y});}else await page.mouse.move(point.x,point.y);
 const cursor=page.locator('.pencil-eraser-cursor');await expect(cursor).toBeVisible();const rect=(await cursor.boundingBox())!;
 expect(rect.x+rect.width/2).toBeCloseTo(point.x,0);expect(rect.y+rect.height/2).toBeCloseTo(point.y,0);
 // Browser bounding boxes differ in whether they include the visible outline.
 // Measure the circle geometry through its real screen transform instead.
 const diameter=await cursor.evaluate(el=>{const circle=el as SVGCircleElement;return circle.getBBox().width*circle.getScreenCTM()!.a;});expect(diameter).toBeCloseTo(8*point.scale,0);
 await page.screenshot({animations:'disabled',path:info.outputPath('precise-eraser-cursor.png')});
 if(pen)await page.locator('.pencil-text').dispatchEvent('pointercancel',{pointerType:'pen',pointerId:1903,isPrimary:true,clientX:point.x,clientY:point.y});
 await page.locator('.pencil-text').dispatchEvent('pointermove',{pointerType:'touch',pointerId:1904,clientX:point.x,clientY:point.y});await expect(cursor).toBeHidden();
 await eraser.click();await expect(eraser).toHaveAttribute('aria-pressed','false');await expect(cursor).toBeHidden();
});

test('an interrupted stroke is retained with a calm dismissible notice through tool switches and reload',async({page},info)=>{
 await mark(page);await stroke(page,0,'pointercancel');await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
 const original=await page.locator('[data-ink-group] path').getAttribute('d');const feedback=page.locator('.pencil-feedback');
 await expect(feedback).toHaveAttribute('role','status');await expect(feedback).toContainText('Strich unterbrochen');await expect(button(page,'Fertig')).toHaveAttribute('data-draft-unsafe','false');
 await page.screenshot({animations:'disabled',path:info.outputPath('interrupted-stroke-kept.png')});await button(page,'Pencil-Hinweis schließen').click();await expect(feedback).toHaveCount(0);
 await button(page,'Apple Pencil Modus').click();await button(page,'Apple Pencil Modus').click();await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',original!);
 await page.reload();await button(page,'Apple Pencil Modus').click();await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',original!);await button(page,'Fertig').click();await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
});

test('draft storage failure stays visible during writing and IndexedDB finish remains a recovery path',async({page},info)=>{
 await page.evaluate(()=>{const set=Storage.prototype.setItem;(window as unknown as {restoreDraftStorage:()=>void}).restoreDraftStorage=()=>{Storage.prototype.setItem=set;};Storage.prototype.setItem=function(key,value){if(key.startsWith('buchtutor-pencil-'))throw new DOMException('Synthetic full draft storage','QuotaExceededError');return set.call(this,key,value);};});
 await mark(page);await stroke(page);const original=await page.locator('[data-ink-group] path').getAttribute('d');
 const done=button(page,'Fertig');await expect(done).toHaveAttribute('data-draft-unsafe','true');await expect(done).toContainText('Fertig');await expect(page.locator('.pencil-feedback')).toHaveAttribute('role','alert');
 await button(page,'Markierungsfarbe wählen').click();await expect(done).toHaveAttribute('data-draft-unsafe','true');await page.keyboard.press('Escape');await expect(page.locator('.pencil-feedback')).toContainText('Nicht gespeichert');
 await button(page,'Rückgängig').click();await button(page,'Wiederholen').click();await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',original!);await expect(done).toHaveAttribute('data-draft-unsafe','true');
 await page.screenshot({animations:'disabled',path:info.outputPath('unsaved-draft-warning.png')});
 await done.click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);expect(await notes(page)).toHaveLength(1);expect((await notes(page))[0].pencil?.ink).toHaveLength(1);
 await page.evaluate(()=>(window as unknown as {restoreDraftStorage:()=>void}).restoreDraftStorage());await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
});

test('failed final storage never reports success and keeps a complete retryable original',async({page})=>{
 await mark(page);await stroke(page);const original=(await page.locator('[data-ink-group] path').getAttribute('d'))!;
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;(window as unknown as {restoreWrites:()=>void}).restoreWrites=()=>{IDBObjectStore.prototype.put=put;};IDBObjectStore.prototype.put=function(){throw new DOMException('Synthetic device write failure','QuotaExceededError');};});
 await button(page,'Fertig').click();await expect(page.locator('.pencil-feedback')).toContainText('Nicht gespeichert');await expect(page.locator('.pencil-workspace')).toBeVisible();await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',original);expect(await notes(page)).toHaveLength(0);await expect(page.locator('.toast').filter({hasText:/auf diesem Gerät gespeichert/})).toHaveCount(0);
 await page.evaluate(()=>(window as unknown as {restoreWrites:()=>void}).restoreWrites());await button(page,'Fertig').click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await page.reload();expect(await notes(page)).toHaveLength(1);await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original);
});

test('finishing a second original while recognition is pending keeps the newer strokes and discards the stale result',async({page},info)=>{
 await online(page);await mark(page);await stroke(page);
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let calls=0;
 await page.route('**/api/handwriting',async route=>{calls++;if(calls===1)await gate;await route.fulfill({json:{text:calls===1?'Veralteter Suchtext':'Aktueller Suchtext für beide Striche',uncertain:false}});});
 await button(page,'Fertig').click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/wird erkannt/);await expect(page.locator('.toast')).toContainText('Originalhandschrift auf diesem Gerät gespeichert');await expect.poll(()=>calls).toBe(1);
 await button(page,'Apple Pencil Modus').click();await stroke(page,24);await button(page,'Fertig').click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);const pending=(await notes(page))[0];expect(pending.pencil?.ink).toHaveLength(2);expect(pending.pencil?.transcription).toBe('pending');expect(calls).toBe(1);
 release();await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/Suchtext gespeichert/);const result=(await notes(page))[0];expect(calls).toBe(2);expect(result.body).toContain('Aktueller Suchtext');expect(result.body).not.toContain('Veralteter');expect(result.pencil?.pageInk).toEqual(pending.pencil?.pageInk);expect(result.pencil?.ink).toEqual(pending.pencil?.ink);expect(await notes(page)).toHaveLength(1);
 await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveCount(2);await page.screenshot({animations:'disabled',path:info.outputPath('recognized-originals-kept.png')});
});

test('a lost recognition connection keeps the local original available without automatic paid retries',async({page})=>{
 await online(page);await mark(page);await stroke(page);let calls=0;await page.route('**/api/handwriting',route=>{calls++;return route.abort('internetdisconnected');});
 const original=await page.locator('[data-ink-group] path').getAttribute('d');await button(page,'Fertig').click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/prüfen/);expect(calls).toBe(1);const saved=(await notes(page))[0];expect(saved.pencil?.transcription).toBe('failed');expect(saved.pencil?.ink).toHaveLength(1);
 await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);await page.locator('.annotation-marker').click();await expect(page.getByText('Keine Verbindung zur Schrifterkennung. Dein Original ist gespeichert.',{exact:true})).toBeVisible();await expect(button(page,'Erneut erkennen')).toBeVisible();expect(calls).toBe(1);
});
