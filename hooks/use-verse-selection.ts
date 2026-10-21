'use client';
import {useEffect,useLayoutEffect,useRef,type PointerEvent as ReactPointerEvent} from 'react';

type Props={origin:string|null;onRange:(start:string,end:string,complete:boolean)=>void;onCancel:()=>void};
/** Only the verse-number gutter owns this gesture. Reading text keeps native selection and scrolling. */
export function useVerseSelection({origin,onRange,onCancel}:Props){
 const latest=useRef({origin,onRange,onCancel});useLayoutEffect(()=>{latest.current={origin,onRange,onCancel};},[origin,onRange,onCancel]);
 const drag=useRef<{pointer:number;start:string;end:string;y:number;initialY:number;moved:boolean;finishTap:boolean;button:HTMLButtonElement}|null>(null);
 const stop=useRef<()=>void>(()=>{});
 useEffect(()=>()=>stop.current(),[]);
 function down(event:ReactPointerEvent<HTMLButtonElement>,id:string){
  if(event.button!==0||!event.isPrimary)return;
  event.preventDefault();stop.current();
  const button=event.currentTarget,start=latest.current.origin??id;
  drag.current={pointer:event.pointerId,start,end:id,y:event.clientY,initialY:event.clientY,moved:false,finishTap:!!latest.current.origin,button};
  button.setPointerCapture(event.pointerId);latest.current.onRange(start,id,false);
  let frame=0;
  const update=()=>{
   const current=drag.current;if(!current)return;
   const rows=[...button.closest('.source-text')!.querySelectorAll<HTMLElement>('[data-block]')];
   const nearest=rows.reduce<HTMLElement|null>((best,row)=>{
    const box=row.getBoundingClientRect(),distance=Math.max(box.top-current.y,0,current.y-box.bottom);
    if(!best)return row;const other=best.getBoundingClientRect();return distance<Math.max(other.top-current.y,0,current.y-other.bottom)?row:best;
   },null);
   const id=nearest?.dataset.block;if(id&&current.end!==id){current.end=id;latest.current.onRange(current.start,id,false);}
  };
  const tick=()=>{
   const current=drag.current;if(!current)return;
   if(current.moved){const top=(document.querySelector('.reader-header')?.getBoundingClientRect().bottom??0)+55,bottom=innerHeight-100;const delta=current.y<top?-Math.min(14,(top-current.y)/5):current.y>bottom?Math.min(14,(current.y-bottom)/5):0;if(delta){window.scrollBy(0,delta);update();}}
   frame=requestAnimationFrame(tick);
  };
  const move=(event:PointerEvent)=>{const current=drag.current;if(current?.pointer!==event.pointerId)return;current.y=event.clientY;if(Math.abs(current.y-current.initialY)>5)current.moved=true;if(current.moved)update();};
  const cleanup=()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key);button.removeEventListener('lostpointercapture',cancel);drag.current=null;};
  const end=(event:PointerEvent)=>{const current=drag.current;if(current?.pointer!==event.pointerId)return;const complete=current.moved||current.finishTap;cleanup();if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);latest.current.onRange(current.start,current.end,complete);};
  const cancel=()=>{const current=drag.current;if(!current)return;cleanup();if(button.hasPointerCapture(current.pointer))button.releasePointerCapture(current.pointer);latest.current.onCancel();};
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();cancel();}};
  stop.current=cleanup;window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key);button.addEventListener('lostpointercapture',cancel);frame=requestAnimationFrame(tick);
 }
 return down;
}
