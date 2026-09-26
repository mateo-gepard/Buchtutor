import {ReaderApp} from '@/components/reader-app';
import {catalog,getBook} from '@/lib/corpus';
import {firstReadable} from '@/lib/reader-model';
import {aiStatus} from '@/lib/analysis';
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;
  const requested=typeof params.work==='string'?params.work:'iphigenie';
  const book=(await getBook(requested))??(await getBook('iphigenie'))!;
  const section=book.sections.find(s=>s.id===params.section)??firstReadable(book);
  const view=params.view==='notes'?'notes':params.view==='reader'||params.work&&params.view!=='library'?'reader':'library';
  return <ReaderApp initialBook={book} catalog={catalog} initialSection={section.id} initialView={view} explicitSection={typeof params.section==='string'} aiStatus={aiStatus()}/>;
}
