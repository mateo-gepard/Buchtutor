import {test,expect,type Page} from './reader-test';

async function openNote(page:Page){
 await page.goto('/?work=iphigenie&section=s001&view=reader');
 await page.locator('.source-row .line-number').first().click();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 return page.getByRole('textbox',{name:'Deine Notiz',exact:true});
}
test('divergent local drafts require explicit recovery and preserve the previous branch',async({page,context})=>{
 await context.route('**/api/analysis',()=>{throw new Error('Draft recovery must not call AI');});
 await context.route('**/api/handwriting',()=>{throw new Error('Draft recovery must not send handwriting');});
 const first=await openNote(page);await first.fill('Meine lokale Fassung aus dem ersten Tab.');
 const other=await context.newPage(),second=await openNote(other);
 await expect(second).toHaveValue('Meine lokale Fassung aus dem ersten Tab.');
 await second.fill('Eine abweichende Fassung aus dem zweiten Tab.');
 await expect(page.locator('.note-draft-recovery summary')).toContainText('Andere lokale Entwürfe');
 await expect(first).toHaveValue('Meine lokale Fassung aus dem ersten Tab.');
 await page.locator('.note-draft-recovery summary').click();
 await expect(page.locator('.note-draft-recovery')).toContainText('Eine abweichende Fassung aus dem zweiten Tab.');
 await page.locator('.note-draft-recovery').getByRole('button',{name:'Entwurf 1 wiederherstellen',exact:true}).click();
 await expect(first).toHaveValue('Eine abweichende Fassung aus dem zweiten Tab.');
 await expect(page.locator('.note-draft-recovery')).toContainText('Meine lokale Fassung aus dem ersten Tab.');
 await page.locator('.note-draft-recovery').getByRole('button',{name:'Entwurf 1 wiederherstellen',exact:true}).click();
 await expect(first).toHaveValue('Meine lokale Fassung aus dem ersten Tab.');
 await other.close();
 await openNote(page);
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Meine lokale Fassung aus dem ersten Tab.');
 await page.locator('.note-draft-recovery summary').click();
 await expect(page.locator('.note-draft-recovery')).toContainText('Eine abweichende Fassung aus dem zweiten Tab.');
});
