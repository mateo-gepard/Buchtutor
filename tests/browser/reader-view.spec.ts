import {test,expect,useLocalHandwriting,type Page} from './reader-test';

const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});

test.beforeEach(async({page,context})=>{
 await useLocalHandwriting(context);
 await page.route('**/api/analysis',()=>{throw new Error('View controls must not call paid analysis');});
 await page.route('**/api/handwriting',()=>{throw new Error('View controls must not call paid handwriting recognition');});
 await page.goto('/?work=iphigenie&section=s001&view=reader');
 await expect(page.locator('.reader-bookmark')).toBeEnabled();
});

test('one view menu controls zoom, saved annotation visibility and docking with predictable dismissal',async({page},testInfo)=>{
 await button(page,'Bereich durch Antippen auswählen').click();
 await button(page,'Vers 1 auswählen').click();
 await button(page,'Vers 2 auswählen').click();
 await button(page,'Ausgewählte Stellen markieren').click();
 await expect(page.locator('.saved-highlight')).toHaveCount(2);

 const trigger=button(page,'Ansicht einstellen'),menu=page.locator('.workspace-view-options');
 await expect(trigger).toHaveCount(1);
 await expect(trigger).toHaveAttribute('aria-expanded','false');
 await trigger.click();
 await expect(menu).toBeVisible();
 await expect(trigger).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('.workspace-popover:visible')).toHaveCount(1);
 await expect(menu.locator('.workspace-view-section>strong')).toHaveText(['Dokumentzoom','Auf der Seite','Leiste']);
 await expect(menu.locator('.document-zoom-controls.is-embedded')).toHaveCount(1);
 await expect(menu.getByRole('group',{name:'Dokumentzoom einstellen',exact:true})).toBeVisible();

 await page.screenshot({animations:'disabled',path:testInfo.outputPath('view-menu.png')});
 await button(page,'Dokument vergrößern').click();
 await expect(page.locator('.reading-page')).toHaveAttribute('data-document-scale','1.25');
 await expect(menu.locator('.document-zoom-buttons output')).toHaveText('125 %');
 await expect(menu).toBeVisible();
 await button(page,'Auf 100 % zurücksetzen').click();
 await expect(page.locator('.reading-page')).toHaveAttribute('data-document-scale','1');

 await expect(button(page,'Alles anzeigen')).toHaveAttribute('aria-pressed','true');
 await button(page,'Alles ausblenden').click();
 await expect(menu).toHaveCount(0);
 await expect(trigger).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('.saved-highlight')).toHaveCount(0);
 await page.reload();
 await expect(page.locator('.reader-bookmark')).toBeEnabled();
 await expect(page.locator('.saved-highlight')).toHaveCount(0);
 await trigger.click();
 await expect(button(page,'Alles ausblenden')).toHaveAttribute('aria-pressed','true');
 await expect(trigger.locator('i')).toBeVisible();
 await button(page,'Alles anzeigen').click();
 await expect(menu).toHaveCount(0);
 await expect(page.locator('.saved-highlight')).toHaveCount(2);

 await trigger.click();
 await button(page,'Werkzeugleiste links andocken').click();
 await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock','left');
 await expect(menu).toHaveCount(0);
 await expect(trigger).toHaveAttribute('aria-expanded','false');
 await page.reload();
 await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock','left');
 await expect(page.locator('.saved-highlight')).toHaveCount(2);
 await trigger.click();
 await expect(button(page,'Werkzeugleiste links andocken')).toHaveAttribute('aria-pressed','true');
 await button(page,'Dokument vergrößern').focus();
 await page.keyboard.press('Escape');
 await expect(menu).toHaveCount(0);
 await expect(trigger).toHaveAttribute('aria-expanded','false');
 await expect(trigger).toBeFocused();

 await trigger.click();
 await button(page,'Lesemodus').click();
 await expect(menu).toHaveCount(0);
 await expect(page.locator('.saved-highlight')).toHaveCount(2);
});
