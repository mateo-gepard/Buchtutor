'use client';
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type PointerEvent,type KeyboardEvent} from 'react';
import {nearestDock,palettePosition,placementAt,popoverPosition,validPlacement,PALETTE_POSITION_KEY,type Dock,type Placement,type Rect} from '@/lib/pencil-placement';
export function usePencilPlacement(enabled:boolean,closePanels:()=>void,practice=false){
 const element=useRef<HTMLElement>(null),placement=useRef<Placement>({dock:'floating',x:.5,y:.9}),restored=useRef(false);
 const drag=useRef<{id:number;clientX:number;clientY:number;bar:Rect;original:Placement;moved:boolean}|null>(null);
 const close=useRef(closePanels);useLayoutEffect(()=>{close.current=closePanels},[closePanels]);
 const [dock,setDock]=useState<Dock>('floating'),[preview,setPreview]=useState<Dock>('floating'),[dragging,setDragging]=useState(false),[compact,setCompact]=useState(false),[style,setStyle]=useState<CSSProperties>(),[announcement,setAnnouncement]=useState('');
 const viewport=useCallback(()=>{
  const v=window.visualViewport,css=element.current?getComputedStyle(element.current):null;
  const inset=(name:string)=>Math.max(12,parseFloat(css?.getPropertyValue(name)??'0')||0);
  const left=inset('--pencil-safe-left'),right=inset('--pencil-safe-right'),top=inset('--pencil-safe-top'),bottom=inset('--pencil-safe-bottom');
  return {x:(v?.offsetLeft??0)+left,y:(v?.offsetTop??0)+top,width:Math.max(1,(v?.width??document.documentElement.clientWidth)-left-right),height:Math.max(1,(v?.height??window.innerHeight)-top-bottom)};
 },[]);
 const layout=useCallback(()=>{
  const el=element.current;if(!el)return;
  const v=viewport(),r=el.getBoundingClientRect();setCompact(v.height<620);el.style.setProperty('--pencil-available-height',v.height+'px');
  const bar=palettePosition(placement.current,{width:r.width,height:r.height},v);
  el.style.left=bar.x+'px';el.style.top=bar.y+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';
  setStyle({left:bar.x,top:bar.y,right:'auto',bottom:'auto',transform:'none'});
  el.style.setProperty('--pencil-panel-max-height',Math.max(80,v.height-20)+'px');
  for(const panel of el.querySelectorAll<HTMLElement>('.pencil-popover,.pencil-error')){
   const rect=panel.getBoundingClientRect(),position=popoverPosition(bar,{width:rect.width,height:rect.height},v,placement.current.dock);
   panel.style.left=(position.x-bar.x)+'px';panel.style.top=(position.y-bar.y)+'px';panel.style.right='auto';panel.style.bottom='auto';panel.style.transform='none';panel.dataset.positioned='true';
  }
 },[viewport]);
 function remember(p:Placement){placement.current=p;setDock(p.dock);try{if(!practice)localStorage.setItem(PALETTE_POSITION_KEY,JSON.stringify(p));}catch{/* Placement is optional; drawing and saving remain available. */}}
 useLayoutEffect(()=>{
  if(!enabled)return;
  const frame=requestAnimationFrame(()=>{
   if(!restored.current){try{const p=practice?null:JSON.parse(localStorage.getItem(PALETTE_POSITION_KEY)??'null');if(validPlacement(p))placement.current=p;}catch{/* Ignore invalid positioning data. */}restored.current=true;setDock(placement.current.dock);}
   layout();
  });return()=>cancelAnimationFrame(frame);
 },[enabled,layout,practice]);
 useEffect(()=>{
  if(!enabled)return;let frame=0;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!drag.current)layout();});};
  const observer=new ResizeObserver(schedule);if(element.current)observer.observe(element.current);
  const mutation=new MutationObserver(()=>{if(element.current)for(const p of element.current.querySelectorAll('.pencil-popover,.pencil-error'))observer.observe(p);schedule();});
  if(element.current)mutation.observe(element.current,{childList:true,subtree:true});
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  schedule();return()=>{cancelAnimationFrame(frame);observer.disconnect();mutation.disconnect();window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);drag.current=null;};
 },[enabled,layout,practice]);
 useLayoutEffect(()=>{if(enabled){const frame=requestAnimationFrame(layout);return()=>cancelAnimationFrame(frame);}},[dock,enabled,layout]);
 function start(e:PointerEvent<HTMLButtonElement>){
  if(e.button!==0||drag.current||!element.current)return;e.preventDefault();e.stopPropagation();
  const r=element.current.getBoundingClientRect();drag.current={id:e.pointerId,clientX:e.clientX,clientY:e.clientY,bar:{x:r.x,y:r.y,width:r.width,height:r.height},original:{...placement.current},moved:false};
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Fallback keeps in-bounds pointer events usable. */}
  close.current();setDragging(true);
 }
 function move(e:PointerEvent<HTMLButtonElement>){
  const g=drag.current;if(!g||g.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();
  const dx=e.clientX-g.clientX,dy=e.clientY-g.clientY;if(Math.hypot(dx,dy)>3)g.moved=true;
  const v=viewport(),p=placementAt({...g.bar,x:g.bar.x+dx,y:g.bar.y+dy},v),bar=palettePosition(p,g.bar,v);
  placement.current=p;const el=element.current;if(el){el.style.left=bar.x+'px';el.style.top=bar.y+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';}setPreview(nearestDock(bar,v));
 }
 function end(e:PointerEvent<HTMLButtonElement>){
  const g=drag.current;if(!g||g.id!==e.pointerId)return;
  drag.current=null;setDragging(false);setPreview('floating');
  if(e.type==='pointercancel'||!g.moved){remember(g.original);requestAnimationFrame(layout);return;}
  const v=viewport(),bar=palettePosition(placement.current,{width:g.bar.width,height:g.bar.height},v),next=placementAt(bar,v,nearestDock(bar,v));
  remember(next);setAnnouncement(next.dock==='floating'?'Pencil-Leiste frei positioniert.':'Pencil-Leiste am Bildschirmrand angedockt.');requestAnimationFrame(layout);
 }
 function dockAt(edge:Dock){close.current();remember({...placement.current,dock:edge});requestAnimationFrame(layout);}
 function keyboard(e:KeyboardEvent<HTMLButtonElement>){
  const edges:Record<string,Dock>={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'top',ArrowDown:'bottom'};
  if(e.key==='Escape'&&drag.current){e.preventDefault();remember(drag.current.original);drag.current=null;setDragging(false);setPreview('floating');requestAnimationFrame(layout);return;}
  if(e.key==='Home'){e.preventDefault();remember({dock:'floating',x:.5,y:.9});requestAnimationFrame(layout);return;}
  if(!edges[e.key])return;e.preventDefault();if(e.shiftKey){dockAt(edges[e.key]);return;}
  const r=element.current?.getBoundingClientRect();if(!r)return;
  remember(placementAt({x:r.x+(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0),y:r.y+(e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0),width:r.width,height:r.height},viewport()));requestAnimationFrame(layout);
 }
 return {element,dock,preview,dragging,compact,style,announcement,dockAt,grip:{onPointerDown:start,onPointerMove:move,onPointerUp:end,onPointerCancel:end,onLostPointerCapture:end,onKeyDown:keyboard}};
}
