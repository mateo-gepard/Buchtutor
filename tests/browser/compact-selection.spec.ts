import {test,expect,type Page} from './reader-test';

const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
async function range(page:Page,start:number,end:number){const tool=button(page,'Bereich durch Antippen auswählen');if(await tool.getAttribute('aria-pressed')!=='true')await tool.click();await button(page,`Vers ${start} auswählen`).click();await button(page,`Vers ${end} auswählen`).click();}
async function multiple(page:Page){await range(page,1,2);await button(page,'Auswahloptionen').click();await button(page,'Weitere Stelle auswählen').click();await range(page,6,7);}
async function fits(page:Page){
 await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{
  const bar=el.getBoundingClientRect(),header=document.querySelector('.reader-header')!.getBoundingClientRect(),footer=document.querySelector('.reading-footer')!.getBoundingClientRect();
  const actions=[...el.querySelectorAll('.multi-selection-dock button')].map(button=>button.getBoundingClientRect()),all=[...el.querySelectorAll('.workspace-main button,.multi-selection-dock button')].map(button=>button.getBoundingClientRect()).filter(r=>r.width&&r.height);
  const bad=all.filter((r,i)=>!(r.left>=bar.left&&r.right<=bar.right+1&&r.top>=bar.top&&r.bottom<=bar.bottom+1&&all.slice(i+1).every(s=>Math.min(r.right,s.right)-Math.max(r.left,s.left)<=1||Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)<=1)));
  return bar.top>=header.bottom&&bar.bottom<=footer.top+1&&bar.left>=0&&bar.right<=innerWidth+1&&actions.every(r=>r.width>=44&&r.height>=44)&&!bad.length?null:{viewport:[innerWidth,innerHeight],dock:el.getAttribute('data-dock'),bar:bar.toJSON(),actions:actions.map(r=>r.toJSON()),bad:bad.map(r=>r.toJSON())};
 })).toBeNull();
}
test.beforeEach(async({page})=>{
 await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());
 await page.goto('/?work=iphigenie&section=s001&view=reader');await expect(page.locator('.reader-bookmark')).toBeEnabled();
});

test('multiple passages use one compact row with direct actions and clear text',async({page},testInfo)=>{
 await multiple(page);await fits(page);
 const dock=page.locator('.multi-selection-dock');
 expect((await dock.boundingBox())!.height).toBeLessThanOrEqual(54);
 expect((await page.locator('.reader-workspace').boundingBox())!.height).toBeLessThanOrEqual(page.viewportSize()!.width>=820?60:114);
 await expect(page.locator('.multi-selection-options')).toHaveCount(0);
 for(const name of ['Notiz schreiben','Lesehilfe öffnen','Weitere Stelle auswählen','Ausgewählte Stellen markieren','Auswahl aufheben'])await expect(button(page,name)).toBeVisible();
 // At the chapter start, the toolbar leaves every selected text line unobscured.
 await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{
  const bar=el.getBoundingClientRect();return [...document.querySelectorAll('.row-selected [data-text]')].every(text=>{const r=text.getBoundingClientRect();return r.bottom<=bar.top||r.top>=bar.bottom||r.right<=bar.left||r.left>=bar.right;});
 })).toBe(true);
 const height=(await dock.boundingBox())!.height;
 await button(page,'Weitere Stelle auswählen').click();await range(page,10,11);
 await expect(button(page,'3 Stellen ausgewählt – Textstelle wechseln')).toBeVisible();expect((await dock.boundingBox())!.height).toEqual(height);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('compact-multiple.png')});
});

test('passage picker closes consistently, switches the active note and supports individual removal',async({page})=>{
 await multiple(page);const trigger=button(page,'2 Stellen ausgewählt – Textstelle wechseln');
 await trigger.click();await expect(page.getByRole('group',{name:'Ausgewählte Stellen verwalten',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','false');await expect(page.locator('.row-selected')).toHaveCount(4);
 await trigger.click();await page.locator('.reader-title').click();await expect(trigger).toHaveAttribute('aria-expanded','false');
 await trigger.click();await page.getByRole('button',{name:/Textstelle 1:/}).click();await expect(trigger).toHaveAttribute('aria-expanded','false');await expect(trigger).toContainText('1–2');
 await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Erster Entwurf bleibt');await button(page,'Lesehilfe schließen').click();
 await trigger.click();await page.getByRole('button',{name:/Textstelle 2:/}).click();await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Zweiter Entwurf bleibt');await button(page,'Lesehilfe schließen').click();
 await trigger.click();await page.getByRole('button',{name:/Textstelle 1:/}).click();await button(page,'Notiz schreiben').click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Erster Entwurf bleibt');await button(page,'Lesehilfe schließen').click();
 await trigger.click();await button(page,'Textstelle 2 abwählen').click();await expect(page.locator('.row-selected')).toHaveCount(2);await expect(page.locator('.multi-selection-dock')).toHaveCount(0);await expect(button(page,'Auswahloptionen')).toBeFocused();await button(page,'Auswahloptionen').click();
 await button(page,'Auswahl aufheben').click();await expect(page.locator('.row-selected')).toHaveCount(0);
});

test('multi-selection stays inside every iPad dock with audio and after rotation',async({page},testInfo)=>{
 test.setTimeout(60000);await multiple(page);await button(page,'Hören und mitlesen').click();
 const grip=button(page,'Werkzeugleiste verschieben');
 for(const viewport of [{width:834,height:1194},{width:1194,height:834},{width:680,height:759},{width:834,height:520}]){
  await page.setViewportSize(viewport);
  for(const edge of ['Up','Right','Down','Left']){
   await grip.press(`Shift+Arrow${edge}`);await fits(page);
   // A completed docking transform can report 60.000007px for a 60px bar.
   if(viewport.width>=820&&(edge==='Up'||edge==='Down'))expect((await page.locator('.reader-workspace').boundingBox())!.height).toBeLessThanOrEqual(60.01);
   if(edge==='Left'||edge==='Right')await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{
    const bar=el.getBoundingClientRect(),text=document.querySelector('.source-row [data-text]')!.getBoundingClientRect();return el.getAttribute('data-dock')==='left'?text.left>=bar.right:text.right<=bar.left;
   })).toBe(true);
   await button(page,'2 Stellen ausgewählt – Textstelle wechseln').click();
   await expect.poll(()=>page.locator('.multi-selection-options').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
   await button(page,'Textstellen schließen').click();await expect(page.locator('.row-selected')).toHaveCount(4);
  }
  await page.screenshot({animations:'disabled',path:testInfo.outputPath(`compact-dock-${viewport.width}x${viewport.height}.png`)});
 }
});
