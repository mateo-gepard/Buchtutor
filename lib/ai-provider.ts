import {ApiError} from './server';
import {providerUsage,type UsageDelta} from './usage-model';
export const AI_MODEL='openai/gpt-6-luna';
export const REASONING='max';
export async function completion(messages:unknown[],maxTokens:number,onUsage?:(usage:UsageDelta)=>void){
 const key=process.env.OPENROUTER_API_KEY;
 if(!key)throw new ApiError('Die Live-KI ist noch nicht eingerichtet.',503);
 let response:Response;
 try{
  response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(270000),cache:'no-store',
   body:JSON.stringify({model:AI_MODEL,reasoning:{effort:REASONING,exclude:true},provider:{zdr:true,data_collection:'deny',require_parameters:true},prompt_cache_options:{mode:'explicit'},messages,max_completion_tokens:maxTokens,response_format:{type:'json_object'}}),
  });
 }catch{throw new ApiError('Die KI braucht gerade zu lange oder ist nicht erreichbar. Versuche es später erneut.',503);}
 const payload:unknown=await response.json().catch(()=>null);
 const raw=payload&&typeof payload==='object'?payload as {error?:{code?:number};usage?:unknown;model?:string;choices?:{finish_reason?:string;error?:unknown;message?:{content?:string}}[]}:null;
 try{onUsage?.(providerUsage(raw?.usage));}catch{console.error('Buchtutor: usage observer failed');}
 if(!response.ok||raw?.error||raw?.choices?.[0]?.error){
  const status=raw?.error?.code??response.status;
  // Log only a fixed category and numeric status; never provider bodies or user data.
  console.error('Buchtutor: AI provider failure',Number.isInteger(status)?status:502);
  if(status===429)throw new ApiError('Der KI-Anbieter hat gerade sein Limit erreicht. Versuche es später erneut.',429);
  if(status===402)throw new ApiError('Das KI-Guthaben des Betreibers ist aufgebraucht. Deine Entwürfe bleiben auf diesem Gerät.',503);
  if(status===401||status===403)throw new ApiError('Die KI-Verbindung konnte nicht authentifiziert werden. Der Betreiber muss die OpenRouter-Konfiguration prüfen.',503);
  throw new ApiError('Die KI-Verbindung ist derzeit nicht verfügbar. Es wurde keine Antwort gespeichert.',503);
 }
 const content=raw?.choices?.[0]?.message?.content;
 if(typeof content!=='string'||!content.trim())throw new ApiError('Die KI hat keine lesbare Antwort geliefert. Versuche es erneut.',502);
 if(content.length>40000||raw?.choices?.[0]?.finish_reason==='length')throw new ApiError('Die Antwort wurde nicht vollständig abgeschlossen. Versuche eine kürzere Auswahl.',502);
 let parsed:unknown;try{parsed=JSON.parse(content);}catch{throw new ApiError('Die KI-Antwort konnte nicht zuverlässig gelesen werden und wurde nicht gespeichert.',502);}
 return {parsed,content};
}
