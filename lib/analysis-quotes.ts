import {ApiError} from './server';
type Block={blockId:string;text:string};
type Citation={blockId:string;quote:string};
// Only typography and whitespace are normalized. Words are never corrected or invented.
function mapped(text:string){
 let value='';const starts:number[]=[],ends:number[]=[];
 for(let i=0;i<text.length;i++){
  const char=/\s/u.test(text[i])?' ':text[i].replace(/[’‘ʼ]/gu,"'").replace(/[„“”]/gu,'"');
  if(char===' '&&value.endsWith(' ')){ends[ends.length-1]=i+1;continue;}
  value+=char;starts.push(i);ends.push(i+1);
 }
 return {value,starts,ends};
}
export function canonicalCitations(blocks:Block[],citation:Citation):Citation[]{
 const declared=blocks.find(b=>b.blockId===citation.blockId);
 if(declared?.text.includes(citation.quote))return [citation];
 const joined=blocks.map(b=>b.text).join('\n'),source=mapped(joined);
 const needle=mapped(citation.quote).value.trim();
 const at=needle.length>=2?source.value.indexOf(needle):-1;
 // An ambiguous correction is rejected; exact citations on the declared block were handled above.
 if(at<0||source.value.indexOf(needle,at+1)>=0)throw new ApiError('Ein Beleg stimmt nicht mit dem Original überein. Die Antwort wurde nicht übernommen.',502);
 const start=source.starts[at],end=source.ends[at+needle.length-1];
 const result:Citation[]=[];let offset=0;
 for(const b of blocks){
  const from=Math.max(0,start-offset),to=Math.min(b.text.length,end-offset);
  if(to>from){const quote=b.text.slice(from,to);if(quote.trim())result.push({blockId:b.blockId,quote});}
  offset+=b.text.length+1;
 }
 if(!result.length||result.length>4)throw new ApiError('Ein Beleg ist nicht eindeutig der Auswahl zuzuordnen.',502);
 return result;
}
