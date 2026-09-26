import type {CSSProperties} from 'react';

type CastArt={columns:number;rows:number;characters:string[]};
export const CAST_ART:Record<string,CastArt>={
  iphigenie: {columns:4,rows:2,characters:["iphigenie","thoas","arkas","orest","pylades","diana","agamemnon","elektra"]},
  krug: {columns:4,rows:2,characters:["adam","licht","walter","frau_marthe","eve","ruprecht","veit","frau_brigitte"]},
  faust: {columns:4,rows:2,characters:["faust","mephistopheles","margarete","wagner","marthe","valentin","director","dichter"]},
  woyzeck: {columns:4,rows:2,characters:["woyzeck","marie","andres","tambourmajor","doctor","hauptmann","margreth","grossmutter"]},
  nathan: {columns:4,rows:2,characters:["nathan","recha","daja","tempelherr","saladin","sittah","klosterbruder","derwisch"]},
  emilia: {columns:4,rows:2,characters:["emilia","der_prinz","marinelli","odoardo","claudia","orsina","appiani","conti"]},
  kabale: {columns:4,rows:2,characters:["luise","ferdinand","miller","millerin","praesident","wurm","lady","hofmarschall"]},
  maria: {columns:4,rows:2,characters:["maria","elisabeth","kennedy","paulet","mortimer","burleigh","leicester","shrewsbury"]},
  verwandlung: {columns:3,rows:2,characters:["gregor","grete","vater","mutter","prokurist"]},
};
const COVER_IDS=new Set([...Object.keys(CAST_ART),'heimsuchung']);
export function coverImage(workId:string){
 return COVER_IDS.has(workId)?`/art/cover-${workId}-v1.webp`:undefined;
}
export function portraitStyle(workId:string,characterId:string):CSSProperties|undefined {
 const art=CAST_ART[workId];
 const canonical=workId==='faust'&&characterId==='gretchen'?'margarete':characterId;
 const index=art?.characters.indexOf(canonical)??-1;
 if(!art||index<0)return undefined;
 const x=index%art.columns,y=Math.floor(index/art.columns);
 return {backgroundImage:`url("/art/cast-${workId}-v1.webp")`,backgroundSize:`${art.columns*100}% ${art.rows*100}%`,backgroundPosition:`${x/(art.columns-1)*100}% ${y/(art.rows-1)*100}%`};
}

