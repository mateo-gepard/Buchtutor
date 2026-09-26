import {z} from 'zod';
import {after} from 'next/server';
import {getBook} from '@/lib/corpus';
import {aiStatus,cacheKey,generate,preparedFor} from '@/lib/analysis';
import {normalizeSelection,questionIsClearlyOffTopic} from '@/lib/analysis-selection';
import {anchorSchema,ApiError,body,idSchema,json,safe} from '@/lib/server';
import {acquireGeneration,readAnalysis,reserveGeneration,writeAnalysis} from '@/lib/shared-cache';
import {recordUsage} from '@/lib/usage-stats';
import type {UsageDelta} from '@/lib/usage-model';

export const runtime='nodejs';
export const maxDuration=180;
export async function GET(){return json(aiStatus());}
export async function POST(request:Request){
 const usage:UsageDelta={requests:1};
 const started=Date.now();
 const response=await safe(async()=>{
  const data=await body(request,z.object({workId:idSchema,editionId:idSchema,anchor:anchorSchema,mode:z.enum(['summary','style','meter','context','conflict','question']),question:z.string().max(1200).default('')}));
  const book=await getBook(data.workId);
  if(!book||book.editionId!==data.editionId)throw new ApiError('Die ausgewählte Ausgabe ist nicht verfügbar.',409);
  let anchor;try{anchor=normalizeSelection(book,data.anchor,data.mode);}catch(error){throw new ApiError((error as Error).message);}
  if(anchor.quote.length>6000)throw new ApiError('Wähle für die Analyse höchstens 6.000 Zeichen aus.',413);
  const section=book.sections.find(s=>s.id===anchor.sectionId)!;
  const from=section.blocks.findIndex(b=>b.id===anchor.startId),to=section.blocks.findIndex(b=>b.id===anchor.endId);
  if(section.blocks.slice(from,to+1).filter(b=>b.kind==='verse'||b.kind==='prose').length>80)throw new ApiError('Wähle höchstens 80 Verse aus.',413);
  if(data.mode==='meter'&&section.blocks.slice(from,to+1).some(b=>b.kind==='prose'))throw new ApiError('Diese Stelle ist Prosa. Untersuche stattdessen Sprache und Rhythmus.');
  const question=data.mode==='question'?data.question.trim():'';
  if(data.mode==='question'&&!question)throw new ApiError('Gib zuerst deine Frage ein.');
  if(question&&questionIsClearlyOffTopic(question))throw new ApiError('Diese Lesehilfe beantwortet Fragen zu Literatur und Deutsch. Stelle eine Frage zur ausgewählten Passage.',422);
  const normalized=JSON.stringify(anchor)!==JSON.stringify(data.anchor);
  if(data.mode!=='question'){
    const ready=preparedFor(book,anchor,data.mode);
    if(ready){usage.preparedHits=1;return json({analysis:ready,normalized,usedAnchor:anchor});}
    const cached=await readAnalysis(cacheKey(book,anchor,data.mode));
    if(cached){usage.cacheHits=1;return json({analysis:cached,normalized,usedAnchor:anchor});}
  }
  if(!aiStatus().live)throw new ApiError('Für diese Stelle ist noch keine Lesehilfe hinterlegt. Die Live-KI wird nach Einrichtung des OpenRouter-Schlüssels verfügbar.',503);
  const id=data.mode==='question'?crypto.randomUUID():cacheKey(book,anchor,data.mode);
  const release=data.mode==='question'?async()=>{}:await acquireGeneration(id);
  try{
    // Recheck after acquiring the lock, so concurrent readers reuse the completed answer.
    if(data.mode!=='question'){const cached=await readAnalysis(id);if(cached){usage.cacheHits=1;return json({analysis:cached,normalized,usedAnchor:anchor});}}
    const quota=await reserveGeneration(request.headers.get('x-leseraum-device')??'');
    usage.providerRequests=1;usage.unknownCosts=1;
    const analysis=await generate(book,anchor,data.mode,question,id,reported=>Object.assign(usage,reported));
    usage.successful=1;
    if(data.mode!=='question'){
      try{await writeAnalysis(analysis);}catch{console.error('Buchtutor: public analysis cache write failed');}
    }
    return json({analysis,quota,normalized,usedAnchor:anchor});
  }finally{await release().catch(()=>{});}
 });
 if(response.status>=400){
   if(usage.providerRequests)usage.failed=1;else usage.rejected=1;
   if(response.status===429)usage.rateLimited=1;
 }
 after(async()=>{try{await recordUsage(usage,started);}catch{console.error('Buchtutor: daily usage statistics write failed');}});
 return response;
}
