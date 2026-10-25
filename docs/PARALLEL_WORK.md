# Parallele Buchtutor-Arbeit · 25.10.2026

Mateo hat drei eigene Chats im gemeinsamen Ordner beauftragt. Arbeitsverzeichnis für alle Änderungen und Terminalaufrufe ist `/Users/mateo/Documents/Buchtutor`; der im Desktop geerbte Projektpfad `gym-mog-arena` ist für diese Arbeit nicht relevant. Keine zusätzlichen Checkouts, Branchwechsel oder Worktrees. Die gemeinsame Basis wird vom koordinierenden Chat „Buchtutor mit Apple Pencil erweitern“ veröffentlicht.

## Exklusive Zuständigkeiten

| Chat | Änderbare bestehende Dateien | Eigene neue Dateien / Nachweise |
| --- | --- | --- |
| Hörbuch | `components/reader-audio.tsx`, `app/audio.css`, `tests/browser/audiobook.spec.ts` | `components/audio-*`, `hooks/use-audio-*`, `tests/browser/audio-parallel.spec.ts`, `work/parallel/audio/` |
| Notizbuch | `components/reader-notes.tsx`, `components/notebook-drafts.tsx`, `app/notebook.css`, `tests/browser/notebook-ux.spec.ts`, `tests/browser/notebook-navigation.spec.ts` | `components/notebook-*` (außer fremden bestehenden Dateien), `tests/browser/notebook-parallel.spec.ts`, `work/parallel/notebook/` |
| Pencil | `components/reader-pencil.tsx`, `components/pencil-eraser-options.tsx`, `components/pencil-handwriting-hint.tsx`, `app/pencil.css`, `app/pencil-trust.css`, `tests/browser/pencil-safety.spec.ts`, `tests/browser/pencil-trust.spec.ts`, `tests/browser/eraser-modes.spec.ts` | `components/pencil-*` (außer fremden bestehenden Dateien), `tests/browser/pencil-parallel.spec.ts`, `work/parallel/pencil/` |
| Koordination | Alle übrigen Dateien, insbesondere `reader-app`, `reader-workspace`, Auswahl, gemeinsame Hooks, Speicher-/Ankermodelle, Konfiguration, Package-Dateien, diese Vereinbarung, Git, Integration und Deploy | `work/parallel/coordination/` |

Alle dürfen lesend das ganze Repository untersuchen. Änderungen außerhalb der eigenen Grenzen als konkreten Vorschlag im eigenen Bericht hinterlegen. Fremde Änderungen niemals zurücksetzen, überschreiben, formatieren oder mit einem alten Stand ersetzen. Bestehende Props und gemeinsame APIs rückwärtskompatibel erhalten. CSS unter eigenen Audio-/Notebook-/Pencil-Klassen kapseln; keine globalen Toolbar-, Button- oder Layout-Overrides.

## Tests und Laufzeit

- Node 24: `PATH=/Users/mateo/.nvm/versions/node/v24.7.0/bin:/opt/homebrew/bin:$PATH`, Shell `login:false`.
- Tests verwenden isolierte Browser-Kontexte mit synthetischen Daten; keine persönlichen Notizen oder echte bezahlte KI-Aufrufe. `/api/analysis` und `/api/handwriting` abfangen. Chromium sowie WebKit mit 834×1194 und 1194×834 prüfen.
- Jeder Playwright-Aufruf bekommt `--workers=1 --output=work/parallel/<bereich>/results-<lauf>`; Logs/Screenshots ebenfalls nur im eigenen Ordner. Keine gemeinsamen Standard-Testverzeichnisse leeren.
- Builds, Dev-/Startserver und Browserprüfung teilen sich `.next`: vor dem gesamten Build–Server–Browser-Zyklus exklusiv `mkdir work/parallel/validation.lock` verwenden. Nur bei Erfolg Eigentümer/Prozess und Bereich in der Lock-Datei dokumentieren. Bei belegtem Lock erst unabhängige Arbeit erledigen; fremdes Lock nicht entfernen. Eigene Server nach dem Zyklus beenden, dann nur das eigene Lock entfernen. Freie Portzuordnung: Audio 3103, Notizbuch 3104, Pencil 3105. Keine gemeinsamen laufenden Server stoppen.
- Keine eigenen `git add`, Commits, Pushes, Resets, Pulls, Installationen, Lockfile-Änderungen oder Deploys. Die Koordination integriert und veröffentlicht nach Gesamtprüfung.
- Ein Fehler aus einer fremden, noch laufenden Änderung ist kein Auftrag, diese Datei zu reparieren. Im eigenen Bericht mit Reproduktion benennen.

## Produktregeln

Zuerst `AGENTS.md`, `docs/PROJECT_DIRECTION.md`, `docs/READER_WORKSPACE.md` und relevante lokale Next.js-Dokumentation lesen. iPad zuerst, kurze deutsche Texte, mindestens 44px große Touch-Ziele, keine weiteren permanenten Leisten. Auswahl und Entwürfe bleiben bei Wechseln erhalten. Originalhandschrift niemals durch OCR ersetzen; kanonische Anker, bestehende Speicherkennungen und verschlüsselte Sicherungsformate unverändert lassen. Nur menschlich eingesprochene Hörbücher. Keine neuen Bibliotheken oder KI-/Audio-Ausgaben. Kein Impeccable. Keine weiteren Chats/Subagenten starten.

Abschluss pro Chat: `work/parallel/<bereich>/REPORT.md` mit beobachteten Problemen, umgesetzter Lösung, exakter Dateiliste, Tests, Screenshotpfaden, offenen Grenzen und nötigen Integrationsänderungen. Danach eine eigenständige Abschlussantwort im eigenen Chat. Die Koordination liest die Ergebnisse; ohne weitere ausdrückliche Nutzeranweisung keine Nachrichten an fremde Chats senden.
