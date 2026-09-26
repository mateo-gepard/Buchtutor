export function readerShareUrl(origin:string,workId:string,sectionId:string,blockId?:string){
  const url=new URL('/',origin);
  url.search=new URLSearchParams({work:workId,section:sectionId,view:'reader'}).toString();
  url.hash=blockId??'';
  return url.href;
}

export function socialShareLinks(url:string,title:string){
  const text=title+' · Buchtutor';
  return [
    {name:'WhatsApp',href:'https://wa.me/?'+new URLSearchParams({text:text+'\n'+url})},
    {name:'Telegram',href:'https://t.me/share/url?'+new URLSearchParams({url,text})},
    {name:'Facebook',href:'https://www.facebook.com/sharer/sharer.php?'+new URLSearchParams({u:url})},
    {name:'E-Mail',href:'mailto:?'+new URLSearchParams({subject:text,body:text+'\n\n'+url}).toString().replaceAll('+','%20')},
  ];
}
