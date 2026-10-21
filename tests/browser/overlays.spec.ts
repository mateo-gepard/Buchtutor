import {readFileSync} from 'node:fs';
import type {Locator} from '@playwright/test';
import {test,expect,useLocalHandwriting,type Page} from './reader-test';

const note='Dieser Entwurf bleibt hinter dem Dialog erhalten.';
const modalCases=[
 {kind:'settings',name:'Einstellungen',trigger:'Leseeinstellungen'},
 {kind:'contents',name:'Inhaltsverzeichnis',trigger:'Inhalt'},
 {kind:'search',name:'Stelle finden',trigger:'Text durchsuchen oder zu einem Vers springen'},
 {kind:'share',name:'Stelle teilen',trigger:'Stelle teilen'},
 {kind:'source',name:'Quelle und Zitierweise',trigger:'Quelle und Zitierweise'},
] as const;

async function activate(trigger:Locator){
 // Keyboard activation also gives Safari an explicit focus return destination.
 await trigger.focus();await trigger.press('Enter');
}

async function modalCoversTools(page:Page,dialog:Locator){
 await expect(dialog).toBeVisible();
 await expect.poll(()=>dialog.evaluate(el=>{
  const r=el.getBoundingClientRect();
  return r.width>0&&r.height>0&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
 }),{message:'The complete modal stays within the viewport'}).toBe(true);
 await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{
  const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  if(x<0||x>=innerWidth||y<0||y>=innerHeight)return 'toolbar outside viewport';
  const topModal=()=>{
   const hit=document.elementFromPoint(x,y);
   return hit?.closest('[data-slot="dialog-content"][data-state="open"],[data-slot="dialog-overlay"][data-state="open"]')?'modal':hit?.outerHTML.slice(0,180)??'nothing';
  };
  const actual=topModal(),toolbar=el as HTMLElement,value=toolbar.style.getPropertyValue('pointer-events'),priority=toolbar.style.getPropertyPriority('pointer-events');
  // Radix disables pointer events behind a modal. Expose the toolbar to hit
  // testing briefly so an incorrectly painted toolbar cannot pass unnoticed.
  toolbar.style.setProperty('pointer-events','auto','important');
  try{return actual==='modal'?topModal():actual;}
  finally{if(value)toolbar.style.setProperty('pointer-events',value,priority);else toolbar.style.removeProperty('pointer-events');}
 }),{message:'The dialog or its backdrop paints above the toolbar center'}).toBe('modal');
 await dialog.getByRole('button',{name:'Schließen',exact:true}).focus();
 for(const key of ['Tab','Tab','Tab','Tab','Tab','Shift+Tab','Shift+Tab']){
  await page.keyboard.press(key);
  await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement)),{message:`${key} keeps focus in the top modal`}).toBe(true);
 }
}

test.beforeEach(async({page,context})=>{
 await useLocalHandwriting(context);
 await page.route('**/api/analysis',route=>route.fulfill({status:503,json:{error:'Overlay test: no model request.'}}));
 await page.route('**/api/handwriting',route=>route.fulfill({status:503,json:{error:'Overlay test: no handwriting request.'}}));
 await page.goto('/?work=iphigenie&section=s001&view=reader');
 await expect(page.locator('.reader-bookmark')).toBeEnabled();
});

for(const item of modalCases)test(`${item.name} covers the toolbar, traps focus and preserves the reader on Escape`,async({page})=>{
 await page.locator('.line-number').first().click();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill(note);
 const trigger=item.kind==='settings'?page.locator('button[aria-label="Leseeinstellungen"]:visible').first():item.kind==='contents'&&!(await page.getByRole('button',{name:'Inhalt',exact:true}).isVisible())?page.locator('.footer-section'):page.getByRole('button',{name:item.trigger,exact:true});
 await activate(trigger);
 const dialog=page.getByRole('dialog',{name:item.name,exact:true});
 await modalCoversTools(page,dialog);
 await page.keyboard.press('Escape');
 await expect(dialog).toBeHidden();await expect(page.locator('[data-slot="dialog-content"][data-state="open"]')).toHaveCount(0);
 await expect(trigger).toBeFocused();
 await expect(page.locator('.source-row.row-selected').first()).toBeAttached();
 if(item.kind==='contents'){
  // Opening contents deliberately folds the note card; Escape keeps that state.
  await expect(page.locator('.assistant-panel')).toBeHidden();
  await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 }else await expect(page.locator('.assistant-panel')).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue(note);
});

test('settings leaves the chosen Pencil color and its open palette intact',async({page})=>{
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 const color=page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true});
 await color.click();await page.locator('.pencil-mobile-palette>button').nth(1).click();
 const chosen=await color.getAttribute('title');
 await color.click();await expect(color).toHaveAttribute('aria-expanded','true');
 const trigger=page.locator('button[aria-label="Leseeinstellungen"]:visible').first();
 await activate(trigger);const dialog=page.getByRole('dialog',{name:'Einstellungen',exact:true});await modalCoversTools(page,dialog);
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
 await expect(page.getByRole('button',{name:'Apple Pencil Modus',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(color).toHaveAttribute('aria-expanded','true');await expect(color).toHaveAttribute('title',chosen!);
 await expect(page.locator('.pencil-mobile-palette')).toBeVisible();
});

test('settings leaves the same audio player and its details intact',async({page})=>{
 const manifest=JSON.parse(readFileSync('public/audiobooks/iphigenie.json','utf8'));
 await page.route('**/audiobooks/iphigenie.json',route=>route.fulfill({json:manifest}));
 await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();
 await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Hörbuch-Details öffnen',exact:true}).click();
 await page.getByRole('combobox',{name:'Hörtempo',exact:true}).selectOption('1.5');
 const media=await page.locator('audio').elementHandle(),trigger=page.locator('button[aria-label="Leseeinstellungen"]:visible').first();
 await activate(trigger);const dialog=page.getByRole('dialog',{name:'Einstellungen',exact:true});await modalCoversTools(page,dialog);
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
 await expect(page.locator('.audio-details')).toBeVisible();await expect(page.getByRole('combobox',{name:'Hörtempo',exact:true})).toHaveValue('1.5');
 expect(await media!.evaluate(el=>el.isConnected&&(el as HTMLAudioElement).paused)).toBe(true);
});

test('expanded figures dismisses only the modal and returns to the selected parent figure',async({page})=>{
 await page.getByRole('button',{name:'Lesehilfe öffnen',exact:true}).click();
 await page.getByRole('button',{name:'Figuren',exact:true}).click();
 const person=page.locator('.assistant-panel .constellation-node').first();await person.click();await expect(person).toHaveAttribute('aria-pressed','true');
 const trigger=page.getByRole('button',{name:'Figurenkonstellation vergrößern',exact:true});
 await activate(trigger);const dialog=page.getByRole('dialog',{name:'Figurenkonstellation',exact:true});await modalCoversTools(page,dialog);
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
 await expect(page.locator('.assistant-panel')).toBeVisible();await expect(trigger).toBeFocused();await expect(person).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('button',{name:'Figuren',exact:true})).toHaveAttribute('aria-pressed','true');
});
