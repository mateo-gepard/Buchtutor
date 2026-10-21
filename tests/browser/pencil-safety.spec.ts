import {test,expect,useLocalHandwriting,type Page} from './reader-test';
const reader='/?work=iphigenie&section=s001&view=reader';
test.beforeEach(async({context,page})=>{
 await useLocalHandwriting(context);
 await context.addInitScript(()=>{localStorage.setItem('buchtutor-pencil-handwriting-hint-v1','1');localStorage.setItem('buchtutor-pencil-cloud-hint-v1','1');});
 await page.route('**/api/handwriting',()=>{throw new Error('Offline safety tests never call handwriting providers');});
 await page.goto(reader);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
});
async function mark(page:Page){
 await page.locator('[data-text]').first().evaluate(el=>{
  const range=document.createRange();range.selectNodeContents(el);const r=range.getClientRects()[0];
  for(const [type,x] of [['pointerdown',r.left+2],['pointermove',r.left+50],['pointerup',r.left+50]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:701,pointerType:'pen',clientX:x,clientY:r.top+r.height/2,pressure:.5}));
 });
 await expect(page.locator('.saved-highlight')).toHaveCount(1);
}
async function ink(page:Page,ending='pointerup'){
 await page.locator('.pencil-text').evaluate((el,ending)=>{
  const r=el.getBoundingClientRect(),line=el.querySelector('[data-block]')!.getBoundingClientRect(),scale=Number(el.closest('[data-document-scale]')!.getAttribute('data-document-scale'));
  for(const [type,x,y] of [['pointerdown',-25,4],['pointermove',-30,21],['pointermove',-15,25],[ending,-10,15]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:702,pointerType:'pen',clientX:r.left+x*scale,clientY:line.top+y*scale,pressure:.6}));
 },ending);
}
test('an in-flight stroke is checkpointed before pointerup and pagehide commits its last points once',async({page})=>{
 await mark(page);await ink(page,'pointermove');
 const partial=await page.evaluate(()=>{
  const name=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-active:'))!;
  const record=JSON.parse(localStorage.getItem(name)!);
  window.dispatchEvent(new Event('pagehide'));
  const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-draft:'))!;
  return {checkpoint:record.group.strokes[0].points,draft:JSON.parse(localStorage.getItem(key)!)};
 });
 expect(partial.checkpoint.length).toBeGreaterThan(0);expect(partial.draft.groups[0].strokes[0].points).toHaveLength(4);
 await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
 const path=await page.locator('[data-ink-group] path').getAttribute('d');
 await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.locator('[data-ink-group] path')).toHaveCount(1);await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',path!);
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveCount(1);
});
test('a malformed main draft recovers from its valid journal without deleting the damaged original',async({page})=>{
 await mark(page);await ink(page);
 const path=await page.locator('[data-ink-group] path').getAttribute('d');
 await page.evaluate(()=>{const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-draft:'))!;localStorage.setItem(key,'{"version":2,"entries":');});
 await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',path!);await expect(page.locator('.saved-highlight')).toHaveCount(1);
 expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.endsWith(':unreadable')&&localStorage.getItem(key)==='{"version":2,"entries":'))).toBe(true);
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
});
test('writing at document zoom stores the same document coordinates and erases through scaled geometry',async({page})=>{
 await mark(page);await page.getByRole('button',{name:'Dokumentzoom',exact:true}).click();
 for(let i=0;i<4;i++)await page.getByRole('button',{name:'Dokument vergrößern',exact:true}).click();
 await page.getByRole('button',{name:'Dokumentzoom schließen',exact:true}).click();
 await ink(page);await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
 const path=await page.locator('[data-ink-group] path').getAttribute('d');
 const point=await page.evaluate(()=>{const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-draft:'))!;return JSON.parse(localStorage.getItem(key)!).groups[0].strokes[0].points[0];});expect(point.x).toBeCloseTo(-25,1);expect(point.y).toBeCloseTo(4,1);
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await page.reload();
 await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',path!);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.getByRole('button',{name:'Dokumentzoom',exact:true}).click();for(let i=0;i<2;i++)await page.getByRole('button',{name:'Dokument vergrößern',exact:true}).click();await page.getByRole('button',{name:'Dokumentzoom schließen',exact:true}).click();
 await page.getByRole('button',{name:'Radiergummi',exact:true}).click();await ink(page);
 await expect(page.locator('[data-ink-group] path')).toHaveCount(0);await expect(page.locator('.saved-highlight')).toHaveCount(1);
 await page.getByRole('button',{name:'Letzten Strich entfernen',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',path!);
});

test('equally near overlapping marks require an explicit association and preserve original handwriting',async({page})=>{
 await mark(page);
 await page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true}).click();await page.getByRole('button',{name:'Blau: Interpretationsansatz',exact:true}).click();await mark(page);
 await ink(page);await expect(page.locator('.pencil-ink-label')).toHaveText('Markierung wählen');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-error')).toContainText('noch nicht eindeutig zugeordnet');
 const original=await page.locator('[data-ink-group] path').getAttribute('d');
 await page.getByRole('button',{name:'Zuordnung prüfen',exact:true}).click();
 const choice=page.getByRole('combobox',{name:'Markierung für Handschrift 1',exact:true}),values=await choice.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value).filter(Boolean));expect(values).toHaveLength(2);
 await choice.selectOption(values[1]);await page.getByRole('button',{name:'Farbbedeutungen schließen',exact:true}).click();
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
 await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
});

