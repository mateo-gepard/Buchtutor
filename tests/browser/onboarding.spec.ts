import {test,expect,type Page} from '@playwright/test';
import {ONBOARDING_KEY,tourSteps} from '../../lib/onboarding';
async function firstVisit(page:Page,path='/?view=library'){
 page.on('request',request=>{if(/\/api\/(analysis|handwriting)/.test(request.url()))throw new Error('Tour must never start AI calls');});
 await page.goto(path);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','welcome');await expect(page.getByRole('button',{name:'Gemeinsam ausprobieren'})).toBeVisible();await expect(page.locator('.tour-card')).toBeFocused();
}
async function next(page:Page){await page.locator('[data-tour-next]').click();}
async function stay(page:Page){const button=page.getByRole('button',{name:'Hier bleiben',exact:true});if(await button.isVisible())await button.click();}
async function geometry(page:Page,spot=true){
 const card=page.locator('.tour-card');await expect(card).toBeVisible();await expect(page.locator('.reader-onboarding')).toHaveAttribute('data-transition','ready');
 await expect.poll(()=>card.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})).toBe(true);
 if(spot){await expect(page.locator('.tour-spotlight').first()).toBeVisible();await expect.poll(()=>page.locator('.tour-spotlight').evaluateAll(els=>{const c=document.querySelector('.tour-card')!.getBoundingClientRect();return els.every(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(c.right<=r.left+1||c.left>=r.right-1||c.bottom<=r.top+1||c.top>=r.bottom-1);});})).toBe(true);}
}
async function word(page:Page){return page.locator('[data-text]').first().evaluate(el=>{const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,r=document.createRange();r.setStart(node,1);r.setEnd(node,5);const b=r.getBoundingClientRect();return {left:b.left,right:b.right,y:b.y+b.height/2};});}
async function mark(page:Page){const r=await word(page);await page.mouse.move(r.left,r.y);await page.mouse.down();await page.mouse.move(r.right,r.y,{steps:6});await page.mouse.up();}
async function line(page:Page){const r=await word(page);await page.mouse.move(r.left+8,r.y-7);await page.mouse.down();await page.mouse.move(r.left+8,r.y+8,{steps:6});await page.mouse.up();}
async function savedCounts(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('leseraum-local-v2');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const saved=await new Promise<{notes:unknown[];progress:unknown[]}|undefined>((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get('reader');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return {notes:saved?.notes.length??0,progress:saved?.progress.length??0,drafts:Object.keys(localStorage).filter(k=>k.startsWith('buchtutor-pencil-draft:')).length};});}

