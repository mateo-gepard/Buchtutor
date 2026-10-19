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
export const inkPointSchema=z.object({x:z.number().finite().min(0).max(1000),y:z.number().finite().min(0).max(320),pressure:z.number().min(0).max(1)});
export const inkStrokeSchema=z.array(inkPointSchema).min(1).max(3000);
export const pencilAnnotationSchema=z.object({color:z.enum(pencilColors),meaning:z.string().min(1).max(80),ink:z.array(inkStrokeSchema).max(200),uncertain:z.boolean().optional(),transcription:z.enum(['none','recognized','manual','pending']).default('none')});
export type InkPoint=z.infer<typeof inkPointSchema>;
export type InkStroke=InkPoint[];
export type PencilAnnotation=z.infer<typeof pencilAnnotationSchema>;
export type Point={x:number;y:number};
export type WordBox={blockId:string;start:number;end:number;left:number;right:number;top:number;bottom:number};
// Test every segment, not just pointer samples: fast Pencil sweeps must not skip words.
export function segmentHitsBox(a:Point,b:Point,box:WordBox,tolerance=5){
 let low=0,high=1;
 const dx=b.x-a.x,dy=b.y-a.y;
 for(const [p,q] of [[-dx,a.x-box.left],[dx,box.right-a.x],[-dy,a.y-box.top+tolerance],[dy,box.bottom+tolerance-a.y]]){
  if(p===0){if(q<0)return false;continue;}
  const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return false;
 }
 return true;
}
export function strokeAnchor(section:Section,points:Point[],boxes:WordBox[]):Anchor|null{
 if(!points.length)return null;
 const hits=boxes.filter(box=>points.some((p,i)=>segmentHitsBox(i?points[i-1]:p,p,box)));
 if(!hits.length)return null;
 const indices=new Map(section.blocks.map((b,i)=>[b.id,i]));
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
