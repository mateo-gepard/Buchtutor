import {test,expect,type Page} from '@playwright/test';

async function openWithoutTour(page:Page){
 await page.route('**/api/analysis',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Lesehilfe für die Browserprüfung offline.'})}));
 await page.route('**/api/handwriting',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Handschrifterkennung für die Browserprüfung offline.'})}));
 await page.goto('/');
 await page.getByRole('button',{name:'Werk wählen',exact:true}).click();
 await page.getByRole('button',{name:'Faust I – öffnen',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Faust I · Zueignung',exact:true})).toBeAttached();
}

async function expectNamedCoreTools(page:Page){
 for(const name of ['Lesemodus','Bereich durch Antippen auswählen','Apple Pencil Modus','Notiz schreiben','Lesehilfe öffnen']){
  const button=page.getByRole('button',{name,exact:true});
  await expect(button.locator(':scope > span:not(.sr-only)').first()).toBeVisible();
  const box=await button.boundingBox();
  // Docking transforms can report 43.99998px for a 44px CSS target.
  expect(box!.width,name+' width').toBeGreaterThanOrEqual(43.99);
  expect(box!.height,name+' height').toBeGreaterThanOrEqual(43.99);
 }
}

for(const [width,height] of [[390,844],[600,1000],[834,1194]] as const){
 test(`a new reader can discover and finish a passage selection at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height});
  await openWithoutTour(page);
  await expectNamedCoreTools(page);
  const select=page.getByRole('button',{name:'Bereich durch Antippen auswählen',exact:true});
  const label=select.locator('.reader-selection-label');
  await expect(label).toHaveText('Auswahl');
  const beforeStart=await page.locator('.source-row').first().boundingBox();
  await select.click();
  await expect(label).toHaveText('Anfangantippen');
  await expect(select.getByRole('status')).toHaveText('Tippe den Anfang deiner Textstelle an.');
  await expect(page.locator('.reading-page .reader-selection-label')).toHaveCount(0);
  expect(Math.abs((await page.locator('.source-row').first().boundingBox())!.y-beforeStart!.y)).toBeLessThan(1);
  await page.getByRole('button',{name:'Vers 1 auswählen',exact:true}).click();
  await expect(label).toHaveText('Endeantippen');
  await expect(select.getByRole('status')).toHaveText('Tippe jetzt das Ende deiner Textstelle an.');
  const beforeEnd=await page.locator('.source-row').first().boundingBox();
  await page.getByRole('button',{name:'Vers 2 auswählen',exact:true}).click();
  await expect(label).toHaveText('Auswahl');
  expect(Math.abs((await page.locator('.source-row').first().boundingBox())!.y-beforeEnd!.y)).toBeLessThan(1);
  await expect(page.getByRole('button',{name:'Vers 1 auswählen',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'Vers 2 auswählen',exact:true})).toHaveAttribute('aria-pressed','true');
  await expectNamedCoreTools(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('selection-with-labelled-actions.png')});

  await page.getByRole('button',{name:'Ansicht einstellen',exact:true}).click();
  await page.getByRole('button',{name:'Werkzeugleiste links andocken',exact:true}).click();
  await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock','left');
  await expectNamedCoreTools(page);
  // Start selection after reading farther down: the instruction must remain
  // visible in the existing tool, without returning to the section heading.
  await page.locator('.source-row').nth(15).scrollIntoViewIfNeeded();
  await select.click();
  await expect(label).toHaveText('Anfangantippen');
  const instruction=await label.boundingBox();
  expect(instruction!.y).toBeGreaterThan(0);
  expect(instruction!.y+instruction!.height).toBeLessThan(height);
  const rail=await page.locator('.reader-workspace').boundingBox(),row=await page.locator('.source-row').first().boundingBox();
  expect(row!.x).toBeGreaterThan(rail!.x+rail!.width);
  await page.getByRole('button',{name:'Lesemodus',exact:true}).click();
  await expect(label).toHaveText('Auswahl');
  await expect(select).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('labelled-side-rail.png')});
 });
}
