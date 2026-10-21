'use client';
import {useEffect,useEffectEvent,useId} from 'react';

/** Small reader menus share outside-tap, Escape, focus return and exclusivity. */
export function useReaderPopover(open:boolean,onClose:()=>void,inside:string,trigger:string){
 const id=useId(),close=useEffectEvent(onClose);
 useEffect(()=>{
  if(!open)return;
  const other=(event:Event)=>{if((event as CustomEvent<string>).detail!==id)close();};
  const outside=(event:PointerEvent)=>{
   if(!(event.target instanceof Element)||event.target.closest('[role="dialog"],[aria-haspopup="dialog"]'))return;
   if(!event.target.closest(inside))close();
  };
  const keyboard=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('[role="dialog"]:not([data-state="closed"])'))return;
   event.preventDefault();event.stopPropagation();close();document.querySelector<HTMLElement>(trigger)?.focus({preventScroll:true});
  };
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keyboard,true);
  window.addEventListener('buchtutor-popover-open',other);window.dispatchEvent(new CustomEvent('buchtutor-popover-open',{detail:id}));
  return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keyboard,true);window.removeEventListener('buchtutor-popover-open',other);};
 },[open,id,inside,trigger]);
}
