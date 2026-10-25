'use client';
import {ChevronDown,Settings2} from 'lucide-react';
import type {Audiobook,AudioEmphasis} from '@/lib/audiobook';

type Props={
 manifest:Audiobook|null;
 sleep:string;
 onSleepChange:(value:string)=>void;
 emphasis:AudioEmphasis;
 onEmphasisChange:(value:AudioEmphasis)=>void;
 follow:boolean;
 onFollowChange:(value:boolean)=>void;
};

/** Less frequent options stay in the same card and retain their native controls. */
export function AudioReadingOptions({manifest,sleep,onSleepChange,emphasis,onEmphasisChange,follow,onFollowChange}:Props){
 return <details className="audio-reading-options" onToggle={event=>{
  const disclosure=event.currentTarget;
  requestAnimationFrame(()=>{
   if(!disclosure.isConnected)return;
   const card=disclosure.closest<HTMLElement>('.audio-details');
   if(!card?.closest('.workspace-inline-host'))return;
   if(!disclosure.open){card.style.removeProperty('--audio-inline-limit');card.scrollTop=0;return;}
   const viewport=window.visualViewport,bottom=(viewport?.offsetTop??0)+(viewport?.height??innerHeight),footer=document.querySelector('.reading-footer')?.getBoundingClientRect();
   const visibleBottom=Math.min(bottom,footer?.top??bottom)-12,space=visibleBottom-card.getBoundingClientRect().top;
   // Keep the passage above the card in place. Scroll the settings within
   // their card instead of moving the passage underneath the fixed toolbar.
   card.style.setProperty('--audio-inline-limit',`${Math.max(240,space)}px`);
   if(space<240)window.scrollBy({top:240-space,behavior:'instant'});
   card.scrollTop+=disclosure.getBoundingClientRect().top-card.getBoundingClientRect().top-10;
  });
 }}>
  <summary><Settings2 size={16}/><span>Mitlesen & Timer</span><ChevronDown size={16}/></summary>
  <div className="audio-reading-options-body">
   <label className="audio-sleep">Schlaftimer<select aria-label="Schlaftimer" value={sleep} onChange={event=>onSleepChange(event.target.value)}><option value="off">Aus</option><option value="15">15 Minuten</option><option value="30">30 Minuten</option><option value="45">45 Minuten</option><option value="chapter">Audiokapitelende</option></select></label>
   <div className="audio-emphasis"><span>Hörstelle hervorheben</span><div role="group" aria-label="Hörstelle hervorheben">{([['phrase','Passage'],['line','Zeile'],['off','Aus']] as const).map(([value,label])=><button key={value} aria-pressed={emphasis===value} onClick={()=>onEmphasisChange(value)}>{label}</button>)}</div></div>
   <label className="audio-follow"><input type="checkbox" checked={follow} onChange={event=>onFollowChange(event.target.checked)}/><span>Text automatisch mitführen<small>Eigenes Scrollen oder Bearbeiten pausiert das Mitführen. Das Hörbuch läuft weiter.</small></span></label>
   {manifest&&<div className="audio-source"><strong>{manifest.narrator}</strong> · <a href={manifest.sourceUrl} target="_blank" rel="noreferrer">{manifest.sourceLabel}</a><p>{manifest.note||'Die Aufnahme wird erst beim Abspielen geladen.'}</p><p>Die Hörstelle wird an sicher zugeordneten Passagen gezeigt. Bei abweichendem Wortlaut läuft die Aufnahme weiter.</p><a href={manifest.licenseUrl} target="_blank" rel="noreferrer">Quelle und Nutzungsangaben</a></div>}
  </div>
 </details>;
}
