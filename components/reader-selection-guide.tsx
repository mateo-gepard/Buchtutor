type Props={active:boolean;choosingEnd:boolean};

/** The persistent selection tool explains the next tap without moving the text. */
export function ReaderSelectionGuide({active,choosingEnd}:Props){
 return <>
  <span className="reader-selection-label" data-guiding={active}>{active?<><span>{choosingEnd?'Ende':'Anfang'}</span><small>antippen</small></>:'Auswahl'}</span>
  <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{active?(choosingEnd?'Tippe jetzt das Ende deiner Textstelle an.':'Tippe den Anfang deiner Textstelle an.'):''}</span>
 </>;
}
