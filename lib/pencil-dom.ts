import type {Anchor,Section} from './reader-model';
import type {WordBox} from './pencil-model';
import type {InkBox,InkTarget} from './page-handwriting';
function rangeWithin(el:Element,start:number,end:number){
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),range=document.createRange();let node:Node|null,total=0,started=false;
 while((node=walker.nextNode())){const length=node.textContent?.length??0;if(!started&&start<=total+length){range.setStart(node,Math.max(0,start-total));started=true;}if(started&&end<=total+length){range.setEnd(node,Math.max(0,end-total));return range;}total+=length;}
 return null;
}
export function wordBoxes(root:HTMLElement):WordBox[]{
 const boxes:WordBox[]=[];
 for(const el of root.querySelectorAll<HTMLElement>('[data-text]')){
  const visible=el.getBoundingClientRect();if(visible.bottom< -80||visible.top>window.innerHeight+80)continue;
  const blockId=el.closest<HTMLElement>('[data-block]')?.dataset.block;if(!blockId)continue;
  for(const match of (el.textContent??'').matchAll(/\S+/gu)){
   const start=match.index!,end=start+match[0].length,range=rangeWithin(el,start,end);if(!range)continue;
   for(const r of range.getClientRects())boxes.push({blockId,start,end,left:r.left+window.scrollX,right:r.right+window.scrollX,top:r.top+window.scrollY,bottom:r.bottom+window.scrollY});
  }
 }
 return boxes;
}
export function inkTargets(root:HTMLElement,section:Section,notes:{id:string;anchor:Anchor}[]):InkTarget[]{
 const origin=root.getBoundingClientRect();
 return notes.map(note=>{
  const from=section.blocks.findIndex(b=>b.id===note.anchor.startId),to=section.blocks.findIndex(b=>b.id===note.anchor.endId),boxes:InkBox[]=[];
  for(const block of section.blocks.slice(from,to+1)){
   const el=document.getElementById(block.id)?.querySelector('[data-text]');if(!el)continue;
   const range=rangeWithin(el,block.id===note.anchor.startId?note.anchor.startOffset:0,block.id===note.anchor.endId?note.anchor.endOffset:block.text.length);if(!range)continue;
   for(const r of range.getClientRects())boxes.push({left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top});
  }
  return {id:note.id,boxes};
 });
}
