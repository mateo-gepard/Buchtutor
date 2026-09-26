import {test,expect,type Page} from '@playwright/test';
import type {LocalSnapshot} from '../../lib/local-model';

async function stored(page:Page):Promise<LocalSnapshot>{
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const open=indexedDB.open('leseraum-local-v2');
    open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{const db=open.result,request=db.transaction('state').objectStore('state').get('reader');request.onsuccess=()=>{resolve(request.result);db.close();};request.onerror=()=>{reject(request.error);db.close();};};
  }));
}
async function settings(page:Page){await page.getByRole('button',{name:'Leseeinstellungen',exact:true}).first().click();}
async function transfer(page:Page){await settings(page);await page.getByRole('button',{name:'Geräteübertragung',exact:true}).click();}
const bookUrl='/?work=iphigenie&section=s001&view=reader';

test.beforeEach(async({page})=>{
  page.on('pageerror',error=>expect.soft(error.message,'No browser runtime error').toBe(''));
  await page.route('**/api/analysis',route=>route.fulfill({status:503,json:{error:'Browser test: no model request.'}}));
  await page.goto(bookUrl);
  await expect(page.locator('.reader-bookmark')).toBeEnabled();
});

test('manual bookmark toggles without duplicates and survives encrypted transfer to a fresh device',async({page,browser},testInfo)=>{
  await page.getByRole('button',{name:'Vers 6 auswählen',exact:true}).click();
  await page.locator('.reader-bookmark').click();
  await expect(page.locator('.reader-bookmark')).toHaveAttribute('aria-pressed','true');
  await page.locator('.reader-bookmark').click();
  await expect(page.locator('.reader-bookmark')).toHaveAttribute('aria-pressed','false');
  await page.locator('.reader-bookmark').click();
  await expect.poll(async()=>(await stored(page)).notes.filter(note=>note.kind==='bookmark'&&!note.deletedAt).length).toBe(1);
  const bookmark=(await stored(page)).notes.find(note=>note.kind==='bookmark'&&!note.deletedAt)!;
  await settings(page);
  await page.getByRole('switch',{name:'Automatisches Lesezeichen'}).click();
  await expect(page.getByRole('switch',{name:'Automatisches Lesezeichen'})).not.toBeChecked();
  await page.getByRole('button',{name:'Geräteübertragung',exact:true}).click();
  await page.getByLabel('Passwort für die Sicherung').fill('Mein Testgeraet 2026!');
  await page.getByLabel('Passwort wiederholen').fill('Mein Testgeraet 2026!');
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Sicherung herunterladen'}).click();
  const download=await downloadEvent,path=testInfo.outputPath('bookmark.buchtutor');
  await download.saveAs(path);

  const other=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:834,height:1194}});
  try{
    const device=await other.newPage();
    await device.goto(bookUrl);await expect(device.locator('.reader-bookmark')).toBeEnabled();
    await transfer(device);
    await device.getByRole('button',{name:'Importieren',exact:true}).click();
    await device.getByLabel('Sicherungsdatei').setInputFiles(path);
    await device.getByLabel('Passwort der Sicherung').fill('Mein Testgeraet 2026!');
    await device.getByRole('button',{name:'Datei prüfen'}).click();
    await expect(device.locator('.import-preview')).toContainText('1 Lesezeichen');
    await device.getByRole('button',{name:'Auf dieses Gerät übernehmen'}).click();
    await expect.poll(async()=>(await stored(device)).notes.find(note=>note.id===bookmark.id)?.anchor).toEqual(bookmark.anchor);
    expect((await stored(device)).preferences.value.autoBookmark).toBe(false);
    await device.getByRole('button',{name:'Schließen',exact:true}).click();
    await device.getByRole('button',{name:'Zur Bibliothek',exact:true}).click();
    await device.getByRole('button',{name:'Meine Notizen',exact:true}).click();
    await device.getByRole('button',{name:'Lesezeichen',exact:true}).click();
    await expect(device.locator('.note-card')).toHaveCount(1);
    await device.locator('.note-open').click();
    await expect(device.locator('.panel-notes .selection-excerpt')).toContainText(bookmark.anchor.quote);
    await expect(device.locator('.reader-bookmark')).toHaveAttribute('aria-pressed','true');
  }finally{await other.close();}
});

