import {z} from 'zod';
import {makeAnchor,type Anchor,type Section} from './reader-model';
export const pencilColors=['yellow','green','blue','pink','purple'] as const;
export type PencilColor=typeof pencilColors[number];
export const pencilPalette:Record<PencilColor,{name:string;fill:string;ink:string;meaning:string}>={
 yellow:{name:'Gelb',fill:'#fae6a0',ink:'#94710c',meaning:'Wichtige Stelle'},
 green:{name:'Grün',fill:'#bfe4c9',ink:'#247b48',meaning:'Stilmittel'},
 blue:{name:'Blau',fill:'#bfdbf3',ink:'#286ca0',meaning:'Interpretationsansatz'},
 pink:{name:'Rosa',fill:'#f5c6d5',ink:'#b54469',meaning:'Figuren & Beziehungen'},
 purple:{name:'Violett',fill:'#ddccf1',ink:'#7a4fa3',meaning:'Offene Frage'},
};
export const inkPointSchema=z.object({x:z.number().finite().min(0).max(2000),y:z.number().finite().min(0).max(1000),pressure:z.number().min(0).max(1)});
export const inkStrokeSchema=z.array(inkPointSchema).min(1).max(3000);
const pagePoint=z.object({x:z.number().finite().min(-10000).max(10000),y:z.number().finite().min(-10000).max(10000),pressure:z.number().min(0).max(1)});
export const pageInkGroupSchema=z.object({id:z.string().max(100),referenceId:z.string().max(200),width:z.number().positive().max(10000),fontSize:z.number().min(8).max(100),targetId:z.string().max(200).optional(),strokes:z.array(z.object({id:z.string().max(100),order:z.number().finite(),points:z.array(pagePoint).min(1).max(3000)})).min(1).max(1200)});
const erasedRangeSchema=z.object({blockId:z.string().min(1).max(200),start:z.number().int().min(0).max(1000000),end:z.number().int().min(1).max(1000000)}).refine(r=>r.end>r.start);
export const pencilAnnotationSchema=z.object({color:z.enum(pencilColors),meaning:z.string().min(1).max(80),ink:z.array(inkStrokeSchema).max(1200),inkWidth:z.number().int().min(1).max(2000).optional(),inkHeight:z.number().int().min(1).max(1000).optional(),pageInk:z.array(pageInkGroupSchema).max(100).optional(),erasedRanges:z.array(erasedRangeSchema).max(5000).optional(),uncertain:z.boolean().optional(),transcription:z.enum(['none','recognized','manual','pending','failed']).default('none'),transcript:z.string().max(6000).optional(),transcriptionError:z.string().max(300).optional()});
export type InkPoint=z.infer<typeof inkPointSchema>;
export type InkStroke=InkPoint[];
export type PencilAnnotation=z.infer<typeof pencilAnnotationSchema>;
export type Point={x:number;y:number};
export type WordBox={blockId:string;start:number;end:number;left:number;right:number;top:number;bottom:number};
type Rect=Pick<WordBox,'left'|'right'|'top'|'bottom'>;
const finitePoint=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const finiteRect=(box:Rect)=>[box.left,box.right,box.top,box.bottom].every(Number.isFinite)&&box.right>=box.left&&box.bottom>=box.top;
// Test every segment, not just pointer samples: fast Pencil sweeps must not skip words.
// Points and boxes must share a coordinate space; callers normalize CSS zoom first.
export function segmentHitsBox(a:Point,b:Point,box:Rect,tolerance=5){
 if(!finitePoint(a)||!finitePoint(b)||!finiteRect(box)||!Number.isFinite(tolerance)||tolerance<0)return false;
 let low=0,high=1;
 const dx=b.x-a.x,dy=b.y-a.y;
 for(const [p,q] of [[-dx,a.x-box.left],[dx,box.right-a.x],[-dy,a.y-box.top+tolerance],[dy,box.bottom+tolerance-a.y]]){
  if(p===0){if(q<0)return false;continue;}
  const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return false;
 }
 return true;
}
function pointDistance(p:Point,a:Point,b:Point){
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function segmentDistance(a:Point,b:Point,c:Point,d:Point){
 if(![a,b,c,d].every(finitePoint))return Infinity;
 const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y,det=dx*ey-dy*ex;
 if(Math.abs(det)>1e-9){const t=((c.x-a.x)*ey-(c.y-a.y)*ex)/det,u=((c.x-a.x)*dy-(c.y-a.y)*dx)/det;if(t>=0&&t<=1&&u>=0&&u<=1)return 0;}
 return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
}
export function segmentBoxDistance(a:Point,b:Point,box:Rect){
 if(!finitePoint(a)||!finitePoint(b)||!finiteRect(box))return Infinity;
 if(segmentHitsBox(a,b,box,0))return 0;
 const tl={x:box.left,y:box.top},tr={x:box.right,y:box.top},bl={x:box.left,y:box.bottom},br={x:box.right,y:box.bottom};
 return Math.min(segmentDistance(a,b,tl,tr),segmentDistance(a,b,tr,br),segmentDistance(a,b,br,bl),segmentDistance(a,b,bl,tl));
}
export function strokeAnchor(section:Section,points:Point[],boxes:WordBox[]):Anchor|null{
 if(!points.length||!points.every(finitePoint))return null;
 const indices=new Map(section.blocks.map((b,i)=>[b.id,i]));
 const valid=boxes.filter(box=>{
  const index=indices.get(box.blockId),block=index===undefined?undefined:section.blocks[index];
  return block&&(block.kind==='verse'||block.kind==='prose')&&Number.isInteger(box.start)&&Number.isInteger(box.end)&&box.start>=0&&box.end>box.start&&box.end<=block.text.length&&block.text.slice(box.start,box.end).trim()&&finiteRect(box)&&box.right>box.left&&box.bottom>box.top;
 });
 const hits:WordBox[]=[];
 for(let i=0;i<points.length;i++){
  const a=i?points[i-1]:points[i],b=points[i],near=valid.filter(box=>segmentHitsBox(a,b,box)).map(box=>({box,distance:segmentBoxDistance(a,b,box)})).sort((x,y)=>x.distance-y.distance);
  if(!near.length)continue;
  const direct=near.filter(hit=>hit.distance===0);
  if(direct.length){hits.push(...direct.map(hit=>hit.box));continue;}
  // Padding can bridge the gap between two wrapped lines. An equally near
  // line is ambiguous, rather than evidence for selecting both passages.
  const closest=near.filter(hit=>hit.distance<=near[0].distance+.5),first=closest[0].box;
  if(closest.some(({box})=>Math.abs(box.top-first.top)>1||Math.abs(box.bottom-first.bottom)>1))return null;
  hits.push(...closest.map(hit=>hit.box));
 }
 if(!hits.length)return null;
 hits.sort((a,b)=>(indices.get(a.blockId)!-indices.get(b.blockId)!)||a.start-b.start);
 const first=hits[0],last=hits.at(-1)!;
 return makeAnchor(section,first.blockId,last.blockId,first.start,last.end);
}
export function inkPath(stroke:InkStroke){
 if(!stroke.length)return '';
 let path=`M${stroke[0].x.toFixed(1)},${stroke[0].y.toFixed(1)}`;
 for(let i=1;i<stroke.length;i++){const previous=stroke[i-1],point=stroke[i];path+=` Q${previous.x.toFixed(1)},${previous.y.toFixed(1)} ${((previous.x+point.x)/2).toFixed(1)},${((previous.y+point.y)/2).toFixed(1)}`;}
 const last=stroke.at(-1)!;return path+` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
}
