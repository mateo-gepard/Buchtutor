import {z} from 'zod';
import sources from '../corpus/audiobook-sources.json' with {type:'json'};
import type {Book} from './reader-model';

export function hasAudiobook(workId:string){
 const source=(sources as Record<string,{kind?:string;status?:string}>)[workId];
 return source?.kind==='human'&&source.status!=='preparing'&&source.status!=='unavailable';
}

export const audioCueSchema=z.object({start:z.number().finite().nonnegative(),end:z.number().finite().positive(),sectionId:z.string(),blockId:z.string(),startOffset:z.number().int().nonnegative(),endOffset:z.number().int().positive(),confidence:z.number().min(0).max(1)});
export type AudioCue=z.infer<typeof audioCueSchema>;
const https=z.string().url().refine(value=>{try{return new URL(value).protocol==='https:';}catch{return false;}});
const audioUrl=z.union([https,z.string().regex(/^\/audio\/[a-z]+\/s[0-9]+\.mp3$/)]);
export const audiobookSchema=z.object({version:z.literal(1),workId:z.string(),editionId:z.string(),revision:z.string(),recordingId:z.string(),synthetic:z.literal(false).optional(),sourceLabel:z.string(),sourceUrl:https,licenseUrl:https,narrator:z.string(),note:z.string(),alignment:z.object({method:z.string(),matchedBlocks:z.number().int().nonnegative(),totalBlocks:z.number().int().positive()}),tracks:z.array(z.object({id:z.string(),title:z.string(),url:audioUrl,duration:z.number().finite().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/),cues:z.array(audioCueSchema).max(15000)})).min(1).max(200)});
export type Audiobook=z.infer<typeof audiobookSchema>;
export function validateAudiobook(value:unknown,book:Book):Audiobook{
 const audio=audiobookSchema.parse(value);
 if(audio.workId!==book.id||audio.editionId!==book.editionId||audio.revision!==book.revision)throw new Error('Die Aufnahme passt nicht zur aktuellen Textausgabe.');
 if(new Set(audio.tracks.map(track=>track.id)).size!==audio.tracks.length||audio.alignment.matchedBlocks>audio.alignment.totalBlocks)throw new Error('Ungültiges Aufnahmeverzeichnis.');
 const blocks=new Map(book.sections.flatMap(section=>section.blocks.map(block=>[block.id,{...block,sectionId:section.id}] as const)));
 for(const track of audio.tracks){
  let previous=-1;
  const url=new URL(track.url,'https://www.buchtutor.de');
  if(url.hostname!=='archive.org'&&!url.hostname.endsWith('.public.blob.vercel-storage.com')&&!url.hostname.endsWith('.buchtutor.de'))throw new Error('Unbekannte Audioquelle.');
  for(const cue of track.cues){const block=blocks.get(cue.blockId);if(!block||!['verse','prose'].includes(block.kind)||block.sectionId!==cue.sectionId||cue.endOffset>block.text.length||cue.startOffset>=cue.endOffset||cue.start<previous||cue.end<=cue.start||cue.end>track.duration+1)throw new Error('Ungültige Audio-Zeitmarken.');previous=cue.start;}
 }
 return audio;
}
export function cueAt(cues:AudioCue[],time:number){
 let low=0,high=cues.length-1,index=-1;
 while(low<=high){const middle=(low+high)>>1;if(cues[middle].start<=time){index=middle;low=middle+1;}else high=middle-1;}
 const cue=cues[index];return cue&&time<=cue.end+.7?cue:null;
}
export function audioTime(value:number){const n=Math.max(0,Math.floor(Number.isFinite(value)?value:0)),hours=Math.floor(n/3600);return hours?`${hours}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
export const audioEmphasisSchema=z.enum(['phrase','line','off']);
export type AudioEmphasis=z.infer<typeof audioEmphasisSchema>;
export type AudioPosition={emphasis?:AudioEmphasis;sectionId:string;blockId:string;startOffset:number;endOffset:number};
export const audioProgressSchema=z.object({version:z.literal(1),editionId:z.string(),revision:z.string(),mode:z.enum(['recording','device']),recordingId:z.string().optional(),trackId:z.string().optional(),time:z.number().finite().nonnegative().max(86400),unit:z.number().int().nonnegative().max(50000),rate:z.number().min(.5).max(2.5),voice:z.string().max(500),follow:z.boolean(),emphasis:audioEmphasisSchema.optional()});
export type AudioProgress=z.infer<typeof audioProgressSchema>;
export const audioProgressKey=(editionId:string)=>`buchtutor-audio-v1:${editionId}`;
