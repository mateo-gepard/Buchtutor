import {test,expect,useLocalHandwriting,type Page} from './reader-test';
async function mark(page:Page,index=0,pointerType='pen'){
 await page.locator('[data-text]').nth(index).scrollIntoViewIfNeeded();
 await page.locator('[data-text]').nth(index).evaluate((el,pointerType)=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()!,range=document.createRange();range.setStart(node,1);range.setEnd(node,5);const r=range.getBoundingClientRect(),y=r.top+r.height/2;
  for(const [type,x] of [['pointerover',r.left],['pointerdown',r.left],['pointermove',r.right],['pointerup',r.right]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:91,pointerType,clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));
 },pointerType);
}
async function stroke(page:Page,points:{x:number;y:number}[],pointerType='pen'){
 await page.locator('.pencil-text').evaluate((el,{points,pointerType})=>{
  const r=el.getBoundingClientRect();
  points.forEach((p,i)=>el.dispatchEvent(new PointerEvent(i===0?'pointerdown':i===points.length-1?'pointerup':'pointermove',{bubbles:true,cancelable:true,pointerId:92,pointerType,clientX:r.left+p.x,clientY:r.top+p.y,pressure:.7,buttons:i===points.length-1?0:1})));
 },{points,pointerType});
}
async function writeNear(page:Page,index=0){
 const y=await page.locator('[data-block]').nth(index).evaluate(el=>el.getBoundingClientRect().top-el.closest('.pencil-text')!.getBoundingClientRect().top);
 await stroke(page,[{x:-36,y:y+3},{x:-38,y:y+20},{x:-35,y:y+28}]);
 await stroke(page,[{x:-37,y:y+15},{x:-20,y:y+14},{x:-20,y:y+5}]);
 await stroke(page,[{x:-18,y:y+15},{x:-8,y:y+7},{x:-5,y:y+22}]);
}
async function chooseColor(page:Page,name:string){const button=page.getByRole('button',{name,exact:true});if(!await button.isVisible())await page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true}).click();await button.click();}
async function openNotebook(page:Page){await page.getByRole('button',{name:'Zur Bibliothek'}).click();await page.getByRole('button',{name:'Meine Notizen',exact:true}).click();}
test.beforeEach(async({page,context})=>{
 await useLocalHandwriting(context);
 page.on('request',request=>{if(request.url().includes('/api/handwriting'))throw new Error('Paid handwriting request must never be sent');});
 await page.goto('/?work=iphigenie&section=s001&view=reader');await expect(page.locator('[data-text]').first()).toContainText('Heraus');await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.locator('.pencil-workspace')).toHaveCSS('transform','none');const toolbar=await page.locator('.pencil-workspace').boundingBox();expect(toolbar!.height).toBeLessThanOrEqual(70);await expect(page.locator('.pencil-detail')).toHaveCount(0);
});
test('raw handwriting groups, saves original ink locally and remains editable without API calls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await mark(page,0,'touch');await stroke(page,[{x:0,y:20},{x:30,y:30}],'touch');await expect(page.locator('[data-ink-group]')).toHaveCount(0);
 await mark(page);await writeNear(page);await expect(page.locator('[data-ink-group] path')).toHaveCount(3);await expect(page.locator('.pencil-ink-label')).toHaveText('↳ V. 1');
 await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await page.reload();await expect(page.locator('.saved-highlight')).toHaveCount(1);await openNotebook(page);
 await expect(page.locator('.note-card')).toContainText('ohne Texterkennung');await expect(page.locator('.note-card')).toContainText('Grün · Stilmittel');await page.getByText('Originalhandschrift',{exact:true}).click();await expect(page.locator('.saved-ink path')).toHaveCount(3);
 await page.locator('.note-open').click();await page.getByRole('textbox',{name:'Deine Notiz'}).fill('Natur als Zuflucht');await page.getByRole('button',{name:'Notiz speichern',exact:true}).click();await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();await openNotebook(page);
 await page.getByLabel('Nach Markierungsfarbe filtern').selectOption('blue');await expect(page.locator('.note-card')).toHaveCount(0);await page.getByLabel('Nach Markierungsfarbe filtern').selectOption('green');await page.getByRole('textbox',{name:'Notizen durchsuchen'}).fill('Zuflucht');await expect(page.locator('.note-card')).toHaveCount(1);expect(errors).toEqual([]);
});

