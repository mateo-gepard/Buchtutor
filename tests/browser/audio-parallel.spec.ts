import {test,expect,type Page} from './reader-test';
import {readFileSync} from 'node:fs';
import {audioProgressKey,type Audiobook} from '../../lib/audiobook';
import type {Book} from '../../lib/reader-model';

const book=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book,section=book.sections[0],lines=section.blocks.filter(block=>block.kind==='verse');
const key=audioProgressKey(book.editionId);
const cue=(index:number,start:number,end:number)=>({start,end,sectionId:section.id,blockId:lines[index].id,startOffset:0,endOffset:lines[index].text.length,confidence:1});
const recording:Audiobook={version:1,workId:book.id,editionId:book.editionId,revision:book.revision,recordingId:'parallel-audio-check',sourceLabel:'Lokale Prüfaufnahme',sourceUrl:'https://librivox.org/',licenseUrl:'https://librivox.org/pages/public-domain/',narrator:'Prüfaufnahme',note:'',alignment:{method:'test',matchedBlocks:2,totalBlocks:2},tracks:[{id:'first',title:'Erster Aufzug – Erster Auftritt',url:'https://archive.org/download/buchtutor-test/parallel.wav',duration:20,sha256:'a'.repeat(64),cues:[cue(0,1,5),cue(3,7,12)]}]};
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
function wav(){const length=20*8000*2,buffer=Buffer.alloc(length+44);buffer.write('RIFF');buffer.writeUInt32LE(length+36,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(length,40);return buffer;}
async function setup(page:Page,resume=false){
 await page.route('**/api/analysis',route=>route.abort());await page.route('**/api/handwriting',route=>route.abort());
 if(resume)await page.addInitScript(({key,editionId,revision,recordingId})=>localStorage.setItem(key,JSON.stringify({version:1,editionId,revision,recordingId,trackId:'first',mode:'recording',time:8,unit:0,rate:1,voice:'',follow:false,emphasis:'phrase'})),{key,editionId:book.editionId,revision:book.revision,recordingId:recording.recordingId});
 await page.route('**/audiobooks/iphigenie.json',route=>route.fulfill({json:recording}));
 let requests=0;await page.route('https://archive.org/download/buchtutor-test/**',route=>{requests++;return route.fulfill({body:wav(),contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'}});});
 await page.goto('/?work=iphigenie&section=s001&view=reader');await button(page,'Hören und mitlesen').click();await expect(button(page,'Hörbuch abspielen')).toBeEnabled();return ()=>requests;
}
async function details(page:Page){await button(page,'Hörbuch-Details öffnen').click();}
async function at(page:Page,time:number){
 await expect.poll(()=>page.locator('audio').evaluate(el=>(el as HTMLAudioElement).readyState)).toBeGreaterThan(0);
 await page.locator('audio').evaluate((el,time)=>new Promise<void>(resolve=>{const media=el as HTMLAudioElement,done=()=>{media.dispatchEvent(new Event('timeupdate'));resolve();};if(!media.seeking&&Math.abs(media.currentTime-time)<.01){done();return;}media.addEventListener('seeked',done,{once:true});media.currentTime=time;}),time);
}
async function fits(page:Page){
 await expect.poll(()=>page.locator('.audio-details').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&el.scrollWidth<=el.clientWidth+1;})).toBe(true);
}

test('first listening actions fit a compact card with optional reading settings',async({page},testInfo)=>{
 const requests=await setup(page);await details(page);await fits(page);expect(requests()).toBe(0);
 await expect(page.locator('.audio-playback-state')).toContainText('Bereit zum Hören');await expect(page.locator('.audio-reading-options')).not.toHaveAttribute('open','');
 await expect(page.getByRole('combobox',{name:'Hörtempo'})).toBeVisible();await expect(page.getByRole('combobox',{name:'Audiokapitel wählen'})).toBeVisible();await expect(page.getByRole('combobox',{name:'Schlaftimer'})).toBeHidden();
 expect((await page.locator('.audio-details').boundingBox())!.height).toBeLessThan(340);
 const sizes=await page.locator('.audio-details button:visible,.audio-details select:visible').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect()).map(r=>({width:r.width,height:r.height})));expect(sizes.every(size=>size.width>=44&&size.height>=44)).toBe(true);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('compact-audio.png')});
 await page.locator('.audio-reading-options>summary').click();await expect(page.getByRole('combobox',{name:'Schlaftimer'})).toBeVisible();await fits(page);await page.getByRole('combobox',{name:'Schlaftimer'}).selectOption('15');await page.locator('.audio-reading-options>summary').click();await page.locator('.audio-reading-options>summary').click();await expect(page.getByRole('combobox',{name:'Schlaftimer'})).toHaveValue('15');
});

