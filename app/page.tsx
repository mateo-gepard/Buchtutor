import {ReaderApp} from '@/components/reader-app';
import {catalog,getBook} from '@/lib/corpus';
import {firstReadable} from '@/lib/reader-model';
import {aiStatus} from '@/lib/analysis';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {brand} from '@/lib/brand';
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{
  const params=await searchParams;
  if(typeof params.work!=='string'||params.view==='library'||params.view==='notes')return {};
  const work=catalog.find(item=>item.id===params.work);if(!work)return {};
  const title=work.title+' · '+brand.name,description=work.author+': '+work.title+'. '+brand.description;
  const url=new URL('/',brand.url);url.search=new URLSearchParams({work:work.id,view:'reader'}).toString();
  return {title,description,openGraph:{type:'website',locale:'de_DE',siteName:brand.name,title,description,url:url.href,images:[{url:brand.shareImage,width:1200,height:630,alt:'Buchtutor · '+work.title}]},twitter:{card:'summary_large_image',title,description,images:[brand.shareImage]}};
}
export default async function Home({searchParams}:Props){
  const params=await searchParams;
  const requested=typeof params.work==='string'?params.work:'iphigenie';
  const book=await getBook(requested);
  if(!book)notFound();
  const requestedSection=typeof params.section==='string'?book.sections.find(s=>s.id===params.section):undefined;
  if(typeof params.section==='string'&&!requestedSection)notFound();
  const section=requestedSection??firstReadable(book);
  const view=params.view==='notes'?'notes':params.view==='reader'||params.work&&params.view!=='library'?'reader':'library';
  return <ReaderApp initialBook={book} catalog={catalog} initialSection={section.id} initialView={view} explicitSection={typeof params.section==='string'} aiStatus={aiStatus()}/>;
}
