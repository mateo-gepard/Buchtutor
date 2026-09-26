import type {AnalysisMode,Anchor,Book} from './reader-model';
import {makeAnchor,validateAnchor} from './reader-model';
const letter=(s:string)=>/[\p{L}\p{N}]/u.test(s);
export function normalizeSelection(book:Book,value:Anchor,mode:AnalysisMode):Anchor{
  const checked=validateAnchor(book,value);
  const section=book.sections.find(s=>s.id===checked.sectionId)!;
  const textBlocks=section.blocks.filter(b=>b.kind==='verse'||b.kind==='prose');
  let first=textBlocks.findIndex(b=>b.id===checked.startId),last=textBlocks.findIndex(b=>b.id===checked.endId);
  let start=checked.startOffset,end=checked.endOffset;
  while(first<last){
    const t=textBlocks[first].text,tail=t.slice(start);
    const fragment=tail.trim().length<=3&&start>0&&letter(t[start-1]??'')&&letter(t[start]??'');
    if(!tail.trim()||fragment){first++;start=0;}else break;
  }
  while(last>first){
    const t=textBlocks[last].text,head=t.slice(0,end);
    const fragment=head.trim().length<=3&&end<t.length&&letter(t[end-1]??'')&&letter(t[end]??'');
    if(!head.trim()||fragment){last--;end=textBlocks[last].text.length;}else break;
  }
  const left=textBlocks[first],right=textBlocks[last];
  if(mode==='meter'&&left.kind==='verse'&&right.kind==='verse')return makeAnchor(section,left.id,right.id);
  while(start<left.text.length&&/\s/u.test(left.text[start]))start++;
  while(end>0&&/\s/u.test(right.text[end-1]))end--;
  // Extend partial words, but preserve complete short words and punctuation.
  while(start>0&&letter(left.text[start]??'')&&letter(left.text[start-1]??''))start--;
  while(end<right.text.length&&end>0&&letter(right.text[end]??'')&&letter(right.text[end-1]??''))end++;
  return makeAnchor(section,left.id,right.id,start,end);
}
export function questionIsClearlyOffTopic(question:string){
  return /(?:programmiere|implementiere|deploye|programmiercode|systemprompt|system prompt|ignore (?:all|previous)|ignoriere (?:alle|vorherige))|(?:schreib|erstell|generier|write|create|generate|build).{0,70}(?:python|javascript|typescript|sql|shell|script|skript|snake|videospiel|quellcode)|(?:passwort|api[- ]?key).{0,40}(?:zeige|verrat|ausgeb)/iu.test(question);
}
