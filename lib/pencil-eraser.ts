import type {Anchor,Section} from './reader-model';
import {segmentBoxDistance,segmentDistance,type PencilAnnotation,type Point,type WordBox} from './pencil-model';
import {projectedInk,type InkLayout,type PageInkGroup} from './page-handwriting';
export type HighlightRange={blockId:string;start:number;end:number};

// Keep the note's canonical context intact; only its visible highlight is cut.
export function highlightRanges(section:Section,anchor:Anchor,pencil?:PencilAnnotation):HighlightRange[]{
 const from=section.blocks.findIndex(b=>b.id===anchor.startId),to=section.blocks.findIndex(b=>b.id===anchor.endId);
 if(anchor.sectionId!==section.id||from<0||to<from)return [];
 const first=section.blocks[from],last=section.blocks[to];
 if(!['verse','prose'].includes(first.kind)||!['verse','prose'].includes(last.kind)||!Number.isInteger(anchor.startOffset)||!Number.isInteger(anchor.endOffset)||anchor.startOffset<0||anchor.startOffset>first.text.length||anchor.endOffset<0||anchor.endOffset>last.text.length||from===to&&anchor.endOffset<=anchor.startOffset)return [];
 return section.blocks.slice(from,to+1).flatMap(block=>{
  if(block.kind!=='verse'&&block.kind!=='prose')return [];
  let ranges=[{start:block.id===anchor.startId?anchor.startOffset:0,end:block.id===anchor.endId?anchor.endOffset:block.text.length}];
  for(const cut of pencil?.erasedRanges??[]){if(cut.blockId!==block.id)continue;ranges=ranges.flatMap(r=>cut.end<=r.start||cut.start>=r.end?[r]:[{start:r.start,end:Math.min(r.end,cut.start)},{start:Math.max(r.start,cut.end),end:r.end}].filter(r=>r.end>r.start));}
  return ranges.flatMap(r=>{const text=block.text.slice(r.start,r.end),leading=text.length-text.trimStart().length,trailing=text.length-text.trimEnd().length;return text.trim()?[{blockId:block.id,start:r.start+leading,end:r.end-trailing}]:[];});
 });
}
export function eraseHighlightedWords(section:Section,anchor:Anchor,pencil:PencilAnnotation,points:Point[],boxes:WordBox[],radius=2):PencilAnnotation{
 const visible=highlightRanges(section,anchor,pencil),blocks=new Map(section.blocks.map(block=>[block.id,block]));
 const hit=boxes.filter(box=>Number.isInteger(box.start)&&Number.isInteger(box.end)&&box.start>=0&&box.end>box.start&&box.end<=(blocks.get(box.blockId)?.text.length??0)&&visible.some(r=>r.blockId===box.blockId&&box.start<r.end&&box.end>r.start)&&points.some((p,i)=>segmentBoxDistance(i?points[i-1]:p,p,box)<=radius));
 if(!hit.length)return pencil;
 const ranges=[...(pencil.erasedRanges??[]),...hit.map(({blockId,start,end})=>({blockId,start,end}))].sort((a,b)=>a.blockId.localeCompare(b.blockId)||a.start-b.start);
 const merged:HighlightRange[]=[];
 for(const range of ranges){const last=merged.at(-1);if(last?.blockId===range.blockId&&range.start<=last.end)last.end=Math.max(last.end,range.end);else merged.push({...range});}
 return {...pencil,erasedRanges:merged};
}
export function erasePageLines(groups:PageInkGroup[],layout:InkLayout,points:Point[],radius=10):PageInkGroup[]{
 if(!points.length||!Number.isFinite(radius)||radius<0)return groups;
 let changed=false;
 const next=groups.flatMap(group=>{
  const projected=projectedInk(group,layout),keep=projected.map(stroke=>!stroke.some((p,i)=>points.some((q,j)=>segmentDistance(i?stroke[i-1]:p,p,j?points[j-1]:q,q)<=radius)));
  if(keep.every(Boolean))return [group];changed=true;
  // Erasing removes only the touched strokes. Rewriting survivors through the
  // current layout would discard their original frame and accumulate rounding.
  const strokes=group.strokes.filter((_,i)=>keep[i]);
  return strokes.length?[{...group,strokes}]:[];
 });
 return changed?next:groups;
}

