import {test,expect,useLocalHandwriting,type Page} from './reader-test';

const safari='Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const reader='/?work=iphigenie&section=s001&view=reader';
test.use({userAgent:safari,hasTouch:true});
test.beforeEach(async({context,page})=>{
 await useLocalHandwriting(context);
 await context.addInitScript(()=>localStorage.setItem('buchtutor-pencil-handwriting-hint-v1','1'));
 await context.addInitScript(()=>localStorage.setItem('buchtutor-pencil-cloud-hint-v1','1'));
 await page.route('**/api/handwriting',route=>route.fulfill({status:503,json:{error:'Test: Erkennung nicht verfügbar.'}}));
});
async function setup(page:Page){
 await page.goto(reader);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.locator('[data-text]').first().evaluate(el=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,range=document.createRange();range.setStart(node,1);range.setEnd(node,5);
  const r=range.getBoundingClientRect();
  for(const [type,x] of [['pointerdown',r.left],['pointermove',r.right],['pointerup',r.right]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:201,clientX:x,clientY:r.top+r.height/2}));
 });
 await expect(page.getByRole('textbox',{name:'Notiz zu V. 1',exact:true})).toBeVisible();
}
async function notebook(page:Page){
 await page.getByRole('button',{name:'Zur Bibliothek'}).click();await page.getByRole('button',{name:'Meine Notizen',exact:true}).click();
}
test('a pagehide in the same event turn retains the final native input',async({page})=>{
 await setup(page);
 const stored=await page.getByRole('textbox',{name:'Notiz zu V. 1',exact:true}).evaluate(el=>{
  const field=el as HTMLTextAreaElement;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(field,'Größe, äußere Freiheit und Würde.');
  field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'Größe, äußere Freiheit und Würde.'}));
  window.dispatchEvent(new Event('pagehide'));
  const key=Object.keys(localStorage).find(k=>k.startsWith('buchtutor-pencil-draft:'))!;
  return JSON.parse(localStorage.getItem(key)??'null')?.entries?.[0]?.body;
 });
 expect(stored).toBe('Größe, äußere Freiheit und Würde.');
 await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Notiz zu V. 1',exact:true})).toHaveValue('Größe, äußere Freiheit und Würde.');
});
test('unfinished composition cannot be saved and the final correction is retained',async({page})=>{
 await setup(page);const field=page.getByRole('textbox',{name:'Notiz zu V. 1',exact:true});
 await field.dispatchEvent('compositionstart',{data:''});await field.fill('Wurde');
 await expect(page.getByRole('button',{name:'Fertig',exact:true})).toBeDisabled();
 await field.evaluate(el=>{
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(el,'Würde statt Fremdbestimmung.\n„Heimat“ als Motiv.');
  el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'Würde'}));
 });
 await expect(field).toHaveValue('Würde statt Fremdbestimmung.\n„Heimat“ als Motiv.');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await notebook(page);await page.reload();
 await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('Würde statt Fremdbestimmung.');await expect(page.locator('.note-card')).toContainText('„Heimat“ als Motiv.');
});
test('unreadable drafts are never silently deleted or overwritten',async({page})=>{
 await setup(page);
 const key=await page.evaluate(()=>Object.keys(localStorage).find(k=>k.startsWith('buchtutor-pencil-draft:'))!);
 const original='{"version":99,"entries":[{"body":"Unersetzbarer Entwurf"}]}';
 await page.evaluate(({key,original})=>localStorage.setItem(key,original),{key,original});
 await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.locator('.pencil-error')).toContainText('entwurf');
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(original);
 await expect(page.getByRole('button',{name:'Fertig',exact:true})).toBeDisabled();
});
test('failed storage writes retain both text and marks for a successful retry',async({page})=>{
 await setup(page);
 await page.evaluate(()=>{
  const put=IDBObjectStore.prototype.put,set=Storage.prototype.setItem;
  IDBObjectStore.prototype.put=function(){throw new DOMException('Test storage unavailable','QuotaExceededError');};
  Storage.prototype.setItem=function(key,value){if(key.startsWith('buchtutor-pencil-draft:'))throw new DOMException('Test quota','QuotaExceededError');return set.call(this,key,value);};
  Object.assign(window,{restoreHandwritingStorage:()=>{IDBObjectStore.prototype.put=put;Storage.prototype.setItem=set;}});
 });
 const field=page.getByRole('textbox',{name:'Notiz zu V. 1',exact:true});await field.fill('Notiz bei vollem Speicher');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();
 await expect(page.locator('.pencil-error')).toContainText('Nicht gespeichert');await expect(field).toHaveValue('Notiz bei vollem Speicher');await expect(page.locator('.saved-highlight')).toHaveCount(1);
 await page.evaluate(()=>{(window as unknown as {restoreHandwritingStorage:()=>void}).restoreHandwritingStorage();});
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await notebook(page);await page.reload();
 await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('Notiz bei vollem Speicher');
});

