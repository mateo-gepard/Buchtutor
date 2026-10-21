import {test,expect,useLocalHandwriting,type Page} from './reader-test';
const reader='/?work=iphigenie&section=s001&view=reader';
test.beforeEach(async({page,context})=>{
 await useLocalHandwriting(context);await context.addInitScript(()=>localStorage.setItem('buchtutor-pencil-handwriting-hint-v1','1'));
 await page.route('**/api/handwriting',()=>{throw new Error('Eraser tests never call paid recognition');});
 await page.goto(reader);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.locator('[data-text]').first().evaluate(el=>{
  const range=document.createRange();range.selectNodeContents(el);const r=range.getClientRects()[0];
  for(const [type,x] of [['pointerdown',r.left+2],['pointermove',r.left+80],['pointerup',r.left+80]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:801,clientX:x,clientY:r.top+r.height/2}));
 });
 await expect(page.locator('.saved-highlight')).toHaveCount(1);
});
async function draw(page:Page,points:{x:number;y:number}[],button=0){
 await page.locator('.pencil-text').evaluate((el,{points,button})=>{
  const root=el.getBoundingClientRect(),row=el.querySelector('[data-block]')!.getBoundingClientRect(),scale=Number(el.closest('[data-document-scale]')!.getAttribute('data-document-scale'));
  points.forEach((point,i)=>el.dispatchEvent(new PointerEvent(i===0?'pointerdown':i===points.length-1?'pointerup':'pointermove',{bubbles:true,cancelable:true,pointerType:'pen',pointerId:802,button,buttons:button===5?32:1,clientX:root.left+point.x*scale,clientY:row.top+point.y*scale,pressure:.6})));
 },{points,button});
}
async function settings(page:Page){await page.getByRole('button',{name:'Radiergummi',exact:true}).dispatchEvent('contextmenu');await expect(page.getByRole('group',{name:'Radierer-Einstellungen',exact:true})).toBeVisible();}
async function size(page:Page,value:number){
 const input=page.getByRole('slider',{name:'Radierergröße',exact:true});await expect(input).toBeEnabled();await input.evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);await input.dispatchEvent('pointerup');await expect(input).toBeEnabled();
}
test('precise erasing splits a saved line, undo restores it, and fragments survive saving and reload',async({page})=>{
 await page.getByRole('button',{name:'Auf der Seite schreiben',exact:true}).click();await draw(page,[{x:-45,y:12},{x:40,y:12}]);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('[data-ink-saved=true] path')).toHaveCount(1);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await settings(page);await page.getByRole('button',{name:'Präziser Radierer',exact:false}).click();await size(page,8);await page.getByRole('button',{name:'Radierer-Einstellungen schließen',exact:true}).click();
 const original=await page.locator('[data-ink-group] path').getAttribute('d');await draw(page,[{x:-15,y:0},{x:-15,y:24}]);await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
 await page.getByRole('button',{name:'Letzten Strich entfernen',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',original!);
 await draw(page,[{x:-15,y:0},{x:-15,y:24}]);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await page.reload();await expect(page.locator('[data-ink-saved=true] path')).toHaveCount(2);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await settings(page);await expect(page.getByRole('button',{name:'Präziser Radierer',exact:false})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('slider',{name:'Radierergröße'})).toHaveValue('8');
});
test('scribble-to-erase is explicit, preserves ordinary writing and supports undo',async({page})=>{
 await page.getByRole('button',{name:'Auf der Seite schreiben',exact:true}).click();await draw(page,[{x:-45,y:12},{x:40,y:12}]);await settings(page);await expect(page.getByRole('checkbox',{name:/Kritzeln zum Radieren/})).not.toBeChecked();await page.getByRole('checkbox',{name:/Kritzeln zum Radieren/}).check();await page.getByRole('button',{name:'Radierer-Einstellungen schließen',exact:true}).click();
 await page.keyboard.press('e');await expect(page.getByRole('button',{name:'Auf der Seite schreiben',exact:true})).toHaveAttribute('aria-pressed','true');
 await draw(page,Array.from({length:11},(_,i)=>({x:i%2?35:-35,y:i*2})));await expect(page.locator('[data-ink-group] path')).toHaveCount(0);await expect(page.locator('.pencil-error')).toContainText('Weggekritzelt');
 await page.getByRole('button',{name:'Letzten Strich entfernen',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
 await draw(page,Array.from({length:15},(_,i)=>({x:50+i*3,y:Math.sin(i)*10+5})));await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
});
test('quick switch restores the previous tool, ignores typing and accepts a real pen eraser button',async({page})=>{
 await page.getByRole('button',{name:'Auf der Seite schreiben',exact:true}).click();await draw(page,[{x:-30,y:3},{x:-30,y:26}]);
 await page.keyboard.press('e');await expect(page.getByRole('button',{name:'Radiergummi',exact:true})).toHaveAttribute('aria-pressed','true');await page.keyboard.press('e');await expect(page.getByRole('button',{name:'Auf der Seite schreiben',exact:true})).toHaveAttribute('aria-pressed','true');
 await draw(page,[{x:-35,y:10},{x:-25,y:10}],5);await expect(page.locator('[data-ink-group] path')).toHaveCount(0);await expect(page.getByRole('button',{name:'Auf der Seite schreiben',exact:true})).toHaveAttribute('aria-pressed','true');
 const eraser=page.getByRole('button',{name:'Radiergummi',exact:true});await eraser.dispatchEvent('pointerdown',{pointerType:'pen',pointerId:804});await expect(page.getByRole('group',{name:'Radierer-Einstellungen',exact:true})).toBeVisible();await eraser.dispatchEvent('pointerup',{pointerType:'pen',pointerId:804});await expect(page.getByText(/Doppeltippen am Pencil-Schaft/)).toBeVisible();await page.getByRole('slider',{name:'Radierergröße'}).focus();await page.keyboard.press('e');await expect(page.getByRole('group',{name:'Radierer-Einstellungen',exact:true})).toBeVisible();
});

test('precise erasing cuts letters inside a highlight while keeping its canonical note',async({page})=>{
 await settings(page);await page.getByRole('button',{name:'Präziser Radierer',exact:false}).click();await size(page,4);await page.getByRole('button',{name:'Radierer-Einstellungen schließen',exact:true}).click();
 await page.locator('[data-text]').first().evaluate(el=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,range=document.createRange();range.setStart(node,2);range.setEnd(node,3);const r=range.getBoundingClientRect();
  for(const type of ['pointerdown','pointerup'])el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:806,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
 });
 await expect(page.locator('.saved-highlight').first()).toHaveText('He');await expect(page.locator('.saved-highlight').nth(1)).toContainText('aus');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await page.reload();await expect(page.locator('.saved-highlight').first()).toHaveText('He');
});
