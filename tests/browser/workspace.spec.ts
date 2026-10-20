import {test,expect,type Page} from '@playwright/test';
import {ONBOARDING_KEY} from '../../lib/onboarding';

async function fits(page:Page,selector:string){
 await expect.poll(()=>page.locator(selector).evaluate(el=>{
  const r=el.getBoundingClientRect(),header=document.querySelector('.reader-header')!.getBoundingClientRect(),footer=document.querySelector('.reading-footer')!.getBoundingClientRect();
  return r.left>=0&&r.right<=innerWidth+1&&r.top>=header.bottom&&r.bottom<=footer.top+1;
 })).toBe(true);
}
async function readingRoom(page:Page){
 await fits(page,'.assistant-panel');
 expect(await page.locator('.assistant-panel').evaluate(el=>{
  const panel=el.getBoundingClientRect(),tools=document.querySelector('.reader-workspace')!.getBoundingClientRect(),text=document.querySelector('.reading-main')!.getBoundingClientRect();
  return innerWidth>=760?panel.width<=360&&text.right<=panel.left&&text.width>=400:panel.height<=innerHeight*.42+1&&panel.top-tools.bottom>=150;
 })).toBe(true);
}
test.beforeEach(async({page})=>{
 await page.addInitScript(key=>localStorage.setItem(key,'1'),ONBOARDING_KEY);
 await page.route('**/api/analysis',()=>{throw new Error('Opening tools must not start AI requests');});
 await page.goto('/?work=iphigenie&section=s001&view=reader');
});
test('each accessory preserves reading space in portrait, landscape and narrow readers',async({page},testInfo)=>{
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await fits(page,'.reader-workspace');
 const bar=await page.locator('.reader-workspace').boundingBox();
 expect(bar!.height).toBeLessThanOrEqual(page.viewportSize()!.width>=600?60:114);
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
