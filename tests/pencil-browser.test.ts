import assert from 'node:assert/strict';
import {test} from 'node:test';
import {offersAppleScribble,handwritingHint} from '../lib/pencil-browser';
const safari='Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
test('Scribble is offered only for iPad Safari, including desktop-style iPad identifiers',()=>{
 assert.equal(offersAppleScribble(safari),true);
 assert.equal(offersAppleScribble(safari.replace('Version/18.6','CriOS/140.0')),false);
 assert.equal(offersAppleScribble(safari.replace('Version/18.6','FxiOS/140.0')),false);
 assert.equal(offersAppleScribble(safari.replace('Version/18.6','EdgiOS/140.0')),false);
 assert.equal(offersAppleScribble(safari.replace('iPad; CPU OS 18_6 like Mac OS X','Macintosh; Intel Mac OS X 10_15_7'),5),true);
 assert.equal(offersAppleScribble(safari.replace('iPad; CPU OS 18_6 like Mac OS X','Macintosh; Intel Mac OS X 10_15_7'),0),false);
 assert.equal(offersAppleScribble(safari.replace('iPad; CPU OS','iPhone; CPU iPhone OS')),false);
 assert.match(handwritingHint(false),/auch hier als Original gespeichert/);assert.match(handwritingHint(true),/Aktiviere/);
});
