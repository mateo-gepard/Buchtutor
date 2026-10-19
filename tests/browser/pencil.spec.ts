import {test,expect,type Page} from '@playwright/test';
async function mark(page:Page,index=0,pointerType='pen'){
 const text=page.locator('[data-text]').nth(index);await text.scrollIntoViewIfNeeded();
 await text.evaluate((el,pointerType)=>{
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),node=walker.nextNode()!;
  const range=document.createRange();range.setStart(node,1);range.setEnd(node,5);const r=range.getBoundingClientRect(),y=r.top+r.height/2;
  for(const [type,x] of [['pointerover',r.left],['pointerdown',r.left],['pointermove',r.right],['pointerup',r.right]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:91,pointerType,clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));
 },pointerType);
}
async function ink(page:Page){
 await page.locator('.pencil-pad').evaluate(el=>{
  const r=el.getBoundingClientRect();
  for(const [type,x,y] of [['pointerdown',30,30],['pointermove',50,60],['pointerup',80,20]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:92,pointerType:'pen',clientX:r.left+x,clientY:r.top+y,pressure:0.7}));
 });
}
test.beforeEach(async({page})=>{await page.goto('/?work=iphigenie&section=s001&view=reader');await expect(page.locator('[data-text]').first()).toContainText('Heraus');await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();});
test('Pencil selects whole words, ignores fingers, links recognized handwriting and persists filterable notes',async({page})=>{
 const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));
 let requests=0;await page.route('**/api/handwriting',async route=>{requests++;expect(route.request().postDataJSON().image).toMatch(/^data:image\/png;base64,/);await route.fulfill({json:{text:'Natur als Zuflucht',uncertain:false}});});
 await mark(page,0,'touch');await expect(page.getByLabel('Markierung für Handschrift auswählen')).toHaveCount(0);
 await mark(page);await expect(page.locator('.pencil-detail blockquote')).toHaveText('Heraus');
 await ink(page);await expect(page.locator('.pencil-pad path')).toHaveCount(1);
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.getByRole('region',{name:'Apple Pencil Werkzeuge'})).toHaveCount(0);expect(requests).toBe(1);
 await page.reload();await expect(page.locator('.saved-highlight').filter({hasText:'Heraus'})).toBeVisible();
 await page.getByRole('button',{name:'Zur Bibliothek'}).click();await page.getByRole('button',{name:'Meine Notizen',exact:true}).click();
 await expect(page.locator('.note-card')).toContainText('Natur als Zuflucht');await expect(page.locator('.note-card')).toContainText('Grün · Stilmittel');
 await page.getByLabel('Nach Markierungsfarbe filtern').selectOption('blue');await expect(page.locator('.note-card')).toHaveCount(0);
 await page.getByLabel('Nach Markierungsfarbe filtern').selectOption('green');await expect(page.locator('.note-card')).toHaveCount(1);
 await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('Zuflucht');await expect(page.locator('.note-card')).toHaveCount(1);
 await page.getByText('Originalhandschrift',{exact:true}).click();await expect(page.locator('.saved-ink path')).toHaveCount(1);
 expect(failures).toEqual([]);
});
test('failed recognition keeps its draft across reload and can be retried or saved as typed text',async({page})=>{
 await page.route('**/api/handwriting',route=>route.fulfill({status:503,json:{error:'Test: Erkennung nicht erreichbar.'}}));
 await mark(page);await ink(page);await page.getByRole('button',{name:'Fertig',exact:true}).click();
 await expect(page.locator('.pencil-error')).toContainText('Erkennung nicht erreichbar');
 await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.locator('.pencil-detail blockquote')).toHaveText('Heraus');await expect(page.locator('.pencil-pad path')).toHaveCount(1);
 await page.getByRole('textbox',{name:'Notiz zur Pencil-Markierung'}).fill('Manuell gerettete Notiz');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.getByRole('region',{name:'Apple Pencil Werkzeuge'})).toHaveCount(0);
});
test('multiple colors keep separate anchors and meanings without sending typed notes to AI',async({page})=>{
 let requests=0;await page.route('**/api/handwriting',route=>{requests++;return route.abort();});
 await mark(page);await page.getByRole('textbox',{name:'Notiz zur Pencil-Markierung'}).fill('Stil');
 await page.getByRole('button',{name:'Blau: Interpretationsansatz',exact:true}).click();await mark(page,1);await page.getByRole('textbox',{name:'Notiz zur Pencil-Markierung'}).fill('Deutung');
 await expect(page.getByLabel('Markierung für Handschrift auswählen').locator('option')).toHaveCount(2);
 await page.getByRole('button',{name:'Fertig',exact:true}).click();expect(requests).toBe(0);
 await expect(page.locator('.saved-highlight')).toHaveCount(2);
});
