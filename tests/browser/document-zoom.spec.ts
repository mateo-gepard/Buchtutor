import {test,expect,useLocalHandwriting,type Page} from './reader-test';

async function zoom(page:Page,value:number){
 const trigger=page.getByRole('button',{name:'Dokumentzoom',exact:true});
 if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.click();
 if(value===1)await page.getByRole('button',{name:'Auf 100 % zurücksetzen',exact:true}).click();
 else{
  const current=Number(await page.locator('.reading-page').getAttribute('data-document-scale'));
  for(let next=current;next<value;next+=.25)await page.getByRole('button',{name:'Dokument vergrößern',exact:true}).click();
 }
 await expect(page.locator('.reading-page')).toHaveAttribute('data-document-scale',String(value));
}
async function textLayout(page:Page){
 return page.locator('[data-text]').first().evaluate(el=>{
  const range=document.createRange();range.selectNodeContents(el);const box=el.getBoundingClientRect(),scale=Number(el.closest('[data-document-scale]')!.getAttribute('data-document-scale'));
  return {width:(el as HTMLElement).offsetWidth,height:(el as HTMLElement).offsetHeight,lines:Array.from(range.getClientRects(),r=>({x:Math.round((r.left-box.left)/scale),y:Math.round((r.top-box.top)/scale),width:Math.round(r.width/scale)}))};
 });
}
async function touch(page:Page,type:string,points:{x:number;y:number}[]){
 return page.locator('.document-zoom-stage').evaluate((element,{type,points})=>{
  const event=new Event(type,{bubbles:true,cancelable:true});
  const touches=points.map((point,index)=>({identifier:index,clientX:point.x,clientY:point.y,touchType:'direct'}));
  Object.defineProperty(event,'touches',{value:touches});Object.defineProperty(event,'changedTouches',{value:touches});
  element.dispatchEvent(event);return event.defaultPrevented;
 },{type,points});
}
test.beforeEach(async({page,context})=>{
 await useLocalHandwriting(context);
 await page.route('**/api/handwriting',()=>{throw new Error('Document zoom must not call paid handwriting recognition');});
 await page.route('**/api/analysis',()=>{throw new Error('Document zoom must not call AI');});
 await page.goto('/?work=iphigenie&section=s001&view=reader');
 await expect(page.locator('[data-text]').first()).toContainText('Heraus');
});

test('document and original ink magnify together without reflow or scaling reader tools',async({page})=>{
 await page.getByRole('button',{name:'Apple Pencil Modus',exact:true}).click();
 await page.locator('[data-text]').first().evaluate(el=>{
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),node=walker.nextNode()!,range=document.createRange();range.setStart(node,0);range.setEnd(node,6);const box=range.getBoundingClientRect(),y=box.top+box.height/2;
  for(const [type,x] of [['pointerdown',box.left+1],['pointermove',box.right-1],['pointerup',box.right-1]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:601,pointerType:'pen',clientX:x,clientY:y,pressure:.6}));
 });
 await expect(page.locator('.saved-highlight')).toHaveCount(1);
 await page.locator('.pencil-text').evaluate(el=>{
  const root=el.getBoundingClientRect(),line=el.querySelector('[data-block]')!.getBoundingClientRect(),x=root.left-16,y=line.top;
  for(const [type,dx,dy] of [['pointerdown',0,2],['pointermove',2,20],['pointerup',12,24]] as const)el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:602,pointerType:'pen',clientX:x+dx,clientY:y+dy,pressure:.6}));
 });
 await expect(page.locator('[data-ink-group] path')).toHaveCount(1);
 await page.getByRole('button',{name:'Fertig',exact:true}).click();
 await expect(page.locator('.pencil-workspace')).toHaveCount(0);
 const before=await textLayout(page),path=await page.locator('[data-ink-group] path').getAttribute('d');
 const tools=await page.locator('.reader-workspace').boundingBox(),header=await page.locator('.reader-header').boundingBox();
 const size=await page.locator('[data-text]').first().boundingBox();
 await zoom(page,2);
 expect(await textLayout(page)).toEqual(before);
 expect(await page.locator('[data-ink-group] path').getAttribute('d')).toBe(path);
 const larger=await page.locator('[data-text]').first().boundingBox(),afterTools=await page.locator('.reader-workspace').boundingBox();
 expect(larger!.width/size!.width).toBeCloseTo(2,1);
 expect(afterTools!.width).toBeCloseTo(tools!.width,0);expect(afterTools!.height).toBeCloseTo(tools!.height,0);
 expect(await page.locator('.reader-header').boundingBox()).toEqual(header);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await zoom(page,1);expect(await textLayout(page)).toEqual(before);
 await page.reload();await expect(page.locator('[data-ink-group] path')).toHaveAttribute('d',path!);
});

