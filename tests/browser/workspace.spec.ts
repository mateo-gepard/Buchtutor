import {test,expect,type Page} from '@playwright/test';
import {ONBOARDING_KEY} from '../../lib/onboarding';

async function fits(page:Page,selector:string){
 await expect.poll(()=>page.locator(selector).evaluate(el=>{
  const r=el.getBoundingClientRect(),header=document.querySelector('.reader-header')!.getBoundingClientRect(),footer=document.querySelector('.reading-footer')!.getBoundingClientRect();
  if(el.closest('.workspace-inline-host'))return r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth+1&&[...document.querySelectorAll('.source-row')].every(row=>{const line=row.getBoundingClientRect();return line.bottom<=r.top||line.top>=r.bottom;});
  return r.left>=0&&r.right<=innerWidth+1&&r.top>=header.bottom&&r.bottom<=footer.top+1;
 })).toBe(true);
}
async function readingRoom(page:Page){
 await fits(page,'.assistant-panel');
 await expect.poll(()=>page.locator('.assistant-panel').evaluate(el=>{
  const panel=el.getBoundingClientRect(),text=document.querySelector('.reading-main')!.getBoundingClientRect();
  return innerWidth>=1000?panel.width<=360&&text.right<=panel.left&&text.width>=400:!!el.closest('.workspace-inline-host')&&panel.height<=300;
 })).toBe(true);
}
test.beforeEach(async({page})=>{
 await page.addInitScript(key=>localStorage.setItem(key,'1'),ONBOARDING_KEY);
 await page.route('**/api/analysis',()=>{throw new Error('Opening tools must not start AI requests');});
 await page.goto('/?work=iphigenie&section=s001&view=reader');
});
test('inline notes leave the selected passage readable and keep their draft across rotation',async({page},testInfo)=>{
 await page.setViewportSize({width:680,height:759});
 const line=page.locator('.source-row').first(),text=await line.locator('[data-text]').boundingBox();
 await line.locator('.line-number').click();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await readingRoom(page);
 const card=await page.locator('.assistant-panel').boundingBox(),selected=await line.boundingBox();
 expect(card!.height).toBeLessThanOrEqual(220);
 expect(card!.y).toBeGreaterThanOrEqual(selected!.y+selected!.height);
 expect((await line.locator('[data-text]').boundingBox())!.width).toBeCloseTo(text!.width,0);
 await expect(page.locator('.assistant-panel .companion-tabs')).toBeHidden();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Die Natur wirkt vertraut, Iphigenie fühlt sich fremd.');
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('inline-note-split-view.png')});
 await page.getByRole('button',{name:'Lesehilfe vergrößern',exact:true}).click();
 await expect(page.locator('.assistant-panel .companion-tabs')).toBeVisible();
 await fits(page,'.assistant-panel');
 await page.getByRole('button',{name:'Lesehilfe verkleinern',exact:true}).click();
 for(const viewport of [{width:1194,height:834},{width:834,height:1194},{width:680,height:759}]){
  await page.setViewportSize(viewport);
  await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Die Natur wirkt vertraut, Iphigenie fühlt sich fremd.');
  await readingRoom(page);
 }
 await page.getByRole('button',{name:'Notiz speichern',exact:true}).click();
 await expect(page.locator('.workspace-saved-notes summary')).toContainText('1 Eintrag');
 await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();
 await expect(page.locator('.workspace-inline-host')).toHaveJSProperty('offsetHeight',0);
 // Measure relative geometry in one frame; scroll restoration can occur between round trips.
 const gap=await page.evaluate(()=>{const rows=document.querySelectorAll('.source-row'),first=rows[0].getBoundingClientRect(),next=rows[1].getBoundingClientRect();return next.top-first.bottom;});
 expect(gap).toBeLessThan(10);
});
test('each accessory preserves reading space in portrait, landscape and narrow readers',async({page},testInfo)=>{
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await fits(page,'.reader-workspace');
 const bar=await page.locator('.reader-workspace').boundingBox();
 expect(bar!.height).toBeLessThanOrEqual(page.viewportSize()!.width>=760?60:114);
 await page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true}).click();
 await fits(page,'.pencil-mobile-palette');
 expect((await page.locator('.pencil-mobile-palette').boundingBox())!.width).toBeLessThanOrEqual(240);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('01-colors.png')});
 await page.getByRole('button',{name:/^Grün:/}).click();
 await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Natur als Zuflucht – Iphigenie bleibt innerlich fremd.');
 await readingRoom(page);
 expect(await page.getByRole('button',{name:'Notiz speichern',exact:true}).evaluate(el=>{const r=el.getBoundingClientRect(),panel=el.closest('.assistant-panel')!.getBoundingClientRect();return r.top>=panel.top&&r.bottom<=panel.bottom;})).toBe(true);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('02-notes.png')});
 await page.getByRole('button',{name:'Lesehilfe öffnen',exact:true}).click();
 await readingRoom(page);await page.screenshot({animations:'disabled',path:testInfo.outputPath('03-ai.png')});
 await page.getByRole('button',{name:'Figuren',exact:true}).click();
 await readingRoom(page);await page.screenshot({animations:'disabled',path:testInfo.outputPath('04-figures.png')});
 await page.getByRole('button',{name:'Hörbuch-Details öffnen',exact:true}).click();
 await fits(page,'.audio-details');await expect(page.locator('.workspace-popover:visible,.pencil-popover:visible')).toHaveCount(1);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('05-audio.png')});
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Natur als Zuflucht – Iphigenie bleibt innerlich fremd.');
});
test('grouped tools fit without overlapping in narrow readers and at every dock edge',async({page},testInfo)=>{
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();
 const grip=page.getByRole('button',{name:'Werkzeugleiste verschieben',exact:true});
 for(const viewport of [{width:320,height:740},{width:680,height:759},{width:834,height:1194},{width:1194,height:834},{width:834,height:520}]){
  await page.setViewportSize(viewport);
  for(const edge of ['Up','Right','Down','Left']){
   await grip.press(`Shift+Arrow${edge}`);
   await fits(page,'.reader-workspace');
   await expect.poll(()=>page.locator('.workspace-main').evaluate(el=>{
    const bar=el.getBoundingClientRect(),buttons=[...el.querySelectorAll('button')].map(button=>button.getBoundingClientRect()).filter(r=>r.width&&r.height);
    const bad=buttons.filter((r,i)=>!(r.left>=bar.left&&r.right<=bar.right+1&&r.top>=bar.top&&r.bottom<=bar.bottom+1&&buttons.slice(i+1).every(s=>Math.min(r.right,s.right)-Math.max(r.left,s.left)<=1||Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)<=1)));
    return bad.length?{bar:bar.toJSON(),bad:bad.map(r=>r.toJSON()),viewport:[innerWidth,innerHeight],dock:el.closest('.reader-workspace')?.getAttribute('data-dock')}:null;
   })).toBeNull();
   if(edge==='Left'||edge==='Right')await expect.poll(()=>page.locator('.reader-workspace').evaluate((el,edge)=>{
    const bar=el.getBoundingClientRect(),text=document.querySelector('.source-row [data-text]')!.getBoundingClientRect(),number=document.querySelector('.source-row .line-number')!.getBoundingClientRect();
    return edge==='Left'?number.left-bar.right:bar.left-text.right;
   },edge),{message:`Text stays clear at ${viewport.width} × ${viewport.height}, ${edge}`}).toBeGreaterThanOrEqual(4);
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  if(viewport.width===834&&viewport.height===1194)await page.screenshot({animations:'disabled',path:testInfo.outputPath('06-side-tools.png')});
 }
});
test('iPad-sized keyboard space and split view keep the note input and controls reachable',async({page})=>{
 await page.setViewportSize({width:834,height:680});
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Ein Gedanke mit geöffneter Tastatur.');
 await fits(page,'.assistant-panel');await fits(page,'.reader-workspace');
 await page.setViewportSize({width:680,height:759});
 await readingRoom(page);
 await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();
 await page.getByRole('button',{name:'Werkzeugleiste verschieben',exact:true}).press('Shift+ArrowRight');
 await fits(page,'.reader-workspace');
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await fits(page,'.assistant-panel');
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Ein Gedanke mit geöffneter Tastatur.');
});

