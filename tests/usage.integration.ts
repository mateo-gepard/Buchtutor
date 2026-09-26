import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {redis} from '../lib/shared-cache';
import {readUsage,recordUsage,usagePrefix,USAGE_RETENTION_SECONDS} from '../lib/usage-stats';

// Only synthetic far-future development buckets; no provider calls or real user data.
process.env.VERCEL_ENV='development';
const client=redis(),now=Date.UTC(2099,4,10,12),day='2099-05-10',prefix=usagePrefix();
const first=randomUUID(),second=randomUUID();
const keys=[prefix+day,prefix+'dedupe:'+first,prefix+'dedupe:'+second];
assert.equal(await client.exists(keys[0]),0,'Synthetic test bucket must be unused');
try{
  await Promise.all([recordUsage({requests:1,providerRequests:1,costNanoUsd:1500000,knownCosts:1,inputTokens:1500,outputTokens:2700},now,first),recordUsage({requests:1,providerRequests:1,costNanoUsd:1500000,knownCosts:1,inputTokens:1500,outputTokens:2700},now,first)]);
  await recordUsage({requests:1,cacheHits:1},now,second);
  const report=await readUsage(2,now);
  assert.equal(report.rows[0].recorded,false);assert.equal(report.rows[1].recorded,true);
  assert.equal(report.totals.requests,2);assert.equal(report.totals.providerRequests,1);assert.equal(report.totals.cacheHits,1);assert.equal(report.totals.costNanoUsd,1500000);
  const ttl=await client.ttl(keys[0]),dedupeTtl=await client.ttl(keys[1]);
  assert.ok(ttl>USAGE_RETENTION_SECONDS-60&&ttl<=USAGE_RETENTION_SECONDS);assert.ok(dedupeTtl>0&&dedupeTtl<=600);
  process.env.VERCEL_ENV='preview';assert.notEqual(usagePrefix(),prefix);
  assert.equal((await readUsage(1,now)).totals.requests,0);
  process.env.VERCEL_ENV='production';assert.notEqual(usagePrefix(),prefix);
  console.log('PASS: aggregate write/read, retry deduplication, UTC buckets, 90-day retention, environment isolation.');
}finally{await client.del(...keys);}
