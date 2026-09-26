import {test,expect,type Page} from '@playwright/test';
import type {Anchor} from '../../lib/reader-model';

type ReadingState={selection:Anchor|null;blocks:{id:string;text:string;number:number}[];sectionId:string};
type TestWindow=Window&{readerTools:Record<string,{execute:(input:object)=>Promise<ReadingState>}>};
const state=(page:Page)=>page.evaluate(()=>(window as unknown as TestWindow).readerTools.get_reading_state.execute({}));
const text=(page:Page,index:number)=>page.locator('[data-text]').nth(index);
const verse=(page:Page,n:number)=>page.getByRole('button',{name:`Vers ${n} auswählen`,exact:true});

/** Browser-owned ranges let us exercise Safari boundary nodes and late handle events deterministically.
 * Real OS long-press handles still require an iPad hardware check. */
async function select(page:Page,from:number,start:number,to:number,end:number,options:{reverse?:boolean;elementEnd?:boolean;release?:boolean}={}){
  return page.evaluate(({from,start,to,end,options})=>{
    const elements=[...document.querySelectorAll<HTMLElement>('[data-text]')];
    function point(element:HTMLElement,offset:number):[Node,number]{
      const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node:Node|null,remaining=offset;
      while((node=walker.nextNode())){if(remaining<=(node.textContent?.length??0))return [node,remaining];remaining-=node.textContent?.length??0;}
      return [element,element.childNodes.length];
    }
    const a=point(elements[from],start),b=options.elementEnd?[elements[to],0] as [Node,number]:point(elements[to],end);
    elements[from].dispatchEvent(new Event('selectstart',{bubbles:true}));
    const selection=window.getSelection()!;
    selection.setBaseAndExtent(...(options.reverse?b:a),...(options.reverse?a:b));
    document.dispatchEvent(new Event('selectionchange'));
    if(options.release!==false)elements[to].dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'touch'}));
  },{from,start,to,end,options});
}

test.beforeEach(async({page})=>{
  // Use the app's existing public reading-state interface, without exposing any new test API.
  await page.addInitScript(()=>{
    const tools:TestWindow['readerTools']={};(window as unknown as TestWindow).readerTools=tools;
    Object.defineProperty(document,'modelContext',{configurable:true,value:{
      registerTool:(tool:{name:string;execute:(input:object)=>Promise<ReadingState>})=>{tools[tool.name]=tool;},
      unregisterTool:(name:string)=>{delete tools[name];},
    }});
  });
  // Selection checks must never spend the operator's AI credit.
  await page.route('**/api/analysis',route=>route.fulfill({status:503,json:{error:'Selection test: no model request.'}}));
  await page.goto('/?work=iphigenie&section=s001&view=reader');
  await page.waitForFunction(()=>!!(window as unknown as TestWindow).readerTools.get_reading_state);
  await expect(text(page,0)).toContainText('Heraus');
});

test('forward/backward boundaries exclude an untouched adjacent verse and copy only source text',async({page})=>{
  const initial=await state(page),expected=initial.blocks[0].text.slice(7)+'\n'+initial.blocks[1].text;
  await select(page,0,7,2,0,{elementEnd:true,reverse:true});
  await expect.poll(async()=>(await state(page)).selection?.quote).toBe(expected);
  const anchor=(await state(page)).selection!;
  expect(anchor.startOffset).toBe(7);expect(anchor.endId).toBe(initial.blocks[1].id);
  const copied=await page.evaluate(()=>{
    const data=new DataTransfer(),event=new ClipboardEvent('copy',{bubbles:true,cancelable:true,clipboardData:data});
    document.dispatchEvent(event);return {text:data.getData('text/plain'),handled:event.defaultPrevented};
  });
  expect(copied).toEqual({text:expected,handled:true});
  await select(page,0,initial.blocks[0].text.length,2,5);
  await expect.poll(async()=>(await state(page)).selection?.startId).toBe(initial.blocks[1].id);
  expect((await state(page)).selection?.quote).toBe(initial.blocks[1].text+'\n'+initial.blocks[2].text.slice(0,5));
});

