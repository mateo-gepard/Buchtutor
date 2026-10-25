import {readFileSync,writeFileSync} from 'node:fs';
import {test,expect,type Page} from './reader-test';
import {EMPTY_SNAPSHOT,snapshotSchema,type LocalSnapshot} from '../../lib/local-model';
import {makeAnchor,type Book,type SavedNote} from '../../lib/reader-model';
import {pencilPalette,type PencilColor} from '../../lib/pencil-model';

const books=['iphigenie','faust','nathan'].map(id=>JSON.parse(readFileSync(`corpus/books/${id}.json`,'utf8')) as Book);
const places=books.map(book=>book.sections.flatMap(section=>section.blocks.filter(b=>b.kind==='verse'||b.kind==='prose').map(block=>({section,block}))));
const colors:PencilColor[]=['green','blue','yellow','pink'];
const notes:SavedNote[]=Array.from({length:250},(_,i)=>{
 const book=books[i%3],place=places[i%3][Math.floor(i/3)],id='growth-'+String(i).padStart(4,'0'),anchor=makeAnchor(place.section,place.block.id),color=colors[i%4];
 const ink=i<20?Array.from({length:40},(_,s)=>Array.from({length:16},(_,p)=>({x:15+(s%10)*32+p,y:15+Math.floor(s/10)*40+Math.sin(p/2)*8,pressure:.5}))):[];
 const date=new Date(Date.UTC(2026,9,24,8,i)).toISOString();
 return {id,workId:book.id,editionId:book.editionId,anchor,kind:i%5===0?'style':'note',body:`Studiennotiz ${String(i).padStart(4,'0')}. Natur, Freiheit und Verantwortung im Zusammenhang der Szene.`,pencil:{color,meaning:pencilPalette[color].meaning,ink,transcription:i<20?'recognized':'manual',...(ink.length?{inkWidth:400,inkHeight:200,pageInk:[{id:id+'-group',targetId:id,referenceId:anchor.startId,width:700,fontSize:18,strokes:ink.map((points,s)=>({id:id+'-stroke-'+s,order:s,points}))}]}:{})},createdAt:date,updatedAt:date,...(i%5===0?{analysis:{id:'analysis-'+id,workId:book.id,editionId:book.editionId,anchor,mode:'style' as const,title:'Gespeicherte Erklärung '+id,summary:'Die Textstelle verbindet eine persönliche Erfahrung mit dem Konflikt des Werkes. '.repeat(20),observations:Array.from({length:6},(_,o)=>({label:'Beobachtung '+o,text:'Der sprachliche Ausdruck lässt sich aus dem Zusammenhang der Szene heraus untersuchen. '.repeat(18)+(o===5?' Die Natur bietet Geborgenheit und stellt die Frage nach Verantwortung.':''),quotes:[]})),uncertainty:'Mehrere Deutungen bleiben möglich.',source:'prepared' as const,model:'Synthetischer Test',promptVersion:'growth-test',generatedAt:date}}:{})};
});
const drafts:Record<string,string>={};
for(let i=0;i<6;i++){
 const book=books[i%3],place=places[i%3][100+i],anchor=makeAnchor(place.section,place.block.id);
 drafts[`buchtutor-note-draft:${book.editionId}:${JSON.stringify(anchor)}:new`]=JSON.stringify({version:1,body:'Unabhängiger Textentwurf '+i});
 const section=book.sections.filter(s=>s.blocks.some(b=>b.kind==='verse'||b.kind==='prose'))[Math.floor(i/3)+1],block=section.blocks.find(b=>b.kind==='verse'||b.kind==='prose')!;
 drafts[`buchtutor-pencil-draft:${book.id}:${book.editionId}:${section.id}`]=JSON.stringify({version:2,entries:[{id:'draft-pencil-'+i,anchor:makeAnchor(section,block.id),body:'Unabhängiger Pencil-Entwurf '+i,pencil:{color:'green',meaning:'Stilmittel',ink:[],transcription:'manual'}}],groups:[]});
}
const snapshot=snapshotSchema.parse({...EMPTY_SNAPSHOT,preferences:{...EMPTY_SNAPSHOT.preferences,value:{...EMPTY_SNAPSHOT.preferences.value,handwritingCloud:false}},notes}) satisfies LocalSnapshot;
type Measurement={label:string;ms:number;nodes:number;cards:number;paths:number};
type AuditWindow=Window&{growthMetrics:Measurement[];growthObserver?:MutationObserver};
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});

