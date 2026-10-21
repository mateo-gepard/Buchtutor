import {test,expect,type Page} from './reader-test';
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
async function range(page:Page){await button(page,'Bereich durch Antippen auswählen').click();await button(page,'Vers 1 auswählen').click();await button(page,'Vers 2 auswählen').click();}
async function blank(page:Page){
 const point=await page.locator('.reading-page').evaluate(el=>{const page=el.getBoundingClientRect(),row=el.querySelector('.source-row')!.getBoundingClientRect();return {x:page.right-8,y:row.top+18};});
 await page.mouse.click(point.x,point.y);
}
test.beforeEach(async({page})=>{await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());await page.goto('/?work=iphigenie&section=s001&view=reader');await expect(page.locator('.reader-bookmark')).toBeEnabled();});

test('a plain tap deselects without a toolbar extension; note drafts survive',async({page},testInfo)=>{
 await range(page);await expect(page.locator('.row-selected')).toHaveCount(2);await expect(page.locator('.selection-dock')).toHaveCount(0);
 if(page.viewportSize()!.width>=760)expect((await page.locator('.reader-workspace').boundingBox())!.height).toBeLessThanOrEqual(60);
 const appearance=await page.locator('.row-selected').first().evaluate(el=>({gutter:getComputedStyle(el.querySelector('.line-select')!).backgroundColor,rail:getComputedStyle(el,'::before').content}));
 expect(appearance.gutter).toBe('rgba(0, 0, 0, 0)');expect(appearance.rail).toBe('none');
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('quiet-selection.png')});
 await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Mein Entwurf bleibt auch beim Abwählen.');
 await blank(page);await expect(page.locator('.row-selected')).toHaveCount(0);await expect(page.locator('.assistant-panel')).toBeHidden();
 await range(page);await button(page,'Notiz schreiben').click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Mein Entwurf bleibt auch beim Abwählen.');await button(page,'Lesehilfe schließen').click();
 await page.locator('.source-row').nth(3).locator('[data-text]').click();await expect(page.locator('.row-selected')).toHaveCount(0);
 await button(page,'Vers 5 auswählen').click();await expect(button(page,'Lesemodus')).toHaveAttribute('aria-pressed','true');await page.locator('.source-row').nth(3).locator('[data-text]').click();await expect(page.locator('.row-selected')).toHaveCount(0);
 // Blank space also ends a half-finished two-tap range.
 await button(page,'Bereich durch Antippen auswählen').click();await button(page,'Vers 5 auswählen').click();await blank(page);await expect(page.locator('.row-selected')).toHaveCount(0);await expect(button(page,'Lesemodus')).toHaveAttribute('aria-pressed','true');
});

test('scroll, cancelled touch and pinch do not deselect; options and Escape remain predictable',async({page})=>{
 await range(page);
 await page.locator('[data-text]').first().evaluate(el=>{
  const fire=(type:string,id:number,x:number,y:number,primary=true)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',isPrimary:primary,clientX:x,clientY:y}));
  fire('pointerdown',17,200,300);fire('pointermove',17,200,260);fire('pointerup',17,200,260);el.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));
  fire('pointerdown',18,200,300);fire('pointercancel',18,200,300);el.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));
  fire('pointerdown',19,200,300);fire('pointerdown',20,240,300,false);fire('pointerup',19,200,300);fire('pointerup',20,240,300,false);el.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));
 });
 await expect(page.locator('.row-selected')).toHaveCount(2);
 await button(page,'Auswahloptionen').click();await expect(page.getByRole('group',{name:'Textauswahl bearbeiten',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(button(page,'Auswahloptionen')).toBeFocused();await expect(page.locator('.row-selected')).toHaveCount(2);
 await page.keyboard.press('Escape');await expect(page.locator('.row-selected')).toHaveCount(0);
});

test('single-selection controls stay compact and beside the text at every iPad dock',async({page},testInfo)=>{
 test.setTimeout(60000);await range(page);await button(page,'Hören und mitlesen').click();
 for(const viewport of [{width:834,height:1194},{width:1194,height:834},{width:680,height:759},{width:834,height:520}]){
  await page.setViewportSize(viewport);
  for(const edge of ['Up','Right','Down','Left']){
   await button(page,'Werkzeugleiste verschieben').press(`Shift+Arrow${edge}`);
   await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{
    const bar=el.getBoundingClientRect(),header=document.querySelector('.reader-header')!.getBoundingClientRect(),footer=document.querySelector('.reading-footer')!.getBoundingClientRect(),buttons=[...el.querySelectorAll('.workspace-main button')].map(b=>b.getBoundingClientRect()).filter(r=>r.width&&r.height);
    return bar.left>=0&&bar.right<=innerWidth+1&&bar.top>=header.bottom&&bar.bottom<=footer.top+1&&buttons.every((r,i)=>r.left>=bar.left&&r.right<=bar.right+1&&r.top>=bar.top&&r.bottom<=bar.bottom+1&&buttons.slice(i+1).every(s=>Math.min(r.right,s.right)-Math.max(r.left,s.left)<=1||Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)<=1));
   })).toBe(true);
   if(edge==='Right'||edge==='Left')await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{const bar=el.getBoundingClientRect(),text=document.querySelector('.source-row [data-text]')!.getBoundingClientRect();return el.getAttribute('data-dock')==='left'?bar.right<=text.left:bar.left>=text.right;})).toBe(true);
   await button(page,'Auswahloptionen').click();await expect(button(page,'Weitere Stelle auswählen')).toBeVisible();await page.keyboard.press('Escape');
  }
  await page.screenshot({animations:'disabled',path:testInfo.outputPath(`single-selection-${viewport.width}x${viewport.height}.png`)});
 }
});
