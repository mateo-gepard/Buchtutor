import {cookies} from 'next/headers';
import {z} from 'zod';
import {body,ApiError,json,safe} from '@/lib/server';
import {createStatsSession,statsAuthConfigured,STATS_COOKIE,STATS_SESSION_SECONDS,validStatsPassword} from '@/lib/stats-auth';
import {redis} from '@/lib/shared-cache';
import {usagePrefix} from '@/lib/usage-stats';

export const runtime='nodejs';
function requireSameOrigin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new ApiError('Diese Anfrage ist nicht erlaubt.',403);}
export async function POST(request:Request){return safe(async()=>{
  requireSameOrigin(request);
  if(!statsAuthConfigured())throw new ApiError('Der Statistikzugang ist noch nicht eingerichtet.',503);
  const {password}=await body(request,z.object({password:z.string().min(1).max(300)}));
  if(!validStatsPassword(password)){
    const count=await redis().eval<string[],number>("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",[usagePrefix()+'login-failures'],[]);
    throw new ApiError(count>20?'Zu viele Anmeldeversuche. Warte eine Minute.':'Das Passwort stimmt nicht.',count>20?429:401,count>20?60:undefined);
  }
  (await cookies()).set(STATS_COOKIE,createStatsSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/verwaltung',maxAge:STATS_SESSION_SECONDS});
  return json({ok:true});
});}
export async function DELETE(request:Request){return safe(async()=>{
  requireSameOrigin(request);
  (await cookies()).set(STATS_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/verwaltung',maxAge:0});
  return json({ok:true});
});}
