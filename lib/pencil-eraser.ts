import type {Anchor,Section} from './reader-model';
import {segmentHitsBox,type PencilAnnotation,type Point,type WordBox} from './pencil-model';
import {projectedInk,type InkLayout,type PageInkGroup} from './page-handwriting';
export type HighlightRange={blockId:string;start:number;end:number};

// Keep the note's canonical context intact; only its visible highlight is cut.
export function highlightRanges(section:Section,anchor:Anchor,pencil?:PencilAnnotation):HighlightRange[]{
 const from=section.blocks.findIndex(b=>b.id===anchor.startId),to=section.blocks.findIndex(b=>b.id===anchor.endId);
 if(from<0||to<from)return [];
 return section.blocks.slice(from,to+1).flatMap(block=>{
  if(block.kind!=='verse'&&block.kind!=='prose')return [];
  let ranges=[{start:block.id===anchor.startId?anchor.startOffset:0,end:block.id===anchor.endId?anchor.endOffset:block.text.length}];
  for(const cut of pencil?.erasedRanges??[]){if(cut.blockId!==block.id)continue;ranges=ranges.flatMap(r=>cut.end<=r.start||cut.start>=r.end?[r]:[{start:r.start,end:Math.min(r.end,cut.start)},{start:Math.max(r.start,cut.end),end:r.end}].filter(r=>r.end>r.start));}
  return ranges.flatMap(r=>{const text=block.text.slice(r.start,r.end),leading=text.length-text.trimStart().length,trailing=text.length-text.trimEnd().length;return text.trim()?[{blockId:block.id,start:r.start+leading,end:r.end-trailing}]:[];});
 });
}
export function eraseHighlightedWords(section:Section,anchor:Anchor,pencil:PencilAnnotation,points:Point[],boxes:WordBox[]):PencilAnnotation{
 const visible=highlightRanges(section,anchor,pencil);
 const hit=boxes.filter(box=>visible.some(r=>r.blockId===box.blockId&&box.start<r.end&&box.end>r.start)&&points.some((p,i)=>segmentHitsBox(i?points[i-1]:p,p,box,2)));
 if(!hit.length)return pencil;
 const ranges=[...(pencil.erasedRanges??[]),...hit.map(({blockId,start,end})=>({blockId,start,end}))].sort((a,b)=>a.blockId.localeCompare(b.blockId)||a.start-b.start);
 const merged:HighlightRange[]=[];
 for(const range of ranges){const last=merged.at(-1);if(last?.blockId===range.blockId&&range.start<=last.end+1)last.end=Math.max(last.end,range.end);else merged.push({...range});}
 return {...pencil,erasedRanges:merged};
}
function pointDistance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
function near(a:Point,b:Point,c:Point,d:Point,radius:number){
 const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y,det=dx*ey-dy*ex;
 if(Math.abs(det)>1e-9){const t=((c.x-a.x)*ey-(c.y-a.y)*ex)/det,u=((c.x-a.x)*dy-(c.y-a.y)*dx)/det;if(t>=0&&t<=1&&u>=0&&u<=1)return true;}
 return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b))<=radius;
}
export function erasePageLines(groups:PageInkGroup[],layout:InkLayout,points:Point[],radius=10):PageInkGroup[]{
 let changed=false;
 const next=groups.flatMap(group=>{
  const projected=projectedInk(group,layout),keep=projected.map(stroke=>!stroke.some((p,i)=>points.some((q,j)=>near(i?stroke[i-1]:p,p,j?points[j-1]:q,q,radius))));
  if(keep.every(Boolean))return [group];changed=true;
  const top=layout.tops[group.referenceId]??0;
  const strokes=group.strokes.flatMap((stroke,i)=>keep[i]?[{...stroke,points:projected[i].map(p=>({...p,y:p.y-top}))}]:[]);
  return strokes.length?[{...group,width:layout.width,fontSize:layout.fontSize,strokes}]:[];
 });
 return changed?next:groups;
}
