'use client';
import {useState} from 'react';
import {Copy,Check,Share2,ExternalLink} from 'lucide-react';
import {socialShareLinks} from '@/lib/share-links';

export type ShareTarget={url:string;title:string;reference:string};

export function ReaderShare({target}:{target:ShareTarget}){
  const [copied,setCopied]=useState(false),[message,setMessage]=useState('');
  const canShare=typeof navigator!=='undefined'&&typeof navigator.share==='function';
  async function copy(){
    try{await navigator.clipboard.writeText(target.url);setCopied(true);setMessage('Link kopiert.');}
    catch{setMessage('Kopieren wurde vom Browser nicht erlaubt. Du kannst den Link unten auswählen.');}
  }
  async function share(){
    if(!navigator.share){await copy();return;}
    try{await navigator.share({title:target.title+' · Buchtutor',text:target.reference,url:target.url});}
    catch(error){if(!(error instanceof Error&&error.name==='AbortError'))setMessage('Teilen ist gerade nicht möglich. Nutze einen der Links oder kopiere die Adresse.');}
  }
  return <div className="share-panel">
    <p className="share-reference">{target.reference}</p>
    <div className="share-primary-actions">{canShare&&<button className="primary-button" onClick={()=>void share()}><Share2 size={18}/>Mit Gerät teilen</button>}<button className={canShare?'secondary-button':'primary-button'} onClick={()=>void copy()}>{copied?<Check size={18}/>:<Copy size={18}/>}Link kopieren</button></div>
    <div className="share-social-links" aria-label="Teilen über">{socialShareLinks(target.url,target.title).map(link=><a key={link.name} href={link.href} target={link.name==='E-Mail'?undefined:'_blank'} rel="noopener noreferrer">{link.name}<ExternalLink size={15}/></a>)}</div>
    <label className="field-label" htmlFor="share-url">Link zu dieser Stelle</label><input id="share-url" className="text-input" value={target.url} readOnly onFocus={event=>event.currentTarget.select()}/>
    <p className="small-note">Der Link öffnet diese Stelle im Buch. Deine Notizen, Lesezeichen und gespeicherten Analysen bleiben privat.</p>
    {message&&<p role="status" className={copied?'success-note':'small-note'}>{message}</p>}
  </div>;
}
