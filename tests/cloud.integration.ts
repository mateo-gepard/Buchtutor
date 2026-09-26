import assert from 'node:assert/strict';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {redis,writeAnalysis,readAnalysis,acquireGeneration,reserveGeneration} from '../lib/shared-cache';
import {prepared} from '../lib/analysis';
const client=redis(),id='integration-'+randomUUID(),prefix='leseraum:v2:';
const device=randomBytes(16).toString('hex');
const now=Date.UTC(2099,0,1,12),day=Math.floor(now/86400000);
const pseudonym=createHmac('sha256',process.env.RATE_LIMIT_SECRET!).update(day+':'+device).digest('hex').slice(0,32);
const keys=new Set<string>([prefix+'analysis:'+id,prefix+'lock:'+id,prefix+'day:'+day+':'+pseudonym,prefix+'site:'+day]);
try{
 const publicAnswer={...prepared[0],id,question:undefined};
 await writeAnalysis(publicAnswer);
 const cached=await readAnalysis(id);assert.equal(cached?.title,publicAnswer.title);assert.equal(cached?.source,'cache');
 await assert.rejects(writeAnalysis({...publicAnswer,mode:'question',question:'a private question'}),/Private questions/);
 const release=await acquireGeneration(id);
 await assert.rejects(acquireGeneration(id),/gerade untersucht/);
 await release();const again=await acquireGeneration(id);await again();
 const minute=Math.floor(now/60000);keys.add(prefix+'minute:'+minute+':'+pseudonym);
 const simultaneous=await Promise.allSettled(Array.from({length:8},()=>reserveGeneration(device,now)));
 assert.equal(simultaneous.filter(r=>r.status==='fulfilled').length,6);
 assert.equal(simultaneous.filter(r=>r.status==='rejected').length,2);
 for(let i=6;i<50;i++){
  const timestamp=now+Math.floor(i/6)*60000;keys.add(prefix+'minute:'+Math.floor(timestamp/60000)+':'+pseudonym);
  const result=await reserveGeneration(device,timestamp);assert.equal(result.remaining,49-i);
 }
 const after=now+10*60000;keys.add(prefix+'minute:'+Math.floor(after/60000)+':'+pseudonym);
 await assert.rejects(reserveGeneration(device,after),/50 neuen/);
 const ttl=await client.ttl(prefix+'day:'+day+':'+pseudonym);assert.ok(ttl>0&&ttl<=24*60*60+120);
 console.log('PASS: Frankfurt Redis read/write, private-question rejection, generation lock, atomic burst limit and 50/day limit.');
}finally{
 // Delete only synthetic keys from this run; never scan or clear real application data.
 await client.del(...keys);
 await client.zrem(prefix+'cache-index',prefix+'analysis:'+id);
}

