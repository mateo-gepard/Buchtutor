import {matchesReferenceIndex,type BookReferenceIndex} from './book-references';
import type {WorkMeta} from './reader-model';

const indexes=new Map<string,BookReferenceIndex>(),pending=new Map<string,Promise<BookReferenceIndex|null>>();
export function loadBookReferenceIndex(work:Pick<WorkMeta,'id'|'editionId'|'revision'>):Promise<BookReferenceIndex|null>{
  const key=JSON.stringify([work.id,work.editionId,work.revision]),cached=indexes.get(key);
  if(cached)return Promise.resolve(cached);
  const existing=pending.get(key);if(existing)return existing;
  const request=fetch(`/api/books/${encodeURIComponent(work.id)}/references?revision=${encodeURIComponent(work.revision)}`).then(async response=>{
    if(!response.ok)return null;
    const value:unknown=await response.json();
    if(!matchesReferenceIndex(value,work))return null;
    indexes.set(key,value);return value;
  }).catch(()=>null).finally(()=>pending.delete(key));
  pending.set(key,request);return request;
}
