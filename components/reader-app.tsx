'use client';
import {useCallback,useEffect,useEffectEvent,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore,type MouseEvent} from 'react';
import {ArrowRight,BookOpen,Bookmark,Check,ChevronDown,ChevronLeft,ChevronRight,Copy,ExternalLink,MousePointer2,Info,List,LoaderCircle,Maximize2,MessageSquare,Search,Settings2,Share2,Users,X,Lightbulb,Minimize2,MonitorSmartphone,CircleHelp,Headphones} from 'lucide-react';
import {ApplePencilIcon} from './apple-pencil-icon';
import {BrandMark} from './brand-mark';
import {brand} from '@/lib/brand';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Switch} from '@/components/ui/switch';
import {ReaderOnboarding} from './reader-onboarding';
import {ReaderAudio} from './reader-audio';
import {ReaderWorkspace} from './reader-workspace';
import {DocumentZoomControls} from './document-zoom-controls';
import {useDocumentZoom} from '@/hooks/use-document-zoom';
import {hasAudiobook,type AudioPosition} from '@/lib/audiobook';
import {pencilPalette,type PencilColor} from '@/lib/pencil-model';
import {ONBOARDING_KEY,tourSteps} from '@/lib/onboarding';
import {ReaderPencil} from './reader-pencil';
import {ReaderPassageSelection} from './reader-passage-selection';
import {ReaderMultiSelection} from './reader-multi-selection';
import {ReaderSelectionActions} from './reader-selection-actions';
import {ReaderAnnotationDetails} from './reader-annotation-details';
import {useSelectionDismiss} from '@/hooks/use-selection-dismiss';
import {addPassage,toggleSelected} from '@/lib/reader-selection';
import {selectionHighlights} from '@/lib/selection-highlights';
import {useNoteDrafts} from '@/hooks/use-note-drafts';
import {useNotebookSession} from '@/hooks/use-notebook-session';
import {queueHandwriting,retryHandwriting} from '@/lib/handwriting-client';
import {noteText} from '@/lib/reader-model';
import {ReaderText} from './reader-text';
import {ReaderFigures} from './reader-figures';
import {ReaderLibrary,type LibraryFilters} from './reader-library';
import {ReaderSelectionGuide} from './reader-selection-guide';
import {parseNoteDraftLocations,type NoteDraftLocation} from '@/lib/note-draft-index';
import {readPencilDraftLocations} from '@/lib/pencil-draft-index';
import {ReaderAssistant,type AIStatus} from './reader-assistant';
import {Notebook,NotesList,defaultNotebookFilters} from './reader-notes';
import {ReaderTransfer} from './reader-transfer';
import {ReaderShare,type ShareTarget} from './reader-share';
import {useLocalReader} from '@/hooks/use-local-reader';
import {defaultPrefs,type Prefs} from '@/lib/preferences';
import {deleteLocalNotes,restoreLocalNotes,deviceId,saveLocalNote,saveLocalPreferences,saveLocalProgress,setLocalBookmark,updateLocal} from '@/lib/local-storage';
import {matchesBookmark} from '@/lib/bookmarks';
import {readerShareUrl} from '@/lib/share-links';
import {useReaderTools} from '@/hooks/use-reader-tools';
import {useTextSelection} from '@/hooks/use-text-selection';
import {sameAnchor,domTextRange} from '@/lib/dom-selection';
import {compareAnnotations} from '@/lib/annotation-groups';
import type {Analysis,AnalysisMode,Anchor,Book,ReadingProgress,SavedNote,Section,WorkMeta} from '@/lib/reader-model';
import {firstReadable,makeAnchor,referenceLabel,unitLabel,validateAnchor} from '@/lib/reader-model';

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
const inlineToolsQuery='(max-width: 999px)';
function subscribeInlineTools(callback:()=>void){const query=window.matchMedia(inlineToolsQuery);query.addEventListener('change',callback);return()=>query.removeEventListener('change',callback);}
const inlineToolsSnapshot=()=>window.matchMedia(inlineToolsQuery).matches;
const serverInlineToolsSnapshot=()=>false;

