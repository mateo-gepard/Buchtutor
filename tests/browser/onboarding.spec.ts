import {test,expect,type Page} from '@playwright/test';
import {ONBOARDING_KEY,tourSteps} from '../../lib/onboarding';
async function firstVisit(page:Page,path='/?view=library'){
 page.on('request',request=>{if(/\/api\/(analysis|handwriting)/.test(request.url()))throw new Error('Tour must never start AI calls');});
 await page.goto(path);await expect(page.getByRole('dialog',{name:'Deine Lektüre finden'})).toBeVisible();
}
async function geometry(page:Page){
 const card=page.locator('.tour-card');await expect(card).toBeVisible();
 await expect.poll(()=>card.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})).toBe(true);
 await expect(page.locator('.tour-spotlight').first()).toBeVisible();await expect.poll(()=>page.locator('.tour-spotlight').evaluateAll(els=>{const c=document.querySelector('.tour-card')!.getBoundingClientRect();return els.every(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(c.right<=r.left+1||c.left>=r.right-1||c.bottom<=r.top+1||c.top>=r.bottom-1);});})).toBe(true);
}
async function word(page:Page){return page.locator('[data-text]').first().evaluate(el=>{const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,r=document.createRange();r.setStart(node,1);r.setEnd(node,5);const b=r.getBoundingClientRect();return {left:b.left,right:b.right,y:b.y+b.height/2};});}
async function mark(page:Page){const r=await word(page);await page.mouse.move(r.left,r.y);await page.mouse.down();await page.mouse.move(r.right,r.y,{steps:6});await page.mouse.up();}
async function line(page:Page){const r=await word(page);await page.mouse.move(r.left+8,r.y-7);await page.mouse.down();await page.mouse.move(r.left+8,r.y+8,{steps:6});await page.mouse.up();}
async function savedCounts(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('leseraum-local-v2');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const saved=await new Promise<{notes:unknown[];progress:unknown[]}|undefined>((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get('reader');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return {notes:saved?.notes.length??0,progress:saved?.progress.length??0,drafts:Object.keys(localStorage).filter(k=>k.startsWith('buchtutor-pencil-draft:')).length};});}

test('ten interactive steps use the real controls without saving exercises or calling AI',async({page})=>{
 await firstVisit(page);expect(tourSteps).toHaveLength(10);
 for(let i=0;i<tourSteps.length;i++){
  const id=tourSteps[i].id;await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step',id);await expect(page.locator('.tour-topline')).toContainText(`Schritt ${i+1} von 10`);await geometry(page);
  if(id==='library')await page.getByRole('textbox',{name:'Bibliothek durchsuchen'}).fill('Goethe');
  if(id==='selection')await page.locator('.source-row .line-number').first().click();
  if(id==='pencil'){await mark(page);await expect(page.locator('.saved-highlight')).toBeVisible();const original=page.viewportSize()!;await page.setViewportSize({width:600,height:780});await geometry(page);await page.setViewportSize(original);await geometry(page);}
  if(id==='handwriting'){await page.getByRole('button',{name:'Auf der Seite schreiben',exact:true}).click();await line(page);await expect(page.locator('[data-ink-group] path')).toHaveCount(1);await page.getByRole('button',{name:'Radiergummi',exact:true}).click();await line(page);await expect(page.locator('[data-ink-group] path')).toHaveCount(0);await page.getByRole('button',{name:'Letzten Strich entfernen',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(1);}
  if(id==='help'){await page.getByRole('button',{name:'Sprache',exact:true}).click();await expect(page.getByRole('button',{name:'Sprache',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Eigene Notiz schreiben',exact:true}).click();await page.locator('.note-editor textarea').fill('Diese Probenotiz bleibt ungespeichert.');await geometry(page);}
  if(id==='figures')await page.locator('.character-chip').first().click();
  if(id==='bookmark'){await page.getByRole('button',{name:'Lesezeichen setzen',exact:true}).click();await expect(page.getByRole('button',{name:'Lesezeichen entfernen',exact:true})).toHaveAttribute('aria-pressed','true');}
  if(id==='notebook')await page.getByRole('combobox',{name:'Nach Markierungsfarbe filtern'}).selectOption('blue');
  if(tourSteps[i].task)await expect(page.locator('.tour-task')).toContainText('Geschafft!');
  await page.getByRole('button',{name:i===tourSteps.length-1?'Loslesen':'Weiter',exact:true}).click();
 }
 await expect(page.locator('.reader-onboarding')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Bibliothek',exact:true})).toBeVisible();expect(await savedCounts(page)).toEqual({notes:0,progress:0,drafts:0});
 expect(await page.evaluate(key=>localStorage.getItem(key),ONBOARDING_KEY)).toBe('1');await page.reload();await expect(page.getByRole('heading',{name:'Bibliothek',exact:true})).toBeVisible();await page.waitForTimeout(800);await expect(page.locator('.reader-onboarding')).toHaveCount(0);
});
test('skip, previous, escape and restart restore the reader and preserve a real Pencil draft',async({page})=>{
 await firstVisit(page,'/?work=iphigenie&section=s001&view=reader');await page.getByRole('button',{name:'Überspringen',exact:true}).click();await expect(page.locator('.reader-onboarding')).toHaveCount(0);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await mark(page);await expect(page.locator('.saved-highlight')).toBeVisible();await expect(page.getByRole('button',{name:'Fertig',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Einführung starten',exact:true}).click();await page.getByRole('button',{name:'Weiter',exact:true}).click();await page.getByRole('button',{name:'Vorheriger Schritt',exact:true}).click();await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','library');for(let n=0;n<3;n++)await page.getByRole('button',{name:'Weiter',exact:true}).click();await mark(page);await page.keyboard.press('Escape');
 await expect(page.locator('.reader-onboarding')).toHaveCount(0);await expect(page.locator('.pencil-workspace')).toBeVisible();await expect(page.getByRole('button',{name:'Fertig',exact:true})).toBeEnabled();await expect(page.locator('.saved-highlight')).toBeVisible();
 await page.getByRole('button',{name:'Pencil-Modus schließen, Entwürfe behalten'}).click();await page.getByRole('button',{name:'Leseeinstellungen',exact:true}).first().click();await page.getByRole('button',{name:'Einführung erneut starten'}).click();await expect(page.getByRole('dialog',{name:'Deine Lektüre finden'})).toBeVisible();await page.getByRole('button',{name:'Tour überspringen',exact:true}).click();await expect(page.locator('.reader-onboarding')).toHaveCount(0);await expect(page.locator('.reader-dialog')).toHaveCount(0);
});
test('all ten steps fit a narrow screen with reduced motion and allow keyboard navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:568});await firstVisit(page);
 for(let i=0;i<tourSteps.length;i++){await geometry(page);await page.keyboard.press('Tab');expect(await page.evaluate(()=>!document.activeElement?.closest('[inert]'))).toBe(true);if(i<tourSteps.length-1)await page.getByRole('button',{name:'Weiter',exact:true}).click();}
 await page.getByRole('button',{name:'Tour überspringen',exact:true}).click();await expect(page.getByRole('button',{name:'Einführung starten',exact:true})).toBeVisible();
});
