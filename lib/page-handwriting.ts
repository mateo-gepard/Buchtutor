import {z} from 'zod';
import {pageInkGroupSchema,segmentBoxDistance,segmentDistance,type InkPoint,type InkStroke} from './pencil-model';
export {pageInkGroupSchema};
export type InkBox={left:number;right:number;top:number;bottom:number};
export type PageInkGroup=z.infer<typeof pageInkGroupSchema>;
// Every value is in unscaled document units, including stroke points and targets.
// Viewport pan/zoom belongs to the document surface, not to individual ink groups.
export type InkLayout={width:number;fontSize:number;tops:Record<string,number>;minX?:number;maxX?:number};
export type InkTarget={id:string;boxes:InkBox[]};
export function inkBounds(points:Pick<InkPoint,'x'|'y'>[]):InkBox{
 return points.reduce((r,p)=>({left:Math.min(r.left,p.x),right:Math.max(r.right,p.x),top:Math.min(r.top,p.y),bottom:Math.max(r.bottom,p.y)}),{left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity});
}
function validBox(box:InkBox){return [box.left,box.right,box.top,box.bottom].every(Number.isFinite)&&box.right>=box.left&&box.bottom>=box.top;}
export function boxDistance(a:InkBox,b:InkBox){return validBox(a)&&validBox(b)?Math.hypot(Math.max(0,a.left-b.right,b.left-a.right),Math.max(0,a.top-b.bottom,b.top-a.bottom)):Infinity;}
function inkTransform(group:PageInkGroup,layout:InkLayout){
 const sx=layout.width/group.width,sy=layout.fontSize/group.fontSize,top=layout.tops[group.referenceId]??0;
 return {sx,sy,dx:0,dy:top};
}
export function projectedInk(group:PageInkGroup,layout:InkLayout):InkStroke[]{
 const t=inkTransform(group,layout);return group.strokes.map(s=>s.points.map(p=>({x:p.x*t.sx+t.dx,y:p.y*t.sy+t.dy,pressure:p.pressure})));
}

/** Remove only strokes whose stable IDs are already durably committed. */
export function uncommittedPageInk(groups:PageInkGroup[],committedGroups:PageInkGroup[]):PageInkGroup[]{
 const committed=new Set(committedGroups.flatMap(group=>group.strokes.map(stroke=>stroke.id)));
 let changed=false;
 const remaining=groups.flatMap(group=>{
  const strokes=group.strokes.filter(stroke=>!committed.has(stroke.id));
  if(strokes.length===group.strokes.length)return [group];
  changed=true;return strokes.length?[{...group,strokes}]:[];
 });
 return changed?remaining:groups;
}

/** Merge replayed commits by stroke ID, preserving all original coordinate frames. */
export function mergePageInk(original:PageInkGroup[],added:PageInkGroup[]):PageInkGroup[]{
 const ids=new Set(original.flatMap(group=>group.strokes.map(stroke=>stroke.id))),merged=[...original];
 let changed=false;
 for(const group of added){
  const strokes=group.strokes.filter(stroke=>{if(ids.has(stroke.id))return false;ids.add(stroke.id);return true;});
  if(!strokes.length)continue;
  changed=true;
  const index=merged.findIndex(existing=>existing.id===group.id),existing=merged[index];
  if(existing&&existing.referenceId===group.referenceId&&existing.width===group.width&&existing.fontSize===group.fontSize){
   merged[index]={...existing,strokes:[...existing.strokes,...strokes]};continue;
  }
  if(!existing){merged.push(strokes.length===group.strokes.length?group:{...group,strokes});continue;}
  // Legacy erasing could rewrite a group's frame. Do not reinterpret incoming
  // originals in the saved frame when replaying such a branch.
  let suffix=1,id:string;
  do{id=`${group.id.slice(0,80)}:recovery-${suffix++}`;}while(merged.some(item=>item.id===id));
  merged.push({...group,id,strokes});
 }
 return changed?merged:original;
}

