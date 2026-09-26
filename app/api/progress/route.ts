import {json} from '@/lib/server';
export async function GET(){return json({error:'Der Lesestand wird auf deinem Gerät gespeichert.'},410);}
export const POST=GET;
