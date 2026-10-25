import {readFileSync} from 'node:fs';
import {test,expect,type Page} from './reader-test';
import {EMPTY_SNAPSHOT} from '../../lib/local-model';
import {makeAnchor,type Book,type SavedNote} from '../../lib/reader-model';

const faust=JSON.parse(readFileSync('corpus/books/faust.json','utf8')) as Book;
const prose=JSON.parse(readFileSync('corpus/books/verwandlung.json','utf8')) as Book;
const section=faust.sections[1],rows=section.blocks.filter(block=>block.kind==='verse'),anchor=makeAnchor(section,rows[0].id);
const typedAnchor=makeAnchor(section,rows[1].id),proseRows=prose.sections[0].blocks.filter(block=>block.kind==='prose');
const stamp='2026-10-25T08:00:00.000Z';
const notes:SavedNote[]=[
  {id:'current',workId:faust.id,editionId:faust.editionId,anchor,kind:'note',body:'Privater Vergleich bleibt lokal.',createdAt:stamp,updatedAt:stamp},
  {id:'prose-bookmark',workId:prose.id,editionId:prose.editionId,anchor:makeAnchor(prose.sections[0],proseRows[0].id,proseRows[1].id),kind:'bookmark',body:'',createdAt:stamp,updatedAt:stamp},
  {id:'legacy',workId:faust.id,editionId:'faust-older-edition',anchor,kind:'note',body:'Altbestand der früheren Fassung.',createdAt:stamp,updatedAt:stamp},
];

async function seed(page:Page){
  await page.route('**/api/analysis',route=>route.fulfill({status:503,json:{error:'Reference test: no provider calls.'}}));
  await page.route('**/api/handwriting',route=>route.fulfill({status:503,json:{error:'Reference test: no handwriting uploads.'}}));
  await page.goto('/?view=library');
  await page.evaluate(async data=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('leseraum-local-v2',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(data.snapshot,'reader');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
    localStorage.setItem('buchtutor-note-draft:'+data.typedKey,JSON.stringify({version:1,body:'Privater Entwurf bleibt lokal.'}));
    localStorage.setItem(data.pencilKey,JSON.stringify({version:2,entries:[{id:'pencil-draft',anchor:data.anchor,pencil:{color:'yellow',meaning:'Wichtige Stelle',ink:[[{x:10,y:10,pressure:.5},{x:30,y:15,pressure:.5}]],transcription:'none'},body:''}],groups:[]}));
  },{snapshot:{...EMPTY_SNAPSHOT,notes},typedKey:faust.editionId+':'+JSON.stringify(typedAnchor)+':new',pencilKey:`buchtutor-pencil-draft:${faust.id}:${faust.editionId}:${section.id}`,anchor});
  await page.reload();
  await page.getByRole('button',{name:'Meine Notizen',exact:true}).click();
  await expect(page.locator('.note-card')).toHaveCount(3);
}

test('notes, bookmarks and both draft types expose exact public references without private uploads',async({page},testInfo)=>{
  const requests:{url:string;method:string;body:string|null}[]=[];
  page.on('request',request=>{if(request.url().includes('/api/'))requests.push({url:request.url(),method:request.method(),body:request.postData()});});
  await seed(page);
  await expect(page.locator('.note-card').filter({hasText:'Privater Vergleich'}).locator('.note-reference')).toHaveText('Vorspiel auf dem Theater · V. 33');
  await expect(page.locator('.note-card').filter({hasText:'Lesezeichen'}).locator('.note-reference')).toHaveText('I. Kapitel · Abs. 1–2');
  await expect(page.locator('.note-card').filter({hasText:'Altbestand'}).locator('.note-reference')).toHaveText('Andere Ausgabe · Originalzitat');
  await expect(page.locator('.typed-note-draft small')).toHaveText('Notizentwurf · Vorspiel auf dem Theater · V. 34');
  await expect(page.locator('.notebook-draft-entry').filter({hasText:'Pencil-Entwurf'}).locator('small')).toHaveText('Pencil-Entwurf · Vorspiel auf dem Theater · auf diesem Gerät gesichert');
  const referenceRequests=requests.filter(request=>request.url.includes('/references?'));
  expect(referenceRequests).toHaveLength(2);
  for(const request of referenceRequests){
    expect(request.method).toBe('GET');expect(request.body).toBeNull();
    expect([...new URL(request.url).searchParams.keys()]).toEqual(['revision']);
  }
  expect(requests.some(request=>request.method!=='GET')).toBe(false);
  expect(JSON.stringify(requests)).not.toMatch(/Privater|trüben|quote|anchor/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('notebook-references.png'),fullPage:true});
  const search=page.getByRole('textbox',{name:'Notizen durchsuchen',exact:true});
  await search.fill('  Vorspiel auf dem Theater  ');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await expect(page.locator('.note-card .note-reference')).toHaveText('Vorspiel auf dem Theater · V. 33');
  await search.fill('V. 33');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await search.fill('Andere Ausgabe');
  await expect(page.locator('.note-card')).toHaveCount(0);
  await search.fill('Vorspiel');
  await page.locator('.note-card').filter({hasText:'Privater Vergleich'}).locator('.note-open').click();
  await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Privater Vergleich bleibt lokal.');
  await expect(page).toHaveURL(/section=s002.*#b00035/);
});

test('unavailable reference metadata keeps original quotes and retrieval usable',async({page})=>{
  await page.route('**/api/books/*/references?*',route=>route.fulfill({status:503,json:{error:'Reference fixture unavailable'}}));
  await seed(page);
  const current=page.locator('.note-card').filter({hasText:'Privater Vergleich'});
  await expect(current.locator('.note-reference')).toHaveText('Textstelle');
  await expect(current.locator('blockquote')).toContainText(rows[0].text);
  await expect(page.locator('.note-card').filter({hasText:'Altbestand'}).locator('.note-reference')).toHaveText('Andere Ausgabe · Originalzitat');
  await page.getByRole('textbox',{name:'Notizen durchsuchen',exact:true}).fill('Textstelle');
  await expect(page.locator('.note-card')).toHaveCount(0);
  await page.getByRole('textbox',{name:'Notizen durchsuchen',exact:true}).fill('');
  await current.locator('.note-open').click();
  await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Privater Vergleich bleibt lokal.');
});
