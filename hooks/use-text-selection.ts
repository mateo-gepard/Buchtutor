'use client';
import {useCallback,useEffect,useLayoutEffect,useRef,type RefObject} from 'react';
import type {Anchor,Section} from '@/lib/reader-model';
import {readTextSelection,sameAnchor} from '@/lib/dom-selection';

type Props={root:RefObject<HTMLElement|null>;section:Section;enabled:boolean;onSelect:(anchor:Anchor)=>void;onError:(message:string)=>void};
type Controller={freeze:()=>Anchor|null;clear:()=>void;canActivate:(event:MouseEvent)=>boolean};
const idle:Controller={freeze:()=>null,clear:()=>{},canActivate:()=>true};

/** Native handles stay browser-owned. Only an explicit tool action freezes the passage. */
export function useTextSelection({root,section,enabled,onSelect,onError}:Props){
  const latest=useRef({onSelect,onError});
  useLayoutEffect(()=>{latest.current={onSelect,onError};},[onSelect,onError]);
  const controller=useRef<Controller>(idle);
  useEffect(()=>{
    const element=root.current;if(!enabled||!element)return;
    const document=element.ownerDocument;
    let timer:ReturnType<typeof setTimeout>|undefined,tracking=true,last:Anchor|null=null,captured:Anchor|null=null;
    let gesture:{id:number;x:number;y:number;at:number;moved:boolean}|null=null,suppressUntil=0;
    const stop=()=>{clearTimeout(timer);timer=undefined;};
    const read=()=>{
      try{return readTextSelection(element,section);}catch{return null;} // Safari may detach a range during a handle move.
    };
    const commit=()=>{
      stop();const next=captured??(tracking?read():null);captured=null;
      if(!next)return null; // A transient collapsed range must not discard a saved passage.
      if(next.quote.length>24000){latest.current.onError('Wähle bitte eine kürzere Passage aus.');return null;}
      if(!sameAnchor(last,next)){last=next;latest.current.onSelect(next);}
      return next;
    };
    const clearNative=()=>{
      const selected=document.getSelection();
      if(selected?.rangeCount&&(element.contains(selected.anchorNode)||element.contains(selected.focusNode)))selected.removeAllRanges();
    };
    const clear=()=>{stop();tracking=false;last=null;captured=null;gesture=null;suppressUntil=0;clearNative();};
    const schedule=()=>{stop();if(tracking&&!gesture)timer=setTimeout(commit,160);};
    const inside=(target:EventTarget|null)=>target instanceof Node&&element.contains(target);
    function down(event:PointerEvent){
      if(!inside(event.target)){
        // Preserve Safari's range before focus moves, but publish it only once the
        // click target is fixed. Growing/recentering the toolbar on pointerdown
        // can otherwise move the intended button out from under the finger.
        captured=tracking?read():captured;tracking=false;stop();return;
      }
      stop();captured=null;tracking=true;
      suppressUntil=read()?performance.now()+600:0;
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,at:performance.now(),moved:false};
    }
    function move(event:PointerEvent){
      if(gesture?.id===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8)gesture.moved=true;
    }
    function end(event:PointerEvent){
      if(gesture?.id===event.pointerId){
        if(gesture.moved||performance.now()-gesture.at>350||event.type==='pointercancel'||read())suppressUntil=performance.now()+600;
        gesture=null;
      }
      schedule();
    }
    function touchEnd(){gesture=null;schedule();}
    function selectionStart(event:Event){if(inside(event.target)){captured=null;tracking=true;}}
    function activate(event:MouseEvent){if(!inside(event.target)&&captured)commit();}
    function key(event:KeyboardEvent){
      if((inside(event.target)||inside(document.getSelection()?.anchorNode??null))&&event.shiftKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){captured=null;tracking=true;}
      schedule();
    }
    function copy(event:ClipboardEvent){
      const anchor=read();if(!anchor||!event.clipboardData)return;
      event.clipboardData.setData('text/plain',anchor.quote);event.preventDefault();
    }
    controller.current={
      freeze:()=>{const anchor=commit();clear();return anchor;},
      clear,
      canActivate:event=>event.detail===0||(performance.now()>=suppressUntil&&!gesture&&!read()),
    };
    document.addEventListener('pointerdown',down,true);
    document.addEventListener('click',activate,true);
    document.addEventListener('pointermove',move,{passive:true});
    document.addEventListener('pointerup',end);
    document.addEventListener('pointercancel',end);
    document.addEventListener('touchend',touchEnd,{passive:true});
    document.addEventListener('touchcancel',touchEnd,{passive:true});
    document.addEventListener('selectstart',selectionStart);
    document.addEventListener('selectionchange',schedule);
    document.addEventListener('keyup',key);
    document.addEventListener('copy',copy);
    return()=>{
      stop();controller.current=idle;
      document.removeEventListener('pointerdown',down,true);
      document.removeEventListener('click',activate,true);
      document.removeEventListener('pointermove',move);
      document.removeEventListener('pointerup',end);
      document.removeEventListener('pointercancel',end);
      document.removeEventListener('touchend',touchEnd);
      document.removeEventListener('touchcancel',touchEnd);
      document.removeEventListener('selectstart',selectionStart);
      document.removeEventListener('selectionchange',schedule);
      document.removeEventListener('keyup',key);
      document.removeEventListener('copy',copy);
    };
  },[root,section,enabled]);
  return {
    freeze:useCallback(()=>controller.current.freeze(),[]),
    clear:useCallback(()=>controller.current.clear(),[]),
    canActivate:useCallback((event:MouseEvent)=>controller.current.canActivate(event),[]),
  };
}
