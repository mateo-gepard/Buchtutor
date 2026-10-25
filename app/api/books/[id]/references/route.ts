import {getBook} from '@/lib/corpus';
import {buildBookReferenceIndex} from '@/lib/book-references';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const book=await getBook((await params).id);
  return Response.json(book?buildBookReferenceIndex(book):{error:'Dieses Werk ist nicht in der Bibliothek.'},{status:book?200:404,headers:{'Cache-Control':'public, max-age=300'}});
}