test('invitation leaves the current page intact and can be declined without entering the tour',async({page})=>{
 await firstVisit(page,'/?work=iphigenie&section=s001&view=reader');await geometry(page,false);await expect(page.locator('.reading-main')).toBeVisible();await expect(page.locator('.library-page')).toHaveCount(0);await expect(page.locator('.tour-card')).toContainText('Nach 4 Schritten bei deiner Notiz');await page.getByRole('button',{name:'Weiterlesen',exact:true}).click();await expect(page.locator('.reader-onboarding')).toHaveCount(0);await page.reload();await page.waitForTimeout(850);await expect(page.locator('.reader-onboarding')).toHaveCount(0);
});
test('ten connected steps preserve the exercise note and show it again in the notebook',async({page})=>{
 await firstVisit(page);expect(tourSteps).toHaveLength(10);expect(tourSteps.slice(0,4).map(step=>step.id)).toEqual(['selection','pencil','notes','notebook']);await geometry(page,false);await expect(page.locator('.library-page')).toBeVisible();await next(page);
 for(let i=0;i<tourSteps.length;i++){
  const id=tourSteps[i].id;await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step',id);await expect(page.locator('.tour-topline')).toContainText(`Schritt ${i+1} von 10`);await geometry(page,id!=='finish');
  if(id==='selection')await page.locator('.source-row .line-number').first().click();
  if(id==='pencil'){if(!await page.locator('.pencil-colors').isVisible())await page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true}).click();await page.getByRole('button',{name:/^Blau:/}).click();await mark(page);await expect(page.locator('.saved-highlight')).toBeVisible();await stay(page);const original=page.viewportSize()!;await page.setViewportSize({width:600,height:780});await geometry(page);await page.setViewportSize(original);await geometry(page);}
  if(id==='handwriting'){await page.getByRole('button',{name:'Auf der Seite schreiben',exact:true}).click();await line(page);await expect(page.locator('[data-ink-group] path')).toHaveCount(1);}
  if(id==='eraser'){await page.getByRole('button',{name:'Radiergummi',exact:true}).click();await line(page);await expect(page.locator('[data-ink-group] path')).toHaveCount(0);await stay(page);await page.getByRole('button',{name:'Rückgängig',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(1);}
  if(id==='notes'){await expect(page.locator('.saved-highlight')).toBeVisible();await page.locator('.note-editor textarea').fill('Mein Gedanke begleitet dieselbe Textstelle.');await expect(page.locator('.tour-task')).not.toHaveClass(/is-complete/);await page.getByRole('button',{name:'Übungsnotiz merken',exact:true}).click();}
  if(id==='help'){await page.getByRole('button',{name:'Sprache',exact:true}).click();await expect(page.getByRole('button',{name:'Sprache',exact:true})).toHaveAttribute('aria-pressed','true');}
  if(id==='figures')await page.locator('.character-chip').first().click();
  if(id==='bookmark'){await page.getByRole('button',{name:'Lesezeichen setzen',exact:true}).click();await expect(page.getByRole('button',{name:'Lesezeichen entfernen',exact:true})).toHaveAttribute('aria-pressed','true');}
  if(id==='notebook'){await expect(page.locator('.note-card')).toContainText('Mein Gedanke begleitet dieselbe Textstelle.');await page.getByRole('combobox',{name:'Nach Markierungsfarbe filtern'}).selectOption('yellow');await expect(page.locator('.note-card')).toHaveCount(0);await expect(page.locator('.tour-task')).not.toHaveClass(/is-complete/);await page.getByRole('combobox',{name:'Nach Markierungsfarbe filtern'}).selectOption('blue');await expect(page.locator('.note-card')).toContainText('Mein Gedanke begleitet dieselbe Textstelle.');await page.locator('.note-card .note-open').click();await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notes');await expect(page.locator('.note-editor textarea')).toHaveValue('Mein Gedanke begleitet dieselbe Textstelle.');for(let j=tourSteps.findIndex(step=>step.id==='notes')+1;j<=tourSteps.findIndex(step=>step.id==='notebook');j++){await next(page);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step',tourSteps[j].id);}await geometry(page);await expect(page.locator('.note-card')).toContainText('Mein Gedanke begleitet dieselbe Textstelle.');}
  if(tourSteps[i].task){await expect(page.locator('.tour-task')).toHaveClass(/is-complete/);await stay(page);}
  if(id==='finish'){await expect(page.locator('.tour-recap')).toContainText('Gedanken festhalten');await expect(page.locator('.tour-return-note')).toContainText('vorherigen Ansicht');}
  await next(page);
 }
 await expect(page.locator('.reader-onboarding')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Bibliothek',exact:true})).toBeVisible();expect(await savedCounts(page)).toEqual({notes:0,progress:0,drafts:0});
 expect(await page.evaluate(key=>localStorage.getItem(key),ONBOARDING_KEY)).toBe('1');await page.reload();await page.waitForTimeout(800);await expect(page.locator('.reader-onboarding')).toHaveCount(0);
});
test('back, skipping during a transition and restarting preserve a real Pencil draft',async({page})=>{
 await firstVisit(page,'/?work=iphigenie&section=s001&view=reader');await page.getByRole('button',{name:'Weiterlesen',exact:true}).click();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await mark(page);await expect(page.locator('.saved-highlight')).toBeVisible();
 await page.getByRole('button',{name:'Einführung starten',exact:true}).click();await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','welcome');await next(page);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','selection');await next(page);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','pencil');await geometry(page);await mark(page);await page.getByRole('button',{name:'Vorheriger Schritt',exact:true}).click();await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','selection');await geometry(page);await next(page);await page.keyboard.press('Escape');await page.waitForTimeout(350);
 await expect(page.locator('.reader-onboarding')).toHaveCount(0);await expect(page.locator('.pencil-workspace')).toBeVisible();await expect(page.getByRole('button',{name:'Fertig',exact:true})).toBeEnabled();await expect(page.locator('.saved-highlight')).toBeVisible();
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await page.getByRole('button',{name:'Leseeinstellungen',exact:true}).first().click();await page.getByRole('button',{name:'Einführung erneut starten'}).click();await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','welcome');await page.getByRole('button',{name:'Tour überspringen',exact:true}).click();await expect(page.locator('.reader-dialog')).toHaveCount(0);
});
test('welcome and all ten steps fit a narrow screen with reduced motion and keyboard access',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:568});await firstVisit(page);await geometry(page,false);await next(page);
 for(let i=0;i<tourSteps.length;i++){await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step',tourSteps[i].id);await geometry(page,tourSteps[i].id!=='finish');await page.keyboard.press('Tab');expect(await page.evaluate(()=>!document.activeElement?.closest('[inert]'))).toBe(true);if(i<tourSteps.length-1)await next(page);}
 await page.getByRole('button',{name:'Tour überspringen',exact:true}).click();await expect(page.getByRole('button',{name:'Einführung starten',exact:true})).toBeVisible();
});

