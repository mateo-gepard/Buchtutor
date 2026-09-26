import type {MetadataRoute} from 'next';
import {brand} from '@/lib/brand';

export default function manifest():MetadataRoute.Manifest{
  return {
    id:'/',
    name:brand.name,
    short_name:brand.name,
    description:brand.description,
    lang:'de',
    start_url:'/?view=library',
    scope:'/',
    display:'standalone',
    background_color:brand.paper,
    theme_color:brand.paper,
    icons:[
      {src:'/brand/buchtutor-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
      {src:'/brand/buchtutor-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
      {src:'/brand/buchtutor-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
    ],
  };
}