test('handwriting survives closing and reload; unavailable cloud recognition never blocks local saving',async({page})=>{
 await mark(page);await writeNear(page);await page.getByRole('button',{name:'Lesemodus',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(3);await expect(page.locator('.pencil-ink-label')).toHaveText('↳ V. 1');await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
});

test('two different handwritten notes keep their colors and canonical targets',async({page})=>{
 await mark(page);await writeNear(page);await chooseColor(page,'Blau: Interpretationsansatz');await mark(page,5);await writeNear(page,5);await expect(page.locator('[data-ink-group]')).toHaveCount(2);await expect(page.locator('.pencil-ink-label')).toHaveText(['↳ V. 1','↳ V. 6']);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await openNotebook(page);await expect(page.locator('.note-card')).toHaveCount(2);await page.getByLabel('Nach Markierungsfarbe filtern').selectOption('blue');await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('Blau · Interpretationsansatz');
});

test('handwriting without a nearby mark remains a draft instead of being silently saved',async({page})=>{
 let requests=0;await page.route('**/api/handwriting',route=>{requests++;return route.abort();});await writeNear(page);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-error')).toContainText('noch nicht eindeutig zugeordnet');expect(requests).toBe(0);
 await mark(page);await expect(page.locator('.pencil-ink-label')).toHaveText('↳ V. 1');
 await page.getByRole('button',{name:'Lesemodus',exact:true}).click();await expect(page.locator('.pencil-page-ink')).toHaveCount(1);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(3);
});
test('custom meanings and manual transcription preserve original page ink',async({page})=>{
 await page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true}).click();await page.getByRole('button',{name:'Farbbedeutungen anpassen',exact:true}).click();await page.getByLabel('Bedeutung für Grün').fill('Sprachliche Bilder');await page.getByLabel('Bedeutung für Grün').press('Tab');await page.getByRole('button',{name:'Farbbedeutungen schließen',exact:true}).click();await chooseColor(page,'Grün: Sprachliche Bilder');await mark(page);await writeNear(page);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await openNotebook(page);await page.getByLabel('Nach Markierungsbedeutung filtern').selectOption('Sprachliche Bilder');await page.locator('.note-open').click();await page.getByRole('textbox',{name:'Deine Notiz'}).fill('Hain als Zuflucht');await page.getByRole('button',{name:'Notiz speichern',exact:true}).click();await expect(page.locator('.panel-notes .note-card')).toContainText('Hain als Zuflucht');await page.locator('.workspace-saved-notes>summary').click();await page.locator('.panel-notes .saved-ink summary').click();await expect(page.locator('.panel-notes .saved-ink path')).toHaveCount(3);
});

test('palette can move freely, snap to every edge, restore and keep settings inside the viewport',async({page})=>{
 const grip=page.getByRole('button',{name:'Werkzeugleiste verschieben',exact:true});
 // Keyboard movement provides the same positioning without a precision drag.
 await grip.focus();await grip.press('Home');await grip.press('ArrowUp');await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock','floating');
 for(const [key,edge] of [['ArrowLeft','left'],['ArrowUp','top'],['ArrowRight','right'],['ArrowDown','bottom']] as const){
  await grip.press('Shift+'+key);await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock',edge);
  await expect.poll(async()=>{const bar=await page.locator('.reader-workspace').boundingBox();return !!bar&&(edge==='left'||edge==='right'?bar.height>bar.width:bar.width>bar.height);}).toBe(true);
  if(page.viewportSize()!.width<=600&&(edge==='left'||edge==='right'))await expect.poll(async()=>{const bar=await page.locator('.reader-workspace').boundingBox(),text=await page.locator('[data-text]').first().boundingBox();return !!bar&&!!text&&(edge==='left'?text.x>=bar.x+bar.width:text.x+text.width<=bar.x)?'inside':JSON.stringify({edge,bar,text});}).toBe('inside');
  await page.getByRole('button',{name:'Markierungsfarbe wählen',exact:true}).click();await page.getByRole('button',{name:'Farbbedeutungen anpassen',exact:true}).click();await expect(page.locator('.pencil-settings')).toBeVisible();const viewport=page.viewportSize()!;await expect.poll(async()=>{const box=await page.locator('.pencil-settings').boundingBox();return !!box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height;}).toBe(true);await page.getByRole('button',{name:'Farbbedeutungen schließen',exact:true}).click();
 }
 await grip.press('Shift+ArrowRight');await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock','right');
 await page.setViewportSize({width:834,height:700});await expect.poll(async()=>{const b=await page.locator('.reader-workspace').boundingBox();return !!b&&b.x>=0&&b.y>=0&&b.x+b.width<=834&&b.y+b.height<=700;}).toBe(true);
});
test('drag grip works with pen and finger; cancel restores its previous position',async({page})=>{
 const grip=page.getByRole('button',{name:'Werkzeugleiste verschieben',exact:true});
 for(const pointerType of ['pen','touch']){
  await grip.evaluate((el,pointerType)=>{const r=el.getBoundingClientRect();for(const [type,x,y] of [['pointerdown',r.x+10,r.y+10],['pointermove',12,100],['pointerup',12,100]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType,pointerId:93,clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));},pointerType);
  await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock','left');
 }
 await grip.evaluate(el=>{const r=el.getBoundingClientRect();for(const [type,x,y] of [['pointerdown',r.x+10,r.y+10],['pointermove',300,200],['pointercancel',300,200]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:94,clientX:x,clientY:y}));});await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock','left');
});
test('Pencil writing can cross the verse gutter and append to an existing saved mark',async({page})=>{

 await mark(page);
 await page.locator('.pencil-text').evaluate(el=>{const r=el.querySelector('.line-number')!.getBoundingClientRect();for(const [type,x,y] of [['pointerdown',r.x-3,r.y+4],['pointermove',r.x+14,r.y+22],['pointerup',r.x+25,r.y+25]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:95,clientX:x,clientY:y,pressure:.6}));});
 await expect(page.locator('[data-ink-group]')).toHaveCount(1);await expect(page.locator('.pencil-ink-label')).toHaveText('↳ V. 1');await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await writeNear(page);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await openNotebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('ohne Texterkennung');await page.getByText('Originalhandschrift',{exact:true}).click();await expect(page.locator('.saved-ink path')).toHaveCount(4);
});
test('a real pointer drag moves the palette freely and leaves the text stationary',async({page})=>{
 const bar=await page.locator('.reader-workspace').boundingBox(),grip=await page.getByRole('button',{name:'Werkzeugleiste verschieben',exact:true}).boundingBox(),before=await page.locator('[data-text]').first().boundingBox();
 await page.mouse.move(grip!.x+12,grip!.y+12);await page.mouse.down();await page.mouse.move((page.viewportSize()!.width-bar!.width)/2+12,220,{steps:6});await page.mouse.up();
 await expect(page.locator('.reader-workspace')).toHaveAttribute('data-dock','floating');await expect.poll(async()=>{const b=await page.locator('.reader-workspace').boundingBox();return !!b&&b.y<300;}).toBe(true);const after=await page.locator('[data-text]').first().boundingBox();expect(after!.y).toBeCloseTo(before!.y,0);
});

