import type {Metadata,Viewport} from 'next';
import {brand} from '@/lib/brand';
import {VisitorAnalytics} from '@/components/visitor-analytics';
import './globals.css';
import './reader.css';
export const metadata:Metadata={title:brand.name,applicationName:brand.name,description:brand.description,icons:{icon:{url:'/favicon.svg?v=buchtutor-1',type:'image/svg+xml'},apple:{url:'/apple-icon.png',sizes:'180x180',type:'image/png'}},appleWebApp:{capable:true,title:brand.name,statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#fafaf7'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="de" suppressHydrationWarning><body>{children}<VisitorAnalytics enabled={process.env.VERCEL_ENV==='production'}/></body></html>;}
