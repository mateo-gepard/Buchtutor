'use client';
import {useEffect,useLayoutEffect,useRef} from 'react';
type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:Record<string,unknown>)=>Promise<unknown>};
type Context={registerTool:(tool:Tool,options?:{signal:AbortSignal})=>Promise<void>|void;unregisterTool?:(name:string)=>void};
export function useReaderTools(handlers:{read:()=>unknown;open:(input:Record<string,unknown>)=>Promise<unknown>;select:(input:Record<string,unknown>)=>unknown}){
 const latest=useRef(handlers);
 useLayoutEffect(()=>{latest.current=handlers},[handlers]);
 useEffect(()=>{
  const context=(document as Document&{modelContext?:Context}).modelContext??(navigator as Navigator&{modelContext?:Context}).modelContext;if(!context)return;
  const lifecycle=new AbortController();
  const tools:Tool[]=[
   {name:'get_reading_state',description:'Read the current Buchtutor work, section, public text blocks and selected passage. No private notes are returned.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async()=>latest.current.read()},
   {name:'open_section',description:'Open a work and section in the reader using an ID from the library or reading state. Updates the visible reader and local reading progress on this device.',inputSchema:{type:'object',properties:{workId:{type:'string'},sectionId:{type:'string'}},required:['workId','sectionId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async input=>latest.current.open(input)},
   {name:'select_passage',description:'Select exact public-text blocks in a section of the currently open work, using IDs from get_reading_state. This only changes the selection; it does not generate or save an analysis.',inputSchema:{type:'object',properties:{sectionId:{type:'string'},startId:{type:'string'},endId:{type:'string'},startOffset:{type:'integer',minimum:0},endOffset:{type:'integer',minimum:0}},required:['sectionId','startId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async input=>latest.current.select(input)}
  ];
  for(const tool of tools)Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});
  return()=>{lifecycle.abort();if(context.unregisterTool)for(const tool of tools)try{context.unregisterTool(tool.name)}catch{}};
 },[]);
}