function nearestTarget(targets:InkTarget[],threshold:number,distance:(box:InkBox)=>number){
 if(!Number.isFinite(threshold)||threshold<0)return undefined;
 const scores=new Map<string,number>();
 for(const target of targets){
  const score=Math.min(...target.boxes.filter(box=>validBox(box)&&box.right>box.left&&box.bottom>box.top).map(distance));
  if(target.id&&Number.isFinite(score))scores.set(target.id,Math.min(scores.get(target.id)??Infinity,score));
 }
 const ranked=[...scores].map(([id,distance])=>({id,distance})).sort((a,b)=>a.distance-b.distance),first=ranked[0];
 if(!first||first.distance>threshold)return undefined;
 // Close or overlapping alternatives require an explicit choice. Array order
 // and annotation color must never decide which note receives original ink.
 if(ranked[1]&&ranked[1].distance-first.distance<=Math.min(8,threshold*.1))return undefined;
 return first.id;
}
export function nearestInkTarget(box:InkBox,targets:InkTarget[],threshold:number){
 return nearestTarget(targets,threshold,target=>boxDistance(box,target));
}
function strokeTarget(points:InkStroke,targets:InkTarget[],threshold:number){
 return nearestTarget(targets,threshold,box=>Math.min(...points.map((point,i)=>segmentBoxDistance(i?points[i-1]:point,point,box))));
}
export function linkInk(groups:PageInkGroup[],layout:InkLayout,targets:InkTarget[]){
 let changed=false;
 const linked=groups.map(group=>{
  // A missing target can be a transient render or a deleted mark. Keep the
  // established association; saving must verify that its target still exists.
  if(group.targetId)return group;
  const first=projectedInk(group,layout)[0];
  const targetId=first?strokeTarget(first,targets,layout.fontSize*6):undefined;
  if(!targetId)return group;
  changed=true;return {...group,targetId};
 });
 return changed?linked:groups;
}
function strokeDistance(a:InkStroke,b:InkStroke,limit:number){
 if(boxDistance(inkBounds(a),inkBounds(b))>limit)return Infinity;
 let nearest=Infinity;
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
  const p=i?a[i-1]:a[i],q=a[i],r=j?b[j-1]:b[j],s=b[j];
  // Most segments belong to other letters. Reject those cheaply, rather than
  // materializing the Cartesian product of all original pointer samples.
  if(Math.max(0,Math.min(p.x,q.x)-Math.max(r.x,s.x),Math.min(r.x,s.x)-Math.max(p.x,q.x),Math.min(p.y,q.y)-Math.max(r.y,s.y),Math.min(r.y,s.y)-Math.max(p.y,q.y))>Math.min(limit,nearest))continue;
  nearest=Math.min(nearest,segmentDistance(p,q,r,s));if(nearest===0)return 0;
 }
 return nearest;
}
export function addPageStroke(groups:PageInkGroup[],points:InkStroke,layout:InkLayout,targets:InkTarget[],referenceId:string,order=Date.now(),strokeId=crypto.randomUUID()):PageInkGroup[]{
 if(!points.length||groups.some(group=>group.strokes.some(stroke=>stroke.id===strokeId)))return groups;
 const margin=layout.fontSize*1.7,targetId=strokeTarget(points,targets,layout.fontSize*6);
 // Build connected handwriting from nearby strokes, even when a sentence extends
 // farther away from its initial mark. Never switch an established association.
 const matches=groups.filter(group=>group.strokes.length<1200&&(!targetId||!group.targetId||group.targetId===targetId)).map(group=>({group,distance:Math.min(...projectedInk(group,layout).map(stroke=>strokeDistance(stroke,points,margin)))})).filter(g=>g.distance<=margin).sort((a,b)=>a.distance-b.distance);
 const candidate=matches[0]&&(!matches[1]||matches[1].distance-matches[0].distance>layout.fontSize*.25)?matches[0].group:undefined;
 if(candidate){
  const transform=inkTransform(candidate,layout);
  const stroke={id:strokeId,order,points:points.map(p=>({x:(p.x-transform.dx)/transform.sx,y:(p.y-transform.dy)/transform.sy,pressure:p.pressure}))};
  return linkInk(groups.map(g=>g.id===candidate.id?{...g,strokes:[...g.strokes,stroke]}:g),layout,targets);
 }
 const group:PageInkGroup={id:crypto.randomUUID(),referenceId,width:layout.width,fontSize:layout.fontSize,targetId,strokes:[{id:strokeId,order,points:points.map(p=>({...p,y:p.y-(layout.tops[referenceId]??0)}))}]};
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