async function online(page:Page){
 await page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true}).click();await page.getByRole('button',{name:'Farbbedeutungen anpassen',exact:true}).click();
 await page.getByRole('checkbox',{name:/Handschrift automatisch erkennen/}).check();await page.getByRole('button',{name:'Farbbedeutungen schließen',exact:true}).click();
 await expect(page.locator('.pencil-inline-note')).toHaveCount(0);
}
async function handwriting(page:Page){
 await page.locator('.pencil-text').evaluate(el=>{
  const row=el.querySelector('[data-block]')!.getBoundingClientRect(),r=el.getBoundingClientRect();
  for(const [type,x,y] of [['pointerdown',r.left-28,row.top+3],['pointermove',r.left-34,row.top+20],['pointerup',r.left-20,row.top+30]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:203,clientX:x,clientY:y}));
 });
}
async function localNotes(page:Page){
 return page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('leseraum-local-v2',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  return await new Promise<{body:string;pencil:{ink:unknown[];pageInk:unknown[];transcript?:string;transcription:string}}[]>((resolve,reject)=>{const request=db.transaction('state').objectStore('state').get('reader');request.onsuccess=()=>{db.close();resolve(request.result.notes)};request.onerror=()=>reject(request.error);});
 });
}
test('original strokes survive background recognition, reload, all visibility choices and search',async({page},testInfo)=>{
 await setup(page);await online(page);await handwriting(page);
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});let calls=0;
 await page.route('**/api/handwriting',async route=>{calls++;expect(route.request().postDataJSON().consent).toBe(true);await gate;await route.fulfill({json:{text:'Natur als Zuflucht – äußere Freiheit.',uncertain:false}});});
 const path=await page.locator('[data-ink-group] path').getAttribute('d');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',path!);await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/wird erkannt/);
 const before=await localNotes(page);expect(before[0].pencil.pageInk).toHaveLength(1);expect(before[0].pencil.ink).toHaveLength(1);
 release();await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/Suchtext gespeichert/);
 expect(calls).toBe(1);await expect(page.getByText('Natur als Zuflucht – äußere Freiheit.',{exact:true})).toHaveCount(0);
 for(const [label,ink,marks] of [['Nur Markierungen',0,1],['Nur Notizen',1,0],['Alles ausblenden',0,0],['Alles anzeigen',1,1]] as const){
  await page.getByRole('button',{name:'Ansicht einstellen',exact:true}).click();await page.getByRole('button',{name:label,exact:true}).click();
  await expect(page.locator('[data-ink-group] path')).toHaveCount(ink);await expect(page.locator('.saved-highlight')).toHaveCount(marks);
 }
 await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveAttribute('d',path!);
 await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/Suchtext gespeichert/);
 await page.screenshot({path:testInfo.outputPath('handwriting-kept-on-page.png')});
 await notebook(page);await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('äußere Freiheit');await expect(page.locator('.note-card')).toHaveCount(1);
 await page.getByText('Originalhandschrift',{exact:true}).click();await expect(page.locator('.saved-ink path')).toHaveCount(1);
 const after=await localNotes(page);expect(after[0].pencil.ink).toEqual(before[0].pencil.ink);expect(after[0].pencil.pageInk).toEqual(before[0].pencil.pageInk);expect(calls).toBe(1);
});
test('failed recognition keeps ink, exposes a retry and never retries by itself',async({page})=>{
 await setup(page);await online(page);await handwriting(page);let calls=0;
 await page.route('**/api/handwriting',route=>{calls++;return route.fulfill(calls===1?{status:504,json:{error:'Erkennung dauert zu lange. Original gespeichert.'}}:{json:{text:'Würde und Freiheit',uncertain:false}});});
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/prüfen/);expect(calls).toBe(1);
 await expect(page.locator('[data-ink-saved=true] path')).toHaveCount(1);
 await page.locator('.annotation-marker').click();await expect(page.getByText('Erkennung dauert zu lange. Original gespeichert.',{exact:true})).toBeVisible();expect(calls).toBe(1);
 await page.getByRole('button',{name:'Erneut erkennen',exact:true}).click();await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/Suchtext gespeichert/);
 await expect(page.locator('.annotation-body')).toHaveText('Würde und Freiheit');expect(calls).toBe(2);
});
test('a late recognition result cannot overwrite a manual correction',async({page})=>{
 await setup(page);await online(page);await handwriting(page);
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});
 await page.route('**/api/handwriting',async route=>{await gate;await route.fulfill({json:{text:'Veraltete automatische Antwort',uncertain:false}});});
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/wird erkannt/);
 await page.locator('.annotation-marker').click();await page.getByRole('button',{name:'Notiz bearbeiten',exact:true}).click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Meine eigene korrigierte Zuordnung');await page.getByRole('button',{name:'Notiz speichern',exact:true}).click();
 await expect.poll(async()=>(await localNotes(page))[0].pencil.transcription).toBe('manual');
 const response=page.waitForResponse('**/api/handwriting');release();await response;
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Meine eigene korrigierte Zuordnung');
 await page.reload();const notes=await localNotes(page);expect(notes[0].body).toBe('Meine eigene korrigierte Zuordnung');expect(notes[0].pencil.transcript).toBeUndefined();expect(notes[0].pencil.ink).toHaveLength(1);
});
test('regular note fields preserve an unsaved Scribble draft after reloading',async({page})=>{
 await page.goto(reader);await page.getByRole('button',{name:'Vers 1 auswählen',exact:true}).click();await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Über Freiheit und Größe\nZweite Zeile bleibt erhalten.');
 await page.reload();await page.getByRole('button',{name:'Vers 1 auswählen',exact:true}).click();await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Über Freiheit und Größe\nZweite Zeile bleibt erhalten.');
 await page.getByRole('button',{name:'Notiz speichern',exact:true}).click();await notebook(page);await page.reload();
 await expect(page.locator('.note-card')).toContainText('Zweite Zeile bleibt erhalten.');
});
test('handwriting API requires opt-in and rejects invalid pictures without provider access',async({request})=>{
 for(const data of [{image:'data:image/png;base64,aGVsbG8='},{consent:true,image:'https://example.com/image.png'}]){
  const response=await request.post('/api/handwriting',{data});expect(response.status()).toBe(400);expect(response.headers()['cache-control']).toContain('no-store');
 }
});
test('erasing saved handwriting removes stale search text and undo restores the original',async({page})=>{
 await setup(page);await online(page);await handwriting(page);
 await page.route('**/api/handwriting',route=>route.fulfill({json:{text:'Einmaliger Handschriftbegriff',uncertain:false}}));
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/Suchtext gespeichert/);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await page.getByRole('button',{name:'Radiergummi',exact:true}).click();
 async function eraseInk(){
  await page.locator('.pencil-text').evaluate(el=>{
   const r=el.querySelector('[data-ink-group] path')!.getBoundingClientRect();
   for(const type of ['pointerdown','pointerup'])el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:205,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
  });
 }
 await eraseInk();await expect(page.locator('[data-ink-group] path')).toHaveCount(0);
 await page.getByRole('button',{name:'Rückgängig',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
 await eraseInk();await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await notebook(page);await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('Einmaliger Handschriftbegriff');await expect(page.locator('.note-card')).toHaveCount(0);
 await page.reload();const notes=await localNotes(page);expect(notes[0].pencil.ink).toHaveLength(0);expect(notes[0].pencil.pageInk).toHaveLength(0);expect(notes[0].body).toBe('');
});
test('an interrupted freehand stroke retains its captured points on reload',async({page})=>{
 await setup(page);
 await page.locator('.pencil-text').evaluate(el=>{
  const row=el.querySelector('[data-block]')!.getBoundingClientRect(),r=el.getBoundingClientRect();
  for(const [type,x,y] of [['pointerdown',r.left-28,row.top+3],['pointermove',r.left-34,row.top+20],['pointercancel',0,0]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:206,clientX:x,clientY:y}));
 });
 await expect(page.locator('[data-ink-group] path')).toHaveCount(1);await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
});