// Event to matching DOM plus two animation frames, inside the browser clock.
// This is one unthrottled host run, not a physical iPad benchmark or a percentile.
async function measure(page:Page,label:string,eventType:string,selector:string,count:number,action:()=>Promise<unknown>){
 await page.evaluate(({label,eventType,selector,count})=>{
  const audit=window as unknown as AuditWindow;audit.growthMetrics??=[];audit.growthObserver?.disconnect();
  const start=()=>{
   const at=performance.now();let finished=false;
   const check=()=>{if(finished||document.querySelectorAll(selector).length!==count)return;finished=true;audit.growthObserver?.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>{audit.growthMetrics.push({label,ms:performance.now()-at,nodes:document.querySelectorAll('.notebook-page *').length,cards:document.querySelectorAll('.note-card').length,paths:document.querySelectorAll('.saved-ink path').length});}));};
   audit.growthObserver=new MutationObserver(check);audit.growthObserver.observe(document.body,{childList:true,subtree:true,attributes:true});requestAnimationFrame(check);
  };
  document.addEventListener(eventType,start,{capture:true,once:true});
 },{label,eventType,selector,count});
 await action();await expect(page.locator(selector)).toHaveCount(count);await expect.poll(()=>page.evaluate(label=>(window as unknown as AuditWindow).growthMetrics.some(item=>item.label===label),label)).toBe(true);
}
async function fingerprints(page:Page){return page.evaluate(async()=>{
 const notes=await new Promise<SavedNote[]>((resolve,reject)=>{const r=indexedDB.open('leseraum-local-v2');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('reader');q.onsuccess=()=>{resolve(q.result.notes);db.close();};q.onerror=()=>reject(q.error);};});
 const hash=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(n=>n.toString(16).padStart(2,'0')).join('');
 return {notes:await hash(notes),ink:await hash(notes.filter(n=>n.pencil?.ink.length).map(n=>({id:n.id,pencil:n.pencil}))),drafts:await hash(Object.keys(localStorage).filter(key=>key.startsWith('buchtutor-note-draft:')||key.startsWith('buchtutor-pencil-draft:')).sort().map(key=>[key,localStorage.getItem(key)])),ids:notes.map(n=>n.id).sort()};
});}