test('a fast tool tap freezes the latest handles before focus, then survives editing and reload',async({page})=>{
  const initial=await state(page);
  await select(page,0,0,0,6);
  await expect(page.getByRole('button',{name:'Notiz',exact:true})).toBeVisible();
  // Deliberately click before the 160 ms selection debounce can settle.
  await page.evaluate(()=>{
    const element=document.querySelector('[data-text]')!;
    const node=document.createTreeWalker(element,NodeFilter.SHOW_TEXT).nextNode()!;
    window.getSelection()!.setBaseAndExtent(node,7,node,16);
    document.dispatchEvent(new Event('selectionchange'));
    const button=[...document.querySelectorAll<HTMLButtonElement>('.selection-dock button')].find(b=>b.textContent==='Notiz')!;
    button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));
    window.getSelection()!.removeAllRanges();button.click();
  });
  const expected=initial.blocks[0].text.slice(7,16);
  await expect(page.locator('.panel-notes .selection-excerpt blockquote')).toHaveText(expected);
  await page.getByRole('textbox',{name:'Deine Notiz'}).fill('Test: exakte Auswahl bleibt erhalten.');
  await page.getByRole('button',{name:'Notiz speichern',exact:true}).click();
  await expect(page.getByRole('button',{name:/1 gespeicherte Einträge/})).toBeVisible();
  await page.getByRole('button',{name:'Lesehilfe schließen'}).click();
  expect((await state(page)).selection?.quote).toBe(expected);
  // A save notice must not cover the controls while it remains visible.
  await page.getByRole('button',{name:'Auswahl aufheben'}).click({timeout:2000});
  expect((await state(page)).selection).toBeNull();
  await page.reload();await page.waitForFunction(()=>!!(window as unknown as TestWindow).readerTools.get_reading_state);
  await page.getByRole('button',{name:/1 gespeicherte Einträge/}).click();
  await expect(page.locator('.panel-notes .selection-excerpt blockquote')).toHaveText(expected);
  await page.getByRole('button',{name:'Lesehilfe schließen'}).click();
  await select(page,0,3,1,12);
  await expect.poll(async()=>(await state(page)).selection?.quote).toBe(initial.blocks[0].text.slice(3)+'\n'+initial.blocks[1].text.slice(0,12));
});

test('analysis reads the current selection, not an earlier debounced range',async({page})=>{
  await verse(page,1).click();
  const received=page.waitForRequest(r=>r.url().endsWith('/api/analysis')&&r.method()==='POST');
  await page.evaluate(()=>{
    const element=document.querySelectorAll('[data-text]')[1];
    element.dispatchEvent(new Event('selectstart',{bubbles:true}));
    const range=document.createRange();range.selectNodeContents(element);
    window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    const button=[...document.querySelectorAll<HTMLButtonElement>('.selection-dock button')].find(b=>b.textContent==='Verstehen')!;button.click();
  });
  const body=(await received).postDataJSON();
  expect(body.anchor.quote).toBe((await state(page)).blocks[1].text);
  expect(body.anchor.startId).toBe((await state(page)).blocks[1].id);
  await expect(page.locator('.inline-error')).toContainText('Selection test');
});

test('two-tap range starts fresh, works backwards, and treats figure names as text',async({page},testInfo)=>{
  const tap=async(locator:ReturnType<Page['locator']>)=>testInfo.project.use.hasTouch?locator.tap():locator.click();
  await tap(verse(page,1));
  await tap(page.getByRole('button',{name:'Bereich durch Antippen auswählen'}));
  expect((await state(page)).selection).toBeNull();
  await tap(verse(page,6));await tap(verse(page,2));
  await expect.poll(async()=>(await state(page)).selection?.quote).toBe((await state(page)).blocks.slice(1,6).map(b=>b.text).join('\n'));
  await expect(page.getByRole('button',{name:'Bereich durch Antippen auswählen'})).toHaveAttribute('aria-pressed','false');
  await tap(page.getByRole('button',{name:'Bereich durch Antippen auswählen'}));
  const mention=page.locator('[data-text] .character-mention').first();await mention.scrollIntoViewIfNeeded();
  const selectedBlock=await mention.evaluate(el=>el.closest('[data-block]')!.getAttribute('data-block'));
  await tap(mention);
  await expect.poll(async()=>(await state(page)).selection?.startId).toBe(selectedBlock);
  await expect(page.locator('.assistant-panel')).toHaveCount(0);
  await tap(page.getByRole('button',{name:'Abbrechen',exact:true}));
});

