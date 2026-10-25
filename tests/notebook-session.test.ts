import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readNotebookSession,writeNotebookSession,type NotebookSession} from '../lib/notebook-session';
const valid:NotebookSession={version:1,filters:{query:'Natur Geborgenheit',work:'faust',kind:'all',color:'blue',meaning:'all',expanded:true},selected:['note-a','note-b'],selecting:true,scroll:810};
test('notebook tab state restores combined filters, selection and scroll without note contents',()=>{
 const read=readNotebookSession({getItem:()=>JSON.stringify({...valid,body:'must not propagate',selected:['note-a','note-a','note-b']})});assert.deepEqual(read,valid);
});
test('invalid or future tab state and unavailable storage cannot break the notebook',()=>{
 for(const value of [null,'invalid',JSON.stringify({...valid,version:2}),JSON.stringify({...valid,scroll:-1}),JSON.stringify({...valid,selected:[null]}),JSON.stringify({...valid,filters:{...valid.filters,query:'x'.repeat(2001)}})])assert.equal(readNotebookSession({getItem:()=>value}),null);
 assert.equal(readNotebookSession({getItem:()=>{throw new DOMException('Denied','SecurityError');}}),null);
 assert.doesNotThrow(()=>writeNotebookSession({setItem:()=>{throw new DOMException('Full','QuotaExceededError');}},valid));
});