test('a saved listening position can be located before starting or downloading media',async({page},testInfo)=>{
 const requests=await setup(page,true);await details(page);await expect(page.locator('.audio-playback-state')).toContainText('Gespeicherte Hörposition · 0:08');await expect(page.locator('.audio-detail-heading')).toContainText('V. 4');await expect(button(page,'Zur Hörstelle')).toBeEnabled();
 await button(page,'Zur Hörstelle').click();await expect(page.locator('.audio-current')).toHaveAttribute('id',lines[3].id);expect(requests()).toBe(0);expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('resume-before-play.png')});await button(page,'Hörbuch abspielen').click();await expect(button(page,'Wiedergabe pausieren')).toBeVisible();expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).currentTime)).toBeGreaterThanOrEqual(7.9);
});

test('free reading keeps playback intact and exposes a labelled return to the real listening passage',async({page},testInfo)=>{
 await setup(page);await button(page,'Hörbuch abspielen').click();await expect(button(page,'Wiedergabe pausieren')).toBeVisible();await at(page,2);const media=await page.locator('audio').elementHandle();
 if(testInfo.project.use.browserName==='webkit'&&testInfo.project.use.isMobile){
  await page.locator('[data-text]').nth(2).evaluate(el=>{el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:51,isPrimary:true}));window.scrollBy({top:500,behavior:'instant'});el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:51,isPrimary:true}));});
 }else{const point=await page.locator('[data-text]').nth(2).boundingBox();await page.mouse.move(point!.x+30,point!.y+10);await page.mouse.wheel(0,500);}
 await expect(button(page,'Beim Hören mitlesen')).toBeVisible();await expect(button(page,'Beim Hören mitlesen')).toContainText('Hörstelle');await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(350);
 const scrolled=await page.evaluate(()=>window.scrollY);await at(page,8);expect(Math.abs(await page.evaluate(()=>window.scrollY)-scrolled)).toBeLessThan(3);expect(await media!.evaluate(el=>el.isConnected&&!(el as HTMLAudioElement).paused)).toBe(true);
 await button(page,'Beim Hören mitlesen').click();await expect(button(page,'Beim Hören mitlesen')).toHaveCount(0);await expect(page.locator('.audio-current')).toHaveAttribute('id',lines[3].id);await expect.poll(()=>page.locator('.audio-current').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=75&&r.bottom<innerHeight-60;})).toBe(true);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('return-to-listening.png')});
});

test('a recording error offers a direct retry at the retained listening time',async({page})=>{
 await setup(page,true);let unavailable=true,attempts=0;
 await page.route('https://archive.org/download/buchtutor-test/**',route=>{attempts++;return unavailable?route.fulfill({status:503,body:'Unavailable'}):route.fulfill({body:wav(),contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'}});});
 await button(page,'Hörbuch abspielen').click();await expect(page.locator('.audio-error-indicator')).toBeVisible();await details(page);await expect(button(page,'Erneut abspielen')).toBeVisible();await expect(page.getByRole('slider',{name:'Hörposition im Audiokapitel'})).toHaveValue('8');
 unavailable=false;await button(page,'Erneut abspielen').click();await expect(button(page,'Wiedergabe pausieren')).toBeVisible();await expect(page.locator('.audio-error')).toHaveCount(0);expect(attempts).toBeGreaterThan(1);expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).currentTime)).toBeGreaterThanOrEqual(7.9);
});

test('an unassigned reading passage explains the limitation while the recording keeps playing',async({page})=>{
 await setup(page);await button(page,'Hörbuch abspielen').click();await expect(button(page,'Wiedergabe pausieren')).toBeVisible();await at(page,8);
 await button(page,'Vers 6 auswählen').click();await details(page);await button(page,'Ab hier hören').click();
 await expect(page.locator('.audio-error')).toContainText('nicht sicher zugeordnet');await expect(page.locator('.audio-playback-state')).toContainText('Wiedergabe läuft');await expect(button(page,'Erneut abspielen')).toHaveCount(0);expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(false);
});

test('a resume-storage failure is visible without stopping playback and clears after recovery',async({page})=>{
 await setup(page);await button(page,'Hörbuch abspielen').click();await expect(button(page,'Wiedergabe pausieren')).toBeVisible();await at(page,8);await details(page);
 await page.evaluate(key=>{const original=Storage.prototype.setItem;Object.assign(window,{restoreAudioStorage:()=>{Storage.prototype.setItem=original;}});Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('Full','QuotaExceededError');return original.call(this,name,value);};},key);
 await expect(page.locator('.audio-resume-warning')).toContainText('nicht gesichert');expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(false);
 await page.evaluate(()=>(window as unknown as {restoreAudioStorage:()=>void}).restoreAudioStorage());await expect(page.locator('.audio-resume-warning')).toHaveCount(0);await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.time,key)).toBeGreaterThanOrEqual(8);
});

