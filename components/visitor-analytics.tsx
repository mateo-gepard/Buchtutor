'use client';
import {useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import {Analytics} from '@vercel/analytics/react';
import {isPublicAnalyticsPath,sanitizeVisitorEvent} from '@/lib/visitor-privacy';

const subscribe=()=>()=>{};
const serverSnapshot=()=>false;
const allowsStatistics=()=>navigator.doNotTrack!=='1'&&(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl!==true;
export function VisitorAnalytics({enabled}:{enabled:boolean}){
  const allowed=useSyncExternalStore(subscribe,allowsStatistics,serverSnapshot);
  const path=usePathname();
  if(!enabled||!allowed||!path||!isPublicAnalyticsPath(path))return null;
  // Only pathname changes count. Reader query parameters and individual reading steps do not.
  return <Analytics framework="next" route={path} path={path} beforeSend={sanitizeVisitorEvent} debug={false}
    basePath={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH}
    configString={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG}/>;
}
