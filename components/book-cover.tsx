'use client';
import Image from 'next/image';
import {coverImage} from '@/lib/reader-art';
type Props={id:string;title:string;author:string;genre:string;year:number;priority?:boolean};
export function BookCover({id,title,author,priority=false}:Props){
  const image=coverImage(id);
  return <span className="book-cover">
    {image&&<Image className="cover-art" src={image} alt="" width={720} height={1080} unoptimized priority={priority} sizes="(max-width:600px) 42vw, (max-width:1000px) 26vw, 210px"/>}
    <span className="cover-type"><span className="cover-author">{author}</span><span className="cover-title">{title}</span></span>
  </span>;
}
