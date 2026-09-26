import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readerShareUrl,socialShareLinks} from '../lib/share-links';

test('shared reader links keep only canonical navigation fields',()=>{
 const url=new URL(readerShareUrl('https://www.buchtutor.de/?private=secret#old','iphigenie','s001','v0010'));
 assert.equal(url.origin,'https://www.buchtutor.de');
 assert.equal(url.search,'?work=iphigenie&section=s001&view=reader');
 assert.equal(url.hash,'#v0010');
 assert.equal(url.href.includes('secret'),false);
});
test('social links preserve umlauts, ampersands and the reader fragment',()=>{
 const url=readerShareUrl('https://www.buchtutor.de','krug','s002','v0015');
 const title='Der zerbrochne Krug & Müller';
 const links=socialShareLinks(url,title);
 const telegram=new URL(links.find(link=>link.name==='Telegram')!.href);
 assert.equal(telegram.searchParams.get('url'),url);
 assert.equal(telegram.searchParams.get('text'),title+' · Buchtutor');
 const email=new URL(links.find(link=>link.name==='E-Mail')!.href);
 assert.equal(email.searchParams.get('body'),title+' · Buchtutor\n\n'+url);
 assert.equal(new URL(links.find(link=>link.name==='WhatsApp')!.href).searchParams.get('text'),title+' · Buchtutor\n'+url);
});
