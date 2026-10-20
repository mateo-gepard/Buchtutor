import {test,expect,type Page} from './reader-test';
import {defaultPrefs,preferencesSchema} from '../../lib/preferences';
const reader='/?work=iphigenie&section=s001&view=reader';
test.use({userAgent:'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',hasTouch:true});
async function markAndWrite(page:Page){
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.locator('[data-text]').first().evaluate(el=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,range=document.createRange();range.setStart(node,1);range.setEnd(node,5);const r=range.getBoundingClientRect();
  for(const [type,x] of [['pointerdown',r.left],['pointermove',r.right],['pointerup',r.right]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:201,clientX:x,clientY:r.top+r.height/2}));
 });
 await page.locator('.pencil-text').evaluate(el=>{
  const row=el.querySelector('[data-block]')!.getBoundingClientRect(),r=el.getBoundingClientRect();
  for(const [type,x,y] of [['pointerdown',r.left-28,row.top+3],['pointermove',r.left-34,row.top+20],['pointerup',r.left-20,row.top+30]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:203,clientX:x,clientY:y}));
 });
}
test('writing and Done recognize by default; switching off persists without another request',async({page},testInfo)=>{
 let calls=0;await page.route('**/api/handwriting',route=>{calls++;return route.fulfill({json:{text:'Natur als Zuflucht',uncertain:false}});});
 await page.goto(reader);await markAndWrite(page);
 await expect(page.locator('.pencil-inline-note')).toHaveCount(0);
 await expect(page.locator('.pencil-handwriting-hint')).toContainText('über OpenRouter an Google');
 await expect(page.getByRole('button',{name:'Online-Erkennung aktivieren'})).toHaveCount(0);
 // The explanatory notice does not need to be dismissed before Done.
 await page.getByRole('button',{name:'Fertig',exact:true}).click();
 await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/Suchtext gespeichert/);expect(calls).toBe(1);
 await expect(page.locator('[data-ink-saved=true] path')).toHaveCount(1);
 await page.reload();await expect(page.locator('.annotation-marker')).toHaveAttribute('aria-label',/Suchtext gespeichert/);expect(calls).toBe(1);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true}).click();await page.getByRole('button',{name:'Farbbedeutungen anpassen',exact:true}).click();
 const checkbox=page.getByRole('checkbox',{name:/Handschrift automatisch erkennen/});await expect(checkbox).toBeChecked();await checkbox.uncheck();
 await expect(page.locator('.pencil-inline-note')).toHaveCount(1);
 await page.reload();await markAndWrite(page);
 await expect(page.locator('.pencil-inline-note')).not.toHaveCount(0);
 await page.getByRole('button',{name:'Fertig',exact:true}).click();
 await expect(page.locator('.pencil-workspace')).toHaveCount(0);expect(calls).toBe(1);
 await page.screenshot({path:testInfo.outputPath('handwriting-default-and-opt-out.png')});
});
test('older preferences without an OCR field use the new default; a saved false is preserved',async({context,page})=>{
 const old:Partial<typeof defaultPrefs>={...defaultPrefs};delete old.handwritingCloud;
 expect(preferencesSchema.parse(old).handwritingCloud).toBe(true);
 expect(preferencesSchema.parse({...old,handwritingCloud:false}).handwritingCloud).toBe(false);
 await context.addInitScript(value=>localStorage.setItem('leseraum-reading-preferences-v1',JSON.stringify(value)),old);
 await page.goto(reader);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true}).click();await page.getByRole('button',{name:'Farbbedeutungen anpassen',exact:true}).click();
 await expect(page.getByRole('checkbox',{name:/Handschrift automatisch erkennen/})).toBeChecked();
});
