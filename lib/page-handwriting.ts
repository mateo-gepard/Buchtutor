import {z} from 'zod';
import type {InkPoint,InkStroke} from './pencil-model';
export type InkBox={left:number;right:number;top:number;bottom:number};
const point=z.object({x:z.number().finite().min(-10000).max(10000),y:z.number().finite().min(-10000).max(10000),pressure:z.number().min(0).max(1)});
export const pageInkGroupSchema=z.object({id:z.string().max(100),referenceId:z.string().max(200),width:z.number().positive().max(10000),fontSize:z.number().min(8).max(100),targetId:z.string().max(200).optional(),strokes:z.array(z.object({id:z.string().max(100),order:z.number().finite(),points:z.array(point).min(1).max(3000)})).min(1).max(1200)});
export type PageInkGroup=z.infer<typeof pageInkGroupSchema>;
export type InkLayout={width:number;fontSize:number;tops:Record<string,number>;minX?:number;maxX?:number};
export type InkTarget={id:string;boxes:InkBox[]};
export function inkBounds(points:Pick<InkPoint,'x'|'y'>[]):InkBox{
 return points.reduce((r,p)=>({left:Math.min(r.left,p.x),right:Math.max(r.right,p.x),top:Math.min(r.top,p.y),bottom:Math.max(r.bottom,p.y)}),{left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity});
}
export function boxDistance(a:InkBox,b:InkBox){return Math.hypot(Math.max(0,a.left-b.right,b.left-a.right),Math.max(0,a.top-b.bottom,b.top-a.bottom));}
function inkTransform(group:PageInkGroup,layout:InkLayout){
 const sx=layout.width/group.width,sy=layout.fontSize/group.fontSize,top=layout.tops[group.referenceId]??0;
 let scale=1,dx=0;
 if(layout.minX!==undefined&&layout.maxX!==undefined){
  const box=inkBounds(group.strokes.flatMap(s=>s.points.map(p=>({x:p.x*sx,y:p.y*sy})))),available=Math.max(1,layout.maxX-layout.minX);
  scale=Math.min(1,available/Math.max(1,box.right-box.left));
  const left=Math.max(layout.minX,Math.min(layout.maxX-(box.right-box.left)*scale,box.left));dx=left-box.left*scale;
 }
 return {sx:sx*scale,sy:sy*scale,dx,dy:top};
}
export function projectedInk(group:PageInkGroup,layout:InkLayout):InkStroke[]{
 const t=inkTransform(group,layout);return group.strokes.map(s=>s.points.map(p=>({x:p.x*t.sx+t.dx,y:p.y*t.sy+t.dy,pressure:p.pressure})));
}

export function nearestInkTarget(box:InkBox,targets:InkTarget[],threshold:number){
 const ranked=targets.map(t=>({id:t.id,distance:Math.min(...t.boxes.map(b=>boxDistance(box,b)))})).sort((a,b)=>a.distance-b.distance);
 return ranked[0]?.distance<=threshold?ranked[0].id:undefined;
}
export function linkInk(groups:PageInkGroup[],layout:InkLayout,targets:InkTarget[]){
 return groups.map(group=>{
  if(group.targetId&&targets.some(t=>t.id===group.targetId))return group;
  const first=projectedInk(group,layout)[0];
  return {...group,targetId:nearestInkTarget(inkBounds(first),targets,layout.fontSize*6)};
 });
}
export function addPageStroke(groups:PageInkGroup[],points:InkStroke,layout:InkLayout,targets:InkTarget[],referenceId:string,order=Date.now()):PageInkGroup[]{
 const box=inkBounds(points),margin=layout.fontSize*1.7;
 // Build connected handwriting from nearby strokes, even when a sentence extends
 // farther away from its initial mark. Never switch an established association.
 const matches=groups.map(group=>({group,distance:Math.min(...projectedInk(group,layout).map(stroke=>boxDistance(box,inkBounds(stroke))))})).filter(g=>g.distance<=margin).sort((a,b)=>a.distance-b.distance);
 const candidate=matches[0]?.group;
 if(candidate){
  const transform=inkTransform(candidate,layout);
  const stroke={id:crypto.randomUUID(),order,points:points.map(p=>({x:(p.x-transform.dx)/transform.sx,y:(p.y-transform.dy)/transform.sy,pressure:p.pressure}))};
  return linkInk(groups.map(g=>g.id===candidate.id?{...g,strokes:[...g.strokes,stroke]}:g),layout,targets);
 }
 const group:PageInkGroup={id:crypto.randomUUID(),referenceId,width:layout.width,fontSize:layout.fontSize,targetId:nearestInkTarget(box,targets,layout.fontSize*6),strokes:[{id:crypto.randomUUID(),order,points:points.map(p=>({...p,y:p.y-(layout.tops[referenceId]??0)}))}]};
 return [...groups,group];
}
export function croppedInk(strokes:InkStroke[]):{ink:InkStroke[];inkWidth:number;inkHeight:number}{
 const box=inkBounds(strokes.flat()),padding=18;
 const width=Math.max(40,box.right-box.left+padding*2),height=Math.max(40,box.bottom-box.top+padding*2);
 const scale=Math.min(2,1800/width,1000/height);
 return {ink:strokes.map(stroke=>stroke.map(p=>({x:(p.x-box.left+padding)*scale,y:(p.y-box.top+padding)*scale,pressure:p.pressure}))),inkWidth:Math.ceil(width*scale),inkHeight:Math.ceil(height*scale)};
}
export function combineInk(original:{ink:InkStroke[];inkWidth?:number;inkHeight?:number},added:ReturnType<typeof croppedInk>){
 if(!original.ink.length)return added;
 const offset=(original.inkHeight??320)+16,width=Math.max(original.inkWidth??1000,added.inkWidth),height=offset+added.inkHeight,scale=Math.min(1,1000/height,2000/width);
 return {ink:[...original.ink,...added.ink.map(s=>s.map(p=>({...p,y:p.y+offset})))].map(s=>s.map(p=>({...p,x:p.x*scale,y:p.y*scale}))),inkWidth:Math.ceil(width*scale),inkHeight:Math.ceil(height*scale)};
}
