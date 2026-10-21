import {test,expect,type Page} from './reader-test';
import {readFileSync} from 'node:fs';
import {EMPTY_SNAPSHOT} from '../../lib/local-model';
import {makeAnchor,type Book,type SavedNote} from '../../lib/reader-model';
const book=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book,section=book.sections[0],lines=section.blocks.filter(b=>b.kind==='verse');
const now='2026-10-21T00:00:00.000Z',anchor=makeAnchor(section,lines[0].id,lines[2].id);
const manual:SavedNote={id:'00000000-0000-4000-a000-000000000001',workId:book.id,editionId:book.editionId,anchor,kind:'note',body:'Mein Gedanke zur Heimat',pencil:{color:'green',meaning:'Stilmittel',ink:[],transcription:'manual'},createdAt:now,updatedAt:now};
const analysis:SavedNote={...manual,id:'00000000-0000-4000-a000-000000000002',kind:'summary',pencil:undefined,body:'',analysis:{id:'saved-analysis',mode:'summary',title:'Heimat und Fremde',summary:'Iphigenie sehnt sich nach ihrer Heimat.',observations:[],uncertainty:'',source:'prepared',model:'Test',generatedAt:now,promptVersion:'test',anchor,workId:book.id,editionId:book.editionId}};
async function setup(page:Page){
 await page.goto('/?work=iphigenie&section=s001&view=reader');
 await page.evaluate(async snapshot=>{await new Promise<void>((resolve,reject)=>{const open=indexedDB.open('leseraum-local-v2',1);open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains('state'))open.result.createObjectStore('state');};open.onsuccess=()=>{const db=open.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(snapshot,'reader');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};open.onerror=()=>reject(open.error);});},{...EMPTY_SNAPSHOT,notes:[analysis,manual]});
 await page.reload();await expect(page.locator('.saved-highlight').first()).toBeVisible();
}
test('overlapping AI and manual annotations keep one color and open all entries together',async({page})=>{
 await setup(page);await expect(page.locator('.annotation-marker')).toHaveCount(1);await expect(page.locator('.annotation-marker')).toContainText('2');
 const color=await page.locator('.saved-highlight').first().evaluate(el=>getComputedStyle(el).backgroundColor);
 await page.locator('.saved-highlight').first().click();await expect(page.locator('.attached-annotations .note-card')).toHaveCount(2);
 await expect(page.locator('.attached-annotations')).toContainText('Mein Gedanke zur Heimat');await expect(page.locator('.attached-annotations')).toContainText('Heimat und Fremde');
 await page.locator('.attached-annotations .note-card').filter({hasText:'Heimat und Fremde'}).getByRole('button',{name:'Notiz löschen',exact:true}).click();
 await expect(page.locator('.annotation-marker')).toContainText('1');await expect(page.locator('.attached-annotations .note-card')).toHaveCount(1);await expect(page.locator('.attached-annotations')).toContainText('Mein Gedanke zur Heimat');await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveCount(0);expect(await page.locator('.saved-highlight').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(color);
 await page.reload();await expect(page.locator('.annotation-marker')).toContainText('1');
});
test('a verse range selects across existing highlights by two taps and supports keyboard extension',async({page},testInfo)=>{
 const tap=async(locator:ReturnType<Page['locator']>)=>testInfo.project.use.hasTouch?locator.tap():locator.click();
 await setup(page);await tap(page.getByRole('button',{name:'Vers 1 auswählen',exact:true}));
 await expect(page.locator('.selection-hint')).toBeVisible();await tap(page.locator('[data-text]').nth(2));
 await expect(page.getByRole('button',{name:'Bereich durch Antippen auswählen'})).toHaveAttribute('aria-pressed','false');await expect(page.locator('.row-selected')).toHaveCount(3);
 await expect(page.locator('.assistant-panel')).toBeHidden();await page.getByRole('button',{name:'Vers 5 auswählen',exact:true}).focus();await page.keyboard.press('Shift+Enter');await expect(page.locator('.row-selected')).toHaveCount(5);
 await page.getByRole('button',{name:'Notiz',exact:true}).click();await expect(page.locator('.selection-excerpt blockquote')).toHaveText(anchor.quote+'\n'+lines[3].text+'\n'+lines[4].text);
});
test('dragging verse numbers selects forwards and backwards without opening annotations',async({page})=>{
 await setup(page);const a=await page.getByRole('button',{name:'Vers 6 auswählen',exact:true}).boundingBox(),b=await page.getByRole('button',{name:'Vers 2 auswählen',exact:true}).boundingBox();
 await page.mouse.move(a!.x+20,a!.y+20);await page.mouse.down();await page.mouse.move(b!.x+20,b!.y+20,{steps:12});await page.mouse.up();
 await expect(page.locator('.row-selected')).toHaveCount(5);await expect(page.locator('.assistant-panel')).toBeHidden();await expect(page.getByRole('button',{name:'Bereich durch Antippen auswählen'})).toHaveAttribute('aria-pressed','false');
});

test('Escape and capture cancellation stop a gutter gesture without restoring it on pointerup',async({page})=>{
 await setup(page);const number=page.getByRole('button',{name:'Vers 2 auswählen',exact:true}),box=await number.boundingBox();
 await page.mouse.move(box!.x+20,box!.y+20);await page.mouse.down();await page.mouse.move(box!.x+20,box!.y+110,{steps:5});await expect(page.locator('.row-selected')).not.toHaveCount(0);
 await page.keyboard.press('Escape');await page.mouse.up();await expect(page.locator('.row-selected')).toHaveCount(0);await expect(page.locator('.selection-dock')).toHaveCount(0);
 await number.click();await expect(page.locator('.row-selected')).toHaveCount(1);await page.keyboard.press('Escape');await expect(page.locator('.row-selected')).toHaveCount(0);
});

test('verse numbers remain selection controls while Pencil is active',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await page.getByRole('button',{name:'Vers 2 auswählen',exact:true}).click();
 await expect(page.getByRole('button',{name:'Apple Pencil Modus',exact:true})).toHaveAttribute('aria-pressed','false');await expect(page.locator('.row-selected')).toHaveCount(1);await expect(page.locator('.pencil-live path')).not.toHaveAttribute('d',/.+/);
});
