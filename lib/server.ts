import {z} from 'zod';
export class ApiError extends Error{constructor(message:string,public status=400,public retryAfter?:number){super(message);}}
export const anchorSchema=z.object({sectionId:z.string().max(100),startId:z.string().max(100),endId:z.string().max(100),startOffset:z.number().int().nonnegative(),endOffset:z.number().int().nonnegative(),quote:z.string().min(1).max(24000)});
export const idSchema=z.string().regex(/^[a-z0-9-]{1,100}$/i);
export async function body<S extends z.ZodType>(request:Request,schema:S):Promise<z.output<S>>{
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new ApiError('Diese Anfrage ist nicht erlaubt.',403);
  if(request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError('Diese Anfrage ist nicht erlaubt.',403);
  if(!request.headers.get('content-type')?.includes('application/json'))throw new ApiError('JSON erwartet.',415);
  if(Number(request.headers.get('content-length'))>70000)throw new ApiError('Die Anfrage ist zu groß.',413);
  const reader=request.body?.getReader();if(!reader)throw new ApiError('Die Anfrage ist leer.');
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>70000){await reader.cancel();throw new ApiError('Die Anfrage ist zu groß.',413);}chunks.push(value);}
  const text=new Uint8Array(size);let offset=0;for(const c of chunks){text.set(c,offset);offset+=c.length;}
  try{return schema.parse(JSON.parse(new TextDecoder().decode(text)));}catch{throw new ApiError('Die Eingaben sind unvollständig oder ungültig.');}
}
export function json(value:unknown,status=200,retryAfter?:number){return Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(retryAfter?{'Retry-After':String(retryAfter)}:{})}});}
export async function safe(work:()=>Promise<Response>){
  try{return await work();}catch(error){
    if(error instanceof ApiError)return json({error:error.message},error.status,error.retryAfter);
    // Never log request bodies, generated answers, notes, identifiers or provider responses.
    console.error('Buchtutor API: request failed');
    return json({error:'Die Anfrage konnte gerade nicht abgeschlossen werden. Gespeicherte Notizen bleiben auf deinem Gerät.'},503);
  }
}
