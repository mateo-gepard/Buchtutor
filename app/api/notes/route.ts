import {json} from '@/lib/server';
// This deployment never accepts or stores personal notes.
export async function GET(){return json({error:'Notizen liegen ausschließlich im Gerätespeicher. Nutze die Geräteübertragung in den Einstellungen.'},410);}
export const POST=GET;
export const DELETE=GET;
