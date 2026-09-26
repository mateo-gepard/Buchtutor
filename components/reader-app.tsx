'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Bookmark,Check,ChevronDown,ChevronLeft,ChevronRight,Copy,ExternalLink,Highlighter,Info,List,LoaderCircle,Maximize2,MessageSquare,Search,Settings2,Share2,Users,X,Lightbulb,Minimize2,MonitorSmartphone} from 'lucide-react';
import {BrandMark} from './brand-mark';
import {brand} from '@/lib/brand';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Switch} from '@/components/ui/switch';
import {ReaderText} from './reader-text';
import {ReaderFigures} from './reader-figures';
import {ReaderLibrary} from './reader-library';
import {ReaderAssistant,type AIStatus} from './reader-assistant';
import {Notebook,NotesList} from './reader-notes';
import {ReaderTransfer} from './reader-transfer';
import {ReaderShare,type ShareTarget} from './reader-share';
import {useLocalReader} from '@/hooks/use-local-reader';
import {defaultPrefs,type Prefs} from '@/lib/preferences';
import {deleteLocalNote,deviceId,saveLocalNote,saveLocalPreferences,saveLocalProgress,setLocalBookmark} from '@/lib/local-storage';
import {matchesBookmark} from '@/lib/bookmarks';
import {readerShareUrl} from '@/lib/share-links';
import {useReaderTools} from '@/hooks/use-reader-tools';
import {useTextSelection} from '@/hooks/use-text-selection';
import {sameAnchor} from '@/lib/dom-selection';
import type {Analysis,AnalysisMode,Anchor,Book,ReadingProgress,SavedNote,Section,WorkMeta} from '@/lib/reader-model';
import {firstReadable,makeAnchor,referenceLabel,unitLabel} from '@/lib/reader-model';