test('a grown notebook keeps search, original identity and filtered selection through reading and reload',async({page,browserName},info)=>{
 test.setTimeout(90000);await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());
 await page.goto('/?view=library');await page.evaluate(async({snapshot,drafts})=>{
  await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('leseraum-local-v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(snapshot,'reader');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
  for(const [key,raw] of Object.entries(drafts))localStorage.setItem(key,raw);
 },{snapshot,drafts});await page.reload();
 const original=await fingerprints(page),search=page.getByRole('textbox',{name:'Notizen durchsuchen'}),work=page.getByLabel('Notizen nach Werk filtern'),color=page.getByLabel('Nach Markierungsfarbe filtern');
 await measure(page,'open-250','click','.note-card',250,()=>button(page,'Meine Notizen').click());await expect(page.locator('.notebook-drafts>summary')).toContainText('12 Entwürfe');await expect(page.locator('.notebook-drafts')).not.toHaveAttribute('open');
 await measure(page,'search-two-words','input','.note-card',50,()=>search.fill('Natur Geborgenheit'));
 await measure(page,'reverse-search-words','input','.note-card',50,()=>search.fill('Geborgenheit Natur'));
 await page.locator('.notebook-filter-disclosure>summary').click();
 const matching=notes.filter(n=>n.analysis&&n.pencil?.color==='blue'),focused=matching.filter(n=>n.workId==='iphigenie');
 await measure(page,'filter-color','change','.note-card',matching.length,()=>color.selectOption('blue'));
 await measure(page,'filter-work','change','.note-card',focused.length,()=>work.selectOption('iphigenie'));
 const target=focused[0],card=page.locator('.note-card').filter({hasText:target.body});await card.scrollIntoViewIfNeeded();const beforeReading=await page.evaluate(()=>scrollY);
 await expect(card.locator('.notebook-search-preview').last()).toContainText('Geborgenheit');await page.screenshot({path:info.outputPath('deep-search.png')});await card.locator('.note-open').click();
 await expect(page.locator('.reader-title')).toContainText('Iphigenie');await expect(page.locator('.row-selected').first()).toHaveAttribute('id',target.anchor.startId);await expect(page.getByRole('heading',{name:target.analysis!.title,exact:true})).toBeVisible();
 await page.goBack();await expect(search).toHaveValue('Geborgenheit Natur');await expect(work).toHaveValue('iphigenie');await expect(color).toHaveValue('blue');await expect(page.locator('.notebook-drafts>summary')).toContainText('4 Entwürfe');await expect(page.locator('.notebook-drafts')).not.toHaveAttribute('open');await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(beforeReading-8);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(beforeReading+8);
 await button(page,'Einträge auswählen').click();await measure(page,'single-select','click','.note-select input:checked',1,()=>page.locator('.note-open').first().click());
 await button(page,'Filter entfernen: Iphigenie auf Tauris').click();await expect(page.locator('.note-card')).toHaveCount(matching.length);
 await measure(page,'select-filtered','click','.note-select input:checked',matching.length,()=>button(page,'Sichtbare auswählen').click());
 await work.selectOption('faust');const visible=matching.filter(n=>n.workId==='faust');await expect(page.locator('.notebook-hidden-selection')).toContainText(String(matching.length-visible.length));
 await button(page,'Sichtbare abwählen').click();await expect(page.locator('.note-select input:checked')).toHaveCount(0);await button(page,'Sichtbare auswählen').click();await button(page,'Ausgeblendete abwählen').click();await expect(page.locator('.note-select input:checked')).toHaveCount(visible.length);
 await page.locator('.note-open').last().scrollIntoViewIfNeeded();const beforeReload=await page.evaluate(()=>scrollY);const beforeLayout=await page.evaluate(()=>({scroll:scrollY,height:document.documentElement.scrollHeight,draftOpen:document.querySelector('.notebook-drafts')?.hasAttribute('open'),draftHeight:document.querySelector('.notebook-drafts')?.getBoundingClientRect().height,session:sessionStorage.getItem('buchtutor-notebook-session-v1'),cards:[...document.querySelectorAll('.note-card')].map(e=>({top:e.getBoundingClientRect().top+scrollY,height:e.getBoundingClientRect().height}))}));await page.screenshot({path:info.outputPath('before-reload.png')});
 const metrics=await page.evaluate(()=>(window as unknown as AuditWindow).growthMetrics);await page.reload();await expect(page.getByRole('heading',{name:'Meine Notizen',exact:true})).toBeVisible();await expect.soft(page.locator('.note-card')).toHaveCount(visible.length);await expect.soft.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(beforeReload-12);
 const afterLayout=await page.evaluate(()=>({scroll:scrollY,height:document.documentElement.scrollHeight,draftOpen:document.querySelector('.notebook-drafts')?.hasAttribute('open'),draftHeight:document.querySelector('.notebook-drafts')?.getBoundingClientRect().height,session:sessionStorage.getItem('buchtutor-notebook-session-v1'),cards:[...document.querySelectorAll('.note-card')].map(e=>({top:e.getBoundingClientRect().top+scrollY,height:e.getBoundingClientRect().height}))}));const afterReload={query:await search.inputValue(),work:await work.inputValue(),color:await color.inputValue(),scroll:await page.evaluate(()=>scrollY),selected:await page.locator('.note-select input:checked').count(),cards:await page.locator('.note-card').count()};
 expect.soft(afterReload.query).toBe('Geborgenheit Natur');expect.soft(afterReload.work).toBe('faust');expect.soft(afterReload.color).toBe('blue');expect.soft(afterReload.selected).toBe(visible.length);expect.soft(Math.abs(afterReload.scroll-beforeReload)).toBeLessThan(12);
 expect(await fingerprints(page)).toEqual(original);
 const report={browserName,project:info.project.name,browserVersion:page.context().browser()?.version(),viewport:page.viewportSize(),fixture:{notes:250,handwritten:20,strokesPerHandwrittenNote:40,pointsPerStroke:16,longAnalyses:50,drafts:12,jsonBytes:Buffer.byteLength(JSON.stringify(snapshot))},metrics,beforeReload,afterReload,beforeLayout,afterLayout,dataUnchanged:true};
 const reportPath=info.outputPath('measurements.json');writeFileSync(reportPath,JSON.stringify(report,null,2));await info.attach('growth-measurements',{path:reportPath,contentType:'application/json'});await page.screenshot({path:info.outputPath('after-reload.png')});
});
