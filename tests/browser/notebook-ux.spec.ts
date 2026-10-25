import {readFileSync} from 'node:fs';
import {test,expect,useLocalHandwriting,type Page} from './reader-test';
import {EMPTY_SNAPSHOT,type LocalSnapshot} from '../../lib/local-model';
import {makeAnchor,type Book,type SavedNote} from '../../lib/reader-model';

const book=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book;
const section=book.sections[0],lines=section.blocks.filter(block=>block.kind==='verse');
const now='2026-10-25T08:00:00.000Z',anchor=makeAnchor(section,lines[0].id);
const manual:SavedNote={id:'notebook-ux-manual',workId:book.id,editionId:book.editionId,anchor,kind:'note',body:'Natur als Zuflucht – mein eigener Gedanke.',pencil:{color:'green',meaning:'Stilmittel',transcription:'manual',ink:[[{x:20,y:20,pressure:.5},{x:180,y:80,pressure:.5}]]},createdAt:now,updatedAt:now};
const analysis:SavedNote={...manual,id:'notebook-ux-analysis',kind:'question',body:'',pencil:undefined,analysis:{id:'notebook-ux-answer',mode:'question',title:'Heimat und Fremde',summary:'Iphigenie sehnt sich nach ihrer Heimat.',question:'Wie lässt sich die Schutzraumfrage erklären?',observations:[{label:'Bildsprache',text:'Eine Schattenmetapher verbindet Naturraum und Geborgenheit.',quotes:[{blockId:lines[1].id,quote:lines[1].text}]}],uncertainty:'Diese Deutungsgrenze bleibt offen.',source:'prepared',model:'Test',generatedAt:now,promptVersion:'test',anchor,workId:book.id,editionId:book.editionId}};
async function seed(page:Page,theme:'paper'|'night'='paper'){
 await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());
 await page.goto('/?view=notes');
 const snapshot:LocalSnapshot={...EMPTY_SNAPSHOT,preferences:{value:{...EMPTY_SNAPSHOT.preferences.value,theme,handwritingCloud:false},updatedAt:now},notes:[manual,analysis]};
 await page.evaluate(async data=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('leseraum-local-v2',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(data,'reader');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
 },snapshot);
 await page.reload();await expect(page.locator('.note-card')).toHaveCount(2);
}
const filterDisclosure=(page:Page)=>page.locator('.notebook-filter-disclosure');

test('saved content is visible before secondary filters on iPad and narrow screens',async({page},testInfo)=>{
 await seed(page);
 await expect(filterDisclosure(page)).not.toHaveAttribute('open');
 await expect(page.getByRole('combobox',{name:'Notizen nach Werk filtern'})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Notizen durchsuchen'})).toBeVisible();
 const first=await page.locator('.note-card').first().boundingBox();
 expect(first!.y).toBeLessThan(Math.min(430,page.viewportSize()!.height*.6));
 const thought=await page.locator('.note-card').first().getByText(manual.body,{exact:true}).boundingBox();
 expect(thought!.y+thought!.height).toBeLessThan(page.viewportSize()!.height-40);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('notebook-content-first.png')});
});

test('notebook search retrieves complete saved explanations and the original question',async({page})=>{
 await seed(page);const search=page.getByRole('textbox',{name:'Notizen durchsuchen'});
 for(const term of ['Schattenmetapher','Bildsprache','Schutzraumfrage','Deutungsgrenze','dichtbelaubten']){
  await search.fill(term);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('Heimat und Fremde');
 }
 await search.fill('  SCHATTENMETAPHER  ');await expect(page.locator('.note-card')).toHaveCount(1);
 await page.locator('.note-open').click();await expect(page.locator('.assistant-panel')).toContainText('Eine Schattenmetapher verbindet Naturraum und Geborgenheit.');
});

