'use client';
import {useId} from 'react';
import {ArrowRight,BookOpen,Check,LoaderCircle,Save,Users} from 'lucide-react';
import type {Analysis,AnalysisMode,Anchor,Book,Section} from '@/lib/reader-model';
import {MODE_LABELS,referenceLabel} from '@/lib/reader-model';
export type AIStatus={live:boolean;provider:string;reasoning?:string;dailyLimit?:number;examples:{workId:string;anchor:Anchor;modes:AnalysisMode[]}[]};
type Props={book:Book;section:Section;selection:Anchor|null;analysis:Analysis|null;status:AIStatus;busy:boolean;error:string;question:string;setQuestion:(value:string)=>void;onAnalyze:(mode:AnalysisMode)=>void;onExample:()=>void;onFigures:()=>void;onNote:()=>void;onSave:()=>void;onQuote:(id:string)=>void;saving:boolean;saved:boolean;remaining?:number;normalized:boolean;onCancel:()=>void};
export function ReaderAssistant(p:Props){
  const id=useId();
  const modes:AnalysisMode[]=['summary','style',...(p.book.referenceMode==='verse'?['meter' as const]:[]),'context','conflict'];
  const example=p.status.examples.find(e=>e.workId===p.book.id);
  return <div className="help-panel">
    {!p.selection?<div className="help-empty"><BookOpen size={26} strokeWidth={1.5}/><h3>Eine Stelle auswählen</h3><p>Markiere Text oder tippe auf eine Versnummer. Danach kannst du die Stelle untersuchen oder eine Notiz anlegen.</p><button className="secondary-button" onClick={p.onFigures}><Users size={17}/>Figuren ansehen</button>{example&&<button className="text-button" onClick={p.onExample}>Beispielstelle öffnen<ArrowRight size={15}/></button>}</div>:<>
      <div className="selection-excerpt"><span>{referenceLabel(p.section,p.selection)}</span><blockquote>{p.selection.quote.length>260?p.selection.quote.slice(0,260)+' …':p.selection.quote}</blockquote></div>
      <div className="analysis-actions">{modes.map(mode=><button key={mode} disabled={p.busy} aria-pressed={p.analysis?.mode===mode} onClick={()=>p.onAnalyze(mode)}>{mode==='summary'?'Verstehen':mode==='style'?'Sprache':MODE_LABELS[mode]}</button>)}</div>
      {p.normalized&&<p className="small-note">Für die Analyse wurden Wort- oder Versgrenzen ergänzt. Oben steht die verwendete Auswahl.</p>}
      {!p.status.live&&<p className="availability-note">Vorbereitete Lesehilfen sind verfügbar. Die Live-KI wird noch eingerichtet.</p>}
      <form className="custom-question" onSubmit={e=>{e.preventDefault();p.onAnalyze('question');}}><label htmlFor={id}>Eigene Frage zur Stelle</label><div><input id={id} autoComplete="off" value={p.question} onChange={e=>p.setQuestion(e.target.value)} placeholder="Was bedeutet hier …?" maxLength={1200}/><button className="icon-button" type="submit" aria-label="Frage stellen" disabled={!p.question.trim()||p.busy}><ArrowRight size={18}/></button></div></form>
      <button className="text-button" onClick={p.onNote}>Eigene Notiz schreiben<ArrowRight size={15}/></button>
    </>}
    {p.busy&&<div className="analysis-loading" role="status"><LoaderCircle className="spin" size={20}/><span>Die Stelle wird untersucht.</span><button className="text-button" onClick={p.onCancel}>Abbrechen</button></div>}
    {p.error&&<p className="inline-error" role="alert">{p.error}</p>}
    {p.analysis&&!p.busy&&<section className="analysis-result" aria-label="Analyseergebnis">
      <div className="result-kicker">{MODE_LABELS[p.analysis.mode]}<span>{p.analysis.source==='prepared'?'Vorbereitet':p.analysis.source==='cache'?'Aus dem gemeinsamen Cache':'Neu erstellt'}</span></div>
      <h3>{p.analysis.title}</h3><p>{p.analysis.summary}</p>
      {p.analysis.question&&<p className="interpretation-note"><strong>Deine Frage:</strong> {p.analysis.question}</p>}
      {p.analysis.observations.map((observation,i)=><div className="observation" key={i}><h4>{observation.label}</h4><p>{observation.text}</p>{observation.quotes.map((quote,j)=><button className="evidence-quote" key={j} onClick={()=>p.onQuote(quote.blockId)}>„{quote.quote}“<ArrowRight size={14}/></button>)}</div>)}
      {p.analysis.uncertainty&&<p className="interpretation-note">{p.analysis.uncertainty}</p>}
      <p className="small-note">KI-Lesehilfe · Belege am Original prüfen.</p>
      <button className="primary-button" onClick={p.onSave} disabled={p.saving||p.saved}>{p.saved?<Check size={17}/>:<Save size={17}/>} {p.saved?'Gespeichert':'Mit Textstelle speichern'}</button>
    </section>}
    {p.remaining!==undefined&&<p className="quota-note">{p.remaining} neue KI-Anfragen heute übrig. Vorhandene Analysen zählen nicht mit.</p>}
  </div>;
}
