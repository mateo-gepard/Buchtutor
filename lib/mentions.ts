import type {Character} from './reader-model';
// Role aliases are occurrence-specific: the same noun can identify different
// people in another passage. IDs belong to the pinned source edition.
const iphigeniePriestess=new Set(['b00058','b00068','b00207','b00232','b00448','b00568','b00580','b00688','b00936','b01079','b01381','b01419','b01426','b01634','b01858','b02058','b02066','b02123','b02345']);
const clerkLicht=new Set(['b00559','b00644','b02826','b02992','b03041','b03043','b03079','b03113','b03438']);
export function aliasesAt(characters:Character[],workId:string,blockId:string):Character[]{
 return characters.map(c=>({...c,aliases:c.aliases.filter(alias=>{
  if(workId==='iphigenie'&&alias==='Priesterin')return iphigeniePriestess.has(blockId);
  // Licht is also the common noun for light. Speaker headings remain clickable.
  if(workId==='krug'&&alias==='Licht')return clerkLicht.has(blockId);
  return true;
 })}));
}
