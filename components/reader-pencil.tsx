'use client';
import {createPortal} from 'react-dom';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type PointerEvent,type ReactNode} from 'react';
import {Check,Highlighter,LoaderCircle,RotateCcw,X,Settings2,PenLine,Eraser} from 'lucide-react';
import {z} from 'zod';
import type {Anchor,Book,SavedNote,Section} from '@/lib/reader-model';
import {referenceLabel} from '@/lib/reader-model';
import {saveLocalNotes,saveLocalPreferences} from '@/lib/local-storage';
import type {Prefs} from '@/lib/preferences';
import {portableAnchorSchema} from '@/lib/local-model';
import {inkPath,pencilAnnotationSchema,pencilColors,pencilPalette,strokeAnchor,type InkStroke,type PencilColor,type WordBox} from '@/lib/pencil-model';
import {addPageStroke,boxDistance,combineInk,croppedInk,inkBounds,linkInk,pageInkGroupSchema,projectedInk,type InkLayout,type PageInkGroup} from '@/lib/page-handwriting';
import {eraseHighlightedWords,erasePageLines} from '@/lib/pencil-eraser';
import {inkTargets,wordBoxes} from '@/lib/pencil-dom';
import {offersAppleScribble,PENCIL_HANDWRITING_HINT_KEY} from '@/lib/pencil-browser';
import {PencilHandwritingHint} from './pencil-handwriting-hint';
const entrySchema=z.object({id:z.string(),anchor:portableAnchorSchema,pencil:pencilAnnotationSchema,body:z.string().max(12000),createdAt:z.string().optional(),prefix:z.string().optional(),recognizedInk:z.string().optional(),order:z.number().optional()});
const entriesSchema=z.array(entrySchema).max(100);
const draftSchema=z.union([z.object({version:z.literal(2),entries:entriesSchema,groups:z.array(pageInkGroupSchema).max(100)}),entriesSchema.transform(entries=>({version:2 as const,entries,groups:[] as PageInkGroup[]}))]);
type Entry=z.infer<typeof entrySchema>;
type Props={contentAnchor?:string;toolbarHost:HTMLElement|null;dismissMenusKey:number;onPopover:()=>void;practice?:boolean;onPractice?:(kind:'mark'|'ink'|'erase',data?:{anchor?:Anchor;color?:PencilColor;body?:string})=>void;book:Book;section:Section;prefs:Prefs;selection:Anchor|null;savedNotes:SavedNote[];enabled:boolean;onToggle:()=>void;onSaved:(message:string)=>void;children:(drafts:SavedNote[],afterBlock:Record<string,ReactNode>)=>ReactNode};
export function ReaderPencil({contentAnchor,toolbarHost,dismissMenusKey,onPopover,practice=false,onPractice,book,section,prefs,selection,savedNotes,enabled,onToggle,onSaved,children}:Props){
 const liveLine=useRef<SVGPathElement>(null),root=useRef<HTMLDivElement>(null);
 const continueWriting=useRef(false);
 const gesture=useRef<{id:number;points:InkStroke;boxes:WordBox[];startedOnText:boolean;origin:{x:number;y:number}}|null>(null);
 const [entries,setEntries]=useState<Entry[]>([]),[groups,setGroups]=useState<PageInkGroup[]>([]),[color,setColor]=useState<PencilColor>('green'),[settings,setSettings]=useState(false),[palette,setPalette]=useState(false),[writing,setWriting]=useState(false),[erasing,setErasing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const [scribble,setScribble]=useState(false),[hint,setHint]=useState(false);
 const [hintAcknowledged,setHintAcknowledged]=useState(false);
 const [history,setHistory]=useState<{entries:Entry[];groups:PageInkGroup[]}[]>([]);
 const [layout,setLayout]=useState<InkLayout>({width:640,fontSize:20,tops:{}});
 const inkHitBoxes=useMemo(()=>groups.flatMap(group=>projectedInk(group,layout).map(stroke=>inkBounds(stroke))),[groups,layout]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{setSettings(false);setPalette(false);setHint(false);});return()=>cancelAnimationFrame(frame);},[dismissMenusKey]);
 const key=`buchtutor-pencil-draft:${book.id}:${book.editionId}:${section.id}`;
 const meaning=(c:PencilColor)=>prefs.pencilMeanings?.[c]??pencilPalette[c].meaning;
 const eligible=useMemo(()=>[...savedNotes.filter(n=>n.pencil&&!entries.some(e=>e.id===n.id)),...entries],[savedNotes,entries]);
 const latest=useRef({eligible,section});useLayoutEffect(()=>{latest.current={eligible,section}},[eligible,section]);

 useEffect(()=>{if(enabled)return;const frame=requestAnimationFrame(()=>{setSettings(false);setPalette(false);});return()=>cancelAnimationFrame(frame);},[enabled]);
 function measure():InkLayout{
  const el=root.current;if(!el)return layout;const rect=el.getBoundingClientRect(),tops:Record<string,number>={};
  for(const row of el.querySelectorAll<HTMLElement>('[data-block]'))tops[row.dataset.block!]=row.getBoundingClientRect().top-rect.top;
  el.style.setProperty('--ink-page-left',(12-rect.left)+'px');el.style.setProperty('--ink-page-width',Math.max(1,document.documentElement.clientWidth-24)+'px');
  return {minX:12-rect.left,maxX:document.documentElement.clientWidth-12-rect.left,width:Math.max(1,rect.width),fontSize:parseFloat(getComputedStyle(el).getPropertyValue('--text-size'))||20,tops};
 }
 const refresh=useCallback(()=>{
  const el=root.current;if(!el)return;const rect=el.getBoundingClientRect(),tops:Record<string,number>={};
  for(const row of el.querySelectorAll<HTMLElement>('[data-block]'))tops[row.dataset.block!]=row.getBoundingClientRect().top-rect.top;
  el.style.setProperty('--ink-page-left',(12-rect.left)+'px');el.style.setProperty('--ink-page-width',Math.max(1,document.documentElement.clientWidth-24)+'px');
  const next={minX:12-rect.left,maxX:document.documentElement.clientWidth-12-rect.left,width:Math.max(1,rect.width),fontSize:parseFloat(getComputedStyle(el).getPropertyValue('--text-size'))||20,tops};setLayout(next);
  const targets=inkTargets(el,latest.current.section,latest.current.eligible);setGroups(old=>linkInk(old,next,targets));
 },[]);
 useLayoutEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   try{const draft=draftSchema.parse(practice?[]:JSON.parse(localStorage.getItem(key)??'[]'));setEntries(draft.entries);setGroups(draft.groups);}catch{setError('Ein älterer Handschriftentwurf konnte nicht gelesen werden.');}
   setScribble(offersAppleScribble(navigator.userAgent,navigator.maxTouchPoints));setLoaded(true);refresh();
  });return()=>cancelAnimationFrame(frame);
 },[key,refresh,practice]);
 useLayoutEffect(()=>{const frame=requestAnimationFrame(refresh);return()=>cancelAnimationFrame(frame);},[entries,enabled,prefs.fontSize,prefs.lineHeight,prefs.font,contentAnchor,refresh]);
 useEffect(()=>{
  let frame=0;const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh);};const observer=new ResizeObserver(schedule);
  if(root.current){
   observer.observe(root.current);
   // A docked rail can move a centered page without changing the text's width.
   // Keep the full-page writing surface aligned with the new page position too.
   const main=root.current.closest('.reading-main');if(main)observer.observe(main);
  }
  window.addEventListener('resize',schedule);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);};
 },[refresh]);
 useEffect(()=>{if(!loaded||practice)return;const timer=setTimeout(()=>{try{if(entries.length||groups.length)localStorage.setItem(key,JSON.stringify({version:2,entries,groups}));else localStorage.removeItem(key);}catch{setError('Der Entwurfsspeicher ist voll. Bitte mit „Fertig“ sichern, bevor du die Seite verlässt.');}},0);return()=>clearTimeout(timer);},[entries,groups,key,loaded,practice]);
 useEffect(()=>{function unload(e:BeforeUnloadEvent){if(!practice&&(entries.length||groups.length))e.preventDefault();}window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[entries.length,groups.length,practice]);
 useEffect(()=>{
  const el=root.current;if(!el||!enabled)return;
  function stylus(event:TouchEvent){if((event.target as Element).closest('[data-pencil-input]'))return;if([...event.changedTouches].some(t=>(t as Touch&{touchType?:string}).touchType==='stylus'))event.preventDefault();}
  el.addEventListener('touchstart',stylus,{passive:false});el.addEventListener('touchmove',stylus,{passive:false});
  return()=>{el.removeEventListener('touchstart',stylus);el.removeEventListener('touchmove',stylus);};
 },[enabled]);
 function showHandwritingInfo(){
  if(practice||hintAcknowledged)return;try{if(localStorage.getItem(PENCIL_HANDWRITING_HINT_KEY)==='1')return;}catch{/* The notice remains dismissible without storage. */}onPopover();setSettings(false);setPalette(false);setHint(true);
 }
 function dismissHandwritingInfo(){setHintAcknowledged(true);setHint(false);try{localStorage.setItem(PENCIL_HANDWRITING_HINT_KEY,'1');}catch{/* Optional device-only notice state. */}}
 function remember(){setHistory(old=>[...old.slice(-29),{entries,groups}]);}
 function add(anchor:Anchor){continueWriting.current=false;
  if(entries.length>=100){setError('Bitte sichere zuerst diese 100 Markierungen.');return;}
  const duplicate=entries.find(e=>JSON.stringify(e.anchor)===JSON.stringify(anchor)&&e.pencil.color===color);
  if(duplicate){if(duplicate.pencil.erasedRanges?.length){remember();setEntries(old=>old.map(e=>e.id===duplicate.id?{...e,pencil:{...e.pencil,erasedRanges:[]}}:e));setError('');}return;}
  remember();setEntries(old=>[...old,{id:crypto.randomUUID(),anchor,pencil:{color,meaning:meaning(color),ink:[],transcription:'none'},body:'',order:Date.now()}]);setError('');if(practice)onPractice?.('mark',{anchor,color});
 }
 function down(e:PointerEvent<HTMLDivElement>){
  if((e.target as Element).closest('[data-pencil-input]'))return;
  if(!enabled||!loaded||busy||gesture.current||e.pointerType==='touch'||!['pen','mouse'].includes(e.pointerType))return;
  e.preventDefault();e.stopPropagation();window.getSelection()?.removeAllRanges();
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* In-bounds drawing remains usable without capture. */}
  const rect=e.currentTarget.getBoundingClientRect();
  gesture.current={id:e.pointerId,points:[{x:e.pageX,y:e.pageY,pressure:e.pressure||.5}],boxes:wordBoxes(e.currentTarget),startedOnText:!!(e.target as Element).closest('[data-text]'),origin:{x:rect.left+window.scrollX,y:rect.top+window.scrollY}};
  liveLine.current?.setAttribute('d','');
 }
 function isHandwriting(g:NonNullable<typeof gesture.current>){
  if(writing||!g.startedOnText)return true;const local={x:g.points[0].x-g.origin.x,y:g.points[0].y-g.origin.y};
  const bounds=inkBounds(g.points);if(bounds.right-bounds.left>layout.fontSize*1.2&&bounds.bottom-bounds.top<3)return false;
  if(continueWriting.current&&inkHitBoxes.some(box=>boxDistance(inkBounds([local]),box)<=layout.fontSize*1.7))return true;
  const box=inkBounds(g.points);
  return box.bottom-box.top>layout.fontSize*1.3||box.right-box.left<layout.fontSize*.5;
 }
 function move(e:PointerEvent<HTMLDivElement>){
  const g=gesture.current;if(g?.id!==e.pointerId)return;e.preventDefault();
  const samples=e.nativeEvent.getCoalescedEvents?.(),events=samples?.length?samples:[e.nativeEvent];
  for(const p of events)if(g.points.length<3000)g.points.push({x:p.pageX,y:p.pageY,pressure:p.pressure||.5});
  if(erasing){liveLine.current?.setAttribute('d',inkPath(g.points.map(p=>({...p,x:p.x-g.origin.x,y:p.y-g.origin.y}))));liveLine.current?.setAttribute('stroke','#64748b');liveLine.current?.setAttribute('stroke-width','20');liveLine.current?.setAttribute('stroke-opacity','.25');return;}
  const ink=isHandwriting(g);liveLine.current?.setAttribute('d',inkPath(g.points.map(p=>({...p,x:p.x-g.origin.x,y:p.y-g.origin.y}))));liveLine.current?.setAttribute('stroke',ink?'#314d43':pencilPalette[color].ink);liveLine.current?.setAttribute('stroke-width',ink?'2.5':'18');liveLine.current?.setAttribute('stroke-opacity',ink?'1':'.4');
 }
 function end(e:PointerEvent<HTMLDivElement>){
  const g=gesture.current;if(g?.id!==e.pointerId)return;gesture.current=null;liveLine.current?.setAttribute('d','');
  if(e.type==='pointercancel'){setError('Strich unterbrochen. Schreibe oder markiere erneut.');return;}
  if(e.type==='pointerup'&&g.points.length<3000)g.points.push({x:e.pageX,y:e.pageY,pressure:e.pressure||.5});
  if(erasing){erase(g);return;}
  if(!isHandwriting(g)){
   const anchor=strokeAnchor(section,g.points,g.boxes);if(anchor){add(anchor);return;}
  }
  if(groups.reduce((n,group)=>n+group.strokes.length,0)>=1200){setError('Bitte sichere zuerst die bisherige Handschrift.');return;}
  const current=measure(),points=g.points.map(p=>({...p,x:p.x-g.origin.x,y:p.y-g.origin.y})),targets=root.current?inkTargets(root.current,section,eligible):[];
  const first=points[0],referenceId=Object.entries(current.tops).sort((a,b)=>Math.abs(a[1]-first.y)-Math.abs(b[1]-first.y))[0]?.[0];if(!referenceId)return;
  showHandwritingInfo();remember();continueWriting.current=true;setGroups(old=>addPageStroke(old,points,current,targets,referenceId));setLayout(current);setError('');if(practice)onPractice?.('ink');
 }
 function erase(g:NonNullable<typeof gesture.current>){
  const current=measure(),points=g.points.map(p=>({x:p.x-g.origin.x,y:p.y-g.origin.y})),nextGroups=erasePageLines(groups,current,points);
  let next=[...entries],changed=nextGroups!==groups;
  for(const note of eligible){
   if(!note.pencil)continue;const pencil=eraseHighlightedWords(section,note.anchor,note.pencil,g.points,g.boxes);if(pencil===note.pencil)continue;
   changed=true;const existing=next.find(e=>e.id===note.id);
   if(existing)next=next.map(e=>e.id===note.id?{...e,pencil}:e);
   else next.push({id:note.id,anchor:note.anchor,pencil,body:note.body,prefix:note.body,createdAt:note.createdAt});
  }
  if(!changed)return;
  if(next.length>100){setError('Bitte sichere zuerst die bisherigen Änderungen.');return;}
  // OCR results belong to an exact set of strokes. Erasing must not retain stale text.
  const surviving=new Set(nextGroups.flatMap(group=>group.strokes.map(stroke=>stroke.id)));
  const affected=new Set(groups.filter(group=>group.strokes.some(stroke=>!surviving.has(stroke.id))).map(group=>group.targetId));
  next=next.map(entry=>{
   if(!entry.recognizedInk||!affected.has(entry.id))return entry;
   const original=savedNotes.find(note=>note.id===entry.id)?.pencil;
   return {...entry,recognizedInk:undefined,body:entry.prefix??'',pencil:{...entry.pencil,ink:original?.ink??[],inkWidth:original?.inkWidth,inkHeight:original?.inkHeight,transcription:original?.transcription??'none',uncertain:original?.uncertain}};
  });
  remember();setEntries(next);setGroups(nextGroups);setLayout(current);setError('');if(practice)onPractice?.('erase');
 }
 function undo(){
  const previous=history.at(-1);if(previous){setEntries(previous.entries);setGroups(previous.groups);setHistory(old=>old.slice(0,-1));setError('');return;}
  const strokes=groups.flatMap(g=>g.strokes.map(s=>({groupId:g.id,...s}))).sort((a,b)=>b.order-a.order),last=strokes[0],mark=entries.at(-1);
  if(last&&last.order>=(mark?.order??0))setGroups(old=>old.map(g=>g.id===last.groupId?{...g,strokes:g.strokes.filter(s=>s.id!==last.id)}:g).filter(g=>g.strokes.length));else setEntries(old=>old.slice(0,-1));setError('');
 }
 function changeNativeNote(note:typeof eligible[number],body:string){
  if(!note.pencil)return;showHandwritingInfo();remember();if(practice&&body.trim())onPractice?.('ink',{anchor:note.anchor,color:note.pencil.color,body});
  const existing=entries.find(e=>e.id===note.id),entry:Entry={...existing,id:note.id,anchor:note.anchor,body,pencil:{...note.pencil,transcription:body.trim()?'manual':'none',uncertain:false},createdAt:existing?.createdAt??note.createdAt};
  setEntries(old=>[...old.filter(e=>e.id!==note.id),entry]);setError('');
 }
 const inlineNotes:Record<string,ReactNode>={};
 if(scribble&&enabled)for(const blockId of new Set(eligible.map(note=>note.anchor.endId)))inlineNotes[blockId]=eligible.filter(note=>note.anchor.endId===blockId).map(note=><label key={note.id} className="pencil-inline-note" data-pencil-input style={{borderColor:pencilPalette[note.pencil!.color].ink}}><span>{referenceLabel(section,note.anchor)} · {note.pencil!.meaning}</span><textarea data-pencil-input aria-label={`Notiz zu ${referenceLabel(section,note.anchor)}`} placeholder="Mit Apple Pencil schreiben …" rows={2} maxLength={12000} value={note.body} disabled={busy} onPointerDown={e=>{if(e.pointerType==='pen')showHandwritingInfo();}} onChange={e=>changeNativeNote(note,e.target.value)}/></label>);
 async function finish(){
  if(practice||busy||!loaded||!entries.length&&!groups.length)return;
  setPalette(false);setSettings(false);setHint(false);
  const current=measure(),linked=linkInk(groups,current,root.current?inkTargets(root.current,section,eligible):[]);
  if(linked.some(g=>!g.targetId)){setError('Eine Handschrift hat noch keine nahe Markierung. Markiere die passende Stelle daneben oder entferne den Strich mit Rückgängig. Dein Entwurf bleibt erhalten.');return;}
  setBusy(true);setError('');
  try{
   const next=[...entries];
   for(const group of linked){
    if(next.some(e=>e.id===group.targetId))continue;const saved=savedNotes.find(n=>n.id===group.targetId);if(!saved?.pencil)continue;
    next.push({id:saved.id,anchor:saved.anchor,pencil:saved.pencil,body:saved.body,createdAt:saved.createdAt});
   }
   const now=new Date().toISOString();
   const notes=next.map(({recognizedInk,prefix:_,order:__,...entry})=>{
    void _;void __;
    const related=linked.filter(group=>group.targetId===entry.id),signature=related.map(g=>g.strokes.map(s=>s.id).join(',')).join(';');
    const added=related.length&&recognizedInk!==signature?croppedInk(related.flatMap(group=>projectedInk(group,current))):null;
    const baseline=recognizedInk?savedNotes.find(note=>note.id===entry.id)?.pencil??{ink:[] as InkStroke[]}:entry.pencil;
    const fullInk=added?combineInk(baseline,added):entry.pencil;
    if(fullInk.ink.length>1200)throw new Error('Diese Notiz enthält zu viele Schriftstriche. Ordne weitere Handschrift einer neuen Markierung zu. Dein Entwurf bleibt erhalten.');
    return {...entry,pencil:{...entry.pencil,...fullInk,transcription:added||entry.pencil.transcription==='pending'?'none' as const:entry.pencil.transcription},workId:book.id,editionId:book.editionId,kind:'note' as const,createdAt:entry.createdAt??now,updatedAt:now};
   });
   await saveLocalNotes(notes);
   setEntries([]);setGroups([]);setHistory([]);localStorage.removeItem(key);onSaved(`${notes.length} Eintrag${notes.length===1?'':'e'} auf diesem Gerät gespeichert.`);onToggle();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const preview=entries.map(e=>({...e,workId:book.id,editionId:book.editionId,kind:'note' as const,createdAt:'',updatedAt:''}));
 const pageInk=groups.map(group=>({group,strokes:projectedInk(group,layout),target:eligible.find(e=>e.id===group.targetId)}));
 return <>
  <div ref={root} className={enabled?'pencil-text active page-writing-surface':'pencil-text'} data-writing={writing} data-erasing={erasing} onPointerOverCapture={e=>{if(root.current&&enabled&&!gesture.current)root.current.style.touchAction=(e.target as Element).closest('[data-pencil-input]')?'auto':e.pointerType==='pen'?'none':'pan-y pinch-zoom';}} onPointerDownCapture={down} onPointerMoveCapture={move} onPointerUpCapture={end} onPointerCancelCapture={end} onLostPointerCapture={end} onClickCapture={e=>{if(enabled&&!(e.target as Element).closest('[data-pencil-input]')){e.preventDefault();e.stopPropagation();}}}>
   {children(enabled||practice?preview:[],inlineNotes)}
   {enabled&&<svg className="pencil-page-ink" role="img" aria-label="Handschrift auf der Seite">{pageInk.map(({group,strokes,target})=>{const box=inkBounds(strokes.flat());return <g key={group.id} data-ink-group={group.id} data-ink-target={target?.id??''}>{strokes.map((stroke,i)=><path key={group.strokes[i].id} d={inkPath(stroke)} stroke="#314d43" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>)}<text x={box.left} y={box.bottom+16} className="pencil-ink-label">{target?`↳ ${referenceLabel(section,target.anchor)}`:'Keine nahe Markierung'}</text></g>;})}</svg>}
   <svg className="pencil-live" aria-hidden="true"><path ref={liveLine} stroke="#314d43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
  </div>
  {enabled&&toolbarHost&&createPortal(<section className="pencil-workspace" aria-label="Apple Pencil Werkzeuge" aria-busy={busy}>
    {settings&&<div className="pencil-settings pencil-popover"><div className="pencil-sheet-heading"><strong>Pencil-Einstellungen</strong><button className="icon-button" aria-label="Farbbedeutungen schließen" onClick={()=>setSettings(false)}><X size={17}/></button></div><strong className="pencil-settings-label">Farbbedeutungen</strong><div className="pencil-meanings">{pencilColors.map(c=><label key={c}><i style={{background:pencilPalette[c].fill}}/><span>{pencilPalette[c].name}</span><input aria-label={`Bedeutung für ${pencilPalette[c].name}`} maxLength={80} defaultValue={meaning(c)} key={meaning(c)} onBlur={e=>{const value=e.target.value.trim()||pencilPalette[c].meaning;setEntries(old=>old.map(entry=>entry.pencil.color===c?{...entry,pencil:{...entry.pencil,meaning:value}}:entry));void saveLocalPreferences({...prefs,pencilMeanings:{...prefs.pencilMeanings,[c]:value}}).catch(e=>setError(e.message));}}/></label>)}</div><p className="small-note">Handschrift und Notizen bleiben auf deinem Gerät. In Safari auf dem iPad wandelt Apple „Kritzeln“ Schrift im Notizfeld kostenlos in Text um.</p>{!!selection&&<button className="text-button" onClick={()=>add(selection)}><Highlighter size={14}/>Textauswahl übernehmen</button>}</div>}
    {palette&&<div className="pencil-mobile-palette pencil-popover" role="group" aria-label="Markierungsfarbe wählen">{pencilColors.map(c=><button key={c} aria-label={`${pencilPalette[c].name}: ${meaning(c)}`} onClick={()=>{setColor(c);setWriting(false);setErasing(false);continueWriting.current=false;setPalette(false);}}><i style={{background:pencilPalette[c].fill}}/><span>{pencilPalette[c].name}</span>{color===c&&<Check size={15}/>}</button>)}<p className="pencil-palette-meaning">{meaning(color)}</p><button className="pencil-meanings-trigger" aria-label="Farbbedeutungen anpassen" disabled={busy||practice} onClick={()=>{setSettings(true);setPalette(false);setHint(false);}}><Settings2 size={16}/>Farbbedeutungen</button></div>}
    <div className="pencil-toolbar">

     <div className="pencil-colors" role="group" aria-label="Markierungsfarbe">{pencilColors.map(c=><button key={c} disabled={busy} style={{background:pencilPalette[c].fill}} aria-label={`${pencilPalette[c].name}: ${meaning(c)}`} aria-pressed={color===c&&!writing&&!erasing} title={meaning(c)} onClick={()=>{setColor(c);setWriting(false);setErasing(false);continueWriting.current=false;}}>{color===c&&!writing&&!erasing?<Check size={16}/>:<span className="sr-only">{pencilPalette[c].name}</span>}</button>)}</div>
     <button className="pencil-color-menu icon-button" aria-label="Markierungsfarbe wählen" aria-expanded={palette} aria-pressed={!writing&&!erasing} title={`${pencilPalette[color].name} · ${meaning(color)}`} disabled={busy} onClick={()=>{onPopover();setPalette(!palette);setSettings(false);setHint(false);}}><i style={{background:pencilPalette[color].fill}}><Highlighter size={16}/></i></button>
     <span className="pencil-divider"/>
     <button className={'icon-button pencil-writing-toggle '+(writing?'pressed':'')} disabled={busy} aria-label="Auf der Seite schreiben" title="Direkt neben Markierungen schreiben. Hier aktivieren, um auch über dem Text zu schreiben." aria-pressed={writing} onClick={()=>{setWriting(!writing);setErasing(false);setPalette(false);setSettings(false);}}><PenLine size={19}/></button>
     <button className={'icon-button pencil-eraser '+(erasing?'pressed':'')} disabled={busy} aria-label="Radiergummi" title="Ganze Wortmarkierungen und getroffene Schriftstriche entfernen. Verknüpfte Notizen bleiben erhalten." aria-pressed={erasing} onClick={()=>{setErasing(!erasing);setWriting(false);continueWriting.current=false;setPalette(false);setSettings(false);}}><Eraser size={19}/></button>
     <button className="icon-button pencil-undo" disabled={busy||!history.length&&!entries.length&&!groups.length} aria-label="Letzten Strich entfernen" title="Rückgängig" onClick={undo}><RotateCcw size={18}/></button>

     <span className="pencil-divider"/>
     <button className="pencil-done" aria-label={busy?'Speichern …':'Fertig'} title="Markierungen, Notiztext und Originalhandschrift auf diesem Gerät speichern" onClick={()=>void finish()} disabled={practice||busy||!entries.length&&!groups.length}>{busy?<LoaderCircle size={18} className="spin"/>:<Check size={19}/>}<span>{busy?'Speichern …':'Fertig'}</span></button>
    </div>
    {hint&&<div className="pencil-handwriting-hint pencil-popover" role="status"><button className="icon-button" aria-label="Handschrift-Hinweis schließen" onClick={dismissHandwritingInfo}><X size={16}/></button><PencilHandwritingHint scribble={scribble}/></div>}
    {error&&!palette&&!settings&&!hint&&<p className="inline-error pencil-error" role="alert">{error}</p>}
   </section>,toolbarHost)}
 </>;
}
