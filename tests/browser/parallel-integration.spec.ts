import {readFileSync} from 'node:fs';
import {test,expect,useLocalHandwriting,type Page} from './reader-test';
import {audioProgressKey,type Audiobook} from '../../lib/audiobook';
import type {Book,SavedNote} from '../../lib/reader-model';

const book=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book;
const section=book.sections[0],lines=section.blocks.filter(block=>block.kind==='verse');
const audioKey=audioProgressKey(book.editionId),button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
const recording:Audiobook={version:1,workId:book.id,editionId:book.editionId,revision:book.revision,recordingId:'joint-workflow-test',sourceLabel:'Lokale Prüfaufnahme',sourceUrl:'https://librivox.org/',licenseUrl:'https://librivox.org/pages/public-domain/',narrator:'Prüfaufnahme',note:'',alignment:{method:'test',matchedBlocks:2,totalBlocks:2},tracks:[{id:'first',title:'Erster Auftritt',url:'https://archive.org/download/buchtutor-test/joint.wav',duration:60,sha256:'a'.repeat(64),cues:[{start:1,end:5,sectionId:section.id,blockId:lines[0].id,startOffset:0,endOffset:lines[0].text.length,confidence:1},{start:7,end:55,sectionId:section.id,blockId:lines[3].id,startOffset:0,endOffset:lines[3].text.length,confidence:1}]}]};
function wav(){const length=60*8000*2,b=Buffer.alloc(length+44);b.write('RIFF');b.writeUInt32LE(length+36,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(length,40);return b;}
async function notebook(page:Page){await button(page,'Zur Bibliothek').click();await button(page,'Meine Notizen').click();}
async function stored(page:Page){return page.evaluate(async()=>new Promise<SavedNote[]>((resolve,reject)=>{const open=indexedDB.open('leseraum-local-v2');open.onsuccess=()=>{const db=open.result,r=db.transaction('state').objectStore('state').get('reader');r.onsuccess=()=>{db.close();resolve(r.result.notes.filter((note:SavedNote)=>!note.deletedAt));};r.onerror=()=>reject(r.error);};}));}
async function ink(page:Page){
 await page.locator('.pencil-text').evaluate(el=>{
  const root=el.getBoundingClientRect(),line=el.querySelector('[data-block]')!.getBoundingClientRect();
  for(const [type,x,y] of [['pointerdown',-26,4],['pointermove',-34,15],['pointermove',-22,25],['pointerup',-12,18]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,isPrimary:true,pointerType:'pen',pointerId:2201,clientX:root.left+x,clientY:line.top+y,buttons:type==='pointerup'?0:1,pressure:.6}));
 });
 await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
}
async function listenAndPause(page:Page){
 await button(page,'Hören und mitlesen').click();await expect(button(page,'Hörbuch abspielen')).toBeEnabled();await button(page,'Hörbuch abspielen').click();await expect(button(page,'Wiedergabe pausieren')).toBeVisible();
 await page.locator('audio').evaluate(el=>new Promise<void>(resolve=>{const audio=el as HTMLAudioElement;audio.addEventListener('seeked',()=>{audio.dispatchEvent(new Event('timeupdate'));resolve();},{once:true});audio.currentTime=8;}));
 await button(page,'Wiedergabe pausieren').click();await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.time,audioKey)).toBeGreaterThanOrEqual(8);
}
test.beforeEach(async({page,context})=>{
 await useLocalHandwriting(context);await context.addInitScript(()=>{localStorage.setItem('buchtutor-pencil-handwriting-hint-v1','1');localStorage.setItem('buchtutor-pencil-cloud-hint-v1','1');});
 await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());
 await page.route('**/audiobooks/iphigenie.json',route=>route.fulfill({json:recording}));
 await page.route('https://archive.org/download/buchtutor-test/**',route=>route.fulfill({body:wav(),contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'}}));
 await page.goto('/?work=iphigenie&section=s001&view=reader');await expect(page.locator('.reader-bookmark')).toBeEnabled();
});

test('listening, typed draft and original ink survive notebook recovery, recoloring and reload together',async({page},info)=>{
 test.setTimeout(60000);await listenAndPause(page);
 await button(page,'Vers 1 auswählen').click();await button(page,'Ausgewählte Stellen markieren').click();await expect(page.locator('.toast')).toContainText('gespeichert');
 await button(page,'Apple Pencil Modus').click();await ink(page);await button(page,'Apple Pencil Modus').click();
 await button(page,'Notiz schreiben').click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Die Natur erscheint als Zuflucht.');await button(page,'Lesehilfe schließen').click();
 await notebook(page);await page.reload();await expect(page.locator('.notebook-drafts>summary')).toContainText('2 Entwürfe');
 await page.locator('.typed-note-draft').getByRole('button').click();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Die Natur erscheint als Zuflucht.');await button(page,'Notiz speichern').click();await expect(button(page,'Gespeichert')).toBeDisabled();await button(page,'Lesehilfe schließen').click();
 await button(page,'Apple Pencil Modus').click();await expect(page.locator('[data-ink-group] path')).toHaveCount(1);await button(page,'Fertig').click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 const original=(await stored(page))[0];expect(await stored(page)).toHaveLength(1);expect(original.body).toBe('Die Natur erscheint als Zuflucht.');expect(original.pencil?.ink).toHaveLength(1);
 await page.locator('.saved-highlight').click();await button(page,'Farbe der Markierung ändern').click();await button(page,'Blau: Interpretationsansatz').click();await expect(page.locator('.toast')).toContainText('Markierungsfarbe gespeichert');
 await notebook(page);await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('Natur Zuflucht');await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-open mark')).toHaveCount(2);
 await page.locator('.notebook-filter-disclosure>summary').click();await page.getByLabel('Nach Markierungsfarbe filtern').selectOption('blue');await page.locator('.note-open').click();await button(page,'Lesehilfe schließen').click();await page.reload();
 const final=(await stored(page))[0];expect(final.id).toBe(original.id);expect(final.body).toBe(original.body);expect(final.pencil?.ink).toEqual(original.pencil?.ink);expect(final.pencil?.pageInk).toEqual(original.pencil?.pageInk);expect(final.pencil?.color).toBe('blue');
 await button(page,'Hören und mitlesen').click();await expect(button(page,'Hörbuch abspielen')).toBeEnabled();await button(page,'Hörbuch-Details öffnen').click();await expect(page.locator('.audio-playback-state')).toContainText('Gespeicherte Hörposition');await button(page,'Zur Hörstelle').click();await expect(page.locator('.audio-current')).toHaveAttribute('id',lines[3].id);expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
 await page.screenshot({animations:'disabled',path:info.outputPath('restored-audio-note-and-ink.png')});
});

test('audio return, Pencil and undo fit the shared rail in narrow portrait and short landscape',async({page},info)=>{
 test.setTimeout(60000);await listenAndPause(page);await button(page,'Vers 1 auswählen').click();await button(page,'Ausgewählte Stellen markieren').click();await button(page,'Apple Pencil Modus').click();await ink(page);await button(page,'Rückgängig').click();await expect(button(page,'Wiederholen')).toBeEnabled();
 for(const viewport of [{width:390,height:844},{width:680,height:759},{width:834,height:520}]){
  await page.setViewportSize(viewport);
  for(const edge of ['Up','Right','Down','Left']){
   await button(page,'Werkzeugleiste verschieben').press('Shift+Arrow'+edge);
   await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{
    const bar=el.getBoundingClientRect(),footer=document.querySelector('.reading-footer')!.getBoundingClientRect(),header=document.querySelector('.reader-header')!.getBoundingClientRect();
    const buttons=[...el.querySelectorAll('.workspace-main button')].map(b=>b.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
    const bad=buttons.filter((r,i)=>!(r.width>=43.99&&r.height>=43.99&&r.left>=bar.left-1&&r.right<=bar.right+1&&r.top>=bar.top-1&&r.bottom<=bar.bottom+1&&buttons.slice(i+1).every(s=>Math.min(r.right,s.right)-Math.max(r.left,s.left)<=1||Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)<=1)));
    return bar.left>=0&&bar.right<=innerWidth+1&&bar.top>=header.bottom-1&&bar.bottom<=footer.top+1&&!bad.length?null:{viewport:[innerWidth,innerHeight],dock:el.getAttribute('data-dock'),bar:bar.toJSON(),bad:bad.map(r=>r.toJSON())};
   })).toBeNull();
  }
 }
 await button(page,'Wiederholen').click();await expect(page.locator('[data-ink-group] path')).toHaveCount(1);await page.screenshot({animations:'disabled',path:info.outputPath('combined-narrow-tools.png')});
});
