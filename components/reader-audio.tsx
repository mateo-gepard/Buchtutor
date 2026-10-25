'use client';
import {createPortal} from 'react-dom';
import {useEffect,useEffectEvent,useId,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,Headphones,Pause,Play,RotateCcw,RotateCw,LocateFixed,LoaderCircle,X} from 'lucide-react';
import {audioProgressKey,audioProgressSchema,audioTime,cueAt,validateAudiobook,type Audiobook,type AudioPosition,type AudioProgress,type AudioEmphasis} from '@/lib/audiobook';
import {referenceLabel,type Book} from '@/lib/reader-model';
import {AudioReadingOptions} from './audio-reading-options';

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
 const [manifest,setManifest]=useState<Audiobook|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[errorRetry,setErrorRetry]=useState<'manifest'|'playback'|null>(null),[loadAttempt,setLoadAttempt]=useState(0);
 const [resumeNotice,setResumeNotice]=useState(false),[playbackStarted,setPlaybackStarted]=useState(false),[resumeSaveError,setResumeSaveError]=useState(false);
 const [trackIndex,setTrackIndex]=useState(0),[time,setTime]=useState(saved?.time??0);
 const [playing,setPlaying]=useState(false),[buffering,setBuffering]=useState(false),[rate,setRate]=useState(saved?.rate??1);
 const [follow,setFollow]=useState(saved?.follow??true),[emphasis,setEmphasis]=useState<AudioEmphasis>(saved?.emphasis??'phrase'),[sleep,setSleep]=useState('off'),[seekPreview,setSeekPreview]=useState<number|null>(null),[position,setPosition]=useState<AudioPosition|null>(null);
 const audio=useRef<HTMLAudioElement>(null),detailsButton=useRef<HTMLButtonElement>(null),detailsId=useId();
 const pendingSeek=useRef<number|null>(null),seekDragging=useRef(false),started=useRef(false),deadline=useRef<number|null>(null),lastCue=useRef(''),playAttempt=useRef(0);
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
  try{localStorage.setItem(audioProgressKey(book.editionId),JSON.stringify(next));setResumeSaveError(false);}catch{setResumeSaveError(true);}
 }
 const persistEvent=useEffectEvent((media?:HTMLAudioElement|null)=>persist(media));
 useEffect(()=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>{controller.abort();setLoading(false);setError('Die Aufnahme lädt zu lange. Bitte versuche es erneut.');setErrorRetry('manifest');},12000);
  void fetch('/audiobooks/'+book.id+'.json',{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('Hörbuch momentan nicht verfügbar. Bitte versuche es erneut.');
   return validateAudiobook(await response.json(),book);
  }).then(value=>{
   if(controller.signal.aborted)return;setManifest(value);
   const resumed=value.tracks.findIndex(t=>t.id===saved?.trackId&&value.recordingId===saved.recordingId);
   if(resumed>=0){started.current=true;setResumeNotice(saved!.time>0);setTrackIndex(resumed);setTime(Math.min(saved!.time,value.tracks[resumed].duration));}
   else{const found=value.tracks.flatMap((t,index)=>t.cues.map(cue=>({cue,index}))).find(item=>item.cue.blockId===initialAnchor.blockId&&item.cue.sectionId===initialAnchor.sectionId);setTrackIndex(found?.index??0);setTime(found?.cue.start??0);}
  }).catch(e=>{if(!controller.signal.aborted){setError(e.message);setErrorRetry('manifest');}}).finally(()=>{clearTimeout(timeout);if(!controller.signal.aborted)setLoading(false);});
  return()=>{clearTimeout(timeout);controller.abort();};
 },[book,saved,initialAnchor,loadAttempt]);
 function pause(){
  playAttempt.current++;const media=audio.current;persist(media);media?.pause();
  if(buffering&&media){media.removeAttribute('src');media.load();}
  setPlaying(false);setBuffering(false);
 }
 const pauseEvent=useEffectEvent(pause),collapseDetails=useEffectEvent(()=>setExpanded(false));
 const syncCue=useEffectEvent(()=>{const media=audio.current;if(media&&track&&!media.seeking&&pendingSeek.current===null&&media.getAttribute('src')===track.url)actualPosition(cueAt(track.cues,media.currentTime));});
 // timeupdate can be sparse on iPad. Follow actual media time between its events,
 // but notify React only when the evidenced phrase changes.
 useEffect(()=>{if(!playing)return;let frame=0;const tick=()=>{syncCue();frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing]);
 useEffect(()=>{if(!buffering)return;const timer=setTimeout(()=>{pauseEvent();setError('Das Audio lädt zu lange. Prüfe deine Verbindung und versuche es erneut.');setErrorRetry('playback');},20000);return()=>clearTimeout(timer);},[buffering]);
 useEffect(()=>{if(!suspended)return;const timer=setTimeout(()=>pauseEvent(),0);return()=>clearTimeout(timer);},[suspended]);
 useEffect(()=>{
  const media=audio.current;
  const timer=setInterval(()=>{persistEvent();if(deadline.current!==null&&Date.now()>=deadline.current){deadline.current=null;pauseEvent();setSleep('off');}},1000);
  const hidden=()=>persistEvent();window.addEventListener('pagehide',hidden);document.addEventListener('visibilitychange',hidden);
  return()=>{clearInterval(timer);persistEvent(media);media?.pause();window.removeEventListener('pagehide',hidden);document.removeEventListener('visibilitychange',hidden);clearPosition();};
 },[]);
 const stopFollowingEvent=useEffectEvent(()=>{if(follow)window.scrollTo({left:window.scrollX,top:window.scrollY,behavior:'instant'});setFollow(false);onPosition(position,false);});
 useEffect(()=>{
  function stopFollowing(event:Event){
   const target=event.target,path=event.composedPath(),within=(selector:string)=>path.some(node=>node instanceof Element&&node.matches(selector)),toolbar=within('.reader-workspace');
   // Toolbar targets stay still until their click completes. The composed path
   // also survives a Play icon being replaced by Pause during that click.
   if(within('.workspace-grip')||toolbar&&['pointerdown','touchstart','keydown'].includes(event.type))return;
   if(target instanceof Element&&!within('.reader-audio,.audio-details')&&(event.type!=='keydown'||['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','PageDown','PageUp','Home','End',' '].includes((event as KeyboardEvent).key))){stopFollowingEvent();if((event.type==='pointerdown'||event.type==='touchstart')&&!toolbar&&!within('.pencil-text.active'))collapseDetails();}
  }
  document.addEventListener('click',stopFollowing);document.addEventListener('input',stopFollowing);document.addEventListener('wheel',stopFollowing,{passive:true});document.addEventListener('touchstart',stopFollowing,{passive:true,capture:true});document.addEventListener('pointerdown',stopFollowing,true);document.addEventListener('keydown',stopFollowing);
  return()=>{document.removeEventListener('click',stopFollowing);document.removeEventListener('input',stopFollowing);document.removeEventListener('wheel',stopFollowing);document.removeEventListener('touchstart',stopFollowing,true);document.removeEventListener('pointerdown',stopFollowing,true);document.removeEventListener('keydown',stopFollowing);};
 },[]);
 function playTrack(index:number,at=0,startPlayback=true){
  const media=audio.current,next=manifest?.tracks[index];if(!media||!next||suspended)return;at=Math.max(0,Math.min(next.duration,at));
  const attempt=++playAttempt.current;started.current=true;setResumeNotice(false);if(startPlayback)setPlaybackStarted(true);setError('');setErrorRetry(null);setTrackIndex(index);setTime(at);setBuffering(startPlayback);if(!startPlayback)media.pause();
  if(media.getAttribute('src')!==next.url||media.error){pendingSeek.current=at;media.src=next.url;media.load();}else if(media.readyState<1){pendingSeek.current=at;}else{try{media.currentTime=at;pendingSeek.current=null;}catch{pendingSeek.current=at;}}
  media.playbackRate=rate;
  if(!startPlayback){setPlaying(false);setBuffering(false);return;}
  void media.play().catch(e=>{if(attempt!==playAttempt.current||e.name==='AbortError')return;setPlaying(false);setBuffering(false);setError('Die Wiedergabe konnte nicht starten. Versuche es erneut.');setErrorRetry('playback');});
 }
 function play(){if(playing||buffering){pause();return;}if(track)playTrack(trackIndex,audio.current?.ended||time>=track.duration-.01?0:time);}
 const playEvent=useEffectEvent(()=>{if(!playing)play();});
 function seek(value:number){
  if(!track)return;const at=Math.max(0,Math.min(track.duration,value));setResumeNotice(false);setTime(at);const media=audio.current;
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
  if(found){setFollow(true);playTrack(found.index,found.cue.start);}else{setError('Diese Textstelle ist der Aufnahme nicht sicher zugeordnet. Wähle ein Audiokapitel oder eine benachbarte Textstelle.');setErrorRetry(null);}
 }
 function reload(){setError('');setErrorRetry(null);setLoading(true);setManifest(null);setLoadAttempt(n=>n+1);}
 const knownPosition=position??(track?cueAt(track.cues,time):null);
 const currentSection=book.sections.find(s=>s.id===knownPosition?.sectionId),currentBlock=currentSection?.blocks.find(b=>b.id===knownPosition?.blockId);
 const reference=currentSection&&currentBlock?referenceLabel(currentSection,{sectionId:currentSection.id,startId:currentBlock.id,endId:currentBlock.id,startOffset:0,endOffset:currentBlock.text.length,quote:currentBlock.text}):track?.title??(loading?'Aufnahme laden':'Hörbuch nicht verfügbar');
 const maximum=track?.duration??1,value=seekPreview??time,canPlay=!suspended&&!!track;
 const playbackLabel=loading?'Aufnahme wird geladen …':buffering?'Audio wird geladen …':errorRetry==='manifest'?'Aufnahme nicht verfügbar':errorRetry==='playback'?'Wiedergabe unterbrochen':playing?'Wiedergabe läuft':resumeNotice?'Gespeicherte Hörposition':playbackStarted?'Pausiert':'Bereit zum Hören';
 return <section className={'reader-audio '+(expanded?'is-expanded':'')} aria-label="Hören und mitlesen" onKeyDown={event=>{if(event.key==='Escape'&&expanded){event.stopPropagation();setExpanded(false);detailsButton.current?.focus();}}}>
  {/* WebKit can resume after a seek without another playing event. Actual progress clears stale buffering. */}
  <audio ref={audio} preload="none" onLoadedMetadata={()=>{const media=audio.current!;if(pendingSeek.current!==null){media.currentTime=Math.min(pendingSeek.current,Math.max(0,media.duration-.01));pendingSeek.current=null;}media.playbackRate=rate;}} onTimeUpdate={()=>{const media=audio.current!;if(media.seeking||pendingSeek.current!==null||media.getAttribute('src')!==track?.url)return;if(buffering&&!media.paused&&media.readyState>=3&&media.currentTime>time){setBuffering(false);setPlaying(true);}setTime(media.currentTime);actualPosition(cueAt(track.cues,media.currentTime));}} onCanPlay={()=>{const media=audio.current;if(media&&!media.paused&&!media.seeking&&!media.ended){setBuffering(false);setPlaying(true);}}} onPlaying={()=>{if(!audio.current?.paused){setPlaying(true);setBuffering(false);}}} onPause={()=>{setPlaying(false);persist();}} onWaiting={()=>{if(!audio.current?.paused)setBuffering(true);}} onError={()=>{setPlaying(false);setBuffering(false);setError('Die Aufnahme konnte nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.');setErrorRetry('playback');}} onEnded={()=>{if(sleep==='chapter'||trackIndex+1>=(manifest?.tracks.length??0)){pause();deadline.current=null;setSleep('off');actualPosition(null);persist();}else playTrack(trackIndex+1);}}/>
  <div className="audio-main"><button className="audio-play" aria-label={buffering?'Laden abbrechen':playing?'Wiedergabe pausieren':'Hörbuch abspielen'} onClick={play} disabled={!canPlay}>{buffering?<LoaderCircle className="spin" size={19}/>:playing?<Pause size={19}/>:<Play size={19}/>}</button><button ref={detailsButton} className="audio-details-trigger" aria-label={expanded?'Hörbuch-Details schließen':'Hörbuch-Details öffnen'} aria-expanded={expanded} aria-controls={detailsId} title="Hörbuch und Mitlesen" onClick={()=>setExpanded(!expanded)}><Headphones size={18}/><span>{buffering?'Laden …':audioTime(time)}</span>{expanded?<ChevronDown size={13}/>:<ChevronUp size={13}/>}</button>{!follow&&knownPosition&&<button className="icon-button audio-return" aria-label="Beim Hören mitlesen" title="Zur Hörstelle und Text mitführen" onClick={returnToAudio}><LocateFixed size={18}/><span>Hörstelle</span></button>}</div>
  {error&&!expanded&&<span className="audio-error-indicator" role="status" title={error}><span className="sr-only">{error}</span></span>}
  {detailsHost&&createPortal(<div className="workspace-popover audio-details" id={detailsId} hidden={!expanded} inert={!expanded} aria-hidden={!expanded}>
   <div className="audio-detail-heading"><div className="audio-title"><strong title={track?.title??book.title}>{track?.title??'Hörbuch'}</strong><span>{reference}</span></div><button className="icon-button" aria-label="Hörbuchdetails einklappen" onClick={()=>setExpanded(false)}><ChevronDown size={18}/></button><button className="icon-button" aria-label="Player schließen und pausieren" onClick={()=>{pause();onClose();}}><X size={18}/></button></div>
   <div className="audio-playback-state" role="status"><span data-playing={playing}>{playbackLabel}{resumeNotice?' · '+audioTime(time):''}</span>{playing&&!knownPosition&&<small>Textzuordnung pausiert</small>}{!follow&&knownPosition&&<small>Du liest frei</small>}</div>
   <div className="audio-seek"><span>{audioTime(value)}</span><input type="range" aria-label="Hörposition im Audiokapitel" aria-valuetext={`${audioTime(value)} von ${audioTime(maximum)}`} min="0" max={maximum} step=".1" value={value} disabled={!canPlay} onPointerDown={()=>{seekDragging.current=true;}} onChange={event=>{const next=Number(event.target.value);setSeekPreview(next);if(!seekDragging.current){seek(next);setSeekPreview(null);}}} onPointerUp={event=>{seekDragging.current=false;seek(Number(event.currentTarget.value));setSeekPreview(null);}} onPointerCancel={()=>{seekDragging.current=false;setSeekPreview(null);}}/><span>{audioTime(maximum)}</span></div>
   {error&&<p className="audio-error" role="status">{error}{errorRetry==='manifest'?<button className="text-button" onClick={reload}>Erneut laden</button>:errorRetry==='playback'&&track?<button className="text-button" onClick={()=>playTrack(trackIndex,time)}>Erneut abspielen</button>:null}</p>}
   <div className="audio-controls"><button className="icon-button" aria-label="Zur Hörstelle" title="Zur Hörstelle" onClick={returnToAudio} disabled={!knownPosition}><LocateFixed size={19}/></button><button className="secondary-button" onClick={()=>jump(-15)} aria-label="15 Sekunden zurück" disabled={!track}><RotateCcw size={17}/>15 s</button><button className="secondary-button" onClick={fromHere} disabled={!track}><Headphones size={16}/>Ab hier hören</button><button className="secondary-button" onClick={()=>jump(15)} aria-label="15 Sekunden vor" disabled={!track}>15 s<RotateCw size={17}/></button></div>
   <div className="audio-playback-options">
    {manifest&&<label className="audio-chapters">Audiokapitel<select aria-label="Audiokapitel wählen" value={trackIndex} onChange={e=>{const index=Number(e.target.value),resume=playing;pause();setResumeNotice(false);setTrackIndex(index);setTime(0);pendingSeek.current=0;actualPosition(null);if(resume)playTrack(index);}}>{manifest.tracks.map((t,index)=><option key={t.id} value={index}>{index+1}. {t.title} · {audioTime(t.duration)}</option>)}</select></label>}
    <label className="audio-tempo">Tempo<select aria-label="Hörtempo" value={rate} onChange={e=>{const next=Number(e.target.value);setRate(next);if(audio.current)audio.current.playbackRate=next;}}>{speeds.map(speed=><option key={speed} value={speed}>{String(speed).replace('.',',')}×</option>)}</select></label>
   </div>
   {resumeSaveError&&<p className="audio-resume-warning" role="status">Die Hörposition konnte auf diesem Gerät nicht gesichert werden. Du kannst weiterhören.</p>}
   <AudioReadingOptions manifest={manifest} sleep={sleep} onSleepChange={changeSleep} emphasis={emphasis} onEmphasisChange={setEmphasis} follow={follow} onFollowChange={value=>{setFollow(value);if(value)returnToAudio();}}/>
  </div>,detailsHost)}
 </section>;
}
