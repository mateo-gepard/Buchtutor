/** Explicit opt-in: this makes paid operator model calls. Never run in ordinary CI. */
import {writeFile,mkdir} from 'node:fs/promises';
import {getBook} from '../lib/corpus';
import {firstReadable,makeAnchor,type AnalysisMode} from '../lib/reader-model';
const base=process.argv.find(a=>a.startsWith('https://'));
if(!process.argv.includes('--live')||!base)throw new Error('Usage: npx tsx scripts/check-ai-live.ts https://www.buchtutor.de --live');
const origin=new URL(base).origin,device=crypto.randomUUID().replaceAll('-','');
const book=(await getBook('iphigenie'))!,section=firstReadable(book),blocks=section.blocks.filter(b=>b.kind==='verse').slice(0,3);
const anchor=makeAnchor(section,blocks[0].id,blocks.at(-1)!.id);
const report:{mode:string;status:number;seconds:number;source?:string;model?:string;error?:string;characters?:number}[]=[];
async function post(path:string,input:unknown){return fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Leseraum-Device':device},body:JSON.stringify(input),signal:AbortSignal.timeout(290000)});}
async function check(mode:AnalysisMode){
 const now=Date.now();try{
  const response=await post('/api/analysis',{workId:book.id,editionId:book.editionId,anchor,mode,question:mode==='question'?'Was bedeutet der Hain in dieser Stelle?':''});const data=await response.json();
  const result={mode,status:response.status,seconds:Math.round((Date.now()-now)/100)/10,source:data.analysis?.source,model:data.analysis?.model,error:data.error};report.push(result);console.log(JSON.stringify(result));
 }catch(error){const result={mode,status:0,seconds:Math.round((Date.now()-now)/100)/10,error:(error as Error).name};report.push(result);console.log(JSON.stringify(result));}
}
// At most two concurrent calls; every analysis mode gets a real HTTP request.
for(const modes of [['summary','style'],['meter','context'],['conflict','question']] as AnalysisMode[][])await Promise.all(modes.map(check));
await mkdir('work',{recursive:true});await writeFile('work/ai-live-results.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),selection:anchor,results:report},null,2));
if(report.some(r=>r.status!==200))process.exitCode=1;
