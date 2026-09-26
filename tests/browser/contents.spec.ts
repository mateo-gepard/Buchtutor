import {test,expect,type Page} from '@playwright/test';

async function openContents(page:Page){
  const header=page.getByRole('button',{name:'Inhalt',exact:true});
  const trigger=await header.isVisible()?header:page.locator('.footer-section');
  await trigger.click();
  await expect(page.getByRole('dialog',{name:'Inhaltsverzeichnis'})).toBeVisible();
  return trigger;
}

test.beforeEach(async({page})=>{
  await page.route('**/api/analysis',route=>route.fulfill({status:503,json:{error:'Layout test: no model request.'}}));
  await page.goto('/?work=nathan&section=s003&view=reader');
  await expect(page.locator('.reader-bookmark')).toBeEnabled();
});

// Run against `next build` + `next start`: CSS optimization caused the original clipping.
test('contents stays within the screen and the last chapter remains reachable',async({page},testInfo)=>{
  await openContents(page);
  const dialog=page.getByRole('dialog',{name:'Inhaltsverzeichnis'});
  await expect.poll(async()=>Math.round((await dialog.boundingBox())!.x)).toBe(0);
  const bounds=(await dialog.boundingBox())!;
  const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
  expect(bounds.y).toBeCloseTo(0,0);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y+bounds.height).toBeCloseTo(viewport.height,0);
  await expect(dialog.getByRole('heading',{name:'Inhaltsverzeichnis'})).toBeInViewport({ratio:1});
  await expect(dialog.getByRole('button',{name:'Schließen',exact:true})).toBeInViewport({ratio:1});
  await page.screenshot({path:testInfo.outputPath('contents.png')});

  const lastGroup=dialog.locator('.contents-group').last();
  if(await lastGroup.getAttribute('open')===null)await lastGroup.locator('summary').click();
  const lastChapter=lastGroup.locator('.scene-nav').last();
  await lastChapter.scrollIntoViewIfNeeded();
  await expect(lastChapter).toBeInViewport({ratio:1});
  const title=await lastChapter.locator('span').innerText();
  await lastChapter.click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('heading',{level:1})).toContainText(title);
  await expect(page).not.toHaveURL(/section=s003(?:&|$)/);
});

test('closing contents restores the reading position and other dialogs remain centered',async({page})=>{
  await page.locator('[data-block]').nth(35).evaluate(element=>element.scrollIntoView({block:'center'}));
  const position=await page.evaluate(()=>scrollY);
  const trigger=await openContents(page);
  await page.getByRole('dialog',{name:'Inhaltsverzeichnis'}).getByRole('button',{name:'Schließen',exact:true}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect.poll(async()=>Math.abs((await page.evaluate(()=>scrollY))-position)).toBeLessThanOrEqual(2);
  await expect(trigger).toBeFocused();

  await page.locator('button[aria-label="Leseeinstellungen"]:visible').first().click();
  const settings=page.locator('.reader-dialog');
  await expect(settings).toBeVisible();
  await expect.poll(async()=>{
    const bounds=(await settings.boundingBox())!;
    const width=await page.evaluate(()=>innerWidth);
    return Math.abs(bounds.x+bounds.width/2-width/2);
  }).toBeLessThanOrEqual(10);
  const bounds=(await settings.boundingBox())!;
  const height=await page.evaluate(()=>innerHeight);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(height);
  await settings.getByRole('button',{name:'Schließen',exact:true}).click();
});