test('switching tools preserves the reading anchor and never closes audio on pointer-down',async({page})=>{
 await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();
 await page.locator('[data-block]').nth(22).evaluate(el=>window.scrollBy({top:el.getBoundingClientRect().top-220,behavior:'instant'}));
 const anchor=await page.locator('[data-block]').evaluateAll(rows=>{
  const row=rows.find(el=>el.getBoundingClientRect().bottom>95)!;
  return {id:row.id,top:row.getBoundingClientRect().top};
 });
 const footer=await page.locator('.reading-progress').boundingBox();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 if(footer){
  expect(await page.locator('.reading-progress').boundingBox()).toEqual(footer);
  await expect(page.locator('.reading-progress .icon-button').last()).toBeVisible();
 }
 await expect.poll(()=>page.locator(`[id="${anchor.id}"]`).evaluate((el,top)=>Math.abs(el.getBoundingClientRect().top-top),anchor.top)).toBeLessThan(2);
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Ein Gedanke bleibt beim Werkzeugwechsel erhalten.');
 const shape=await page.locator(`[id="${anchor.id}"]`).boundingBox();
 await page.getByRole('button',{name:'Hörbuch-Details öffnen',exact:true}).click();
 const noteButton=page.getByRole('button',{name:'Notiz schreiben',exact:true});
 await noteButton.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:41});
 await expect(page.locator('.audio-details')).not.toHaveAttribute('hidden');
 await expect(page.locator('.assistant-panel')).toHaveAttribute('hidden');
 const inAudio=await page.locator(`[id="${anchor.id}"]`).boundingBox();
 expect(Math.abs(inAudio!.x-shape!.x)).toBeLessThan(2);
 expect(Math.abs(inAudio!.y-shape!.y)).toBeLessThan(2);
 expect(Math.abs(inAudio!.width-shape!.width)).toBeLessThan(2);
 await noteButton.click();
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Ein Gedanke bleibt beim Werkzeugwechsel erhalten.');
 await expect(page.locator('#assistant-title')).not.toBeFocused();
 await expect.poll(()=>page.locator(`[id="${anchor.id}"]`).evaluate((el,top)=>Math.abs(el.getBoundingClientRect().top-top),shape!.y)).toBeLessThan(2);
 await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();
 await expect(page.locator('.assistant-panel')).toBeHidden();
 await expect.poll(()=>page.locator(`[id="${anchor.id}"]`).evaluate((el,top)=>Math.abs(el.getBoundingClientRect().top-top),anchor.top)).toBeLessThan(2);
});

