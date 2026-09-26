import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate,AI_MODEL} from '../lib/analysis';
import {getBook} from '../lib/corpus';
import {firstReadable,makeAnchor} from '../lib/reader-model';
import type {UsageDelta} from '../lib/usage-model';

test('provider request pins Luna/max, ZDR and canonical context; fabricated quotes and out-of-scope output fail',async()=>{
 const book=(await getBook('iphigenie'))!,section=firstReadable(book),block=section.blocks.find(b=>b.kind==='verse')!,anchor=makeAnchor(section,block.id);
 const fetchOriginal=globalThis.fetch,originalKey=process.env.OPENROUTER_API_KEY;
 let mode:'valid'|'false_quote'|'out_of_scope'|'missing_usage'|'http_error'='valid';
 const reports:UsageDelta[]=[];
 const capture=(usage:UsageDelta)=>reports.push(usage);
 process.env.OPENROUTER_API_KEY='test-only-no-network-key';
 globalThis.fetch=async(input,options)=>{
  assert.equal(String(input),'https://openrouter.ai/api/v1/chat/completions');
  const payload=JSON.parse(String(options?.body));
  assert.equal(payload.model,'openai/gpt-6-luna');
  assert.deepEqual(payload.reasoning,{effort:'max',exclude:true});
  assert.deepEqual(payload.provider,{zdr:true,data_collection:'deny',require_parameters:true});
  const prompt=JSON.parse(payload.messages[1].content);
  assert.equal(prompt.auswahl[0].text,block.text);
  assert.ok(prompt.kontextDanach.length);
  assert.equal(prompt.frage,'Was bedeutet die Stelle?');
  assert.equal('user' in payload,false);
  const response=mode==='out_of_scope'?{scope:'out_of_scope'}:{scope:'literature',title:'Test',summary:'Testantwort',observations:[{label:'Textbeleg',text:'Erläuterung',quotes:[{blockId:block.id,quote:mode==='false_quote'?'ERFUNDENER BELEG':block.text}]}],uncertainty:''};
  return Response.json({usage:mode==='missing_usage'?undefined:{cost:0.003,prompt_tokens:1500,completion_tokens:5000,completion_tokens_details:{reasoning_tokens:4500}},choices:[{finish_reason:'stop',message:{content:JSON.stringify(response)}}]},{status:mode==='http_error'?503:200});
 };
 try{
  const result=await generate(book,anchor,'question','Was bedeutet die Stelle?','test-answer',capture);
  assert.equal(result.model,AI_MODEL);assert.equal(result.question,'Was bedeutet die Stelle?');
  mode='false_quote';await assert.rejects(generate(book,anchor,'question','Was bedeutet die Stelle?','test-answer',capture),/Beleg/);
  mode='out_of_scope';await assert.rejects(generate(book,anchor,'question','Was bedeutet die Stelle?','test-answer',capture),/Literatur/);
  mode='http_error';await assert.rejects(generate(book,anchor,'question','Was bedeutet die Stelle?','test-answer',capture),/Verbindung/);
  assert.equal(reports.length,4);for(const report of reports){assert.equal(report.costNanoUsd,3000000);assert.equal(report.knownCosts,1);}
  mode='missing_usage';await generate(book,anchor,'question','Was bedeutet die Stelle?','test-answer',capture);
  assert.equal(reports[4].unknownCosts,1);
 }finally{
  globalThis.fetch=fetchOriginal;
  if(originalKey===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=originalKey;
 }
});
