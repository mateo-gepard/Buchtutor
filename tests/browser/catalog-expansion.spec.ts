import {test,expect} from './reader-test';
import {readFileSync} from 'node:fs';
import type {Book} from '../../lib/reader-model';
import {validateAudiobook} from '../../lib/audiobook';

const books=['lenz','sandmann','kleider'].map(id=>JSON.parse(readFileSync(`corpus/books/${id}.json`,'utf8')) as Book);
test.beforeEach(async({page})=>{
 await page.route('**/api/analysis',route=>route.abort());
 await page.route('**/api/handwriting',route=>route.abort());
});

test('the new novels and fragment appear in Prosa with a human audiobook',async({page},info)=>{
 await page.goto('/?view=library');
 await page.getByRole('button',{name:'Prosa',exact:true}).click();
 for(const book of books)await expect(page.getByRole('button',{name:`${book.title} – öffnen`,exact:true})).toContainText('Hörbuch verfügbar');
 await expect(page.getByRole('button',{name:'Die Verwandlung – öffnen',exact:true})).toBeVisible();
 await page.screenshot({animations:'disabled',path:info.outputPath('new-prose-library.png'),fullPage:true});
 await page.getByRole('button',{name:'Dramen',exact:true}).click();
 for(const book of books)await expect(page.getByRole('button',{name:`${book.title} – öffnen`,exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Woyzeck – öffnen',exact:true})).toBeVisible();
});

for(const book of books)test(`${book.title}: canonical text, references and saved notes are connected`,async({page,isMobile})=>{
 const response=await page.request.get(`/api/books/${book.id}`);
 expect(response.ok()).toBe(true);
 expect((await response.json()).book.editionId).toBe(book.editionId);
 const references=await page.request.get(`/api/books/${book.id}/references`);
 expect(references.ok()).toBe(true);
 expect((await references.json()).editionId).toBe(book.editionId);
 await page.goto(`/?work=${book.id}&section=${book.sections[0].id}&view=reader`);
 await expect(page.locator('.reader-header')).toContainText(book.title);
 const first=book.sections[0].blocks.find(block=>block.kind==='prose')!;
 await expect(page.locator(`[data-block="${first.id}"] [data-text]`)).toContainText(first.text.slice(0,70));
 await page.getByRole('button',{name:'Absatz 1 auswählen',exact:true}).click();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 const note=`Mein Gedanke zu ${book.title}.`;
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill(note);
 await page.getByRole('button',{name:'Notiz speichern',exact:true}).click();
 await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();
 await page.reload();
 const highlight=page.locator('.saved-highlight').first();
 await expect(highlight).toBeVisible();
 // A long prose highlight can span several screens. Tap a visible text line,
 // not its bounding-box center, which can sit behind the sticky reader header.
 await page.getByRole('button',{name:'Absatz 1 auswählen',exact:true}).scrollIntoViewIfNeeded();
 const point=await highlight.evaluate(el=>{
  for(const rect of el.getClientRects()){
   const x=Math.max(1,Math.min(innerWidth-1,rect.left+Math.min(rect.width/2,80)));
   const y=rect.top+rect.height/2;
   if(y>0&&y<innerHeight&&el.contains(document.elementFromPoint(x,y)))return {x,y};
  }
  return null;
 });
 expect(point).not.toBeNull();
 if(isMobile)await page.touchscreen.tap(point!.x,point!.y);
 else await page.mouse.click(point!.x,point!.y);
 await expect(page.locator('.annotation-body')).toHaveText(note);
 await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

for(const book of books)test(`${book.title}: human recording matches the edition and waits for play`,async({page})=>{
 const audioResponse=await page.request.get(`/audiobooks/${book.id}.json`);
 expect(audioResponse.ok()).toBe(true);
 const audio=validateAudiobook(await audioResponse.json(),book);
 expect(audio.synthetic).not.toBe(true);
 expect(audio.alignment.matchedBlocks).toBeGreaterThan(0);
 expect(audio.tracks.every(track=>track.cues.length>0)).toBe(true);
 let mediaRequests=0;
 await page.route('https://archive.org/download/**',route=>{mediaRequests++;return route.abort();});
 await page.goto(`/?work=${book.id}&section=${book.sections[0].id}&view=reader`);
 await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();
 await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeEnabled();
 expect(mediaRequests).toBe(0);
 await page.getByRole('button',{name:'Hörbuch-Details öffnen',exact:true}).click();
 await expect(page.locator('.audio-details')).toContainText(audio.narrator);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
