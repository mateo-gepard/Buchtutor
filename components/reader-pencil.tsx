'use client';
import {useEffect,useLayoutEffect,useRef,useState,type PointerEvent,type ReactNode} from 'react';
import {Check,ChevronDown,ChevronUp,Highlighter,LoaderCircle,RotateCcw,Trash2,X} from 'lucide-react';
import {ApplePencilIcon} from './apple-pencil-icon';
import {z} from 'zod';
import type {Anchor,Book,SavedNote,Section} from '@/lib/reader-model';
import {referenceLabel} from '@/lib/reader-model';
import {deviceId,saveLocalNotes,saveLocalPreferences} from '@/lib/local-storage';
import type {Prefs} from '@/lib/preferences';
import {portableAnchorSchema} from '@/lib/local-model';
import {inkPath,pencilAnnotationSchema,pencilColors,pencilPalette,strokeAnchor,type InkPoint,type InkStroke,type PencilColor,type Point,type WordBox} from '@/lib/pencil-model';
const entrySchema=z.object({id:z.string(),anchor:portableAnchorSchema,pencil:pencilAnnotationSchema,body:z.string().max(12000)});
const draftSchema=z.array(entrySchema).max(100);
type Entry=z.infer<typeof entrySchema>;
function wordBoxes(root:HTMLElement):WordBox[]{
 const boxes:WordBox[]=[];
 for(const el of root.querySelectorAll<HTMLElement>('[data-text]')){
  const visible=el.getBoundingClientRect();if(visible.bottom< -80||visible.top>window.innerHeight+80)continue;
  const blockId=el.closest<HTMLElement>('[data-block]')?.dataset.block;if(!blockId)continue;
  const nodes:{node:Node;start:number;end:number}[]=[];
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node:Node|null,total=0;
  while((node=walker.nextNode())){const length=node.textContent?.length??0;nodes.push({node,start:total,end:total+length});total+=length;}
  for(const match of (el.textContent??'').matchAll(/\S+/gu)){
   const start=match.index!,end=start+match[0].length;
   const first=nodes.find(n=>n.end>start),last=nodes.find(n=>n.end>=end);if(!first||!last)continue;
   const range=document.createRange();range.setStart(first.node,start-first.start);range.setEnd(last.node,end-last.start);
   for(const r of range.getClientRects())boxes.push({blockId,start,end,left:r.left+window.scrollX,right:r.right+window.scrollX,top:r.top+window.scrollY,bottom:r.bottom+window.scrollY});
  }
 }
 return boxes;
}
function InkPad({ink,onChange,disabled=false}:{ink:InkStroke[];onChange:(ink:InkStroke[])=>void;disabled?:boolean}){
 const [live,setLive]=useState<InkStroke>([]),active=useRef<{id:number;points:InkStroke}|null>(null);
 function point(e:PointerEvent<SVGSVGElement>):InkPoint{const r=e.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1000,(e.clientX-r.left)*1000/r.width)),y:Math.max(0,Math.min(320,(e.clientY-r.top)*320/r.height)),pressure:e.pressure||0.5};}
 function end(e:PointerEvent<SVGSVGElement>){if(active.current?.id!==e.pointerId)return;const points=active.current.points;active.current=null;setLive([]);if(points.length)onChange([...ink,points]);}
 return <div className="pencil-pad-wrap"><svg className="pencil-pad" viewBox="0 0 1000 320" role="img" aria-label="Schreibfläche für handschriftliche Notiz" onPointerDown={e=>{if(disabled||e.pointerType==='touch'||ink.length>=200)return;e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Older WebKit can reject capture; in-bounds drawing still works. */}const points=[point(e)];active.current={id:e.pointerId,points};setLive(points);}} onPointerMove={e=>{const a=active.current;if(a?.id!==e.pointerId)return;e.preventDefault();const events=e.nativeEvent.getCoalescedEvents?.()??[e.nativeEvent];const r=e.currentTarget.getBoundingClientRect();for(const p of events){if(a.points.length>=3000)break;a.points.push({x:Math.max(0,Math.min(1000,(p.clientX-r.left)*1000/r.width)),y:Math.max(0,Math.min(320,(p.clientY-r.top)*320/r.height)),pressure:p.pressure||0.5});}setLive([...a.points]);}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
  {[80,160,240].map(y=><line key={y} x1="20" x2="980" y1={y} y2={y} stroke="#e2e4df"/>)}
  {[...ink,...(live.length?[live]:[])].map((stroke,i)=><path key={i} d={inkPath(stroke)+(stroke.length===1?' l0.1,0.1':'')} stroke="#263b34" strokeWidth={1.8+2.2*stroke.reduce((sum,p)=>sum+p.pressure,0)/stroke.length} fill="none" strokeLinecap="round" strokeLinejoin="round"/>)}
 </svg><button className="text-button" disabled={disabled||!ink.length} onClick={()=>onChange(ink.slice(0,-1))}><RotateCcw size={14}/>Letzten Schriftstrich entfernen</button></div>;
}
async function imageOf(ink:InkStroke[]){
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=320;
 const context=canvas.getContext('2d');if(!context)throw new Error('Die Schreibfläche konnte nicht gelesen werden.');
 context.fillStyle='#fff';context.fillRect(0,0,1000,320);context.strokeStyle='#172b23';context.lineWidth=3;context.lineCap='round';context.lineJoin='round';
 for(const stroke of ink){context.beginPath();stroke.forEach((p,i)=>{if(i)context.lineTo(p.x,p.y);else context.moveTo(p.x,p.y);});if(stroke.length===1)context.lineTo(stroke[0].x+0.1,stroke[0].y+0.1);context.stroke();}
 return canvas.toDataURL('image/png');
}
export function ReaderPencil({book,section,prefs,selection,enabled,onToggle,onSaved,children}:{book:Book;section:Section;prefs:Prefs;selection:Anchor|null;enabled:boolean;onToggle:()=>void;onSaved:(message:string)=>void;children:(drafts:SavedNote[])=>ReactNode}){
 const liveLine=useRef<SVGPolylineElement>(null),operation=useRef<AbortController|null>(null);
 useEffect(()=>()=>operation.current?.abort(),[]);
 const root=useRef<HTMLDivElement>(null),gesture=useRef<{id:number;points:Point[];boxes:WordBox[];origin:Point}|null>(null);
 const [entries,setEntries]=useState<Entry[]>([]),[activeId,setActiveId]=useState(''),[color,setColor]=useState<PencilColor>('green'),[expanded,setExpanded]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const key=`buchtutor-pencil-draft:${book.id}:${book.editionId}:${section.id}`;
 const active=entries.find(e=>e.id===activeId)??entries.at(-1);
 const meaning=(c:PencilColor)=>prefs.pencilMeanings?.[c]??pencilPalette[c].meaning;
 useLayoutEffect(()=>{
  const frame=requestAnimationFrame(()=>{
  let restored:Entry[]=[];
  try{restored=draftSchema.parse(JSON.parse(localStorage.getItem(key)??'[]'));}catch{/* Keep malformed drafts in storage until a new edit is made. */}
  setEntries(restored);setActiveId(restored.at(-1)?.id??'');setLoaded(true);
  });return()=>cancelAnimationFrame(frame);
 },[key]);
 useEffect(()=>{if(!loaded)return;const timer=setTimeout(()=>{try{if(entries.length)localStorage.setItem(key,JSON.stringify(entries));else localStorage.removeItem(key);}catch{setError('Der Entwurfsspeicher ist voll. Bitte mit „Fertig“ sichern, bevor du die Seite verlässt.');}},0);return()=>clearTimeout(timer);},[entries,key,loaded]);
 useEffect(()=>{function unload(e:BeforeUnloadEvent){if(entries.length)e.preventDefault();}window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[entries.length]);
 useEffect(()=>{
  const el=root.current;if(!el||!enabled)return;
  function stylus(event:TouchEvent){if([...event.changedTouches].some(t=>(t as Touch&{touchType?:string}).touchType==='stylus'))event.preventDefault();}
  el.addEventListener('touchstart',stylus,{passive:false});el.addEventListener('touchmove',stylus,{passive:false});
  return()=>{el.removeEventListener('touchstart',stylus);el.removeEventListener('touchmove',stylus);};
 },[enabled]);
 function update(entry:Entry){setEntries(old=>old.map(e=>e.id===entry.id?entry:e));setError('');}
 function add(anchor:Anchor){
  if(entries.length>=100){setError('Bitte sichere zuerst diese 100 Markierungen.');return;}
  const duplicate=entries.find(e=>JSON.stringify(e.anchor)===JSON.stringify(anchor)&&e.pencil.color===color);
  if(duplicate){setActiveId(duplicate.id);return;}
  const entry:Entry={id:crypto.randomUUID(),anchor,pencil:{color,meaning:meaning(color),ink:[],transcription:'none'},body:''};
  setEntries(old=>[...old,entry]);setActiveId(entry.id);setError('');
 }
 function down(e:PointerEvent<HTMLDivElement>){
  if(!enabled||!loaded||busy||e.pointerType==='touch'||(e.pointerType!=='pen'&&e.pointerType!=='mouse'))return;
  if(!(e.target as Element).closest('[data-text]'))return;
  e.preventDefault();e.stopPropagation();window.getSelection()?.removeAllRanges();
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Older WebKit can reject capture; in-bounds drawing still works. */}
  const r=e.currentTarget.getBoundingClientRect();
  gesture.current={id:e.pointerId,points:[{x:e.pageX,y:e.pageY}],boxes:wordBoxes(e.currentTarget),origin:{x:r.left+window.scrollX,y:r.top+window.scrollY}};
  liveLine.current?.setAttribute('points','');
 }
 function end(e:PointerEvent<HTMLDivElement>){
  const g=gesture.current;if(g?.id!==e.pointerId)return;
  gesture.current=null;liveLine.current?.setAttribute('points','');
  if(e.type==='pointercancel'){setError('Markiergeste unterbrochen. Ziehe erneut über die Wörter.');return;}
  const anchor=strokeAnchor(section,g.points,g.boxes);if(anchor)add(anchor);else setError('Ziehe den Stift direkt über die Wörter.');
 }
 async function finish(){
  if(busy||!entries.length)return;const controller=new AbortController();operation.current=controller;setBusy(true);setError('');let next=[...entries];
  try{
   for(let i=0;i<next.length;i++){
    const entry=next[i];if(!entry.pencil.ink.length||entry.pencil.transcription!=='pending')continue;
    const response=await fetch('/api/handwriting',{method:'POST',headers:{'Content-Type':'application/json','X-Leseraum-Device':deviceId()},signal:controller.signal,body:JSON.stringify({image:await imageOf(entry.pencil.ink)})});
    const data=await response.json();if(!response.ok)throw new Error(data.error??'Handschrifterkennung fehlgeschlagen. Dein Entwurf bleibt erhalten.');
    next=next.map(e=>e.id===entry.id?{...e,body:String(data.text),pencil:{...e.pencil,transcription:'recognized',uncertain:!!data.uncertain}}:e);
    setEntries(next);
    // Persist each recognition immediately: later failures never discard previous results.
    localStorage.setItem(key,JSON.stringify(next));
    if(data.uncertain)onSaved('Unsichere Handschrift: Bitte prüfe die erkannte Notiz in „Meine Notizen“.');
   }
   if(controller.signal.aborted)return;
   const now=new Date().toISOString();
   await saveLocalNotes(next.map(e=>({...e,workId:book.id,editionId:book.editionId,kind:'note',createdAt:now,updatedAt:now})));
   setEntries([]);setActiveId('');localStorage.removeItem(key);onSaved(`${next.length} Markierung${next.length===1?'':'en'} mit Notizen auf diesem Gerät gespeichert.${next.some(e=>e.pencil.uncertain)?' Bitte prüfe die unsichere Handschrift im Notizbuch.':''}`);onToggle();
  }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{if(!controller.signal.aborted)setBusy(false);}
 }
 const preview=entries.map(e=>({...e,workId:book.id,editionId:book.editionId,kind:'note' as const,createdAt:'',updatedAt:''}));
 return <>
  <div ref={root} className={enabled?'pencil-text active':'pencil-text'} onPointerOverCapture={e=>{if(root.current&&enabled&&!gesture.current)root.current.style.touchAction=e.pointerType==='pen'?'none':'pan-y pinch-zoom';}} onPointerDownCapture={down} onPointerMoveCapture={e=>{const g=gesture.current;if(g?.id!==e.pointerId)return;e.preventDefault();const events=e.nativeEvent.getCoalescedEvents?.()??[e.nativeEvent];for(const p of events)if(g.points.length<6000)g.points.push({x:p.pageX,y:p.pageY});liveLine.current?.setAttribute('points',g.points.map(p=>`${p.x-g.origin.x},${p.y-g.origin.y}`).join(' '));}} onPointerUpCapture={end} onPointerCancelCapture={end} onLostPointerCapture={end} onClickCapture={e=>{if(enabled){e.preventDefault();e.stopPropagation();}}}>
   {children(preview)}
   <svg className="pencil-live" aria-hidden="true"><polyline ref={liveLine} stroke={pencilPalette[color].ink} strokeOpacity="0.4" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
  </div>
  {enabled&&<section className="pencil-workspace" aria-label="Apple Pencil Werkzeuge" aria-busy={busy}>
   <div className="pencil-toolbar"><span className="pencil-title"><ApplePencilIcon size={20}/>Apple Pencil</span><div className="pencil-colors" role="group" aria-label="Markierungsfarbe">{pencilColors.map(c=><button key={c} disabled={busy} style={{background:pencilPalette[c].fill}} aria-label={`${pencilPalette[c].name}: ${meaning(c)}`} aria-pressed={color===c} title={meaning(c)} onClick={()=>setColor(c)}>{color===c?<Check size={17}/>:<span className="sr-only">{pencilPalette[c].name}</span>}</button>)}</div><button className="icon-button" disabled={busy} aria-label={expanded?'Schreibfläche einklappen':'Schreibfläche öffnen'} onClick={()=>setExpanded(!expanded)}>{expanded?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button><button className="primary-button" onClick={()=>void finish()} disabled={busy||!entries.length}>{busy?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>} {busy?'Erkennen …':'Fertig'}</button><button className="icon-button" disabled={busy} aria-label="Pencil-Modus schließen, Entwürfe behalten" onClick={onToggle}><X size={18}/></button></div>
   {expanded&&<div className="pencil-detail"><p className="small-note">Mit dem Pencil über Wörter streichen. Mit dem Finger im Text scrollen. Handschrift wird bei „Fertig“ erkannt.</p>
    <details className="pencil-meanings"><summary>Farbbedeutungen anpassen</summary>{pencilColors.map(c=><label key={c}><i style={{background:pencilPalette[c].fill}}/>{pencilPalette[c].name}<input aria-label={`Bedeutung für ${pencilPalette[c].name}`} maxLength={80} defaultValue={meaning(c)} key={meaning(c)} onBlur={e=>{const value=e.target.value.trim()||pencilPalette[c].meaning;setEntries(old=>old.map(entry=>entry.pencil.color===c?{...entry,pencil:{...entry.pencil,meaning:value}}:entry));void saveLocalPreferences({...prefs,pencilMeanings:{...prefs.pencilMeanings,[c]:value}}).catch(e=>setError(e.message));}}/></label>)}</details>
    {!!selection&&<button className="text-button" disabled={busy} onClick={()=>add(selection)}><Highlighter size={15}/>Aktuelle Textauswahl übernehmen</button>}
    {entries.length>0?<><label className="pencil-target">Notiz zu Markierung<select aria-label="Markierung für Handschrift auswählen" disabled={busy} value={active?.id??''} onChange={e=>setActiveId(e.target.value)}>{entries.map((e,i)=><option key={e.id} value={e.id}>{i+1}. {pencilPalette[e.pencil.color].name} · {e.anchor.quote.slice(0,55)}</option>)}</select></label>
    {active&&<div key={active.id}><div className="pencil-excerpt"><i style={{background:pencilPalette[active.pencil.color].fill}}/><span>{referenceLabel(section,active.anchor)} · {active.pencil.meaning}</span><button className="icon-button" aria-label="Markierungsentwurf entfernen" disabled={busy} onClick={()=>setEntries(old=>old.filter(e=>e.id!==active.id))}><Trash2 size={15}/></button></div><blockquote>{active.anchor.quote.slice(0,140)}</blockquote>
     <InkPad ink={active.pencil.ink} disabled={busy} onChange={ink=>update({...active,pencil:{...active.pencil,ink,transcription:ink.length?'pending':'none'}})}/>
     <textarea aria-label="Notiz zur Pencil-Markierung" placeholder="Alternativ eine Notiz eintippen" maxLength={12000} value={active.body} disabled={busy} onChange={e=>update({...active,body:e.target.value,pencil:{...active.pencil,transcription:'manual',uncertain:false}})}/>
     {!!active.body&&active.pencil.transcription==='manual'&&<p className="small-note">Der eingegebene Text wird gespeichert. Handschrift bleibt als Original erhalten.</p>}
    </div>}</>:<p className="pencil-empty">Markiere zuerst eine Textstelle. Danach kannst du eine zugehörige Notiz schreiben.</p>}
    <p className="small-note">„Fertig“ sendet ausschließlich die Schreibfläche zur KI-Erkennung über OpenRouter. Originalschrift und Notiz bleiben lokal gespeichert.</p>
   </div>}
   {error&&<p className="inline-error pencil-error" role="alert">{error}</p>}
  </section>}
 </>;
}
