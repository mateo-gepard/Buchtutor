# Apple-Pencil-Modus

Stand: 19.10.2026. Auf ausdrücklichen Wunsch des Betreibers läuft die Texteingabe mit Apple „Kritzeln“ lokal. Es gibt keine automatische Cloud-Transkription mehr.

## Bedienung

Im Reader das Pencil-Symbol antippen, Farbe wählen und über Wörter streichen. Die Markierung wird an vollständige kanonische Wörter angepasst. Der Finger scrollt weiterhin. Der Griff an der kompakten Leiste lässt sich mit Finger, Pencil oder Maus ziehen. Nahe einem der vier Bildschirmränder rastet die Leiste ein; links und rechts wird sie senkrecht. Position, erreichbare Popovers, Drehung und Split View bleiben berücksichtigt. Pfeiltasten bewegen den fokussierten Griff, Umschalt + Pfeiltaste dockt an und Pos1 setzt zurück. Die Position ist gerätespezifisch.

Auf einem iPad in Safari erscheint nach dem Markieren automatisch ein Notizfeld unter der zugehörigen Textzeile. Mit Apple Pencil und aktiviertem „Kritzeln“ (Einstellungen → Apple Pencil) kann man direkt dort schreiben. Das Betriebssystem liefert der Website Text; Buchtutor ruft dafür keinen Erkennungsanbieter auf. Es ist kein zusätzlicher Notiz-Button nötig. Die Website erkennt iPad Safari über Browser-/Gerätemerkmale, einschließlich der Desktop-Kennung des iPads. Das ist eine Bedienhilfe, kein technischer Nachweis eines gekoppelten Pencils oder aktivierter Kritzeln-Einstellung. iPhone-Safari und Desktop-Safari erhalten keine irreführende Zusage; Chrome, Firefox und Edge auf dem iPad werden als andere Browser behandelt.

Beim ersten tatsächlichen Schreiben erscheint ein kleiner schließbarer Hinweis. In iPad Safari erklärt er das lokale Notizfeld und die erforderliche Kritzeln-Einstellung. In anderen Browsern empfiehlt er Safari auf einem iPad für kostenlose Umwandlung und erklärt, dass die Originalhandschrift dennoch gespeichert wird. Wegklicken wird nur auf diesem Gerät gespeichert; bloßes Aktivieren des Pencil-Modus oder Markieren zeigt den Hinweis noch nicht.

Frei gezeichnete Handschrift neben einer Markierung bleibt in allen Browsern möglich, auch über Nummern und Seitenränder. Zusammenhängende Striche werden einer nahen Markierung zugeordnet. Die erste Zuordnung liegt innerhalb von sechs Schriftgrößen (bei 20 px: 120 px); zusammenhängende weitere Striche behalten das Ziel. Eine kleine Vers-/Absatzangabe zeigt es. Der Schreibstift erlaubt ausdrücklich auch Schrift über dem Buchtext. Diese frei gezeichneten Striche werden als Original gespeichert, ohne nachträgliche automatische Texterkennung. Apples Kritzeln kann bereits gezeichnete Striche nicht nachträglich umwandeln. Textsuche erfasst den gespeicherten Notiztext; sie durchsucht keine untranskribierten Strichbilder.

„Fertig“ speichert Markierung, Farbe, Bedeutung, Notiztext und vorhandene Originalstriche gemeinsam lokal. Vorhandene Notizen können ergänzt werden. Schließen und Neuladen behalten Entwürfe. Schrift ohne nahe Markierung bleibt als Entwurf erhalten; der Benutzer kann die passende Stelle auch nachträglich markieren. Notiztexte sind weiterhin über „Meine Notizen → Im Text öffnen“ bearbeitbar. Apple Kritzeln liefert der Web-App den umgewandelten Text, keine Kopie der ursprünglichen Pencil-Striche aus dem nativen Textfeld. Nur zusätzlich frei gezeichnete Striche werden als Vektoren gespeichert.

## Radiergummi

Der Radiergummi entfernt einzelne Wortmarkierungen und ganze getroffene Schriftstriche auf der Leseseite. Er testet auch die Strecken zwischen Pointer-Ereignissen, damit schnelle Gesten funktionieren. Finger scrollen weiterhin; abgebrochene Radiergesten verändern nichts. Farbauswahl oder Schreibstift verlassen den Radiermodus. Rückgängig stellt die komplette letzte Geste wieder her.

