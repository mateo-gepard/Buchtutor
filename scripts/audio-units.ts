/** Canonical public text only; consumed by the local audiobook preparation CLI. */
import {readFileSync} from 'node:fs';
import {speechUnits} from '../lib/audiobook';
import type {Book} from '../lib/reader-model';
const work=process.argv[2];
if(!/^[a-z]+$/.test(work??''))throw new Error('Expected canonical work id');
const book=JSON.parse(readFileSync(new URL(`../corpus/books/${work}.json`,import.meta.url),'utf8')) as Book;
process.stdout.write(JSON.stringify({book,units:speechUnits(book)}));
