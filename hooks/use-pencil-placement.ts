'use client';
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {nearestDock,palettePosition,placementAt,popoverPosition,validPlacement,PALETTE_POSITION_KEY,type Dock,type Placement,type Rect} from '@/lib/pencil-placement';
function gestureDock(bar:Rect,viewport:Rect,dx:number,dy:number):Dock{
 // A phone-width strip touches both sides even during a purely vertical move.
 // Follow the drag direction instead of unexpectedly turning it into a side rail.
 if(bar.width>viewport.width-64){
  if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>3)return dx<0?'left':'right';
  if(Math.abs(bar.y-viewport.y)<=30)return 'top';
  if(Math.abs(bar.y+bar.height-viewport.y-viewport.height)<=30)return 'bottom';
  return 'floating';
 }
 return nearestDock(bar,viewport);
}
export function usePencilPlacement(enabled:boolean,closePanels:()=>void,practice=false,defaultDock:Dock='floating',label='Pencil-Leiste'){
 const element=useRef<HTMLElement>(null),placement=useRef<Placement>({dock:defaultDock,x:.5,y:.9}),restored=useRef(false);
 const motion=useRef<Animation|null>(null),settle=useRef(false),expandedHeight=useRef(0);
 const drag=useRef<{id:number;clientX:number;clientY:number;bar:Rect;original:Placement;moved:boolean}|null>(null);
 const close=useRef(closePanels);useLayoutEffect(()=>{close.current=closePanels},[closePanels]);
 const [dock,setDock]=useState<Dock>(defaultDock),[preview,setPreview]=useState<Dock>('floating'),[dragging,setDragging]=useState(false),[compact,setCompact]=useState(false),[announcement,setAnnouncement]=useState('');
 const viewport=useCallback(()=>{
  const v=window.visualViewport,css=element.current?getComputedStyle(element.current):null;
  const inset=(name:string)=>Math.max(12,parseFloat(css?.getPropertyValue(name)??'0')||0);
  const left=inset('--pencil-safe-left'),right=inset('--pencil-safe-right');
  let top=inset('--pencil-safe-top'),bottom=inset('--pencil-safe-bottom');
  if(element.current?.classList.contains('reader-workspace')){
   const header=document.querySelector('.reader-header,.library-header')?.getBoundingClientRect(),footer=document.querySelector('.reading-footer')?.getBoundingClientRect();
   if(header?.height)top=Math.max(top,header.bottom-(v?.offsetTop??0)+10);
   const viewportBottom=(v?.offsetTop??0)+(v?.height??window.innerHeight);
   if(footer?.height&&footer.top<viewportBottom)bottom=Math.max(bottom,viewportBottom-footer.top+10);
  }
  return {x:(v?.offsetLeft??0)+left,y:(v?.offsetTop??0)+top,width:Math.max(1,(v?.width??document.documentElement.clientWidth)-left-right),height:Math.max(1,(v?.height??window.innerHeight)-top-bottom)};
 },[]);
 const layout=useCallback(()=>{
  const el=element.current;if(!el)return;
  el.dataset.ready='true';
  const v=viewport(),r=el.getBoundingClientRect();
  // Mobile viewport rounding can cross a breakpoint as the rail changes shape.
  // Leave room on either side so orientation changes cannot toggle it in a loop.
  const side=placement.current.dock==='left'||placement.current.dock==='right';
  if(side&&el.dataset.compact!=='true')expandedHeight.current=r.height;
  setCompact(current=>v.height<(current?700:660)||side&&(current?v.height<expandedHeight.current+24:r.height>v.height));el.style.setProperty('--pencil-available-height',v.height+'px');
  const bar=palettePosition(placement.current,{width:r.width,height:r.height},v);
  el.style.setProperty('--workspace-sidebar-space',bar.width+10+'px');
  el.style.left=bar.x+'px';el.style.top=bar.y+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';
  el.style.setProperty('--pencil-panel-max-height',Math.max(80,v.height-20)+'px');
  for(const panel of el.querySelectorAll<HTMLElement>('.workspace-popover,.pencil-popover,.pencil-error')){
   if(panel.hidden)continue;
   const rect={width:panel.offsetWidth,height:panel.offsetHeight},position=popoverPosition(bar,rect,v,placement.current.dock);
   if(panel.matches('.pencil-popover')&&!['left','right'].includes(placement.current.dock)){
    const trigger=el.querySelector(panel.matches('.pencil-handwriting-hint')?'.pencil-writing-toggle':'.pencil-color-menu')?.getBoundingClientRect();
    if(trigger)position.x=Math.max(v.x,Math.min(v.x+v.width-rect.width,trigger.x+trigger.width/2-rect.width/2));
   }
   // On a wide reader the common detail area sits beside the text, clear of the tools.
   if(panel.matches('.assistant-panel,.audio-details')){
    if(document.documentElement.clientWidth>=760){
     position.x=placement.current.dock==='left'?bar.x+bar.width+10:v.x+v.width-rect.width-(placement.current.dock==='right'?bar.width+10:0);
     position.x=Math.max(v.x,Math.min(v.x+v.width-rect.width,position.x));
    }else{
     // In a narrow or split-screen reader, keep the upper text visible above a short sheet.
     position.x=v.x+(v.width-rect.width)/2;
     position.y=v.y+v.height-rect.height;
     if(placement.current.dock==='left')position.x=bar.x+bar.width+10;
     if(placement.current.dock==='right')position.x=bar.x-rect.width-10;
     if(placement.current.dock==='bottom')position.y=Math.max(v.y,bar.y-rect.height-10);
    }
   }
   const parent=panel.offsetParent?.getBoundingClientRect()??bar;panel.style.left=(position.x-parent.x)+'px';panel.style.top=(position.y-parent.y)+'px';panel.style.right='auto';panel.style.bottom='auto';panel.style.transform='none';panel.dataset.positioned='true';
  }
  if(settle.current){
   settle.current=false;motion.current?.cancel();
   if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&(Math.abs(r.x-bar.x)>1||Math.abs(r.y-bar.y)>1)){
    motion.current=el.animate([{translate:`${r.x-bar.x}px ${r.y-bar.y}px`},{translate:'0 0'}],{duration:200,easing:'cubic-bezier(.2,.8,.2,1)'});
   }
  }
 },[viewport]);
 function remember(p:Placement){placement.current=p;setDock(p.dock);try{if(!practice)localStorage.setItem(PALETTE_POSITION_KEY,JSON.stringify(p));}catch{/* Placement is optional; drawing and saving remain available. */}}
 useLayoutEffect(()=>{
  if(!enabled)return;
  if(!restored.current){try{const p=practice?null:JSON.parse(localStorage.getItem(PALETTE_POSITION_KEY)??'null');if(validPlacement(p))placement.current=p;}catch{/* Ignore invalid positioning data. */}restored.current=true;setDock(placement.current.dock);}
  layout();
 },[enabled,layout,practice]);
 useEffect(()=>{
  if(!enabled)return;let frame=0;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!drag.current)layout();});};
  const observer=new ResizeObserver(schedule);if(element.current)observer.observe(element.current);
  const mutation=new MutationObserver(()=>{if(element.current)for(const p of element.current.querySelectorAll('.workspace-popover,.pencil-popover,.pencil-error'))observer.observe(p);if(!drag.current)layout();});
  if(element.current)mutation.observe(element.current,{childList:true,subtree:true});
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  schedule();return()=>{cancelAnimationFrame(frame);observer.disconnect();mutation.disconnect();motion.current?.cancel();window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);drag.current=null;};
 },[enabled,layout,practice]);
 // Place a newly opened accessory before paint, including changes made through portals.
 useLayoutEffect(()=>{if(enabled&&!drag.current)layout();});
 function start(e:PointerEvent<HTMLButtonElement>){
  if(e.button!==0||drag.current||!element.current)return;e.preventDefault();e.stopPropagation();
  motion.current?.cancel();
  const r=element.current.getBoundingClientRect();drag.current={id:e.pointerId,clientX:e.clientX,clientY:e.clientY,bar:{x:r.x,y:r.y,width:r.width,height:r.height},original:{...placement.current},moved:false};
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Fallback keeps in-bounds pointer events usable. */}
 }
 function move(e:PointerEvent<HTMLButtonElement>){
  const g=drag.current;if(!g||g.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();
  const dx=e.clientX-g.clientX,dy=e.clientY-g.clientY;
  if(!g.moved){if(Math.hypot(dx,dy)<6)return;g.moved=true;close.current();setDragging(true);}
  const v=viewport(),p=placementAt({...g.bar,x:g.bar.x+dx,y:g.bar.y+dy},v),bar=palettePosition(p,g.bar,v);
  placement.current=p;const el=element.current;if(el){el.style.left=bar.x+'px';el.style.top=bar.y+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';}setPreview(gestureDock(bar,v,dx,dy));
 }
 function end(e:PointerEvent<HTMLButtonElement>){
  const g=drag.current;if(!g||g.id!==e.pointerId)return;
  drag.current=null;setDragging(false);setPreview('floating');
  if(e.type==='pointercancel'||!g.moved){remember(g.original);requestAnimationFrame(layout);return;}
  const v=viewport(),bar=palettePosition(placement.current,{width:g.bar.width,height:g.bar.height},v),next=placementAt(bar,v,gestureDock(bar,v,e.clientX-g.clientX,e.clientY-g.clientY));
  settle.current=true;remember(next);setAnnouncement(next.dock==='floating'?`${label} frei positioniert.`:`${label} am Bildschirmrand angedockt.`);requestAnimationFrame(layout);
 }
 function dockAt(edge:Dock){close.current();settle.current=true;remember({...placement.current,dock:edge});requestAnimationFrame(layout);}
 function keyboard(e:KeyboardEvent<HTMLButtonElement>){
  const edges:Record<string,Dock>={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'top',ArrowDown:'bottom'};
  if(e.key==='Escape'&&drag.current){e.preventDefault();remember(drag.current.original);drag.current=null;setDragging(false);setPreview('floating');requestAnimationFrame(layout);return;}
  if(e.key==='Home'){e.preventDefault();close.current();settle.current=true;remember({dock:defaultDock,x:.5,y:.9});requestAnimationFrame(layout);return;}
  if(!edges[e.key])return;e.preventDefault();if(e.shiftKey){dockAt(edges[e.key]);return;}
  const r=element.current?.getBoundingClientRect();if(!r)return;
  remember(placementAt({x:r.x+(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0),y:r.y+(e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0),width:r.width,height:r.height},viewport()));requestAnimationFrame(layout);
 }
 return {element,dock,preview,dragging,compact,announcement,dockAt,grip:{onPointerDown:start,onPointerMove:move,onPointerUp:end,onPointerCancel:end,onLostPointerCapture:end,onKeyDown:keyboard}};
}
