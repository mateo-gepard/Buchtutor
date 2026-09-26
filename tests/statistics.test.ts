import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cleanUsageDelta,dailyUsage,providerUsage,sumUsage} from '../lib/usage-model';
import {createStatsSession,STATS_SESSION_SECONDS,statsAuthConfigured,validStatsPassword,validStatsSession} from '../lib/stats-auth';
import {sanitizeVisitorEvent} from '../lib/visitor-privacy';

test('metering uses charged costs, keeps reasoning inside output, and distinguishes unknown from zero',()=>{
  const paid=providerUsage({prompt_tokens:1300,completion_tokens:4000,completion_tokens_details:{reasoning_tokens:3500},cost:0.00213,cost_details:{upstream_inference_cost:15}});
  assert.deepEqual(paid,{inputTokens:1300,outputTokens:4000,reasoningTokens:3500,tokenReports:1,costNanoUsd:2130000,knownCosts:1,unknownCosts:0});
  assert.equal(providerUsage({cost:0}).knownCosts,1);
  for(const cost of [undefined,null,'0.1',NaN,Infinity,-1,1001])assert.equal(providerUsage({cost}).unknownCosts,1);
  assert.equal(providerUsage(null).tokenReports,0);
  assert.equal(providerUsage({prompt_tokens:1.5,completion_tokens:-1}).tokenReports,0);
  assert.equal(providerUsage({completion_tokens:100,completion_tokens_details:{reasoning_tokens:300}}).reasoningTokens,100);
});

test('daily aggregate strips all non-metric fields and preserves tiny costs without float accumulation',()=>{
  const input={requests:1,costNanoUsd:17,unknownCosts:0,question:'PRIVATE',device:'PRIVATE',inputTokens:-1,outputTokens:NaN};
  assert.deepEqual(cleanUsageDelta(input),{requests:1,costNanoUsd:17,unknownCosts:0});
  const first=dailyUsage('2026-09-25',{requests:'2',costNanoUsd:'17',cacheHits:'1',question:'PRIVATE'});
  const second=dailyUsage('2026-09-26',{requests:3,costNanoUsd:19,cacheHits:2});
  assert.equal(sumUsage([first,second]).costNanoUsd,36);
  assert.equal(sumUsage([first,second]).cacheHits,3);
  assert.equal('question' in first,false);
  assert.equal(dailyUsage('2026-09-24',null).recorded,false);
  assert.equal(dailyUsage('2026-09-24',{requests:'1e10'}).requests,0);
});

test('visitor events never contain reader parameters or admin routes, and custom events are denied',()=>{
  assert.deepEqual(sanitizeVisitorEvent({type:'pageview',url:'https://www.buchtutor.de/?work=faust&section=secret&note=PRIVATE#verse-123'}),{type:'pageview',url:'https://www.buchtutor.de/'});
  for(const path of ['/verwaltung','/api/admin/session','/unbekannt'])assert.equal(sanitizeVisitorEvent({type:'pageview',url:'https://www.buchtutor.de'+path}),null);
  assert.equal(sanitizeVisitorEvent({type:'pageview',url:'not a URL'}),null);
  assert.equal(sanitizeVisitorEvent({type:'pageview',url:'javascript:alert(1)'}),null);
  const customEvent={type:'event' as const,url:'https://www.buchtutor.de/',name:'private',data:{note:'PRIVATE'}};
  assert.equal(sanitizeVisitorEvent(customEvent),null);
});

test('operator sessions reject tampering, expired cookies, password rotation and missing config',()=>{
  const original=process.env.STATS_PASSWORD,now=Date.UTC(2026,8,25,12);
  try{
    delete process.env.STATS_PASSWORD;
    assert.equal(statsAuthConfigured(),false);assert.equal(validStatsPassword(''),false);assert.equal(validStatsSession(undefined,now),false);
    process.env.STATS_PASSWORD='short';assert.equal(statsAuthConfigured(),false);
    process.env.STATS_PASSWORD='test-secret-'.repeat(5);
    assert.equal(validStatsPassword(process.env.STATS_PASSWORD),true);assert.equal(validStatsPassword('wrong'),false);
    const session=createStatsSession(now);assert.equal(validStatsSession(session,now),true);
    assert.equal(validStatsSession(session,now+STATS_SESSION_SECONDS*1000),false);
    assert.equal(validStatsSession(session,now-2000),false);
    assert.equal(validStatsSession(session.replace('v1.','v2.'),now),false);
    const parts=session.split('.');parts[2]='A'.repeat(43);assert.equal(validStatsSession(parts.join('.'),now),false);
    process.env.STATS_PASSWORD='rotated-secret-'.repeat(5);assert.equal(validStatsSession(session,now),false);
  }finally{if(original===undefined)delete process.env.STATS_PASSWORD;else process.env.STATS_PASSWORD=original;}
});
