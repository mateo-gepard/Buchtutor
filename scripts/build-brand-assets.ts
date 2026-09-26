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
const shareCard=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${brand.paper}"/>
  <rect x="0" y="0" width="14" height="630" fill="${brand.accent}"/>
  <g transform="translate(76 96) scale(1.3)">${mark(brand.ink,brand.accent)}</g>
  <g font-family="Segoe UI,Arial,sans-serif" fill="${brand.ink}">
    <text x="182" y="152" font-size="66" font-weight="600">Buchtutor</text>
    <text x="76" y="330" font-size="45">Lesen. Lesehilfe. Notizen.</text>
    <text x="76" y="391" font-size="28" fill="#596a64">Deutsch in der Oberstufe</text>
    <text x="76" y="546" font-size="26">buchtutor.de</text>
  </g>
  <path d="M76 205h1048" stroke="#d8ded7" stroke-width="2"/>
  <g transform="translate(886 306) scale(3.2)">${mark(brand.ink,brand.accent)}</g>
</svg>`;
await sharp(Buffer.from(shareCard)).png().toFile('public/brand/buchtutor-share.png');
console.log('Buchtutor: brand icons and 1200 × 630 px share preview generated.');
