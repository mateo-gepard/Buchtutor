import {Redis} from '@upstash/redis';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {ApiError} from './server';
import {portableAnalysisSchema} from './local-model';
import type {Analysis} from './reader-model';

let instance:Redis|undefined;
const prefix='leseraum:v2:';
export function cloudConfigured(){return !!((process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL)&&(process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN));}
export function limitsConfigured(){return (process.env.RATE_LIMIT_SECRET?.length??0)>=32;}
export function redis(){
  if(!cloudConfigured())throw new ApiError('Der gemeinsame Analysespeicher ist noch nicht eingerichtet.',503);
  return instance??=new Redis({url:process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL!,token:process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN!,retry:{retries:1,backoff:()=>150}});
}
export const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export async function readAnalysis(id:string):Promise<Analysis|null>{
  if(!cloudConfigured())return null;
  const value=await redis().get(prefix+'analysis:'+id);
  if(!value)return null;
  const parsed=portableAnalysisSchema.safeParse(value);
  return parsed.success?{...parsed.data,source:'cache'}:null;
}
export async function writeAnalysis(analysis:Analysis){
  if(analysis.mode==='question'||analysis.question)throw new Error('Private questions cannot enter the shared cache.');
  const payload=JSON.stringify(portableAnalysisSchema.parse(analysis));
  if(payload.length>64000)throw new Error('Analysis cache entry too large.');
  await redis().eval(`
    redis.call('SET', KEYS[1], ARGV[1], 'EX', 7776000)
    redis.call('ZADD', KEYS[2], ARGV[2], KEYS[1])
    local excess=redis.call('ZCARD', KEYS[2])-3000
    if excess>0 then
      local oldest=redis.call('ZPOPMIN', KEYS[2], excess)
      for i=1,#oldest,2 do redis.call('DEL',oldest[i]) end
    end
    return 1
  `,[prefix+'analysis:'+analysis.id,prefix+'cache-index'],[payload,String(Date.now())]);
}
export async function acquireGeneration(id:string){
  const token=randomUUID(),key=prefix+'lock:'+id;
  const acquired=await redis().set(key,token,{nx:true,ex:240});
  if(!acquired)throw new ApiError('Diese Stelle wird gerade untersucht. Versuche es in einigen Sekunden erneut; dafür wurde noch kein Kontingent verbraucht.',409,8);
  return async()=>{await redis().eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",[key],[token]);};
}
function cappedEnv(name:string,fallback:number,max:number){const n=Number(process.env[name]);return Number.isInteger(n)&&n>0?Math.min(n,max):fallback;}
export function dailyLimit(){return cappedEnv('AI_DAILY_LIMIT',50,200);}
export async function reserveGeneration(device:string,now=Date.now()){
  if(!/^[a-f0-9]{32}$/.test(device))throw new ApiError('Die Gerätekennung fehlt. Lade die Seite neu und erlaube den lokalen Gerätespeicher.');
  if(!limitsConfigured())throw new ApiError('Die Anfragebegrenzung ist noch nicht eingerichtet.',503);
  const day=Math.floor(now/86400000),minute=Math.floor(now/60000);
  // A different HMAC namespace each day prevents a permanent per-device history.
  const pseudonym=createHmac('sha256',process.env.RATE_LIMIT_SECRET!).update(day+':'+device).digest('hex').slice(0,32);
  const reset=(day+1)*86400000,ttl=Math.ceil((reset-now)/1000)+120;
  const limits=[6,dailyLimit(),cappedEnv('AI_SITE_DAILY_LIMIT',500,10000)];
  const keys=[prefix+'minute:'+minute+':'+pseudonym,prefix+'day:'+day+':'+pseudonym,prefix+'site:'+day];
  const outcome=await redis().eval<string[],number[]>(`
    for i=1,3 do
      local n=tonumber(redis.call('GET',KEYS[i]) or '0')
      if n>=tonumber(ARGV[i]) then return {0,i,n} end
    end
    for i=1,3 do
      redis.call('INCR',KEYS[i])
      redis.call('EXPIRE',KEYS[i],i==1 and 120 or tonumber(ARGV[4]))
    end
    return {1,tonumber(redis.call('GET',KEYS[2]))}
  `,keys,[...limits.map(String),String(ttl)]);
  if(outcome[0]!==1){
    const cause=outcome[1];
    throw new ApiError(cause===1?'Bitte warte kurz, bevor du weitere Stellen untersuchst.':cause===2?`Deine ${limits[1]} neuen KI-Anfragen für heute sind verbraucht. Gespeicherte Analysen bleiben verfügbar.`:'Das gemeinsame Tageskontingent ist ausgeschöpft. Gespeicherte Analysen bleiben verfügbar.',429,cause===1?60:Math.ceil((reset-now)/1000));
  }
  return {remaining:Math.max(0,limits[1]-outcome[1]),limit:limits[1],resetsAt:new Date(reset).toISOString()};
}
