import {makeAnchor,type Anchor,type Section} from './reader-model';

/** Canonical UTF-16 offsets also span nested saved marks and character mentions. */
export function domTextRange(element:Element,start:number,end:number):Range|null{
  const walker=element.ownerDocument.createTreeWalker(element,NodeFilter.SHOW_TEXT),range=element.ownerDocument.createRange();
  let node:Node|null,total=0,started=false;
  while((node=walker.nextNode())){
    const length=node.textContent?.length??0;
    if(!started&&start<total+length){range.setStart(node,Math.max(0,start-total));started=true;}
    if(started&&end<=total+length){range.setEnd(node,Math.max(0,end-total));return range;}
    total+=length;
  }
  return null;
}

/** Compare DOM boundary points, including element (rather than text) endpoints. */
function comparePoints(document:Document,a:Node,ao:number,b:Node,bo:number){
  const left=document.createRange(),right=document.createRange();
  left.setStart(a,ao);left.collapse(true);
  right.setStart(b,bo);right.collapse(true);
  return left.compareBoundaryPoints(Range.START_TO_START,right);
}

/** Intersect a native selection with canonical text, never gutters or figure controls. */
export function readTextSelection(root:HTMLElement,section:Section,selection=root.ownerDocument.getSelection()):Anchor|null{
  if(!selection?.rangeCount||selection.isCollapsed)return null;
  const range=selection.getRangeAt(0),document=root.ownerDocument;
  if(document.activeElement?.matches('input,textarea,[contenteditable]:not([contenteditable="false"])'))return null;
  // A selection entirely outside the reader (including document-wide Select All) is not a passage.
  if(!root.contains(range.startContainer)&&!root.contains(range.endContainer))return null;
  const blocks=new Map(section.blocks.filter(b=>b.kind==='verse'||b.kind==='prose').map(b=>[b.id,b]));
  const parts:{id:string;start:number;end:number;text:string}[]=[];
  for(const element of root.querySelectorAll<HTMLElement>('[data-text]')){
    if(!range.intersectsNode(element))continue;
    const id=element.closest<HTMLElement>('[data-block]')?.dataset.block,block=id?blocks.get(id):undefined;
    if(!block||element.textContent!==block.text)continue;
    const clipped=document.createRange();clipped.selectNodeContents(element);
    const cmp=(a:Node,ao:number,b:Node,bo:number)=>comparePoints(document,a,ao,b,bo);
    // Merely touching the beginning/end of a line must not include that line.
    if(cmp(range.endContainer,range.endOffset,clipped.startContainer,clipped.startOffset)<=0||
      cmp(range.startContainer,range.startOffset,clipped.endContainer,clipped.endOffset)>=0)continue;
    if(cmp(range.startContainer,range.startOffset,clipped.startContainer,clipped.startOffset)>0)clipped.setStart(range.startContainer,range.startOffset);
    if(cmp(range.endContainer,range.endOffset,clipped.endContainer,clipped.endOffset)<0)clipped.setEnd(range.endContainer,range.endOffset);
    const prefix=document.createRange();prefix.selectNodeContents(element);prefix.setEnd(clipped.startContainer,clipped.startOffset);
    const start=prefix.toString().length,text=clipped.toString();
    if(text.length)parts.push({id:block.id,start,end:start+text.length,text});
  }
  while(parts.length&&!parts[0].text.trim())parts.shift();
  while(parts.length&&!parts.at(-1)!.text.trim())parts.pop();
  if(!parts.length)return null;
  const first=parts[0],last=parts.at(-1)!;
  return makeAnchor(section,first.id,last.id,first.start,last.end);
}

export function sameAnchor(a:Anchor|null,b:Anchor|null){
  return a===b||!!a&&!!b&&a.sectionId===b.sectionId&&a.startId===b.startId&&a.endId===b.endId&&a.startOffset===b.startOffset&&a.endOffset===b.endOffset&&a.quote===b.quote;
}
