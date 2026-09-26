import {randomUUID} from 'node:crypto';
import {cloudConfigured,redis} from './shared-cache';
import {cleanUsageDelta,dailyUsage,sumUsage,type UsageDelta} from './usage-model';

export const USAGE_RETENTION_SECONDS=90*86400;
export function usagePrefix(){const scope=process.env.VERCEL_ENV==='production'?'production':process.env.VERCEL_ENV==='preview'?'preview':'development';return 'leseraum:v2:usage:'+scope+':';}
export async function recordUsage(delta:UsageDelta,now=Date.now(),eventId=randomUUID()){
  if(!cloudConfigured())return;
  const entries=Object.entries(cleanUsageDelta(delta)).filter(([,value])=>value>0);
  if(!entries.length)return;
  const prefix=usagePrefix(),day=new Date(now).toISOString().slice(0,10);
  // This short-lived random nonce only prevents a transport retry from counting twice.
  await redis().eval(`
    if not redis.call('SET',KEYS[2],'1','NX','EX',600) then return 0 end
    for i=2,#ARGV,2 do redis.call('HINCRBY',KEYS[1],ARGV[i],ARGV[i+1]) end
    redis.call('EXPIRE',KEYS[1],ARGV[1])
    return 1
  `,[prefix+day,prefix+'dedupe:'+eventId],[String(USAGE_RETENTION_SECONDS),...entries.flatMap(([key,value])=>[key,String(value)])]);
}
export async function readUsage(days:number,now=Date.now()){
  if(!Number.isInteger(days)||days<1||days>90)throw new Error('Invalid statistics range');
  if(!cloudConfigured())throw new Error('Statistics storage unavailable');
  const dates=Array.from({length:days},(_,i)=>new Date(now-(days-1-i)*86400000).toISOString().slice(0,10));
  const pipeline=redis().pipeline();for(const date of dates)pipeline.hgetall(usagePrefix()+date);
  const values=await pipeline.exec();
  const rows=dates.map((date,i)=>dailyUsage(date,values[i]));
  return {rows,totals:sumUsage(rows),retentionDays:90,timeZone:'UTC',currency:'USD',asOf:new Date(now).toISOString()};
}
