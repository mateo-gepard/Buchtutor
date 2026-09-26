import rawCatalog from '@/corpus/catalog.json';
import type {Book,WorkMeta} from './reader-model';
import {enrichBook} from './editorial';
export const catalog=rawCatalog as unknown as WorkMeta[];
const loaders:Record<string,()=>Promise<{default:unknown}>>={
 iphigenie:()=>import('@/corpus/books/iphigenie.json'),krug:()=>import('@/corpus/books/krug.json'),faust:()=>import('@/corpus/books/faust.json'),woyzeck:()=>import('@/corpus/books/woyzeck.json'),nathan:()=>import('@/corpus/books/nathan.json'),emilia:()=>import('@/corpus/books/emilia.json'),kabale:()=>import('@/corpus/books/kabale.json'),maria:()=>import('@/corpus/books/maria.json'),verwandlung:()=>import('@/corpus/books/verwandlung.json')
};
export async function getBook(id:string):Promise<Book|null>{const loader=Object.hasOwn(loaders,id)?loaders[id]:undefined;return loader?enrichBook((await loader()).default as Book):null;}
