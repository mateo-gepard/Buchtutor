'use client';
import {useState} from 'react';
import {Download,Upload,LoaderCircle,Check} from 'lucide-react';
import {decryptSnapshot,downloadFile,encryptSnapshot} from '@/lib/portable';
import {importLocal} from '@/lib/local-storage';
import type {LocalSnapshot} from '@/lib/local-model';

export function ReaderTransfer({data,onDone}:{data:LocalSnapshot;onDone:(message:string)=>void}){
  const [tab,setTab]=useState<'export'|'import'>('export'),[password,setPassword]=useState(''),[repeat,setRepeat]=useState('');
  const [file,setFile]=useState<File|null>(null),[incoming,setIncoming]=useState<LocalSnapshot|null>(null),[preferences,setPreferences]=useState(true);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  async function exportData(){
    setError('');setSuccess('');
    if(password!==repeat){setError('Die Passwörter stimmen nicht überein.');return;}
    setBusy(true);
    try{
      const encrypted=await encryptSnapshot(data,password);
      downloadFile(new Blob([encrypted.slice().buffer as ArrayBuffer],{type:'application/octet-stream'}),'Buchtutor-'+new Date().toISOString().slice(0,10)+'.buchtutor');
      setSuccess('Sicherung erstellt. Übertrage die Datei auf dein anderes Gerät und öffne dort „Importieren“.');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function checkFile(){
    if(!file)return;setError('');setSuccess('');setBusy(true);setIncoming(null);
    try{
      if(file.size>12*1024*1024)throw new Error('Die Datei ist größer als 12 MB.');
      setIncoming(await decryptSnapshot(new Uint8Array(await file.arrayBuffer()),password));
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function applyImport(){
    if(!incoming)return;setBusy(true);setError('');
    try{
      const conflicts=await importLocal(incoming,preferences);
      setIncoming(null);setPassword('');setFile(null);
      const message=conflicts?`Übertragen. ${conflicts} abweichende Notizen wurden als Konfliktkopien erhalten.`:'Lesedaten wurden auf dieses Gerät übertragen.';
      setSuccess(message);onDone(message);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="transfer-panel"><div className="segmented-control" role="group" aria-label="Übertragungsrichtung">{[['export','Exportieren'],['import','Importieren']].map(([value,label])=><button key={value} aria-pressed={tab===value} onClick={()=>{setTab(value as 'export'|'import');setIncoming(null);setError('');setSuccess('');setPassword('');setRepeat('');}}>{label}</button>)}</div>
    <p>Lesestand, Einstellungen, Markierungen, Notizen und gespeicherte Analysen werden in einer verschlüsselten Datei übertragen. Die Datei wird hier auf deinem Gerät verarbeitet.</p>
    {tab==='export'?<form onSubmit={e=>{e.preventDefault();void exportData();}}>
      <label className="field-label" htmlFor="export-password">Passwort für die Sicherung</label><input id="export-password" className="text-input" type="password" minLength={12} maxLength={300} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mindestens 12 Zeichen" required/>
      <label className="field-label" htmlFor="export-repeat">Passwort wiederholen</label><input id="export-repeat" className="text-input" type="password" autoComplete="new-password" maxLength={300} value={repeat} onChange={e=>setRepeat(e.target.value)} required/>
      <p className="small-note">Du brauchst die Datei und das Passwort auf dem anderen Gerät. Ein vergessenes Passwort können wir nicht zurücksetzen.</p>
      <button className="primary-button" disabled={busy||!password||!repeat}>{busy?<LoaderCircle size={18} className="spin"/>:<Download size={18}/>}Sicherung herunterladen</button>
    </form>:<form onSubmit={e=>{e.preventDefault();void checkFile();}}>
      <label className="field-label" htmlFor="import-file">Sicherungsdatei</label><input id="import-file" className="file-input" type="file" accept=".buchtutor,.leseraum" onChange={e=>{setFile(e.target.files?.[0]??null);setIncoming(null);setError('');}}/>
      <label className="field-label" htmlFor="import-password">Passwort der Sicherung</label><input id="import-password" className="text-input" type="password" maxLength={300} autoComplete="off" value={password} onChange={e=>{setPassword(e.target.value);setIncoming(null);}}/>
      <button className="secondary-button" disabled={busy||!file||!password}>{busy?<LoaderCircle size={18} className="spin"/>:<Upload size={18}/>}Datei prüfen</button>
    </form>}
    {incoming&&<div className="import-preview"><h3>Bereit zum Übertragen</h3><p>{incoming.notes.filter(n=>!n.deletedAt).length} gespeicherte Einträge · {incoming.progress.length} Lesestände</p><p>Vorhandene Einträge bleiben erhalten. Abweichende Notizen werden als Konfliktkopien übernommen; neuere Löschungen werden berücksichtigt.</p><label className="checkbox-label"><input type="checkbox" checked={preferences} onChange={e=>setPreferences(e.target.checked)}/>Neuere Leseeinstellungen übernehmen</label><button className="primary-button" onClick={()=>void applyImport()} disabled={busy}><Check size={17}/>Auf dieses Gerät übernehmen</button></div>}
    {error&&<p className="inline-error" role="alert">{error}</p>}{success&&<p className="success-note" role="status">{success}</p>}
    <p className="small-note">Dies ist eine manuelle Übertragung. Ein kurzer Code allein kann eine große Notizensammlung nicht enthalten. Löscht du die Browserdaten, benötigst du eine Sicherung.</p>
  </div>;
}
