import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

export const STATS_COOKIE='buchtutor-statistik';
export const STATS_SESSION_SECONDS=8*60*60;
function secret(){const value=process.env.STATS_PASSWORD;return value&&value.length>=32?value:null;}
export const statsAuthConfigured=()=>secret()!==null;
export function validStatsPassword(password:string){
  const expected=secret();if(!expected||password.length>300)return false;
  return timingSafeEqual(createHash('sha256').update(password).digest(),createHash('sha256').update(expected).digest());
}
export function createStatsSession(now=Date.now()){
  const key=secret();if(!key)throw new Error('Statistics access is not configured');
  const payload='v1.'+String(Math.floor(now/1000)+STATS_SESSION_SECONDS);
  return payload+'.'+createHmac('sha256',key).update('buchtutor-statistik:'+payload).digest('base64url');
}
export function validStatsSession(token:string|undefined,now=Date.now()){
  const key=secret();if(!key||!token||token.length>150)return false;
  const match=/^v1\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token);if(!match)return false;
  const expires=Number(match[1]),seconds=Math.floor(now/1000);
  if(expires<=seconds||expires>seconds+STATS_SESSION_SECONDS)return false;
  const expected=createHmac('sha256',key).update('buchtutor-statistik:v1.'+match[1]).digest();
  const signature=Buffer.from(match[2],'base64url');
  return signature.length===expected.length&&timingSafeEqual(signature,expected);
}