export function ReaderApp({initialBook,catalog,initialSection,initialView,explicitSection,aiStatus}:Props){
  const local=useLocalReader(),prefs=local.data.preferences.value;
  const notes=useMemo(()=>local.data.notes.filter(n=>!n.deletedAt).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),[local.data.notes]);
  useEffect(()=>{if(local.ready&&prefs.handwritingCloud)queueHandwriting(notes);},[local.ready,prefs.handwritingCloud,notes]);
  const [book,setBook]=useState(initialBook),[sectionId,setSectionId]=useState(initialSection),[view,setView]=useState<View>(initialView as View);
  const [notebookSelection,setNotebookSelection]=useState<string[]>([]),[notebookSelecting,setNotebookSelecting]=useState(false);
  const [notebookFilters,setNotebookFilters]=useState(defaultNotebookFilters),[tourNotebookFilters,setTourNotebookFilters]=useState(defaultNotebookFilters);
  const notebookScroll=useRef(0),libraryScroll=useRef(0);
  const [libraryFilters,setLibraryFilters]=useState<LibraryFilters>({query:'',filter:'all'});
  const [resumedDraftKeys,setResumedDraftKeys]=useState<Record<string,string>>({});
  const [pendingPencilDrafts,setPendingPencilDrafts]=useState(0);
  const activePencilDraft=useRef<{key:string;hasDraft:boolean;marks:{anchor:Anchor;color:PencilColor}[]}|null>(null);
  const [selection,setSelection]=useState<Anchor|null>(null),[result,setResult]=useState<Analysis|null>(null),[question,setQuestion]=useState('');
  const [passages,setPassages]=useState<Anchor[]>([]),[addingPassage,setAddingPassage]=useState(false);
  const [pencilColor,setPencilColor]=useState<PencilColor>('green'),[markBusy,setMarkBusy]=useState(false);
  const marking=useRef(false);
  const [analysisBusy,setAnalysisBusy]=useState(false),[analysisError,setAnalysisError]=useState(''),[remaining,setRemaining]=useState<number>(),[normalized,setNormalized]=useState(false);
  const [saving,setSaving]=useState(false),[editNote,setEditNote]=useState<SavedNote|null>(null),[attachedIds,setAttachedIds]=useState<string[]>([]);
  const {drafts,alternatives:draftAlternatives,ready:draftsReady,error:draftError,change:changeDraft,clear:clearDraft,restore:restoreDraft}=useNoteDrafts();
  const typedDrafts=useMemo(()=>parseNoteDraftLocations(drafts,catalog,local.data.notes),[drafts,catalog,local.data.notes]);
  const [noteComposing,setNoteComposing]=useState(false);
  const noteInput=useRef<HTMLTextAreaElement>(null),noteComposition=useRef(false),pendingNoteFocus=useRef(false);
  const [annotationEditorReturn,setAnnotationEditorReturn]=useState<string[]>([]);
  const [panel,setPanel]=useState('help'),[panelOpen,setPanelOpen]=useState(false),[panelExpanded,setPanelExpanded]=useState(false),[contentsOpen,setContentsOpen]=useState(false),[focus,setFocus]=useState(false);
  const [dialog,setDialog]=useState<'search'|'settings'|'source'|'share'|null>(null),[settingsTab,setSettingsTab]=useState('reading');
  const [shareTarget,setShareTarget]=useState<ShareTarget|null>(null),[bookmarkBusy,setBookmarkBusy]=useState(false);
  const [query,setQuery]=useState(''),[jump,setJump]=useState(''),[jumpError,setJumpError]=useState('');
  const [selectedCharacters,setSelectedCharacters]=useState<string[]>([]),[selectMode,setSelectMode]=useState(false),[bookBusy,setBookBusy]=useState(false),[notice,setNotice]=useState(''),[deleted,setDeleted]=useState<SavedNote[]|null>(null);
  const [pencilMode,setPencilMode]=useState(false);
  const passageContexts=useRef(new Map<string,{result:Analysis|null;question:string;editNote:SavedNote|null;attachedIds:string[];normalized:boolean}>());
  const readingContexts=useRef(new Map<string,{selection:Anchor|null;passages:Anchor[];result:Analysis|null;question:string;editNote:SavedNote|null;attachedIds:string[];normalized:boolean;characters:string[]}>());
  const readingPlaces=useRef(new Map<string,{sectionId:string;blockId:string}>());
  const [pencilHost,setPencilHost]=useState<HTMLDivElement|null>(null),[audioHost,setAudioHost]=useState<HTMLDivElement|null>(null),[audioExpanded,setAudioExpanded]=useState(false),[menusKey,setMenusKey]=useState(0);
  const audioScrollRequest=useRef(0);
  const [audioOpen,setAudioOpen]=useState(false),[audioPosition,setAudioPosition]=useState<AudioPosition|null>(null);
  const narrowReader=useSyncExternalStore(subscribeInlineTools,inlineToolsSnapshot,serverInlineToolsSnapshot);
  const [detailHost,setDetailHost]=useState<HTMLDivElement|null>(null),[detailsAnchorId,setDetailsAnchorId]=useState('');
  const [tourStep,setTourStep]=useState<number|null>(null),[tourOpen,setTourOpen]=useState(false);
  useNotebookSession({filters:notebookFilters,selected:notebookSelection,selecting:notebookSelecting,scrollRef:notebookScroll,view,ready:local.ready&&draftsReady,practice:tourOpen,setFilters:setNotebookFilters,setSelected:setNotebookSelection,setSelecting:setNotebookSelecting});
  const [tourColor,setTourColor]=useState<PencilColor>('green'),[tourStamp,setTourStamp]=useState('');
  const [tourDone,setTourDone]=useState<Record<string,boolean>>({}),[tourSelection,setTourSelection]=useState<Anchor|null>(null),[tourBookmark,setTourBookmark]=useState(false),[tourMode,setTourMode]=useState<AnalysisMode>(),[tourNote,setTourNote]=useState(''),[tourCharacters,setTourCharacters]=useState<string[]>([]);
  const tourSnapshot=useRef<{view:View;focus:boolean;panel:string;panelOpen:boolean;panelExpanded:boolean;pencilMode:boolean;scrub:number|null;scrollY:number;position:Position|null;trigger:HTMLElement|null}|null>(null);
  const [currentBlock,setCurrentBlock]=useState(''),[scrub,setScrub]=useState<number|null>(null);
  const section=book.sections.find(s=>s.id===sectionId)??firstReadable(book),sectionIndex=book.sections.findIndex(s=>s.id===section.id);
  const bookCache=useRef(new Map([[initialBook.id,initialBook]])),bookRequest=useRef(0),bookAbort=useRef<AbortController|null>(null),analysisRequest=useRef<AbortController|null>(null);
  const article=useRef<HTMLElement>(null),noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),restored=useRef(false),position=useRef<Position|null>(null),resizePosition=useRef<Position|null>(null),panelTrigger=useRef<HTMLElement|null>(null),panelHeading=useRef<HTMLHeadingElement>(null);
  const {stageRef:documentStageRef,scale:documentScale,change:changeDocumentZoom,minimum:minimumZoom,maximum:maximumZoom}=useDocumentZoom({articleRef:article,enabled:view==='reader',gesturesEnabled:!dialog&&!contentsOpen&&!tourOpen,contextKey:book.id+':'+book.editionId});
  // Detailed controls use the existing screen-sized popover while the document is magnified.
  const inlineDetails=narrowReader&&view==='reader'&&documentScale===1;
  useLayoutEffect(()=>{if(dialog||contentsOpen||tourOpen)window.dispatchEvent(new Event('buchtutor-document-transform'));},[dialog,contentsOpen,tourOpen]);
  const contentsPosition=useRef<Position|null>(null),contentsTrigger=useRef<HTMLElement|null>(null);
  const pendingPosition=useRef<Position|null>(null),positionFrame=useRef(0),pendingPanelFocus=useRef(false);
  const panelScroll=useRef<HTMLDivElement>(null),panelScrollPositions=useRef<Record<string,number>>({});
  const dialogTrigger=useRef<HTMLElement|null>(null);
  const activeSelection=useRef({bookId:book.id,anchor:selection});
  const linePivot=useRef<string|null>(null);
  const [rangeOrigin,setRangeOrigin]=useState<string|null>(null);
  useEffect(()=>{activeSelection.current={bookId:book.id,anchor:selection};},[book.id,selection]);
  const draftContextKey=selection?book.editionId+':'+JSON.stringify(selection)+':'+(editNote?.id??'new'):'none';
  const draftKey=resumedDraftKeys[draftContextKey]??draftContextKey;
  const currentNote=editNote?(notes.find(n=>n.id===editNote.id)??editNote):null;
  const draft=drafts[draftKey]??(currentNote?noteText(currentNote):'');
  const noteChanged=!currentNote||!!currentNote.deletedAt||draft!==noteText(currentNote);
  const noteSaveState=saving?'Notiz wird gespeichert …':draftError?draftError:currentNote&&!noteChanged?'Gespeichert · auf diesem Gerät':drafts[draftKey]!==undefined?'Entwurf auf diesem Gerät gesichert':'Noch keine Notiz gespeichert.';
  const sectionNotes=notes.filter(n=>n.workId===book.id&&n.editionId===book.editionId&&n.anchor.sectionId===section.id);
  const locations=useMemo(()=>book.sections.flatMap(s=>s.blocks.filter(isText).map(b=>({section:s,block:b}))),[book]);
  const progressIndex=Math.max(0,locations.findIndex(item=>item.block.id===currentBlock));
  const displayedLocation=locations[scrub??progressIndex];
  const bookmarkRow=section.blocks.find(b=>b.id===currentBlock&&isText(b))??section.blocks.find(isText);
  const bookmarkAnchor=selection??(bookmarkRow?makeAnchor(section,bookmarkRow.id):null);
  const bookmarked=tourStep!==null&&tourSteps[tourStep].id==='bookmark'?tourBookmark:!!bookmarkAnchor&&notes.some(note=>matchesBookmark(note,book.id,book.editionId,bookmarkAnchor));
  const announce=useCallback((message:string)=>{setNotice(message);if(noticeTimer.current)clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),7000);},[]);
  useEffect(()=>{const failed=()=>announce('Der Suchtext konnte nicht gespeichert werden. Das Original ist gesichert. Prüfe den Gerätespeicher und lade die Seite erneut.');window.addEventListener('buchtutor-handwriting-save-error',failed);return()=>window.removeEventListener('buchtutor-handwriting-save-error',failed);},[announce]);
  const nativeSelection=useTextSelection({root:article,section,enabled:view==='reader'&&!dialog&&!contentsOpen&&!pencilMode&&(!tourOpen||tourStep!==null&&tourSteps[tourStep].id==='selection'),onSelect:anchor=>{
    if(tourStep!==null){changeSelection(anchor);return;}
    setAttachedIds([]);if(sameAnchor(activeSelection.current.anchor,anchor))return;
    linePivot.current=anchor.startId;setRangeOrigin(null);setSelectMode(false);changeSelection(anchor);setAddingPassage(false);
  },onError:announce});

  function prepareTour(index:number){
    const step=tourSteps[index];setTourStep(index);setView(step.view);setAudioExpanded(false);setMenusKey(n=>n+1);setDialog(null);setContentsOpen(false);setFocus(false);setPanelExpanded(false);
    setScrub(null);setPencilMode(['pencil','handwriting','eraser'].includes(step.id));setPanelOpen(['notes','help','figures'].includes(step.id));setPanel(step.id==='figures'?'figures':step.id==='notes'?'notes':'help');
  }
  function startTour(){
    if(tourOpen||!prepareToLeaveReader())return;
    tourSnapshot.current={view,focus,panel,panelOpen,panelExpanded,pencilMode,scrub,scrollY:window.scrollY,position:capturePosition(),trigger:document.activeElement instanceof HTMLElement?document.activeElement:null};
    setTourDone({});setTourNotebookFilters(defaultNotebookFilters);setTourSelection(null);setTourBookmark(false);setTourMode(undefined);setTourNote('');setTourCharacters([]);setTourColor('green');setTourStamp(new Date().toISOString());setDialog(null);setTourOpen(true);
  }
  function closeTour(){
    try{localStorage.setItem(ONBOARDING_KEY,'1');}catch{/* Optional per-device tour preference. */}
    const previous=tourSnapshot.current;setTourOpen(false);setTourStep(null);
    if(previous){setView(previous.view);setFocus(previous.focus);setPanel(previous.panel);setPanelOpen(previous.panelOpen);setPanelExpanded(previous.panelExpanded);setPencilMode(previous.pencilMode);setScrub(previous.scrub);
      afterLayout(()=>{const anchor=previous.view==='reader'&&previous.position?document.getElementById(previous.position.id):null;if(anchor&&previous.position)window.scrollBy({top:anchor.getBoundingClientRect().top-previous.position.top,behavior:'instant'});else window.scrollTo({top:previous.scrollY,behavior:'instant'});const trigger=previous.trigger?.isConnected?previous.trigger:document.querySelector<HTMLElement>('.tour-launch');trigger?.focus({preventScroll:true});});
    }
  }
  function markTour(id:string){if(tourStep!==null&&tourSteps[tourStep].id===id)setTourDone(old=>old[id]?old:{...old,[id]:true});}
  function followAudio(next:AudioPosition|null,follow:boolean,requestReader=false){
    const sequence=++audioScrollRequest.current;setAudioPosition(next);if(!next||!follow||tourOpen||bookBusy||pencilMode||view!=='reader'&&!requestReader)return;
    if(requestReader)setView('reader');
    const target=book.sections.find(s=>s.id===next.sectionId);if(!target)return;
    if(target.id!==section.id){if(!goToSection(target.id,next.blockId,false))return;updateURL(book,target,'reader',next.blockId,true);}
    afterLayout(()=>{if(sequence!==audioScrollRequest.current)return;const el=document.getElementById(next.blockId);if(!el)return;const text=el.querySelector('[data-text]'),range=text?domTextRange(text,next.startOffset,next.endOffset):null,box=range?range.getBoundingClientRect():el.getBoundingClientRect(),obstacles=[...document.querySelectorAll<HTMLElement>('.reader-workspace,.workspace-popover:not([hidden])')].filter(e=>e.getClientRects().length&&!e.closest('.workspace-inline-details')).map(e=>e.getBoundingClientRect());let top=100,bottom=window.innerHeight-80;for(const r of obstacles){if(r.right<box.left||r.left>box.right)continue;if(r.top<window.innerHeight/2)top=Math.max(top,r.bottom+20);else bottom=Math.min(bottom,r.top-20);}if(bottom-top<100){top=100;bottom=window.innerHeight-80;}if(box.top<top||box.bottom>bottom)window.scrollBy({top:box.top-(top+bottom)/2+Math.min(box.height,80)/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  }
  const pencilPractice=tourStep!==null;
  const firstTourBlock=section.blocks.find(isText);
  const displaySelection=tourStep!==null?tourSelection??(['notes','help'].includes(tourSteps[tourStep].id)&&firstTourBlock?makeAnchor(section,firstTourBlock.id):null):selection;
  const displayDraft=tourStep!==null?tourNote:draft;
  // Stay attached to this passage while scrolling, switching tools, or listening.
  const inlineAnchorId=displaySelection?.endId??section.blocks.find(b=>b.id===detailsAnchorId&&isText(b))?.id??firstTourBlock?.id;
  const tourExample:SavedNote|null=tourDone.notes&&firstTourBlock?{id:'onboarding-example',workId:book.id,editionId:book.editionId,anchor:tourSelection??makeAnchor(section,firstTourBlock.id),kind:'note',body:tourNote||'Beispiel: Diese Stelle möchte ich genauer untersuchen.',pencil:{color:tourColor,meaning:prefs.pencilMeanings?.[tourColor]??pencilPalette[tourColor].meaning,ink:[],transcription:tourNote?'manual':'none'},createdAt:tourStamp,updatedAt:tourStamp}:null;
  const capturePosition=useCallback(()=>{
    // Keep the beginning of the chapter at the top when a second tool row appears.
    if(window.scrollY<=1)return null;
    const row=[...(article.current?.querySelectorAll<HTMLElement>('[data-block]')??[])].find(el=>el.getBoundingClientRect().bottom>95);
    return row?{id:row.dataset.block!,top:row.getBoundingClientRect().top}:null;
  },[]);
  const applyPosition=useCallback(()=>{
    cancelAnimationFrame(positionFrame.current);
    const saved=pendingPosition.current;pendingPosition.current=null;
    if(!saved)return;
    const element=document.getElementById(saved.id);
    if(element&&article.current?.contains(element))window.scrollBy({top:element.getBoundingClientRect().top-saved.top,behavior:'instant'});
  },[]);
  const restorePosition=useCallback((saved:Position|null)=>{
    if(!saved)return;
    pendingPosition.current=saved;cancelAnimationFrame(positionFrame.current);
    // React changes are corrected before paint; the frame also covers dialog/resize callbacks.
    positionFrame.current=requestAnimationFrame(applyPosition);
  },[applyPosition]);
  useLayoutEffect(()=>{applyPosition();});
  useLayoutEffect(()=>{
    if(pendingNoteFocus.current&&panelOpen&&panel==='notes'&&!attachedIds.length&&noteInput.current){pendingNoteFocus.current=false;noteInput.current.focus({preventScroll:true});}
  },[panelOpen,panel,attachedIds]);
  useEffect(()=>()=>cancelAnimationFrame(positionFrame.current),[]);
  useLayoutEffect(()=>{
    if(panelOpen&&pendingPanelFocus.current&&panelHeading.current){panelHeading.current.focus({preventScroll:true});pendingPanelFocus.current=false;}
    if(panelOpen&&panelScroll.current)panelScroll.current.scrollTop=panelScrollPositions.current[panel]??0;
  },[panel,panelOpen,detailHost,inlineDetails]);
  useEffect(()=>{
    if(!inlineDetails||!detailHost||!(panelOpen||audioExpanded)||tourOpen)return;
    let frame=0;
    const reveal=()=>{
      cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
        const card=detailHost.querySelector<HTMLElement>('.workspace-popover:not([hidden])');if(!card)return;
        const viewport=window.visualViewport,viewportTop=viewport?.offsetTop??0,viewportBottom=viewportTop+(viewport?.height??window.innerHeight);
        const workspace=document.querySelector<HTMLElement>('.reader-workspace');
        const bar=workspace&&!['left','right'].includes(workspace.dataset.dock??'')?workspace.getBoundingClientRect():undefined,footer=document.querySelector('.reading-footer')?.getBoundingClientRect();
        let top=Math.max(viewportTop,(document.querySelector('.reader-header')?.getBoundingClientRect().bottom??70))+12,bottom=viewportBottom-12;
        const box=card.getBoundingClientRect();
        if(bar&&bar.top<top+100&&bar.right>box.left&&bar.left<box.right)top=Math.max(top,bar.bottom+12);
        if(footer&&footer.top>top&&footer.top<bottom)bottom=footer.top-12;
        if(bar&&bar.top>top+100&&bar.top<bottom&&bar.right>box.left&&bar.left<box.right)bottom=bar.top-12;
        card.style.setProperty('--inline-panel-height',Math.max(160,bottom-top)+'px');
        const updated=card.getBoundingClientRect();
        // Reveal the complete input and save action when a keyboard reduces the viewport.
        const desired=Math.max(top,Math.min(updated.top,bottom-updated.height));
        if(Math.abs(updated.top-desired)>1)window.scrollBy({top:updated.top-desired,behavior:'instant'});
      });
    };
    reveal();window.addEventListener('resize',reveal);window.visualViewport?.addEventListener('resize',reveal);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',reveal);window.visualViewport?.removeEventListener('resize',reveal);};
  },[inlineDetails,detailHost,panelOpen,panel,audioExpanded,tourOpen]);
  function updateURL(nextBook:Book,nextSection:Section,nextView:View,blockId?:string,replace=false){
    const url=new URL(window.location.href);
    url.search=nextView==='library'?'view=library':new URLSearchParams({work:nextBook.id,section:nextSection.id,view:nextView}).toString();url.hash=blockId??'';
    if(url.href!==window.location.href)window.history[replace?'replaceState':'pushState']({},'',url);
  }
  function cancelAnalysis(){analysisRequest.current?.abort();setAnalysisBusy(false);}
  function selectionContextKey(anchor:Anchor){return book.editionId+':'+JSON.stringify(anchor);}
  function rememberPassage(){if(selection)passageContexts.current.set(selectionContextKey(selection),{result,question,editNote,attachedIds,normalized});}
  function collectedPassages(){return rangeOrigin&&!addingPassage&&selection?[selection]:selection?addPassage(passages,selection):passages;}
  function finishRange(){const anchor=activeSelection.current.anchor;if(rangeOrigin&&anchor)setPassages(old=>addingPassage?addPassage(old,anchor):[anchor]);setRangeOrigin(null);setAddingPassage(false);}
  function readMode(){window.dispatchEvent(new Event('buchtutor-document-transform'));nativeSelection.freeze();finishRange();setPencilMode(false);setSelectMode(false);setMenusKey(n=>n+1);}
  function resetSelection(){rememberPassage();cancelAnalysis();nativeSelection.clear();activeSelection.current={bookId:book.id,anchor:null};linePivot.current=null;setRangeOrigin(null);noteComposition.current=false;setNoteComposing(false);setSelection(null);setPassages([]);setAddingPassage(false);setAttachedIds([]);setResult(null);setAnalysisError('');setEditNote(null);setQuestion('');setNormalized(false);setSelectMode(false);}
  useSelectionDismiss({enabled:view==='reader'&&!!selection&&!pencilMode&&!dialog&&!contentsOpen&&!tourOpen,choosing:selectMode,onDismiss:()=>{const saved=capturePosition();resetSelection();setPanelOpen(false);setPanelExpanded(false);setMenusKey(n=>n+1);restorePosition(saved);}});
  function rememberReading(){if(view==='reader'&&!tourOpen)readingPlaces.current.set(book.editionId,{sectionId:section.id,blockId:currentBlock});rememberPassage();readingContexts.current.set(book.editionId+':'+section.id,{selection,passages:collectedPassages(),result,question,editNote,attachedIds,normalized,characters:selectedCharacters});}
  function restoreReading(next:Book,nextSection:Section){
    cancelAnalysis();nativeSelection.clear();const stored=readingContexts.current.get(next.editionId+':'+nextSection.id);
    activeSelection.current={bookId:next.id,anchor:stored?.selection??null};setSelection(stored?.selection??null);setPassages(stored?.passages??[]);setResult(stored?.result??null);setQuestion(stored?.question??'');setEditNote(stored?.editNote??null);setAttachedIds(stored?.attachedIds??[]);setNormalized(stored?.normalized??false);setSelectedCharacters(stored?.characters??[]);setAnalysisError('');setRangeOrigin(null);setAddingPassage(false);linePivot.current=null;setSelectMode(false);setPencilMode(false);
  }
  function changeSelection(anchor:Anchor,commit=true){
    if(tourStep!==null){setTourSelection(anchor);markTour('selection');return;}
    if(commit){setPassages(old=>addingPassage?addPassage(old,anchor):[anchor]);setAttachedIds([]);}
    if(sameAnchor(selection,anchor))return;
    rememberPassage();cancelAnalysis();const previous=passageContexts.current.get(selectionContextKey(anchor));activeSelection.current={bookId:book.id,anchor};setSelection(anchor);setAttachedIds(commit?[]:previous?.attachedIds??[]);setResult(previous?.result??null);setAnalysisError('');setEditNote(previous?.editNote??null);setQuestion(previous?.question??'');setNormalized(previous?.normalized??false);
  }
  function removePassage(anchor:Anchor){const next=collectedPassages().filter(item=>!sameAnchor(item,anchor));setPassages(next);if(sameAnchor(selection,anchor)){if(next.length)changeSelection(next.at(-1)!,false);else resetSelection();}}
  function addAnotherPassage(){nativeSelection.freeze();if(selection)setPassages(old=>addPassage(old,selection));setAddingPassage(true);setSelectMode(true);setRangeOrigin(null);setPencilMode(false);setPanelOpen(false);setAudioExpanded(false);setMenusKey(n=>n+1);}
  async function markPassages(){
    const requested=collectedPassages();if(!requested.length||marking.current)return;
    readMode();
    const pending=activePencilDraft.current?.key===`buchtutor-pencil-draft:${book.id}:${book.editionId}:${section.id}`?activePencilDraft.current.marks:[];
    const anchors=requested.filter(anchor=>!pending.some(mark=>sameAnchor(mark.anchor,anchor))),unfinished=requested.length-anchors.length;
    if(!anchors.length){announce('Bereits im Pencil-Entwurf markiert. Mit „Fertig“ ins Notizbuch übernehmen.');return;}
    marking.current=true;setMarkBusy(true);
    const chosen=selection,key=draftKey;let marked:SavedNote[]=[];
    try{
      await updateLocal(data=>{const next=selectionHighlights(book,anchors,data.notes,pencilColor,prefs.pencilMeanings?.[pencilColor]);marked=next.selected;return {...data,notes:next.notes};});
      const target=marked.find(note=>sameAnchor(note.anchor,chosen));
      if(target&&!noteText(target).trim()&&target.pencil?.transcription!=='pending'&&activeSelection.current.bookId===book.id&&sameAnchor(activeSelection.current.anchor,chosen)){
        if(!editNote&&drafts[key]!==undefined)setResumedDraftKeys(old=>({...old,[book.editionId+':'+JSON.stringify(target.anchor)+':'+target.id]:key}));
        setEditNote(old=>!old||old.id===target.id?target:old);
      }
      announce((anchors.length===1?'Markierung auf diesem Gerät gespeichert.':`${anchors.length} Markierungen auf diesem Gerät gespeichert.`)+(unfinished?' Weitere Stellen sind bereits im Pencil-Entwurf. Diesen mit „Fertig“ abschließen.':''));
    }catch(error){announce((error as Error).message);}
    finally{marking.current=false;setMarkBusy(false);}
  }
  function closePanel(){const saved=capturePosition();setPanelOpen(false);setPanelExpanded(false);restorePosition(saved);panelTrigger.current?.focus({preventScroll:true});}
  function visibleDetailsBlock(){
    const bar=document.querySelector('.reader-workspace')?.getBoundingClientRect();
    const top=bar&&bar.top<150&&bar.width>bar.height?bar.bottom+12:95;
    const row=[...(article.current?.querySelectorAll<HTMLElement>('[data-block]')??[])].find(el=>el.getBoundingClientRect().top>=top);
    return section.blocks.find(b=>b.id===(row?.dataset.block??currentBlock)&&isText(b))??section.blocks.find(isText);
  }
  function openPanel(tab='help',moveFocus=true){
    const chosen=nativeSelection.freeze()??activeSelection.current.anchor;finishRange();setSelectMode(false);
    const saved=capturePosition();panelTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    setAudioExpanded(false);setMenusKey(n=>n+1);
    const block=visibleDetailsBlock();setDetailsAnchorId(chosen?.endId??block?.id??'');
    if(tab==='notes'&&!chosen&&block)changeSelection(makeAnchor(section,block.id));
    pendingPanelFocus.current=moveFocus;
    setPanel(tab);setPanelOpen(true);setContentsOpen(false);setFocus(false);restorePosition(saved);
  }
  function cancelBookOpen(){bookRequest.current++;bookAbort.current?.abort();bookAbort.current=null;setBookBusy(false);}
  function closeReaderDetails(){
    contentsPosition.current=null;pendingPosition.current=null;pendingPanelFocus.current=false;cancelAnimationFrame(positionFrame.current);
    setPanelOpen(false);setPanelExpanded(false);setAudioExpanded(false);setContentsOpen(false);setMenusKey(n=>n+1);setFocus(false);
  }
  function scrollToView(next:View,blockId?:string){
    if(next==='notes'||next==='library')afterLayout(()=>window.scrollTo({top:next==='notes'?notebookScroll.current:libraryScroll.current,behavior:'instant'}));else scrollToBlock(blockId);
  }
  function prepareToLeaveReader(){
    if(view!=='reader'||tourOpen)return true;
    const allowed=window.dispatchEvent(new Event('buchtutor-before-reader-leave',{cancelable:true}));
    if(!allowed){setDialog(null);setContentsOpen(false);setPanelOpen(false);setAudioExpanded(false);setMenusKey(n=>n+1);}
    return allowed;
  }
  function showView(next:View){
    if(next===view||!prepareToLeaveReader())return;cancelBookOpen();
    if(view==='notes')notebookScroll.current=window.scrollY;else if(view==='library')libraryScroll.current=window.scrollY;
    rememberReading();readMode();closeReaderDetails();if(next!=='reader')setAudioOpen(false);
    setView(next);updateURL(book,section,next);scrollToView(next);
  }
  function goToSection(id:string,blockId?:string,writeURL=true){
    const next=book.sections.find(s=>s.id===id);if(!next||id!==section.id&&!prepareToLeaveReader())return false;
    if(writeURL){cancelBookOpen();closeReaderDetails();}else{contentsPosition.current=null;setPanelOpen(false);setContentsOpen(false);}
    rememberReading();restoreReading(book,next);setSectionId(id);setView('reader');setScrub(null);
    setCurrentBlock(blockId??next.blocks.find(isText)?.id??'');
    if(writeURL)updateURL(book,next,'reader',blockId);
    scrollToBlock(blockId);return true;
  }
  async function openBook(id:string,target?:{sectionId?:string;blockId?:string;anchor?:Anchor;note?:SavedNote},destination:View='reader',writeURL=true){
    if(!prepareToLeaveReader()){if(!writeURL)updateURL(book,section,view,currentBlock,true);return false;}
    const seq=++bookRequest.current;bookAbort.current?.abort();const controller=new AbortController();bookAbort.current=controller;setBookBusy(true);
    if(view==='notes'&&destination!=='notes')notebookScroll.current=window.scrollY;else if(view==='library'&&destination!=='library')libraryScroll.current=window.scrollY;
    try{
      const next=bookCache.current.get(id)??(await request<{book:Book}>('/api/books/'+encodeURIComponent(id),undefined,controller.signal)).book;
      if(!next)throw new Error('Das Werk ist nicht verfügbar.');if(seq!==bookRequest.current)return false;
      if(!prepareToLeaveReader()){if(!writeURL)updateURL(book,section,view,currentBlock,true);return false;}
      if(target?.anchor)validateAnchor(next,target.anchor);
      bookCache.current.set(id,next);
      const remembered=prefs.autoBookmark?readingPlaces.current.get(next.editionId)??local.data.progress.find(p=>p.workId===id&&p.editionId===next.editionId):undefined;
      const nextSection=next.sections.find(s=>s.id===(target?.sectionId??remembered?.sectionId))??firstReadable(next);
      const blockId=target?.blockId??(target?.sectionId?undefined:remembered?.blockId);
      rememberReading();restoreReading(next,nextSection);closeReaderDetails();if(destination!=='reader'||!hasAudiobook(next.id))setAudioOpen(false);
      setBook(next);setSectionId(nextSection.id);setView(destination);setScrub(null);setCurrentBlock(blockId??nextSection.blocks.find(isText)?.id??'');
      if(writeURL)updateURL(next,nextSection,destination,blockId);
      scrollToView(destination,destination==='reader'?blockId:undefined);
      if(target?.anchor){activeSelection.current={bookId:next.id,anchor:target.anchor};setSelection(target.anchor);setPassages([target.anchor]);setEditNote(target.note??null);setResult(target.note?.analysis??null);setPanel(target.note?.analysis?'help':'notes');if(target.note)setPanelOpen(true);}
      return true;
    }catch(e){if(seq===bookRequest.current&&!controller.signal.aborted)announce((e as Error).message);}finally{if(seq===bookRequest.current){setBookBusy(false);bookAbort.current=null;}}
  }
  function openContents(event:MouseEvent<HTMLButtonElement>){contentsPosition.current=capturePosition();contentsTrigger.current=event.currentTarget;setContentsOpen(true);setPanelOpen(false);restorePosition(contentsPosition.current);}
  function openSettings(tab='reading'){
    position.current=capturePosition();setSettingsTab(tab);
    try{const pending=readPencilDraftLocations(localStorage,catalog),active=activePencilDraft.current;setPendingPencilDrafts(pending.length+(active?.hasDraft&&!pending.some(item=>item.key===active.key)?1:0));}catch{setPendingPencilDrafts(activePencilDraft.current?.hasDraft?1:0);}
    setDialog('settings');
  }
  function setPrefs(next:Prefs){void saveLocalPreferences(next).catch(e=>announce(e.message));}
  function toggleFocus(){const saved=capturePosition();setFocus(!focus);setPanelOpen(false);setContentsOpen(false);restorePosition(saved);}
  useEffect(()=>{document.documentElement.dataset.theme=prefs.theme;},[prefs.theme]);
  useEffect(()=>()=>{bookAbort.current?.abort();analysisRequest.current?.abort();if(noticeTimer.current)clearTimeout(noticeTimer.current);},[]);
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
  const leaveToolOnEscape=useEffectEvent(readMode),clearOnEscape=useEffectEvent(resetSelection);
  useEffect(()=>{
    function keyboard(event:KeyboardEvent){
      if(event.defaultPrevented||event.key!=='Escape'||dialog||contentsOpen||tourOpen||document.querySelector('[data-slot="dialog-content"][data-state="open"]'))return;
      if(audioExpanded){event.preventDefault();setAudioExpanded(false);document.querySelector<HTMLButtonElement>('.audio-details-trigger')?.focus({preventScroll:true});}
      else if(panelOpen){event.preventDefault();restorePosition(capturePosition());setPanelOpen(false);setPanelExpanded(false);panelTrigger.current?.focus({preventScroll:true});}
      else if(selectMode||pencilMode){event.preventDefault();leaveToolOnEscape();}
      else if(selection){event.preventDefault();clearOnEscape();}
      else if(focus)setFocus(false);
    }
    window.addEventListener('keydown',keyboard);return()=>window.removeEventListener('keydown',keyboard);
  },[dialog,contentsOpen,panelOpen,audioExpanded,focus,tourOpen,selectMode,pencilMode,selection,capturePosition,restorePosition]);
  useEffect(()=>{
    function unload(event:BeforeUnloadEvent){if(Object.entries(drafts).some(([key,value])=>value.trim()&&(!editNote||!key.endsWith(editNote.id)||value!==editNote.body)))event.preventDefault();}
    window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);
  },[drafts,editNote]);

  useEffect(()=>{
    if(view!=='reader'||!local.ready||tourOpen)return;
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
  },[book.id,book.editionId,section.id,view,local.ready,prefs.autoBookmark,focus,announce,tourOpen]);
  useEffect(()=>{
    let width=window.innerWidth,timer:ReturnType<typeof setTimeout>;
    function resized(){
      if(view!=='reader'||tourOpen||window.innerWidth===width)return;
      width=window.innerWidth;
      const saved=resizePosition.current;
      clearTimeout(timer);timer=setTimeout(()=>restorePosition(saved),140);
    }
    window.addEventListener('resize',resized);
    return()=>{clearTimeout(timer);window.removeEventListener('resize',resized);};
  },[view,tourOpen,restorePosition]);

  function selectRange(start:string,end:string,complete:boolean){
    try{
      const row=article.current?.querySelector<HTMLElement>('[data-block]');
      const saved=capturePosition()??(row?{id:row.dataset.block!,top:row.getBoundingClientRect().top}:null);
      const anchor=makeAnchor(section,start,end);nativeSelection.clear();
      if(tourStep!==null){changeSelection(anchor);return;}
      setPencilMode(false);linePivot.current=start;setRangeOrigin(complete?null:start);setSelectMode(!complete);changeSelection(anchor,complete);if(complete)setAddingPassage(false);restorePosition(saved);
    }catch(e){announce((e as Error).message);}
  }
  function selectLine(id:string,extend=false){
    const origin=extend?(linePivot.current??selection?.startId??id):rangeOrigin??id;
    selectRange(origin,id,extend||!!rangeOrigin||!selectMode);
  }
  function selectCharacter(id:string){if(tourStep!==null){setTourCharacters(old=>toggleSelected(old,id));markTour('figures');return;}setSelectedCharacters(old=>toggleSelected(old,id));openPanel('figures');}
  async function analyze(mode:AnalysisMode){
    if(tourStep!==null){setTourMode(mode);markTour('help');return;}
    const chosen=nativeSelection.freeze()??activeSelection.current.anchor;if(!chosen)return;
    analysisRequest.current?.abort();const controller=new AbortController();analysisRequest.current=controller;
    setAnalysisBusy(true);setAnalysisError('');setResult(null);openPanel('help');
    try{
      const response=await request<{analysis:Analysis;quota?:{remaining:number};normalized:boolean;usedAnchor:Anchor}>('/api/analysis',{workId:book.id,editionId:book.editionId,anchor:chosen,mode,question:mode==='question'?question:''},controller.signal);
      if(!controller.signal.aborted){setResult(response.analysis);setSelection(response.usedAnchor);setPassages(old=>old.map(item=>sameAnchor(item,chosen)?response.usedAnchor:item));setNormalized(response.normalized);if(response.quota)setRemaining(response.quota.remaining);}
    }catch(e){if(!controller.signal.aborted)setAnalysisError((e as Error).message);}finally{if(!controller.signal.aborted)setAnalysisBusy(false);}
  }
  function example(){
    const item=aiStatus.examples.find(e=>e.workId===book.id);if(!item)return;
    if(!goToSection(item.anchor.sectionId,item.anchor.startId))return;changeSelection(item.anchor);openPanel('help');
  }
  function changeNoteInput(value:string){
    if(tourStep!==null){setTourNote(value);setTourDone(old=>old.notes&&value!==tourNote?{...old,notes:false}:old);}
    else if(value!==draft)changeDraft(draftKey,value);
  }
  async function save(kind:SavedNote['kind']='note',analysis?:Analysis){
    if(saving||kind==='note'&&noteComposition.current)return;
    const anchor=analysis?.anchor??selection;if(!anchor)return;setSaving(true);const key=draftKey;
    const text=kind==='note'?(noteInput.current?.value??draft):'';
    const draftRevision=kind==='note'?changeDraft(key,text):undefined;
    const existing=analysis?notes.find(note=>note.analysis?.id===analysis.id):null;
    const id=existing?.id??(editNote&&editNote.kind===kind?editNote.id:crypto.randomUUID()),now=new Date().toISOString();
    const note:SavedNote={id,workId:book.id,editionId:book.editionId,anchor,kind,body:text,analysis,...(currentNote?.id===id&&currentNote.pencil?{pencil:{...currentNote.pencil,transcript:undefined,transcriptionError:undefined,transcription:'manual' as const,uncertain:false}}:{}),createdAt:existing?.createdAt??(editNote?.id===id?editNote.createdAt:now),updatedAt:now};
    try{
      await saveLocalNote(note,editNote?.id===note.id?editNote:existing??undefined);
      if(kind==='note'){clearDraft(key,text,draftRevision);setResumedDraftKeys(old=>{if(old[draftContextKey]!==key)return old;const next={...old};delete next[draftContextKey];return next;});}
      if(activeSelection.current.bookId===note.workId&&JSON.stringify(activeSelection.current.anchor)===JSON.stringify(anchor))setEditNote(note);
      announce(kind==='note'?'Notiz auf diesem Gerät gespeichert.':kind==='bookmark'?'Lesezeichen gespeichert.':'Analyse mit der Textstelle gespeichert.');
    }catch(e){announce((e as Error).message);}finally{setSaving(false);}
  }
  async function recolorAnnotation(note:SavedNote,color:PencilColor){
    try{
      let updated:SavedNote|undefined;
      await updateLocal(data=>{
        const current=data.notes.find(item=>item.id===note.id&&!item.deletedAt);
        if(!current?.pencil)throw new Error('Diese Markierung ist nicht mehr verfügbar.');
        updated={...current,pencil:{...current.pencil,color,meaning:prefs.pencilMeanings?.[color]||pencilPalette[color].meaning},updatedAt:new Date(Math.max(Date.now(),Date.parse(current.updatedAt)+1)).toISOString()};
        return {...data,notes:data.notes.map(item=>item.id===current.id?updated!:item)};
      });
      setEditNote(old=>old?.id===note.id?updated??old:old);setPencilColor(color);
      announce('Markierungsfarbe gespeichert.');return true;
    }catch(error){announce((error as Error).message);return false;}
  }
  async function removeNotes(items:SavedNote[]){
    const ids=items.map(note=>note.id);const stored=await deleteLocalNotes(ids);if(editNote&&ids.includes(editNote.id))setEditNote(null);setDeleted(stored.removed.length?stored.removed:null);announce(items.length===1?'Eintrag gelöscht.':`${items.length} Einträge gelöscht.`);
  }
  async function removeNote(note:SavedNote){try{await removeNotes([note]);}catch(error){announce((error as Error).message);}}
  async function undo(){if(!deleted)return;try{await restoreLocalNotes(deleted);setDeleted(null);announce('Einträge wiederhergestellt.');}catch(error){announce((error as Error).message);}}
  function openNote(note:SavedNote){
    if(catalog.find(w=>w.id===note.workId)?.editionId!==note.editionId){announce('Diese Notiz gehört zu einer anderen Ausgabe. Ihr Originalzitat bleibt im Notizbuch erhalten.');return;}
    void openBook(note.workId,{sectionId:note.anchor.sectionId,blockId:note.anchor.startId,anchor:note.anchor,note});
  }
  async function resumeNoteDraft(item:NoteDraftLocation){
    const blankMarkers=notes.filter(note=>note.workId===item.workId&&note.editionId===item.editionId&&note.kind==='note'&&!note.analysis&&note.pencil&&note.pencil.transcription!=='pending'&&!noteText(note).trim()&&sameAnchor(note.anchor,item.anchor));
    const original=item.noteId?local.data.notes.find(note=>note.id===item.noteId&&note.workId===item.workId&&note.editionId===item.editionId):blankMarkers.length===1?blankMarkers[0]:undefined;
    if(!await openBook(item.workId,{sectionId:item.anchor.sectionId,blockId:item.anchor.startId,anchor:item.anchor,note:original}))return;
    setResumedDraftKeys(old=>({...old,[item.editionId+':'+JSON.stringify(item.anchor)+':'+(original?.id??'new')]:item.key}));
    setPanel('notes');setPanelOpen(true);setAttachedIds([]);
    if(original?.deletedAt)announce('Entwurf zu einer gelöschten Notiz. Mit „Notiz speichern“ stellst du sie wieder her.');
    afterLayout(()=>noteInput.current?.focus({preventScroll:true}));
  }
  function editAnnotation(note:SavedNote){
    setAnnotationEditorReturn(attachedIds);pendingNoteFocus.current=!note.analysis;nativeSelection.clear();changeSelection(note.anchor);setAttachedIds([]);setEditNote(note);setResult(note.analysis??null);openPanel(note.analysis?'help':'notes',false);
  }
  function openAttached(items:SavedNote[]){
    if(items.some(item=>!item.createdAt)){setPencilMode(true);setSelectMode(false);announce('Markierungsentwurf geöffnet. Mit „Fertig“ dauerhaft speichern.');return;}
    const ordered=[...items].sort(compareAnnotations),first=ordered[0];if(!first)return;
    if(panelOpen&&panel==='notes'&&ordered.length===attachedIds.length&&ordered.every(note=>attachedIds.includes(note.id))){closePanel();return;}
    const saved=capturePosition();nativeSelection.clear();changeSelection(first.anchor);openPanel('notes',false);setEditNote(null);setAttachedIds(ordered.map(note=>note.id));
    // A newly tapped highlight always starts at its content, not an old panel scroll offset.
    panelScrollPositions.current.notes=0;if(panelScroll.current)panelScroll.current.scrollTop=0;
    restorePosition(saved);
  }
  async function bookmark(){
    if(tourStep!==null){setTourBookmark(!tourBookmark);markTour('bookmark');return;}
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
    setDialog(null);setJumpError('');if(!goToSection(target.section.id,target.block.id))return;changeSelection(makeAnchor(target.section,target.block.id));
  }
  function commitScrub(value:number){if(tourStep!==null){markTour('navigation');return;}const target=locations[value];if(target)goToSection(target.section.id,target.block.id);setScrub(null);}
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
    open:async input=>{if(typeof input.workId!=='string'||typeof input.sectionId!=='string'||!catalog.some(w=>w.id===input.workId))throw new Error('Unknown work or section.');return {opened:!!await openBook(input.workId,{sectionId:input.sectionId})};},
    select:input=>{
      if(typeof input.sectionId!=='string'||typeof input.startId!=='string'||(input.endId!==undefined&&typeof input.endId!=='string'))throw new Error('Section and block IDs are required.');
      for(const key of ['startOffset','endOffset'])if(input[key]!==undefined&&(!Number.isInteger(input[key])||Number(input[key])<0))throw new Error('Invalid offset.');
      const next=book.sections.find(s=>s.id===input.sectionId);if(!next)throw new Error('Unknown section.');
      const anchor=makeAnchor(next,input.startId,input.endId as string|undefined,input.startOffset as number|undefined,input.endOffset as number|undefined);
      if(!goToSection(next.id,anchor.startId))throw new Error('Save pending reader changes before navigating.');changeSelection(anchor);return {selection:anchor,reference:referenceLabel(next,anchor)};
    },
  });

  const selectedPassages=collectedPassages();
  const activatePassage=(anchor:Anchor)=>{changeSelection(anchor,false);setSelectMode(false);setRangeOrigin(null);setAddingPassage(false);};
  const passagePicker=<ReaderPassageSelection passages={selectedPassages} active={selection} section={section} onActivate={activatePassage} onRemove={removePassage} onClear={resetSelection}/>;
  const selectionBookmark=<button className={'icon-button '+(bookmarked?'is-bookmarked':'')} aria-label={bookmarked?'Lesezeichen der Auswahl entfernen':'Auswahl als Lesezeichen speichern'} aria-pressed={bookmarked} disabled={bookmarkBusy||!local.ready} onClick={()=>void bookmark()}><Bookmark size={17} fill={bookmarked?'currentColor':'none'}/></button>;
  const attachedEntries=attachedIds.flatMap(id=>{const note=sectionNotes.find(item=>item.id===id);return note?[note]:[];});
  const selectionMarked=selectedPassages.length>0&&selectedPassages.every(anchor=>sectionNotes.some(note=>note.kind==='note'&&!note.analysis&&note.pencil?.color===pencilColor&&!note.pencil.erasedRanges?.length&&sameAnchor(note.anchor,anchor)));
  const highlightColors={color:pencilColor,meanings:prefs.pencilMeanings,onColorChange:setPencilColor,marked:selectionMarked};
  const selectionTools=selection&&selectedPassages.length>1&&!panelOpen&&!audioExpanded&&!pencilMode&&<ReaderMultiSelection {...highlightColors} key={book.editionId+':'+section.id+':'+menusKey} passages={selectedPassages} active={selection} section={section} adding={addingPassage} choosing={selectMode} onActivate={activatePassage} onRemove={removePassage} onClear={resetSelection} onAdd={addAnotherPassage} marking={markBusy} onMark={()=>void markPassages()} bookmark={selectionBookmark}/>;
  const singleSelectionActions=selection&&selectedPassages.length===1&&!panelOpen&&!audioExpanded&&!pencilMode&&<ReaderSelectionActions {...highlightColors} key={book.editionId+':'+section.id+':'+menusKey} reference={referenceLabel(section,selection)} choosing={selectMode} onAdd={addAnotherPassage} marking={markBusy} onMark={()=>void markPassages()} onClear={resetSelection} bookmark={selectionBookmark}/>;

  const companionTabs=<div className="companion-tabs" role="group" aria-label="Lesehilfe auswählen">{[['help','Verstehen',Lightbulb],['figures','Figuren',Users],['notes','Notizen',MessageSquare]].map(([value,label,Icon])=>{const TabIcon=Icon as typeof Lightbulb;return <button key={value as string} aria-pressed={panel===value} onClick={event=>{setPanel(value as string);if(event.detail===0)requestAnimationFrame(()=>{const tab=panelHeading.current?.closest('aside')?.querySelector<HTMLButtonElement>('.companion-tabs button[aria-pressed="true"]');(tab?.offsetWidth?tab:panelHeading.current)?.focus({preventScroll:true});});}}><TabIcon size={18}/>{label as string}</button>;})}</div>;
  const companionPanel=view==='reader'&&<aside data-panel={panel} className={'workspace-popover assistant-panel '+(panelExpanded?'expanded ':'')+(panel==='notes'&&attachedIds.length?'showing-annotations':'')} hidden={!panelOpen||focus} inert={!panelOpen||focus} aria-hidden={!panelOpen||focus} aria-labelledby="assistant-title">
      <div className="panel-handle" aria-hidden="true"/><div className="assistant-heading"><h2 id="assistant-title" className={panel==='notes'?undefined:'sr-only'} ref={panelHeading} tabIndex={-1}>{panel==='notes'?(attachedIds.length?'Zur Markierung':'Notiz'):panel==='figures'?'Figuren':'KI-Hilfe'}{panel==='notes'&&displaySelection&&<span className="workspace-note-reference">{referenceLabel(section,displaySelection)}</span>}</h2>{panel!=='notes'&&companionTabs}<div>{panel==='notes'&&tourStep===null&&<button className="text-button notebook-reader-link" aria-label="Notizbuch" title="Notizbuch öffnen" onClick={()=>showView('notes')}>Notizbuch<BookOpen size={16}/></button>}<button className="icon-button expand-panel" aria-label={panelExpanded?'Lesehilfe verkleinern':'Lesehilfe vergrößern'} onClick={()=>setPanelExpanded(!panelExpanded)}>{panelExpanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button><button className="icon-button" aria-label="Lesehilfe schließen" onClick={closePanel}><X size={19}/></button></div></div>
      {passagePicker}{panel==='notes'&&attachedIds.length===0&&companionTabs}
      <div className="panel-scroll" key={panel} ref={panelScroll} onScroll={event=>{if(panelOpen)panelScrollPositions.current[panel]=event.currentTarget.scrollTop;}}>
        {panel==='help'?<ReaderAssistant book={book} section={section} selection={displaySelection} practiceMode={tourStep!==null?tourMode:undefined} analysis={tourStep!==null?null:result} status={aiStatus} busy={analysisBusy} error={analysisError} question={question} setQuestion={setQuestion} onAnalyze={mode=>void analyze(mode)} onExample={example} onFigures={()=>setPanel('figures')} onNote={()=>setPanel('notes')} onSave={()=>result&&void save(result.mode,result)} onQuote={id=>{closePanel();scrollToBlock(id);}} saving={saving} saved={!!result&&notes.some(n=>n.analysis?.id===result.id)} remaining={remaining} normalized={normalized} onCancel={cancelAnalysis}/>:panel==='figures'?<ReaderFigures key={book.id} book={book} section={section} selected={tourStep!==null?tourCharacters:selectedCharacters} onSelect={selectCharacter} onClear={()=>tourStep!==null?setTourCharacters([]):setSelectedCharacters([])}/>:<div className="panel-notes">
          {attachedIds.length>0?<ReaderAnnotationDetails key={attachedIds.join(':')} onColorChange={recolorAnnotation} meanings={prefs.pencilMeanings} notes={attachedEntries} section={section} onRetry={prefs.handwritingCloud?id=>void retryHandwriting(id).catch(e=>announce(e.message)):undefined} onEdit={editAnnotation} onDelete={removeNote} onAdd={()=>{pendingNoteFocus.current=true;setAttachedIds([]);setEditNote(null);}} onQuote={id=>{closePanel();scrollToBlock(id);}}/>:displaySelection?<>{editNote&&annotationEditorReturn.includes(editNote.id)&&<button className="annotation-editor-back" onClick={()=>openAttached(sectionNotes.filter(note=>annotationEditorReturn.includes(note.id)))}><ChevronLeft size={16}/>Zur Markierung</button>}<div className="selection-excerpt"><span>{referenceLabel(section,displaySelection)}</span><blockquote>{displaySelection.quote.slice(0,220)}{displaySelection.quote.length>220?' …':''}</blockquote></div><label className="note-editor"><span>Deine Notiz</span><textarea ref={noteInput} value={displayDraft} readOnly={saving||!draftsReady} onChange={e=>changeNoteInput(e.currentTarget.value)} onCompositionStart={()=>{noteComposition.current=true;setNoteComposing(true);}} onCompositionEnd={e=>{changeNoteInput(e.currentTarget.value);noteComposition.current=false;setNoteComposing(false);}} onBlur={e=>{changeNoteInput(e.currentTarget.value);noteComposition.current=false;setNoteComposing(false);}} maxLength={12000} placeholder="Was möchtest du festhalten?" rows={4}/></label></>:<p>Wähle eine Stelle im Text aus, um eine Notiz anzulegen.</p>}
          {tourStep===null&&displaySelection&&!attachedIds.length&&!!draftAlternatives[draftKey]?.length&&<details className="workspace-saved-notes note-draft-recovery"><summary>Andere lokale Entwürfe ({draftAlternatives[draftKey].length})</summary><p className="small-note">Beim Wiederherstellen bleibt dein aktueller Entwurf erhalten.</p><ul aria-label="Andere lokale Entwurfsfassungen" style={{listStyle:'none',padding:0}}>{draftAlternatives[draftKey].map((version,index)=><li key={version.revision} style={{borderTop:'1px solid var(--border)',padding:'10px 0'}}><p className="small-note" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:'0 0 8px'}}>{version.body.trim()?version.body.slice(0,240)+(version.body.length>240?' …':''):'Leerer Entwurf'}</p>{version.updatedAt>0&&version.updatedAt<=8640000000000000&&<p className="small-note"><time dateTime={new Date(version.updatedAt).toISOString()}>{new Date(version.updatedAt).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})}</time></p>}<button className="secondary-button" aria-label={`Entwurf ${index+1} wiederherstellen`} disabled={saving||noteComposing||!draftsReady} onClick={()=>{if(restoreDraft(draftKey,version.revision)){announce('Entwurf wiederhergestellt. Die vorherige Fassung bleibt unter „Andere lokale Entwürfe“ erhalten.');requestAnimationFrame(()=>noteInput.current?.focus({preventScroll:true}));}}}>Wiederherstellen</button></li>)}</ul></details>}
          {editNote?.pencil&&<div className="note-recognition-status" role="status">{(()=>{const current=notes.find(n=>n.id===editNote.id)??editNote;return current.pencil?.transcription==='pending'?'Original gespeichert · Suchtext wird erkannt …':current.pencil?.transcription==='failed'?<><span>{current.pencil.transcriptionError??'Erkennung nicht verfügbar. Das Original bleibt gespeichert.'}</span>{prefs.handwritingCloud&&<button className="text-button" onClick={()=>void retryHandwriting(current.id).catch(e=>announce(e.message))}>Erneut erkennen</button>}</>:current.pencil?.transcription==='recognized'?'Suchtext gespeichert · Originalhandschrift unverändert':null;})()}</div>}
          {!attachedIds.length&&sectionNotes.length>0&&<details className="workspace-saved-notes"><summary>{sectionNotes.length} {sectionNotes.length===1?'Eintrag':'Einträge'} in diesem Abschnitt</summary><NotesList notes={sectionNotes} catalog={catalog} onOpen={openNote} onDelete={removeNote} compact/></details>}
        </div>}
      </div>
      {panel==='notes'&&displaySelection&&!attachedIds.length&&<div className="workspace-note-actions"><p className="small-note">{tourStep!==null?'Probenotiz · wird nicht gespeichert.':noteSaveState}</p><button className="primary-button" onClick={()=>{if(tourStep!==null)markTour('notes');else void save('note');}} disabled={saving||noteComposing||!draftsReady||tourStep===null&&!noteChanged||!displayDraft.trim()&&!currentNote}>{saving?<LoaderCircle className="spin" size={17}/>:<Check size={17}/>}{tourStep!==null?'Übungsnotiz merken':saving?'Speichern …':currentNote&&!noteChanged?'Gespeichert':'Notiz speichern'}</button></div>}
    </aside>;

  return <div className={'reader-app unified-tools '+(view==='reader'?'focus-reader':'')+(focus?' focus-mode':'')+(panelOpen?' has-panel':'')+(audioOpen&&view==='reader'?' has-audio':'')} style={{'--text-size':prefs.fontSize+'px','--text-leading':prefs.lineHeight,'--reading-font':prefs.font==='sans'?"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif":"Charter,'Bitstream Charter','Sitka Text',Cambria,serif"} as React.CSSProperties}>
    <a className="skip-link" href="#main-content">Zum Inhalt springen</a>
    {view==='reader'?<header className="reader-header">
      <button aria-label="Zur Bibliothek" className="back-link" onClick={()=>showView('library')}><ChevronLeft size={22}/><span>Bibliothek</span></button>
      <div className="reader-title"><strong>{book.title}</strong><span>{book.author}</span></div>
      <div className="reader-header-actions"><button className="icon-button tour-launch" aria-label="Einführung starten" title="Einführung" onClick={startTour}><CircleHelp size={19}/></button><button className="toolbar-button contents-trigger" aria-haspopup="dialog" onClick={openContents}><List size={19}/><span>Inhalt</span></button><button className="type-button" aria-label="Leseeinstellungen" aria-haspopup="dialog" onClick={()=>openSettings()}>Aa</button><span className="toolbar-divider"/><button aria-label={focus?'Fokus beenden':'Fokus aktivieren'} className="focus-switch" onClick={toggleFocus} aria-pressed={focus}><span className="switch-track"/><span>Fokus</span></button></div>
    </header>:<header className="library-header"><button className="wordmark" aria-label="Buchtutor · Bibliothek" onClick={()=>showView('library')}><BrandMark/><span>{brand.name}</span></button><nav aria-label="Hauptnavigation"><button aria-current={view==='library'?'page':undefined} onClick={()=>showView('library')}>Bibliothek</button><button aria-current={view==='notes'?'page':undefined} onClick={()=>showView('notes')}>Meine Notizen</button></nav><button className="icon-button tour-launch" aria-label="Einführung starten" title="Einführung" onClick={startTour}><CircleHelp size={19}/></button><button className="icon-button" aria-label="Einstellungen und Geräteübertragung" aria-haspopup="dialog" onClick={()=>openSettings()}><Settings2 size={20}/></button></header>}
    {focus&&<button className="focus-exit" onClick={toggleFocus}><Minimize2 size={17}/>Fokus beenden</button>}
    {local.error&&<div className="storage-error" role="alert">{local.error}</div>}
    {view==='library'?<ReaderLibrary filters={libraryFilters} onFiltersChange={setLibraryFilters} catalog={catalog} progress={prefs.autoBookmark?local.data.progress:[]} onOpen={id=>void openBook(id)}/>:view==='notes'?<Notebook typedDrafts={typedDrafts} onResumeNoteDraft={item=>void resumeNoteDraft(item)} onResumeDraft={async(workId,sectionId)=>{if(await openBook(workId,{sectionId}))setPencilMode(true);}} onBrowseBooks={()=>showView('library')} selected={notebookSelection} onSelectedChange={setNotebookSelection} selecting={notebookSelecting} onSelectingChange={setNotebookSelecting} onDeleteMany={removeNotes} filters={tourStep!==null?tourNotebookFilters:notebookFilters} onFiltersChange={tourStep!==null?setTourNotebookFilters:setNotebookFilters} practice={tourStep!==null} notes={tourStep!==null?(tourExample?[tourExample]:[]):notes} catalog={catalog} onOpen={note=>tourStep!==null?prepareTour(tourSteps.findIndex(step=>step.id==='notes')):openNote(note)} onDelete={note=>{if(tourStep===null)void removeNote(note);}} deletedNotes={local.data.notes.filter(note=>!!note.deletedAt)} onRestore={async note=>{await saveLocalNote({...note,deletedAt:undefined,updatedAt:new Date(Math.max(Date.now(),Date.parse(note.updatedAt)+1)).toISOString()},note);setDeleted(null);announce('Eintrag mit Markierung und Handschrift wiederhergestellt.');}} onTransfer={()=>openSettings('transfer')}/>:<>
      <main className="reading-main" id="main-content">
       <div ref={documentStageRef} className="document-zoom-stage" data-zoom-gestures={!dialog&&!contentsOpen&&!tourOpen}>
        <article ref={article} className="reading-page" data-document-scale={documentScale}>
          <div className="section-heading"><p>{section.path.length>0&&<span className="section-path">{section.path.join(' · ')}</span>}<strong>{section.title}</strong></p><div><span data-tour="search-share" className="tour-search-share"><button className="icon-button" aria-label="Text durchsuchen oder zu einem Vers springen" aria-haspopup="dialog" onClick={()=>setDialog('search')}><Search size={17}/></button><button className="icon-button" aria-label="Stelle teilen" aria-haspopup="dialog" onClick={openShare}><Share2 size={17}/></button></span></div></div>

          <h1 className="sr-only">{book.title} · {section.title}</h1>
          <ReaderPencil onDraftStatus={status=>{activePencilDraft.current=status;}} color={pencilPractice?tourColor:pencilColor} onColorChange={pencilPractice?setTourColor:setPencilColor} contentAnchor={inlineDetails?inlineAnchorId:undefined} toolbarHost={pencilHost} dismissMenusKey={menusKey} onPopover={()=>{setPanelOpen(false);setAudioExpanded(false);}} key={book.id+book.editionId+section.id+(pencilPractice?':tour':':reader')} practice={pencilPractice} onPractice={(kind,data)=>{markTour(kind==='mark'?'pencil':kind==='erase'?'eraser':'handwriting');if(data?.color)setTourColor(data.color);if(data?.anchor)setTourSelection(data.anchor);if(data?.body!==undefined)setTourNote(data.body);}} book={book} section={section} prefs={prefs} selection={selection} savedNotes={pencilPractice?[]:sectionNotes} enabled={pencilMode} onToggle={()=>setPencilMode(false)} onSaved={announce}>{(drafts,afterBlock)=><ReaderText activeNoteIds={panelOpen&&panel==='notes'?attachedIds:undefined} showHighlights={tourOpen||prefs.annotationVisibility!=='notes'&&prefs.annotationVisibility!=='none'} showNotes={tourOpen||prefs.annotationVisibility!=='marks'&&prefs.annotationVisibility!=='none'} listening={tourOpen?null:audioPosition} afterBlock={inlineDetails&&inlineAnchorId?{...afterBlock,[inlineAnchorId]:<>{afterBlock[inlineAnchorId]}<div ref={setDetailHost} className="workspace-inline-host" data-pencil-input data-inline-after={inlineAnchorId}/></>}:afterBlock} book={book} section={section} selection={panelOpen&&panel==='notes'&&attachedIds.length?null:displaySelection} selections={panelOpen&&panel==='notes'&&attachedIds.length?[]:tourOpen?undefined:selectedPassages} notes={[...notes.filter(n=>!drafts.some(d=>d.id===n.id)),...drafts]} showNumbers={prefs.numbers} showCharacters={prefs.characters&&!pencilMode} selectMode={selectMode} rangeOrigin={rangeOrigin} onCancelRange={readMode} onRange={selectRange} canActivate={nativeSelection.canActivate} onSelect={selectLine} onCharacter={selectCharacter} onNote={openNote} onNotes={openAttached}/>}</ReaderPencil>
          {inlineDetails&&!inlineAnchorId&&<div ref={setDetailHost} className="workspace-inline-host" data-pencil-input/>}
          <nav className="section-pagination" aria-label="Weiterlesen"><button disabled={sectionIndex===0} onClick={()=>goToSection(book.sections[sectionIndex-1].id)}><ChevronLeft size={18}/>Voriger Abschnitt</button><button disabled={sectionIndex===book.sections.length-1} onClick={()=>goToSection(book.sections[sectionIndex+1].id)}>Nächster Abschnitt<ChevronRight size={18}/></button></nav>
          <button className="reading-source-link" aria-haspopup="dialog" onClick={()=>setDialog('source')}>Quelle und Zitierweise<ExternalLink size={13}/></button>
        </article>
       </div>
      </main>

      {!focus&&<footer className="reading-footer">
        <button className="footer-section" aria-haspopup="dialog" onClick={openContents}><List size={17}/><span><small className="footer-content-label">Inhalt</small><span>{section.title}</span></span></button>
        <div className="reading-progress"><button className="icon-button" aria-label="Voriger Abschnitt" disabled={sectionIndex===0} onClick={()=>goToSection(book.sections[sectionIndex-1].id)}><ChevronLeft size={17}/></button><input type="range" min="0" max={Math.max(0,locations.length-1)} value={scrub??progressIndex} aria-label="Leseposition im Werk" aria-valuetext={displayedLocation?unitLabel(displayedLocation.block.unit)+' '+displayedLocation.block.number:''} onChange={e=>{setScrub(Number(e.target.value));if(tourStep!==null)markTour('navigation');}} onPointerUp={e=>commitScrub(Number(e.currentTarget.value))} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))commitScrub(Number(e.currentTarget.value));}}/><button className="icon-button" aria-label="Nächster Abschnitt" disabled={sectionIndex===book.sections.length-1} onClick={()=>goToSection(book.sections[sectionIndex+1].id)}><ChevronRight size={17}/></button></div>
        <button className="footer-reference" aria-haspopup="dialog" onClick={()=>setDialog('search')}>{displayedLocation?unitLabel(displayedLocation.block.unit,true)+' '+(displayedLocation.block.number??''):section.title}</button>
        <button className={'icon-button reader-bookmark '+(bookmarked?'is-bookmarked':'')} aria-label={bookmarked?'Lesezeichen entfernen':'Lesezeichen setzen'} aria-pressed={bookmarked} disabled={bookmarkBusy||!local.ready} onClick={()=>void bookmark()} title={bookmarked?'Lesezeichen entfernen':'Lesezeichen setzen'}><Bookmark size={18} fill={bookmarked?'currentColor':'none'}/></button>
        <button className="mobile-type" onClick={()=>openSettings()} aria-label="Leseeinstellungen" aria-haspopup="dialog">Aa</button>
      </footer>}

    </>}

    {view==='reader'&&<ReaderWorkspace contextKey={book.id+':'+section.id+':'+tourOpen} visibility={prefs.annotationVisibility} onVisibilityChange={value=>{void updateLocal(data=>({...data,preferences:{value:{...data.preferences.value,annotationVisibility:value},updatedAt:new Date().toISOString()}})).catch(e=>announce(e.message));}} practice={tourOpen} inline={inlineDetails} detailHost={detailHost} audioHost={setAudioHost} onBeforeChange={()=>restorePosition(capturePosition())} onDismiss={()=>{restorePosition(capturePosition());setPanelOpen(false);setAudioExpanded(false);setMenusKey(n=>n+1);}} selection={selectionTools} panel={companionPanel} zoom={<DocumentZoomControls embedded scale={documentScale} minimum={minimumZoom} maximum={maximumZoom} onChange={changeDocumentZoom} dismissKey={book.id+':'+section.id+':'+tourOpen} onOpen={()=>{restorePosition(capturePosition());setPanelOpen(false);setAudioExpanded(false);setMenusKey(n=>n+1);}}/>}>
     {view==='reader'&&<>
      <div className="workspace-tool-group workspace-modes" role="group" aria-label="Lesen und Markieren">
      <button className="workspace-tool" aria-label="Lesemodus" aria-pressed={!selectMode&&!pencilMode} title="Lesen · Auswahl und Entwürfe behalten" onClick={readMode}><BookOpen size={19}/><span>Lesen</span></button>
      <button data-tour="selection" className="workspace-tool" aria-label="Bereich durch Antippen auswählen" aria-pressed={selectMode} title="Text auswählen" onClick={()=>{if(selectMode){readMode();return;}nativeSelection.freeze();setPencilMode(false);setPanelOpen(false);setAudioExpanded(false);setMenusKey(n=>n+1);setSelectMode(true);}}><MousePointer2 size={19}/><ReaderSelectionGuide active={selectMode&&!tourOpen} choosingEnd={!!rangeOrigin}/></button>
      <button className="workspace-tool" aria-label="Apple Pencil Modus" aria-pressed={pencilMode} title="Markieren und schreiben" onClick={()=>{if(pencilMode){readMode();return;}nativeSelection.freeze();finishRange();setSelectMode(false);setPencilMode(true);setMenusKey(n=>n+1);}}><ApplePencilIcon size={21}/><span>Pencil</span></button>
      </div>
      <div ref={setPencilHost} className="workspace-pencil-slot"/>
      <div className="workspace-tool-group workspace-study" role="group" aria-label="Notizen und Lesehilfe">
      <button className="workspace-tool" aria-label="Notiz schreiben" aria-pressed={panelOpen&&panel==='notes'} title="Notiz zur Textstelle" onClick={event=>panelOpen&&panel==='notes'?closePanel():openPanel('notes',event.detail===0)}><MessageSquare size={19}/><span>Notiz</span></button>
      <button className="workspace-tool" aria-label="Lesehilfe öffnen" aria-pressed={panelOpen&&panel!=='notes'} title="KI-Hilfe und Figuren" onClick={event=>panelOpen&&panel!=='notes'?closePanel():openPanel('help',event.detail===0)}><Lightbulb size={19}/><span>KI-Hilfe</span></button>
      {singleSelectionActions}
      </div>
     </>}
     <div className="workspace-tool-group workspace-listen">
     {hasAudiobook(book.id)?audioOpen?<ReaderAudio key={book.editionId} detailsHost={audioHost} expanded={audioExpanded} onExpandedChange={value=>{restorePosition(capturePosition());setAudioExpanded(value);if(value){if(!panelOpen)setDetailsAnchorId(selection?.endId??visibleDetailsBlock()?.id??'');setPanelOpen(false);setMenusKey(n=>n+1);}}} book={book} sectionId={section.id} blockId={selection?.startId||currentBlock||section.blocks.find(isText)?.id||''} suspended={tourOpen} onPosition={followAudio} onClose={()=>{setAudioOpen(false);setAudioExpanded(false);afterLayout(()=>document.querySelector<HTMLButtonElement>('.audio-trigger')?.focus({preventScroll:true}));}}/>:<button className="workspace-tool audio-trigger" aria-label="Hören und mitlesen" title="Hörbuch öffnen" onClick={()=>setAudioOpen(true)}><Headphones size={19}/><span>Hören</span></button>:<button className="workspace-tool" aria-label="Hörbuch nicht verfügbar" title="Für dieses Werk ist derzeit keine geprüfte Sprecheraufnahme eingebunden." disabled><Headphones size={19}/><span>Nicht verfügbar</span></button>}
     </div>
    </ReaderWorkspace>}

    <Dialog open={contentsOpen} onOpenChange={setContentsOpen}><DialogContent placement="left" className="contents-dialog" onOpenAutoFocus={event=>event.preventDefault()} onCloseAutoFocus={event=>{event.preventDefault();contentsTrigger.current?.focus({preventScroll:true});restorePosition(contentsPosition.current);contentsPosition.current=null;}}><DialogHeader><DialogTitle>Inhaltsverzeichnis</DialogTitle><DialogDescription>{book.title}</DialogDescription></DialogHeader>
      <div className="contents-scroll"><button className="contents-search" onClick={()=>{setContentsOpen(false);setDialog('search');}}><Search size={18}/>Suchen oder zu {unitLabel(book.referenceMode)} springen</button>
        <nav aria-label="Abschnitte des Werkes">{groups.map((group,i)=><details key={book.id+'-'+i+'-'+section.path.join()} className="contents-group" open={group.sections.some(s=>s.id===section.id)||groups.length===1}><summary>{group.label}<ChevronDown size={16}/></summary>{group.sections.map(s=><button key={s.id} className="scene-nav" aria-current={section.id===s.id?'location':undefined} onClick={()=>goToSection(s.id)}><span>{s.title}</span>{s.firstRef&&<small>{unitLabel(s.unit,true)} {s.firstRef}</small>}</button>)}</details>)}</nav>
        <button className="source-mini" onClick={()=>{setContentsOpen(false);openShare();}}><Share2 size={17}/>Stelle teilen</button><button className="source-mini" onClick={()=>{setContentsOpen(false);setDialog('source');}}><Info size={17}/>Quelle und Zitierweise</button><button className="source-mini" onClick={()=>{setContentsOpen(false);showView('notes');}}><MessageSquare size={17}/>Meine Notizen</button>
      </div>
    </DialogContent></Dialog>

    <Dialog open={!!dialog} onOpenChange={open=>{if(!open){setDialog(null);if(dialog==='settings'){restorePosition(position.current);position.current=null;}}}}>
      <DialogContent className={'reader-dialog '+(dialog==='source'?'source-dialog':'')} onOpenAutoFocus={event=>{dialogTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;if(dialog!=='share')event.preventDefault();}} onCloseAutoFocus={event=>{event.preventDefault();if(dialogTrigger.current?.isConnected)dialogTrigger.current.focus({preventScroll:true});}}>
        <DialogHeader><DialogTitle>{dialog==='search'?'Stelle finden':dialog==='settings'?'Einstellungen':dialog==='share'?'Stelle teilen':'Quelle und Zitierweise'}</DialogTitle><DialogDescription>{dialog==='settings'?'Lesen und Daten auf diesem Gerät':book.title+' · '+book.author}</DialogDescription></DialogHeader>
        {dialog==='settings'&&<><div className="settings-tabs" role="group" aria-label="Einstellungsbereich"><button aria-pressed={settingsTab==='reading'} onClick={()=>setSettingsTab('reading')}>Lesen</button><button aria-pressed={settingsTab==='transfer'} onClick={()=>setSettingsTab('transfer')}><MonitorSmartphone size={17}/>Geräteübertragung</button></div>{settingsTab==='transfer'?<ReaderTransfer data={local.data} pendingDraftCount={typedDrafts.length+pendingPencilDrafts} onReviewDrafts={()=>{setDialog(null);showView('notes');}} onDone={announce}/>:<div className="reading-settings">
          <label className="setting-row">Schriftgröße <output>{prefs.fontSize} px</output><input type="range" aria-label="Schriftgröße" min="16" max="30" step="1" value={prefs.fontSize} onChange={e=>setPrefs({...prefs,fontSize:Number(e.target.value)})}/></label>
          <label className="setting-row">Zeilenabstand <output>{prefs.lineHeight.toFixed(2)}</output><input type="range" aria-label="Zeilenabstand" min="1.5" max="2.4" step="0.05" value={prefs.lineHeight} onChange={e=>setPrefs({...prefs,lineHeight:Number(e.target.value)})}/></label>
          <div className="setting-row"><span>Schrift</span><div className="segmented-control">{[['sans','Klar'],['serif','Buchschrift']].map(([value,label])=><button key={value} aria-pressed={prefs.font===value} onClick={()=>setPrefs({...prefs,font:value as Prefs['font']})}>{label}</button>)}</div></div>
          <div className="theme-options">{[['paper','Hell'],['sepia','Warm'],['night','Nacht']].map(([value,label])=><button key={value} className={'theme-'+value} aria-pressed={prefs.theme===value} onClick={()=>setPrefs({...prefs,theme:value as Prefs['theme']})}><span>Aa</span>{label}</button>)}</div>
          <div className="setting-inline"><label htmlFor="setting-numbers">Vers- und Absatznummern</label><Switch id="setting-numbers" checked={prefs.numbers} onCheckedChange={value=>setPrefs({...prefs,numbers:value})}/></div>
          <div className="setting-inline"><label htmlFor="setting-characters">Figuren im Text markieren</label><Switch id="setting-characters" checked={prefs.characters} onCheckedChange={value=>setPrefs({...prefs,characters:value})}/></div>
          <div className="setting-inline"><label htmlFor="setting-auto-bookmark">Automatisches Lesezeichen</label><Switch id="setting-auto-bookmark" checked={prefs.autoBookmark} onCheckedChange={value=>setPrefs({...prefs,autoBookmark:value})}/></div>
          <p className="small-note">Merkt deine letzte Lesestelle und öffnet das Buch dort wieder. Manuell gesetzte Lesezeichen bleiben auch bei ausgeschalteter Automatik erhalten.</p>
          <p className="settings-preview" style={{fontSize:prefs.fontSize,lineHeight:prefs.lineHeight,fontFamily:prefs.font==='sans'?'inherit':"Charter,'Sitka Text',Cambria,serif"}}>Das Land der Griechen mit der Seele suchend.</p><button className="text-button" onClick={()=>setPrefs(defaultPrefs)}>Leseeinstellungen zurücksetzen</button>
          <button className="settings-tour-launch" onClick={startTour}><CircleHelp size={17}/>Einführung erneut starten</button><div className="settings-links"><a href="/datenschutz">Datenschutz</a><a href="/impressum">Impressum</a></div>
        </div>}</>}
        {dialog==='share'&&shareTarget&&<ReaderShare key={shareTarget.url} target={shareTarget}/>}
        {dialog==='search'&&<><form className="jump-form" onSubmit={e=>{e.preventDefault();jumpToReference();}}><label htmlFor="jump-number">Zu {unitLabel(book.referenceMode)} springen</label><div><input id="jump-number" className="text-input" type="number" inputMode="numeric" min="1" step="1" value={jump} onChange={e=>{setJump(e.target.value);setJumpError('');}} placeholder="z. B. 322"/><button className="primary-button" type="submit">Öffnen<ArrowRight size={16}/></button></div>{jumpError&&<p className="inline-error" role="alert">{jumpError}</p>}{book.referenceMode!=='verse'&&<p className="small-note">Nummern gelten für diese Digitalausgabe.</p>}</form><label className="search-field"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Wort oder Textstelle" aria-label="Im gesamten Werk suchen"/></label><div className="search-results">{searchResults.map(({section:s,block:b})=><button key={b.id} onClick={()=>{setDialog(null);if(!goToSection(s.id,b.id))return;changeSelection(makeAnchor(s,b.id));}}><span>{s.path.join(' · ')} {s.title} · {unitLabel(b.unit,true)} {b.number}</span><p>{b.text.slice(Math.max(0,b.text.toLocaleLowerCase('de').indexOf(query.toLocaleLowerCase('de'))-50),Math.max(0,b.text.toLocaleLowerCase('de').indexOf(query.toLocaleLowerCase('de'))-50)+230)}</p></button>)}{query.length>=2&&!searchResults.length&&<p>Keine Stelle gefunden.</p>}{searchResults.length===50&&<p className="small-note">Die ersten 50 Treffer. Grenze die Suche weiter ein.</p>}</div></>}
        {dialog==='source'&&<div className="source-details"><h3>Nummern dieser Ausgabe</h3><p>{book.note}</p>{!!book.validation.missingReferences?.length&&<p>Die Vorlage lässt die Nummern {book.validation.missingReferences[0]}–{book.validation.missingReferences.at(-1)} im Lesetext aus. Diese Lücke bleibt erhalten.</p>}<p>Ein Abgleich mit einer bestimmten Reclam-ISBN und die vollständige fachliche Durchsicht stehen noch aus.</p><h3>Textgrundlage</h3><p>{book.sourceEdition}</p><a href={book.sourceUrl} target="_blank" rel="noreferrer">{book.sourceLabel}<ExternalLink size={14}/></a><h3>Nutzung</h3>{book.licenses.map(license=><p key={license.name}><a href={license.url} target="_blank" rel="noreferrer">{license.name}<ExternalLink size={13}/></a></p>)}{book.id==='faust'&&<p>Diese Faust-Textgrundlage darf nur nichtkommerziell weiterverwendet werden.</p>}<details><summary>Ausgabe identifizieren</summary><code>{book.editionId}</code><p className="small-note">SHA-256: {book.revision}</p></details><button className="secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(book.author+': '+book.title+'. '+section.path.join(', ')+' '+section.title+', '+referenceLabel(section,selection??undefined)+'. '+book.sourceEdition+'. '+book.sourceUrl);announce('Quellenangabe kopiert.');}catch{announce('Kopieren wurde vom Browser nicht erlaubt.');}}}><Copy size={16}/>Quellenangabe kopieren</button></div>}
      </DialogContent>
    </Dialog>

    <ReaderOnboarding welcomeActionLabel={view==='reader'?'Weiterlesen':view==='notes'?'Zu meinen Notizen':'Werk wählen'} open={tourOpen} bookTitle={book.title} colorLabel={pencilPalette[tourColor].name} exampleText={tourExample?.body??''} onBegin={()=>prepareTour(0)} done={tourDone} onTry={value=>{if(tourStep!==null&&(tourSteps[tourStep].id!=='notebook'||value===tourColor))markTour(tourSteps[tourStep].id);}} ready={local.ready&&!bookBusy&&!analysisBusy&&!dialog&&!contentsOpen} step={tourStep} onStart={startTour} onStep={prepareTour} onClose={closeTour}/>
    {bookBusy&&<div className="loading-overlay" role="status"><LoaderCircle className="spin" size={22}/><span>Werk wird geöffnet …</span><button className="icon-button" aria-label="Öffnen des Werkes abbrechen" onClick={cancelBookOpen}><X size={18}/></button></div>}
    {(notice||deleted)&&<div className={'toast '+(view==='reader'&&(selection||selectMode)&&!panelOpen&&!pencilMode?'above-selection':'')} role="status"><span>{notice||'Eintrag gelöscht.'}</span>{deleted&&<button onClick={()=>void undo()}>Rückgängig</button>}<button className="icon-button" aria-label="Hinweis schließen" onClick={()=>{setNotice('');setDeleted(null);}}><X size={16}/></button></div>}
  </div>;
}
