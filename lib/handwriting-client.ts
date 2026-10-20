'use client';
import type {SavedNote} from './reader-model';
import type {PencilAnnotation} from './pencil-model';
import {deviceId,getLocalState,updateLocal} from './local-storage';

export function inkImage(pencil:PencilAnnotation){
 const canvas=document.createElement('canvas'),width=pencil.inkWidth??640,height=pencil.inkHeight??220;
 const scale=Math.min(2,2048/width,2048/height,Math.sqrt(2000000/(width*height)));
 canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Das Schriftbild konnte nicht erstellt werden.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.scale(scale,scale);
 ctx.strokeStyle='#182b24';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';
 for(const stroke of pencil.ink){
  ctx.beginPath();stroke.forEach((point,i)=>{if(i)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);});ctx.stroke();
 }
 return canvas.toDataURL('image/png');
}
const queue=new Map<string,SavedNote>();
let running=false;
let activeId:string|null=null;
let activeRequest:AbortController|null=null;
const attempted=new Set<string>();
// One request at a time. Notes and strokes are committed before a job enters
// this queue. Closing a panel never cancels or discards their local originals.
export function queueHandwriting(notes:SavedNote[]){
 for(const note of notes)if(note.pencil?.transcription==='pending'&&!note.deletedAt&&note.id!==activeId&&!attempted.has(note.id+':'+note.updatedAt))queue.set(note.id,note);
 if(!running)void drain();
}
async function drain(){
 running=true;
 try{
  while(queue.size){
   const [id,snapshot]=queue.entries().next().value!;queue.delete(id);activeId=id;
   const pencil=snapshot.pencil;if(!pencil?.ink.length)continue;
   const signature=JSON.stringify(pencil.ink);
   const unchanged=(note:SavedNote)=>note.id===id&&!note.deletedAt&&note.pencil?.transcription==='pending'&&JSON.stringify(note.pencil.ink)===signature;
   if(!getLocalState().data.preferences.value.handwritingCloud||!getLocalState().data.notes.some(unchanged))continue;
   attempted.add(id+':'+snapshot.updatedAt);
   let text='',uncertain=false,error='';
   activeRequest=new AbortController();
   const controller=activeRequest,timeout=setTimeout(()=>controller.abort(),30000);
   try{
    const response=await fetch('/api/handwriting',{method:'POST',headers:{'Content-Type':'application/json','x-leseraum-device':deviceId()},body:JSON.stringify({consent:true,image:inkImage(pencil)}),signal:controller.signal,cache:'no-store'});
    const result=await response.json();
    if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Erkennung nicht verfügbar. Bitte erneut versuchen.');
    if(typeof result.text!=='string'||!result.text.trim()||result.text.length>6000||typeof result.uncertain!=='boolean')throw new Error('Keine verlässliche Antwort erhalten. Das Original bleibt gespeichert.');
    text=result.text;uncertain=result.uncertain;
   }catch(e){error=controller.signal.aborted?'Die Erkennung wurde unterbrochen. Bitte erneut versuchen.':e instanceof TypeError?'Keine Verbindung zur Schrifterkennung. Dein Original ist gespeichert.':e instanceof Error?e.message:'Erkennung nicht verfügbar. Bitte erneut versuchen.';}
   finally{clearTimeout(timeout);}
   try{
    await updateLocal(data=>({...data,notes:data.notes.map(note=>{
     if(!unchanged(note))return note;
     const previous=note.pencil?.transcript,manual=previous&&note.body.endsWith(previous)?note.body.slice(0,-previous.length).trimEnd():note.body;
     return {...note,body:error?note.body:[manual,text].filter(Boolean).join('\n'),updatedAt:new Date().toISOString(),pencil:{...note.pencil!,transcription:error?'failed':'recognized',transcript:error?previous:text,uncertain,transcriptionError:error?error.slice(0,300):undefined}};
    })}));
   }catch{
    // Keep the durable original and tell the reader that completion could not
    // be saved. Retrying a failed local write must not keep buying API calls.
    window.dispatchEvent(new Event('buchtutor-handwriting-save-error'));
   }
   activeId=null;activeRequest=null;
   queueHandwriting(getLocalState().data.notes);
  }
 }finally{running=false;activeId=null;activeRequest=null;}
}
export async function setHandwritingCloud(enabled:boolean){
 if(!enabled){activeRequest?.abort();queue.clear();}
 await updateLocal(data=>({...data,preferences:{value:{...data.preferences.value,handwritingCloud:enabled},updatedAt:new Date().toISOString()},notes:enabled?data.notes:data.notes.map(note=>note.pencil?.transcription==='pending'?{...note,pencil:{...note.pencil,transcription:'none'}}:note)}));
}
export function retryHandwriting(id:string){
 return updateLocal(data=>({...data,notes:data.notes.map(note=>note.id===id&&note.pencil?.ink.length?{...note,updatedAt:new Date().toISOString(),pencil:{...note.pencil,transcription:'pending',transcriptionError:undefined}}:note)}));
}
