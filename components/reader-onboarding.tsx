'use client';
import {useEffect,useEffectEvent,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowRight,BookOpen,Bookmark,Check,CheckCircle2,Eraser,FileKey2,Filter,Highlighter,Lightbulb,LockKeyhole,MousePointer2,PenLine,MessageSquare,Users,X} from 'lucide-react';
import {ONBOARDING_KEY,tourChapters,tourSteps} from '@/lib/onboarding';
type Box={x:number;y:number;width:number;height:number};
type Props={ready:boolean;open:boolean;bookTitle:string;colorLabel:string;exampleText:string;step:number|null;done:Record<string,boolean>;onTry:(value?:string)=>void;onStart:()=>void;onBegin:()=>void;onStep:(index:number)=>void;onClose:()=>void};
const icons={book:BookOpen,eraser:Eraser,note:MessageSquare,selection:Highlighter,pencil:Highlighter,pen:PenLine,bulb:Lightbulb,users:Users,bookmark:Bookmark,filter:Filter,lock:LockKeyhole};
function visible(el:HTMLElement){const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';}
function firstOfEach(selector:string){return selector?selector.split(',').flatMap(part=>{const el=[...document.querySelectorAll<HTMLElement>(part.trim())].find(visible);return el?[el]:[];}):[];}
function TourAutoAdvance({complete,changing,onAdvance}:{complete:boolean;changing:boolean;onAdvance:()=>void}){
 const [alreadyComplete]=useState(complete),[held,setHeld]=useState(false);
 const interaction=useRef({pointers:new Set<number>(),composing:false});
 const advance=useEffectEvent(onAdvance);
 useEffect(()=>{
  if(alreadyComplete||held||changing)return;
  let timer:ReturnType<typeof setTimeout>;const activity=interaction.current;
  const clear=()=>clearTimeout(timer);
  function arm(){clear();if(complete&&!activity.pointers.size&&!activity.composing&&!document.hidden&&document.hasFocus())timer=setTimeout(()=>advance(),1800);}
  function down(event:PointerEvent){activity.pointers.add(event.pointerId);clear();}
  function up(event:PointerEvent){activity.pointers.delete(event.pointerId);arm();}
  function move(event:PointerEvent){if(event.buttons)clear();}
  function input(event:Event){if(event instanceof InputEvent&&event.isComposing){activity.composing=true;clear();}else arm();}
  function compose(){activity.composing=true;clear();}
  function composed(){activity.composing=false;arm();}
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',up,true);document.addEventListener('pointermove',move,true);
  document.addEventListener('input',input,true);document.addEventListener('keydown',clear,true);document.addEventListener('keyup',arm,true);document.addEventListener('compositionstart',compose,true);document.addEventListener('compositionend',composed,true);document.addEventListener('visibilitychange',arm);window.addEventListener('blur',clear);window.addEventListener('focus',arm);arm();
  return()=>{clear();document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',up,true);document.removeEventListener('pointermove',move,true);document.removeEventListener('input',input,true);document.removeEventListener('keydown',clear,true);document.removeEventListener('keyup',arm,true);document.removeEventListener('compositionstart',compose,true);document.removeEventListener('compositionend',composed,true);document.removeEventListener('visibilitychange',arm);window.removeEventListener('blur',clear);window.removeEventListener('focus',arm);};
 },[complete,alreadyComplete,held,changing]);
 if(!complete||alreadyComplete)return null;
 return <div className="tour-auto-advance" aria-live="polite"><span>{held?'Gehe weiter, wenn du bereit bist.':'Gleich zum nächsten Schritt …'}</span>{!held&&<button onClick={()=>setHeld(true)}>Hier bleiben</button>}</div>;
}
export function ReaderOnboarding({ready,open,bookTitle,colorLabel,exampleText,step,done,onTry,onStart,onBegin,onStep,onClose}:Props){
 const card=useRef<HTMLDivElement>(null),attempted=useRef(false),lastPosition=useRef<{x:number;y:number}|null>(null);
 const timers=useRef<{change?:ReturnType<typeof setTimeout>;reveal?:ReturnType<typeof setTimeout>}>({});
 const [changing,setChanging]=useState(false);
 function clearTimers(){clearTimeout(timers.current.change);clearTimeout(timers.current.reveal);}
 function navigate(index:number){
  if(changing)return;clearTimers();
  const change=()=>step===null?onBegin():onStep(index);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){change();return;}
  setChanging(true);timers.current.change=setTimeout(()=>{change();timers.current.reveal=setTimeout(()=>setChanging(false),100);},140);
 }
 useEffect(()=>()=>{clearTimeout(timers.current.change);clearTimeout(timers.current.reveal);},[]);
 const [geometry,setGeometry]=useState<{spots:Box[];card:Box;viewport:Box}|null>(null);
 function finish(){clearTimers();setChanging(false);lastPosition.current=null;attempted.current=true;onClose();}
 const finishEvent=useEffectEvent(finish);
 const start=useEffectEvent(onStart),tried=useEffectEvent(onTry);
 useEffect(()=>{if(!ready)return;const timer=setTimeout(()=>{if(attempted.current)return;try{if(localStorage.getItem(ONBOARDING_KEY)==='1')return;}catch{/* Optional per-device state. */}attempted.current=true;start();},600);return()=>clearTimeout(timer);},[ready]);
 useLayoutEffect(()=>{
  if(!open)return;let frame=0,focusFrame=0,needsFocus=true,disposed=false,accessDirty=true;
  const current=step===null?{id:'welcome',target:'',extra:'',allow:''}:tourSteps[step],app=document.querySelector<HTMLElement>('.reader-app')!,inertBefore=new Map<HTMLElement,boolean>();
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
   const margin=12,gap=14,width=Math.min(step===null?480:current.id==='finish'?440:360,w-margin*2);let height=Math.min(card.current.scrollHeight+2,h-margin*2);
   const spots=parts().map(el=>{const rect=el.getBoundingClientRect(),number=el.matches('.source-row')?el.querySelector('.line-number')?.getBoundingClientRect():undefined,r={left:Math.min(rect.left,number?.left??rect.left),right:rect.right,top:rect.top,bottom:rect.bottom,height:rect.height},bottom=current.target==='.source-row'&&el===primary()?r.top+Math.min(r.height,72):r.bottom;return {x:Math.max(vx+4,r.left-6),y:Math.max(vy+4,r.top-6),width:Math.min(vx+w-4,r.right+6)-Math.max(vx+4,r.left-6),height:Math.min(vy+h-4,bottom+6)-Math.max(vy+4,r.top-6)};}).filter(r=>r.width>0&&r.height>0);
   const clamp=(p:{x:number;y:number})=>({x:Math.max(vx+margin,Math.min(vx+w-width-margin,p.x)),y:Math.max(vy+margin,Math.min(vy+h-height-margin,p.y))});
   const candidates=spots.flatMap(r=>[{x:r.x+r.width/2-width/2,y:r.y+r.height+gap},{x:r.x+r.width/2-width/2,y:r.y-gap-height},{x:r.x-width-gap,y:r.y},{x:r.x+r.width+gap,y:r.y}]);
   if(step!==null&&current.id!=='finish'&&lastPosition.current)candidates.unshift(lastPosition.current);
   candidates.push({x:vx+(w-width)/2,y:vy+(h-height)/2},{x:vx+margin,y:vy+margin},{x:vx+w-width-margin,y:vy+h-height-margin});
   const ranked=candidates.map(clamp).map((p,index)=>({...p,index,overlap:spots.reduce((total,r)=>total+Math.max(0,Math.min(p.x+width,r.x+r.width)-Math.max(p.x,r.x))*Math.max(0,Math.min(p.y+height,r.y+r.height)-Math.max(p.y,r.y)),0)})).sort((a,b)=>a.overlap-b.overlap||a.index-b.index);
   let position=ranked[0];
   if(position.overlap>0){
    let top=vy+margin;const spaces:{top:number;height:number}[]=[];
    for(const r of [...spots].sort((a,b)=>a.y-b.y)){spaces.push({top,height:r.y-gap-top});top=Math.max(top,r.y+r.height+gap);}
    spaces.push({top,height:vy+h-margin-top});const free=spaces.sort((a,b)=>b.height-a.height)[0];
    if(free?.height>=120){height=Math.min(height,free.height);position={...position,x:vx+(w-width)/2,y:free.top};}
   }
   if(step!==null&&current.id!=='finish')lastPosition.current={x:position.x,y:position.y};
   setGeometry({spots,card:{...position,width,height},viewport:{x:vx,y:vy,width:w,height:h}});
   if(needsFocus){needsFocus=false;focusFrame=requestAnimationFrame(()=>{if(!disposed)card.current?.focus({preventScroll:true});});}
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);}
  const observer=new ResizeObserver(schedule);for(const el of parts())observer.observe(el);if(card.current)observer.observe(card.current);
  const mutations=new MutationObserver(()=>{accessDirty=true;schedule();});mutations.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-positioned']});
  function input(event:Event){const target=event.target as HTMLElement;if(!firstOfEach(current.allow).some(el=>el===target||el.contains(target)))return;if(current.id==='notebook')tried((target as HTMLSelectElement).value);}
  function focus(event:FocusEvent){const target=event.target as HTMLElement;if(!card.current?.contains(target)&&!firstOfEach(current.allow).some(el=>el===target||el.contains(target)))card.current?.focus({preventScroll:true});}
  function keyboard(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();finishEvent();return;}if(event.key!=='Tab')return;
   const roots=[card.current,...parts()].filter((el):el is HTMLElement=>!!el),all=roots.flatMap(el=>[...(el.matches('button,input,select,textarea,a[href]')?[el]:[]),...el.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')]).filter(el=>!el.closest('[inert]')&&!el.matches(':disabled')&&visible(el));
   const index=all.indexOf(document.activeElement as HTMLElement);event.preventDefault();all[(index+(event.shiftKey?-1:1)+all.length)%all.length]?.focus();
  }
  document.addEventListener('input',input,true);document.addEventListener('change',input,true);document.addEventListener('focusin',focus);document.addEventListener('keydown',keyboard,true);
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  schedule();
  return()=>{disposed=true;cancelAnimationFrame(frame);cancelAnimationFrame(focusFrame);observer.disconnect();mutations.disconnect();restoreAccess();document.removeEventListener('input',input,true);document.removeEventListener('change',input,true);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',keyboard,true);window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);};
 },[step,open]);
 if(!open)return null;
 const current=step===null?null:tourSteps[step],last=step===tourSteps.length-1,Icon=current?icons[current.icon]:BookOpen,complete=current?done[current.id]:false;
 const holes=(geometry?.spots??[]).map(r=>{const c=Math.min(10,r.width/2,r.height/2);return `M${r.x+c},${r.y} H${r.x+r.width-c} Q${r.x+r.width},${r.y} ${r.x+r.width},${r.y+c} V${r.y+r.height-c} Q${r.x+r.width},${r.y+r.height} ${r.x+r.width-c},${r.y+r.height} H${r.x+c} Q${r.x},${r.y+r.height} ${r.x},${r.y+r.height-c} V${r.y+c} Q${r.x},${r.y} ${r.x+c},${r.y} Z`;}).join(' ');
 return createPortal(<div className="reader-onboarding" data-transition={changing?'changing':'ready'}>
  <svg className="tour-shade" aria-hidden="true"><path fillRule="evenodd" d={`M0,0 H100000 V100000 H0 Z ${holes}`}/>{geometry?.spots.map((r,i)=><rect key={i} className="tour-spotlight" x={r.x} y={r.y} width={r.width} height={r.height} rx={10}/>)}{changing&&<rect width="100%" height="100%" fill="transparent" style={{pointerEvents:'all'}}/>}</svg>
  <div ref={card} role="dialog" aria-modal={step===null||last?'true':'false'} aria-labelledby="tour-title" aria-describedby="tour-description" className={'tour-card '+(step===null?'tour-welcome':last?'tour-finish':'')} tabIndex={-1} data-tour-step={current?.id??'welcome'} style={geometry?{left:geometry.card.x,top:geometry.card.y,width:geometry.card.width,maxHeight:geometry.card.height}:{visibility:'hidden'}}>
   <div className="tour-topline"><span>{current&&step!==null?`${tourChapters[current.chapter]} · Schritt ${step+1} von ${tourSteps.length}`:'Buchtutor kennenlernen'}</span><button className="icon-button" aria-label="Tour überspringen" onClick={finish}><X size={18}/></button></div>
   {current?<>
    <div className="tour-chapters" aria-label="Abschnitte der Einführung">{tourChapters.map((chapter,i)=><span key={chapter} className={i===current.chapter?'is-current':i<current.chapter?'is-past':''}><i/>{i===0?'Bearbeiten':i===1?'Ergänzen':'Wiederfinden'}</span>)}</div>
    <div className="tour-title-row"><span className="tour-symbol"><Icon size={23} strokeWidth={1.7}/></span><h2 id="tour-title">{current.title}</h2></div>
    <p id="tour-description">{current.text}</p>
    {current.id==='pencil'&&!complete&&<div className="tour-gesture" aria-hidden="true"><span>Ein Gedanke im Text</span><i/><PenLine size={17}/></div>}
    {current.task&&<div className={'tour-task '+(complete?'is-complete':'')} aria-live="polite">{complete?<CheckCircle2 size={20}/>:<MousePointer2 size={20}/>}<div><small>{complete?'Ausprobiert':'optional' in current?'Wenn du möchtest':'Du bist dran'}</small><span>{complete?current.success:current.id==='notebook'?`Wähle „${colorLabel}“ im Farbfilter.`:current.task}</span></div></div>}
    {current.task&&step!==null&&<TourAutoAdvance key={step} complete={!!complete} changing={changing} onAdvance={()=>navigate(step+1)}/>}
    {current.id==='notebook'&&<blockquote className="tour-note-preview">{exampleText.slice(0,160)}</blockquote>}
    {last&&<>
     <div className="tour-recap">{[['selection','Textstelle auswählen'],['pencil','Markierung setzen'],['notes','Gedanken festhalten'],['notebook','Im Notizbuch wiederfinden']].map(([id,label])=><span key={id}>{done[id]?<CheckCircle2 size={17}/>:<Check size={17}/>} {label}</span>)}</div>
     <p className="tour-backup-tip"><FileKey2 size={20}/><span><strong>Deine eigenen Notizen sichern</strong>Mit „Geräteübertragung“ nimmst du sie als verschlüsselte Datei plus Passwort mit.</span></p>
     <p className="tour-return-note">Deine Übung wird jetzt verworfen. Du kehrst zu deiner vorherigen Ansicht zurück. Über <strong>?</strong> kannst du die Einführung wiederholen.</p>
    </>}
   </>:<>
    <div className="tour-welcome-art" aria-hidden="true"><span>{bookTitle}</span><div><mark>Eine Stelle, die dir auffällt.</mark></div><p><MessageSquare size={17}/><span>Dein Gedanke dazu</span><CheckCircle2 size={16}/></p></div>
    <h2 id="tour-title">Lerne Buchtutor an einer Textstelle kennen</h2>
    <p id="tour-description">Wähle eine Stelle, ergänze einen Gedanken und finde ihn wieder. Wir gehen das gemeinsam durch.</p>
    <div className="tour-welcome-route"><span><Highlighter size={17}/>Bearbeiten</span><ArrowRight size={14}/><span><MessageSquare size={17}/>Ergänzen</span><ArrowRight size={14}/><span><Bookmark size={17}/>Wiederfinden</span></div>
    <p className="tour-welcome-detail">10 kurze Schritte · Übungen freiwillig · keine KI-Kosten</p>
   </>}
   <div className="tour-actions"><button className="tour-skip" onClick={finish}>{current?'Überspringen':'Direkt lesen'}</button><div>{step!==null&&step>0&&<button className="icon-button" aria-label="Vorheriger Schritt" disabled={changing} onClick={()=>navigate(step-1)}><ArrowLeft size={18}/></button>}<button data-tour-next className="primary-button" disabled={changing} onClick={()=>last?finish():navigate(step===null?0:step+1)}>{current?current.next:'Gemeinsam ausprobieren'}{last?<Check size={17}/>:<ArrowRight size={17}/>}</button></div></div>
   {!current&&<p className="tour-welcome-later">Lieber gleich loslegen? Die Einführung findest du jederzeit unter <strong>?</strong>.</p>}
  </div>
 </div>,document.body);
}