test('a tap or small grip movement keeps the note open; deliberate dragging closes it',async({page})=>{
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Entwurf bleibt erhalten.');
 const grip=page.getByRole('button',{name:'Werkzeugleiste verschieben',exact:true});
 await grip.evaluate(el=>{
  const r=el.getBoundingClientRect();
  for(const [type,delta] of [['pointerdown',0],['pointermove',3],['pointerup',3]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:42,clientX:r.x+10+delta,clientY:r.y+10,buttons:type==='pointerup'?0:1}));
 });
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toBeVisible();
 await expect(page.locator('.reader-workspace')).not.toHaveClass(/is-dragging/);
 await grip.evaluate(el=>{
  const r=el.getBoundingClientRect();
  for(const [type,delta] of [['pointerdown',0],['pointermove',90],['pointerup',90]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:43,clientX:r.x+10,clientY:r.y+10+delta,buttons:type==='pointerup'?0:1}));
 });
 await expect(page.locator('.assistant-panel')).toBeHidden();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Entwurf bleibt erhalten.');
});

test('keyboard focus, individual panel scroll positions and reduced motion remain predictable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 // A short viewport creates real overflowing content, also on wide displays.
 await page.setViewportSize({...page.viewportSize()!,height:520});
 const help=page.getByRole('button',{name:'Lesehilfe öffnen',exact:true});
 await help.press('Enter');
 await expect(page.locator('#assistant-title')).toBeFocused();
 await page.locator('.panel-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await expect.poll(()=>page.locator('.panel-scroll').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 const position=await page.locator('.panel-scroll').evaluate(el=>el.scrollTop);
 await page.getByRole('button',{name:'Figuren',exact:true}).click();
 await expect(page.locator('.panel-scroll')).toHaveJSProperty('scrollTop',0);
 await page.getByRole('button',{name:'Verstehen',exact:true}).click();
 await expect.poll(()=>page.locator('.panel-scroll').evaluate(el=>el.scrollTop)).toBeCloseTo(position,0);
 await page.keyboard.press('Escape');
 await expect(help).toBeFocused();
 await expect(page.locator('.assistant-panel')).toBeHidden();
 await page.getByRole('button',{name:'Werkzeugleiste verschieben',exact:true}).press('Shift+ArrowRight');
 await fits(page,'.reader-workspace');
 expect(await page.locator('.reader-workspace').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
});
