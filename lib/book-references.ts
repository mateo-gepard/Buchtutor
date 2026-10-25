import {unitLabel,type Anchor,type Book,type Unit,type WorkMeta} from './reader-model';

export type ReferenceRow=[id:string,number:number|null,numberEnd:number|null,unit:Unit|null];
export type ReferenceSection={id:string;title:string;path:string[];unit:Unit|null;blocks:ReferenceRow[]};
export type BookReferenceIndex={version:1;workId:string;editionId:string;revision:string;sections:ReferenceSection[]};
type ReferenceWork=Pick<WorkMeta,'id'|'editionId'|'revision'>;

/** Public labels and canonical numbers only: no source text or personal data. */
export function buildBookReferenceIndex(book:Book):BookReferenceIndex{
  return {version:1,workId:book.id,editionId:book.editionId,revision:book.revision,sections:book.sections.filter(section=>section.blocks.some(block=>block.kind==='verse'||block.kind==='prose')).map(section=>({id:section.id,title:section.title,path:section.path,unit:section.unit,blocks:section.blocks.filter(block=>block.kind==='verse'||block.kind==='prose').map(block=>[block.id,block.number??null,block.numberEnd??null,block.unit??section.unit??book.referenceMode])}))};
}

const unit=(value:unknown):value is Unit|null=>value===null||value==='verse'||value==='paragraph'||value==='textline';
const number=(value:unknown)=>value===null||typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const identifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=200;
export function matchesReferenceIndex(value:unknown,work:ReferenceWork):value is BookReferenceIndex{
  if(!value||typeof value!=='object')return false;
  const index=value as Partial<BookReferenceIndex>;
  if(index.version!==1||index.workId!==work.id||index.editionId!==work.editionId||index.revision!==work.revision||!Array.isArray(index.sections)||index.sections.length>2000)return false;
  return index.sections.every(section=>section&&identifier(section.id)&&typeof section.title==='string'&&section.title.length<=1000&&Array.isArray(section.path)&&section.path.length<=20&&section.path.every(part=>typeof part==='string'&&part.length<=1000)&&unit(section.unit)&&Array.isArray(section.blocks)&&section.blocks.length<=50000&&section.blocks.every(row=>Array.isArray(row)&&row.length===4&&identifier(row[0])&&number(row[1])&&number(row[2])&&unit(row[3])&&(row[1]===null||row[2]===null||row[2]>=row[1])));
}

export function referenceSectionLabel(section:Pick<ReferenceSection,'title'|'path'>){
  const seen=new Set<string>();
  return [...section.path,section.title].map(part=>part.trim()).filter(part=>{const key=part.toLocaleLowerCase('de');if(!key||seen.has(key))return false;seen.add(key);return true;}).join(' · ');
}

/** IDs locate rows; only the corpus-provided numbers become a citation. */
export function notebookReferenceLabel(work:ReferenceWork|undefined,index:BookReferenceIndex|undefined,editionId:string,anchor:Pick<Anchor,'sectionId'|'startId'|'endId'>|{sectionId:string}):string{
  if(work&&editionId!==work.editionId)return 'Andere Ausgabe · Originalzitat';
  if(!work||!index||index.workId!==work.id||index.editionId!==work.editionId||index.revision!==work.revision)return 'Textstelle';
  const section=index.sections.find(item=>item.id===anchor.sectionId);if(!section)return 'Textstelle';
  const label=referenceSectionLabel(section)||'Textstelle';
  if(!('startId' in anchor))return label;
  const startAt=section.blocks.findIndex(row=>row[0]===anchor.startId),endAt=section.blocks.findIndex(row=>row[0]===anchor.endId);
  if(startAt<0||endAt<startAt)return label;
  const start=section.blocks[startAt],end=section.blocks[endAt],last=end[2]??end[1];
  if(start[1]===null||last===null||last<start[1]||start[3]===null||start[3]!==end[3])return label;
  return `${label} · ${unitLabel(start[3]??section.unit,true)} ${start[1]}${last!==start[1]?`–${last}`:''}`;
}
