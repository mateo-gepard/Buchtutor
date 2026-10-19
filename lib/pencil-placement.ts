export type Dock='floating'|'top'|'bottom'|'left'|'right';
export type Placement={dock:Dock;x:number;y:number};
export type Rect={x:number;y:number;width:number;height:number};
export const PALETTE_POSITION_KEY='buchtutor-pencil-position-v1';
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(Math.max(min,max),n));
export function validPlacement(value:unknown):value is Placement{
 if(!value||typeof value!=='object')return false;const p=value as Placement;
 return ['floating','top','bottom','left','right'].includes(p.dock)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
}
export function palettePosition(p:Placement,size:{width:number;height:number},viewport:Rect):Rect{
 const roomX=Math.max(0,viewport.width-size.width),roomY=Math.max(0,viewport.height-size.height);
 return {width:size.width,height:size.height,x:viewport.x+(p.dock==='left'?0:p.dock==='right'?roomX:p.x*roomX),y:viewport.y+(p.dock==='top'?0:p.dock==='bottom'?roomY:p.y*roomY)};
}
export function placementAt(rect:Rect,viewport:Rect,dock:Dock='floating'):Placement{
 return {dock,x:clamp((rect.x-viewport.x)/Math.max(1,viewport.width-rect.width),0,1),y:clamp((rect.y-viewport.y)/Math.max(1,viewport.height-rect.height),0,1)};
}
export function nearestDock(rect:Rect,viewport:Rect,threshold=30):Dock{
 const edges:[Dock,number][]=[['left',Math.abs(rect.x-viewport.x)],['right',Math.abs(rect.x+rect.width-viewport.x-viewport.width)],['top',Math.abs(rect.y-viewport.y)],['bottom',Math.abs(rect.y+rect.height-viewport.y-viewport.height)]];
 edges.sort((a,b)=>a[1]-b[1]);return edges[0][1]<=threshold?edges[0][0]:'floating';
}
export function popoverPosition(bar:Rect,size:{width:number;height:number},viewport:Rect,dock:Dock):{x:number;y:number}{
 let x=bar.x+bar.width-size.width,y=bar.y-size.height-10;
 if(dock==='left'){x=bar.x+bar.width+10;y=bar.y;}
 else if(dock==='right'){x=bar.x-size.width-10;y=bar.y;}
 else if(dock==='top'||y<viewport.y&&bar.y+bar.height+10+size.height<=viewport.y+viewport.height)y=bar.y+bar.height+10;
 return {x:clamp(x,viewport.x,viewport.x+viewport.width-size.width),y:clamp(y,viewport.y,viewport.y+viewport.height-size.height)};
}
