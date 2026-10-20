'use client';
import {createPortal} from 'react-dom';
import {useEffect,useEffectEvent,useId,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,ChevronUp,Headphones,LocateFixed,Pause,Play,RotateCcw,RotateCw,X} from 'lucide-react';
import {hasAudiobook,audioProgressKey,audioProgressSchema,audioTime,cueAt,speechUnits,validateAudiobook,type Audiobook,type AudioPosition,type AudioProgress} from '@/lib/audiobook';
import {referenceLabel,type Book} from '@/lib/reader-model';

type Props={detailsHost:HTMLElement|null;expanded:boolean;onExpandedChange:(expanded:boolean)=>void;book:Book;sectionId:string;blockId:string;suspended:boolean;onPosition:(position:AudioPosition|null,follow:boolean,requestReader?:boolean)=>void;onClose:()=>void};
const speeds=[.75,1,1.25,1.5,1.75,2];
function readProgress(book:Book){try{const parsed=audioProgressSchema.safeParse(JSON.parse(localStorage.getItem(audioProgressKey(book.editionId))??'null'));return parsed.success&&parsed.data.editionId===book.editionId&&parsed.data.revision===book.revision?parsed.data:null;}catch{return null;}}
export function ReaderAudio({detailsHost,expanded,onExpandedChange:setExpanded,book,sectionId,blockId,suspended,onPosition,onClose}:Props){
 const [saved]=useState(()=>readProgress(book)),[initialAnchor]=useState(()=>({sectionId,blockId})),hasRecording=hasAudiobook(book.id),units=useMemo(()=>speechUnits(book),[book]);
 const [manifest,setManifest]=useState<Audiobook|null>(null),[loading,setLoading]=useState(hasRecording),[error,setError]=useState('');
 const [mode,setMode]=useState<'recording'|'device'>(hasRecording?saved?.mode??'recording':'device');
 const [trackIndex,setTrackIndex]=useState(0),[time,setTime]=useState(saved?.time??0),[unitIndex,setUnitIndex]=useState(()=>Math.min(units.length-1,saved?.unit??Math.max(0,units.findIndex(u=>u.blockId===blockId&&u.sectionId===sectionId))));
 const [playing,setPlaying]=useState(false),[buffering,setBuffering]=useState(false),[rate,setRate]=useState(saved?.rate??1),[voiceId,setVoiceId]=useState(saved?.voice??''),[voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
 const [follow,setFollow]=useState(saved?.follow??true),[sleep,setSleep]=useState('off'),[seekPreview,setSeekPreview]=useState<number|null>(null),[position,setPosition]=useState<AudioPosition|null>(null);
 const audio=useRef<HTMLAudioElement>(null),playButton=useRef<HTMLButtonElement>(null),detailsButton=useRef<HTMLButtonElement>(null),detailsId=useId();
 const speech=useRef<SpeechSynthesisUtterance|null>(null),speechStartTimer=useRef<ReturnType<typeof setTimeout>|null>(null),generation=useRef(0),nativeActive=useRef(false),pendingSeek=useRef<number|null>(null),seekDragging=useRef(false),started=useRef(false),deadline=useRef<number|null>(null),lastCue=useRef('');
 const track=manifest?.tracks[trackIndex],voice=voices.find(v=>v.voiceURI===voiceId)??voices.find(v=>v.localService)??voices[0];
 function actualPosition(next:AudioPosition|null,force=false){
  const key=JSON.stringify(next);if(force||lastCue.current!==key){lastCue.current=key;setPosition(next);onPosition(next,force||follow,force);}
 }
 const clearPosition=useEffectEvent(()=>onPosition(null,false));
 const callbacks=useRef({actualPosition,finishSpeech});
 useLayoutEffect(()=>{callbacks.current={actualPosition,finishSpeech};});
 const progress=useRef<AudioProgress|null>(null);
 useEffect(()=>{progress.current={version:1,editionId:book.editionId,revision:book.revision,mode,recordingId:manifest?.recordingId,trackId:track?.id,time,unit:unitIndex,rate,voice:voiceId,follow};},[book,mode,manifest,track,time,unitIndex,rate,voiceId,follow]);
 function persist(){if(started.current&&progress.current)try{localStorage.setItem(audioProgressKey(book.editionId),JSON.stringify(progress.current));}catch{/* Playback remains usable without optional resume storage. */}}
 const persistEvent=useEffectEvent(persist);
 useEffect(()=>{
  if(!hasRecording)return;const controller=new AbortController();const timeout=setTimeout(()=>{controller.abort();setLoading(false);setError('Die Aufnahme lädt zu lange. Du kannst die Geräte-Stimme verwenden oder den Player erneut öffnen.');setMode('device');},12000);
  void fetch(`/audiobooks/${book.id}.json`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('Die Aufnahme ist gerade nicht verfügbar. Du kannst die Geräte-Stimme verwenden.');return validateAudiobook(await response.json(),book);}).then(value=>{if(controller.signal.aborted)return;setManifest(value);const resumed=value.tracks.findIndex(t=>t.id===saved?.trackId&&value.recordingId===saved.recordingId);if(resumed>=0){setTrackIndex(resumed);setTime(Math.min(saved!.time,value.tracks[resumed].duration));}else{const found=value.tracks.flatMap((t,index)=>t.cues.map(cue=>({cue,index}))).find(item=>item.cue.blockId===initialAnchor.blockId&&item.cue.sectionId===initialAnchor.sectionId);setTrackIndex(found?.index??0);setTime(found?.cue.start??0);}}).catch(e=>{if(!controller.signal.aborted){setError(e.message);setMode('device');}}).finally(()=>{clearTimeout(timeout);if(!controller.signal.aborted)setLoading(false);});
  return()=>{clearTimeout(timeout);controller.abort();};
 },[book,hasRecording,saved,initialAnchor]);
 useEffect(()=>{
  if(!('speechSynthesis' in window))return;
  const update=()=>setVoices(window.speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('de')));
  const timer=setTimeout(update,0);window.speechSynthesis.addEventListener('voiceschanged',update);return()=>{clearTimeout(timer);window.speechSynthesis.removeEventListener('voiceschanged',update);};
 },[]);
 function cancelSpeech(){generation.current++;if(speechStartTimer.current)clearTimeout(speechStartTimer.current);if(nativeActive.current&&'speechSynthesis' in window)window.speechSynthesis.cancel();speech.current=null;nativeActive.current=false;}
 function pause(){const media=audio.current;media?.pause();if(buffering&&mode==='recording'&&media){media.removeAttribute('src');media.load();}cancelSpeech();setPlaying(false);setBuffering(false);persist();}
 const pauseEvent=useEffectEvent(pause);
 const collapseDetails=useEffectEvent(()=>setExpanded(false));
 const stopSpeech=useEffectEvent(cancelSpeech);
 useEffect(()=>{if(!buffering||mode!=='recording')return;const timer=setTimeout(()=>{pauseEvent();setError('Das Audio lädt zu lange. Prüfe deine Verbindung und versuche es erneut.');},20000);return()=>clearTimeout(timer);},[buffering,mode]);
 useEffect(()=>{if(!suspended)return;const timer=setTimeout(()=>pauseEvent(),0);return()=>clearTimeout(timer);},[suspended]);
 useEffect(()=>{
  const media=audio.current;
  const timer=setInterval(()=>{persistEvent();if(deadline.current!==null&&Date.now()>=deadline.current){deadline.current=null;pauseEvent();setSleep('off');}},1000);
  const hidden=()=>persistEvent();window.addEventListener('pagehide',hidden);document.addEventListener('visibilitychange',hidden);
  return()=>{clearInterval(timer);media?.pause();stopSpeech();persistEvent();window.removeEventListener('pagehide',hidden);document.removeEventListener('visibilitychange',hidden);clearPosition();};
 },[]);
 useEffect(()=>{
  function stopFollowing(event:Event){const target=event.target;if(target instanceof Element&&!target.closest('.reader-audio,.audio-details')&&(event.type!=='keydown'||['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','PageDown','PageUp','Home','End',' '].includes((event as KeyboardEvent).key))){setFollow(false);if(event.type==='pointerdown'||event.type==='touchstart')collapseDetails();}}
  document.addEventListener('input',stopFollowing);document.addEventListener('wheel',stopFollowing,{passive:true});document.addEventListener('touchstart',stopFollowing,{passive:true});document.addEventListener('pointerdown',stopFollowing);document.addEventListener('keydown',stopFollowing);
  return()=>{document.removeEventListener('input',stopFollowing);document.removeEventListener('wheel',stopFollowing);document.removeEventListener('touchstart',stopFollowing);document.removeEventListener('pointerdown',stopFollowing);document.removeEventListener('keydown',stopFollowing);};
 },[]);
 function playTrack(index:number,at=0,startPlayback=true){
  const media=audio.current,next=manifest?.tracks[index];if(!media||!next||suspended)return;
  cancelSpeech();started.current=true;setError('');setTrackIndex(index);setTime(at);setBuffering(startPlayback);if(!startPlayback)media.pause();
  if(media.getAttribute('src')!==next.url||media.error){pendingSeek.current=at;media.src=next.url;media.load();}else{try{media.currentTime=at;}catch{pendingSeek.current=at;}}
  media.playbackRate=rate;
  if(!startPlayback){setPlaying(false);setBuffering(false);return;}
  void media.play().catch(e=>{if(e.name==='AbortError')return;setPlaying(false);setBuffering(false);setError('Die Wiedergabe konnte nicht starten. Tippe erneut auf Abspielen oder verwende die Geräte-Stimme.');});
 }
 function finishSpeech(index:number){const next=units[index+1];if(!next||sleep==='chapter'&&next.sectionId!==units[index].sectionId){setPlaying(false);setSleep('off');setUnitIndex(next?index+1:0);actualPosition(null);persist();}else speak(index+1);}
 function speak(index:number){
  if(suspended||!voice||!units[index]||!('speechSynthesis' in window))return;
  audio.current?.pause();cancelSpeech();started.current=true;setError('');setUnitIndex(index);setPlaying(true);setBuffering(true);
  const unit=units[index],utterance=new SpeechSynthesisUtterance(unit.text),token=generation.current;
  utterance.lang=voice.lang;utterance.voice=voice;utterance.rate=rate;speech.current=utterance;nativeActive.current=true;
  utterance.onstart=()=>{if(token!==generation.current)return;if(speechStartTimer.current)clearTimeout(speechStartTimer.current);setPlaying(true);setBuffering(false);callbacks.current.actualPosition(unit.readable?unit:null);};
  utterance.onboundary=event=>{if(token!==generation.current||!unit.readable||event.name==='sentence'||event.charIndex>=unit.text.length)return;const offset=unit.startOffset+event.charIndex,tail=unit.text.slice(event.charIndex),length=tail.match(/^\S+/)?.[0].length??1;callbacks.current.actualPosition({...unit,startOffset:offset,endOffset:Math.min(unit.endOffset,offset+length)});};
  utterance.onend=()=>{if(token!==generation.current)return;speech.current=null;nativeActive.current=false;callbacks.current.finishSpeech(index);};
  utterance.onerror=event=>{if(token!==generation.current||event.error==='canceled'||event.error==='interrupted')return;if(speechStartTimer.current)clearTimeout(speechStartTimer.current);setPlaying(false);setBuffering(false);nativeActive.current=false;setError('Die Geräte-Stimme wurde unterbrochen. Du kannst an dieser Stelle erneut starten.');};
  speechStartTimer.current=setTimeout(()=>{if(token!==generation.current)return;cancelSpeech();setPlaying(false);setBuffering(false);setError('Die Geräte-Stimme startet nicht. Prüfe die installierten deutschen Stimmen oder wähle eine andere Stimme.');},8000);
  window.speechSynthesis.speak(utterance);
 }
 function play(){if(playing||buffering){pause();return;}if(mode==='recording'){if(track)playTrack(trackIndex,time>=track.duration-.5?0:time);}else speak(unitIndex);}
 const playEvent=useEffectEvent(()=>{if(!playing)play();});
 function seek(value:number){
  if(mode==='device'){const index=Math.max(0,Math.min(units.length-1,Math.round(value)));setUnitIndex(index);const unit=units[index];actualPosition(unit.readable?unit:null);if(playing)speak(index);return;}
  if(!track)return;const at=Math.max(0,Math.min(track.duration,value));setTime(at);const media=audio.current;
  if(media?.getAttribute('src')===track.url){try{media.currentTime=at;}catch{pendingSeek.current=at;}}else pendingSeek.current=at;
  actualPosition(cueAt(track.cues,at));
 }
 function jump(delta:number){if(mode==='device'){seek(unitIndex+delta);return;}if(!track)return;const next=time+delta;if(next<0&&trackIndex>0){playTrack(trackIndex-1,Math.max(0,manifest!.tracks[trackIndex-1].duration+next),playing);}else if(next>track.duration&&trackIndex+1<manifest!.tracks.length){playTrack(trackIndex+1,next-track.duration,playing);}else seek(next);}
 const seekEvent=useEffectEvent((at:number)=>seek(at));
 const backEvent=useEffectEvent(()=>jump(mode==='device'?-1:-15)),forwardEvent=useEffectEvent(()=>jump(mode==='device'?1:15));
 useEffect(()=>{
  if(!('mediaSession' in navigator))return;
  navigator.mediaSession.metadata=new MediaMetadata({title:book.title,artist:mode==='recording'?manifest?.narrator??book.author:'Buchtutor · Geräte-Stimme',album:book.author,artwork:[{src:`/art/cover-${book.id}-v1.webp`,type:'image/webp'}]});
  const handlers:{[key:string]:MediaSessionActionHandler}={play:()=>playEvent(),pause:()=>pauseEvent(),seekbackward:()=>backEvent(),seekforward:()=>forwardEvent(),seekto:details=>{if(mode==='recording'&&typeof details.seekTime==='number')seekEvent(details.seekTime);}};
  for(const [action,handler] of Object.entries(handlers))try{navigator.mediaSession.setActionHandler(action as MediaSessionAction,handler);}catch{/* Optional browser action. */}
  return()=>{navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none';for(const action of Object.keys(handlers))try{navigator.mediaSession.setActionHandler(action as MediaSessionAction,null);}catch{/* Optional browser action. */}};
 },[book.title,book.author,book.id,mode,manifest?.narrator]);
 useEffect(()=>{if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused';},[playing]);
 useEffect(()=>{if(mode==='recording'&&track&&'mediaSession' in navigator&&'setPositionState' in navigator.mediaSession)try{navigator.mediaSession.setPositionState({duration:track.duration,playbackRate:rate,position:Math.min(time,track.duration)});}catch{/* Some iPad versions do not expose seekable media state. */}},[mode,track,rate,time]);
 function switchMode(next:'recording'|'device'){
  pause();if(next==='device'&&position){const index=units.findIndex(u=>u.blockId===position.blockId&&u.endOffset>=position.startOffset);if(index>=0)setUnitIndex(index);}setMode(next);setError('');
 }
 function changeSleep(value:string){setSleep(value);deadline.current=value==='off'||value==='chapter'?null:Date.now()+Number(value)*60000;}
 function returnToAudio(){setFollow(true);const next=mode==='recording'&&track?cueAt(track.cues,time):units[unitIndex];if(next&&('readable' in next?next.readable:true))actualPosition(next,true);}
 function fromHere(){
  if(mode==='device'){const index=units.findIndex(u=>u.blockId===blockId&&u.sectionId===sectionId&&u.readable);if(index>=0){setFollow(true);speak(index);}else setError('Wähle eine Textstelle zum Vorlesen.');return;}
  const found=manifest?.tracks.flatMap((t,i)=>t.cues.map(cue=>({cue,index:i}))).find(item=>item.cue.blockId===blockId&&item.cue.sectionId===sectionId);
  if(found){setFollow(true);playTrack(found.index,found.cue.start);}else setError('Diese Textstelle ist der Aufnahme nicht sicher zugeordnet. Mit der Geräte-Stimme kannst du sie vorlesen lassen.');
 }
 const currentSection=book.sections.find(s=>s.id===position?.sectionId),currentBlock=currentSection?.blocks.find(b=>b.id===position?.blockId);
 const reference=currentSection&&currentBlock?referenceLabel(currentSection,{sectionId:currentSection.id,startId:currentBlock.id,endId:currentBlock.id,startOffset:0,endOffset:currentBlock.text.length,quote:currentBlock.text}):mode==='recording'?track?.title??'Aufnahme laden':'Geräte-Stimme';
 const maximum=mode==='recording'?track?.duration??1:Math.max(1,units.length-1),value=seekPreview??(mode==='recording'?time:unitIndex),canPlay=!suspended&&(mode==='recording'?!!track:!!voice);
 return <section className={'reader-audio '+(expanded?'is-expanded':'')} aria-label="Hören und mitlesen" onKeyDown={event=>{if(event.key==='Escape'&&expanded){event.stopPropagation();setExpanded(false);detailsButton.current?.focus();}}}>
  <audio ref={audio} preload="none" onLoadedMetadata={()=>{const media=audio.current!;if(pendingSeek.current!==null){media.currentTime=Math.min(pendingSeek.current,Math.max(0,media.duration-.01));pendingSeek.current=null;}media.playbackRate=rate;}} onTimeUpdate={()=>{const media=audio.current!;if(mode!=='recording'||media.getAttribute('src')!==track?.url)return;setTime(media.currentTime);actualPosition(cueAt(track.cues,media.currentTime));}} onPlaying={()=>{if(mode==='recording'&&!audio.current?.paused){setPlaying(true);setBuffering(false);}}} onPause={()=>{if(mode==='recording')setPlaying(false);persist();}} onWaiting={()=>{if(mode==='recording'&&!audio.current?.paused)setBuffering(true);}} onError={()=>{if(mode!=='recording')return;setPlaying(false);setBuffering(false);setError('Die Aufnahme konnte nicht geladen werden. Prüfe deine Verbindung oder wähle die Geräte-Stimme.');}} onEnded={()=>{if(mode!=='recording')return;if(sleep==='chapter'||trackIndex+1>=(manifest?.tracks.length??0)){setPlaying(false);setSleep('off');actualPosition(null);persist();}else playTrack(trackIndex+1);}}/>
  <div className="audio-main"><button ref={playButton} className="audio-play" aria-label={buffering?'Laden abbrechen':playing?'Wiedergabe pausieren':mode==='recording'?'Hörbuch abspielen':'Vorlesen starten'} onClick={play} disabled={!canPlay}>{playing||buffering?<Pause size={19}/>:<Play size={19}/>}</button><button ref={detailsButton} className="audio-details-trigger" aria-label={expanded?'Hörbuch-Details schließen':'Hörbuch-Details öffnen'} aria-expanded={expanded} aria-controls={detailsId} title="Hörbuch und Mitlesen" onClick={()=>setExpanded(!expanded)}><Headphones size={18}/><span>{buffering?'Laden …':mode==='recording'?audioTime(time):'Vorlesen'}</span>{expanded?<ChevronDown size={13}/>:<ChevronUp size={13}/>}</button></div>
  {error&&!expanded&&<span className="audio-error-indicator" role="status" title={error}><span className="sr-only">{error}</span></span>}
  {detailsHost&&createPortal(<div className="workspace-popover audio-details" id={detailsId} hidden={!expanded}>
   <div className="audio-detail-heading"><div className="audio-title"><strong>{book.title}</strong><span>{mode==='device'?'Geräte-Stimme':manifest?.synthetic?'Synthetische Lesung':'Hörbuch'} · {reference}</span></div><button className="icon-button" aria-label="Hörbuchdetails einklappen" onClick={()=>setExpanded(false)}><ChevronDown size={18}/></button><button className="icon-button" aria-label="Player schließen und pausieren" onClick={()=>{pause();onClose();}}><X size={18}/></button></div>
  <div className="audio-seek"><span>{mode==='recording'?audioTime(value):`${Math.round(value)+1}`}</span><input type="range" min={0} max={maximum} step={mode==='recording'?.1:1} value={Math.min(maximum,value)} aria-label={mode==='recording'?'Hörposition im Audiokapitel':'Vorlesestelle im Werk'} aria-valuetext={mode==='recording'?`${audioTime(value)} von ${audioTime(maximum)}`:`Stelle ${Math.round(value)+1} von ${units.length}`} onPointerDown={()=>{seekDragging.current=true;}} onChange={event=>{const next=Number(event.target.value);setSeekPreview(next);if(!seekDragging.current){seek(next);setSeekPreview(null);}}} onPointerUp={event=>{seekDragging.current=false;seek(Number(event.currentTarget.value));setSeekPreview(null);}} onPointerCancel={()=>{seekDragging.current=false;setSeekPreview(null);}}/><span>{mode==='recording'?audioTime(maximum):units.length}</span></div>
  {error&&<p className="audio-error" role="status">{error}</p>}

   <div className="audio-controls"><button className="icon-button" aria-label="Zur Hörstelle" title="Zur Hörstelle" onClick={returnToAudio} disabled={!position}><LocateFixed size={19}/></button><button className="secondary-button" onClick={()=>jump(mode==='device'?-1:-15)} aria-label={mode==='device'?'Vorige Vorlesestelle':'15 Sekunden zurück'}><RotateCcw size={17}/>{mode==='device'?'Zurück':'15 s'}</button><button className="secondary-button" onClick={fromHere}><Headphones size={16}/>Ab hier hören</button><button className="secondary-button" onClick={()=>jump(mode==='device'?1:15)} aria-label={mode==='device'?'Nächste Vorlesestelle':'15 Sekunden vor'}>{mode==='device'?'Weiter':'15 s'}<RotateCw size={17}/></button></div>
   <div className="audio-options"><label>Wiedergabe<select aria-label="Audioquelle wählen" value={mode} onChange={e=>switchMode(e.target.value as typeof mode)}><option value="recording" disabled={!manifest}>{!hasRecording?'Aufnahme in Vorbereitung':loading?'Aufnahme laden …':manifest?.synthetic?'Synthetische Lesung':'Hörbuchaufnahme'}</option><option value="device">Geräte-Stimme</option></select></label><label>Tempo<select aria-label="Hörtempo" value={rate} onChange={e=>{const next=Number(e.target.value);setRate(next);if(audio.current)audio.current.playbackRate=next;if(mode==='device')pause();}}>{speeds.map(speed=><option key={speed} value={speed}>{String(speed).replace('.',',')}×</option>)}</select></label><label>Schlaftimer<select aria-label="Schlaftimer" value={sleep} onChange={e=>changeSleep(e.target.value)}><option value="off">Aus</option><option value="15">15 Minuten</option><option value="30">30 Minuten</option><option value="45">45 Minuten</option><option value="chapter">{mode==='recording'?'Audiokapitelende':'Abschnittsende'}</option></select></label></div>
   {mode==='recording'&&manifest&&<label className="audio-chapters">Audiokapitel<select aria-label="Audiokapitel wählen" value={trackIndex} onChange={e=>{const index=Number(e.target.value),resume=playing;pause();setTrackIndex(index);setTime(0);pendingSeek.current=0;actualPosition(null);if(resume)playTrack(index);}}>{manifest.tracks.map((t,index)=><option key={t.id} value={index}>{index+1}. {t.title} · {audioTime(t.duration)}</option>)}</select></label>}
   {mode==='device'&&<label className="audio-chapters">Deutsche Stimme<select aria-label="Vorlesestimme" value={voice?.voiceURI??''} onChange={e=>{pause();setVoiceId(e.target.value);}}>{!voices.length&&<option value="">Keine deutsche Stimme verfügbar</option>}{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService?' · auf dem Gerät':''}</option>)}</select></label>}
   <label className="audio-follow"><input type="checkbox" checked={follow} onChange={e=>{setFollow(e.target.checked);if(e.target.checked)returnToAudio();}}/><span>Text automatisch mitführen<small>Beim eigenen Scrollen oder Bearbeiten pausiert das Mitführen.</small></span></label>
   <p className="audio-source">{mode==='recording'&&manifest?<><strong>{manifest.narrator}</strong> · <a href={manifest.sourceUrl} target="_blank" rel="noreferrer">{manifest.sourceLabel}</a><br/>{manifest.note||'Ton wird erst beim Abspielen von Internet Archive geladen.'}<br/>Textmarkierung an sicher zugeordneten Stellen. Bei abweichendem Wortlaut läuft die Aufnahme weiter.<br/><a href={manifest.licenseUrl} target="_blank" rel="noreferrer">Quelle und Nutzungsangaben</a></>:<>Öffentlicher Buchtext wird von einer deutschen Systemstimme vorgelesen. Verfügbare Stimmen und Verarbeitung hängen vom Gerät ab. {!voices.length&&'Installiere eine deutsche Vorlesestimme in den Geräteeinstellungen.'}</>}</p>
  </div>,detailsHost)}
 </section>;
}
