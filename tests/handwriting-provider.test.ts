import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transcribeInk,validateInkImage,HANDWRITING_MODEL} from '../lib/handwriting-provider';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
test('handwriting rejects URLs, oversized dimensions and invalid images before contacting a provider',async()=>{
 for(const value of ['https://example.com/private.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,aGVsbG8='])assert.throws(()=>validateInkImage(value));
 const bytes=Buffer.from(image.slice(22),'base64');bytes.writeUInt32BE(100000,16);assert.throws(()=>validateInkImage('data:image/png;base64,'+bytes.toString('base64')));
 const original=fetch;let calls=0;try{globalThis.fetch=async()=>{calls++;throw new Error('No network');};await assert.rejects(transcribeInk('https://example.com'),/PNG/);assert.equal(calls,0);}finally{globalThis.fetch=original;}
});
test('bounded private transcription preserves German text and reports cost without caching content',async()=>{
 const original=fetch,key=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='test-only';
 try{
  globalThis.fetch=async(_url,init)=>{
   const payload=JSON.parse(init!.body as string);assert.equal(payload.model,HANDWRITING_MODEL);assert.equal(payload.provider.zdr,true);assert.equal(payload.provider.data_collection,'deny');assert.equal(payload.max_completion_tokens,1800);assert.equal(payload.messages[1].content[0].image_url.url,image);assert.equal(init?.cache,'no-store');
   return Response.json({choices:[{message:{content:JSON.stringify({text:'Größe und Würde.\nNatur als Zuflucht.',uncertain:false})},finish_reason:'stop'}],usage:{prompt_tokens:1000,completion_tokens:150,cost:0.000475}});
  };
  let cost=0;const result=await transcribeInk(image,usage=>{cost=usage.costNanoUsd??0;});assert.equal(result.text,'Größe und Würde.\nNatur als Zuflucht.');assert.equal(cost,475000);
  for(const payload of [{choices:[{finish_reason:'length',message:{content:'{}'}}]},{choices:[{message:{content:'not JSON'}}]},{choices:[{message:{content:'{\"text\":\"\",\"uncertain\":true}'}}]}]){
   globalThis.fetch=async()=>Response.json(payload);await assert.rejects(transcribeInk(image));
  }
  globalThis.fetch=async()=>{throw new DOMException('Timeout','TimeoutError');};await assert.rejects(transcribeInk(image),/Originalhandschrift ist gespeichert/);
 }finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=key;}
});