test('secondary filters disclose clearly and keep selection and drafts across retrieval',async({page})=>{
 await seed(page);const disclosure=filterDisclosure(page);
 await disclosure.locator('summary').click();await expect(disclosure).toHaveAttribute('open');
 await page.getByRole('combobox',{name:'Nach Markierungsfarbe filtern'}).selectOption('green');await expect(page.locator('.note-card')).toHaveCount(1);
 await expect(disclosure.locator('summary')).toContainText('1 aktiv');
 await disclosure.locator('summary').click();await expect(disclosure).not.toHaveAttribute('open');await expect(disclosure.locator('summary')).toContainText('1 aktiv');
 await page.getByRole('button',{name:'Einträge auswählen',exact:true}).click();await page.getByRole('checkbox').check();
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Auswahl fortsetzen (1)',exact:true}).click();await expect(page.locator('.notebook-batch .selection-summary')).toContainText('1 ausgewählt');
 await page.getByRole('button',{name:'Auswahl beenden',exact:true}).click();await page.locator('.note-open').click();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Noch ungespeicherte Ergänzung.');
 await page.goBack();await expect(page.getByRole('heading',{name:'Meine Notizen',exact:true})).toBeVisible();
 await expect(disclosure).not.toHaveAttribute('open');await expect(page.getByLabel('Nach Markierungsfarbe filtern')).toHaveValue('green');await expect(page.locator('.note-card')).toHaveCount(1);
 await page.locator('.note-open').click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Noch ungespeicherte Ergänzung.');
 await page.goBack();await page.getByRole('button',{name:'Filter zurücksetzen',exact:true}).click();await expect(page.locator('.note-card')).toHaveCount(2);await expect(disclosure.locator('summary')).not.toContainText('aktiv');
});

test('original handwriting remains legible in the night theme',async({page},testInfo)=>{
 await seed(page,'night');await page.getByText('Originalhandschrift',{exact:true}).click();
 const contrast=await page.locator('.saved-ink svg').evaluate(svg=>{
  const rgb=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number);
  const luminance=(value:number[])=>value.map(channel=>{const n=channel/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,index)=>sum+n*[.2126,.7152,.0722][index],0);
  const stroke=luminance(rgb(getComputedStyle(svg.querySelector('path')!).stroke)),background=luminance(rgb(getComputedStyle(svg).backgroundColor));
  return (Math.max(stroke,background)+.05)/(Math.min(stroke,background)+.05);
 });
 expect(contrast).toBeGreaterThan(4.5);await page.screenshot({path:testInfo.outputPath('notebook-night-handwriting.png')});
});

test('a secured Pencil draft is separate from saved notes and resumes from the notebook',async({page,context})=>{
 await useLocalHandwriting(context);
 await context.addInitScript(()=>{localStorage.setItem('buchtutor-pencil-handwriting-hint-v1','1');localStorage.setItem('buchtutor-pencil-cloud-hint-v1','1');});
 await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());
 await page.goto('/?work=iphigenie&section=s001&view=reader');await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.locator('[data-text]').first().evaluate(el=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,range=document.createRange();range.setStart(node,1);range.setEnd(node,5);const box=range.getBoundingClientRect();
  for(const [type,x] of [['pointerdown',box.left],['pointermove',box.right],['pointerup',box.right]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:903,clientX:x,clientY:box.top+box.height/2,buttons:type==='pointerup'?0:1}));
 });
 await expect(page.locator('.saved-highlight')).toHaveCount(1);
 await page.getByRole('button',{name:'Zur Bibliothek',exact:true}).click();await expect(page.getByRole('heading',{name:'Bibliothek',exact:true})).toBeVisible();
 const before=await page.evaluate(({workId,editionId})=>{
  const prefix=`buchtutor-pencil-draft:${workId}:${editionId}:`;
  localStorage.setItem(prefix+'s002','{"version":99,"future":"preserve this exactly"}');localStorage.setItem(prefix+'s003','{"version":2,"entries":');
  return Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith(prefix)).map(key=>[key,localStorage.getItem(key)]));
 },{workId:book.id,editionId:book.editionId});
 await page.getByRole('button',{name:'Meine Notizen',exact:true}).click();
 await expect(page.locator('.notebook-drafts')).toContainText('Pencil-Entwurf');await expect(page.locator('.notebook-draft-entry')).toHaveCount(1);
 await expect(page.locator('.notebook-drafts')).toContainText('Noch nicht als Notiz gespeichert');await expect(page.locator('.notebook-results [role=status]')).toHaveText('0 Einträge');await expect(page.locator('.note-card')).toHaveCount(0);
 expect(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(before))).toEqual(before);
 await page.getByRole('button',{name:'Weiterbearbeiten',exact:true}).click();
 await expect(page).toHaveURL(/work=iphigenie.*section=s001.*view=reader/);await expect(page.getByRole('button',{name:'Apple Pencil Modus',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.saved-highlight')).toHaveCount(1);
});