test('completed tasks show feedback before advancing; back, stay and closing cancel automatic navigation',async({page})=>{
 await firstVisit(page);await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await next(page);await page.clock.runFor(300);
 await page.locator('.source-row .line-number').first().click();await expect(page.locator('.tour-auto-advance')).toContainText('Gleich zum nächsten Schritt');await expect(page.locator('.tour-task')).toHaveClass(/is-complete/);
 await page.clock.runFor(1200);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','selection');await page.clock.runFor(1000);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','pencil');
 await page.getByRole('button',{name:'Vorheriger Schritt',exact:true}).click();await page.clock.runFor(300);await page.clock.runFor(4000);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','selection');
 await next(page);await page.clock.runFor(300);await mark(page);await stay(page);await page.clock.runFor(4000);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','pencil');await expect(page.locator('.tour-auto-advance')).toContainText('wenn du bereit bist');
 await next(page);await page.clock.runFor(300);await page.locator('.note-editor textarea').fill('Gedanke');await page.getByRole('button',{name:'Übungsnotiz merken',exact:true}).click();await expect(page.locator('.tour-auto-advance')).toBeVisible();await page.keyboard.press('Escape');await page.clock.runFor(5000);await expect(page.locator('.reader-onboarding')).toHaveCount(0);
});
test('automatic navigation waits for typing, composition and an unfinished pointer gesture',async({page})=>{
 await firstVisit(page);await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await next(page);await page.clock.runFor(300);await next(page);await page.clock.runFor(300);
 await mark(page);const r=await word(page);await page.mouse.move(r.left,r.y);await page.mouse.down();await page.clock.runFor(4000);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','pencil');await page.mouse.up();await page.clock.runFor(2200);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notes');
 const note=page.locator('.note-editor textarea');await note.dispatchEvent('compositionstart');await note.fill('Ein Gedanke');await page.clock.runFor(4000);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notes');await note.dispatchEvent('compositionend');await page.clock.runFor(1200);await note.fill('Ein Gedanke, den ich noch ergänze.');await page.clock.runFor(1200);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notes');
 await note.dispatchEvent('compositionstart');await page.clock.runFor(4000);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notes');await note.dispatchEvent('compositionend');await page.clock.runFor(4000);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notes');await expect(page.locator('.tour-task')).not.toHaveClass(/is-complete/);await page.getByRole('button',{name:'Übungsnotiz merken',exact:true}).click();await page.clock.runFor(1000);await note.fill('Ein nach dem Merken ergänzter Gedanke.');await page.clock.runFor(4000);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notes');await expect(page.locator('.tour-task')).not.toHaveClass(/is-complete/);await page.getByRole('button',{name:'Übungsnotiz merken',exact:true}).click();await page.clock.runFor(2200);await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notebook');await expect(page.locator('.note-card')).toContainText('Ein nach dem Merken ergänzter Gedanke.');
 await page.getByRole('button',{name:'Tour überspringen',exact:true}).click();expect(await savedCounts(page)).toEqual({notes:0,progress:0,drafts:0});
});


test('skipping note creation explains the empty notebook instead of inventing a saved thought',async({page})=>{
 await firstVisit(page);await expect(page.getByRole('button',{name:'Werk wählen',exact:true})).toBeVisible();await next(page);await next(page);await next(page);
 await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notes');await page.locator('.note-editor textarea').fill('Noch nicht gemerkt.');await next(page);
 await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notebook');await expect(page.locator('.note-card')).toHaveCount(0);await expect(page.locator('#tour-description')).toContainText('noch keine Übungsnotiz gemerkt');await expect(page.locator('.tour-task')).toHaveCount(0);
 await page.getByRole('button',{name:'Vorheriger Schritt',exact:true}).click();await page.getByRole('button',{name:'Übungsnotiz merken',exact:true}).click();await stay(page);await next(page);await expect(page.locator('.note-card')).toContainText('Noch nicht gemerkt.');
 await page.getByRole('button',{name:'Beenden',exact:true}).click();expect(await savedCounts(page)).toEqual({notes:0,progress:0,drafts:0});
});

test('a completed default marker sweep advances after real pointer release without a fake clock',async({page})=>{
 await firstVisit(page);await next(page);
 await page.locator('.source-row .line-number').first().click();
 await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','pencil');
 await expect(page.locator('.reader-onboarding')).toHaveAttribute('data-transition','ready');
 await mark(page);
 await expect(page.locator('.tour-task')).toHaveClass(/is-complete/);
 await expect(page.locator('.tour-card')).toHaveAttribute('data-tour-step','notes',{timeout:6000});
 await expect(page.locator('.note-editor textarea')).toBeVisible();
});
