import {z} from 'zod';
import {after} from 'next/server';
import {body,json,safe} from '@/lib/server';
import {transcribeInk,validateInkImage} from '@/lib/handwriting-provider';
import {reserveGeneration} from '@/lib/shared-cache';
import {recordUsage} from '@/lib/usage-stats';
import type {UsageDelta} from '@/lib/usage-model';
export const runtime='nodejs';
export const maxDuration=35;
export async function POST(request:Request){
 const started=Date.now(),usage:UsageDelta={requests:1};
 const response=await safe(async()=>{
  // Explicit consent also prevents older clients from silently reviving paid OCR.
  const data=await body(request,z.object({consent:z.literal(true),image:z.string().max(1200022)}),1210000);
  validateInkImage(data.image);
  await reserveGeneration(request.headers.get('x-leseraum-device')??'');
  usage.providerRequests=1;usage.unknownCosts=1;
  const result=await transcribeInk(data.image,reported=>Object.assign(usage,reported));usage.successful=1;
  return json(result);
 });
 if(response.status>=400){if(usage.providerRequests)usage.failed=1;else usage.rejected=1;if(response.status===429)usage.rateLimited=1;}
 after(async()=>{try{await recordUsage(usage,started);}catch{console.error('Buchtutor: handwriting usage statistics write failed');}});
 return response;
}