type View='reader'|'library'|'notes';
type Props={initialBook:Book;catalog:WorkMeta[];initialSection:string;initialView:string;explicitSection:boolean;aiStatus:AIStatus};
type Position={id:string;top:number};
const isText=(b:{kind:string})=>b.kind==='verse'||b.kind==='prose';
async function request<T>(url:string,data?:unknown,signal?:AbortSignal):Promise<T>{
  const response=await fetch(url,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-Leseraum-Device':deviceId()}:undefined,body:data?JSON.stringify(data):undefined,signal});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error??'Das hat gerade nicht geklappt. Bitte versuche es erneut.');
  return result as T;
}
function afterLayout(action:()=>void){requestAnimationFrame(()=>requestAnimationFrame(action));}
function scrollToBlock(id?:string){afterLayout(()=>{if(id)document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'});else window.scrollTo({top:0,behavior:'instant'});});}

export function ReaderApp({initialBook,catalog,initialSection,initialView,explicitSection,aiStatus}:Props){
  const local=useLocalReader(),prefs=local.data.preferences.value;
  const notes=useMemo(()=>local.data.notes.filter(n=>!n.deletedAt).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),[local.data.notes]);
  const [book,setBook]=useState(initialBook),[sectionId,setSectionId]=useState(initialSection),[view,setView]=useState<View>(initialView as View);
  const [selection,setSelection]=useState<Anchor|null>(null),[result,setResult]=useState<Analysis|null>(null),[question,setQuestion]=useState('');
  const [analysisBusy,setAnalysisBusy]=useState(false),[analysisError,setAnalysisError]=useState(''),[remaining,setRemaining]=useState<number>(),[normalized,setNormalized]=useState(false);
  const [saving,setSaving]=useState(false),[editNote,setEditNote]=useState<SavedNote|null>(null),[drafts,setDrafts]=useState<Record<string,string>>({});
  const [panel,setPanel]=useState('help'),[panelOpen,setPanelOpen]=useState(false),[panelExpanded,setPanelExpanded]=useState(false),[contentsOpen,setContentsOpen]=useState(false),[focus,setFocus]=useState(false);
  const [dialog,setDialog]=useState<'search'|'settings'|'source'|'share'|null>(null),[settingsTab,setSettingsTab]=useState('reading');
  const [shareTarget,setShareTarget]=useState<ShareTarget|null>(null),[bookmarkBusy,setBookmarkBusy]=useState(false);
  const [query,setQuery]=useState(''),[jump,setJump]=useState(''),[jumpError,setJumpError]=useState('');
  const [selectedCharacters,setSelectedCharacters]=useState<string[]>([]),[selectMode,setSelectMode]=useState(false),[bookBusy,setBookBusy]=useState(false),[notice,setNotice]=useState(''),[deleted,setDeleted]=useState<SavedNote|null>(null);
  const [currentBlock,setCurrentBlock]=useState(''),[scrub,setScrub]=useState<number|null>(null);
  const section=book.sections.find(s=>s.id===sectionId)??firstReadable(book),sectionIndex=book.sections.findIndex(s=>s.id===section.id);
  const bookCache=useRef(new Map([[initialBook.id,initialBook]])),bookRequest=useRef(0),analysisRequest=useRef<AbortController|null>(null);
  const article=useRef<HTMLElement>(null),noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),restored=useRef(false),position=useRef<Position|null>(null),resizePosition=useRef<Position|null>(null),panelTrigger=useRef<HTMLElement|null>(null),panelHeading=useRef<HTMLHeadingElement>(null);
  const contentsPosition=useRef<Position|null>(null),contentsTrigger=useRef<HTMLElement|null>(null);
  const dialogTrigger=useRef<HTMLElement|null>(null);
  const activeSelection=useRef({bookId:book.id,anchor:selection});
  const linePivot=useRef<string|null>(null),rangeStart=useRef<string|null>(null);
  useEffect(()=>{activeSelection.current={bookId:book.id,anchor:selection};},[book.id,selection]);
  const draftKey=selection?book.editionId+':'+JSON.stringify(selection)+':'+(editNote?.id??'new'):'none';
  const draft=drafts[draftKey]??editNote?.body??'';
  const sectionNotes=notes.filter(n=>n.workId===book.id&&n.editionId===book.editionId&&n.anchor.sectionId===section.id);
  const locations=useMemo(()=>book.sections.flatMap(s=>s.blocks.filter(isText).map(b=>({section:s,block:b}))),[book]);
  const progressIndex=Math.max(0,locations.findIndex(item=>item.block.id===currentBlock));
  const displayedLocation=locations[scrub??progressIndex];
  const bookmarkRow=section.blocks.find(b=>b.id===currentBlock&&isText(b))??section.blocks.find(isText);
  const bookmarkAnchor=selection??(bookmarkRow?makeAnchor(section,bookmarkRow.id):null);
  const bookmarked=!!bookmarkAnchor&&notes.some(note=>matchesBookmark(note,book.id,book.editionId,bookmarkAnchor));
  const announce=useCallback((message:string)=>{setNotice(message);if(noticeTimer.current)clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),7000);},[]);
  const nativeSelection=useTextSelection({root:article,section,enabled:view==='reader'&&!dialog&&!contentsOpen,onSelect:anchor=>{
    if(sameAnchor(activeSelection.current.anchor,anchor))return;
    linePivot.current=anchor.startId;rangeStart.current=null;setSelectMode(false);changeSelection(anchor);
  },onError:announce});

  function capturePosition(){
    const row=[...(article.current?.querySelectorAll<HTMLElement>('[data-block]')??[])].find(el=>el.getBoundingClientRect().bottom>95);
    return row?{id:row.dataset.block!,top:row.getBoundingClientRect().top}:null;
  }
  function restorePosition(saved:Position|null){
    if(!saved)return;
    afterLayout(()=>{const element=document.getElementById(saved.id);if(element)window.scrollBy({top:element.getBoundingClientRect().top-saved.top,behavior:'instant'});});
  }
  function updateURL(nextBook:Book,nextSection:Section,nextView:View,blockId?:string,replace=false){
    const url=new URL(window.location.href);
    url.search=nextView==='library'?'view=library':new URLSearchParams({work:nextBook.id,section:nextSection.id,view:nextView}).toString();url.hash=blockId??'';
    if(url.href!==window.location.href)window.history[replace?'replaceState':'pushState']({},'',url);
  }
  function cancelAnalysis(){analysisRequest.current?.abort();setAnalysisBusy(false);}
  function resetSelection(){cancelAnalysis();nativeSelection.clear();activeSelection.current={bookId:book.id,anchor:null};linePivot.current=null;rangeStart.current=null;setSelection(null);setResult(null);setAnalysisError('');setEditNote(null);setQuestion('');setNormalized(false);setSelectMode(false);}
  function changeSelection(anchor:Anchor){cancelAnalysis();activeSelection.current={bookId:book.id,anchor};setSelection(anchor);setResult(null);setAnalysisError('');setEditNote(null);setQuestion('');setNormalized(false);}
  function closePanel(){const saved=capturePosition();setPanelOpen(false);setPanelExpanded(false);restorePosition(saved);panelTrigger.current?.focus({preventScroll:true});}
  function openPanel(tab='help'){
    nativeSelection.freeze();setSelectMode(false);rangeStart.current=null;
    const saved=capturePosition();panelTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    setPanel(tab);setPanelOpen(true);setContentsOpen(false);setFocus(false);restorePosition(saved);
    afterLayout(()=>panelHeading.current?.focus({preventScroll:true}));
  }
  function showView(next:View){resetSelection();setView(next);setPanelOpen(false);setContentsOpen(false);setFocus(false);updateURL(book,section,next);scrollToBlock();}
  function goToSection(id:string,blockId?:string,writeURL=true){
    const next=book.sections.find(s=>s.id===id);if(!next)return;
    contentsPosition.current=null;resetSelection();setSectionId(id);setSelectedCharacters([]);setContentsOpen(false);setView('reader');setPanelOpen(false);setScrub(null);
    setCurrentBlock(blockId??next.blocks.find(isText)?.id??'');
    if(writeURL)updateURL(book,next,'reader',blockId);
    scrollToBlock(blockId);
  }
  async function openBook(id:string,target?:{sectionId?:string;blockId?:string;anchor?:Anchor;note?:SavedNote},destination:View='reader',writeURL=true){
    const seq=++bookRequest.current;setBookBusy(true);resetSelection();
    try{
      const next=bookCache.current.get(id)??(await request<{book:Book}>('/api/books/'+encodeURIComponent(id))).book;
      if(!next)throw new Error('Das Werk ist nicht verfügbar.');if(seq!==bookRequest.current)return;
      bookCache.current.set(id,next);
      const remembered=prefs.autoBookmark?local.data.progress.find(p=>p.workId===id&&p.editionId===next.editionId):undefined;
      const nextSection=next.sections.find(s=>s.id===(target?.sectionId??remembered?.sectionId))??firstReadable(next);
      const blockId=target?.blockId??(target?.sectionId?undefined:remembered?.blockId);
      setBook(next);setSectionId(nextSection.id);setView(destination);setSelectedCharacters([]);setPanelOpen(false);setContentsOpen(false);setFocus(false);setScrub(null);setCurrentBlock(blockId??nextSection.blocks.find(isText)?.id??'');
      if(writeURL)updateURL(next,nextSection,destination,blockId);
      scrollToBlock(destination==='reader'?blockId:undefined);
      if(target?.anchor){setSelection(target.anchor);setEditNote(target.note??null);setResult(target.note?.analysis??null);setPanel(target.note?.analysis?'help':'notes');if(target.note)setPanelOpen(true);}
    }catch(e){announce((e as Error).message);}finally{if(seq===bookRequest.current)setBookBusy(false);}
  }
  function openContents(){contentsPosition.current=capturePosition();contentsTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setContentsOpen(true);setPanelOpen(false);restorePosition(contentsPosition.current);}
  function openSettings(tab='reading'){position.current=capturePosition();setSettingsTab(tab);setDialog('settings');}
  function setPrefs(next:Prefs){void saveLocalPreferences(next).catch(e=>announce(e.message));}
  function toggleFocus(){const saved=capturePosition();setFocus(!focus);setPanelOpen(false);setContentsOpen(false);restorePosition(saved);}
  useEffect(()=>{document.documentElement.dataset.theme=prefs.theme;},[prefs.theme]);
  useEffect(()=>()=>{analysisRequest.current?.abort();if(noticeTimer.current)clearTimeout(noticeTimer.current);},[]);
  useEffect(()=>{
    if(!local.ready||restored.current)return;
    const frame=requestAnimationFrame(()=>{
      restored.current=true;
      const saved=prefs.autoBookmark?local.data.progress.find(p=>p.workId===initialBook.id&&p.editionId===initialBook.editionId):undefined;
      const hash=decodeURIComponent(window.location.hash.slice(1));
      if(initialView==='reader'&&!hash&&saved&&(!explicitSection||saved.sectionId===initialSection)){
        const remembered=initialBook.sections.find(s=>s.id===saved.sectionId);
        if(remembered){setSectionId(remembered.id);setCurrentBlock(saved.blockId);scrollToBlock(hash||saved.blockId);return;}
      }
      if(hash)scrollToBlock(hash);
    });return()=>cancelAnimationFrame(frame);
  },[local.ready,local.data.progress,prefs.autoBookmark,initialBook,initialSection,initialView,explicitSection]);
  useEffect(()=>{
    function pop(){
      const params=new URLSearchParams(window.location.search);
      const nextView:View=params.get('view')==='notes'?'notes':params.get('view')==='library'||!params.get('work')?'library':'reader';
      void openBook(params.get('work')??book.id,{sectionId:params.get('section')??undefined,blockId:decodeURIComponent(window.location.hash.slice(1))||undefined},nextView,false);
    }
    window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);
  });
  useEffect(()=>{
    function keyboard(event:KeyboardEvent){
      if(event.key!=='Escape'||dialog||contentsOpen)return;
      if(panelOpen){event.preventDefault();setPanelOpen(false);panelTrigger.current?.focus({preventScroll:true});}
      else if(focus)setFocus(false);
    }
    window.addEventListener('keydown',keyboard);return()=>window.removeEventListener('keydown',keyboard);
  },[dialog,contentsOpen,panelOpen,focus]);
  useEffect(()=>{
    function unload(event:BeforeUnloadEvent){if(Object.entries(drafts).some(([key,value])=>value.trim()&&(!editNote||!key.endsWith(editNote.id)||value!==editNote.body)))event.preventDefault();}
    window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);
  },[drafts,editNote]);

  useEffect(()=>{
    if(view!=='reader'||!local.ready)return;
    let timer:ReturnType<typeof setTimeout>,frame=0,last='';
    let latest:ReadingProgress|undefined;
    function persist(){if(prefs.autoBookmark&&latest)void saveLocalProgress(latest).catch(e=>announce(e.message));}
    function capture(){
      const rows=[...(article.current?.querySelectorAll<HTMLElement>('[data-block]')??[])];
      const row=rows.find(el=>el.getBoundingClientRect().bottom>(focus?24:95))??rows.at(-1);
      if(!row)return;resizePosition.current={id:row.dataset.block!,top:row.getBoundingClientRect().top};
      if(row.dataset.block===last)return;last=row.dataset.block!;
      setCurrentBlock(last);latest={workId:book.id,editionId:book.editionId,sectionId:section.id,blockId:last,updatedAt:new Date().toISOString()};
      clearTimeout(timer);timer=setTimeout(persist,800);
    }
    function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(capture);}
    function hidden(){if(document.visibilityState==='hidden')persist();}
    const initial=setTimeout(schedule,250);
    window.addEventListener('scroll',schedule,{passive:true});document.addEventListener('visibilitychange',hidden);
    return()=>{clearTimeout(initial);clearTimeout(timer);cancelAnimationFrame(frame);persist();window.removeEventListener('scroll',schedule);document.removeEventListener('visibilitychange',hidden);};
  },[book.id,book.editionId,section.id,view,local.ready,prefs.autoBookmark,focus,announce]);
  useEffect(()=>{
    let width=window.innerWidth,timer:ReturnType<typeof setTimeout>;
    function resized(){
      if(view!=='reader'||window.innerWidth===width)return;
      width=window.innerWidth;
      const saved=resizePosition.current;
      clearTimeout(timer);timer=setTimeout(()=>restorePosition(saved),140);
    }
    window.addEventListener('resize',resized);
    return()=>{clearTimeout(timer);window.removeEventListener('resize',resized);};
  },[view]);

  function selectLine(id:string,extend=false){
    try{
      nativeSelection.clear();
      if(selectMode){
        const start=rangeStart.current;
        changeSelection(makeAnchor(section,start??id,id));linePivot.current=start??id;
        if(start){rangeStart.current=null;setSelectMode(false);}else rangeStart.current=id;
      }else{
        if(!extend)linePivot.current=id;
        changeSelection(makeAnchor(section,extend?(linePivot.current??selection?.startId??id):id,id));
      }
    }
    catch(e){announce((e as Error).message);}
  }
  function selectCharacter(id:string){setSelectedCharacters(old=>old.includes(id)?old.filter(x=>x!==id):[...old.slice(-1),id]);openPanel('figures');}
  async function analyze(mode:AnalysisMode){
    const chosen=nativeSelection.freeze()??activeSelection.current.anchor;if(!chosen)return;
    analysisRequest.current?.abort();const controller=new AbortController();analysisRequest.current=controller;
    setAnalysisBusy(true);setAnalysisError('');setResult(null);openPanel('help');
    try{
      const response=await request<{analysis:Analysis;quota?:{remaining:number};normalized:boolean;usedAnchor:Anchor}>('/api/analysis',{workId:book.id,editionId:book.editionId,anchor:chosen,mode,question:mode==='question'?question:''},controller.signal);
      if(!controller.signal.aborted){setResult(response.analysis);setSelection(response.usedAnchor);setNormalized(response.normalized);if(response.quota)setRemaining(response.quota.remaining);}
    }catch(e){if(!controller.signal.aborted)setAnalysisError((e as Error).message);}finally{if(!controller.signal.aborted)setAnalysisBusy(false);}
  }
  function example(){
    const item=aiStatus.examples.find(e=>e.workId===book.id);if(!item)return;
    goToSection(item.anchor.sectionId,item.anchor.startId);changeSelection(item.anchor);openPanel('help');
  }
  async function save(kind:SavedNote['kind']='note',analysis?:Analysis){
    const anchor=analysis?.anchor??selection;if(!anchor)return;setSaving(true);const key=draftKey;
    const id=editNote&&editNote.kind===kind?editNote.id:crypto.randomUUID(),now=new Date().toISOString();
    const note:SavedNote={id,workId:book.id,editionId:book.editionId,anchor,kind,body:kind==='note'?draft:'',analysis,createdAt:editNote?.id===id?editNote.createdAt:now,updatedAt:now};
    try{
      await saveLocalNote(note);
      setDrafts(old=>{const next={...old};delete next[key];return next;});
      if(activeSelection.current.bookId===note.workId&&JSON.stringify(activeSelection.current.anchor)===JSON.stringify(anchor))setEditNote(note);
      announce(kind==='note'?'Notiz auf diesem Gerät gespeichert.':kind==='bookmark'?'Lesezeichen gespeichert.':'Analyse mit der Textstelle gespeichert.');
    }catch(e){announce((e as Error).message);}finally{setSaving(false);}
  }
  async function removeNote(note:SavedNote){try{await deleteLocalNote(note.id);if(editNote?.id===note.id)setEditNote(null);setDeleted(note);announce('Eintrag gelöscht.');}catch(e){announce((e as Error).message);}}
  async function undo(){if(!deleted)return;try{await saveLocalNote({...deleted,deletedAt:undefined,updatedAt:new Date().toISOString()});setDeleted(null);announce('Eintrag wiederhergestellt.');}catch(e){announce((e as Error).message);}}
  function openNote(note:SavedNote){
    if(catalog.find(w=>w.id===note.workId)?.editionId!==note.editionId){announce('Diese Notiz gehört zu einer anderen Ausgabe. Ihr Originalzitat bleibt im Notizbuch erhalten.');return;}
    void openBook(note.workId,{sectionId:note.anchor.sectionId,blockId:note.anchor.startId,anchor:note.anchor,note});
  }
  function openAttached(items:SavedNote[]){
    if(items.length===1){openNote(items[0]);return;}
    nativeSelection.clear();
    changeSelection(items[0].anchor);openPanel('notes');
  }
  async function bookmark(){
    if(bookmarkBusy)return;
    const row=section.blocks.find(b=>b.id===currentBlock&&isText(b))??section.blocks.find(isText);if(!row)return;
    const anchor=nativeSelection.freeze()??activeSelection.current.anchor??makeAnchor(section,row.id);
    const enabled=!notes.some(note=>matchesBookmark(note,book.id,book.editionId,anchor));
    setBookmarkBusy(true);
    try{await setLocalBookmark(book.id,book.editionId,anchor,enabled);announce(enabled?'Lesezeichen gespeichert. Du findest es unter „Meine Notizen“.':'Lesezeichen entfernt.');}
    catch(e){announce((e as Error).message);}finally{setBookmarkBusy(false);}
  }
  function openShare(){
    const anchor=nativeSelection.freeze()??activeSelection.current.anchor??(bookmarkRow?makeAnchor(section,bookmarkRow.id):null);
    setShareTarget({url:readerShareUrl(window.location.origin,book.id,section.id,anchor?.startId),title:book.title,reference:[...section.path,section.title,referenceLabel(section,anchor??undefined)].join(' · ')});
    setDialog('share');
  }
  function jumpToReference(){
    const number=Number(jump),target=locations.find(({block})=>block.unit===book.referenceMode&&block.number!==undefined&&block.number<=number&&(block.numberEnd??block.number)>=number);
    if(!Number.isInteger(number)||number<1||!target){setJumpError('Diese Nummer ist in dieser Ausgabe nicht enthalten. Suche alternativ nach einem Wort aus der Stelle.');return;}
    setDialog(null);setJumpError('');goToSection(target.section.id,target.block.id);changeSelection(makeAnchor(target.section,target.block.id));
  }
  function commitScrub(value:number){const target=locations[value];if(target)goToSection(target.section.id,target.block.id);setScrub(null);}
  const searchResults=useMemo(()=>{
    const term=query.trim().toLocaleLowerCase('de');if(term.length<2)return [];
    return book.sections.flatMap(s=>s.blocks.filter(isText).filter(b=>b.text.toLocaleLowerCase('de').includes(term)).map(b=>({section:s,block:b}))).slice(0,50);
  },[book,query]);
  const groups=useMemo(()=>{
    const out:{label:string;sections:Section[]}[]=[];
    for(const s of book.sections){const label=s.path.join(' · ')||'Abschnitte';if(out.at(-1)?.label===label)out.at(-1)!.sections.push(s);else out.push({label,sections:[s]});}return out;
  },[book]);

  useReaderTools({
    read:()=>({view,workId:book.id,title:book.title,editionId:book.editionId,sectionId:section.id,referenceMode:book.referenceMode,selection,sections:book.sections.map(s=>({id:s.id,title:s.title,path:s.path})),blocks:section.blocks.filter(isText).map(b=>({id:b.id,text:b.text,number:b.number,unit:b.unit})),library:catalog.map(w=>({id:w.id,title:w.title}))}),
    open:async input=>{if(typeof input.workId!=='string'||typeof input.sectionId!=='string'||!catalog.some(w=>w.id===input.workId))throw new Error('Unknown work or section.');await openBook(input.workId,{sectionId:input.sectionId});return {opened:true};},
    select:input=>{
      if(typeof input.sectionId!=='string'||typeof input.startId!=='string'||(input.endId!==undefined&&typeof input.endId!=='string'))throw new Error('Section and block IDs are required.');
      for(const key of ['startOffset','endOffset'])if(input[key]!==undefined&&(!Number.isInteger(input[key])||Number(input[key])<0))throw new Error('Invalid offset.');
      const next=book.sections.find(s=>s.id===input.sectionId);if(!next)throw new Error('Unknown section.');
      const anchor=makeAnchor(next,input.startId,input.endId as string|undefined,input.startOffset as number|undefined,input.endOffset as number|undefined);
      goToSection(next.id,anchor.startId);changeSelection(anchor);return {selection:anchor,reference:referenceLabel(next,anchor)};
    },
  });

  return <div className={'reader-app '+(view==='reader'?'focus-reader':'')+(focus?' focus-mode':'')+(panelOpen?' has-panel':'')} style={{'--text-size':prefs.fontSize+'px','--text-leading':prefs.lineHeight,'--reading-font':prefs.font==='sans'?"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif":"Charter,'Bitstream Charter','Sitka Text',Cambria,serif"} as React.CSSProperties}>
    <a className="skip-link" href="#main-content">Zum Inhalt springen</a>
    {view==='reader'?<header className="reader-header">
      <button aria-label="Zur Bibliothek" className="back-link" onClick={()=>showView('library')}><ChevronLeft size={22}/><span>Bibliothek</span></button>
      <div className="reader-title"><strong>{book.title}</strong><span>{book.author}</span></div>
      <div className="reader-header-actions"><button className="toolbar-button contents-trigger" onClick={openContents}><List size={19}/><span>Inhalt</span></button><button className="type-button" aria-label="Leseeinstellungen" onClick={()=>openSettings()}>Aa</button><span className="toolbar-divider"/><button aria-label={focus?'Fokus beenden':'Fokus aktivieren'} className="focus-switch" onClick={toggleFocus} aria-pressed={focus}><span className="switch-track"/><span>Fokus</span></button></div>
    </header>:<header className="library-header"><button className="wordmark" aria-label="Buchtutor · Bibliothek" onClick={()=>showView('library')}><BrandMark/><span>{brand.name}</span></button><nav aria-label="Hauptnavigation"><button aria-current={view==='library'?'page':undefined} onClick={()=>showView('library')}>Bibliothek</button><button aria-current={view==='notes'?'page':undefined} onClick={()=>showView('notes')}>Meine Notizen</button></nav><button className="icon-button" aria-label="Einstellungen und Geräteübertragung" onClick={()=>openSettings()}><Settings2 size={20}/></button></header>}
    {focus&&<button className="focus-exit" onClick={toggleFocus}><Minimize2 size={17}/>Fokus beenden</button>}
    {local.error&&<div className="storage-error" role="alert">{local.error}</div>}
    {view==='library'?<ReaderLibrary catalog={catalog} progress={prefs.autoBookmark?local.data.progress:[]} onOpen={id=>void openBook(id)}/>:view==='notes'?<Notebook notes={notes} catalog={catalog} onOpen={openNote} onDelete={removeNote} onTransfer={()=>openSettings('transfer')}/>:<>
      <main className="reading-main" id="main-content">
        <article ref={article} className="reading-page">
          <div className="section-heading"><p>{[...section.path,section.title].join(' · ')}</p><div><button className="icon-button" aria-label="Text durchsuchen oder zu einem Vers springen" onClick={()=>setDialog('search')}><Search size={17}/></button><button className="icon-button" aria-label="Stelle teilen" onClick={openShare}><Share2 size={17}/></button><button className={'icon-button '+(selectMode?'pressed':'')} aria-label="Bereich durch Antippen auswählen" aria-pressed={selectMode} onClick={()=>{const next=!selectMode;resetSelection();setSelectMode(next);}}><Highlighter size={17}/></button></div></div>
          <h1 className="sr-only">{book.title} · {section.title}</h1>
          <ReaderText book={book} section={section} selection={selection} notes={notes} showNumbers={prefs.numbers} showCharacters={prefs.characters} selectMode={selectMode} canActivate={nativeSelection.canActivate} onSelect={selectLine} onCharacter={selectCharacter} onNote={openNote} onNotes={openAttached}/>
          <nav className="section-pagination" aria-label="Weiterlesen"><button disabled={sectionIndex===0} onClick={()=>goToSection(book.sections[sectionIndex-1].id)}><ChevronLeft size={18}/>Voriger Abschnitt</button><button disabled={sectionIndex===book.sections.length-1} onClick={()=>goToSection(book.sections[sectionIndex+1].id)}>Nächster Abschnitt<ChevronRight size={18}/></button></nav>
          <button className="reading-source-link" onClick={()=>setDialog('source')}>Quelle und Zitierweise<ExternalLink size={13}/></button>
        </article>
      </main>
      {!focus&&!panelOpen&&<button className="help-edge" onClick={()=>openPanel()} aria-label="Lesehilfe öffnen"><Lightbulb size={17}/><span>Hilfe</span><ChevronLeft size={15}/></button>}
      {!focus&&<footer className="reading-footer">
        <button className="footer-section" onClick={openContents}><List size={17}/><span>{section.path.at(-1)??section.title}</span></button>
        <div className="reading-progress"><button className="icon-button" aria-label="Voriger Abschnitt" disabled={sectionIndex===0} onClick={()=>goToSection(book.sections[sectionIndex-1].id)}><ChevronLeft size={17}/></button><input type="range" min="0" max={Math.max(0,locations.length-1)} value={scrub??progressIndex} aria-label="Leseposition im Werk" aria-valuetext={displayedLocation?unitLabel(displayedLocation.block.unit)+' '+displayedLocation.block.number:''} onChange={e=>setScrub(Number(e.target.value))} onPointerUp={e=>commitScrub(Number(e.currentTarget.value))} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))commitScrub(Number(e.currentTarget.value));}}/><button className="icon-button" aria-label="Nächster Abschnitt" disabled={sectionIndex===book.sections.length-1} onClick={()=>goToSection(book.sections[sectionIndex+1].id)}><ChevronRight size={17}/></button></div>
        <button className="footer-reference" onClick={()=>setDialog('search')}>{displayedLocation?unitLabel(displayedLocation.block.unit,true)+' '+(displayedLocation.block.number??''):section.title}</button>
        <button className={'icon-button reader-bookmark '+(bookmarked?'is-bookmarked':'')} aria-label={bookmarked?'Lesezeichen entfernen':'Lesezeichen setzen'} aria-pressed={bookmarked} disabled={bookmarkBusy||!local.ready} onClick={()=>void bookmark()} title={bookmarked?'Lesezeichen entfernen':'Lesezeichen setzen'}><Bookmark size={18} fill={bookmarked?'currentColor':'none'}/></button>
        <button className="mobile-type" onClick={()=>openSettings()} aria-label="Leseeinstellungen">Aa</button><button className="mobile-help" onClick={()=>panelOpen?closePanel():openPanel()} aria-expanded={panelOpen}><Lightbulb size={18}/>Hilfe</button>
      </footer>}
      {(selection||selectMode)&&!panelOpen&&<div className={'selection-dock '+(selectMode?'range-selection-dock':'')} role="group" aria-label="Aktionen zur Textauswahl">
        {selectMode?<><span role="status">{selection?'Tippe auf das Ende der Passage.':'Tippe auf den Anfang der Passage.'}</span><button onClick={resetSelection}>Abbrechen</button></>:selection&&<><span>{referenceLabel(section,selection)}</span><button onClick={()=>void analyze('summary')}><Lightbulb size={17}/>Verstehen</button><button onClick={()=>openPanel('notes')}><MessageSquare size={17}/>Notiz</button><button className={'icon-button '+(bookmarked?'is-bookmarked':'')} aria-label={bookmarked?'Lesezeichen der Auswahl entfernen':'Auswahl als Lesezeichen speichern'} aria-pressed={bookmarked} disabled={bookmarkBusy||!local.ready} onClick={()=>void bookmark()}><Bookmark size={17} fill={bookmarked?'currentColor':'none'}/></button><button className="icon-button" aria-label="Weitere Analysearten" onClick={()=>openPanel('help')}><ChevronDown size={18}/></button><button className="icon-button" aria-label="Auswahl aufheben" onClick={resetSelection}><X size={18}/></button></>}
      </div>}
    </>}

    {view==='reader'&&panelOpen&&!focus&&<aside className={'assistant-panel '+(panelExpanded?'expanded':'')} aria-labelledby="assistant-title">
      <div className="panel-handle" aria-hidden="true"/><div className="assistant-heading"><h2 id="assistant-title" ref={panelHeading} tabIndex={-1}>Lesehilfe</h2><div><button className="icon-button expand-panel" aria-label={panelExpanded?'Lesehilfe verkleinern':'Lesehilfe vergrößern'} onClick={()=>setPanelExpanded(!panelExpanded)}>{panelExpanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button><button className="icon-button" aria-label="Lesehilfe schließen" onClick={closePanel}><X size={19}/></button></div></div>
      <div className="companion-tabs" role="group" aria-label="Lesehilfe auswählen">{[['help','Verstehen',Lightbulb],['figures','Figuren',Users],['notes','Notizen',MessageSquare]].map(([value,label,Icon])=>{const TabIcon=Icon as typeof Lightbulb;return <button key={value as string} aria-pressed={panel===value} onClick={()=>setPanel(value as string)}><TabIcon size={18}/>{label as string}</button>;})}</div>
      <div className="panel-scroll">
        {panel==='help'?<ReaderAssistant book={book} section={section} selection={selection} analysis={result} status={aiStatus} busy={analysisBusy} error={analysisError} question={question} setQuestion={setQuestion} onAnalyze={mode=>void analyze(mode)} onExample={example} onFigures={()=>setPanel('figures')} onNote={()=>setPanel('notes')} onSave={()=>result&&void save(result.mode,result)} onQuote={id=>{closePanel();scrollToBlock(id);}} saving={saving} saved={!!result&&notes.some(n=>n.analysis?.id===result.id)} remaining={remaining} normalized={normalized} onCancel={cancelAnalysis}/>:panel==='figures'?<ReaderFigures key={book.id} book={book} section={section} selected={selectedCharacters} onSelect={selectCharacter}/>:<div className="panel-notes">
          {selection?<><div className="selection-excerpt"><span>{referenceLabel(section,selection)}</span><blockquote>{selection.quote.slice(0,220)}{selection.quote.length>220?' …':''}</blockquote></div><label className="note-editor"><span>Deine Notiz</span><textarea value={draft} onChange={e=>setDrafts(old=>({...old,[draftKey]:e.target.value}))} maxLength={12000} placeholder="Was möchtest du festhalten?" rows={4}/></label><p className="small-note">{draft!==editNote?.body&&draft?'Ungespeicherter Entwurf':'Wird auf diesem Gerät gespeichert.'}</p><button className="primary-button" onClick={()=>void save('note')} disabled={saving||!draft.trim()}>{saving?<LoaderCircle className="spin" size={17}/>:<Check size={17}/>}Notiz speichern</button></>:<p>Wähle eine Stelle im Text aus, um eine Notiz anzulegen.</p>}
          <h3 className="notes-section-heading">In diesem Abschnitt</h3><NotesList notes={sectionNotes} catalog={catalog} onOpen={openNote} onDelete={removeNote} compact/>{!sectionNotes.length&&<p className="small-note">Noch keine gespeicherten Einträge.</p>}
        </div>}
      </div>
    </aside>}

    <Dialog open={contentsOpen} onOpenChange={setContentsOpen}><DialogContent className="contents-dialog" onOpenAutoFocus={event=>event.preventDefault()} onCloseAutoFocus={event=>{event.preventDefault();contentsTrigger.current?.focus({preventScroll:true});restorePosition(contentsPosition.current);contentsPosition.current=null;}}><DialogHeader><DialogTitle>Inhaltsverzeichnis</DialogTitle><DialogDescription>{book.title}</DialogDescription></DialogHeader>
      <div className="contents-scroll"><button className="contents-search" onClick={()=>{setContentsOpen(false);setDialog('search');}}><Search size={18}/>Suchen oder zu {unitLabel(book.referenceMode)} springen</button>
        <nav aria-label="Abschnitte des Werkes">{groups.map((group,i)=><details key={book.id+'-'+i+'-'+section.path.join()} className="contents-group" open={group.sections.some(s=>s.id===section.id)||groups.length===1}><summary>{group.label}<ChevronDown size={16}/></summary>{group.sections.map(s=><button key={s.id} className="scene-nav" aria-current={section.id===s.id?'location':undefined} onClick={()=>goToSection(s.id)}><span>{s.title}</span>{s.firstRef&&<small>{unitLabel(s.unit,true)} {s.firstRef}</small>}</button>)}</details>)}</nav>
        <button className="source-mini" onClick={()=>{setContentsOpen(false);openShare();}}><Share2 size={17}/>Stelle teilen</button><button className="source-mini" onClick={()=>{setContentsOpen(false);setDialog('source');}}><Info size={17}/>Quelle und Zitierweise</button><button className="source-mini" onClick={()=>{setContentsOpen(false);showView('notes');}}><MessageSquare size={17}/>Meine Notizen</button>
      </div>
    </DialogContent></Dialog>

    <Dialog open={!!dialog} onOpenChange={open=>{if(!open){setDialog(null);if(dialog==='settings'){restorePosition(position.current);position.current=null;}}}}>
      <DialogContent className={'reader-dialog '+(dialog==='source'?'source-dialog':'')} onOpenAutoFocus={event=>{dialogTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;if(dialog!=='share')event.preventDefault();}} onCloseAutoFocus={event=>{event.preventDefault();if(dialogTrigger.current?.isConnected)dialogTrigger.current.focus({preventScroll:true});}}>
        <DialogHeader><DialogTitle>{dialog==='search'?'Stelle finden':dialog==='settings'?'Einstellungen':dialog==='share'?'Stelle teilen':'Quelle und Zitierweise'}</DialogTitle><DialogDescription>{dialog==='settings'?'Lesen und Daten auf diesem Gerät':book.title+' · '+book.author}</DialogDescription></DialogHeader>
        {dialog==='settings'&&<><div className="settings-tabs" role="group" aria-label="Einstellungsbereich"><button aria-pressed={settingsTab==='reading'} onClick={()=>setSettingsTab('reading')}>Lesen</button><button aria-pressed={settingsTab==='transfer'} onClick={()=>setSettingsTab('transfer')}><MonitorSmartphone size={17}/>Geräteübertragung</button></div>{settingsTab==='transfer'?<ReaderTransfer data={local.data} onDone={announce}/>:<div className="reading-settings">
          <label className="setting-row">Schriftgröße <output>{prefs.fontSize} px</output><input type="range" aria-label="Schriftgröße" min="16" max="30" step="1" value={prefs.fontSize} onChange={e=>setPrefs({...prefs,fontSize:Number(e.target.value)})}/></label>
          <label className="setting-row">Zeilenabstand <output>{prefs.lineHeight.toFixed(2)}</output><input type="range" aria-label="Zeilenabstand" min="1.5" max="2.4" step="0.05" value={prefs.lineHeight} onChange={e=>setPrefs({...prefs,lineHeight:Number(e.target.value)})}/></label>
          <div className="setting-row"><span>Schrift</span><div className="segmented-control">{[['sans','Klar'],['serif','Buchschrift']].map(([value,label])=><button key={value} aria-pressed={prefs.font===value} onClick={()=>setPrefs({...prefs,font:value as Prefs['font']})}>{label}</button>)}</div></div>
          <div className="theme-options">{[['paper','Hell'],['sepia','Warm'],['night','Nacht']].map(([value,label])=><button key={value} className={'theme-'+value} aria-pressed={prefs.theme===value} onClick={()=>setPrefs({...prefs,theme:value as Prefs['theme']})}><span>Aa</span>{label}</button>)}</div>
          <div className="setting-inline"><label htmlFor="setting-numbers">Vers- und Absatznummern</label><Switch id="setting-numbers" checked={prefs.numbers} onCheckedChange={value=>setPrefs({...prefs,numbers:value})}/></div>
          <div className="setting-inline"><label htmlFor="setting-characters">Figuren im Text markieren</label><Switch id="setting-characters" checked={prefs.characters} onCheckedChange={value=>setPrefs({...prefs,characters:value})}/></div>
          <div className="setting-inline"><label htmlFor="setting-auto-bookmark">Automatisches Lesezeichen</label><Switch id="setting-auto-bookmark" checked={prefs.autoBookmark} onCheckedChange={value=>setPrefs({...prefs,autoBookmark:value})}/></div>
          <p className="small-note">Merkt deine letzte Lesestelle und öffnet das Buch dort wieder. Manuell gesetzte Lesezeichen bleiben auch bei ausgeschalteter Automatik erhalten.</p>
          <p className="settings-preview" style={{fontSize:prefs.fontSize,lineHeight:prefs.lineHeight,fontFamily:prefs.font==='sans'?'inherit':"Charter,'Sitka Text',Cambria,serif"}}>Das Land der Griechen mit der Seele suchend.</p><button className="text-button" onClick={()=>setPrefs(defaultPrefs)}>Leseeinstellungen zurücksetzen</button>
          <div className="settings-links"><a href="/datenschutz">Datenschutz</a><a href="/impressum">Impressum</a></div>
        </div>}</>}
        {dialog==='share'&&shareTarget&&<ReaderShare key={shareTarget.url} target={shareTarget}/>}
        {dialog==='search'&&<><form className="jump-form" onSubmit={e=>{e.preventDefault();jumpToReference();}}><label htmlFor="jump-number">Zu {unitLabel(book.referenceMode)} springen</label><div><input id="jump-number" className="text-input" type="number" inputMode="numeric" min="1" step="1" value={jump} onChange={e=>{setJump(e.target.value);setJumpError('');}} placeholder="z. B. 322"/><button className="primary-button" type="submit">Öffnen<ArrowRight size={16}/></button></div>{jumpError&&<p className="inline-error" role="alert">{jumpError}</p>}{book.referenceMode!=='verse'&&<p className="small-note">Nummern gelten für diese Digitalausgabe.</p>}</form><label className="search-field"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Wort oder Textstelle" aria-label="Im gesamten Werk suchen"/></label><div className="search-results">{searchResults.map(({section:s,block:b})=><button key={b.id} onClick={()=>{setDialog(null);goToSection(s.id,b.id);changeSelection(makeAnchor(s,b.id));}}><span>{s.path.join(' · ')} {s.title} · {unitLabel(b.unit,true)} {b.number}</span><p>{b.text.slice(Math.max(0,b.text.toLocaleLowerCase('de').indexOf(query.toLocaleLowerCase('de'))-50),Math.max(0,b.text.toLocaleLowerCase('de').indexOf(query.toLocaleLowerCase('de'))-50)+230)}</p></button>)}{query.length>=2&&!searchResults.length&&<p>Keine Stelle gefunden.</p>}{searchResults.length===50&&<p className="small-note">Die ersten 50 Treffer. Grenze die Suche weiter ein.</p>}</div></>}
        {dialog==='source'&&<div className="source-details"><h3>Nummern dieser Ausgabe</h3><p>{book.note}</p>{!!book.validation.missingReferences?.length&&<p>Die Vorlage lässt die Nummern {book.validation.missingReferences[0]}–{book.validation.missingReferences.at(-1)} im Lesetext aus. Diese Lücke bleibt erhalten.</p>}<p>Ein Abgleich mit einer bestimmten Reclam-ISBN und die vollständige fachliche Durchsicht stehen noch aus.</p><h3>Textgrundlage</h3><p>{book.sourceEdition}</p><a href={book.sourceUrl} target="_blank" rel="noreferrer">{book.sourceLabel}<ExternalLink size={14}/></a><h3>Nutzung</h3>{book.licenses.map(license=><p key={license.name}><a href={license.url} target="_blank" rel="noreferrer">{license.name}<ExternalLink size={13}/></a></p>)}{book.id==='faust'&&<p>Diese Faust-Textgrundlage darf nur nichtkommerziell weiterverwendet werden.</p>}<details><summary>Ausgabe identifizieren</summary><code>{book.editionId}</code><p className="small-note">SHA-256: {book.revision}</p></details><button className="secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(book.author+': '+book.title+'. '+section.path.join(', ')+' '+section.title+', '+referenceLabel(section,selection??undefined)+'. '+book.sourceEdition+'. '+book.sourceUrl);announce('Quellenangabe kopiert.');}catch{announce('Kopieren wurde vom Browser nicht erlaubt.');}}}><Copy size={16}/>Quellenangabe kopieren</button></div>}
      </DialogContent>
    </Dialog>
    {bookBusy&&<div className="loading-overlay" role="status"><LoaderCircle className="spin" size={22}/><span>Werk wird geöffnet …</span></div>}
    {(notice||deleted)&&<div className={'toast '+(view==='reader'&&(selection||selectMode)&&!panelOpen?'above-selection':'')} role="status"><span>{notice||'Eintrag gelöscht.'}</span>{deleted&&<button onClick={()=>void undo()}>Rückgängig</button>}<button className="icon-button" aria-label="Hinweis schließen" onClick={()=>{setNotice('');setDeleted(null);}}><X size={16}/></button></div>}
  </div>;
}