type Interval=[number,number];
const epsilon=1e-7;
function intersect(a:Interval,b:Interval):Interval|null{const lo=Math.max(a[0],b[0]),hi=Math.min(a[1],b[1]);return hi-lo>epsilon?[lo,hi]:null;}
function linearBand(offset:number,delta:number,lo:number,hi:number):Interval|null{
 if(Math.abs(delta)<epsilon)return offset>=lo&&offset<=hi?[0,1]:null;
 return intersect([0,1],delta>0?[(lo-offset)/delta,(hi-offset)/delta]:[(hi-offset)/delta,(lo-offset)/delta]);
}
function diskCut(a:Point,b:Point,center:Point,radius:number):Interval|null{
 const dx=b.x-a.x,dy=b.y-a.y,x=a.x-center.x,y=a.y-center.y,A=dx*dx+dy*dy,B=2*(x*dx+y*dy),C=x*x+y*y-radius*radius;
 if(A<epsilon)return C<=0?[0,1]:null;
 const discriminant=B*B-4*A*C;if(discriminant<=0)return null;
 const root=Math.sqrt(discriminant);return intersect([0,1],[(-B-root)/(2*A),(-B+root)/(2*A)]);
}
function capsuleCuts(a:Point,b:Point,q:Point,r:Point,radius:number):Interval[]{
 if(Math.max(a.x,b.x)<Math.min(q.x,r.x)-radius||Math.min(a.x,b.x)>Math.max(q.x,r.x)+radius||Math.max(a.y,b.y)<Math.min(q.y,r.y)-radius||Math.min(a.y,b.y)>Math.max(q.y,r.y)+radius)return [];
 const cuts:Interval[]=[],dx=r.x-q.x,dy=r.y-q.y,length=dx*dx+dy*dy;
 for(const center of [q,r]){const cut=diskCut(a,b,center,radius);if(cut)cuts.push(cut);}
 if(length>epsilon){
  const strip=linearBand((a.x-q.x)*dy-(a.y-q.y)*dx,(b.x-a.x)*dy-(b.y-a.y)*dx,-radius*Math.sqrt(length),radius*Math.sqrt(length));
  const along=linearBand((a.x-q.x)*dx+(a.y-q.y)*dy,(b.x-a.x)*dx+(b.y-a.y)*dy,0,length);
  const cut=strip&&along?intersect(strip,along):null;if(cut)cuts.push(cut);
 }
 return cuts;
}
function mergedCuts(cuts:Interval[]){
 const result:Interval[]=[];for(const cut of cuts.sort((a,b)=>a[0]-b[0])){const last=result.at(-1);if(last&&cut[0]<=last[1]+epsilon)last[1]=Math.max(last[1],cut[1]);else result.push([...cut]);}return result;
}
/** Cut only the swept eraser capsule. Surviving original samples and their
 * group frame stay intact; interpolation creates only the cut boundaries. */
export function erasePagePrecisely(groups:PageInkGroup[],layout:InkLayout,points:Point[],radius=6):PageInkGroup[]{
 if(!points.length||!points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y))||!Number.isFinite(radius)||radius<=0)return groups;
 let changed=false;
 const next=groups.flatMap(group=>{
  const projected=projectedInk(group,layout);let groupChanged=false;
  const strokes=group.strokes.flatMap((stroke,index)=>{
   const visual=projected[index];
   if(visual.length===1){if(points.some((point,i)=>segmentDistance(visual[0],visual[0],i?points[i-1]:point,point)<=radius)){groupChanged=true;return [];}return [stroke];}
   let touched=false,part:typeof stroke.points=[];const parts:(typeof stroke.points)[]=[];
   const flush=()=>{if(part.length){parts.push(part);part=[];}};
   for(let i=1;i<visual.length;i++){
    const cuts=mergedCuts(points.flatMap((point,j)=>capsuleCuts(visual[i-1],visual[i],j?points[j-1]:point,point,radius)));
    const a=stroke.points[i-1],b=stroke.points[i];
    const at=(t:number)=>t<=epsilon?a:t>=1-epsilon?b:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,pressure:a.pressure+(b.pressure-a.pressure)*t};
    const keep=(lo:number,hi:number)=>{if(hi-lo<=epsilon)return;const start=at(lo),end=at(hi),last=part.at(-1);if(last&&(Math.abs(last.x-start.x)>epsilon||Math.abs(last.y-start.y)>epsilon))flush();if(!part.length)part.push(start);part.push(end);};
    let cursor=0;for(const cut of cuts){touched=true;keep(cursor,cut[0]);flush();cursor=cut[1];}keep(cursor,1);
   }
   flush();if(!touched)return [stroke];groupChanged=true;
   return parts.filter(part=>part.length>1).map(points=>({id:stroke.id.slice(0,55)+':cut:'+crypto.randomUUID(),order:stroke.order,points}));
  });
  if(!groupChanged)return [group];changed=true;return strokes.length?[{...group,strokes}]:[];
 });
 return changed?next:groups;
}
/** Deliberately conservative: ordinary loops, underlines and short letters must
 * remain handwriting. Destructive scribble recognition is a saved opt-in. */
export function isEraseScribble(points:Point[],fontSize=20){
 if(points.length<9)return false;
 const xs=points.map(point=>point.x),ys=points.map(point=>point.y);if(![...xs,...ys].every(Number.isFinite))return false;
 const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys),span=Math.max(width,height);
 if(span<fontSize||Math.min(width,height)<fontSize*.3||span>fontSize*14)return false;
 const horizontal=width>=height;let direction=0,turns=0,distance=0,lastTurn=horizontal?points[0].x:points[0].y;
 for(let i=1;i<points.length;i++){
  distance+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
  const coordinate=horizontal?points[i].x:points[i].y,delta=coordinate-lastTurn;
  if(Math.abs(delta)<span*.35)continue;const next=Math.sign(delta);if(direction&&next!==direction)turns++;direction=next;lastTurn=coordinate;
 }
 return turns>=4&&distance>=Math.hypot(width,height)*3.5;
}