async function wordsGesture(page:Page,start:number,end=start,ending='pointerup',pointerType='pen'){
 await page.locator('[data-text]').first().evaluate((el,{start,end,ending,pointerType})=>{
  const words=[...(el.textContent??'').matchAll(/\S+/gu)];
  function box(index:number){const word=words[index],range=document.createRange(),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let total=0,node:Node|null,begun=false;while((node=walker.nextNode())){const length=node.textContent?.length??0;if(!begun&&word.index!<total+length){range.setStart(node,word.index!-total);begun=true;}if(begun&&word.index!+word[0].length<=total+length){range.setEnd(node,word.index!+word[0].length-total);return range.getBoundingClientRect();}total+=length;}throw new Error('Word not found');}
  const a=box(start),b=box(end),y=a.top+a.height/2;
  for(const [type,x] of [['pointerdown',a.left+2],['pointermove',b.right-2],[ending,b.right-2]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:98,pointerType,clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));
 },{start,end,ending,pointerType});
}
test('eraser removes individual words and ink lines; undo restores each complete eraser gesture',async({page})=>{

 await wordsGesture(page,0,2);await expect(page.locator('.saved-highlight')).toHaveText('Heraus in eure');
 const y=await page.locator('[data-text]').first().evaluate(el=>el.getBoundingClientRect().top-el.closest('.pencil-text')!.getBoundingClientRect().top);
 await stroke(page,[{x:-38,y:y+4},{x:-38,y:y+25}]);await stroke(page,[{x:-14,y:y+4},{x:-14,y:y+25}]);await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
 await page.getByRole('button',{name:'Radiergummi',exact:true}).click();await expect(page.getByRole('button',{name:'Radiergummi',exact:true})).toHaveAttribute('aria-pressed','true');
 await wordsGesture(page,1);await expect(page.locator('.saved-highlight')).toHaveText(['Heraus','eure']);await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
 await page.getByRole('button',{name:'Letzten Strich entfernen',exact:true}).click();await expect(page.locator('.saved-highlight')).toHaveText('Heraus in eure');
 await stroke(page,[{x:-38,y:y+7},{x:-38,y:y+20}]);await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
 await page.getByRole('button',{name:'Letzten Strich entfernen',exact:true}).click();await expect(page.locator('[data-ink-group] path')).toHaveCount(2);
 await stroke(page,[{x:-38,y:y+7},{x:-38,y:y+20}]);await wordsGesture(page,1);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await openNotebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('ohne Texterkennung');await page.getByText('Originalhandschrift',{exact:true}).click();await expect(page.locator('.saved-ink path')).toHaveCount(1);
});
test('erasing saved words and nearby ink survives draft reload and keeps the existing note',async({page})=>{
 await wordsGesture(page,0,2);await writeNear(page);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await page.getByRole('button',{name:'Radiergummi',exact:true}).click();await wordsGesture(page,1);await expect(page.locator('.saved-highlight')).toHaveText(['Heraus','eure']);
 await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await expect(page.locator('.saved-highlight')).toHaveText(['Heraus','eure']);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 await page.reload();await expect(page.locator('.saved-highlight')).toHaveText(['Heraus','eure']);await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await page.getByRole('button',{name:'Radiergummi',exact:true}).click();await wordsGesture(page,0,2);await expect(page.locator('.saved-highlight')).toHaveCount(0);await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await page.reload();await expect(page.locator('.saved-highlight')).toHaveCount(0);
 await openNotebook(page);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card')).toContainText('ohne Texterkennung');await page.getByText('Originalhandschrift',{exact:true}).click();await expect(page.locator('.saved-ink path')).toHaveCount(2);
});
test('cancelled erasing and finger scrolling keep words intact; a new color leaves eraser mode',async({page})=>{
 await wordsGesture(page,0,2);await page.getByRole('button',{name:'Radiergummi',exact:true}).click();await wordsGesture(page,1,1,'pointercancel');await wordsGesture(page,1,1,'pointerup','touch');await expect(page.locator('.saved-highlight')).toHaveText('Heraus in eure');await chooseColor(page,'Blau: Interpretationsansatz');await expect(page.getByRole('button',{name:'Radiergummi',exact:true})).toHaveAttribute('aria-pressed','false');await mark(page,5);await expect(page.locator('.saved-highlight')).toHaveCount(2);
 await page.setViewportSize({width:320,height:700});await expect.poll(async()=>{const r=await page.locator('.pencil-workspace').boundingBox();return !!r&&r.x>=0&&r.x+r.width<=320;}).toBe(true);await expect(page.getByRole('button',{name:'Radiergummi',exact:true})).toBeVisible();
});
test('legacy handwriting-pad drafts remain readable and save without recognition',async({page})=>{
 await mark(page);await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('buchtutor-pencil-draft:iphigenie:')))).toBe(true);
 const legacy=await page.evaluate(()=>{const key=Object.keys(localStorage).find(key=>key.startsWith('buchtutor-pencil-draft:iphigenie:'))!,draft=JSON.parse(localStorage.getItem(key)!);const entry=draft.entries[0];entry.pencil.ink=[[{x:20,y:20,pressure:.5},{x:40,y:40,pressure:.5}]];entry.pencil.transcription='pending';return {key,value:JSON.stringify([entry])};});
 // Seed before the next app mounts; mutating a running draft races its autosave.
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),legacy);await page.reload();await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();await page.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.locator('.pencil-workspace')).toHaveCount(0);await openNotebook(page);await expect(page.locator('.note-card')).toContainText('ohne Texterkennung');await page.getByText('Originalhandschrift',{exact:true}).click();await expect(page.locator('.saved-ink path')).toHaveCount(1);
});


