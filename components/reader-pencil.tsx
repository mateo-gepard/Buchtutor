'use client';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type PointerEvent,type ReactNode} from 'react';
import {Check,GripVertical,Highlighter,LoaderCircle,RotateCcw,X,Settings2,PenLine,ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Move,Eraser} from 'lucide-react';
import {ApplePencilIcon} from './apple-pencil-icon';
import {z} from 'zod';
import type {Anchor,Book,SavedNote,Section} from '@/lib/reader-model';
import {referenceLabel} from '@/lib/reader-model';
import {deviceId,saveLocalNotes,saveLocalPreferences} from '@/lib/local-storage';
import type {Prefs} from '@/lib/preferences';
import {portableAnchorSchema} from '@/lib/local-model';
import {inkPath,pencilAnnotationSchema,pencilColors,pencilPalette,strokeAnchor,type InkStroke,type PencilColor,type WordBox} from '@/lib/pencil-model';
import {addPageStroke,boxDistance,combineInk,croppedInk,inkBounds,linkInk,pageInkGroupSchema,projectedInk,type InkLayout,type PageInkGroup} from '@/lib/page-handwriting';
import {eraseHighlightedWords,erasePageLines} from '@/lib/pencil-eraser';
import {inkTargets,wordBoxes} from '@/lib/pencil-dom';
import {usePencilPlacement} from '@/hooks/use-pencil-placement';
const entrySchema=z.object({id:z.string(),anchor:portableAnchorSchema,pencil:pencilAnnotationSchema,body:z.string().max(12000),createdAt:z.string().optional(),prefix:z.string().optional(),recognizedInk:z.string().optional(),order:z.number().optional()});
const entriesSchema=z.array(entrySchema).max(100);
const draftSchema=z.union([z.object({version:z.literal(2),entries:entriesSchema,groups:z.array(pageInkGroupSchema).max(100)}),entriesSchema.transform(entries=>({version:2 as const,entries,groups:[] as PageInkGroup[]}))]);
type Entry=z.infer<typeof entrySchema>;
async function imageOf(ink:InkStroke[],width=1000,height=320){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');if(!context)throw new Error('Die Handschrift konnte nicht gelesen werden.');
 context.fillStyle='#fff';context.fillRect(0,0,width,height);context.strokeStyle='#172b23';context.lineWidth=3;context.lineCap='round';context.lineJoin='round';
 for(const stroke of ink){context.stroke(new Path2D(inkPath(stroke)+(stroke.length===1?' l0.1,0.1':'')));}
 return canvas.toDataURL('image/png');
}
type Props={book:Book;section:Section;prefs:Prefs;selection:Anchor|null;savedNotes:SavedNote[];enabled:boolean;onToggle:()=>void;onSaved:(message:string)=>void;children:(drafts:SavedNote[])=>ReactNode};
export function ReaderPencil({book,section,prefs,selection,savedNotes,enabled,onToggle,onSaved,children}:Props){
 const liveLine=useRef<SVGPathElement>(null),operation=useRef<AbortController|null>(null),root=useRef<HTMLDivElement>(null);
 const continueWriting=useRef(false);
 const gesture=useRef<{id:number;points:InkStroke;boxes:WordBox[];startedOnText:boolean;origin:{x:number;y:number}}|null>(null);
 const [entries,setEntries]=useState<Entry[]>([]),[groups,setGroups]=useState<PageInkGroup[]>([]),[color,setColor]=useState<PencilColor>('green'),[settings,setSettings]=useState(false),[palette,setPalette]=useState(false),[writing,setWriting]=useState(false),[erasing,setErasing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const [history,setHistory]=useState<{entries:Entry[];groups:PageInkGroup[]}[]>([]);
 const [layout,setLayout]=useState<InkLayout>({width:640,fontSize:20,tops:{}});
 const inkHitBoxes=useMemo(()=>groups.flatMap(group=>projectedInk(group,layout).map(stroke=>inkBounds(stroke))),[groups,layout]);
 const {element:paletteRef,dock,preview:dockPreview,dragging,compact,style:paletteStyle,announcement,dockAt,grip}=usePencilPlacement(enabled,()=>{setSettings(false);setPalette(false);});
 const key=`buchtutor-pencil-draft:${book.id}:${book.editionId}:${section.id}`;
 const meaning=(c:PencilColor)=>prefs.pencilMeanings?.[c]??pencilPalette[c].meaning;
 const eligible=useMemo(()=>[...savedNotes.filter(n=>n.pencil&&!entries.some(e=>e.id===n.id)),...entries],[savedNotes,entries]);
 const latest=useRef({eligible,section});useLayoutEffect(()=>{latest.current={eligible,section}},[eligible,section]);
 useEffect(()=>()=>operation.current?.abort(),[]);
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
   try{const draft=draftSchema.parse(JSON.parse(localStorage.getItem(key)??'[]'));setEntries(draft.entries);setGroups(draft.groups);}catch{setError('Ein älterer Handschriftentwurf konnte nicht gelesen werden.');}
   setLoaded(true);refresh();
  });return()=>cancelAnimationFrame(frame);
 },[key,refresh]);
 useLayoutEffect(()=>{const frame=requestAnimationFrame(refresh);return()=>cancelAnimationFrame(frame);},[entries,enabled,prefs.fontSize,prefs.lineHeight,prefs.font,refresh]);
 useEffect(()=>{let frame=0;const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh);};const observer=new ResizeObserver(schedule);if(root.current)observer.observe(root.current);window.addEventListener('resize',schedule);return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);};},[refresh]);
 useEffect(()=>{if(!loaded)return;const timer=setTimeout(()=>{try{if(entries.length||groups.length)localStorage.setItem(key,JSON.stringify({version:2,entries,groups}));else localStorage.removeItem(key);}catch{setError('Der Entwurfsspeicher ist voll. Bitte mit „Fertig“ sichern, bevor du die Seite verlässt.');}},0);return()=>clearTimeout(timer);},[entries,groups,key,loaded]);
 useEffect(()=>{function unload(e:BeforeUnloadEvent){if(entries.length||groups.length)e.preventDefault();}window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[entries.length,groups.length]);
 useEffect(()=>{
  const el=root.current;if(!el||!enabled)return;
  function stylus(event:TouchEvent){if([...event.changedTouches].some(t=>(t as Touch&{touchType?:string}).touchType==='stylus'))event.preventDefault();}
  el.addEventListener('touchstart',stylus,{passive:false});el.addEventListener('touchmove',stylus,{passive:false});
  return()=>{el.removeEventListener('touchstart',stylus);el.removeEventListener('touchmove',stylus);};
 },[enabled]);
 function remember(){setHistory(old=>[...old.slice(-29),{entries,groups}]);}
 function add(anchor:Anchor){continueWriting.current=false;
  if(entries.length>=100){setError('Bitte sichere zuerst diese 100 Markierungen.');return;}
  const duplicate=entries.find(e=>JSON.stringify(e.anchor)===JSON.stringify(anchor)&&e.pencil.color===color);
  if(duplicate){if(duplicate.pencil.erasedRanges?.length){remember();setEntries(old=>old.map(e=>e.id===duplicate.id?{...e,pencil:{...e.pencil,erasedRanges:[]}}:e));setError('');}return;}
  remember();setEntries(old=>[...old,{id:crypto.randomUUID(),anchor,pencil:{color,meaning:meaning(color),ink:[],transcription:'none'},body:'',order:Date.now()}]);setError('');
 }
 function down(e:PointerEvent<HTMLDivElement>){
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
  remember();continueWriting.current=true;setGroups(old=>addPageStroke(old,points,current,targets,referenceId));setLayout(current);setError('');
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
  remember();setEntries(next);setGroups(nextGroups);setLayout(current);setError('');
 }
 function undo(){
  const previous=history.at(-1);if(previous){setEntries(previous.entries);setGroups(previous.groups);setHistory(old=>old.slice(0,-1));setError('');return;}
  const strokes=groups.flatMap(g=>g.strokes.map(s=>({groupId:g.id,...s}))).sort((a,b)=>b.order-a.order),last=strokes[0],mark=entries.at(-1);
  if(last&&last.order>=(mark?.order??0))setGroups(old=>old.map(g=>g.id===last.groupId?{...g,strokes:g.strokes.filter(s=>s.id!==last.id)}:g).filter(g=>g.strokes.length));else setEntries(old=>old.slice(0,-1));setError('');
 }
 async function finish(){
  if(busy||!loaded||!entries.length&&!groups.length)return;
  const current=measure(),linked=linkInk(groups,current,root.current?inkTargets(root.current,section,eligible):[]);
  if(linked.some(g=>!g.targetId)){setError('Eine Handschrift hat noch keine nahe Markierung. Markiere die passende Stelle daneben oder entferne den Strich mit Rückgängig. Dein Entwurf bleibt erhalten.');return;}
  setGroups(linked);const controller=new AbortController();operation.current=controller;setBusy(true);setError('');let next=[...entries];
  try{
   for(const group of linked){
    if(next.some(e=>e.id===group.targetId))continue;const saved=savedNotes.find(n=>n.id===group.targetId);if(!saved?.pencil)continue;
    next.push({id:saved.id,anchor:saved.anchor,pencil:saved.pencil,body:saved.body,prefix:saved.body,createdAt:saved.createdAt});
   }
   for(let i=0;i<next.length;i++){
    const entry=next[i],related=linked.filter(g=>g.targetId===entry.id),signature=related.map(g=>g.strokes.map(s=>s.id).join(',')).join(';');
    const added=related.length?croppedInk(related.flatMap(g=>projectedInk(g,current))):null;
    const legacy=!added&&entry.pencil.ink.length&&entry.pencil.transcription==='pending';
    if(!legacy&&(!added||entry.recognizedInk===signature))continue;
    const ink=added??{ink:entry.pencil.ink,inkWidth:entry.pencil.inkWidth??1000,inkHeight:entry.pencil.inkHeight??320};
    const response=await fetch('/api/handwriting',{method:'POST',headers:{'Content-Type':'application/json','X-Leseraum-Device':deviceId()},signal:controller.signal,body:JSON.stringify({image:await imageOf(ink.ink,ink.inkWidth,ink.inkHeight)})});
    const data=await response.json();if(!response.ok)throw new Error(data.error??'Handschrifterkennung fehlgeschlagen. Dein Entwurf bleibt erhalten.');
    const prefix=entry.prefix??(entry.pencil.transcription==='manual'?entry.body:'');
    const original=savedNotes.find(n=>n.id===entry.id)?.pencil;
    const fullInk=original&&added?combineInk(original,added):ink;
    const text=[prefix,String(data.text)].filter(Boolean).join('\n\n');
    if(text.length>12000||fullInk.ink.length>1200)throw new Error('Diese Notiz ist zu groß. Kürze die gespeicherte Notiz oder ordne die neue Handschrift einer weiteren Markierung zu. Dein Entwurf bleibt erhalten.');
    next=next.map(e=>e.id===entry.id?{...e,prefix,recognizedInk:signature,body:text,pencil:{...e.pencil,...fullInk,transcription:'recognized',uncertain:!!data.uncertain}}:e);
    setEntries(next);localStorage.setItem(key,JSON.stringify({version:2,entries:next,groups:linked}));
   }
   if(controller.signal.aborted)return;const now=new Date().toISOString();
   await saveLocalNotes(next.map(({recognizedInk:_,prefix:__,order:___,...entry})=>{void _;void __;void ___;return {...entry,workId:book.id,editionId:book.editionId,kind:'note',createdAt:entry.createdAt??now,updatedAt:now};}));
   setEntries([]);setGroups([]);setHistory([]);localStorage.removeItem(key);onSaved(`${next.length} Markierung${next.length===1?'':'en'} mit Notizen gespeichert.${next.some(e=>e.pencil.uncertain)?' Bitte prüfe die unsichere Handschrift im Notizbuch.':''}`);onToggle();
  }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{if(!controller.signal.aborted)setBusy(false);}
 }
 const preview=entries.map(e=>({...e,workId:book.id,editionId:book.editionId,kind:'note' as const,createdAt:'',updatedAt:''}));
 const pageInk=groups.map(group=>({group,strokes:projectedInk(group,layout),target:eligible.find(e=>e.id===group.targetId)}));
 return <>
  <div ref={root} className={enabled?'pencil-text active page-writing-surface':'pencil-text'} data-writing={writing} data-erasing={erasing} onPointerOverCapture={e=>{if(root.current&&enabled&&!gesture.current)root.current.style.touchAction=e.pointerType==='pen'?'none':'pan-y pinch-zoom';}} onPointerDownCapture={down} onPointerMoveCapture={move} onPointerUpCapture={end} onPointerCancelCapture={end} onLostPointerCapture={end} onClickCapture={e=>{if(enabled){e.preventDefault();e.stopPropagation();}}}>
   {children(enabled?preview:[])}
   {enabled&&<svg className="pencil-page-ink" role="img" aria-label="Handschrift auf der Seite">{pageInk.map(({group,strokes,target})=>{const box=inkBounds(strokes.flat());return <g key={group.id} data-ink-group={group.id} data-ink-target={target?.id??''}>{strokes.map((stroke,i)=><path key={group.strokes[i].id} d={inkPath(stroke)} stroke="#314d43" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>)}<text x={box.left} y={box.bottom+16} className="pencil-ink-label">{target?`↳ ${referenceLabel(section,target.anchor)}`:'Keine nahe Markierung'}</text></g>;})}</svg>}
   <svg className="pencil-live" aria-hidden="true"><path ref={liveLine} stroke="#314d43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
  </div>
  {enabled&&<>
   {dockPreview!=='floating'&&<div className={'pencil-dock-preview dock-'+dockPreview} aria-hidden="true"/>}
   <section ref={paletteRef} className={'pencil-workspace positioned '+(dragging?'is-dragging':'')} data-dock={dock} data-compact={compact} style={paletteStyle} aria-label="Apple Pencil Werkzeuge" aria-busy={busy}>
    {settings&&<div className="pencil-settings pencil-popover"><div className="pencil-sheet-heading"><strong>Pencil-Einstellungen</strong><button className="icon-button" aria-label="Farbbedeutungen schließen" onClick={()=>setSettings(false)}><X size={17}/></button></div><div className="pencil-dock-options" role="group" aria-label="Pencil-Leiste andocken">{([['left','Links',ArrowLeft],['top','Oben',ArrowUp],['bottom','Unten',ArrowDown],['right','Rechts',ArrowRight],['floating','Frei',Move]] as const).map(([edge,label,Icon])=><button key={edge} aria-label={`Leiste ${label.toLowerCase()} andocken`} onClick={()=>dockAt(edge)}><Icon size={16}/>{label}</button>)}</div><strong className="pencil-settings-label">Farbbedeutungen</strong><div className="pencil-meanings">{pencilColors.map(c=><label key={c}><i style={{background:pencilPalette[c].fill}}/><span>{pencilPalette[c].name}</span><input aria-label={`Bedeutung für ${pencilPalette[c].name}`} maxLength={80} defaultValue={meaning(c)} key={meaning(c)} onBlur={e=>{const value=e.target.value.trim()||pencilPalette[c].meaning;setEntries(old=>old.map(entry=>entry.pencil.color===c?{...entry,pencil:{...entry.pencil,meaning:value}}:entry));void saveLocalPreferences({...prefs,pencilMeanings:{...prefs.pencilMeanings,[c]:value}}).catch(e=>setError(e.message));}}/></label>)}</div><p className="small-note">„Fertig“ überträgt nur deine Schriftzüge zur Erkennung über OpenRouter. Notizen bleiben auf deinem Gerät.</p>{!!selection&&<button className="text-button" onClick={()=>add(selection)}><Highlighter size={14}/>Textauswahl übernehmen</button>}</div>}
    {palette&&<div className="pencil-mobile-palette pencil-popover" role="group" aria-label="Markierungsfarbe wählen">{pencilColors.map(c=><button key={c} aria-label={`${pencilPalette[c].name}: ${meaning(c)}`} onClick={()=>{setColor(c);setWriting(false);setErasing(false);continueWriting.current=false;setPalette(false);}}><i style={{background:pencilPalette[c].fill}}/>{pencilPalette[c].name}{color===c&&<Check size={15}/>}</button>)}</div>}
    <div className="pencil-toolbar">
     <button className="pencil-grip" aria-label="Pencil-Leiste verschieben" title="Ziehen zum Verschieben. Am Rand loslassen zum Andocken. Pfeiltasten: bewegen; Umschalt + Pfeiltaste: andocken; Pos1: zurücksetzen." {...grip}><GripVertical size={13}/><ApplePencilIcon size={19}/></button>
     <div className="pencil-colors" role="group" aria-label="Markierungsfarbe">{pencilColors.map(c=><button key={c} disabled={busy} style={{background:pencilPalette[c].fill}} aria-label={`${pencilPalette[c].name}: ${meaning(c)}`} aria-pressed={color===c&&!writing&&!erasing} title={meaning(c)} onClick={()=>{setColor(c);setWriting(false);setErasing(false);continueWriting.current=false;}}>{color===c&&!writing&&!erasing?<Check size={16}/>:<span className="sr-only">{pencilPalette[c].name}</span>}</button>)}</div>
     <button className="pencil-color-menu icon-button" aria-label="Markierungsfarbe wählen" aria-expanded={palette} disabled={busy} onClick={()=>{setPalette(!palette);setSettings(false);}}><i style={{background:pencilPalette[color].fill}}/></button>
     <span className="pencil-divider"/>
     <button className={'icon-button pencil-writing-toggle '+(writing?'pressed':'')} disabled={busy} aria-label="Auf der Seite schreiben" title="Direkt neben Markierungen schreiben. Hier aktivieren, um auch über dem Text zu schreiben." aria-pressed={writing} onClick={()=>{setWriting(!writing);setErasing(false);setPalette(false);setSettings(false);}}><PenLine size={19}/></button>
     <button className={'icon-button pencil-eraser '+(erasing?'pressed':'')} disabled={busy} aria-label="Radiergummi" title="Ganze Wortmarkierungen und getroffene Schriftstriche entfernen. Verknüpfte Notizen bleiben erhalten." aria-pressed={erasing} onClick={()=>{setErasing(!erasing);setWriting(false);continueWriting.current=false;setPalette(false);setSettings(false);}}><Eraser size={19}/></button>
     <button className="icon-button pencil-undo" disabled={busy||!history.length&&!entries.length&&!groups.length} aria-label="Letzten Strich entfernen" title="Rückgängig" onClick={undo}><RotateCcw size={18}/></button>
     <button className={'icon-button '+(settings?'pressed':'')} aria-label="Farbbedeutungen anpassen" title="Pencil-Einstellungen" aria-expanded={settings} disabled={busy} onClick={()=>{setSettings(!settings);setPalette(false);}}><Settings2 size={18}/></button>
     <span className="pencil-divider"/>
     <button className="pencil-done" title="Eigene Schriftzüge über OpenRouter erkennen und mit den Markierungen auf diesem Gerät speichern" onClick={()=>void finish()} disabled={busy||!entries.length&&!groups.length}>{busy?<LoaderCircle size={16} className="spin"/>:null}{busy?'Erkennen …':'Fertig'}</button>
     <button className="icon-button" disabled={busy} aria-label="Pencil-Modus schließen, Entwürfe behalten" onClick={onToggle}><X size={18}/></button>
    </div>
    {error&&<p className="inline-error pencil-error" role="alert">{error}</p>}
    <span className="sr-only" role="status">{announcement}</span>
   </section>
  </>}
 </>;
}
