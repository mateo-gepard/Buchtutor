'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export function StatsLogin(){
  const router=useRouter(),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function login(){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/admin/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const value=await response.json();if(!response.ok)throw new Error(value.error??'Anmeldung fehlgeschlagen.');
      setPassword('');router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'Die Anmeldung ist gerade nicht möglich.');}finally{setBusy(false);}
  }
  return <form className="stats-login" onSubmit={e=>{e.preventDefault();void login();}}>
    <label className="field-label" htmlFor="stats-password">Betreiberpasswort</label>
    <input className="text-input" id="stats-password" type="password" autoComplete="current-password" required maxLength={300} value={password} onChange={e=>setPassword(e.target.value)}/>
    {error&&<p role="alert" className="inline-error">{error}</p>}
    <button className="primary-button" disabled={busy}>{busy?'Anmelden …':'Statistik öffnen'}</button>
  </form>;
}
export function StatsLogout(){
  const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  return <div><button className="secondary-button" disabled={busy} onClick={async()=>{setBusy(true);setError(false);try{const r=await fetch('/api/admin/session',{method:'DELETE'});if(!r.ok)throw new Error();router.refresh();}catch{setError(true);}finally{setBusy(false);}}}>Abmelden</button>{error&&<p role="alert">Abmelden gerade nicht möglich.</p>}</div>;
}