test('pinch preserves its focal point, pans the page and leaves ordinary scrolling alone',async({page})=>{
 const box=await page.locator('[data-text]').first().boundingBox(),stage=await page.locator('.document-zoom-stage').boundingBox(),x=stage!.x+stage!.width/2,y=box!.y+box!.height/2;
 const local=await page.locator('.reading-page').evaluate((element,{x,y})=>{const rect=element.getBoundingClientRect();return {x:x-rect.left,y:y-rect.top};},{x,y});
 expect(await touch(page,'touchstart',[{x:x-25,y},{x:x+25,y}])).toBe(true);
 expect(await touch(page,'touchmove',[{x:x-50,y},{x:x+50,y}])).toBe(true);
 await expect(page.locator('.reading-page')).toHaveAttribute('data-document-scale','2');
 const point=await page.locator('.reading-page').evaluate((element,local)=>{const rect=element.getBoundingClientRect();return {x:rect.left+local.x*2,y:rect.top+local.y*2};},local);
 expect(Math.abs(point.y-y)).toBeLessThanOrEqual(1);
 // The focal point is exact unless horizontal page edges constrain it.
 expect(Math.abs(point.x-x)).toBeLessThanOrEqual(2);
 const firstLeft=await page.locator('.reading-page').evaluate(el=>el.getBoundingClientRect().left);
 await touch(page,'touchmove',[{x:x-90,y:y-20},{x:x+10,y:y-20}]);
 const secondLeft=await page.locator('.reading-page').evaluate(el=>el.getBoundingClientRect().left);
 expect(secondLeft).toBeLessThan(firstLeft);
 await touch(page,'touchend',[]);
 expect(await touch(page,'touchstart',[{x,y}])).toBe(false);
 expect(await touch(page,'touchmove',[{x,y:y-35}])).toBe(false);
 await touch(page,'touchend',[]);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('magnified notes and audio controls stay outside the document and keep drafts through rotation',async({page})=>{
 await page.setViewportSize({width:680,height:759});
 await zoom(page,1.5);await page.getByRole('button',{name:'Dokumentzoom schließen',exact:true}).click();
 await page.getByRole('button',{name:'Notiz schreiben',exact:true}).click();
 await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).fill('Diese Notiz bleibt beim Dokumentzoom erhalten.');
 expect(await page.locator('.assistant-panel').evaluate(el=>!!el.closest('.reading-page'))).toBe(false);
 const beforeRotation=await textLayout(page);
 const fontsize=await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).evaluate(el=>getComputedStyle(el).fontSize);
 await page.setViewportSize({width:1194,height:834});
 await expect(page.locator('.reading-page')).toHaveAttribute('data-document-scale','1.5');
 expect(await textLayout(page)).toEqual(beforeRotation);
 await expect(page.getByRole('textbox',{name:'Deine Notiz',exact:true})).toHaveValue('Diese Notiz bleibt beim Dokumentzoom erhalten.');
 expect(await page.getByRole('textbox',{name:'Deine Notiz',exact:true}).evaluate(el=>getComputedStyle(el).fontSize)).toBe(fontsize);
 await page.getByRole('button',{name:'Hören und mitlesen',exact:true}).click();
 await page.getByRole('button',{name:'Hörbuch-Details öffnen',exact:true}).click();
 expect(await page.locator('.audio-details').evaluate(el=>!!el.closest('.reading-page'))).toBe(false);
});

test('browser zoom gestures outside the document and wheel scrolling are not intercepted',async({page})=>{
 const prevent=await page.locator('.reader-header').evaluate(el=>{const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:-50});el.dispatchEvent(event);return event.defaultPrevented;});
 expect(prevent).toBe(false);
 const scroll=await page.locator('[data-text]').first().evaluate(el=>{const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:100});el.dispatchEvent(event);return event.defaultPrevented;});
 expect(scroll).toBe(false);await expect(page.locator('.reading-page')).toHaveAttribute('data-document-scale','1');
 await page.locator('[data-text]').first().evaluate(el=>el.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:-50,clientX:el.getBoundingClientRect().left+40,clientY:el.getBoundingClientRect().top+12})));
 await expect.poll(()=>page.locator('.reading-page').evaluate(el=>Number(el.getAttribute('data-document-scale')))).toBeGreaterThan(1);
});