test('selection handles and cancelled scroll gestures do not activate inline figures',async({page})=>{
  const mention=page.locator('[data-text] .character-mention').first();await mention.scrollIntoViewIfNeeded();
  expect(await mention.evaluate(el=>el.tagName)).toBe('SPAN');
  await mention.evaluate(el=>{
    el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:5,pointerType:'touch',clientX:50,clientY:50}));
    el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:5,pointerType:'touch',clientX:50,clientY:90}));
    el.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:5,pointerType:'touch'}));
    el.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));
  });
  await expect(page.locator('.assistant-panel')).toHaveCount(0);
  await mention.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.assistant-panel')).toBeVisible();
  await expect(page.getByRole('button',{name:'Figuren',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('collapsed/outside selections and a rotated viewport preserve the passage; clearing cancels pending events',async({page})=>{
  await select(page,0,3,1,12);
  await expect.poll(async()=>(await state(page)).selection?.startOffset).toBe(3);
  const anchor=(await state(page)).selection;
  await page.evaluate(()=>window.getSelection()!.removeAllRanges());
  const viewport=page.viewportSize()!;await page.setViewportSize({width:viewport.height,height:viewport.width});
  await page.getByRole('button',{name:'Weitere Analysearten'}).click();
  await page.locator('.selection-excerpt blockquote').evaluate(el=>{
    const range=document.createRange();range.selectNodeContents(el);window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  expect((await state(page)).selection).toEqual(anchor);
  await page.getByRole('button',{name:'Lesehilfe schließen'}).click();
  await page.getByRole('button',{name:'Auswahl aufheben'}).click();
  await page.evaluate(()=>document.dispatchEvent(new Event('selectionchange')));
  await expect(page.locator('.selection-dock')).toHaveCount(0);
  expect((await state(page)).selection).toBeNull();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('focus mode retains selection actions and leaves native context menus enabled',async({page})=>{
  await page.getByRole('button',{name:'Fokus aktivieren'}).click();
  await select(page,0,0,0,16);
  await expect(page.getByRole('button',{name:'Notiz',exact:true})).toBeVisible();
  const allowed=await text(page,0).evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})));
  expect(allowed).toBe(true);
  await page.getByRole('button',{name:'Notiz',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Deine Notiz'})).toBeVisible();
});

test('native handle updates after pointer cancellation can cross inline figures without losing offsets',async({page})=>{
  const initial=await state(page),mention=page.locator('[data-text] .character-mention').first();
  const target=await mention.evaluate(el=>({id:el.closest('[data-block]')!.getAttribute('data-block'),offset:el.parentElement!.textContent!.indexOf(el.textContent!)}));
  const index=initial.blocks.findIndex(b=>b.id===target.id);
  await mention.dispatchEvent('pointerdown',{pointerId:9,pointerType:'touch'});
  await mention.dispatchEvent('pointercancel',{pointerId:9,pointerType:'touch'});
  await select(page,index,target.offset+1,index+1,9,{release:false});
  const expected=initial.blocks[index].text.slice(target.offset+1)+'\n'+initial.blocks[index+1].text.slice(0,9);
  await expect.poll(async()=>(await state(page)).selection?.quote).toBe(expected);
  await expect(page.locator('.assistant-panel')).toHaveCount(0);
  const nativeBefore=await page.evaluate(()=>window.getSelection()!.toString());
  await page.evaluate(()=>window.scrollBy(0,100));
  expect(await page.evaluate(()=>window.getSelection()!.toString())).toBe(nativeBefore);
  expect((await state(page)).selection?.startOffset).toBe(target.offset+1);
});

test('a range reaching outside the page is clipped to the text; navigation cancels pending updates',async({page})=>{
  const initial=await state(page),last=initial.blocks.at(-1)!;
  await page.evaluate(()=>{
    const elements=document.querySelectorAll('[data-text]'),last=elements[elements.length-1];
    const node=document.createTreeWalker(last,NodeFilter.SHOW_TEXT).nextNode()!;
    last.dispatchEvent(new Event('selectstart',{bubbles:true}));
    const range=document.createRange();range.setStart(node,4);range.setEndAfter(document.querySelector('.reading-footer')!);
    window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await expect.poll(async()=>(await state(page)).selection?.quote).toBe(last.text.slice(4));
  await select(page,0,0,0,10,{release:false});
  await page.locator('.section-pagination').getByRole('button',{name:'Nächster Abschnitt',exact:true}).click();
  await expect.poll(async()=>(await state(page)).sectionId).toBe('s002');
  await expect(page.locator('.selection-dock')).toHaveCount(0);
  expect((await state(page)).selection).toBeNull();
});

test('desktop mouse dragging and repeated Shift-click keep a fixed origin',async({page},testInfo)=>{
  test.skip(!!testInfo.project.use.hasTouch,'Mouse-specific path; touch ranges are covered separately.');
  const first=await text(page,0).boundingBox();expect(first).not.toBeNull();
  await page.mouse.move(first!.x+1,first!.y+first!.height/2);await page.mouse.down();
  await page.mouse.move(first!.x+150,first!.y+first!.height/2,{steps:10});await page.mouse.up();
  await expect.poll(async()=>(await state(page)).selection?.quote.length??0).toBeGreaterThan(5);
  await verse(page,6).click();await verse(page,2).click({modifiers:['Shift']});await verse(page,8).click({modifiers:['Shift']});
  const current=await state(page);expect(current.selection?.startId).toBe(current.blocks[5].id);expect(current.selection?.endId).toBe(current.blocks[7].id);
});
