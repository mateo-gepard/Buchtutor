import {bookPagesPath,bookTabPath} from '@/lib/brand';

export function BrandMark(){
  return <svg className="brand-mark" width="36" height="27" viewBox="0 0 64 48" fill="none" aria-hidden="true" focusable="false">
    <path className="brand-tab" d={bookTabPath}/>
    <path d={bookPagesPath} fill="currentColor"/>
  </svg>;
}
