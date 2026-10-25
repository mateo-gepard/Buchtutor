import {test,expect} from './reader-test';
import {readFileSync} from 'node:fs';

const catalog=JSON.parse(readFileSync('corpus/catalog.json','utf8')) as {id:string;title:string;author:string}[];
const sorted=[...catalog].sort((a,b)=>a.title.localeCompare(b.title,'de'));

test.beforeEach(async({page})=>{
 await page.route('**/api/analysis',route=>route.abort());
 await page.route('**/api/handwriting',route=>route.abort());
});

test('every title has a loaded upright cover in the alphabetical library',async({page},info)=>{
 await page.goto('/?view=library');
 const cards=page.locator('.book-grid button.library-book');
 await expect(cards).toHaveCount(catalog.length);
 expect(await cards.evaluateAll(elements=>elements.map(el=>el.getAttribute('data-work')))).toEqual(sorted.map(book=>book.id));
 let firstWidth=0;
 for(const book of sorted){
  const card=page.locator(`.library-book[data-work="${book.id}"]`);
  const image=card.locator('img.cover-art');
  await card.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute('src',`/art/cover-${book.id}-v1.webp`);
  await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  const dimensions=await card.evaluate(el=>{
   const cover=el.querySelector('.book-cover')!.getBoundingClientRect();
   const details=el.querySelector('.book-details')!.getBoundingClientRect();
   const type=el.querySelector('.cover-type')!.getBoundingClientRect();
   return {width:cover.width,height:cover.height,coverBottom:cover.bottom,detailsTop:details.top,typeBottom:type.bottom};
  });
  firstWidth ||= dimensions.width;
  expect(Math.abs(dimensions.width-firstWidth)).toBeLessThan(1);
  expect(Math.abs(dimensions.height/dimensions.width-1.5)).toBeLessThan(.01);
  expect(dimensions.detailsTop).toBeGreaterThanOrEqual(dimensions.coverBottom);
  expect(dimensions.typeBottom).toBeLessThan(dimensions.coverBottom);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:info.outputPath('complete-library.png'),fullPage:true,animations:'disabled'});
});

for(const id of ['lenz','sandmann','kleider'])test(`${id}: author search, opening and resuming show the same cover`,async({page})=>{
 const book=catalog.find(work=>work.id===id)!;
 await page.goto('/?view=library');
 await page.getByRole('button',{name:'Prosa',exact:true}).click();
 const search=page.getByRole('textbox',{name:'Bibliothek durchsuchen',exact:true});
 await search.fill(book.author);
 const card=page.locator(`.library-book[data-work="${id}"]`);
 await expect(card).toContainText(book.title);
 await expect(card).toContainText('Hörbuch verfügbar');
 await card.click();
 await expect(page.locator('.reader-header')).toContainText(book.title);
 // Opening and immediately leaving precedes the reader's position capture.
 // Wait for an actual saved reading position before testing "Weiterlesen".
 await expect.poll(()=>page.evaluate(workId=>new Promise<boolean>((resolve,reject)=>{
  const open=indexedDB.open('leseraum-local-v2');
  open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{
   const db=open.result,request=db.transaction('state').objectStore('state').get('reader');
   request.onsuccess=()=>{resolve(request.result?.progress?.some((p:{workId:string})=>p.workId===workId)??false);db.close();};
   request.onerror=()=>{reject(request.error);db.close();};
  };
 }),id)).toBe(true);
 await page.getByRole('button',{name:'Zur Bibliothek',exact:true}).click();
 await expect(search).toHaveValue(book.author);
 await expect(page.getByRole('button',{name:'Prosa',exact:true})).toHaveAttribute('aria-pressed','true');
 await search.fill('');
 await page.getByRole('button',{name:'Alle Werke',exact:true}).click();
 const resume=page.locator('.resume-book');
 await expect(resume).toContainText(book.title);
 const image=resume.locator('img.cover-art');
 await expect(image).toHaveAttribute('src',`/art/cover-${id}-v1.webp`);
 await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 await resume.click();
 await expect(page.locator('.reader-header')).toContainText(book.title);
});
