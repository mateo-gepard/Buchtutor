import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {ONBOARDING_KEY} from '../../lib/onboarding';
import {audioProgressKey,type Audiobook} from '../../lib/audiobook';
import type {Book} from '../../lib/reader-model';
const book=JSON.parse(readFileSync('corpus/books/iphigenie.json','utf8')) as Book;
const first=book.sections[0],second=book.sections[1],lines=first.blocks.filter(b=>b.kind==='verse');
function cue(section=first,block=lines[0],start=1,end=5){return {start,end,sectionId:section.id,blockId:block.id,startOffset:0,endOffset:block.text.length,confidence:1};}
const manifest:Audiobook={version:1,workId:book.id,editionId:book.editionId,revision:book.revision,recordingId:'test-recording',sourceLabel:'Testaufnahme',sourceUrl:'https://librivox.org/',licenseUrl:'https://librivox.org/pages/public-domain/',narrator:'Teststimme',note:'',alignment:{method:'test',matchedBlocks:3,totalBlocks:3},tracks:[{id:'t1',title:'Erster Teil',url:'https://archive.org/download/buchtutor-test/one.wav',duration:20,sha256:'a'.repeat(64),cues:[cue(),cue(first,lines[3],7,12)]},{id:'t2',title:'Zweiter Teil',url:'https://archive.org/download/buchtutor-test/two.wav',duration:20,sha256:'b'.repeat(64),cues:[cue(second,second.blocks.find(b=>b.kind==='verse')!)]}]};
function wav(){const length=20*8000*2,buffer=Buffer.alloc(length+44);buffer.write('RIFF');buffer.writeUInt32LE(length+36,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(length,40);return buffer;}
async function setup(page:Page,broken=false,synthetic=false){
 await page.addInitScript(key=>localStorage.setItem(key,'1'),ONBOARDING_KEY);
 const recording=synthetic?{...manifest,synthetic:true}:manifest;
 await page.route('**/audiobooks/iphigenie.json',route=>route.fulfill({json:broken?{...recording,revision:'outdated'}:recording}));
 let requests=0;await page.route('https://archive.org/download/buchtutor-test/**',async route=>{requests++;await route.fulfill({body:wav(),contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'}});});
 await page.goto('/?work=iphigenie&section=s001&view=reader');await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();
 return ()=>requests;
}
async function at(page:Page,time:number){await expect.poll(()=>page.locator('audio').evaluate(el=>(el as HTMLAudioElement).readyState)).toBeGreaterThan(0);await page.locator('audio').evaluate((el,time)=>new Promise<void>(resolve=>{const media=el as HTMLAudioElement;const done=()=>{media.dispatchEvent(new Event('timeupdate'));resolve();};if(!media.seeking&&Math.abs(media.currentTime-time)<.01){done();return;}media.addEventListener('seeked',done,{once:true});media.currentTime=time;}),time);}
async function details(page:Page){await page.getByRole('button',{name:'Hörbuch-Details öffnen',exact:true}).click();}
async function geometry(page:Page){await expect.poll(()=>page.locator('.reader-audio').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}

test('recording loads only on play, follows text, pauses following on interaction, and resumes locally',async({page})=>{
 const requests=await setup(page);await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeEnabled();expect(requests()).toBe(0);await geometry(page);
 await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();await at(page,2);await expect(page.locator('.audio-current')).toHaveAttribute('id',lines[0].id);expect(requests()).toBeGreaterThan(0);
 await details(page);await expect(page.getByRole('checkbox',{name:'Text automatisch mitführen'})).toBeChecked();await page.locator('[data-text]').first().dispatchEvent('pointerdown');await details(page);await expect(page.getByRole('checkbox',{name:'Text automatisch mitführen'})).not.toBeChecked();
 await page.getByRole('button',{name:'Zur Hörstelle',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Text automatisch mitführen'})).toBeChecked();await page.getByRole('combobox',{name:'Hörtempo'}).selectOption('1.5');expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).playbackRate)).toBe(1.5);
 await at(page,8);await expect(page.locator('.audio-current')).toHaveAttribute('id',lines[3].id);await page.getByRole('button',{name:'Wiedergabe pausieren',exact:true}).click();await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.time,audioProgressKey(book.editionId))).toBeGreaterThan(7);
 await page.evaluate(()=>window.scrollTo(0,500));
 // A detail card in the document must be brought into view before a real tap can close it.
 const close=page.getByRole('button',{name:'Player schließen und pausieren',exact:true});await close.scrollIntoViewIfNeeded();
 const reflow=await page.locator('.audio-details').evaluate(el=>el.closest('.workspace-inline-host')?el.getBoundingClientRect().height+34:24),beforeClose=await page.evaluate(()=>window.scrollY);
 await close.click();await expect(page.locator('.reader-audio')).toHaveCount(0);await expect.poll(async()=>Math.abs(await page.evaluate(()=>window.scrollY)-beforeClose)).toBeLessThanOrEqual(reflow);await expect(page.locator('.audio-current')).toHaveCount(0);await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();await details(page);await expect(page.getByRole('slider',{name:'Hörposition im Audiokapitel'})).toHaveValue(/^8/);await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeVisible();
});
test('synthetic manifests are rejected without loading audio or offering a device voice',async({page})=>{
 const requests=await setup(page,false,true);await details(page);
 await expect(page.locator('.audio-error')).toBeVisible();await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeDisabled();
 await expect(page.getByRole('combobox',{name:'Audioquelle wählen'})).toHaveCount(0);expect(requests()).toBe(0);
});

test('chapter navigation preserves pause, carries text across sections, and chapter sleep stops playback',async({page})=>{
 await setup(page);await details(page);await page.getByRole('combobox',{name:'Audiokapitel wählen'}).selectOption('1');await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeVisible();await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await at(page,2);await expect(page).toHaveURL(new RegExp('section='+second.id));await expect(page.locator('.audio-current')).toHaveCount(1);
 await page.getByRole('combobox',{name:'Schlaftimer'}).selectOption('chapter');await page.locator('audio').evaluate(el=>el.dispatchEvent(new Event('ended')));await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeVisible();await expect(page.getByRole('combobox',{name:'Schlaftimer'})).toHaveValue('off');await geometry(page);
});
test('leaving the reader removes floating tools, pauses playback and retains the listening position',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();await at(page,8);await expect(page.locator('.audio-current')).toHaveAttribute('id',lines[3].id);
 const media=await page.locator('audio').elementHandle();await details(page);
 await page.getByRole('button',{name:'Zur Bibliothek',exact:true}).click();await expect(page.getByRole('heading',{name:'Bibliothek',exact:true})).toBeVisible();
 await expect(page.locator('.reader-workspace,.reader-audio,.workspace-popover')).toHaveCount(0);expect(await media!.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.time??0,audioProgressKey(book.editionId))).toBeGreaterThanOrEqual(8);
 await page.getByRole('button',{name:/^Iphigenie auf Tauris –/}).click();await expect(page.locator('.reader-workspace')).toHaveCount(1);await expect(page.locator('.workspace-popover:visible')).toHaveCount(0);
 await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeEnabled();expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
 await details(page);await expect(page.getByRole('slider',{name:'Hörposition im Audiokapitel'})).toHaveValue(/^8/);
 const contents=page.getByRole('button',{name:'Inhalt',exact:true});await (await contents.isVisible()?contents:page.locator('.footer-section')).click();await page.getByRole('button',{name:'Meine Notizen',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Meine Notizen',exact:true})).toBeVisible();await expect(page.locator('.reader-workspace,.reader-audio')).toHaveCount(0);
});
test('unsupported editions show a retry action and narrow layouts remain usable',async({page})=>{
 const requests=await setup(page,true);await details(page);await expect(page.locator('.audio-error')).toContainText('Textausgabe');
 await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeDisabled();expect(requests()).toBe(0);
 await page.setViewportSize({width:320,height:680});await geometry(page);
 await page.route('**/audiobooks/iphigenie.json',route=>route.fulfill({json:manifest}));await page.getByRole('button',{name:'Erneut laden',exact:true}).click();
 await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeEnabled();await expect(page.locator('.audio-error')).toHaveCount(0);
 await page.getByRole('button',{name:'Player schließen und pausieren',exact:true}).click();await expect(page.getByRole('button',{name:'Hören und mitlesen',exact:true})).toBeFocused();
});

test('legacy device-voice preferences cannot start synthetic speech; onboarding pauses the recording',async({page})=>{
 await page.addInitScript(({key,editionId,revision})=>{
  localStorage.setItem(key,JSON.stringify({version:1,editionId,revision,mode:'device',time:10,unit:12,rate:1,voice:'old-device-voice',follow:true}));
  const state={calls:0};Object.assign(window,{audioTest:state});
  Object.defineProperty(window,'speechSynthesis',{value:{speak:()=>{state.calls++;}}});
 },{key:audioProgressKey(book.editionId),editionId:book.editionId,revision:book.revision});
 await setup(page);await details(page);await expect(page.getByRole('combobox',{name:'Audioquelle wählen'})).toHaveCount(0);
 await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();
 await at(page,2);await expect(page.locator('.audio-current')).toHaveAttribute('id',lines[0].id);
 await page.getByRole('button',{name:'Einführung starten',exact:true}).click();await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeVisible();
 expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
 expect(await page.evaluate(()=>(window as unknown as {audioTest:{calls:number}}).audioTest.calls)).toBe(0);
});

test('audio controls stay clear of text selection and the note panel',async({page})=>{
 await setup(page);await page.locator('.source-row .line-number').first().click();await expect(page.locator('.selection-dock')).toBeVisible();
 expect(await page.evaluate(()=>{const a=document.querySelector('.reader-audio')!.getBoundingClientRect(),b=document.querySelector('.selection-dock')!.getBoundingClientRect();return b.bottom<=a.top||a.bottom<=b.top||b.right<=a.left||b.left>=a.right;})).toBe(true);
 await page.getByRole('button',{name:'Notiz',exact:true}).click();await expect(page.getByRole('textbox',{name:'Deine Notiz'})).toBeVisible();
 expect(await page.evaluate(()=>{const a=document.querySelector('.reader-audio')!.getBoundingClientRect(),b=document.querySelector('.assistant-panel')!.getBoundingClientRect();return a.bottom<=b.top+1||a.right<=b.left+1||a.left>=b.right-1;})).toBe(true);
 await geometry(page);
});
test('automatic next track uses its own cues and skipping while paused does not start playback',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();
 await page.locator('audio').evaluate(el=>el.dispatchEvent(new Event('ended')));await expect(page.locator('audio')).toHaveAttribute('src',manifest.tracks[1].url);await at(page,2);await expect(page.locator('.audio-current')).toHaveAttribute('id',manifest.tracks[1].cues[0].blockId);
 await page.getByRole('button',{name:'Wiedergabe pausieren',exact:true}).click();await details(page);await page.getByRole('button',{name:'15 Sekunden zurück',exact:true}).click();await expect(page.locator('audio')).toHaveAttribute('src',manifest.tracks[0].url);await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeVisible();expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
});
test('a failed media request can be retried without reopening the player',async({page})=>{
 await setup(page);let attempts=0,unavailable=true;
 await page.route('https://archive.org/download/buchtutor-test/**',route=>{attempts++;return unavailable?route.fulfill({status:503,body:'Temporarily unavailable'}):route.fulfill({body:wav(),contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'}});});
 await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.locator('.audio-error-indicator')).toBeVisible();await details(page);await expect(page.locator('.audio-error')).toBeVisible();
 unavailable=false;await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();await expect(page.locator('.audio-error')).toHaveCount(0);expect(attempts).toBeGreaterThan(1);
});
test('loading can be canceled and a stalled recording has a bounded wait',async({page})=>{
 await setup(page);await page.route('https://archive.org/download/buchtutor-test/**',()=>{});
 await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await page.getByRole('button',{name:'Laden abbrechen',exact:true}).click();await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeVisible();expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
 await page.clock.install();await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await page.clock.fastForward(21000);await expect(page.locator('.audio-error')).toContainText('lädt zu lange');await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeVisible();
});

test('books without a licensed human recording show unavailable and request no audio',async({page})=>{
 await page.addInitScript(key=>localStorage.setItem(key,'1'),ONBOARDING_KEY);
 const requests:string[]=[];page.on('request',request=>{if(request.url().includes('/audiobooks/')||request.resourceType()==='media')requests.push(request.url());});
 await page.goto('/?view=library');
 for(const title of ['Der zerbrochne Krug','Emilia Galotti'])await expect(page.getByRole('button',{name:new RegExp('^'+title+' –')})).toContainText('Hörbuch nicht verfügbar');
 await expect(page.getByText(/Synthetische Lesung|Hörbuch in Vorbereitung|Vorlesen verfügbar/)).toHaveCount(0);
 for(const work of ['krug','emilia']){
  await page.goto(`/?work=${work}&section=s001&view=reader`);
  await expect(page.getByRole('button',{name:'Hörbuch nicht verfügbar',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Hören und mitlesen',exact:true})).toHaveCount(0);await expect(page.locator('.reader-audio')).toHaveCount(0);
 }
 expect(requests).toEqual([]);
});

test('one shared toolbar preserves audio, Pencil drafts and typed notes while switching accessories',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();await at(page,2);
 const media=await page.locator('audio').elementHandle();
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.locator('[data-text]').first().evaluate(el=>{const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,range=document.createRange();range.setStart(node,0);range.setEnd(node,6);const r=range.getBoundingClientRect();for(const [type,x] of [['pointerdown',r.left+1],['pointermove',r.right-1],['pointerup',r.right-1]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:71,pointerType:'pen',clientX:x,clientY:r.top+r.height/2,buttons:type==='pointerup'?0:1}));});
 await expect(page.locator('.saved-highlight')).toHaveCount(1);
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Natur als Zuflucht');
 await page.getByRole('button',{name:'Lesehilfe öffnen',exact:true}).click();await expect(page.locator('.analysis-actions')).toBeVisible();
 await expect(page.locator('.reader-workspace')).toHaveCount(1);await expect(page.locator('.workspace-popover:visible,.pencil-popover:visible')).toHaveCount(1);
 await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{const r=el.getBoundingClientRect(),header=document.querySelector('.reader-header')!.getBoundingClientRect();return r.top>=header.bottom+8;})).toBe(true);
 await expect(page.getByRole('button',{name:'Radiergummi',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();
 expect(await media!.evaluate(el=>el.isConnected&&!(el as HTMLAudioElement).paused)).toBe(true);
 await details(page);await expect(page.locator('.assistant-panel')).toBeHidden();await expect(page.locator('.audio-details')).toBeVisible();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();await expect(page.locator('.audio-details')).toBeHidden();await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Natur als Zuflucht');
 await expect(page.locator('.saved-highlight')).toHaveCount(1);expect(await media!.evaluate(el=>el.isConnected&&!(el as HTMLAudioElement).paused)).toBe(true);
 await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();
 await page.getByRole('button',{name:'Werkzeugleiste verschieben',exact:true}).press('Shift+ArrowRight');await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock','right');
 await page.getByRole('button',{name:'Lesehilfe öffnen',exact:true}).click();
 await expect.poll(()=>page.locator('.reader-workspace').evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth+1&&r.y>=0&&r.bottom<=innerHeight;})).toBe(true);
 await expect.poll(()=>page.locator('.assistant-panel').evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth+1&&r.y>=0&&r.bottom<=innerHeight;})).toBe(true);
 await page.getByRole('button',{name:'Wiedergabe pausieren',exact:true}).click();expect(await media!.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
});

test('reading emphasis is configurable, gaps clear the cursor and returning to audio resumes following',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();await at(page,2);await details(page);
 const group=page.getByRole('group',{name:'Hörstelle hervorheben',exact:true});await group.getByRole('button',{name:'Zeile',exact:true}).click();
 await expect(page.locator('.audio-current')).toHaveAttribute('data-audio-emphasis','line');
 await group.getByRole('button',{name:'Aus',exact:true}).click();await expect(page.locator('.audio-current')).toHaveAttribute('data-audio-emphasis','off');
 await page.locator('[data-text]').first().dispatchEvent('pointerdown');await expect(page.getByRole('button',{name:'Beim Hören mitlesen',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Beim Hören mitlesen',exact:true}).click();await expect(page.getByRole('button',{name:'Beim Hören mitlesen',exact:true})).toHaveCount(0);
 await at(page,6);await expect(page.locator('.audio-current')).toHaveCount(0);await at(page,8);await expect(page.locator('.audio-current')).toHaveAttribute('id',lines[3].id);
 await page.getByRole('button',{name:'Wiedergabe pausieren',exact:true}).click();
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.emphasis,audioProgressKey(book.editionId))).toBe('off');
 await page.reload();await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();await details(page);await expect(page.getByRole('group',{name:'Hörstelle hervorheben'}).getByRole('button',{name:'Aus',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('a seek made while metadata is delayed wins over the original start position',async({page})=>{
 await setup(page);let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('https://archive.org/download/buchtutor-test/**',async route=>{await gate;await route.fulfill({body:wav(),contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'}});});
 await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Laden abbrechen',exact:true})).toBeVisible();await details(page);
 await page.getByRole('slider',{name:'Hörposition im Audiokapitel'}).evaluate(el=>{(el as HTMLInputElement).valueAsNumber=8;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect(page.getByRole('slider',{name:'Hörposition im Audiokapitel'})).toHaveValue('8');release();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Wiedergabe pausieren',exact:true}).click();expect(await page.locator('audio').evaluate(el=>(el as HTMLAudioElement).currentTime)).toBeGreaterThanOrEqual(7.9);
});
test('pausing near the end resumes that position instead of restarting the chapter',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();await at(page,19.7);
 await page.getByRole('button',{name:'Wiedergabe pausieren',exact:true}).click();await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect.poll(()=>page.locator('audio').evaluate(el=>(el as HTMLAudioElement).currentTime),{intervals:[10,20,50]}).toBeGreaterThan(19);
});

test('following long prose uses the spoken phrase even with visual emphasis switched off',async({page})=>{
 const prose=JSON.parse(readFileSync('corpus/books/verwandlung.json','utf8')) as Book,section=prose.sections[0],block=section.blocks.find(b=>b.kind==='prose'&&b.text.length>2200)!;
 const offset=Math.floor(block.text.length*.8),recording={...manifest,workId:prose.id,editionId:prose.editionId,revision:prose.revision,tracks:[{...manifest.tracks[0],cues:[{start:1,end:12,sectionId:section.id,blockId:block.id,startOffset:offset,endOffset:offset+30,confidence:1}]}]};
 await page.addInitScript(key=>localStorage.setItem(key,'1'),ONBOARDING_KEY);await page.route('**/audiobooks/verwandlung.json',route=>route.fulfill({json:recording}));await page.route('https://archive.org/download/buchtutor-test/**',route=>route.fulfill({body:wav(),contentType:'audio/wav',headers:{'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'}}));
 await page.goto('/?work=verwandlung&section=s001&view=reader');await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();await expect(page.getByRole('button',{name:'Hörbuch abspielen',exact:true})).toBeEnabled();await details(page);
 await page.getByRole('group',{name:'Hörstelle hervorheben'}).getByRole('button',{name:'Aus',exact:true}).click();await page.getByRole('button',{name:'Hörbuch abspielen',exact:true}).click();await expect(page.getByRole('button',{name:'Wiedergabe pausieren',exact:true})).toBeVisible();await at(page,2);
 await expect.poll(()=>page.evaluate(({id,offset})=>{const el=document.getElementById(id)!.querySelector('[data-text]')!,walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node:Node|null,total=0;while((node=walker.nextNode())){const length=node.textContent?.length??0;if(total+length>offset){const range=document.createRange();range.setStart(node,offset-total);range.setEnd(node,Math.min(length,offset-total+5));const rect=range.getBoundingClientRect();return rect.top>=90&&rect.bottom<=innerHeight-80;}total+=length;}return false;},{id:block.id,offset})).toBe(true);
});