Die Wortlöschung wird als begrenzte Liste kanonischer Block-/Zeichenbereiche gespeichert. Sie kann eine Markierung in getrennte sichtbare Teile teilen. Buchtext, ursprünglicher Notizanker, Notiztext und bereits gespeicherte Originalhandschrift bleiben erhalten, auch wenn alle farbigen Wörter entfernt wurden. Änderungen an gespeicherten Markierungen werden zunächst als Entwurf vorgemerkt und bei „Fertig“ gesichert. In nativen Textfeldern bleibt die normale Textbearbeitung des Betriebssystems verfügbar.

## Speicherung und Kosten

Persönliche Inhalte bleiben im lokalen IndexedDB-/Entwurfsspeicher und in ausdrücklich erstellten verschlüsselten Sicherungen. Keine privaten Inhalte im gemeinsamen Analyse-Cache, in Metriken oder Logs. Der frühere Endpunkt `/api/handwriting` beantwortet POST mit HTTP 410 und startet keinen Modellaufruf, auch nicht für alte Tabs. GPT-6 Luna / max bleibt ausschließlich für die unveränderten KI-Textanalysen vorgesehen.

Ältere Sicherungen, Speicherkennungen und Entwürfe aus der früheren Schreibfläche bleiben lesbar. Bereits vorhandene erkannte Texte bleiben erhalten. Nicht erkannte ältere Schriftflächen und freie Striche werden ohne Cloud-Aufruf als Original gesichert. Die Originalschrift hat eine variable begrenzte Bildfläche bis 2.000 × 1.000 Koordinaten; alte Notizen behalten ihre 1.000 × 320 Darstellung. Die verschlüsselte Sicherung erhält außerdem Farbbedeutung und radierte Wortbereiche. Markdown enthält Text und Farbbedeutung, keine Schriftbilder. Hinweis- und Leistenposition werden bewusst nicht auf andere Geräte übertragen.

## Diagnose vom 19.10.2026

Der Betreiber meldete sehr langes „Erkennen …“. Die verfügbaren Vercel-Laufzeitlogs der letzten 50 Minuten enthielten keine Providerfehler; die gruppierte Fehlerabfrage der letzten 24 Stunden war ebenfalls leer. Der Hobby-Tarif hält rohe Laufzeitlogs nur eine Stunde vor. Diese Befunde belegen keine konkrete Dauer seiner Anfrage: Es gab bisher keine entsprechenden Timing-Logs, und Schriftinhalte wurden bewusst nie protokolliert.

Im früheren Code lief jede Handschrift über OpenRouter mit GPT-6 Luna, maximalem Reasoning, 24.000 Ausgabe-/Reasoning-Tokens und bis zu 270 Sekunden Provider-Laufzeit. Mehrere Notizen wurden nacheinander verarbeitet. Ein kontrollierter synthetischer Test dauerte 174,8 Sekunden und meldete unsicheren Text. Das erklärt die Wartezeit als plausible Ursache, ohne einen aus den Logs nicht belegten Fehler zu behaupten.

Nur im ignorierten lokalen Arbeitsverzeichnis wurden freie Browsermodelle getestet (ppu-paddle-ocr 6.6.1 / PP-OCRv6 und v5, Chromium und WebKit, ausschließlich öffentliche oder synthetische Beispiele). Das Wort „Hain“ wurde mit v6-small schnell erkannt; deutsche Schreibschrift-Beispiele waren dagegen deutlich fehlerhaft. Deshalb wurde dieser Prototyp nicht als zuverlässige Handschrifterkennung veröffentlicht und es wurden keine Modell-Downloads oder OCR-Abhängigkeiten in die App aufgenommen.

## Prüfung

- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- `npx playwright test`: Desktop, Handy und iPad-WebKit im Hoch-/Querformat; lokales Speichern, Originalink, Zuordnung, radierte Wörter und Striche, Undo, Neuladen, alte Entwürfe und verschiebbare/angedockte Leiste.
- `tests/browser/pencil-scribble.spec.ts`: Safari-/Chrome-iPad-Kennung, automatische Textfelder, ungehinderte native Pointer-Ereignisse, Notiztext-Suche, erster Hinweis und dauerhaftes Wegklicken. Keine Handschrift-API-Anfragen erlaubt.
- `npx tsx tests/api.integration.ts http://localhost:3002`: unter anderem deaktivierter Handschrift-Endpunkt ohne Live-Kosten.

Die Safari-Erkennung ist getestet, die tatsächliche Apple-Pencil-/Kritzeln-Umwandlung benötigt einen Hardwaretest mit echtem iPad. Browseremulation kann das Betriebssystemverfahren nicht ausführen.

Referenz: [Apple: Text mit „Kritzeln“ eingeben](https://support.apple.com/de-de/guide/ipad/ipad355ab2a7/ipados). Die Pencil-Stile liegen in `app/pencil.css`; die Live-Prüfung kontrolliert auch ihre tatsächliche Auslieferung.
