'use client';
import {useEffect,useEffectEvent,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowRight,BookOpen,Bookmark,Check,CheckCircle2,Compass,FileKey2,Filter,Highlighter,Lightbulb,LockKeyhole,MousePointer2,PenLine,Tablet,Users,X} from 'lucide-react';
import {ONBOARDING_KEY,tourSteps} from '@/lib/onboarding';
type Box={x:number;y:number;width:number;height:number};
type Props={ready:boolean;step:number|null;done:Record<string,boolean>;onTry:()=>void;onStart:()=>void;onStep:(index:number)=>void;onClose:()=>void};
const icons={book:BookOpen,compass:Compass,selection:Highlighter,pencil:Highlighter,pen:PenLine,bulb:Lightbulb,users:Users,bookmark:Bookmark,filter:Filter,lock:LockKeyhole};
function visible(el:HTMLElement){const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';}
function firstOfEach(selector:string){return selector?selector.split(',').flatMap(part=>{const el=[...document.querySelectorAll<HTMLElement>(part.trim())].find(visible);return el?[el]:[];}):[];}
export function ReaderOnboarding({ready,step,done,onTry,onStart,onStep,onClose}:Props){
 const card=useRef<HTMLDivElement>(null),attempted=useRef(false);
 const [geometry,setGeometry]=useState<{spots:Box[];card:Box;viewport:Box}|null>(null);
 function finish(){attempted.current=true;onClose();}
 const finishEvent=useEffectEvent(finish);
 const start=useEffectEvent(onStart),tried=useEffectEvent(onTry);
 useEffect(()=>{if(!ready)return;const timer=setTimeout(()=>{if(attempted.current)return;try{if(localStorage.getItem(ONBOARDING_KEY)==='1')return;}catch{/* Optional per-device state. */}attempted.current=true;start();},600);return()=>clearTimeout(timer);},[ready]);
 useLayoutEffect(()=>{
  if(step===null)return;let frame=0,disposed=false,accessDirty=true;
  const current=tourSteps[step],app=document.querySelector<HTMLElement>('.reader-app')!,inertBefore=new Map<HTMLElement,boolean>();
  function primary(){return current.target?[...document.querySelectorAll<HTMLElement>(current.target)].find(visible):undefined;}
  function parts(){const first=primary();return [...(first?[first]:[]),...firstOfEach(current.extra)];}
  function restoreAccess(){for(const [el,inert] of inertBefore)el.inert=inert;inertBefore.clear();}
  function access(){
   restoreAccess();const allowed=firstOfEach(current.allow);
   function walk(el:HTMLElement){if(allowed.some(node=>node===el||node.contains(el)))return;if(allowed.some(node=>el.contains(node))){for(const child of el.children)if(child instanceof HTMLElement)walk(child);}else{inertBefore.set(el,el.inert);el.inert=true;}}
   walk(app);accessDirty=false;
  }
  const first=primary();if(first){if(current.target==='.source-row'){first.scrollIntoView({block:'start',behavior:'instant'});window.scrollBy({top:first.getBoundingClientRect().top-90,behavior:'instant'});}else{const r=first.getBoundingClientRect();if(r.top<80||r.bottom>window.innerHeight-80)first.scrollIntoView({block:'center',behavior:'instant'});}}
  function measure(){
   if(disposed||!card.current)return;if(accessDirty)access();
   const vv=window.visualViewport,vx=vv?.offsetLeft??0,vy=vv?.offsetTop??0,w=vv?.width??window.innerWidth,h=vv?.height??window.innerHeight;
   const margin=12,gap=14,width=Math.min(360,w-margin*2);let height=Math.min(card.current.scrollHeight,h-margin*2);
   const spots=parts().map(el=>{const rect=el.getBoundingClientRect(),number=el.matches('.source-row')?el.querySelector('.line-number')?.getBoundingClientRect():undefined,r={left:Math.min(rect.left,number?.left??rect.left),right:rect.right,top:rect.top,bottom:rect.bottom,height:rect.height},bottom=current.target==='.source-row'&&el===primary()?r.top+Math.min(r.height,72):r.bottom;return {x:Math.max(vx+4,r.left-6),y:Math.max(vy+4,r.top-6),width:Math.min(vx+w-4,r.right+6)-Math.max(vx+4,r.left-6),height:Math.min(vy+h-4,bottom+6)-Math.max(vy+4,r.top-6)};}).filter(r=>r.width>0&&r.height>0);
   const clamp=(p:{x:number;y:number})=>({x:Math.max(vx+margin,Math.min(vx+w-width-margin,p.x)),y:Math.max(vy+margin,Math.min(vy+h-height-margin,p.y))});
   const candidates=spots.flatMap(r=>[{x:r.x+r.width/2-width/2,y:r.y+r.height+gap},{x:r.x+r.width/2-width/2,y:r.y-gap-height},{x:r.x-width-gap,y:r.y},{x:r.x+r.width+gap,y:r.y}]);
   candidates.push({x:vx+(w-width)/2,y:vy+(h-height)/2},{x:vx+margin,y:vy+margin},{x:vx+w-width-margin,y:vy+h-height-margin});
   const ranked=candidates.map(clamp).map((p,index)=>({...p,index,overlap:spots.reduce((total,r)=>total+Math.max(0,Math.min(p.x+width,r.x+r.width)-Math.max(p.x,r.x))*Math.max(0,Math.min(p.y+height,r.y+r.height)-Math.max(p.y,r.y)),0)})).sort((a,b)=>a.overlap-b.overlap||a.index-b.index);
   let position=ranked[0];
   if(position.overlap>0){
    let top=vy+margin;const spaces:{top:number;height:number}[]=[];
    for(const r of [...spots].sort((a,b)=>a.y-b.y)){spaces.push({top,height:r.y-gap-top});top=Math.max(top,r.y+r.height+gap);}
    spaces.push({top,height:vy+h-margin-top});const free=spaces.sort((a,b)=>b.height-a.height)[0];
    if(free?.height>=120){height=Math.min(height,free.height);position={...position,x:vx+(w-width)/2,y:free.top};}
   }
   setGeometry({spots,card:{...position,width,height},viewport:{x:vx,y:vy,width:w,height:h}});
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);}
  const observer=new ResizeObserver(schedule);for(const el of parts())observer.observe(el);if(card.current)observer.observe(card.current);
  const mutations=new MutationObserver(()=>{accessDirty=true;schedule();});mutations.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-positioned']});
  function input(event:Event){const target=event.target as HTMLElement;if(!firstOfEach(current.allow).some(el=>el===target||el.contains(target)))return;if(current.id==='library'&&(target as HTMLInputElement).value?.trim()||current.id==='navigation'||current.id==='notebook')tried();}
  function focus(event:FocusEvent){const target=event.target as HTMLElement;if(!card.current?.contains(target)&&!firstOfEach(current.allow).some(el=>el===target||el.contains(target)))card.current?.focus({preventScroll:true});}
  function keyboard(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();finishEvent();return;}if(event.key!=='Tab')return;
   const roots=[card.current,...parts()].filter((el):el is HTMLElement=>!!el),all=roots.flatMap(el=>[...(el.matches('button,input,select,textarea,a[href]')?[el]:[]),...el.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')]).filter(el=>!el.closest('[inert]')&&!el.matches(':disabled')&&visible(el));
   const index=all.indexOf(document.activeElement as HTMLElement);event.preventDefault();all[(index+(event.shiftKey?-1:1)+all.length)%all.length]?.focus();
  }
  document.addEventListener('input',input,true);document.addEventListener('change',input,true);document.addEventListener('focusin',focus);document.addEventListener('keydown',keyboard,true);
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  schedule();card.current?.focus({preventScroll:true});
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();mutations.disconnect();restoreAccess();document.removeEventListener('input',input,true);document.removeEventListener('change',input,true);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',keyboard,true);window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);};
 },[step]);
 if(step===null)return null;
 const current=tourSteps[step],last=step===tourSteps.length-1,Icon=icons[current.icon],complete=done[current.id];
 const holes=(geometry?.spots??[]).map(r=>{const c=Math.min(10,r.width/2,r.height/2);return `M${r.x+c},${r.y} H${r.x+r.width-c} Q${r.x+r.width},${r.y} ${r.x+r.width},${r.y+c} V${r.y+r.height-c} Q${r.x+r.width},${r.y+r.height} ${r.x+r.width-c},${r.y+r.height} H${r.x+c} Q${r.x},${r.y+r.height} ${r.x},${r.y+r.height-c} V${r.y+c} Q${r.x},${r.y} ${r.x+c},${r.y} Z`;}).join(' ');
 return createPortal(<div className="reader-onboarding">
  <svg className="tour-shade" aria-hidden="true"><path fillRule="evenodd" d={`M0,0 H100000 V100000 H0 Z ${holes}`}/>{geometry?.spots.map((r,i)=><rect key={i} className="tour-spotlight" x={r.x} y={r.y} width={r.width} height={r.height} rx={10}/>)}</svg>
  <div ref={card} role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-description" className="tour-card" tabIndex={-1} data-tour-step={current.id} style={geometry?{left:geometry.card.x,top:geometry.card.y,width:geometry.card.width,maxHeight:geometry.card.height}:{visibility:'hidden'}}>
   <div className="tour-topline"><span>Schritt {step+1} von {tourSteps.length}</span><button className="icon-button" aria-label="Tour überspringen" onClick={finish}><X size={18}/></button></div>
   <div className="tour-stops" aria-hidden="true">{tourSteps.map((s,i)=><span key={s.id} className={i===step?'is-current':i<step?'is-past':''}/>)}</div>
   <div className="tour-title-row"><span className="tour-symbol"><Icon size={23} strokeWidth={1.7}/></span><div><h2 id="tour-title">{current.title}</h2><span className="tour-tagline">{current.lead}</span></div></div>
   <p id="tour-description">{current.text}</p>
   {current.task&&<div className={'tour-task '+(complete?'is-complete':'')} aria-live="polite">{complete?<CheckCircle2 size={20}/>:<MousePointer2 size={20}/>}<div><small>{complete?'Geschafft!':'Probier’s aus'}</small><span>{complete?current.success:current.task}</span></div></div>}
   {['pencil','handwriting','help','bookmark'].includes(current.id)&&<p className="tour-practice-note"><LockKeyhole size={12}/>Übungsmodus · keine Speicherung, keine KI-Kosten</p>}
   {last&&<div className="tour-transfer-visual" aria-hidden="true"><span><FileKey2 size={25}/>Datei + Passwort</span><ArrowRight size={18}/><span><Tablet size={25}/>Anderes Gerät</span></div>}
   <div className="tour-actions"><button className="tour-skip" onClick={finish}>Überspringen</button><div>{step>0&&<button className="icon-button" aria-label="Vorheriger Schritt" onClick={()=>onStep(step-1)}><ArrowLeft size={18}/></button>}<button className="primary-button" onClick={()=>last?finish():onStep(step+1)}>{last?'Loslesen':'Weiter'}{last?<Check size={17}/>:<ArrowRight size={17}/>}</button></div></div>
  </div>
 </div>,document.body);
}