test('inline details reflow handwriting with its verse, including a moving insertion point',async({page})=>{
 await page.setViewportSize({width:680,height:759});
 await mark(page,5);await writeNear(page,5);
 const ink=page.locator('[data-ink-group] path').first(),line=page.locator('[data-block]').nth(5);
 await expect(ink).toBeVisible();
 const offset=await ink.evaluate(el=>el.getBoundingClientRect().top-document.querySelectorAll('[data-block]')[5].getBoundingClientRect().top);
 const before=await line.boundingBox();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await expect.poll(()=>line.evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThan(before!.y+150);
 await expect.poll(()=>ink.evaluate(el=>el.getBoundingClientRect().top-document.querySelectorAll('[data-block]')[5].getBoundingClientRect().top)).toBeCloseTo(offset,0);
 // Change the insertion point while total document height stays the same.
 await page.locator('[data-block]').nth(8).locator('.line-number').dispatchEvent('click',{detail:0});
 await expect.poll(()=>ink.evaluate(el=>el.getBoundingClientRect().top-document.querySelectorAll('[data-block]')[5].getBoundingClientRect().top)).toBeCloseTo(offset,0);
 await page.getByRole('button',{name:'Lesehilfe schließen',exact:true}).click();
 await expect(page.locator('[data-ink-group] path')).toHaveCount(3);
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await expect(page.locator('.pencil-ink-label')).toHaveText('↳ V. 6');
 await expect.poll(()=>ink.evaluate(el=>el.getBoundingClientRect().top-document.querySelectorAll('[data-block]')[5].getBoundingClientRect().top)).toBeCloseTo(offset,0);
});