test('automatic bookmark toggle stops saving and restores its setting after reload',async({page})=>{
  await expect.poll(async()=>(await stored(page))?.progress.length??0).toBeGreaterThan(0);
  await settings(page);
  await page.getByRole('switch',{name:'Automatisches Lesezeichen'}).click();
  await expect(page.getByRole('switch',{name:'Automatisches Lesezeichen'})).not.toBeChecked();
  await expect.poll(async()=>(await stored(page)).preferences.value.autoBookmark).toBe(false);
  await page.getByRole('button',{name:'Schließen',exact:true}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const before=(await stored(page)).progress;
  await page.locator('[data-block]').nth(35).evaluate(element=>element.scrollIntoView({block:'start'}));
  await page.waitForTimeout(1200); // Cross the real 800 ms persistence debounce while disabled.
  expect((await stored(page)).progress).toEqual(before);
  await page.reload();await expect(page.locator('.reader-bookmark')).toBeEnabled();
  await settings(page);
  await expect(page.getByRole('switch',{name:'Automatisches Lesezeichen'})).not.toBeChecked();
  await page.getByRole('switch',{name:'Automatisches Lesezeichen'}).click();
  await expect(page.getByRole('switch',{name:'Automatisches Lesezeichen'})).toBeChecked();
  await page.getByRole('button',{name:'Schließen',exact:true}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('[data-block]').nth(50).evaluate(element=>element.scrollIntoView({block:'start'}));
  await expect.poll(async()=>(await stored(page)).progress[0]?.blockId).not.toBe(before[0].blockId);
  const remembered=(await stored(page)).progress[0];
  await page.reload();await expect(page.locator('.reader-bookmark')).toBeEnabled();
  await expect(page.locator(`[data-block="${remembered.blockId}"]`)).toBeInViewport();
});

test('share links open the selected verse and expose branded metadata without private data',async({page,context},testInfo)=>{
  await page.getByRole('button',{name:'Vers 6 auswählen',exact:true}).click();
  const block=await page.locator('.row-selected').getAttribute('data-block');
  await page.getByRole('button',{name:'Stelle teilen',exact:true}).click();
  const url=await page.getByLabel('Link zu dieser Stelle').inputValue();
  expect(new URL(url).hash).toBe('#'+block);
  expect([...new URL(url).searchParams.keys()]).toEqual(['work','section','view']);
  const telegram=new URL((await page.getByRole('link',{name:'Telegram',exact:true}).getAttribute('href'))!);
  expect(telegram.searchParams.get('url')).toBe(url);
  await expect(page.getByRole('link',{name:'WhatsApp',exact:true})).toHaveAttribute('rel','noopener noreferrer');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content','Iphigenie auf Tauris · Buchtutor');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content','https://www.buchtutor.de/brand/buchtutor-share.png');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('share.png')});
  const destination=await context.newPage();
  await destination.goto(url);
  await expect(destination.locator(`[data-block="${block}"]`)).toBeInViewport();
  await destination.close();
});

test('unknown routes and unavailable works show the custom 404 with a working library link',async({page},testInfo)=>{
  const response=await page.goto('/diese-seite-gibt-es-nicht');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading',{name:'Dieser Link führt ins Leere.'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('404.png')});
  await page.getByRole('link',{name:'Zur Bibliothek',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Bibliothek',exact:true})).toBeVisible();
  await page.goto('/?work=unbekannt&view=reader');
  await expect(page.getByRole('heading',{name:'Dieser Link führt ins Leere.'})).toBeVisible();
});

test('copy and native sharing pass only the public link and citation',async({page})=>{
  await page.evaluate(()=>{
    const state=window as Window&{shared?:ShareData;copied?:string};
    Object.defineProperty(navigator,'share',{configurable:true,value:async(data:ShareData)=>{state.shared=data;}});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{state.copied=text;}}});
  });
  await page.getByRole('button',{name:'Stelle teilen',exact:true}).click();
  const url=await page.getByLabel('Link zu dieser Stelle').inputValue();
  await page.getByRole('button',{name:'Mit Gerät teilen',exact:true}).click();
  const payload=await page.evaluate(()=>(window as Window&{shared?:ShareData}).shared!);
  expect(payload.url).toBe(url);
  expect(payload.title).toBe('Iphigenie auf Tauris · Buchtutor');
  expect(Object.keys(payload).sort()).toEqual(['text','title','url']);
  await page.getByRole('button',{name:'Link kopieren',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Link kopiert.');
  expect(await page.evaluate(()=>(window as Window&{copied?:string}).copied)).toBe(url);
});

test('selection controls remain inside the toolbar on a 320 px screen',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:740});
  await page.getByRole('button',{name:'Vers 6 auswählen',exact:true}).click();
  const dock=page.getByRole('group',{name:'Aktionen zur Textauswahl'});
  await expect(dock).toBeVisible();
  const bounds=(await dock.boundingBox())!;
  for(const button of await dock.getByRole('button').all()){
    const box=(await button.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);
    expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({path:testInfo.outputPath('mobile-320.png')});
});
