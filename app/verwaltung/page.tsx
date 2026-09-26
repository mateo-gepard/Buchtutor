import type {Metadata} from 'next';
import Link from 'next/link';
import {cookies} from 'next/headers';
import {BrandMark} from '@/components/brand-mark';
import {StatsLogin,StatsLogout} from '@/components/stats-access';
import {statsAuthConfigured,STATS_COOKIE,validStatsSession} from '@/lib/stats-auth';
import {readUsage} from '@/lib/usage-stats';
import './stats.css';

export const metadata:Metadata={title:'Statistik · Buchtutor',robots:{index:false,follow:false}};
const visitorsUrl='https://vercel.com/mateos-projects-c394726f/leseraum/analytics?environment=production';
const count=(value:number)=>new Intl.NumberFormat('de-DE').format(value);
const money=(nano:number)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:6}).format(nano/1e9);
const dateLabel=(date:string)=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));

export default async function Statistics({searchParams}:{searchParams:Promise<{tage?:string|string[]}>}){
  const authorized=validStatsSession((await cookies()).get(STATS_COOKIE)?.value);
  const params=await searchParams;
  const days=params.tage==='7'?7:params.tage==='90'?90:30;
  let report:Awaited<ReturnType<typeof readUsage>>|undefined;
  if(authorized){try{report=await readUsage(days);}catch{/* Do not render missing statistics as zero. */}}
  const totals=report?.totals,recorded=report?.rows.some(row=>row.recorded);
  const maxCost=report?Math.max(1,...report.rows.map(row=>row.costNanoUsd)):1;
  return <main className="stats-page">
    <header className="stats-header"><Link href="/?view=library" className="stats-brand"><BrandMark/><span>Buchtutor</span></Link>{authorized&&<StatsLogout/>}</header>
    {!authorized?<section className="stats-access"><h1>Statistik</h1><p>Zugang für den Betreiber.</p>{statsAuthConfigured()?<StatsLogin/>:<p role="status">Der Statistikzugang ist noch nicht eingerichtet.</p>}</section>:<>
      <div className="stats-heading"><div><h1>KI-Verbrauch</h1><p>Neue Antworten, vorhandene Lesehilfen und gemeldete Kosten.</p></div><a className="secondary-button" href={visitorsUrl} target="_blank" rel="noreferrer">Besucher in Vercel ↗</a></div>
      <nav className="stats-periods" aria-label="Zeitraum">{[7,30,90].map(n=><Link key={n} href={'/verwaltung?tage='+n} aria-current={n===days?'page':undefined} prefetch={false}>{n} Tage</Link>)}<a className="stats-refresh" href={'/verwaltung?tage='+days}>Aktualisieren</a></nav>
      {!report||!totals?<p className="stats-notice" role="alert">Die Statistik ist gerade nicht erreichbar. Es werden keine Ersatzwerte angezeigt. Bitte lade die Seite später erneut.</p>:<>
        {!recorded&&<p className="stats-notice">Noch keine Anfragen erfasst. Die Erfassung beginnt mit dieser Version; frühere Anfragen werden nicht rückwirkend ergänzt.</p>}
        <dl className="stats-cards">
          <div><dt>Gemeldete Kosten</dt><dd>{money(totals.costNanoUsd)}</dd><p>{totals.unknownCosts?`${count(totals.unknownCosts)} Aufrufe ohne Kostenangabe`:'Laut OpenRouter-Abrechnung'}</p></div>
          <div><dt>Neue KI-Aufrufe</dt><dd>{count(totals.providerRequests)}</dd><p>{count(totals.successful)} beantwortet · {count(totals.failed)} fehlgeschlagen</p></div>
          <div><dt>Vorhandene Lesehilfen</dt><dd>{count(totals.cacheHits+totals.preparedHits)}</dd><p>{count(totals.cacheHits)} aus Cache · {count(totals.preparedHits)} vorbereitet</p></div>
        </dl>
        {totals.unknownCosts>0&&<p className="stats-notice">Bei {count(totals.unknownCosts)} Modellaufrufen fehlt der Abrechnungswert, etwa nach einem Verbindungsabbruch. Die angezeigte Summe kann deshalb niedriger als die tatsächlichen Kosten sein.</p>}
        <section className="stats-section" aria-labelledby="tokens-heading"><h2 id="tokens-heading">Tokens und Anfragegrenzen</h2><dl className="stats-details">
          <div><dt>Eingabe-Tokens</dt><dd>{count(totals.inputTokens)}</dd></div>
          <div><dt>Ausgabe-Tokens</dt><dd>{count(totals.outputTokens)}</dd></div>
          <div><dt>Davon Reasoning</dt><dd>{count(totals.reasoningTokens)}</dd></div>
          <div><dt>Durch Limits gestoppt</dt><dd>{count(totals.rateLimited)}</dd></div>
        </dl><p className="stats-caption">Tokenwerte liegen für {count(totals.tokenReports)} von {count(totals.providerRequests)} Modellaufrufen vor. Reasoning ist bereits in den Ausgabe-Tokens enthalten. {count(totals.rejected)} Anfragen wurden vor einem Modellaufruf abgewiesen.</p></section>
        <section className="stats-section" aria-labelledby="days-heading"><h2 id="days-heading">Nach Tagen</h2><div className="stats-table-wrap" tabIndex={0} role="region" aria-label="Tagesübersicht"><table className="stats-table"><thead><tr><th scope="col">Tag · UTC</th><th scope="col">KI-Aufrufe</th><th scope="col">Cache / vorbereitet</th><th scope="col">Kosten · USD</th></tr></thead><tbody>{[...report.rows].reverse().map(row=><tr key={row.date}><th scope="row"><time dateTime={row.date}>{dateLabel(row.date)}</time></th><td>{count(row.providerRequests)}</td><td>{count(row.cacheHits)} / {count(row.preparedHits)}</td><td><div className="stats-cost"><span aria-hidden="true" className="stats-cost-bar" style={{width:(row.costNanoUsd/maxCost*100)+'%'}}/><span>{row.recorded?money(row.costNanoUsd):'—'}{row.unknownCosts>0&&<small> + {count(row.unknownCosts)} unbekannt</small>}</span></div></td></tr>)}</tbody></table></div></section>
        <p className="stats-caption">Stand: {new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(report.asOf))} Uhr (Berlin). Tagesgrenzen: UTC. Aufbewahrung: 90 Tage.</p>
      </>}
      <footer className="stats-footer"><p>Die Kosten stammen aus den Antworten von OpenRouter, einschließlich intern verworfener Antworten. Zahlungsgebühren und Steuern sind nicht enthalten. Bei Verbindungs- oder Speicherfehlern kann die Erfassung unvollständig sein.</p><p><a href="https://openrouter.ai/activity" target="_blank" rel="noreferrer">Mit OpenRouter abgleichen ↗</a></p><p>Gespeichert werden nur Tageszähler. Keine Fragen, Textstellen, Notizen oder Nutzerkennungen. Besucherzahlen stehen getrennt in Vercel und sind keine Anzahl zahlender KI-Nutzer.</p></footer>
    </>}
  </main>;
}
