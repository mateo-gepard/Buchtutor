# Gemeinsame Lesewerkzeuge

Betreiberauftrag vom 20.10.2026: Pencil/Notizen, Hörbuch und KI-Hilfe in einer gemeinsamen, verschiebbaren Leiste zusammenführen. Die pausierte Vorbereitung weiterer Hörbücher bleibt davon unberührt.

## Referenzen und Übertragung

Die offiziellen Goodnotes-Beschreibungen wurden am 20.10.2026 geprüft:

- [Customize the toolbar](https://support.goodnotes.com/hc/en-us/articles/8900755183631-Customize-the-toolbar): gemeinsame Werkzeugauswahl, Audio erreichbar halten, Zeichenwerkzeuge verschieben und an Bildschirmrändern andocken.
- [What’s new for the September launch](https://support.goodnotes.com/hc/en-us/articles/13724030806927-What-s-new-for-the-September-launch): Hauptleiste plus Werkzeugoptionen im passenden Kontext, damit mehr Platz für das Dokument bleibt.
- [Shaping Goodnotes AI to the way you work](https://www.goodnotes.com/blog/shaping-goodnotes-ai-to-the-way-you-work): KI-Hilfe neben der eigentlichen Arbeit erreichbar machen.

Buchtutor übernimmt diese Anordnung als Bedienprinzip und behält seine eigene Gestaltung und deutschen Beschriftungen.

## Verhalten

- Eine gemeinsame Oberfläche enthält Textauswahl, Pencil, Notizen, KI-Hilfe und Audio. Ab 760 Pixeln passen auch die aktiven Pencil-Werkzeuge in dieselbe Zeile. In schmaler Split-View und auf Telefonen steht die Zeichenwerkzeuggruppe in einer zweiten Zeile derselben Leiste.
- Farbe, Schreiben, Radierer, Rückgängig und „Fertig“ sind direkt erreichbar. Ein kleines Farbmenü enthält die fünf Farben und den Zugang zu ihren Bedeutungen. „Lesen“ beendet den Zeichenmodus mit erhaltenem Entwurf; ein erneutes Antippen von Pencil lässt ihn aktiv.
- Play/Pause bleibt erreichbar, während Notizen oder KI-Hilfe geöffnet sind. Kapitel, Tempo, Hörposition, Timer und Quellenangaben liegen in den Hörbuchdetails.
- Notizen, KI-Hilfe, Hörbuchdetails und Werkzeugmenüs öffnen jeweils einen gemeinsamen Detailbereich. Ab 1000 Pixeln Bildschirmbreite bleibt neben dem 320–360 Pixel breiten Seitenfenster ein eigener Textbereich frei.
- Unter 1000 Pixeln (iPad-Hochformat, Split-View, Telefon) stehen Notizen, KI-Hilfe und Hörbuchdetails direkt nach der gewählten Passage im Lesefluss. Keine Textzeile liegt unter dem Fenster; die Textbreite bleibt erhalten. Ohne Auswahl wird die erste sichtbare Passage unterhalb der Leiste verwendet. Die Notiz beginnt als etwa 200 Pixel hohes Eingabefeld mit Versangabe und Speichern. Doppelte Textvorschau und Tab-Leiste entfallen hier; Vergrößern öffnet mehr Platz und die Tabs. Bereits gespeicherte Einträge sind aufklappbar. KI und Audio verwenden eine 300 Pixel hohe, intern scrollbare Karte.
- Griff ziehen oder mit den Pfeiltasten bewegen; Umschalt plus Pfeiltaste dockt an. „Leiste anordnen“ bietet dieselben Ziele ohne Ziehgeste. Home setzt die Leiste nach oben zurück.
- Kopfzeile, Lesefortschritt, sichtbarer Bildschirm und Bildschirmtastatur begrenzen die Position. Die vorhandene lokale Positionskennung wird weiterverwendet.
- Wechsel zwischen Details erhält die Audioinstanz, die Wiedergabe, Pencil-Entwürfe und angefangene Textnotizen. Die bisherigen Speicher- und Editionsanker bleiben unverändert.
- Die Einführung hebt die tatsächlichen Werkzeuge hervor. Überlappende Ausschnitte werden vereinigt, damit ihre Schnittfläche anklickbar bleibt.

## Ruhigere Übergänge

Folgeauftrag „UX smoother“ vom 20.10.2026:

- Audio- und KI-Details verwenden dieselben Textabstände. Im schmalen Lesefluss ist die Notiz bewusst kleiner. Ein Wechsel innerhalb der Leiste schließt das Audiofenster erst mit der gewählten Aktion; der vorherige Pointer-Down erzeugt keinen zusätzlichen Layoutwechsel mehr.
- Die kanonische Lesestelle wird bei Werkzeugaktionen vor dem nächsten Bild wiederhergestellt. Dabei wird die Textbreite nicht über viele Zwischenstufen animiert, damit Textauswahl und Pencil-Anker verlässlich bleiben.
- Detailfenster blenden kurz ein und aus; geschlossene Inhalte sind sofort inaktiv und für assistive Technik verborgen. Eigene Scrollpositionen bleiben beim Wechsel zwischen Verstehen, Figuren und Notizen erhalten. Ein Antippen bewegt den Fokus nicht zur Fensterüberschrift; Tastaturbedienung führt weiterhin dorthin und mit Escape zurück.
- Der Griff beginnt erst nach sechs Pixeln Bewegung zu ziehen. Antippen und kleine Handbewegungen lassen die Details offen. Beim Loslassen bzw. bewussten Andocken gleitet die Leiste kurz an ihre Position; während des Ziehens folgt sie direkt.
- Gespeicherte Andockpositionen werden vor der ersten Werkzeugdarstellung wiederhergestellt. Eingaben bleiben direkt, die Notizschrift verwendet 16 Pixel, und Scrollen innerhalb der Details wird nicht an die Buchseite weitergereicht.
- „Bewegung reduzieren“ deaktiviert diese Animationen. CSS-Ein-/Ausblendungen verbessern das Verhalten in unterstützten Browsern; ältere Browser zeigen die Inhalte unmittelbar. Grundlage ist die dokumentierte Unterstützung für `@starting-style` und diskrete `display`-Übergänge in [WebKit/Safari 18](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/).

## Prüfung

Die Gestaltung der Leiste gruppiert Lesen/Markieren, Zeichenwerkzeuge, Notizen/KI und Wiedergabe auf abgesetzten Flächen. Auf iPad-Breiten ab 820 Pixeln stehen kurze Beschriftungen unter den Hauptsymbolen. Ein gefüllter Modusschalter unterscheidet den Pencil-Modus von einem geöffneten Detailfenster; das Markierwerkzeug zeigt seine aktuelle Farbe samt Stiftsymbol. Die Leiste bleibt horizontal höchstens 60 Pixel hoch, mit zweiter Zeichenzeile höchstens 114 Pixel. Seitlich bleiben die Gruppen zusammen: Bei knapper Höhe bilden Auswahl/Pencil und Notiz/KI jeweils eine Reihe; Farbe, Schreiben/Radieren und Rückgängig/Fertig bleiben als Zeichenwerkzeuge zusammen. Griff und Anordnung teilen sich dann eine Kopfzeile. Angedockte Seitenleisten erhalten auch ohne geöffnetes Detailfenster freien Platz neben Text und Versnummern. Der zusätzliche Layouttest prüft alle vier Ränder einschließlich 320-Pixel-Telefon, Split-View und kurzem Tastaturfenster auf Überlappungen und abgeschnittene Werkzeuge.

Die kompakte Seitenleiste hat einen Spielraum zwischen Ein- und Ausklappen, damit mobile Viewport-Rundung beim Drehen keinen Layoutwechsel in Schleife auslöst. Die Schreibfläche beobachtet zusätzlich den Lesebereich: Verschiebt sich eine zentrierte Seite ohne Änderung ihrer Textbreite, werden ihre äußeren Schreibgrenzen ebenfalls neu berechnet. Auf schmalen Seiten dürfen Kapitelzeile, Abschnittsbuttons und lange Wörter umbrechen; sie erzeugen keine horizontale Überbreite.

Der kombinierte Browsertest prüft echte Medienwiedergabe mit einer lokalen Testaufnahme, eine Pencil-Markierung, einen Textentwurf, Wechsel zwischen KI-/Audio-/Notizdetails, dieselbe weiterlaufende Audioinstanz und das Andocken. Die bestehenden Prüfungen decken zusätzlich Zeichnen, Radieren, Kritzeln, lokale Speicherung, Textauswahl und die vollständige Einführung ab.

Playwright-Projekte: Desktop-Chromium, mobiles Chromium und iPad-WebKit in Hoch- und Querformat. Zusätzliche Layoutprüfungen öffnen Farbmenü, Notizen, KI-Hilfe, Figuren und Audio einzeln, messen den verbleibenden Textbereich und erstellen Screenshots. Verkleinerte Ansichten prüfen Split-View und den Platzbedarf einer Tastatur. Native Apple-Pencil-Hardware und die iPad-Systemtastatur können durch diese Emulation nicht vollständig geprüft werden.

Die ergänzten Interaktionsprüfungen messen die Leseposition vor/nach Werkzeugwechseln, kontrollieren den Zustand zwischen Pointer-Down und Klick, erhalten Notizentwürfe bei Griffbewegungen und prüfen Tastaturfokus, separate Scrollpositionen und reduzierte Bewegung.


## Details im Lesefluss (20.10.2026)

Die Einfügestelle bleibt beim Scrollen und Hören an ihrer kanonischen Passage. Nur eine neue Auswahl bzw. ein erneutes Öffnen ohne Auswahl legt sie neu fest. Eine außerhalb des sichtbaren Bereichs geöffnete Karte wird zusammen mit dem vorangehenden Text sichtbar gemacht. Beim Drehen wechseln die Details zwischen Lesefluss und Seitenbereich; Notizentwurf, eigener Scrollstand und die Audioinstanz bleiben erhalten. Die Einfügestelle ist ein normales Eingabeelement, kein Teil der Pencil-Zeichenfläche. Handschrift wird auch bei einem Wechsel der Einfügestelle erneut auf ihren Vers projiziert, wenn sich die Gesamthöhe des Dokuments nicht ändert.

Die ergänzten Tests prüfen, dass keine Textzeile mit der Karte überlappt, die Auswahl ihre Breite behält, Schließen keinen Abstand hinterlässt und ein Entwurf nach mehrfachem Drehen gespeichert werden kann. Zusätzlich werden Zeichnung, Verszuordnung, Vergrößern und die vollständige Einführung geprüft.

## Originalschrift und Suchtext (20.10.2026)

Nach „Fertig“ bleibt neue freie Handschrift an ihrem Vers sichtbar. Gespeichert werden die Originalpunkte mit Referenzvers, Schriftgröße und Seitenbreite sowie die bisherige zugeschnittene Darstellung für Notizbuch und Sicherungen. Beim Drehen, Ändern der Schriftgröße oder Einfügen einer Werkzeugkarte wird die Schrift erneut am Vers ausgerichtet. Alte Notizen ohne Seitenkoordinaten behalten ihr Original im Notizbuch; ihre frühere Position lässt sich nicht rekonstruieren.

Das Augensymbol bündelt vier Ansichten: Alles, nur Markierungen, nur Notizen, alles ausgeblendet. Ausblenden löscht keine Daten. Die Auswahl bleibt auf dem Gerät erhalten. Die schmale seitliche Leiste bündelt Griff, Anzeige und Anordnung in einer gemeinsamen Kopfzeile.

Für iPad Safari bleiben Standard-Textfelder mit Apple Kritzeln verfügbar. Apple gibt einer Website keine Originalstriche aus diesen Feldern und keine API für die nachträgliche Erkennung beliebiger Canvas-Striche. Die Online-Erkennung ist auf anschließenden Betreiberwunsch standardmäßig eingeschaltet: Schreiben und „Fertig“ reichen aus. Neue Geräte und ältere Daten ohne das Erkennungsfeld erhalten diesen Standard; ein bereits gespeichertes `handwritingCloud:false` bleibt unverändert. Der erste Handschrifthinweis erklärt kurz die Bildübertragung und lässt sich schließen; er verlangt keine Aktivierung und blockiert „Fertig“ nicht. In den Pencil-Einstellungen lässt sich die Online-Erkennung ausschalten und damit wieder Apple Kritzeln über Standard-Textfelder verwenden.

Bei eingeschalteter Erkennung speichert „Fertig“ zuerst alle Originale atomar in IndexedDB. Erst danach wird eine PNG-Kopie ausschließlich der Handschrift über `/api/handwriting` an OpenRouter / Google Gemini 3.1 Flash-Lite geschickt. Die Verarbeitung läuft nacheinander im Hintergrund; die Markierung zeigt einen kleinen Ladeindikator, danach ein Häkchen oder einen Prüfhinweis. Der Text erscheint erst beim Öffnen der Notiz und ist in Suche und Export enthalten. Handkorrekturen, Radieren und Löschen schützen sich über Zustand und Originalpunkte gegen verspätete Antworten. Fehlgeschlagene Anfragen werden nur auf ausdrücklichen erneuten Versuch wiederholt. Ein unterbrochener, bereits gespeicherter Auftrag kann beim nächsten Besuch fortgesetzt werden.

Der Endpunkt verlangt das Erkennungsflag im Request, Same-Origin, ein begrenztes PNG und die vorhandene Gerätekennung. Er teilt die bestehenden Minuten-/Tageslimits, verwendet ausschließlich den serverseitigen Betreiber-Schlüssel, fordert ZDR und keine Datensammlung, begrenzt die Ausgabe auf 1.800 Tokens und bricht den Anbieteraufruf nach 25 Sekunden ab. Keine Bilder, Notiztexte oder Ergebnisse gelangen in öffentliche Caches oder Anwendungslogs. Nur aggregierte Verbrauchszahlen werden erfasst. Die Originalschrift bleibt bei Timeout, Rate-Limit, ungültiger Antwort oder ausgeschalteter Erkennung erhalten.

Preisbasis am 20.10.2026: [Gemini 3.1 Flash-Lite](https://openrouter.ai/google/gemini-3.1-flash-lite/pricing) 0,25 USD / Million Eingabetokens und 1,50 USD / Million Ausgabetokens. Beispielrechnung für 1.000 Eingabe- und 150 Ausgabetokens: 0,000475 USD pro Notiz, 0,475 USD pro 1.000 Notizen, vor Gebühren/Wiederholungen. Die tatsächliche Abrechnung hängt von Bildgröße, Notizlänge und Anbieter ab.

Entwürfe werden unmittelbar bei Texteingabe bzw. Strichende gesichert; ein Timer ist dafür nicht mehr erforderlich. Unlesbare Pencil-Entwürfe bleiben unverändert im Speicher. Native Komposition sperrt „Fertig“ bis zum Abschluss, und der finale DOM-Text wird zusätzlich vor dem Speichern übernommen. Normale Notizfelder sichern ihren Entwurf ebenfalls pro Textanker. Teilweise erfasste freie Schrift bleibt bei einer abgebrochenen Pointer-Geste erhalten; abgebrochene Radier- und Markiergesten werden weiterhin verworfen.

`handwriting-reliability.spec.ts` prüft sofortiges Pagehide, Komposition, beschädigte Entwürfe, Speicherfehler, Wiederherstellung, Hintergrund-Erkennung, Suche, alle vier Sichtbarkeitszustände, erneute Versuche, verspätete Antworten, Radieren, Rückgängig und abgebrochene Schreibgesten. Die automatisierten WebKit-Tests prüfen die Browserintegration, nicht Apples native Handschrifterkennung auf physischer Pencil-Hardware.


## Bibliothek, Notizbuch und verlässliche Navigation (20.10.2026)

Die Leiste wird ausschließlich im Leser gerendert. Ein geöffneter Player hält sie nicht mehr in der Bibliothek oder im Notizbuch sichtbar. Beim bewussten Verlassen des Lesers wird er geschlossen und pausiert; sein bisheriger Speicherpfad erhält die Hörposition. Eine Rückkehr startet keine Wiedergabe von selbst. Details und Werkzeugmenüs öffnen sich nach einem Ansichts- oder manuellen Abschnittswechsel nicht unerwartet wieder. Automatische Hörbuch-Kapitelwechsel erhalten dagegen das geöffnete Audiofenster.

Der Werkfilter im Notizbuch steht zuerst, trägt eine sichtbare Beschriftung und zeigt die Eintragszahlen je Werk. Er kombiniert sich mit Suche, Typ und Farbe. Die Suche findet zusätzlich Titel und Autor. Bedeutungen werden pro Werk angeboten und beim Werkwechsel zurückgesetzt. Eine Ergebniszeile nennt die Trefferzahl und bietet „Filter zurücksetzen“. Ein ausgewähltes Werk bleibt nach dem Löschen seines letzten Eintrags auswählbar. Auch Notizen zu nicht mehr katalogisierten Werken lassen sich filtern.

Filter, Suchtext und Scrollstand liegen für die aktuelle Sitzung beim ReaderApp statt in der beim Öffnen einer Notiz entfernten Notizbuchkomponente. Die Einführung verwendet davon getrennte Übungsfilter. Die Buchlade-Anfrage ist abbrechbar; eine neuere Navigation verwirft auch verspätete Antworten und Fehlermeldungen. Ein fehlgeschlagenes Öffnen löscht die bisherige Textauswahl und den geöffneten Entwurf nicht.

## Überlappende Einträge, Versauswahl und Hörstelle (21.10.2026)

Überlappende Anker bilden eine gemeinsame Darstellung mit einem Randindikator und gemeinsam erreichbaren Einträgen. Eigene Pencil-Farben haben Vorrang vor Analysefarben; ein späteres Speichern einer Erklärung ändert die eigene Farbe nicht. Einzelne Einträge, Originalschrift, Suche und Löschung bleiben unabhängig. In der gemeinsamen Übersicht lässt sich jede Notiz oder Erklärung einzeln öffnen und entfernen. Erneutes Speichern derselben Analyse verwendet ihre vorhandene Identität.

Ein Tipp auf eine Versnummer wählt einen einzelnen Vers aus. Für einen Bereich am Nummernrand entlangziehen oder im Auswahlwerkzeug Anfang und Ende antippen. Die Leiste bietet schon nach dem ersten Vers Notiz und Analyse an. Ziehen funktioniert auch rückwärts, hält den Text beim Öffnen der Auswahlaktionen an seiner Position und scrollt am Rand weiter. Nur die Nummern übernehmen diese Geste; Text behält native Wortauswahl, Zoom und Scrollen. Im Bereichsmodus dienen auch bereits markierte Textstellen als Endpunkt. Die aktive Auswahl liegt dezent direkt auf dem Text; Versnummern behalten ihre Größe. Tastatur, Umschalt-Erweiterung und Abbruch bleiben erhalten.

Die Hörstelle verwendet eine eigene Lesecursor-Markierung und eine weiche Passagefläche statt einer orangefarbenen Unterstreichung. Passage, ganze Zeile oder keine Hervorhebung sind wählbar. Das Mitführen bleibt davon unabhängig. Nach eigenem Scrollen steht die Rückkehr zur Hörstelle direkt in derselben Leiste. Der Cursor folgt der tatsächlichen Medienzeit zwischen den normalen Audioereignissen; die Ansicht wird nur bei einem Passagenwechsel neu gesetzt.


## Dialoge und Ebenen (21.10.2026)

Einstellungen, Inhaltsverzeichnis, Suche, Teilen, Quellen und die vergrößerte Figurenkonstellation verwenden dieselbe modale Ebene: Hintergrund 100, Inhalt 101. Werkzeuge bleiben auf 65, Hinweise auf 70 und die abbrechbare Ladeanzeige auf 80. Damit können weder Leiste noch Farben-/Audio-/Notizdetails über einem geöffneten Dialog liegen. Radix übernimmt Eingabesperre und Fokusbegrenzung des modalen Fensters; Escape wird von der Leseransicht nicht zusätzlich abgefangen, solange ein Dialog geöffnet ist. Onboarding bleibt mit seiner bewussten Spotlight-Ebene darüber.


## Einheitliche Auswahl und erhaltene Entwürfe (21.10.2026)

- Lesen, Auswahl und Pencil sind ausdrücklich wählbare Modi. Werkzeugtasten aktivieren das Werkzeug; erneutes Antippen deaktiviert es nicht. Der Farbstift aktiviert das Markieren und öffnet seine Optionen. „Lesen“ oder Escape beendet die Bearbeitung, ohne Textstellen oder Entwürfe zu verwerfen. E bleibt der schnelle Wechsel zwischen Radierer und vorherigem Zeichenwerkzeug.
- Kleine Werkzeugmenüs schließen einheitlich durch Antippen außerhalb oder Escape. Escape schließt zuerst das oberste Menü bzw. Detailfenster; die Auswahl bleibt erhalten. Modale Dialoge haben Vorrang und erhalten den Hintergrundzustand. Kleine Menüs schließen einander gegenseitig.
- „Weitere Stelle auswählen“ ergänzt eine getrennte Passage. Die Übersicht zeigt Anzahl, aktive Stelle und einzeln entfernbare Einträge. Notiz und KI-Hilfe gehören jeweils zur aktiven Passage; „Ausgewählte Stellen markieren“ markiert alle ausgewählten Anker, ohne Lücken dazwischen zu füllen. Die Übersicht in der Leiste bleibt kompakt; auf sehr schmalen Bildschirmen sind zusätzliche Auswahlaktionen horizontal erreichbar. „Auswahl aufheben“ bzw. „Alle abwählen“ leert die Auswahl ausdrücklich.
- Passagen, eigene Fragen, Analyseergebnisse und ausgewählte Figuren bleiben während der Sitzung je Ausgabe und Abschnitt erhalten, auch bei Buchwechseln, Bibliotheksbesuchen und Vor-/Zurück-Navigation. Notiz- und Pencil-Entwürfe verwenden zusätzlich weiterhin ihre bestehenden lokalen Sicherungen. Ungespeicherte Markierungen bleiben beim Wechsel in den Lesemodus sichtbar; Antippen setzt ihre Bearbeitung fort.
- Figuren lassen sich einzeln zu- und abwählen, auch mehr als zwei. Eine dritte Figur ersetzt keine vorherige. Die Mehrfachansicht verwendet ausschließlich hinterlegte Beziehungen innerhalb der gewählten Spoilergrenze.
- Das Notizbuch hat einen ausdrücklichen Auswahlmodus mit Checkboxen, Anzahl, „Sichtbare auswählen“, „Alle abwählen“, Export und Löschen. Beenden des Modus erhält die Auswahl; ein erneutes Öffnen setzt sie fort. Filter und Navigation erhalten ausgewählte Einträge. Außerhalb des aktuellen Filters liegende ausgewählte Einträge werden vor gemeinsamen Aktionen ausgewiesen.
- Eine identische bereits gespeicherte Pencil-Markierung derselben Farbe wird beim erneuten Überstreichen als vorhandener Eintrag weiterbearbeitet. Originalschrift und Notiz bleiben erhalten; identische Zielstellen erzeugen keinen zusätzlichen Zuordnungskandidaten. Bei knapper Höhe zeigt die seitliche iPad-Leiste die drei Modi in einer gemeinsamen Reihe.
- Gemeinsames Löschen ist eine einzelne lokale Transaktion und bewahrt Originale im Papierkorb. Rückgängig stellt nur genau die betreffende Löschung wieder her und überschreibt keine inzwischen erfolgten Änderungen aus einem anderen Tab. Bei einem Speicherfehler bleiben Einträge und Auswahl erhalten und der Vorgang lässt sich erneut ausführen.

`interaction-consistency.spec.ts` prüft Werkzeugwechsel, getrennte Passagen und Entwürfe, Abschnitts-/Buchwechsel, Browserhistorie, Figuren, Filter, Export, Mehrfachlöschung, Rückgängig und fehlgeschlagene Speichertransaktionen. Die vorhandenen Schreib-, Zoom-, Layout- und Overlaytests prüfen die Integration in iPad-WebKit Hoch-/Querformat sowie Chromium auf Desktop und Mobilgerät. Emulation prüft nicht die native iPad-Tastatur oder physische Apple-Pencil-Gesten.

Eine in der Safari-Prüfung beobachtete veraltete Audio-Ladeanzeige wird zusätzlich durch `canplay` und tatsächlich fortschreitende Medienzeit korrigiert. Ein pausierter Player wird dadurch nicht als laufend dargestellt. Abschnittswechsel werden während der Sitzung sofort gemerkt, damit eine schnelle Rückkehr zum Werk nicht auf eine ältere, noch nicht aktualisierte Leseposition fällt.

## Kompakte Mehrfachauswahl (21.10.2026)

Ab zwei Textstellen ersetzt ein aufklappbarer Zähler die dauerhaft sichtbare Stellenliste und doppelte Notiz-/KI-Aktionen. Bei voller iPad-Breite stehen Hauptwerkzeuge und Auswahlaktionen in einer gemeinsamen Zeile; in schmalem Split View liegt eine kurze Auswahlzeile darunter. Markieren, weitere Stelle und Auswahl aufheben sind direkt erreichbar. Notiz und KI-Hilfe bleiben in der Hauptgruppe und beziehen sich auf die beim Zähler genannte aktive Stelle. Die seitliche Leiste zeigt die vier Auswahlaktionen in einem Raster mit mindestens 44 × 44 Pixel großen Touch-Flächen.

Der Zähler öffnet eine begrenzte, bei Bedarf scrollbar bleibende Stellenliste mit Wechsel, einzelner Abwahl, „Alle abwählen“ und Lesezeichen für die aktive Stelle. Escape, Tippen außerhalb, Werkzeugwechsel und Verschieben schließen sie. Wechsel und Abwahl ändern keine gespeicherten Notizen; getrennte Entwürfe bleiben erhalten. `compact-selection.spec.ts` prüft Höhe, Touch-Flächen, Überschneidungen, alle vier Dockränder, Hoch-/Querformat, Split View, geöffneten Player, Stellenwechsel und Abwahl. Die bestehenden Interaktionstests prüfen außerdem das Speichern mehrerer Markierungen ohne den Text zwischen den ausgewählten Stellen.


## Ruhige Auswahl und direkter Notizinhalt (21.10.2026)

Eine einzelne Auswahl erweitert keine zweite Werkzeugleiste mehr. Notiz und KI-Hilfe bleiben in der vorhandenen Gruppe; daneben liegen Markieren und ein kleines Auswahlmenü mit Versreferenz. Weitere Stelle, Lesezeichen und explizites Aufheben sind dort erreichbar. Die Versnummer wird nur farblich betont, ohne gefüllten Kasten und Randbalken.

Ein kurzer Tipp neben den Text oder auf unmarkierten Text hebt die Auswahl auf. Scrollen, langes Drücken, native Auswahlgriffe, Mehrfinger-Zoom und Eingaben in Werkzeugen bleiben davon ausgenommen. Während einer ausdrücklich begonnenen Bereichsauswahl legt ein Texttipp weiterhin das Ende fest. Escape schließt zuerst das offene Menü bzw. Werkzeug und hebt danach die passive Auswahl auf. Gesicherte Einträge und Entwürfe bleiben erhalten.

Ein Tipp auf ein gespeichertes Highlight zeigt unmittelbar den vollständigen Notiztext und die gespeicherte KI-Erklärung. Bei überlappenden Bereichen erscheinen nur Einträge, die tatsächlich an der angetippten Stelle liegen; eine längere Erklärung zieht nicht die Notizen benachbarter Verse mit hinein. Die Originalfarbe bleibt beim Lesen des Inhalts sichtbar. Bearbeiten ist eine eigene kleine Aktion. Die Daten und kanonischen Anker werden dabei nicht verändert.

Safari-Auswahl wird vor Fokuswechseln intern festgehalten, aber erst beim feststehenden Klickziel veröffentlicht. So wächst oder zentriert sich die Werkzeugleiste nicht zwischen Pointer-Down und Pointer-Up unter dem Finger. Die Browserprüfungen decken schnelles Öffnen, alle Andockpositionen, Split View, Fokusmodus, Notizentwürfe, exakte Überlappungen und abgebrochene Gesten ab.


## Leserreise und Speichervertrauen (25.10.2026)

Die UX-Nachprüfung verwendete drei getrennte, kritisch arbeitende Agenten für Erstbesuch, Wiederfinden und Pencil-Speicherverhalten. Das sind simulierte Browserreisen mit synthetischen Daten, keine Studie mit Schülerinnen und Schülern und kein physischer Apple-Pencil-Test.

- Das Notizbuch zeigt Werk, Suche und gespeicherte Inhalte zuerst. Typ, Farbe und Bedeutung liegen unter „Filter“; aktive Filter bleiben am geschlossenen Schalter sichtbar. Auswahl und Filterzustand bleiben beim Wechsel erhalten. Die Suche berücksichtigt auch Beobachtungen, Zitate, ursprüngliche Fragen und Unsicherheitstexte gespeicherter Analysen.
- Ein kompakter Notizbuch-Zugang im Notizkopf verbindet die Textstelle direkt mit der Sammlung. Bei knapper Breite darf der Kopf umbrechen. Bei eingeblendeter Bildschirmtastatur berücksichtigt die Inline-Karte den verfügbaren Viewport und den Lesefuß, damit die Speicheraktion erreichbar bleibt.
- Pencil unterscheidet „Entwurf auf diesem Gerät gesichert“ und den durch „Fertig“ gespeicherten Notizbucheintrag. Der Lesemodus zeigt den noch offenen Entwurf mit direkter Speicheraktion. Das Notizbuch bietet gültige lokale Entwürfe separat zum Weiterbearbeiten an; ihr Auffinden verändert weder bestehende Daten noch unbekannte Formate oder Wiederherstellungsjournale.
- Schlägt die Entwurfssicherung fehl, bleibt die Warnung beim Wechsel zu Lesen sichtbar. Ein synchroner Sicherungsversuch erfolgt vor internen Ansichts-, Buch- und Abschnittswechseln, vor der Tour sowie der Zurück-Navigation. Schlägt er fehl oder läuft noch eine Texteingabe/Speicherung, bleibt die aktuelle Seite erhalten. Die bewusste Speicherung nach IndexedDB bleibt als unabhängiger Weg verfügbar. Ein asynchroner Buchabruf prüft vor seiner Übernahme nochmals, ob inzwischen ungesicherte Änderungen entstanden sind.
- Freie Schrift ohne Markierung führt direkt zu „Textstelle markieren“. Mehrdeutige Zuordnungen verwenden eine eigene kleine Auswahl statt der vollständigen Pencil-Einstellungen. Originalstriche bleiben unverändert.
- „Rückgängig“ und bei Bedarf „Wiederholen“ betreffen die Entwurfshistorie, einschließlich Radieraktionen. Cmd/Ctrl-Z und Shift-Z lassen Textfelder ihre native Historie behalten. Neue Änderungen verwerfen Redo; ein erfolgreiches „Fertig“ beendet diese Historie. Bereits bestätigte Speichertransaktionen werden nicht durch einen alten Zeichenzustand überschrieben.
- Gespeicherte Originalhandschrift verwendet die aktuelle Papier-/Textfarbe und bleibt auch im Nachtmodus kontrastreich.

Neue gezielte Regressionen: `notebook-ux.spec.ts`, `pencil-trust.spec.ts`; ergänzt wurden die bestehenden Onboarding-, Auswahl-, Schreib- und Workspace-Prüfungen. Geprüfte Fehlerbilder umfassen gesperrte Entwurfsschreibvorgänge, Werkzeugwechsel, Wiederherstellung nach Reload, genaue Originalpfade, Radieren/Redo, volle Analysesuche und ein Fenster von 680 × 430 Pixeln. UI-Prüfungen fangen Modellaufrufe ab; sie belegen keine aktuelle Erkennungsqualität eines externen Anbieters. Browser-/Gerätedaten können durch Löschen des Browserprofils oder Geräteverlust weiterhin verloren gehen; die explizite Sicherung/Geräteübertragung bleibt dafür erforderlich.
