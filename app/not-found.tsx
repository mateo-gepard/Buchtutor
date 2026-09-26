import Link from 'next/link';
import {ArrowLeft,BookOpen,Bookmark} from 'lucide-react';
import {BrandMark} from '@/components/brand-mark';

export default function NotFound(){
  return <main className="not-found-page">
    <Link href="/?view=library" className="wordmark" aria-label="Buchtutor · Bibliothek"><BrandMark/><span>Buchtutor</span></Link>
    <div className="not-found-content">
      <div className="not-found-symbol" aria-hidden="true"><BookOpen size={68} strokeWidth={1.25}/><span>404</span></div>
      <p className="not-found-label">Seite nicht gefunden</p>
      <h1>Dieser Link führt ins Leere.</h1>
      <p>Vielleicht ist die Adresse unvollständig oder die Seite wurde verschoben. In der Bibliothek findest du alle verfügbaren Werke.</p>
      <div className="not-found-actions"><Link className="primary-button" href="/?view=library"><ArrowLeft size={18}/>Zur Bibliothek</Link><Link className="secondary-button" href="/?view=notes"><Bookmark size={18}/>Meine Notizen</Link></div>
    </div>
  </main>;
}
