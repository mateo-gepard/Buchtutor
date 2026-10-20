import {test,expect} from '@playwright/test';
import {ONBOARDING_KEY} from '../../lib/onboarding';

test('small side-docked readers keep inline note controls inside the card',async({page})=>{
 await page.addInitScript(key=>localStorage.setItem(key,'1'),ONBOARDING_KEY);
 await page.goto('/?work=iphigenie&section=s001&view=reader');
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 for(const width of [320,390,680]){
  await page.setViewportSize({width,height:740});
  for(const edge of ['Left','Right']){
   await page.getByRole('button',{name:'Werkzeugleiste verschieben',exact:true}).press(`Shift+Arrow${edge}`);
   await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
   await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Ein Gedanke zur Textstelle.');
   await expect.poll(()=>page.locator('.assistant-panel').evaluate(el=>{
    const card=el.getBoundingClientRect(),bar=document.querySelector('.reader-workspace')!.getBoundingClientRect();
    return card.left>=0&&card.right<=innerWidth+1&&(card.right<=bar.left||card.left>=bar.right)&&[...el.querySelectorAll('button,textarea')].filter(button=>button.getClientRects().length).every(button=>{
     const r=button.getBoundingClientRect();return r.left>=card.left&&r.right<=card.right&&r.top>=card.top&&r.bottom<=card.bottom;
    });
   }),{message:`All note controls remain in the card at ${width}px, dock ${edge}`}).toBe(true);
   await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();
  }
 }
});
