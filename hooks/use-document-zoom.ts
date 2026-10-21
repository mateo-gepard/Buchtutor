'use client';
import {useCallback,useLayoutEffect,useRef,useState,type RefObject} from 'react';

const minimum=1,maximum=3;
const clamp=(value:number,low:number,high:number)=>Math.min(high,Math.max(low,value));
type Point={x:number;y:number};
type Baseline={width:number;paddingLeft:string;paddingRight:string};
type Pinch={distance:number;scale:number;point:Point;local:Point};
type Pan={x:number;y:number;pan:number;horizontal:boolean};
type Options={articleRef:RefObject<HTMLElement|null>;enabled:boolean;gesturesEnabled:boolean;contextKey:string};

/** Magnify one stable document layout; browser chrome and reader tools stay in screen units. */
export function useDocumentZoom({articleRef,enabled,gesturesEnabled,contextKey}:Options){
 const stageRef=useRef<HTMLDivElement>(null),baseline=useRef<Baseline|null>(null);
 const current=useRef({scale:1,pan:0}),[scale,setScale]=useState(1);
 const pinch=useRef<Pinch|null>(null),pan=useRef<Pan|null>(null),ignoreTouch=useRef(false);
 const suppressClick=useRef(false),clickTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

 const captureBaseline=useCallback(()=>{
  const page=articleRef.current;if(!page)return;
  const css=getComputedStyle(page);
  baseline.current={width:page.offsetWidth,paddingLeft:css.paddingLeft,paddingRight:css.paddingRight};
 },[articleRef]);
 const render=useCallback(()=>{
  const page=articleRef.current,container=stageRef.current;if(!page||!container)return;
  const value=current.current,base=baseline.current;
  page.dataset.documentScale=String(value.scale);
  container.dataset.zoomed=String(value.scale>1);
  if(value.scale===1||!base){
   for(const property of ['width','max-width','padding-left','padding-right','margin-left','margin-right','transform','transform-origin'])page.style.removeProperty(property);
   container.style.removeProperty('height');
  }else{
   const width=container.clientWidth,limit=Math.max(0,(base.width*value.scale-width)/2);
   value.pan=clamp(value.pan,-limit,limit);
   Object.assign(page.style,{width:base.width+'px',maxWidth:'none',paddingLeft:base.paddingLeft,paddingRight:base.paddingRight,marginLeft:(width-base.width)/2+'px',marginRight:'0px',transformOrigin:'top center',transform:`translateX(${value.pan}px) scale(${value.scale})`});
   container.style.height=page.offsetHeight*value.scale+'px';
  }
  page.dispatchEvent(new CustomEvent('buchtutor-document-layout',{bubbles:true}));
 },[articleRef]);
 const apply=useCallback((next:number,focal?:Point,local?:Point,nextPan?:number)=>{
  const page=articleRef.current,container=stageRef.current;if(!page||!container)return;
  const previous=current.current,nextScale=clamp(next,minimum,maximum);
  if(previous.scale===1&&nextScale>1)captureBaseline();
  const box=page.getBoundingClientRect(),viewport=container.getBoundingClientRect();
  const point=focal??{x:viewport.left+viewport.width/2,y:clamp(window.innerHeight/2,Math.max(0,box.top),Math.max(0,Math.min(window.innerHeight,box.bottom)))};
  const anchor=local??{x:(point.x-box.left)/previous.scale,y:(point.y-box.top)/previous.scale};
  const width=baseline.current?.width??page.offsetWidth;
  const offset=nextPan??point.x-viewport.left-(viewport.width-width*nextScale)/2-anchor.x*nextScale;
  if(previous.scale===nextScale&&previous.pan===offset&&Math.abs(box.top+anchor.y*nextScale-point.y)<.01)return;
  // The Pencil boundary completes an active stroke before its coordinate system moves.
  page.dispatchEvent(new CustomEvent('buchtutor-document-transform',{bubbles:true}));
  current.current={scale:nextScale,pan:nextScale===1?0:offset};render();
  const nextBox=page.getBoundingClientRect();
  window.scrollBy({top:nextBox.top+anchor.y*nextScale-point.y,behavior:'instant'});
  setScale(nextScale);
 },[articleRef,captureBaseline,render]);
 const change=useCallback((value:number)=>apply(value),[apply]);

 useLayoutEffect(()=>{
  if(!enabled)return;
  let frame=0,lastWidth=window.innerWidth;
  const page=articleRef.current,container=stageRef.current;if(!page||!container)return;
  current.current={scale:1,pan:0};baseline.current=null;render();
  const resetFrame=requestAnimationFrame(()=>setScale(1));
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(render);});
  observer.observe(page);observer.observe(container);
  function resized(){
   if(window.innerWidth===lastWidth)return;lastWidth=window.innerWidth;
   page!.dispatchEvent(new CustomEvent('buchtutor-document-transform',{bubbles:true}));
   // While magnified, rotation changes the viewport, not the document's
   // typography. Returning to100% makes responsive reading available again.
   if(current.current.scale===1){baseline.current=null;render();captureBaseline();}else render();
  }
  window.addEventListener('resize',resized);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);cancelAnimationFrame(resetFrame);window.removeEventListener('resize',resized);pinch.current=null;pan.current=null;};
 },[articleRef,enabled,contextKey,captureBaseline,render]);
 // Portals or a native Scribble field can change document height after React renders.
 useLayoutEffect(()=>{if(enabled)render();});

 useLayoutEffect(()=>{
  const element=stageRef.current;if(!enabled||!gesturesEnabled||!element)return;
  const excluded=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('[data-pencil-input],input,textarea,select,button,a,[contenteditable="true"]');
  const fingers=(event:TouchEvent)=>Array.from(event.touches).filter(touch=>(touch as Touch&{touchType?:string}).touchType!=='stylus');
  const center=(a:Touch,b:Touch)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
  const distance=(a:Touch,b:Touch)=>Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY));
  function suppress(){suppressClick.current=true;if(clickTimer.current)clearTimeout(clickTimer.current);clickTimer.current=setTimeout(()=>{suppressClick.current=false;},400);}
  function start(event:TouchEvent){
   const touches=fingers(event);
   if(touches.length===1){ignoreTouch.current=excluded(event.target);pan.current={x:touches[0].clientX,y:touches[0].clientY,pan:current.current.pan,horizontal:false};}
   if(ignoreTouch.current||touches.length<2)return;
   const point=center(touches[0],touches[1]),box=articleRef.current!.getBoundingClientRect(),value=current.current.scale;
   pinch.current={distance:distance(touches[0],touches[1]),scale:value,point,local:{x:(point.x-box.left)/value,y:(point.y-box.top)/value}};
   pan.current=null;suppress();if(event.cancelable)event.preventDefault();
  }
  function move(event:TouchEvent){
   const touches=fingers(event);if(ignoreTouch.current)return;
   const gesture=pinch.current;
   if(gesture&&touches.length>=2){
    if(event.cancelable)event.preventDefault();suppress();
    apply(gesture.scale*distance(touches[0],touches[1])/gesture.distance,center(touches[0],touches[1]),gesture.local);return;
   }
   const drag=pan.current;if(gesture||!drag||touches.length!==1||current.current.scale<=1)return;
   const selection=window.getSelection();if(selection&&!selection.isCollapsed)return;
   const dx=touches[0].clientX-drag.x,dy=touches[0].clientY-drag.y;
   if(!drag.horizontal&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.3)drag.horizontal=true;
   if(!drag.horizontal)return;
   if(event.cancelable)event.preventDefault();suppress();apply(current.current.scale,undefined,undefined,drag.pan+dx);
  }
  function end(event:TouchEvent){
   if(fingers(event).length<2&&pinch.current){pinch.current=null;pan.current=null;suppress();}
   if(!event.touches.length){pan.current=null;ignoreTouch.current=false;}
  }
  function click(event:MouseEvent){if(suppressClick.current){event.preventDefault();event.stopPropagation();}}
  function wheel(event:WheelEvent){
   if(!event.ctrlKey||excluded(event.target))return;
   event.preventDefault();apply(current.current.scale*Math.exp(-event.deltaY*.008),{x:event.clientX,y:event.clientY});
  }
  element.addEventListener('touchstart',start,{passive:false});element.addEventListener('touchmove',move,{passive:false});element.addEventListener('touchend',end);element.addEventListener('touchcancel',end);element.addEventListener('click',click,true);element.addEventListener('wheel',wheel,{passive:false});
  return()=>{element.removeEventListener('touchstart',start);element.removeEventListener('touchmove',move);element.removeEventListener('touchend',end);element.removeEventListener('touchcancel',end);element.removeEventListener('click',click,true);element.removeEventListener('wheel',wheel);if(clickTimer.current)clearTimeout(clickTimer.current);};
 },[articleRef,enabled,gesturesEnabled,apply]);
 return {stageRef,scale,change,minimum,maximum};
}
