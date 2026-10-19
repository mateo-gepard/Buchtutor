export function PencilHandwritingHint({scribble}:{scribble:boolean}){return <>
 <strong className="pencil-hint-title">{scribble?'Handschrift → Text':'Handschrift behalten'}</strong>
 {scribble?<><p><strong>Safari auf dem iPad:</strong> Schreibe mit Apple Pencil direkt ins <strong>Notizfeld</strong>. Die Umwandlung läuft <strong>kostenlos auf deinem Gerät</strong>.</p><p className="pencil-hint-setting">Aktivieren: Einstellungen → Apple Pencil → <strong>„Kritzeln“</strong></p></>:<p>Für <strong>kostenlose Schrifterkennung</strong> öffne Buchtutor auf einem iPad in <strong>Safari</strong> und aktiviere <strong>„Kritzeln“</strong>.</p>}
 <p className="pencil-hint-original">{scribble?'Frei gezeichnete Striche':'Deine handschriftlichen Notizen'} werden {scribble?'':'auch hier '}<strong>als Original gespeichert</strong> – ohne Texterkennung.</p>
 </>;}
