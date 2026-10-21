import type {Anchor} from './reader-model';
import {sameAnchor} from './dom-selection';

/** Separate passages retain canonical offsets; they are never joined over omitted text. */
export function addPassage(passages:readonly Anchor[],anchor:Anchor){
 return passages.some(item=>sameAnchor(item,anchor))?[...passages]:[...passages,anchor];
}
export function toggleSelected(ids:readonly string[],id:string){return ids.includes(id)?ids.filter(value=>value!==id):[...ids,id];}
