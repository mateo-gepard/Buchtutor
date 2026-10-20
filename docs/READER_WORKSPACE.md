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
- Farbe, Schreiben, Radierer, Rückgängig und „Fertig“ sind direkt erreichbar. Ein kleines Farbmenü enthält die fünf Farben und den Zugang zu ihren Bedeutungen. Der Pencil-Schalter schließt den Zeichenmodus mit erhaltenem Entwurf.
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
