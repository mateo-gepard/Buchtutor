'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {getLocalState,getServerLocalState,initializeLocal,subscribeLocal} from '@/lib/local-storage';
export function useLocalReader(){
  const state=useSyncExternalStore(subscribeLocal,getLocalState,getServerLocalState);
  useEffect(()=>{void initializeLocal();},[]);
  return state;
}
