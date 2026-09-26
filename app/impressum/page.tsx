import Link from 'next/link';
export const metadata={title:'Impressum · Buchtutor'};
export default function Imprint(){
 const name=process.env.OPERATOR_NAME, address=process.env.OPERATOR_ADDRESS,email=process.env.OPERATOR_EMAIL;
 const complete=!!(name&&address&&email);
 return <main className="legal-page"><Link href="/?view=library">← Zur Bibliothek</Link><h1>Impressum</h1>
 {!complete&&<p className="placeholder-notice">Entwurfsstand: Die Betreiberangaben sind Platzhalter und müssen vor dem regulären öffentlichen Betrieb ergänzt werden.</p>}
 <h2>Verantwortlich für dieses Angebot</h2>
 <address>{name||'[Vor- und Nachname]'}{'\n'}{address||'[Straße und Hausnummer]\n[Postleitzahl und Ort]'}{'\n'}{email||'[Kontakt-E-Mail]'}</address>
 <h2>Buchtutor</h2><p>Ein kostenloses Angebot zum Lesen und Verstehen von Schullektüren. Textgrundlagen und Nutzungsbedingungen sind beim jeweiligen Werk unter „Quelle und Zitierweise“ angegeben. Illustrationen wurden mit KI erstellt. KI-Lesehilfen können Fehler enthalten; prüfe Belege am Original.</p>
 <p><Link href="/datenschutz">Datenschutzhinweise</Link></p></main>;
}
