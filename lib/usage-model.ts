export const USAGE_FIELDS=['requests','providerRequests','successful','failed','cacheHits','preparedHits','rateLimited','rejected','inputTokens','outputTokens','reasoningTokens','tokenReports','costNanoUsd','knownCosts','unknownCosts'] as const;
export type UsageField=typeof USAGE_FIELDS[number];
export type UsageTotals=Record<UsageField,number>;
export type UsageDelta=Partial<UsageTotals>;
export type DailyUsage=UsageTotals&{date:string;recorded:boolean};
export const emptyUsage=():UsageTotals=>Object.fromEntries(USAGE_FIELDS.map(key=>[key,0])) as UsageTotals;
const object=(value:unknown):Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:{};
const tokenCount=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=10000000?value:null;

export function providerUsage(value:unknown):UsageDelta{
  const usage=object(value),input=tokenCount(usage.prompt_tokens),output=tokenCount(usage.completion_tokens);
  const reasoning=tokenCount(object(usage.completion_tokens_details).reasoning_tokens);
  const cost=usage.cost;
  const known=typeof cost==='number'&&Number.isFinite(cost)&&cost>=0&&cost<=1000;
  return {
    inputTokens:input??0,outputTokens:output??0,reasoningTokens:reasoning!==null&&output!==null?Math.min(reasoning,output):0,
    tokenReports:input!==null&&output!==null?1:0,
    costNanoUsd:known?Math.round(cost*1e9):0,knownCosts:known?1:0,unknownCosts:known?0:1,
  };
}
export function cleanUsageDelta(delta:UsageDelta):UsageDelta{
  const clean:UsageDelta={};
  for(const field of USAGE_FIELDS){const value=delta[field];if(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0)clean[field]=value;}
  return clean;
}
export function dailyUsage(date:string,value:unknown):DailyUsage{
  const row=object(value),totals=emptyUsage();
  for(const field of USAGE_FIELDS){const value=row[field];const n=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value)?Number(value):0;if(Number.isSafeInteger(n)&&n>=0)totals[field]=n;}
  return {...totals,date,recorded:Object.keys(row).length>0};
}
export function sumUsage(rows:UsageTotals[]):UsageTotals{
  const total=emptyUsage();for(const row of rows)for(const field of USAGE_FIELDS)total[field]+=row[field];return total;
}
