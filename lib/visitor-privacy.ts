import type {BeforeSendEvent} from '@vercel/analytics';

const publicPaths=new Set(['/','/impressum','/datenschutz']);
export function isPublicAnalyticsPath(path:string){return publicPaths.has(path);}
export function sanitizeVisitorEvent(event:BeforeSendEvent):BeforeSendEvent|null{
  if(event.type!=='pageview')return null;
  try{
    const url=new URL(event.url);
    if(!['https:','http:'].includes(url.protocol)||!isPublicAnalyticsPath(url.pathname))return null;
    url.search='';url.hash='';url.username='';url.password='';
    return {type:'pageview',url:url.toString()};
  }catch{return null;}
}
