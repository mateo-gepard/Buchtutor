# Apple-Pencil-Modus

Im Reader das Pencil-Symbol antippen, Farbe wählen und mit dem Pencil über Wörter streichen. Der Finger scrollt im Lesetext. Die freie Markiergeste wird geometrisch auf vollständige Wörter und kanonische Textanker abgebildet; dafür ist kein KI-Aufruf nötig. Die einklappbare Werkzeugleiste enthält eine eigene Schreibfläche pro Markierung und eine Auswahl zwischen den aktuellen Markierungen. Auf Desktop ist auch eine Maus möglich. Auf der Schreibfläche werden Finger und Handballen nicht als Schrift übernommen.

„Fertig“ erkennt alle noch nicht transkribierten Schreibflächen einzeln und speichert die Markierungen mit ihren zugehörigen Notizen in einer gemeinsamen IndexedDB-Transaktion. Es wird nur die jeweilige Schreibfläche als PNG an `/api/handwriting` gesendet. Erkennung erfolgt über den bisherigen OpenRouter-Anbieter mit GPT-6 Luna / max und ZDR. Derselbe Gerätezähler und das Standort-Gesamtbudget wie bei Analysen gelten auch hier. Keine privaten Inhalte im gemeinsamen Cache, in Metriken oder Anwendungslogs. Unsichere Erkennung wird am gespeicherten Eintrag kenntlich gemacht. Notiztexte sind anschließend über „Im Text öffnen“ bearbeitbar. Originalschrift bleibt separat erhalten.

Schließen oder ein fehlgeschlagener Aufruf erhält den Entwurf im lokalen Browser-Speicher. Bereits erfolgreich erkannte Notizen werden bei einer Wiederholung nicht noch einmal angefragt. Wer stattdessen Text eingibt, übernimmt ausdrücklich diesen Text als Notiz; die Originalschrift bleibt dabei erhalten. Private Entwürfe verlassen den Browser erst beim ausdrücklich aufgerufenen „Fertig“.

Farbbedeutungen lassen sich in der Werkzeugleiste bearbeiten. Neue Markierungen und laufende Entwürfe erhalten die gewählte Bedeutung; bereits gespeicherte Einträge behalten ihre damalige Zuordnung. „Meine Notizen“ erlaubt die Suche nach Zitat, Notiz, Farbe und Bedeutung sowie getrennte Filter nach Werk, Farbe und Bedeutung. Verschlüsselte Übertragungen erhalten Farbe, Bedeutung und Originalschrift; ältere Sicherungen und Speicherkennungen bleiben kompatibel. Markdown enthält die erkannte Notiz und Farbbedeutung, keine Originalschrift.

## Betrieb und Tests

- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- `npx playwright test`: Desktop, Handy sowie iPad-Hoch-/Querformat in WebKit, einschließlich Fehlererholung und Speicherung.
- `npx tsx tests/api.integration.ts http://localhost:3001`: API-Grenzen ohne Live-Kosten.
- Nur ausdrücklich für echte kostenpflichtige Tests: `npx tsx scripts/check-ai-live.ts https://www.buchtutor.de --live --image=work/handwriting.png`. Das Bild ist eine synthetische Testschrift „Hain“, keine private Notiz. Ergebnis unter `work/ai-live-results.json`, ignoriert durch Git.

Der erste reale Test am 19.10.2026 zeigte einen Token-Abbruch bei Metrik und einen abgelehnten Beleg bei Konflikt. Das Reasoning-/Antwortbudget hat jetzt mindestens 24.000 Tokens (Standard 32.000, maximal 48.000). Der Provider hat 270 Sekunden Zeit, die Route 300 Sekunden. Eine geänderte Promptversion verhindert das Wiederverwenden früherer Antworten als angeblich neue Tests. Belegprüfung korrigiert ausschließlich eindeutige Blockzuordnungen, Typografie und Zeilenumbruch-Unterschiede gegen die tatsächliche Auswahl. Erfundene oder mehrdeutige Belege bleiben Fehler. Es gibt keinen stillen Wechsel von Modell oder Reasoning.

Emulation und synthetische Pointer-Ereignisse ersetzen keinen Test mit echtem iPad, Safari und Apple Pencil. Insbesondere Pencil-Hover, Handballen, Druckgefühl und echte Touch-/Pencil-Wechsel müssen auf Hardware beurteilt werden.
