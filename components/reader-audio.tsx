'use client';
import {createPortal} from 'react-dom';
import {useEffect,useEffectEvent,useId,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,Headphones,Pause,Play,RotateCcw,RotateCw,LocateFixed,X} from 'lucide-react';
import {audioProgressKey,audioProgressSchema,audioTime,cueAt,validateAudiobook,type Audiobook,type AudioPosition,type AudioProgress,type AudioEmphasis} from '@/lib/audiobook';
import {referenceLabel,type Book} from '@/lib/reader-model';

type Props={detailsHost:HTMLElement|null;expanded:boolean;onExpandedChange:(expanded:boolean)=>void;book:Book;sectionId:string;blockId:string;suspended:boolean;onPosition:(position:AudioPosition|null,follow:boolean,requestReader?:boolean)=>void;onClose:()=>void};
const speeds=[.75,1,1.25,1.5,1.75,2];
function readProgress(book:Book){
 try{
  const parsed=audioProgressSchema.safeParse(JSON.parse(localStorage.getItem(audioProgressKey(book.editionId))??'null'));
  return parsed.success&&parsed.data.mode==='recording'&&parsed.data.editionId===book.editionId&&parsed.data.revision===book.revision?parsed.data:null;
 }catch{return null;}
}
export function ReaderAudio({detailsHost,expanded,onExpandedChange:setExpanded,book,sectionId,blockId,suspended,onPosition,onClose}:Props){
 const [saved]=useState(()=>readProgress(book)),[initialAnchor]=useState(()=>({sectionId,blockId}));
 const [manifest,setManifest]=useState<Audiobook|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[loadAttempt,setLoadAttempt]=useState(0);
 const [trackIndex,setTrackIndex]=useState(0),[time,setTime]=useState(saved?.time??0);
 const [playing,setPlaying]=useState(false),[buffering,setBuffering]=useState(false),[rate,setRate]=useState(saved?.rate??1);
 const [follow,setFollow]=useState(saved?.follow??true),[emphasis,setEmphasis]=useState<AudioEmphasis>(saved?.emphasis??'phrase'),[sleep,setSleep]=useState('off'),[seekPreview,setSeekPreview]=useState<number|null>(null),[position,setPosition]=useState<AudioPosition|null>(null);
 const audio=useRef<HTMLAudioElement>(null),detailsButton=useRef<HTMLButtonElement>(null),detailsId=useId();
 const pendingSeek=useRef<number|null>(null),seekDragging=useRef(false),started=useRef(false),deadline=useRef<number|null>(null),lastCue=useRef('');
 const track=manifest?.tracks[trackIndex];
 function actualPosition(next:AudioPosition|null,force=false){
  const display=next?{...next,emphasis}:null,key=JSON.stringify(display);if(force||lastCue.current!==key){lastCue.current=key;setPosition(display);onPosition(display,force||follow,force);}
 }
 const updateEmphasis=useEffectEvent(()=>{if(track)actualPosition(cueAt(track.cues,time));});
 useEffect(()=>updateEmphasis(),[emphasis]);
 const clearPosition=useEffectEvent(()=>onPosition(null,false));
 function persist(media:HTMLAudioElement|null=audio.current){
  if(!started.current||!manifest||!track)return;
  const at=media?.getAttribute('src')===track.url&&pendingSeek.current===null&&!media.seeking?media.currentTime:time;
  const next:AudioProgress={version:1,editionId:book.editionId,revision:book.revision,mode:'recording',recordingId:manifest.recordingId,trackId:track.id,time:Number.isFinite(at)?Math.min(track.duration,Math.max(0,at)):time,unit:0,rate,voice:'',follow,emphasis};
  try{localStorage.setItem(audioProgressKey(book.editionId),JSON.stringify(next));}catch{/* Listening remains usable without optional resume storage. */}
 }
 const persistEvent=useEffectEvent((media?:HTMLAudioElement|null)=>persist(media));
 useEffect(()=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>{controller.abort();setLoading(false);setError('Die Aufnahme lädt zu lange. Bitte versuche es erneut.');},12000);
  void fetch('/audiobooks/'+book.id+'.json',{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('Hörbuch momentan nicht verfügbar. Bitte versuche es erneut.');
   return validateAudiobook(await response.json(),book);
  }).then(value=>{
   if(controller.signal.aborted)return;setManifest(value);
   const resumed=value.tracks.findIndex(t=>t.id===saved?.trackId&&value.recordingId===saved.recordingId);
   if(resumed>=0){setTrackIndex(resumed);setTime(Math.min(saved!.time,value.tracks[resumed].duration));}
   else{const found=value.tracks.flatMap((t,index)=>t.cues.map(cue=>({cue,index}))).find(item=>item.cue.blockId===initialAnchor.blockId&&item.cue.sectionId===initialAnchor.sectionId);setTrackIndex(found?.index??0);setTime(found?.cue.start??0);}
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{clearTimeout(timeout);if(!controller.signal.aborted)setLoading(false);});
  return()=>{clearTimeout(timeout);controller.abort();};
 },[book,saved,initialAnchor,loadAttempt]);
 function pause(){
  const media=audio.current;persist(media);media?.pause();
  if(buffering&&media){media.removeAttribute('src');media.load();}
  setPlaying(false);setBuffering(false);
 }
 const pauseEvent=useEffectEvent(pause),collapseDetails=useEffectEvent(()=>setExpanded(false));
 const syncCue=useEffectEvent(()=>{const media=audio.current;if(media&&track&&!media.seeking&&pendingSeek.current===null&&media.getAttribute('src')===track.url)actualPosition(cueAt(track.cues,media.currentTime));});
 // timeupdate can be sparse on iPad. Follow actual media time between its events,
 // but notify React only when the evidenced phrase changes.
 useEffect(()=>{if(!playing)return;let frame=0;const tick=()=>{syncCue();frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing]);
 useEffect(()=>{if(!buffering)return;const timer=setTimeout(()=>{pauseEvent();setError('Das Audio lädt zu lange. Prüfe deine Verbindung und versuche es erneut.');},20000);return()=>clearTimeout(timer);},[buffering]);
 useEffect(()=>{if(!suspended)return;const timer=setTimeout(()=>pauseEvent(),0);return()=>clearTimeout(timer);},[suspended]);
 useEffect(()=>{
  const media=audio.current;
  const timer=setInterval(()=>{persistEvent();if(deadline.current!==null&&Date.now()>=deadline.current){deadline.current=null;pauseEvent();setSleep('off');}},1000);
  const hidden=()=>persistEvent();window.addEventListener('pagehide',hidden);document.addEventListener('visibilitychange',hidden);
  return()=>{clearInterval(timer);persistEvent(media);media?.pause();window.removeEventListener('pagehide',hidden);document.removeEventListener('visibilitychange',hidden);clearPosition();};
 },[]);
 const stopFollowingEvent=useEffectEvent(()=>{setFollow(false);onPosition(position,false);});
 useEffect(()=>{
  function stopFollowing(event:Event){const target=event.target;if(target instanceof Element&&!target.closest('.reader-audio,.audio-details')&&(event.type!=='keydown'||['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','PageDown','PageUp','Home','End',' '].includes((event as KeyboardEvent).key))){stopFollowingEvent();if((event.type==='pointerdown'||event.type==='touchstart')&&!target.closest('.reader-workspace'))collapseDetails();}}
  document.addEventListener('input',stopFollowing);document.addEventListener('wheel',stopFollowing,{passive:true});document.addEventListener('touchstart',stopFollowing,{passive:true});document.addEventListener('pointerdown',stopFollowing);document.addEventListener('keydown',stopFollowing);
  return()=>{document.removeEventListener('input',stopFollowing);document.removeEventListener('wheel',stopFollowing);document.removeEventListener('touchstart',stopFollowing);document.removeEventListener('pointerdown',stopFollowing);document.removeEventListener('keydown',stopFollowing);};
 },[]);
 function playTrack(index:number,at=0,startPlayback=true){
  const media=audio.current,next=manifest?.tracks[index];if(!media||!next||suspended)return;at=Math.max(0,Math.min(next.duration,at));
  started.current=true;setError('');setTrackIndex(index);setTime(at);setBuffering(startPlayback);if(!startPlayback)media.pause();
  if(media.getAttribute('src')!==next.url||media.error){pendingSeek.current=at;media.src=next.url;media.load();}else if(media.readyState<1){pendingSeek.current=at;}else{try{media.currentTime=at;pendingSeek.current=null;}catch{pendingSeek.current=at;}}
  media.playbackRate=rate;
  if(!startPlayback){setPlaying(false);setBuffering(false);return;}
  void media.play().catch(e=>{if(e.name==='AbortError')return;setPlaying(false);setBuffering(false);setError('Die Wiedergabe konnte nicht starten. Tippe erneut auf Abspielen.');});
 }
 function play(){if(playing||buffering){pause();return;}if(track)playTrack(trackIndex,audio.current?.ended||time>=track.duration-.01?0:time);}
 const playEvent=useEffectEvent(()=>{if(!playing)play();});
 function seek(value:number){
  if(!track)return;const at=Math.max(0,Math.min(track.duration,value));setTime(at);const media=audio.current;
  if(media?.getAttribute('src')===track.url&&media.readyState>=1){try{media.currentTime=at;pendingSeek.current=null;}catch{pendingSeek.current=at;}}else pendingSeek.current=at;
  actualPosition(cueAt(track.cues,at));
 }
 function jump(delta:number){if(!track)return;const next=time+delta;if(next<0&&trackIndex>0){playTrack(trackIndex-1,Math.max(0,manifest!.tracks[trackIndex-1].duration+next),playing);}else if(next>track.duration&&trackIndex+1<manifest!.tracks.length){playTrack(trackIndex+1,next-track.duration,playing);}else seek(next);}
 const seekEvent=useEffectEvent((at:number)=>seek(at)),backEvent=useEffectEvent(()=>jump(-15)),forwardEvent=useEffectEvent(()=>jump(15));
 useEffect(()=>{
  if(!('mediaSession' in navigator))return;
  navigator.mediaSession.metadata=new MediaMetadata({title:book.title,artist:manifest?.narrator??book.author,album:book.author,artwork:[{src:'/art/cover-'+book.id+'-v1.webp',type:'image/webp'}]});
  const handlers:{[key:string]:MediaSessionActionHandler}={play:()=>playEvent(),pause:()=>pauseEvent(),seekbackward:()=>backEvent(),seekforward:()=>forwardEvent(),seekto:details=>{if(typeof details.seekTime==='number')seekEvent(details.seekTime);}};
  for(const [action,handler] of Object.entries(handlers))try{navigator.mediaSession.setActionHandler(action as MediaSessionAction,handler);}catch{/* Optional browser action. */}
  return()=>{navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none';for(const action of Object.keys(handlers))try{navigator.mediaSession.setActionHandler(action as MediaSessionAction,null);}catch{/* Optional browser action. */}};
 },[book.title,book.author,book.id,manifest?.narrator]);
 useEffect(()=>{if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused';},[playing]);
 useEffect(()=>{if(track&&'mediaSession' in navigator&&'setPositionState' in navigator.mediaSession)try{navigator.mediaSession.setPositionState({duration:track.duration,playbackRate:rate,position:Math.min(time,track.duration)});}catch{/* Optional on iPad. */}},[track,rate,time]);
 function changeSleep(value:string){setSleep(value);deadline.current=value==='off'||value==='chapter'?null:Date.now()+Number(value)*60000;}
 function returnToAudio(){setFollow(true);const next=track?cueAt(track.cues,time):null;if(next)actualPosition(next,true);}
 function fromHere(){
  const found=manifest?.tracks.flatMap((t,i)=>t.cues.map(cue=>({cue,index:i}))).find(item=>item.cue.blockId===blockId&&item.cue.sectionId===sectionId);
  if(found){setFollow(true);playTrack(found.index,found.cue.start);}else setError('Diese Textstelle ist der Aufnahme nicht sicher zugeordnet. Wähle ein Audiokapitel oder eine benachbarte Textstelle.');
 }
 function reload(){setError('');setLoading(true);setManifest(null);setLoadAttempt(n=>n+1);}
 const currentSection=book.sections.find(s=>s.id===position?.sectionId),currentBlock=currentSection?.blocks.find(b=>b.id===position?.blockId);
 const reference=currentSection&&currentBlock?referenceLabel(currentSection,{sectionId:currentSection.id,startId:currentBlock.id,endId:currentBlock.id,startOffset:0,endOffset:currentBlock.text.length,quote:currentBlock.text}):track?.title??(loading?'Aufnahme laden':'Hörbuch nicht verfügbar');
 const maximum=track?.duration??1,value=seekPreview??time,canPlay=!suspended&&!!track;
 return <section className={'reader-audio '+(expanded?'is-expanded':'')} aria-label="Hören und mitlesen" onKeyDown={event=>{if(event.key==='Escape'&&expanded){event.stopPropagation();setExpanded(false);detailsButton.current?.focus();}}}>
  <audio ref={audio} preload="none" onLoadedMetadata={()=>{const media=audio.current!;if(pendingSeek.current!==null){media.currentTime=Math.min(pendingSeek.current,Math.max(0,media.duration-.01));pendingSeek.current=null;}media.playbackRate=rate;}} onTimeUpdate={()=>{const media=audio.current!;if(media.seeking||pendingSeek.current!==null||media.getAttribute('src')!==track?.url)return;setTime(media.currentTime);actualPosition(cueAt(track.cues,media.currentTime));}} onPlaying={()=>{if(!audio.current?.paused){setPlaying(true);setBuffering(false);}}} onPause={()=>{setPlaying(false);persist();}} onWaiting={()=>{if(!audio.current?.paused)setBuffering(true);}} onError={()=>{setPlaying(false);setBuffering(false);setError('Die Aufnahme konnte nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.');}} onEnded={()=>{if(sleep==='chapter'||trackIndex+1>=(manifest?.tracks.length??0)){pause();deadline.current=null;setSleep('off');actualPosition(null);persist();}else playTrack(trackIndex+1);}}/>
  <div className="audio-main"><button className="audio-play" aria-label={buffering?'Laden abbrechen':playing?'Wiedergabe pausieren':'Hörbuch abspielen'} onClick={play} disabled={!canPlay}>{playing||buffering?<Pause size={19}/>:<Play size={19}/>}</button><button ref={detailsButton} className="audio-details-trigger" aria-label={expanded?'Hörbuch-Details schließen':'Hörbuch-Details öffnen'} aria-expanded={expanded} aria-controls={detailsId} title="Hörbuch und Mitlesen" onClick={()=>setExpanded(!expanded)}><Headphones size={18}/><span>{buffering?'Laden …':audioTime(time)}</span>{expanded?<ChevronDown size={13}/>:<ChevronUp size={13}/>}</button>{!follow&&position&&<button className="icon-button audio-return" aria-label="Beim Hören mitlesen" title="Zur Hörstelle und Text mitführen" onClick={returnToAudio}><LocateFixed size={18}/></button>}</div>
  {error&&!expanded&&<span className="audio-error-indicator" role="status" title={error}><span className="sr-only">{error}</span></span>}
  {detailsHost&&createPortal(<div className="workspace-popover audio-details" id={detailsId} hidden={!expanded} inert={!expanded} aria-hidden={!expanded}>
   <div className="audio-detail-heading"><div className="audio-title"><strong>{book.title}</strong><span>Hörbuch · {reference}</span></div><button className="icon-button" aria-label="Hörbuchdetails einklappen" onClick={()=>setExpanded(false)}><ChevronDown size={18}/></button><button className="icon-button" aria-label="Player schließen und pausieren" onClick={()=>{pause();onClose();}}><X size={18}/></button></div>
   <div className="audio-seek"><span>{audioTime(value)}</span><input type="range" aria-label="Hörposition im Audiokapitel" min="0" max={maximum} step=".1" value={value} disabled={!canPlay} onPointerDown={()=>{seekDragging.current=true;}} onChange={event=>{const next=Number(event.target.value);setSeekPreview(next);if(!seekDragging.current){seek(next);setSeekPreview(null);}}} onPointerUp={event=>{seekDragging.current=false;seek(Number(event.currentTarget.value));setSeekPreview(null);}} onPointerCancel={()=>{seekDragging.current=false;setSeekPreview(null);}}/><span>{audioTime(maximum)}</span></div>
   {error&&<p className="audio-error" role="status">{error}{!manifest&&<button className="text-button" onClick={reload}>Erneut laden</button>}</p>}
   <div className="audio-controls"><button className="icon-button" aria-label="Zur Hörstelle" title="Zur Hörstelle" onClick={returnToAudio} disabled={!position}><LocateFixed size={19}/></button><button className="secondary-button" onClick={()=>jump(-15)} aria-label="15 Sekunden zurück" disabled={!track}><RotateCcw size={17}/>15 s</button><button className="secondary-button" onClick={fromHere} disabled={!track}><Headphones size={16}/>Ab hier hören</button><button className="secondary-button" onClick={()=>jump(15)} aria-label="15 Sekunden vor" disabled={!track}>15 s<RotateCw size={17}/></button></div>
   <div className="audio-options"><label>Tempo<select aria-label="Hörtempo" value={rate} onChange={e=>{const next=Number(e.target.value);setRate(next);if(audio.current)audio.current.playbackRate=next;}}>{speeds.map(speed=><option key={speed} value={speed}>{String(speed).replace('.',',')}×</option>)}</select></label><label>Schlaftimer<select aria-label="Schlaftimer" value={sleep} onChange={e=>changeSleep(e.target.value)}><option value="off">Aus</option><option value="15">15 Minuten</option><option value="30">30 Minuten</option><option value="45">45 Minuten</option><option value="chapter">Audiokapitelende</option></select></label></div>
   {manifest&&<label className="audio-chapters">Audiokapitel<select aria-label="Audiokapitel wählen" value={trackIndex} onChange={e=>{const index=Number(e.target.value),resume=playing;pause();setTrackIndex(index);setTime(0);pendingSeek.current=0;actualPosition(null);if(resume)playTrack(index);}}>{manifest.tracks.map((t,index)=><option key={t.id} value={index}>{index+1}. {t.title} · {audioTime(t.duration)}</option>)}</select></label>}
   <div className="audio-emphasis"><span>Hörstelle hervorheben</span><div role="group" aria-label="Hörstelle hervorheben">{([['phrase','Passage'],['line','Zeile'],['off','Aus']] as const).map(([value,label])=><button key={value} aria-pressed={emphasis===value} onClick={()=>setEmphasis(value)}>{label}</button>)}</div></div>
   <label className="audio-follow"><input type="checkbox" checked={follow} onChange={e=>{setFollow(e.target.checked);if(e.target.checked)returnToAudio();}}/><span>Text automatisch mitführen<small>Beim eigenen Scrollen oder Bearbeiten pausiert das Mitführen.</small></span></label>
   {manifest&&<p className="audio-source"><strong>{manifest.narrator}</strong> · <a href={manifest.sourceUrl} target="_blank" rel="noreferrer">{manifest.sourceLabel}</a><br/>{manifest.note||'Ton wird erst beim Abspielen von Internet Archive geladen.'}<br/>Textmarkierung an sicher zugeordneten Stellen. Bei abweichendem Wortlaut läuft die Aufnahme weiter.<br/><a href={manifest.licenseUrl} target="_blank" rel="noreferrer">Quelle und Nutzungsangaben</a></p>}
  </div>,detailsHost)}
 </section>;
}
