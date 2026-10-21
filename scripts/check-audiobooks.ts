/** Release check: canonical bindings and the actual prepared audio, not UI mocks. */
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {hasAudiobook,validateAudiobook} from '../lib/audiobook';
import type {Book} from '../lib/reader-model';
import sources from '../corpus/audiobook-sources.json';
const ids=process.argv.slice(2).length?process.argv.slice(2):Object.keys(sources).filter(hasAudiobook);
for(const id of ids){
 if((sources as Record<string,{kind?:string}>)[id]?.kind!=='human')throw new Error('Only registered human recordings may be released');
 const book=JSON.parse(readFileSync(`corpus/books/${id}.json`,'utf8')) as Book;
 const audio=validateAudiobook(JSON.parse(readFileSync(`public/audiobooks/${id}.json`,'utf8')),book);
 const seen=new Set<string>();let duration=0,cues=0;
 for(const track of audio.tracks){
  duration+=track.duration;cues+=track.cues.length;track.cues.forEach(cue=>seen.add(cue.blockId));
  const local=track.url.startsWith('/')?`public${track.url}`:`work/audio/${id}/${decodeURIComponent(new URL(track.url).pathname.split('/').pop()!)}`;
  if(track.url.startsWith('/')&&!track.url.startsWith(`/audio/${id}/`))throw new Error('Wrong local recording directory');
  if(!existsSync(local))throw new Error(`Missing prepared audio: ${local}`);
  const sha=createHash('sha256').update(readFileSync(local)).digest('hex');if(sha!==track.sha256)throw new Error(`Audio changed: ${local}`);
  const measured=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',local],{encoding:'utf8'}));
  if(Math.abs(measured-track.duration)>1)throw new Error(`Duration mismatch: ${local}`);
 }
 const readable=book.sections.flatMap(section=>section.blocks).filter(block=>block.kind==='verse'||block.kind==='prose');
 if(seen.size!==audio.alignment.matchedBlocks||readable.length!==audio.alignment.totalBlocks)throw new Error(`Coverage counts differ: ${id}`);
 console.log(JSON.stringify({work:id,kind:'human',tracks:audio.tracks.length,hours:Math.round(duration/36)/100,cues,matchedBlocks:seen.size,totalBlocks:readable.length}));
}
