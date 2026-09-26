import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {brand,bookPagesPath,bookTabPath} from '../lib/brand';

const mark=(color:string,tab=color)=>`<path fill="${tab}" d="${bookTabPath}"/><path fill="${color}" d="${bookPagesPath}"/>`;
const svg=(size:number,content:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${content}</svg>`;
const favicon=svg(64,`<rect width="64" height="64" rx="14" fill="${brand.ink}"/><g transform="translate(8 14) scale(.75)">${mark('#fff')}</g>`);
// Opaque background; the OS applies its own corner mask. The mark fits the maskable safe area.
const appIcon=svg(512,`<path fill="${brand.ink}" d="M0 0h512v512H0z"/><g transform="translate(96 136) scale(5)">${mark('#fff')}</g>`);
const markSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48">${mark(brand.ink,brand.accent)}</svg>`;
await mkdir('public/brand',{recursive:true});
await writeFile('public/favicon.svg',favicon+'\n');
await writeFile('public/brand/buchtutor-mark.svg',markSvg+'\n');
await sharp(Buffer.from(appIcon)).resize(180,180).png().toFile('app/apple-icon.png');
for(const size of [192,512])await sharp(Buffer.from(appIcon)).resize(size,size).png().toFile(`public/brand/buchtutor-${size}.png`);
console.log('Buchtutor: SVG mark, favicon and 180/192/512 px app icons generated.');
