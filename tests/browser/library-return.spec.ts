import {test,expect,type Page} from './reader-test';

async function openLibrary(page:Page){
  await page.route('**/api/analysis',route=>route.fulfill({status:503,json:{error:'Library navigation test: no model request.'}}));
  await page.goto('/?view=library');
  await expect(page.getByRole('heading',{name:'Bibliothek',exact:true})).toBeVisible();
}

async function returnToLibrary(page:Page,by:'button'|'history'){
  if(by==='button')await page.getByRole('button',{name:'Zur Bibliothek',exact:true}).click();
  else await page.goBack();
  await expect(page.getByRole('heading',{name:'Bibliothek',exact:true})).toBeVisible();
}

test('a narrowed prose search survives opening a book and both return paths',async({page})=>{
  await openLibrary(page);
  const search=page.getByRole('textbox',{name:'Bibliothek durchsuchen',exact:true});
  await page.getByRole('button',{name:'Prosa',exact:true}).click();
  await search.fill('  verwandlung  ');
  await expect(page.locator('.book-grid button.library-book')).toHaveCount(1);
  await expect(page.locator('.book-grid .unavailable')).toHaveCount(0);

  for(const by of ['button','history'] as const){
    await page.getByRole('button',{name:/^Die Verwandlung –/}).click();
    await expect(page.locator('.reader-header')).toContainText('Die Verwandlung');
    await returnToLibrary(page,by);
    await expect(search).toHaveValue('  verwandlung  ');
    await expect(page.getByRole('button',{name:'Prosa',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.book-grid button.library-book')).toHaveCount(1);
  }
});

for(const by of ['button','history'] as const){
  test(`a filtered library restores its scrolled result when returning by ${by}`,async({page})=>{
    await openLibrary(page);
    await page.getByRole('button',{name:'Dramen',exact:true}).click();
    await page.getByRole('textbox',{name:'Bibliothek durchsuchen',exact:true}).fill('  e  ');
    const last=page.locator('.book-grid button.library-book').last();
    await last.scrollIntoViewIfNeeded();
    const scroll=await page.evaluate(()=>scrollY);
    expect(scroll).toBeGreaterThan(100);
    await last.click();
    await expect(page.locator('.reader-workspace')).toBeVisible();
    await returnToLibrary(page,by);
    await expect(page.getByRole('textbox',{name:'Bibliothek durchsuchen',exact:true})).toHaveValue('  e  ');
    await expect(page.getByRole('button',{name:'Dramen',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect.poll(async()=>Math.abs(await page.evaluate(()=>scrollY)-scroll)).toBeLessThan(8);
    await expect(page.locator('.book-grid button.library-book').last()).toBeInViewport();
  });
}

test('empty results offer search clearing and a full filter reset',async({page})=>{
  await openLibrary(page);
  const search=page.getByRole('textbox',{name:'Bibliothek durchsuchen',exact:true});
  await page.getByRole('button',{name:'Dramen',exact:true}).click();
  await search.fill('  Heimsuchung  ');
  await expect(page.locator('.book-grid .library-book')).toHaveCount(0);
  await expect(page.getByText('Kein passendes Werk. Probiere einen anderen Titel oder Autor.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Suche löschen',exact:true}).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('button',{name:'Dramen',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.book-grid button.library-book')).not.toHaveCount(0);

  await search.fill('Kein solches Werk');
  await page.getByRole('button',{name:'Filter zurücksetzen',exact:true}).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('button',{name:'Alle Werke',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.book-grid .unavailable')).toHaveCount(1);
});
