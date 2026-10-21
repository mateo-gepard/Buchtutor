'use client';
import {createPortal} from 'react-dom';
import {useCallback,useEffect,useEffectEvent,useLayoutEffect,useMemo,useRef,useState,type PointerEvent,type ReactNode} from 'react';
import {Check,Highlighter,LoaderCircle,RotateCcw,X,Settings2,PenLine,Eraser} from 'lucide-react';
import type {Anchor,Book,SavedNote,Section} from '@/lib/reader-model';
import {referenceLabel,validateAnchor} from '@/lib/reader-model';
import {saveLocalNotes,saveLocalPreferences} from '@/lib/local-storage';
import type {Prefs} from '@/lib/preferences';
import {inkPath,pencilColors,pencilPalette,strokeAnchor,type InkStroke,type PencilColor,type WordBox} from '@/lib/pencil-model';
import {addPageStroke,boxDistance,combineInk,croppedInk,inkBounds,linkInk,mergePageInk,projectedInk,uncommittedPageInk,type InkLayout,type PageInkGroup} from '@/lib/page-handwriting';
import {eraseHighlightedWords,erasePageLines,erasePagePrecisely,isEraseScribble} from '@/lib/pencil-eraser';
import {documentGeometry,documentInkLayout,documentPoint,inkTargets,wordBoxes} from '@/lib/pencil-dom';
import {offersAppleScribble,PENCIL_HANDWRITING_HINT_KEY,PENCIL_CLOUD_HINT_KEY} from '@/lib/pencil-browser';
import {PencilEraserOptions} from './pencil-eraser-options';
import {PencilHandwritingHint} from './pencil-handwriting-hint';
import {usePencilDraft,type PencilEntry as Entry} from '@/hooks/use-pencil-draft';
import {recoverCommittedPencilEntry} from '@/lib/pencil-save';
import {setHandwritingCloud} from '@/lib/handwriting-client';
type Props={contentAnchor?:string;toolbarHost:HTMLElement|null;dismissMenusKey:number;onPopover:()=>void;practice?:boolean;onPractice?:(kind:'mark'|'ink'|'erase',data?:{anchor?:Anchor;color?:PencilColor;body?:string})=>void;book:Book;section:Section;prefs:Prefs;selection:Anchor|null;savedNotes:SavedNote[];enabled:boolean;onToggle:()=>void;onSaved:(message:string)=>void;children:(drafts:SavedNote[],afterBlock:Record<string,ReactNode>)=>ReactNode};
export function ReaderPencil({contentAnchor,toolbarHost,dismissMenusKey,onPopover,practice=false,onPractice,book,section,prefs,selection,savedNotes,enabled,onToggle,onSaved,children}:Props){
 const liveLine=useRef<SVGPathElement>(null),root=useRef<HTMLDivElement>(null);
 const continueWriting=useRef(false);
 const gesture=useRef<{id:number;strokeId:string;order:number;points:InkStroke;boxes:WordBox[];startedOnText:boolean;layout:InkLayout;referenceId:string;writing:boolean;erasing:boolean;eraserMode:Prefs['eraserMode'];radius:number;lastCheckpoint:number}|null>(null);
 const interruptGesture=useRef<()=>void>(()=>{});
 const [color,setColor]=useState<PencilColor>('green'),[settings,setSettings]=useState(false),[palette,setPalette]=useState(false),[writing,setWriting]=useState(false),[erasing,setErasing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [eraserOptions,setEraserOptions]=useState(false),[eraserChoice,setEraserChoice]=useState<Partial<Pick<Prefs,'eraserMode'|'eraserSize'|'scribbleToErase'>>>({});
 const activeEraser={...prefs,...eraserChoice},menuEpoch=useRef(0);
 const previousWriting=useRef(false),eraserPress=useRef<ReturnType<typeof setTimeout>|null>(null),skipEraserClick=useRef(false);
 const key=`buchtutor-pencil-draft:${book.id}:${book.editionId}:${section.id}`;
 const flushActive=useCallback(()=>interruptGesture.current(),[]);
 const {entries,groups,setEntries,setGroups,loaded,snapshot,checkpoint,acknowledge,recoveries,restore}=usePencilDraft(key,practice,setError,flushActive);
 const [composing,setComposing]=useState(false);
 const composition=useRef(false),saving=useRef(false);
 const [scribble,setScribble]=useState(false),[hint,setHint]=useState(false);
 const [cloudChoice,setCloudChoice]=useState<boolean|null>(null);
 const [hintAcknowledged,setHintAcknowledged]=useState<string|null>(null);
 const hintKey=prefs.handwritingCloud?PENCIL_CLOUD_HINT_KEY:PENCIL_HANDWRITING_HINT_KEY;
 const [history,setHistory]=useState<{entries:Entry[];groups:PageInkGroup[]}[]>([]);
 const [layout,setLayout]=useState<InkLayout>({width:640,fontSize:20,tops:{}});
 useEffect(()=>{const epoch=menuEpoch.current,frame=requestAnimationFrame(()=>{if(epoch!==menuEpoch.current)return;setSettings(false);setPalette(false);setHint(false);setEraserOptions(false);});return()=>cancelAnimationFrame(frame);},[dismissMenusKey]);
 const meaning=(c:PencilColor)=>prefs.pencilMeanings?.[c]??pencilPalette[c].meaning;
 const effectiveEntries=useMemo(()=>entries.map(entry=>recoverCommittedPencilEntry(entry,groups,savedNotes.find(note=>note.id===entry.id),layout)),[entries,groups,savedNotes,layout]);
 const committedGroups=useMemo(()=>savedNotes.flatMap(note=>note.pencil?.pageInk??[]),[savedNotes]);
 const visibleGroups=useMemo(()=>uncommittedPageInk(groups,committedGroups),[groups,committedGroups]);
 const eligible=useMemo(()=>[...savedNotes.filter(n=>n.pencil&&!entries.some(e=>e.id===n.id)),...effectiveEntries],[savedNotes,entries,effectiveEntries]);
 const savedGroups=useMemo(()=>eligible.flatMap(note=>note.pencil?.pageInk??[]),[eligible]);
 const inkHitBoxes=useMemo(()=>[...savedGroups,...visibleGroups].flatMap(group=>projectedInk(group,layout).map(stroke=>inkBounds(stroke))),[visibleGroups,savedGroups,layout]);
 const latest=useRef({eligible,section});useLayoutEffect(()=>{latest.current={eligible,section}},[eligible,section]);

 useEffect(()=>{if(enabled)return;const frame=requestAnimationFrame(()=>{setSettings(false);setPalette(false);setEraserOptions(false);});return()=>cancelAnimationFrame(frame);},[enabled]);
 function measure():InkLayout{
  const el=root.current;if(!el)return layout;
  const {rect,scale}=documentGeometry(el);
  // The writing margin belongs to the document and scales with it, too.
  const minX=Math.min(-36,(12-rect.left)/scale),maxX=Math.max(rect.width/scale+36,(document.documentElement.clientWidth-12-rect.left)/scale);
  el.style.setProperty('--ink-page-left',minX+'px');el.style.setProperty('--ink-page-width',(maxX-minX)+'px');
  return documentInkLayout(el);
 }
 const refresh=useCallback(()=>{
  const el=root.current;if(!el)return;
  const {rect,scale}=documentGeometry(el);
  const minX=Math.min(-36,(12-rect.left)/scale),maxX=Math.max(rect.width/scale+36,(document.documentElement.clientWidth-12-rect.left)/scale);
  el.style.setProperty('--ink-page-left',minX+'px');el.style.setProperty('--ink-page-width',(maxX-minX)+'px');
  const next=documentInkLayout(el);setLayout(next);
  const targets=inkTargets(el,latest.current.section,latest.current.eligible);setGroups(old=>linkInk(old,next,targets));
 },[setGroups]);
 useLayoutEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   setScribble(offersAppleScribble(navigator.userAgent,navigator.maxTouchPoints));refresh();
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
  window.addEventListener('resize',schedule);window.addEventListener('buchtutor-document-layout',schedule);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('buchtutor-document-layout',schedule);};
 },[refresh]);
 useEffect(()=>{function unload(e:BeforeUnloadEvent){if(!practice&&(entries.length||groups.length))e.preventDefault();}window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[entries.length,groups.length,practice]);
 useEffect(()=>{
  const el=root.current;if(!el||!enabled)return;
  function stylus(event:TouchEvent){if((event.target as Element).closest('[data-pencil-input]'))return;if([...event.changedTouches].some(t=>(t as Touch&{touchType?:string}).touchType==='stylus'))event.preventDefault();}
  el.addEventListener('touchstart',stylus,{passive:false});el.addEventListener('touchmove',stylus,{passive:false});
  return()=>{el.removeEventListener('touchstart',stylus);el.removeEventListener('touchmove',stylus);};
 },[enabled]);
 useEffect(()=>{
  if(!eraserOptions)return;
  const outside=(event:globalThis.PointerEvent)=>{if(event.target instanceof Element&&!event.target.closest('.pencil-eraser-options,.pencil-eraser'))setEraserOptions(false);};
  document.addEventListener('pointerdown',outside,true);return()=>document.removeEventListener('pointerdown',outside,true);
 },[eraserOptions]);
 function showHandwritingInfo(){
  if(practice||hintAcknowledged===hintKey)return;try{if(localStorage.getItem(hintKey)==='1')return;}catch{/* The notice remains dismissible without storage. */}setSettings(false);setPalette(false);setHint(true);
 }
 function dismissHandwritingInfo(){setHintAcknowledged(hintKey);setHint(false);try{localStorage.setItem(hintKey,'1');}catch{/* Optional device-only notice state. */}}
 function enableCloud(){void setHandwritingCloud(true).then(dismissHandwritingInfo).catch(e=>setError(e.message));}
 function remember(){setHistory(old=>[...old.slice(-29),{entries,groups}]);}
 function add(anchor:Anchor){continueWriting.current=false;
  if(entries.length>=100){setError('Bitte sichere zuerst diese 100 Markierungen.');return false;}
  const duplicate=entries.find(e=>JSON.stringify(e.anchor)===JSON.stringify(anchor)&&e.pencil.color===color);
  if(duplicate){if(duplicate.pencil.erasedRanges?.length){remember();setEntries(old=>old.map(e=>e.id===duplicate.id?{...e,pencil:{...e.pencil,erasedRanges:[]}}:e));setError('');}return true;}
  remember();setError('');setEntries(old=>[...old,{id:crypto.randomUUID(),anchor,pencil:{color,meaning:meaning(color),ink:[],transcription:'none'},body:'',order:Date.now()}]);if(practice)onPractice?.('mark',{anchor,color});return true;
 }
 function down(e:PointerEvent<HTMLDivElement>){
  if((e.target as Element).closest('[data-pencil-input]'))return;
  const hardwareEraser=e.pointerType==='pen'&&(e.button===5||(e.buttons&32)!==0);
  if(!enabled||!loaded||busy||gesture.current||!['pen','mouse'].includes(e.pointerType)||e.button>0&&!hardwareEraser)return;
  e.preventDefault();e.stopPropagation();window.getSelection()?.removeAllRanges();
  const el=e.currentTarget,current=documentInkLayout(el),point=documentPoint(el,e);
  const {rect:origin,scale}=documentGeometry(el);
  const referenceId=Array.from(el.querySelectorAll<HTMLElement>('[data-block]')).filter(row=>section.blocks.some(block=>block.id===row.dataset.block&&(block.kind==='verse'||block.kind==='prose'))).map(row=>{const rect=row.getBoundingClientRect(),top=(rect.top-origin.top)/scale,bottom=(rect.bottom-origin.top)/scale;return {id:row.dataset.block!,distance:Math.max(0,top-point.y,point.y-bottom)};}).sort((a,b)=>a.distance-b.distance)[0]?.id;
  if(!referenceId){setError('Die Buchseite wird noch vorbereitet. Bitte gleich erneut schreiben.');return;}
  try{el.setPointerCapture(e.pointerId);}catch{/* In-bounds drawing remains usable without capture. */}
  gesture.current={id:e.pointerId,strokeId:crypto.randomUUID(),order:Date.now(),points:[point],boxes:wordBoxes(el,section,(erasing||hardwareEraser)&&activeEraser.eraserMode==='precise'?'character':'word'),startedOnText:!!(e.target as Element).closest('[data-text]'),layout:current,referenceId,writing,erasing:erasing||hardwareEraser,eraserMode:activeEraser.eraserMode,radius:activeEraser.eraserSize/2,lastCheckpoint:0};
  liveLine.current?.setAttribute('d','');checkpointGesture(gesture.current,true);
 }
 function isHandwriting(g:NonNullable<typeof gesture.current>){
  if(g.writing||!g.startedOnText)return true;
  const bounds=inkBounds(g.points),font=g.layout.fontSize;
  if(bounds.right-bounds.left>font*1.2&&bounds.bottom-bounds.top<3)return false;
  if(continueWriting.current&&inkHitBoxes.some(box=>boxDistance(inkBounds([g.points[0]]),box)<=font*1.7))return true;
  return bounds.bottom-bounds.top>font*1.3||bounds.right-bounds.left<font*.5;
 }
 function checkpointGesture(g:NonNullable<typeof gesture.current>,force=false){
  if(g.erasing||!force&&(!isHandwriting(g)||performance.now()-g.lastCheckpoint<120))return;
  const group=addPageStroke([],g.points,g.layout,root.current?inkTargets(root.current,section,eligible):[],g.referenceId,g.order,g.strokeId)[0];
  if(group){checkpoint(group);g.lastCheckpoint=performance.now();}
 }
 function move(e:PointerEvent<HTMLDivElement>){
  const active=gesture.current,el=root.current;if(!active||active.id!==e.pointerId||!el)return;e.preventDefault();let g:NonNullable<typeof gesture.current>=active;
  const samples=e.nativeEvent.getCoalescedEvents?.(),events=samples?.length?samples:[e.nativeEvent];
  for(const p of events){
   if(g.points.length>=3000){
    // Long uninterrupted handwriting is segmented, never silently truncated.
    const previous:NonNullable<typeof gesture.current>=g,last=g.points.at(-1)!;completeGesture(true,true);
    g={...previous,strokeId:crypto.randomUUID(),order:Date.now(),points:[last],lastCheckpoint:0,writing:true,startedOnText:false};gesture.current=g;
   }
   const point=documentPoint(el,p),last=g.points.at(-1)!;
   if(point.x!==last.x||point.y!==last.y)g.points.push(point);
  }
  checkpointGesture(g);
  liveLine.current?.setAttribute('d',inkPath(g.points));
  if(g.erasing){liveLine.current?.setAttribute('stroke','#64748b');liveLine.current?.setAttribute('stroke-width',String(g.radius*2));liveLine.current?.setAttribute('stroke-opacity','.25');return;}
  const ink=isHandwriting(g);liveLine.current?.setAttribute('stroke',ink?'#314d43':pencilPalette[color].ink);liveLine.current?.setAttribute('stroke-width',ink?'2.5':'18');liveLine.current?.setAttribute('stroke-opacity',ink?'1':'.4');
 }
 function completeGesture(interrupted=false,forceInk=false){
  const g=gesture.current;if(!g)return;
  gesture.current=null;liveLine.current?.setAttribute('d','');
  if(g.erasing){if(!interrupted)erase(g);return;}
  if(!interrupted&&activeEraser.scribbleToErase&&isEraseScribble(g.points,g.layout.fontSize)){
   const boxes=activeEraser.eraserMode==='precise'&&root.current?wordBoxes(root.current,section,'character'):g.boxes;
   if(erase({...g,boxes,erasing:true})){acknowledge(g.strokeId);setError('Weggekritzelt. Mit Rückgängig wiederherstellen.');return;}
  }
  const handwriting=forceInk||isHandwriting(g);
  if(!handwriting&&!interrupted){
   const anchor=strokeAnchor(section,g.points,g.boxes);
   if(anchor&&add(anchor)){acknowledge(g.strokeId);return;}
  }
  // Keep an ambiguous or interrupted marker sweep as original ink. Guessing a
  // text association must never replace the only captured Pencil evidence.
  checkpointGesture(g,true);
  const current=g.layout,targets=root.current?inkTargets(root.current,section,eligible):[];
  showHandwritingInfo();remember();continueWriting.current=true;
  setError(interrupted?'Strich unterbrochen. Die bisherige Handschrift bleibt im Entwurf erhalten.':!handwriting?'Die Textstelle war nicht eindeutig. Der Originalstrich bleibt erhalten.':'');
  setGroups(old=>addPageStroke(old,g.points,current,targets,g.referenceId,g.order,g.strokeId));acknowledge(g.strokeId);setLayout(current);if(practice)onPractice?.('ink');
 }
 function end(e:PointerEvent<HTMLDivElement>){
  const g=gesture.current;if(g?.id!==e.pointerId)return;
  if(e.type==='pointerup'&&root.current&&g.points.length<3000){const point=documentPoint(root.current,e),last=g.points.at(-1)!;if(point.x!==last.x||point.y!==last.y)g.points.push(point);}
  completeGesture(e.type!=='pointerup');
 }
 useLayoutEffect(()=>{interruptGesture.current=()=>completeGesture(true);});
 useEffect(()=>{
  const interrupt=()=>interruptGesture.current(),hidden=()=>{if(document.visibilityState==='hidden')interrupt();};
  window.addEventListener('pagehide',interrupt);window.addEventListener('blur',interrupt);window.addEventListener('resize',interrupt);window.addEventListener('buchtutor-document-transform',interrupt);document.addEventListener('visibilitychange',hidden);
  return()=>{interrupt();window.removeEventListener('pagehide',interrupt);window.removeEventListener('blur',interrupt);window.removeEventListener('resize',interrupt);window.removeEventListener('buchtutor-document-transform',interrupt);document.removeEventListener('visibilitychange',hidden);};
 },[key]);
 function erase(g:NonNullable<typeof gesture.current>){
  const current=g.layout,points=g.points,draftGroups=uncommittedPageInk(snapshot().groups,committedGroups);
  const eraseInk=g.eraserMode==='precise'?erasePagePrecisely:erasePageLines,nextGroups=eraseInk(draftGroups,current,points,g.radius);
  let next=[...entries],changed=nextGroups!==draftGroups;
  for(const note of eligible){
   if(!note.pencil)continue;let pencil=eraseHighlightedWords(section,note.anchor,note.pencil,g.points,g.boxes,g.eraserMode==='precise'?g.radius:2),body=note.body;
   const pageInk=pencil.pageInk,remaining=pageInk?eraseInk(pageInk,current,points,g.radius):undefined;
   if(pageInk&&remaining!==pageInk){
    const strokes=remaining!.flatMap(group=>projectedInk(group,current));
    if(pencil.transcript&&body.endsWith(pencil.transcript))body=body.slice(0,-pencil.transcript.length).trimEnd();
    pencil={...pencil,pageInk:remaining,...(strokes.length?croppedInk(strokes):{ink:[],inkWidth:undefined,inkHeight:undefined}),transcript:undefined,transcriptionError:undefined,uncertain:false,transcription:strokes.length&&prefs.handwritingCloud?'pending':note.body.trim()?'manual':'none'};
   }
   if(pencil===note.pencil)continue;
   changed=true;const existing=next.find(e=>e.id===note.id);
   if(existing)next=next.map(e=>e.id===note.id?{...e,pencil,body}:e);
   else next.push({id:note.id,anchor:note.anchor,pencil,body,prefix:body,createdAt:note.createdAt,baseline:savedNotes.find(saved=>saved.id===note.id)});
  }
  if(!changed)return false;
  if(next.length>100){setError('Bitte sichere zuerst die bisherigen Änderungen.');return false;}
  // OCR results belong to an exact set of strokes. Erasing must not retain stale text.
  const surviving=new Set(nextGroups.flatMap(group=>group.strokes.map(stroke=>stroke.id)));
  const affected=new Set(groups.filter(group=>group.strokes.some(stroke=>!surviving.has(stroke.id))).map(group=>group.targetId));
  next=next.map(entry=>{
   if(!entry.recognizedInk||!affected.has(entry.id))return entry;
   const original=savedNotes.find(note=>note.id===entry.id)?.pencil;
   return {...entry,recognizedInk:undefined,body:entry.prefix??'',pencil:{...entry.pencil,ink:original?.ink??[],inkWidth:original?.inkWidth,inkHeight:original?.inkHeight,transcription:original?.transcription??'none',uncertain:original?.uncertain}};
  });
  remember();setError('');setEntries(next);setGroups(nextGroups);setLayout(current);if(practice)onPractice?.('erase');return true;
 }
 function toggleEraser(){
  flushActive();if(erasing){setErasing(false);setWriting(previousWriting.current);}else{previousWriting.current=writing;setErasing(true);setWriting(false);}
  continueWriting.current=false;setPalette(false);setSettings(false);setHint(false);setEraserOptions(false);
 }
 function openEraserOptions(){
  menuEpoch.current++;flushActive();onPopover();if(!erasing)previousWriting.current=writing;setErasing(true);setWriting(false);setEraserOptions(true);setPalette(false);setSettings(false);setHint(false);
 }
 function stopEraserPress(){if(eraserPress.current)clearTimeout(eraserPress.current);eraserPress.current=null;}
 const quickEraser=useEffectEvent(toggleEraser);
 useEffect(()=>{
  if(!enabled||busy)return;
  const key=(event:KeyboardEvent)=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.key.toLowerCase()!=='e'||(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]'))||document.querySelector('[role="dialog"]:not([data-state="closed"])'))return;event.preventDefault();quickEraser();};
  document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);stopEraserPress();};
 },[enabled,busy]);
 function undo(){
  const previous=history.at(-1);if(previous){setEntries(previous.entries);setGroups(previous.groups);setHistory(old=>old.slice(0,-1));setError('');return;}
  const strokes=groups.flatMap(g=>g.strokes.map(s=>({groupId:g.id,...s}))).sort((a,b)=>b.order-a.order),last=strokes[0],mark=entries.at(-1);
  if(last&&last.order>=(mark?.order??0))setGroups(old=>old.map(g=>g.id===last.groupId?{...g,strokes:g.strokes.filter(s=>s.id!==last.id)}:g).filter(g=>g.strokes.length));else setEntries(old=>old.slice(0,-1));setError('');
 }
 function changeNativeNote(note:typeof eligible[number],body:string){
  if(!note.pencil)return;const existing=snapshot().entries.find(e=>e.id===note.id);
  if(body===(existing?.body??note.body))return;
  showHandwritingInfo();remember();if(practice&&body.trim())onPractice?.('ink',{anchor:note.anchor,color:note.pencil.color,body});
  const entry:Entry={...existing,id:note.id,anchor:note.anchor,body,pencil:{...(existing?.pencil??note.pencil),transcript:undefined,transcriptionError:undefined,transcription:body.trim()?'manual':'none',uncertain:false},createdAt:existing?.createdAt??note.createdAt,baseline:existing?.baseline??savedNotes.find(saved=>saved.id===note.id)};
  setError('');setEntries(old=>existing?old.map(e=>e.id===note.id?entry:e):[...old,entry]);
 }
 const inlineNotes:Record<string,ReactNode>={};
 if(scribble&&enabled&&(practice||!prefs.handwritingCloud&&prefs.annotationVisibility!=='marks'&&prefs.annotationVisibility!=='none'))for(const blockId of new Set(eligible.map(note=>note.anchor.endId)))inlineNotes[blockId]=eligible.filter(note=>note.anchor.endId===blockId).map(note=><label key={note.id} className="pencil-inline-note" data-pencil-input style={{borderColor:pencilPalette[note.pencil!.color].ink}}><span>{referenceLabel(section,note.anchor)} · {note.pencil!.meaning}</span><textarea data-pencil-input data-pencil-note={note.id} aria-label={`Notiz zu ${referenceLabel(section,note.anchor)}`} placeholder="Mit Apple Pencil schreiben …" rows={2} maxLength={12000} value={note.body} readOnly={busy||!loaded} onPointerDown={e=>{if(e.pointerType==='pen')showHandwritingInfo();}} onChange={e=>changeNativeNote(note,e.target.value)} onCompositionStart={()=>{composition.current=true;setComposing(true);}} onCompositionEnd={e=>{changeNativeNote(note,e.currentTarget.value);composition.current=false;setComposing(false);}} onBlur={e=>{changeNativeNote(note,e.currentTarget.value);composition.current=false;setComposing(false);}}/></label>);
 async function finish(){
  if(practice||saving.current||composition.current||!loaded)return;
  completeGesture(true);
  // Native text replacement can reach the DOM before React's change handler.
  for(const field of root.current?.querySelectorAll<HTMLTextAreaElement>('[data-pencil-note]')??[]){
   const note=eligible.find(n=>n.id===field.dataset.pencilNote);if(note)changeNativeNote(note,field.value);
  }
  const draft=snapshot();if(!draft.entries.length&&!draft.groups.length)return;
  setPalette(false);setSettings(false);setHint(false);setEraserOptions(false);
  const current=measure(),linked=linkInk(uncommittedPageInk(draft.groups,committedGroups),current,root.current?inkTargets(root.current,section,eligible):[]);
  const validTargets=new Set(inkTargets(root.current!,section,eligible).map(target=>target.id));
  if(linked.some(g=>!g.targetId||!validTargets.has(g.targetId))){setError('Eine Handschrift ist noch nicht eindeutig zugeordnet. Wähle „Zuordnung prüfen“ oder markiere die passende Stelle daneben. Dein Entwurf bleibt erhalten.');return;}
  saving.current=true;setBusy(true);setError('');
  try{
   const next=draft.entries.map(entry=>recoverCommittedPencilEntry(entry,draft.groups,savedNotes.find(note=>note.id===entry.id),current));
   for(const group of linked){
    if(next.some(e=>e.id===group.targetId))continue;const saved=savedNotes.find(n=>n.id===group.targetId);if(!saved?.pencil)continue;
    next.push({id:saved.id,anchor:saved.anchor,pencil:saved.pencil,body:saved.body,createdAt:saved.createdAt,baseline:saved});
   }
   const now=new Date().toISOString();
   const notes=next.map(({recognizedInk,prefix:_,order:__,baseline:___,...entry})=>{
    void _;void __;void ___;
    const related=linked.filter(group=>group.targetId===entry.id),signature=related.map(g=>g.strokes.map(s=>s.id).join(',')).join(';');
    const added=related.length&&recognizedInk!==signature?croppedInk(related.flatMap(group=>projectedInk(group,current))):null;
    const baseline=recognizedInk?savedNotes.find(note=>note.id===entry.id)?.pencil??{ink:[] as InkStroke[],pageInk:[] as PageInkGroup[]}:entry.pencil;
    const fullInk=added?combineInk(baseline,added):entry.pencil;
    if(fullInk.ink.length>1200)throw new Error('Diese Notiz enthält zu viele Schriftstriche. Ordne weitere Handschrift einer neuen Markierung zu. Dein Entwurf bleibt erhalten.');
    return {...entry,pencil:{...entry.pencil,...fullInk,pageInk:mergePageInk(baseline.pageInk??[],related),transcription:added&&prefs.handwritingCloud?'pending' as const:added||entry.pencil.transcription==='pending'&&!prefs.handwritingCloud?'none' as const:entry.pencil.transcription,transcriptionError:added?undefined:entry.pencil.transcriptionError},workId:book.id,editionId:book.editionId,kind:'note' as const,createdAt:entry.createdAt??now,updatedAt:now};
   });
   for(const note of notes)validateAnchor(book,note.anchor);
   await saveLocalNotes(notes,next.flatMap(entry=>entry.baseline?[entry.baseline]:savedNotes.filter(note=>note.id===entry.id)));
   // Retain a late native correction delivered while IndexedDB was committing.
   setEntries(old=>old.filter(entry=>entry!==draft.entries.find(e=>e.id===entry.id)).map(entry=>{
    const saved=notes.find(n=>n.id===entry.id);return saved?{...entry,pencil:{...saved.pencil,transcription:entry.body.trim()?'manual':'none'},createdAt:saved.createdAt}:entry;
   }));
   const savedStrokes=new Set(draft.groups.flatMap(g=>g.strokes.map(s=>s.id)));
   setGroups(old=>old.map(g=>({...g,strokes:g.strokes.filter(s=>!savedStrokes.has(s.id))})).filter(g=>g.strokes.length));setHistory([]);
   onSaved(notes.length?`${notes.length} Eintrag${notes.length===1?'':'e'} auf diesem Gerät gespeichert.`:'Die Handschrift ist bereits auf diesem Gerät gespeichert.');
   if(!snapshot().entries.length&&!snapshot().groups.length)onToggle();
  }catch(e){setError((e as Error).message);}finally{saving.current=false;setBusy(false);}
 }
 const preview=effectiveEntries.map(e=>({...e,workId:book.id,editionId:book.editionId,kind:'note' as const,createdAt:'',updatedAt:''}));
 const pageInk=[...savedGroups,...visibleGroups].map(group=>({group,strokes:projectedInk(group,layout),target:eligible.find(e=>e.id===group.targetId)}));
 const showInk=practice||prefs.annotationVisibility!=='marks'&&prefs.annotationVisibility!=='none';
 return <>
  <div ref={root} className={enabled?'pencil-text active page-writing-surface':'pencil-text'} data-writing={writing} data-erasing={erasing} onPointerOverCapture={e=>{if(root.current&&enabled&&!gesture.current)root.current.style.touchAction=(e.target as Element).closest('[data-pencil-input]')?'auto':e.pointerType==='pen'?'none':'pan-y pinch-zoom';}} onPointerDownCapture={down} onPointerMoveCapture={move} onPointerUpCapture={end} onPointerCancelCapture={end} onLostPointerCapture={end} onClickCapture={e=>{if(enabled&&!(e.target as Element).closest('[data-pencil-input]')){e.preventDefault();e.stopPropagation();}}}>
   {children(enabled||practice?preview:[],inlineNotes)}
   {showInk&&pageInk.length>0&&<svg className="pencil-page-ink" role="img" aria-label="Handschrift auf der Seite">{pageInk.map(({group,strokes,target})=>{const box=inkBounds(strokes.flat());return <g key={group.id} data-ink-group={group.id} data-ink-target={target?.id??''} data-ink-saved={savedGroups.includes(group)}>{strokes.map((stroke,i)=><path key={group.strokes[i].id} d={inkPath(stroke)} stroke="currentColor" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>)}{enabled&&!savedGroups.includes(group)&&<text x={box.left} y={box.bottom+16} className="pencil-ink-label">{target?`↳ ${referenceLabel(section,target.anchor)}`:'Markierung wählen'}</text>}</g>;})}</svg>}
   <svg className="pencil-live" aria-hidden="true"><path ref={liveLine} stroke="#314d43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
  </div>
  {enabled&&toolbarHost&&createPortal(<section className="pencil-workspace" aria-label="Apple Pencil Werkzeuge" aria-busy={busy} onClickCapture={event=>{menuEpoch.current++;if(!(event.target as Element).closest('.pencil-eraser-options,.pencil-eraser'))setEraserOptions(false);}}>
    {eraserOptions&&<PencilEraserOptions prefs={activeEraser} onClose={()=>setEraserOptions(false)} onChange={async patch=>{setEraserChoice(old=>({...old,...patch}));try{await saveLocalPreferences({...prefs,...eraserChoice,...patch});}finally{setEraserChoice(old=>{const next={...old};for(const key of Object.keys(patch) as (keyof typeof patch)[])if(next[key]===patch[key])delete next[key];return next;});}}}/>}
    {settings&&<div className="pencil-settings pencil-popover"><div className="pencil-sheet-heading"><strong>Pencil-Einstellungen</strong><button className="icon-button" aria-label="Farbbedeutungen schließen" onClick={()=>setSettings(false)}><X size={17}/></button></div><label className="pencil-cloud-setting"><input type="checkbox" checked={cloudChoice??prefs.handwritingCloud} disabled={practice||busy} onChange={e=>{const value=e.currentTarget.checked;setCloudChoice(value);void setHandwritingCloud(value).catch(error=>setError(error.message)).finally(()=>setCloudChoice(null));}}/><span><strong>Handschrift automatisch erkennen</strong><small>Nach „Fertig“: Bildkopie über OpenRouter an Google. Original bleibt auf der Seite, Suchtext wird im Hintergrund gespeichert.</small></span></label><button className="secondary-button eraser-settings-entry" onClick={openEraserOptions}><Eraser size={16}/>Radierer-Einstellungen</button><strong className="pencil-settings-label">Farbbedeutungen</strong><div className="pencil-meanings">{pencilColors.map(c=><label key={c}><i style={{background:pencilPalette[c].fill}}/><span>{pencilPalette[c].name}</span><input aria-label={`Bedeutung für ${pencilPalette[c].name}`} maxLength={80} defaultValue={meaning(c)} key={meaning(c)} onBlur={e=>{const value=e.target.value.trim()||pencilPalette[c].meaning;setEntries(old=>old.map(entry=>entry.pencil.color===c?{...entry,pencil:{...entry.pencil,meaning:value}}:entry));void saveLocalPreferences({...prefs,pencilMeanings:{...prefs.pencilMeanings,[c]:value}}).catch(e=>setError(e.message));}}/></label>)}</div>{groups.some(group=>!group.targetId||!eligible.some(note=>note.id===group.targetId))&&<div className="pencil-assignments"><strong>Handschrift zuordnen</strong><p>Bei mehreren nahen Markierungen wählst du die passende Stelle selbst. Die Schrift bleibt an ihrem Platz.</p>{groups.filter(group=>!group.targetId||!eligible.some(note=>note.id===group.targetId)).map((group,index)=><label key={group.id}>Handschrift {index+1}<select aria-label={`Markierung für Handschrift ${index+1}`} value="" onChange={event=>{const targetId=event.currentTarget.value;if(eligible.some(note=>note.id===targetId))setGroups(old=>old.map(item=>item.id===group.id?{...item,targetId}:item));}}><option value="">Markierung wählen …</option>{eligible.map(note=><option key={note.id} value={note.id}>{note.pencil?pencilPalette[note.pencil.color].name+' · '+note.pencil.meaning+' · ':''}{referenceLabel(section,note.anchor)} · {note.anchor.quote.slice(0,55)}</option>)}</select></label>)}</div>}{recoveries.length>0&&<details className="pencil-draft-recovery"><summary>Lokale Entwürfe wiederherstellen ({recoveries.length})</summary><p>Der aktuelle Entwurf bleibt als Sicherung erhalten.</p>{recoveries.map(record=><button key={record.key} className="text-button" onClick={()=>restore(record.key)}>Entwurf vom {new Date(record.at).toLocaleString('de-DE')} öffnen</button>)}</details>}<p className="small-note">Handschrift und Notizen bleiben auf deinem Gerät. In Safari auf dem iPad wandelt Apple „Kritzeln“ Schrift im Notizfeld kostenlos in Text um.</p>{!!selection&&<button className="text-button" onClick={()=>add(selection)}><Highlighter size={14}/>Textauswahl übernehmen</button>}</div>}
    {palette&&<div className="pencil-mobile-palette pencil-popover" role="group" aria-label="Markierungsfarbe wählen">{pencilColors.map(c=><button key={c} aria-label={`${pencilPalette[c].name}: ${meaning(c)}`} onClick={()=>{setColor(c);setWriting(false);setErasing(false);continueWriting.current=false;setPalette(false);}}><i style={{background:pencilPalette[c].fill}}/><span>{pencilPalette[c].name}</span>{color===c&&<Check size={15}/>}</button>)}<p className="pencil-palette-meaning">{meaning(color)}</p><button className="pencil-meanings-trigger" aria-label="Farbbedeutungen anpassen" disabled={busy||practice} onClick={()=>{setSettings(true);setPalette(false);setHint(false);}}><Settings2 size={16}/>Farbbedeutungen</button></div>}
    <div className="pencil-toolbar">

     <div className="pencil-colors" role="group" aria-label="Markierungsfarbe">{pencilColors.map(c=><button key={c} disabled={busy} style={{background:pencilPalette[c].fill}} aria-label={`${pencilPalette[c].name}: ${meaning(c)}`} aria-pressed={color===c&&!writing&&!erasing} title={meaning(c)} onClick={()=>{setColor(c);setWriting(false);setErasing(false);continueWriting.current=false;}}>{color===c&&!writing&&!erasing?<Check size={16}/>:<span className="sr-only">{pencilPalette[c].name}</span>}</button>)}</div>
     <button className="pencil-color-menu icon-button" aria-label="Markierungsfarbe wählen" aria-expanded={palette} aria-pressed={!writing&&!erasing} title={`${pencilPalette[color].name} · ${meaning(color)}`} disabled={busy} onClick={()=>{onPopover();setPalette(!palette);setSettings(false);setHint(false);}}><i style={{background:pencilPalette[color].fill}}><Highlighter size={16}/></i></button>
     <span className="pencil-divider"/>
     <button className={'icon-button pencil-writing-toggle '+(writing?'pressed':'')} disabled={busy} aria-label="Auf der Seite schreiben" title="Direkt neben Markierungen schreiben. Hier aktivieren, um auch über dem Text zu schreiben." aria-pressed={writing} onClick={()=>{setWriting(!writing);setErasing(false);setPalette(false);setSettings(false);}}><PenLine size={19}/></button>
     <button className={'icon-button pencil-eraser '+(erasing?'pressed':'')} disabled={busy} aria-label="Radiergummi" title="Radierer · E zum Werkzeugwechsel · gedrückt halten oder doppelt antippen für Einstellungen" aria-pressed={erasing} onPointerDown={()=>{stopEraserPress();skipEraserClick.current=false;eraserPress.current=setTimeout(()=>{skipEraserClick.current=true;openEraserOptions();},500);}} onPointerUp={stopEraserPress} onPointerCancel={stopEraserPress} onPointerLeave={stopEraserPress} onContextMenu={event=>{event.preventDefault();openEraserOptions();}} onDoubleClick={openEraserOptions} onClick={()=>{if(skipEraserClick.current){skipEraserClick.current=false;return;}toggleEraser();}}><Eraser size={19}/></button>
     <button className="icon-button pencil-undo" disabled={busy||!history.length&&!entries.length&&!groups.length} aria-label="Letzten Strich entfernen" title="Rückgängig" onClick={undo}><RotateCcw size={18}/></button>

     <span className="pencil-divider"/>
     <button className="pencil-done" aria-label={busy?'Speichern …':'Fertig'} title={composing?'Texteingabe erst abschließen':'Markierungen, Notiztext und Originalhandschrift auf diesem Gerät speichern'} onClick={()=>void finish()} disabled={practice||busy||composing||!loaded||!entries.length&&!groups.length}>{busy?<LoaderCircle size={18} className="spin"/>:<Check size={19}/>}<span>{busy?'Speichern …':'Fertig'}</span></button>
    </div>
    {hint&&<div className="pencil-handwriting-hint pencil-popover" role="status"><button className="icon-button" aria-label="Handschrift-Hinweis schließen" onClick={dismissHandwritingInfo}><X size={16}/></button><PencilHandwritingHint scribble={scribble} cloud={prefs.handwritingCloud} onEnableCloud={practice?undefined:enableCloud}/></div>}

    {error&&!palette&&!settings&&!hint&&!eraserOptions&&<div className="inline-error pencil-error" role="alert">{error}{groups.some(group=>!group.targetId||!eligible.some(note=>note.id===group.targetId))&&<button className="text-button" onClick={()=>{setSettings(true);setPalette(false);}}>Zuordnung prüfen</button>}</div>}
   </section>,toolbarHost)}
 </>;
}
