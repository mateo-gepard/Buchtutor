'use client';
import Image from 'next/image';
import {coverImage} from '@/lib/reader-art';
type Props={id:string;title:string;author:string;genre:string;year:number;priority?:boolean};
export function BookCover({id,title,author,priority=false}:Props){
  const image=coverImage(id);
  return <span className="book-cover">
    {image&&<Image className="cover-art" src={image} alt="" width={720} height={1080} unoptimized loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} sizes="(max-width:649px) 43vw, (max-width:999px) 29vw, (max-width:1299px) 22vw, 227px"/>}
    <span className="cover-type"><span className="cover-author">{author}</span><span className="cover-title">{title}</span></span>
  </span>;
}
