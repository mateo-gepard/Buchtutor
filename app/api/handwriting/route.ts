import {json} from '@/lib/server';
// Old tabs must not keep starting paid model calls after the move to Scribble.
// Never read, forward or log the submitted image.
export async function POST(){return json({error:'Die Handschrifterkennung läuft jetzt kostenlos auf deinem iPad mit Safari und Apple „Kritzeln“. Lade Buchtutor neu. Deine vorhandene Handschrift bleibt als Entwurf erhalten.'},410);}
