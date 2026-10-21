import type {Anchor,Section} from './reader-model';
import {makeAnchor} from './reader-model';
import type {WordBox} from './pencil-model';
import type {InkBox,InkLayout,InkTarget} from './page-handwriting';
function rangeWithin(el:Element,start:number,end:number){
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),range=document.createRange();let node:Node|null,total=0,started=false;
 while((node=walker.nextNode())){const length=node.textContent?.length??0;if(!started&&start<=total+length){range.setStart(node,Math.max(0,start-total));started=true;}if(started&&end<=total+length){range.setEnd(node,Math.max(0,end-total));return range;}total+=length;}
 return null;
}
// DOM client rectangles and pointer client coordinates share the visual CSS
// space. Persist only document units, independent of pan, page scroll and scale.
export function documentGeometry(root:HTMLElement){
 const rect=root.getBoundingClientRect(),declared=Number(root.closest<HTMLElement>('[data-document-scale]')?.dataset.documentScale);
 const scale=Number.isFinite(declared)&&declared>0?declared:rect.width/(parseFloat(getComputedStyle(root).width)||root.offsetWidth||rect.width||1);
 return {rect,scale:scale||1};
}
export function documentPoint(root:HTMLElement,point:{clientX:number;clientY:number;pressure?:number}){
 const {rect,scale}=documentGeometry(root);return {x:(point.clientX-rect.left)/scale,y:(point.clientY-rect.top)/scale,pressure:Number.isFinite(point.pressure)?Math.max(0,Math.min(1,point.pressure!)):.5};
}
export function documentInkLayout(root:HTMLElement):InkLayout{
 const {rect,scale}=documentGeometry(root),tops:Record<string,number>={};
 for(const row of root.querySelectorAll<HTMLElement>('[data-block]'))tops[row.dataset.block!]=(row.getBoundingClientRect().top-rect.top)/scale;
 return {width:Math.max(1,rect.width/scale),fontSize:parseFloat(getComputedStyle(root).getPropertyValue('--text-size'))||20,tops};
}
export function wordBoxes(root:HTMLElement,section:Section,granularity:'word'|'character'='word'):WordBox[]{
 const boxes:WordBox[]=[],{rect:origin,scale}=documentGeometry(root);
 for(const el of root.querySelectorAll<HTMLElement>('[data-text]')){
  const visible=el.getBoundingClientRect();if(visible.bottom< -80||visible.top>window.innerHeight+80)continue;
  const blockId=el.closest<HTMLElement>('[data-block]')?.dataset.block,block=section.blocks.find(b=>b.id===blockId);
  // A stale/foreign DOM must never create offsets in a different canonical text.
  if(!blockId||!block||el.textContent!==block.text)continue;
  const segments=granularity==='character'?Array.from(new Intl.Segmenter('de',{granularity:'grapheme'}).segment(block.text),part=>({start:part.index,text:part.segment})):Array.from(block.text.matchAll(/\S+/gu),match=>({start:match.index!,text:match[0]}));
  for(const part of segments){
   if(!part.text.trim())continue;
   const start=part.start,end=start+part.text.length,range=rangeWithin(el,start,end);if(!range)continue;
   for(const r of range.getClientRects())boxes.push({blockId,start,end,left:(r.left-origin.left)/scale,right:(r.right-origin.left)/scale,top:(r.top-origin.top)/scale,bottom:(r.bottom-origin.top)/scale});
  }
 }
 return boxes;
}
export function inkTargets(root:HTMLElement,section:Section,notes:{id:string;anchor:Anchor}[]):InkTarget[]{
 const {rect:origin,scale}=documentGeometry(root);
 return notes.flatMap(note=>{
  try{if(makeAnchor(section,note.anchor.startId,note.anchor.endId,note.anchor.startOffset,note.anchor.endOffset).quote!==note.anchor.quote||note.anchor.sectionId!==section.id)return [];}catch{return [];}
  const from=section.blocks.findIndex(b=>b.id===note.anchor.startId),to=section.blocks.findIndex(b=>b.id===note.anchor.endId),boxes:InkBox[]=[];
  for(const block of section.blocks.slice(from,to+1)){
   const el=root.querySelector<HTMLElement>(`[data-block="${CSS.escape(block.id)}"] [data-text]`);if(!el||el.textContent!==block.text)continue;
   const range=rangeWithin(el,block.id===note.anchor.startId?note.anchor.startOffset:0,block.id===note.anchor.endId?note.anchor.endOffset:block.text.length);if(!range)continue;
   for(const r of range.getClientRects())boxes.push({left:(r.left-origin.left)/scale,right:(r.right-origin.left)/scale,top:(r.top-origin.top)/scale,bottom:(r.bottom-origin.top)/scale});
  }
  return [{id:note.id,boxes}];
 });
}
