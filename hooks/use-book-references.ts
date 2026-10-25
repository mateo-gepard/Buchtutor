'use client';
import {useEffect,useState} from 'react';
import {loadBookReferenceIndex} from '@/lib/book-reference-client';
import type {BookReferenceIndex} from '@/lib/book-references';
import type {WorkMeta} from '@/lib/reader-model';

export function useBookReferences(catalog:WorkMeta[],workIds:string[]){
  const idsKey=[...new Set(workIds)].sort().join('\n');
  const [indexes,setIndexes]=useState<Record<string,BookReferenceIndex>>({});
  useEffect(()=>{
    const ids=new Set(idsKey.split('\n')),works=catalog.filter(work=>ids.has(work.id));
    if(!works.length)return;
    let current=true;
    void Promise.all(works.map(async work=>[work.id,await loadBookReferenceIndex(work)] as const)).then(values=>{
      if(current)setIndexes(previous=>{const next={...previous};for(const [id,index] of values)if(index)next[id]=index;return next;});
    });
    return()=>{current=false;};
  },[catalog,idsKey]);
  return indexes;
}
