'use client';
import {useEffect,useEffectEvent} from 'react';

const controls='button,a,input,textarea,select,summary,[role="button"],[contenteditable="true"],.reader-workspace,.workspace-inline-host,.saved-highlight,.pencil-inline-note,[role="dialog"]';

/** A deliberate tap on the reading surface clears selection; scroll, ink and native handles do not. */
export function useSelectionDismiss({enabled,choosing,onDismiss}:{enabled:boolean;choosing:boolean;onDismiss:()=>void}){
 const dismiss=useEffectEvent(onDismiss),isChoosing=useEffectEvent(()=>choosing);
 useEffect(()=>{
  if(!enabled)return;
  const pointers=new Set<number>();
  let gesture:{id:number;x:number;y:number;scroll:number;at:number;choosing:boolean;moved:boolean}|null=null,tap=false;
  const down=(event:PointerEvent)=>{
   tap=false;pointers.add(event.pointerId);
   if(pointers.size!==1||!event.isPrimary||event.button!==0||!(event.target instanceof Element)||!event.target.closest('.reading-main')||event.target.closest(controls)){gesture=null;return;}
   gesture={id:event.pointerId,x:event.clientX,y:event.clientY,scroll:window.scrollY,at:performance.now(),choosing:isChoosing(),moved:false};
  };
  const move=(event:PointerEvent)=>{if(gesture?.id===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8)gesture.moved=true;};
  const up=(event:PointerEvent)=>{
   pointers.delete(event.pointerId);const current=gesture;if(!current||current.id!==event.pointerId)return;gesture=null;
   tap=event.type==='pointerup'&&!current.moved&&Math.abs(window.scrollY-current.scroll)<3&&performance.now()-current.at<350&&!(current.choosing&&event.target instanceof Element&&event.target.closest('[data-text]'));
  };
  const click=(event:MouseEvent)=>{
   const shouldDismiss=tap;tap=false;
   if(!shouldDismiss||event.defaultPrevented||!(event.target instanceof Element)||event.target.closest(controls)||!event.target.closest('.reading-main'))return;
   const selection=window.getSelection();if(selection&&!selection.isCollapsed&&selection.toString())return;
   dismiss();
  };
  const reset=()=>{gesture=null;tap=false;pointers.clear();};
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);document.addEventListener('click',click);window.addEventListener('blur',reset);
  return()=>{document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);document.removeEventListener('click',click);window.removeEventListener('blur',reset);};
 },[enabled]);
}
