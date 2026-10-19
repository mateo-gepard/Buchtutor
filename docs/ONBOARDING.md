# Interaktive Einführung

Zehn kurze Schritte starten einmal pro Browser nach dem Laden des Gerätespeichers. Abschließen, Überspringen, das Kreuz und Escape merken den Abschluss unter `buchtutor-onboarding-v1`. Das Fragezeichen in beiden Kopfzeilen und „Einführung erneut starten“ in den Leseeinstellungen öffnen die Tour erneut. Die Kennung wird nicht in die verschlüsselte Geräteübertragung aufgenommen. Jeder Schritt lässt sich auch ohne erledigte Übung weiterblättern.

Eine SVG-Maske dunkelt die Seite ab und lässt die aktuellen Werkzeuge hell und bedienbar. Die Maske fängt andere Pointer-Ereignisse ab. Übrige Zweige der Oberfläche sind vorübergehend `inert`; ihr ursprünglicher Zustand wird danach wiederhergestellt. Die nichtmodale Erklärungskarte und die erlaubten Werkzeuge bilden den Tastaturbereich. Tab/Umschalt+Tab bleiben darin, Escape überspringt. Die Karte passt sich an Scrollen, Drehung, VisualViewport und Pencil-Position an; Reduced Motion wird berücksichtigt. Auf kleinen Displays bleibt sie scrollbar.

Die Schritte:

1. Titel/Autor in der echten Bibliothekssuche ausprobieren.
2. Inhalt, Suche, Teilen und Leseposition kennenlernen.
3. Eine Versnummer antippen oder Text auswählen.
4. Mit echten Pencil-Gesten eine Probemarkierung zeichnen, Farbe und Leistenposition ausprobieren.
5. Schrift zeichnen, radieren und rückgängig machen; Hinweis auf Safari/Kritzeln.
6. Analyseart auswählen oder eine Probenotiz schreiben.
7. Figurennamen wählen und die Auswahl sehen.
8. Ein Probe-Lesezeichen setzen; Hinweise zu Aa und Fokus.
9. Einen echten Farbfilter im Notizbuch wählen.
10. Verschlüsselte Dateiübertragung verstehen.

Icons, zehn Fortschrittspunkte und eine kurze Aufgabenkarte geben Orientierung. Erfolgreiche Aktionen wechseln die Aufgabenkarte zu „Geschafft!“. Die Übungen sind optional. Es werden keine KI-Anfragen gestartet und keine Übungsnotizen, -markierungen, -schrift oder -lesezeichen in IndexedDB oder als Entwurf gespeichert. Analyseknöpfe zeigen lediglich die Auswahl; es gibt keine vorgetäuschte KI-Antwort. Der Pencil verwendet dafür einen separaten Komponenten-Zustand mit deaktivierter Speicherfunktion. Auch seine Übungsposition schreibt nicht in die echte Leistenpräferenz. Bestehende Entwürfe werden nachher wieder geladen.

Die echte Auswahl, Frage, Analyse, Notizentwürfe und Figurenauswahl bleiben von den Übungen getrennt. Automatisches Speichern der Leseposition und die normale Positionserhaltung beim Resize pausieren während der Tour. Nach Ende wird die vorherige Ansicht mit Textanker und Werkzeugzustand wiederhergestellt. URL, Werk und Abschnitt ändern sich nicht.

`tests/browser/onboarding.spec.ts` prüft den kompletten Durchlauf mit echten Maus-/Bedienelement-Aktionen, Pointer-Durchlass im Spotlight, Erfolgsmeldungen, Radierer/Undo, fehlende KI-/Notiz-/Lesefortschritt-Schreibvorgänge und den Erhalt eines echten Pencil-Entwurfs nach einer Übung. Dazu kommen Zähler, Skip/Escape/Zurück/Neustart, Bildschirmdrehung, Tastatur und alle zehn Schritte bei 320 × 568 px mit Reduced Motion. Desktop-/mobiles Chromium und iPad-WebKit im Hoch-/Querformat werden geprüft. Bestehende Featuretests verwenden `reader-test.ts` als wiederkehrende Besucher; die Einführungstests starten mit frischem Kontext.
