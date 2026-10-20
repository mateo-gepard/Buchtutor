export const PENCIL_HANDWRITING_HINT_KEY='buchtutor-pencil-handwriting-hint-v1';
export const PENCIL_CLOUD_HINT_KEY='buchtutor-pencil-cloud-hint-v1';
// This identifies where we can offer Scribble, not whether it is enabled or a
// Pencil is paired. Safari exposes neither of those as a web capability.
export function offersAppleScribble(userAgent:string,maxTouchPoints=0){
 const ipad=/iPad/i.test(userAgent)||/Macintosh/i.test(userAgent)&&maxTouchPoints>1;
 const safari=/AppleWebKit/i.test(userAgent)&&/Safari/i.test(userAgent)&&!/(CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Edg\/|OPR\/|DuckDuckGo)/i.test(userAgent);
 return ipad&&safari;
}
export function handwritingHint(scribble:boolean){return scribble?
 'In Safari auf dem iPad kannst du mit Apple Pencil direkt im Notizfeld schreiben. Aktiviere dafür „Kritzeln“ unter Einstellungen → Apple Pencil. Die Umwandlung läuft kostenlos auf deinem Gerät. Frei gezeichnete Striche werden als Handschrift gespeichert.':
 'Für kostenlose Schrifterkennung mit Apple Pencil öffne Buchtutor auf einem iPad in Safari und aktiviere „Kritzeln“. Deine handschriftlichen Notizen werden auch hier als Original gespeichert, ohne Texterkennung.';}
