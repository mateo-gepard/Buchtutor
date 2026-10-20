# Interaktive Einführung

Beim ersten Besuch erscheint nach dem Laden des Gerätespeichers eine Einladung in der aktuellen Ansicht. Erst „Gemeinsam ausprobieren“ beginnt die zehn Schritte; „Direkt lesen“ schließt die Einladung. Abschließen, Überspringen, das Kreuz und Escape merken den Abschluss unter `buchtutor-onboarding-v1`. Die bestehende Kennung bleibt erhalten, damit frühere Besucher nicht erneut beginnen müssen. Das Fragezeichen in beiden Kopfzeilen und „Einführung erneut starten“ in den Leseeinstellungen öffnen die Einladung erneut. Die Kennung wird nicht in die verschlüsselte Geräteübertragung aufgenommen. Jeder Schritt lässt sich auch ohne erledigte Übung weiterblättern.

Eine SVG-Maske dunkelt die Seite ab und lässt die aktuellen Werkzeuge hell und bedienbar. Die Maske fängt andere Pointer-Ereignisse ab. Übrige Zweige der Oberfläche sind vorübergehend `inert`; ihr ursprünglicher Zustand wird danach wiederhergestellt. Die nichtmodale Erklärungskarte und die erlaubten Werkzeuge bilden den Tastaturbereich. Tab/Umschalt+Tab bleiben darin, Escape überspringt. Die Karte passt sich an Scrollen, Drehung, VisualViewport und Pencil-Position an; Reduced Motion wird berücksichtigt. Auf kleinen Displays bleibt sie scrollbar.

Die zehn Schritte bilden drei Kapitel: **Eine Stelle bearbeiten**, **Gedanken ergänzen**, **Wiederfinden**. Sie bleiben möglichst im selben Arbeitskontext und führen die eigene Auswahl, Markierungsfarbe und Notiz weiter:

1. Eine Versnummer antippen oder Text auswählen.
2. Mit echten Pencil-Gesten eine Probemarkierung zeichnen und ihre Farbe wählen.
3. Schrift zeichnen; Hinweis auf Safari/Kritzeln.
4. Einen Schriftstrich oder eine Wortmarkierung radieren und rückgängig machen.
5. Einen eigenen Gedanken als Probenotiz zur gleichen Textstelle schreiben.
6. Eine Analyseart wählen, ohne eine KI-Anfrage zu starten.
7. Figurennamen wählen und die Auswahl sehen.
8. Ein Probe-Lesezeichen setzen.
9. Die eigene Probenotiz mit gleicher Farbe und gleichem Textanker im Übungsnotizbuch wiederfinden und den Farbfilter verwenden.
10. Den Ablauf im Überblick abschließen und einen kurzen Hinweis auf die verschlüsselte Geräteübertragung erhalten.

Kapitelanzeige, Schrittzähler, Symbole und eine kurze Aufgabenkarte geben Orientierung. Rückmeldungen beziehen sich auf die konkrete Aktion. Die nächste Schaltfläche benennt den folgenden Vorgang. Die Karte blendet sich vor einem Schrittwechsel aus und nach dem Layout des neuen Ziels wieder ein; eine passende Kartenposition wird beibehalten. Escape oder Überspringen bricht auch einen laufenden Übergang ab. Reduced Motion schaltet die Bewegung aus. Die Übungen sind optional. Es werden keine KI-Anfragen gestartet und keine Übungsnotizen, -markierungen, -schrift oder -lesezeichen in IndexedDB oder als Entwurf gespeichert. Analyseknöpfe zeigen lediglich die Auswahl; es gibt keine vorgetäuschte KI-Antwort. Der Pencil verwendet dafür einen separaten Komponenten-Zustand mit deaktivierter Speicherfunktion. Auch seine Übungsposition schreibt nicht in die echte Leistenpräferenz. Bestehende Entwürfe werden nachher wieder geladen.

Seit 20.10.2026 geht ein erstmals erfolgreich ausprobierter Schritt automatisch weiter: erst die konkrete Erfolgsmeldung, dann 1,8 Sekunden Ruhezeit, anschließend der bestehende weiche Übergang. Neue Eingaben setzen die Wartezeit zurück. Während einer Pointer-Geste, Texteingabekomposition oder bei inaktivem/verdecktem Fenster wird nicht weitergeschaltet. „Hier bleiben“ deaktiviert die Automatik für diesen Schritt. Zurückblättern zu einer schon erledigten Aufgabe löst keinen erneuten automatischen Wechsel aus; Einladung und Abschluss wechseln ausschließlich per Knopfdruck. Aufgaben zählen nur im gerade aktiven Schritt. Die virtuelle Uhr der Browsertests prüft Rückmeldung, Verzögerung, Eingaben, Gesten, Zurück, Anhalten und Abbruch ohne mehrsekündige reale Wartepausen.

Das Übungsnotizbuch enthält ausschließlich die flüchtige Übungsnotiz. Ohne Eingabe erscheint ein ausdrücklich als Beispiel benannter Gedanke. Nur der zur Übungsfarbe passende Filter zählt als erfolgreich ausprobiert; andere Farben zeigen den echten leeren Filterzustand. Ein Klick auf die Übungsnotiz öffnet wieder ihren Notizschritt. Löschen und Export sind nicht Teil der Übung. Der Abschluss erklärt das Verwerfen der Übung und die Rückkehr in die vorherige Ansicht.

Die echte Auswahl, Frage, Analyse, Notizentwürfe und Figurenauswahl bleiben von den Übungen getrennt. Automatisches Speichern der Leseposition und die normale Positionserhaltung beim Resize pausieren während der Tour. Nach Ende wird die vorherige Ansicht mit Textanker und Werkzeugzustand wiederhergestellt. URL, Werk und Abschnitt ändern sich nicht.

`tests/browser/onboarding.spec.ts` prüft Einladung und Ablehnen ohne Ansichtswechsel, den kompletten Durchlauf mit echten Maus-/Bedienelement-Aktionen, Pointer-Durchlass im Spotlight, Erfolgsmeldungen, eigene Notiz und passenden/unpassenden Farbfilter, Radierer/Undo, fehlende KI-/Notiz-/Lesefortschritt-Schreibvorgänge und den Erhalt eines echten Pencil-Entwurfs nach einer Übung. Dazu kommen Zähler, Skip/Escape während des Übergangs/Zurück/Neustart, Bildschirmdrehung, Tastatur und alle zehn Schritte bei 320 × 568 px mit Reduced Motion. Desktop-/mobiles Chromium und iPad-WebKit im Hoch-/Querformat werden geprüft. Bestehende Featuretests verwenden `reader-test.ts` als wiederkehrende Besucher; die Einführungstests starten mit frischem Kontext.

Quellen, Diagnose und Grenzen der Recherche stehen in [ONBOARDING_RESEARCH.md](ONBOARDING_RESEARCH.md). Die technischen Prüfungen ersetzen keinen Verständnistest mit echten Erstbenutzern.