test('changing view during a stroke flushes the complete captured stroke before unmount',async({page})=>{
 await mark(page);await ink(page,'pointermove');
 await page.getByRole('button',{name:'Zur Bibliothek',exact:true}).evaluate(el=>(el as HTMLElement).click());
 await expect(page.locator('.pencil-text')).toHaveCount(0);
 const points=await page.evaluate(()=>{const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-draft:'))!;return JSON.parse(localStorage.getItem(key)!).groups[0].strokes[0].points;});
 expect(points).toHaveLength(4);
 await page.goto(reader);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
});

for(const existing of [false,true])test(`replaying a committed draft never duplicates original ink (${existing?'existing mark':'new mark'})`,async({page})=>{
 await mark(page);
 if(existing){await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();}
 await ink(page);
 const draft=await page.evaluate(()=>{const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-draft:'))!;return {key,raw:localStorage.getItem(key)!};});
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 const original=await page.locator('[data-ink-saved=true] path').getAttribute('d');
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),draft);await page.reload();
 await expect(page.locator('[data-ink-group] path')).toHaveCount(1);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.locator('[data-ink-group] path')).toHaveCount(1);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
 const stored=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('leseraum-local-v2',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return await new Promise<{notes:{pencil:{ink:unknown[];pageInk:{strokes:unknown[]}[]}}[]}>((resolve,reject)=>{const request=db.transaction('state').objectStore('state').get('reader');request.onsuccess=()=>{db.close();resolve(request.result);};request.onerror=()=>reject(request.error);});});
 expect(stored.notes).toHaveLength(1);expect(stored.notes[0].pencil.ink).toHaveLength(1);expect(stored.notes[0].pencil.pageInk.flatMap(group=>group.strokes)).toHaveLength(1);
});

test('deleted notes restore marks and original handwriting after a complete reload',async({page})=>{
 await mark(page);await ink(page);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 const original=await page.locator('[data-ink-saved=true] path').getAttribute('d');
 await page.getByRole('button',{name:'Zur Bibliothek',exact:true}).click();await page.getByRole('button',{name:'Meine Notizen',exact:true}).click();
 await page.getByRole('button',{name:'Notiz löschen',exact:true}).click();await expect(page.locator('.note-card')).toHaveCount(0);
 await page.reload();await page.locator('.notebook-trash summary').click();await expect(page.locator('.notebook-trash')).toContainText('Originalhandschrift vorhanden');
 await page.getByRole('button',{name:'Eintrag wiederherstellen',exact:true}).click();await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.notebook-trash')).toHaveCount(0);
 await page.locator('.note-open').click();await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();await expect(page.locator('.saved-highlight')).toHaveCount(1);await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
 await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',original!);
});

test('opening settings completes an active stroke before the modal receives input',async({page})=>{
 await mark(page);await ink(page,'pointermove');
 await page.getByRole('button',{name:'Leseeinstellungen',exact:true}).first().evaluate(el=>(el as HTMLElement).click());
 await expect(page.getByRole('dialog')).toBeVisible();
 const points=await page.evaluate(()=>{const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-draft:'))!;return JSON.parse(localStorage.getItem(key)!).groups[0].strokes[0].points;});expect(points).toHaveLength(4);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
});

test('duplicated tabs keep separate recoverable handwriting branches through reload',async({page,context})=>{
 await mark(page);await ink(page);
 const originalWriter=await page.evaluate(()=>sessionStorage.getItem('buchtutor-pencil-tab'));
 const duplicate=await context.newPage();
 await duplicate.addInitScript(writer=>{if(!sessionStorage.getItem('buchtutor-pencil-tab'))sessionStorage.setItem('buchtutor-pencil-tab',writer!);},originalWriter);
 await duplicate.goto(reader);await duplicate.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(duplicate.locator('[data-ink-group] path')).toHaveCount(1);
 expect(await duplicate.evaluate(()=>sessionStorage.getItem('buchtutor-pencil-tab'))).not.toBe(originalWriter);
 await ink(duplicate);await ink(duplicate);await expect(duplicate.locator('[data-ink-group] path')).toHaveCount(3);
 await ink(page);await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
 await duplicate.reload();await duplicate.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await expect(duplicate.locator('[data-ink-group] path')).toHaveCount(3);
 await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
 await duplicate.close();
});

test('duplicating a live stroke preserves the parent checkpoint without reusing its stroke ID',async({page,context})=>{
 await mark(page);await ink(page,'pointermove');
 const source=await page.evaluate(()=>{const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-active:'))!;return {writer:sessionStorage.getItem('buchtutor-pencil-tab'),key,raw:localStorage.getItem(key)!,stroke:JSON.parse(localStorage.getItem(key)!).group.strokes[0]};});
 const duplicate=await context.newPage();
 await duplicate.addInitScript(writer=>{if(!sessionStorage.getItem('buchtutor-pencil-tab'))sessionStorage.setItem('buchtutor-pencil-tab',writer!);},source.writer);
 await duplicate.goto(reader);await duplicate.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await expect(duplicate.locator('[data-ink-group] path')).toHaveCount(1);
 const recovered=await duplicate.evaluate(()=>{const writer=sessionStorage.getItem('buchtutor-pencil-tab')!;const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-recovery:')&&key.endsWith(':'+writer))!;return JSON.parse(localStorage.getItem(key)!).draft.groups[0].strokes[0];});
 expect(recovered.id).not.toBe(source.stroke.id);expect(recovered.points).toEqual(source.stroke.points);
 expect(await duplicate.evaluate(key=>localStorage.getItem(key),source.key)).toBe(source.raw);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
 const completed=await page.evaluate(()=>{const writer=sessionStorage.getItem('buchtutor-pencil-tab')!;const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-recovery:')&&key.endsWith(':'+writer))!;return JSON.parse(localStorage.getItem(key)!).draft.groups[0].strokes[0];});
 expect(completed.id).toBe(source.stroke.id);expect(completed.points).toHaveLength(4);
 await duplicate.close();
});
