import {Fragment} from 'react';

export function notebookSearchTerms(query:string){
 return [...new Set(query.trim().toLocaleLowerCase('de').split(/\s+/u).filter(Boolean))];
}
export function matchesNotebookQuery(text:string,terms:string[]){
 const value=text.toLocaleLowerCase('de');
 return terms.every(term=>value.includes(term));
}
function matcher(terms:string[]){
 return new RegExp(terms.map(term=>term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).sort((a,b)=>b.length-a.length).join('|'),'giu');
}
export function NotebookSearchText({text,query}:{text:string;query:string}){
 const terms=notebookSearchTerms(query);if(!terms.length)return text;
 const result:React.ReactNode[]=[];let cursor=0;
 for(const match of text.matchAll(matcher(terms))){
  const index=match.index!;result.push(<Fragment key={'text-'+cursor}>{text.slice(cursor,index)}</Fragment>,<mark key={'match-'+index}>{match[0]}</mark>);cursor=index+match[0].length;
 }
 result.push(<Fragment key={'text-'+cursor}>{text.slice(cursor)}</Fragment>);return result;
}
export function NotebookSearchPreview({text,query,label,onlyMatches=false}:{text:string;query:string;label?:string;onlyMatches?:boolean}){
 const terms=notebookSearchTerms(query),first=terms.length?matcher(terms).exec(text):null;
 if(onlyMatches&&terms.length&&!first)return null;
 const start=first?Math.max(0,first.index-65):0,end=Math.min(text.length,start+240);
 return <p className="notebook-search-preview">{label&&<small>{label}</small>}<span>{start>0?'… ':''}<NotebookSearchText text={text.slice(start,end)} query={query}/>{end<text.length?' …':''}</span></p>;
}
