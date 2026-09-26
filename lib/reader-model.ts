export type Unit = 'verse' | 'textline' | 'paragraph';
export type Block = { id: string; kind: 'verse'|'prose'|'stage'|'speaker'|'heading'|'trailer'; text: string; number?: number; numberEnd?: number; unit?: Unit; part?: string|null; group?: string|null; speaker?: string; page?: string };
export type Section = { id:string; title:string; path:string[]; kind:string; blocks:Block[]; firstRef:number|null; lastRef:number|null; unit:Unit|null; characters:string[] };
export type Character = { id:string; name:string; aliases:string[]; description:string; evidence:string; afterSection?:number; color?:string };
export type Relation = {type:string;active:string;passive:string;mutual:string[];description?:string;afterSection?:number};
export type WorkMeta = {id:string;title:string;author:string;year:number;epoch:string;genre:string;color:string;editionId:string;revision:string;sourceUrl:string;sourceLabel:string;sourceEdition:string;licenses:{name:string;url:string}[];referenceMode:Unit;schoolAligned:boolean;validation:{textBlocks:number;verseCount?:number;paragraphCount?:number;verseElements?:number;splitVersesChecked?:boolean;missingReferences?:number[];textExact:boolean;manualReview:boolean};note:string;curriculum:string};
export type Book = WorkMeta & {characters:Character[];relations:Relation[];sections:Section[];introduction?:string};
export type Anchor = {sectionId:string;startId:string;endId:string;startOffset:number;endOffset:number;quote:string};
export type AnalysisMode = 'summary'|'style'|'meter'|'context'|'conflict'|'question';
export type Analysis = {id:string;mode:AnalysisMode;title:string;summary:string;observations:{label:string;text:string;quotes:{blockId:string;quote:string}[]}[];uncertainty:string;source:'prepared'|'live'|'cache';model:string;generatedAt:string;promptVersion:string;anchor:Anchor;workId:string;editionId:string;question?:string};
export type SavedNote = {id:string;workId:string;editionId:string;anchor:Anchor;kind:AnalysisMode|'note'|'bookmark';body:string;analysis?:Analysis|null;createdAt:string;updatedAt:string;deletedAt?:string;conflictOf?:string};
export type ReadingProgress = {workId:string;editionId:string;sectionId:string;blockId:string;updatedAt:string};
export const MODE_LABELS: Record<AnalysisMode|string,string> = {summary:'Inhalt',style:'Stilmittel',meter:'Metrik',context:'Hintergrund',conflict:'Konflikt',question:'Eigene Frage',note:'Notiz',bookmark:'Lesezeichen'};
export const MODE_COLORS: Record<string,string> = {summary:'#d8e7f4',style:'#ecdef5',meter:'#d5ebdf',context:'#f3e5c9',conflict:'#f4ddd5',question:'#dee4f5',note:'#faeab4',bookmark:'#dce8e7'};
export function unitLabel(unit?:Unit|null,short=false) {return unit==='verse' ? (short?'V.':'Vers') : unit==='paragraph' ? (short?'Abs.':'Absatz') : (short?'Textz.':'Textzeile');}
export function referenceLabel(section:Section,anchor?:Anchor) {
  const blocks=section.blocks.filter(b=>b.number!==undefined);
  const start=anchor?section.blocks.find(b=>b.id===anchor.startId):blocks[0];
  const end=anchor?section.blocks.find(b=>b.id===anchor.endId):blocks.at(-1);
  if(!start?.number) return section.title;
  const last=end?.numberEnd??end?.number;
  return `${unitLabel(start.unit,true)} ${start.number}${last&&last!==start.number?`–${last}`:''}`;
}
export function makeAnchor(section:Section,startId:string,endId=startId,startOffset=0,endOffset?:number):Anchor {
  let a=section.blocks.findIndex(b=>b.id===startId),b=section.blocks.findIndex(b=>b.id===endId);
  if(a<0||b<0) throw new Error('Diese Textstelle ist nicht mehr verfügbar.');
  if(a>b){[a,b]=[b,a];[startId,endId]=[endId,startId];startOffset=0;endOffset=undefined;}
  const picked=section.blocks.slice(a,b+1).filter(x=>x.kind==='verse'||x.kind==='prose');
  if(!picked.length||picked[0].id!==startId||picked.at(-1)!.id!==endId) throw new Error('Bitte wähle Verse oder Absätze aus.');
  const end=endOffset??picked.at(-1)!.text.length;
  if(startOffset<0||end<0||startOffset>picked[0].text.length||end>picked.at(-1)!.text.length||(a===b&&end<=startOffset)) throw new Error('Ungültige Auswahl.');
  const quote=picked.map((block,i)=>block.text.slice(i===0?startOffset:0,i===picked.length-1?end:undefined)).join('\n');
  if(!quote.trim()) throw new Error('Die Auswahl ist leer.');
  return {sectionId:section.id,startId,endId,startOffset,endOffset:end,quote};
}
export function validateAnchor(book:Book,value:Anchor):Anchor {
  const section=book.sections.find(s=>s.id===value.sectionId);
  if(!section) throw new Error('Der Abschnitt gehört nicht zu dieser Ausgabe.');
  const canonical=makeAnchor(section,value.startId,value.endId,value.startOffset,value.endOffset);
  if(canonical.quote!==value.quote) throw new Error('Der ausgewählte Text stimmt nicht mit der Ausgabe überein.');
  return canonical;
}
export function firstReadable(book:Book) {return book.sections.find(s=>!s.title.toLowerCase().includes('vorbemerkung')&&s.blocks.some(b=>b.kind==='verse'||b.kind==='prose'))??book.sections[0];}
