# Apple-Pencil-Modus

Stand: 19.10.2026. Die getrennte Schreibfläche wurde auf Wunsch des Betreibers durch direkte Handschrift auf der Leseseite ersetzt.

## Bedienung

Im Reader das Pencil-Symbol antippen, Farbe wählen und über Wörter streichen. Der Finger scrollt weiterhin. Der Griff am Anfang der schwebenden Leiste lässt sich mit Finger, Pencil oder Maus ziehen. Nahe einem der vier Bildschirmränder rastet die Leiste beim Loslassen ein; links und rechts wird sie senkrecht. Sie lässt sich jederzeit wieder wegziehen. Die Position bleibt auf diesem Gerät gespeichert und wird bei Drehung, Split View und sichtbarer Tastatur in den erreichbaren Bildschirmbereich zurückgesetzt. Ohne Ziehen stehen dieselben Andockpositionen in den Pencil-Einstellungen zur Verfügung. Am fokussierten Griff bewegen Pfeiltasten die Leiste, Umschalt + Pfeiltaste dockt an und Pos1 stellt die Ausgangslage wieder her.

Notizen direkt neben einer Markierung auf die Seite schreiben, einschließlich der Seitenränder und Nummernspalte. Dafür muss kein Notizfenster geöffnet werden. Nahe Striche werden zu zusammenhängender Schrift gruppiert. Ein Schriftzug beginnt seine Zuordnung an der nächstgelegenen Markierung innerhalb von sechs Schriftgrößen (bei 20 px: 120 px); nachfolgende zusammenhängende Striche behalten dieses Ziel, auch wenn der Satz weiter von der Markierung wegführt. Eine kleine Vers-/Absatzangabe unter der Schrift zeigt die Zuordnung. Verschiedene räumlich getrennte Schriftzüge können zu verschiedenen Farben gehören. Der Schreibstift in der Leiste erlaubt außerdem ausdrückliches Schreiben über dem Buchtext. Farbauswahl schaltet wieder zum Markieren. „Rückgängig“ entfernt den jeweils letzten Markier- oder Schriftstrich.

„Fertig“ transkribiert die gesamte neue Handschrift pro zugehöriger Markierung und speichert Textanker, Farbe, Bedeutung, erkannte Notiz und Originalschrift gemeinsam auf dem Gerät. Auch das Ergänzen einer bereits gespeicherten Pencil-Markierung ist möglich: neuer Text und neue Originalschrift werden angehängt. Handschrift ohne nahe Markierung bleibt als Entwurf erhalten; es wird keine entfernte Stelle geraten. Man kann die passende Markierung auch nach dem Schreiben ergänzen.

Schließen und fehlgeschlagene Erkennung behalten die Entwürfe. Bereits erfolgreich erkannte, unveränderte Gruppen werden beim nächsten Versuch nicht nochmals angefragt. Originalschrift und Zuordnung bleiben bei Neuladen erhalten. Notiztexte sind anschließend über „Meine Notizen → Im Text öffnen“ bearbeitbar. Unsichere Erkennung wird am gespeicherten Eintrag kenntlich gemacht.

## Speicherung und Verarbeitung

Freie Schrift wird als lokale Vektorstriche gespeichert, relativ zu einem kanonischen Textblock, Spaltenbreite und Schriftgröße. Dadurch bleiben die Striche beim Scrollen und nach Layoutänderungen in der Nähe ihrer Passage. Nur für die Transkription entsteht ein zugeschnittenes PNG der eigenen Striche. Buchtext und andere Seiteninhalte werden nicht gerastert oder mitgeschickt. Der Endpunkt `/api/handwriting` verwendet den bestehenden OpenRouter-Anbieter mit GPT-6 Luna / max, ZDR und denselben Anfragegrenzen wie Textanalysen. Keine privaten Inhalte im gemeinsamen Cache, in Metriken oder Anwendungslogs.

Sicherung und Konfliktvergleich erhalten Farbbedeutung und Originalschrift. Ältere Sicherungen, Speicherkennungen und vorhandene Entwürfe aus der früheren Schreibfläche bleiben lesbar. Die Originalschrift kann jetzt eine variable, begrenzte Bildfläche bis 2.000 × 1.000 Koordinaten verwenden; alte Notizen behalten ihre 1.000 × 320 Darstellung. Markdown enthält Text und Farbbedeutung, keine Schriftbilder. Die Position der Werkzeugleiste ist bewusst gerätespezifisch und wird nicht auf andere Displays übertragen.

## Prüfung

- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- `npx playwright test`: Desktop, Handy und iPad-WebKit im Hoch- und Querformat, direkte Schrift, vollständige Gruppierung, mehrere Farben/Ziele, Fehler und Wiederaufnahme, Ergänzen bestehender Notizen sowie frei verschobene und angedockte Leisten.
- `npx tsx tests/api.integration.ts http://localhost:3001`: API-Grenzen ohne Live-Kosten.
- Nur ausdrücklich für kostenpflichtige Tests: `npx tsx scripts/check-ai-live.ts https://www.buchtutor.de --live --image=work/handwriting.png`. Das während der Umsetzung verwendete Bild enthält ausschließlich die synthetische Handschrift „Hain“.

Der erste reale KI-Test am 19.10.2026 zeigte einen Token-Abbruch bei Metrik und einen abgelehnten Beleg bei Konflikt. Das Budget beträgt seither mindestens 24.000 Tokens (Standard 32.000, maximal 48.000), Provider-Laufzeit 270 Sekunden, Route 300 Sekunden und Generierungssperre 360 Sekunden. Eindeutige Blockzuordnungen, Typografie und Zeilenumbrüche werden gegen die tatsächliche Auswahl korrigiert; erfundene oder mehrdeutige Belege bleiben Fehler. Modell und Reasoning werden nicht still gewechselt.

Nach diesen Korrekturen bestanden alle sieben realen API-Anfragen: Inhalt 14,6 s; Stilmittel 38,3 s; Metrik 92,0 s; Hintergrund 41,4 s; Konflikt 26,1 s; eigene Frage 21,9 s; Handschrift 33,9 s. Alle Analysen waren echte Live-Antworten; „Hain“ wurde korrekt erkannt. Das ist eine Stichprobe je Anfrageart und keine Garantie für jede künftige Modellantwort.

Emulation und synthetische Pointer-Ereignisse ersetzen keinen Hardwaretest mit echtem iPad, Safari und Apple Pencil, insbesondere für Handballen, Druckgefühl und den Wechsel zwischen Touch und Pencil.
