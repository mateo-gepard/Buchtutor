# Handschrift, Zuordnung und lokale Wiederherstellung

Stand 21.10.2026. Textanker bleiben an Werk, Ausgabe, Abschnitt und UTF-16-Offsets gebunden. Vor dem Speichern wird das Zitat mit dem kanonischen Text verglichen. DOM-Wortboxen werden nur aus exakt übereinstimmendem Text erzeugt. Unklare Nähe zwischen Handschrift und mehreren Markierungen führt zu keiner geratenen Zuordnung. In den Pencil-Einstellungen lässt sie sich ausdrücklich wählen. Eine bestehende Zuordnung wechselt nicht allein deshalb, weil ein Ziel verschwindet.

## Eingabe und Zoom

Pointerereignisse und Wortboxen werden aus visuellen Client-Koordinaten in unskalierte Dokumenteinheiten umgerechnet. Scrollen, Zoom und horizontales Verschieben verändern die Originalpunkte nicht. Der Dokumentzoom von 100 bis 300 Prozent vergrößert nur die Seite. Werkzeugleiste und Detailmenüs bleiben in Bildschirmgröße. Eine einmal vergrößerte Seite behält ihre Zeilenumbrüche auch beim Drehen des Geräts; bei 100 Prozent ist das normale responsive Layout verfügbar.

Striche nutzen zusammengefasste Pointerereignisse und eine geglättete Vorschau. Unterbrochene Eingaben werden als Originalhandschrift erhalten. Ein langer Strich wird in speicherbare Abschnitte aufgeteilt. Vor Zoom, App-Wechsel, Seitenverlassen und Komponentenabbau wird der aktive Strich abgeschlossen. Radieren entfernt tatsächlich getroffene Wortbereiche bzw. Striche, ohne überlebende Originalpunkte umzuberechnen. Rückgängig bleibt verfügbar.

## Speichergrenzen und Wiederherstellung

- Abgeschlossene Striche und Texteingaben schreiben synchron einen lokalen Entwurf. Eine eigene Fassung pro Tab und eine vorherige gültige Fassung verhindern, dass ein anderer Tab die einzige Kopie ersetzt. Laufende Schrift erhält zusätzlich etwa alle 120 Millisekunden einen Checkpoint mit stabiler Strich-ID.
- „Fertig“ bestätigt erst nach erfolgreicher IndexedDB-Transaktion. Bei Fehlern bleibt der Entwurf erhalten. Ein gemeinsam atomar gespeicherter Checkpoint mit Revision und Prüfsumme ermöglicht die Wiederherstellung eines beschädigten Hauptdatensatzes. Reparaturen erhalten beschädigte Rohdaten in begrenzten Quarantäneschlüsseln.
- Gleichzeitige Änderungen derselben Notiz erhalten abweichende Inhalte als Konfliktkopie. Das Löschen eines gerade gespeicherten Entwurfs bestätigt nur dessen genaue Fassung; spätere Eingaben bleiben bestehen. Andere lokale Entwürfe lassen sich ausdrücklich wiederherstellen.
- Gelöschte Einträge bleiben als lokale Datensätze erhalten. Unter „Meine Notizen → Gelöschte Einträge“ lassen sie sich auch nach Neuladen mitsamt Markierungen und Originalhandschrift wiederherstellen.
- Handschrifterkennung beginnt erst nach lokalem Speichern. Eine verspätete Antwort darf nur die unveränderte Ausgangsnotiz ergänzen. Originalpunkte bleiben separat von Suchtext und Transkription erhalten.

Alle Kopien liegen im selben Browserprofil. Gelöschte Websitedaten, verlorene Geräte und ein Ausfall des gesamten Browserspeichers sind dadurch nicht abgedeckt. Die bestehende verschlüsselte Gerätesicherung unter Einstellungen → Geräteübertragung ist die unabhängige Sicherung; automatische private Cloud-Uploads finden nicht statt. Ohne ausführbare Lifecycle-Ereignisse kann ein vollständiger Prozessabbruch höchstens den letzten noch nicht geschriebenen Eingabeabschnitt treffen. Physisches Apple-Pencil-Verhalten und Apples Kritzeln benötigen zusätzlich einen realen iPad-Test.

Gezielte Tests stehen in `tests/browser/pencil-safety.spec.ts`, `document-zoom.spec.ts`, `handwriting-reliability.spec.ts` und `note-drafts-recovery.spec.ts`; Transaktions-, Korruptions- und Konfliktfälle in den Unit-Tests.

## Radierarten

Der Strichradierer entfernt ganze getroffene Schriftstriche und Wortmarkierungen. Der präzise Radierer schneidet entlang der eingestellten Radierfläche nur die berührten Teile heraus; bei Textmarkierungen verwendet er Graphemgrenzen statt UTF-16-Zeichenhälften. Die verbleibenden Originalpunkte behalten ihren Dokumentrahmen. Rückgängig umfasst jeweils die ganze Radiergeste. Nach Änderungen an Originalschrift wird alter OCR-Suchtext entfernt, bevor eine neue Erkennung vorgesehen wird.

„Kritzeln zum Radieren“ ist eine lokale, gespeicherte Opt-in-Einstellung. Die Heuristik verlangt mehrere breite Richtungswechsel; trifft sie keine vorhandene Schrift/Markierung, bleibt die Zeichnung normale Handschrift. Radierart, Größe und Gestenwahl werden als Geräteeinstellungen gesichert.

Die Radiereroptionen öffnen durch Gedrückthalten, Doppeltippen oder Rechtsklick auf das Radierersymbol und über die Pencil-Einstellungen. `E` wechselt zum Radierer und zum vorherigen Werkzeug zurück; Texteingaben und Dialoge werden ausgenommen. Standard-Pointerereignisse für eine physische Radiererspitze (`button=5`/`buttons=32`) werden während des betreffenden Strichs unterstützt. Apples Doppeltippen am Pencil-Schaft verwendet dagegen die native [UIPencilInteraction](https://developer.apple.com/documentation/uikit/uipencilinteraction); Safari stellt hierfür kein entsprechendes Web-Ereignis bereit. Es wird kein nicht funktionierender Browser-Schalter angeboten.