test('canceling a pending play ignores its late rejection and allows a fresh start',async({page})=>{
 await setup(page);await page.evaluate(()=>{const original=HTMLMediaElement.prototype.play;Object.assign(window,{restoreAudioPlay:()=>{HTMLMediaElement.prototype.play=original;}});HTMLMediaElement.prototype.play=function(){return new Promise<void>((_,reject)=>{Object.assign(window,{rejectAudioPlay:()=>reject(new DOMException('Late rejection','NotAllowedError'))});});};});
 await button(page,'Hörbuch abspielen').click();await expect(button(page,'Laden abbrechen')).toBeVisible();await button(page,'Laden abbrechen').click();await page.evaluate(()=>(window as unknown as {rejectAudioPlay:()=>void;restoreAudioPlay:()=>void}).rejectAudioPlay());await expect(page.locator('.audio-error-indicator')).toHaveCount(0);
 await page.evaluate(()=>(window as unknown as {restoreAudioPlay:()=>void}).restoreAudioPlay());await button(page,'Hörbuch abspielen').click();await expect(button(page,'Wiedergabe pausieren')).toBeVisible();
});

test('reading settings remain usable in a narrow iPad split view',async({page},testInfo)=>{
 await page.setViewportSize({width:680,height:759});await setup(page);await details(page);await fits(page);const passageTop=await page.locator('[data-text]').first().evaluate(el=>el.getBoundingClientRect().top);await page.locator('.audio-reading-options>summary').click();await page.getByRole('group',{name:'Hörstelle hervorheben'}).getByRole('button',{name:'Zeile',exact:true}).click();await expect(page.getByRole('group',{name:'Hörstelle hervorheben'}).getByRole('button',{name:'Zeile',exact:true})).toHaveAttribute('aria-pressed','true');await fits(page);expect(Math.abs(await page.locator('[data-text]').first().evaluate(el=>el.getBoundingClientRect().top)-passageTop)).toBeLessThan(3);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('split-view-settings.png')});
});

test('docking preserves following and the real return action fits alongside Pencil',async({page})=>{
 test.setTimeout(60000);await setup(page);await button(page,'Hörbuch abspielen').click();await expect(button(page,'Wiedergabe pausieren')).toBeVisible();await at(page,2);await button(page,'Wiedergabe pausieren').click();
 const grip=button(page,'Werkzeugleiste verschieben');
 for(const edge of ['Up','Right','Down','Left']){await grip.press('Shift+Arrow'+edge);await expect(button(page,'Beim Hören mitlesen')).toHaveCount(0);}
 await button(page,'Apple Pencil Modus').click();await expect(button(page,'Beim Hören mitlesen')).toBeVisible();
 for(const viewport of [{width:834,height:1194},{width:1194,height:834},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const edge of ['Up','Right','Down','Left']){
   await grip.press('Shift+Arrow'+edge);
   await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{const bar=el.getBoundingClientRect(),buttons=[...el.querySelectorAll('.workspace-main button')].map(button=>button.getBoundingClientRect()).filter(r=>r.width&&r.height);const bad=buttons.filter((r,i)=>!(r.left>=bar.left&&r.right<=bar.right+1&&r.top>=bar.top&&r.bottom<=bar.bottom+1&&buttons.slice(i+1).every(s=>Math.min(r.right,s.right)-Math.max(r.left,s.left)<=1||Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)<=1)));return bar.left>=0&&bar.right<=innerWidth+1&&!bad.length?null:{viewport:[innerWidth,innerHeight],dock:el.getAttribute('data-dock'),bar:bar.toJSON(),bad:bad.map(r=>r.toJSON())};})).toBeNull();
   const audioTargets=await page.locator('.audio-main>button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect()).map(r=>({width:r.width,height:r.height})));// Docking transforms can report 43.99998px for an explicit 44px target.
   expect(Math.min(...audioTargets.flatMap(r=>[r.width,r.height]))).toBeGreaterThanOrEqual(43.99);
  }
 }
});
