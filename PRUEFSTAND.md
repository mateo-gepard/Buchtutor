# Buchtutor Fokus – Prüfstand

Stand: 26. September 2026. Version 0.2.4.

## Inhaltsverzeichnis: Positionierung im Produktionsbuild

- Die Seitenleiste verwendet eine eigene linke Positionierung ohne die Zentrierungs- und Versatzklassen normaler Dialogfenster. Der CSS-Optimierer entfernte zuvor die Gegenregel `translate:none`, wodurch das Inhaltsverzeichnis oben und links aus dem Bildschirm ragte.
- Beim Schließen wird der tatsächlich betätigte Knopf fokussiert. Das funktioniert auch in WebKit, wo ein Klick den aktiven Tastaturfokus nicht automatisch auf diesen Knopf setzt.
- 32 Browserprüfungen gegen `next build` und `next start` bestanden: Desktop-/Handy-Chromium sowie WebKit im iPad-Hoch-/Querformat. Geprüft sind vollständige Menüposition, Erreichbarkeit des letzten Kapitels, Kapitelwechsel, Erhalt der Lesestelle, Fokusrückgabe und weiterhin zentrierte Einstellungsdialoge. Bestehende Lesezeichen-, Übertragungs-, Teilen- und 404-Prüfungen bleiben erfolgreich.
- Desktop- und iPad-Ansicht visuell geprüft; ESLint, TypeScript und Produktionsbuild erfolgreich. Modellanfragen werden in diesen Tests abgefangen. Kein iPad-Hardwaretest.

## Lesezeichen, Teilen und 404, Version 0.2.4

- 27 Funktionstests bestanden. Neue Prüfungen decken idempotentes Setzen eines Lesezeichens, Entfernen mit übertragbarer Löschmarkierung, blockierte automatische Schreibvorgänge bei ausgeschaltetem Schalter, Übernahme älterer Sicherungen und verschlüsselte Übertragung von Lesezeichen, Lesestand und Automatik-Einstellung ab.
- 61 Browserprüfungen bestanden in Desktop-/Handy-Chromium und WebKit für iPad-Hoch-/Querformat; drei reine Mausprüfungen sind auf Touch-Profilen absichtlich übersprungen. Alle bisherigen Auswahlprüfungen bleiben erfolgreich.
- In jedem der vier Profile wurde ein manuelles Lesezeichen gesetzt, entfernt und erneut gesetzt, eine verschlüsselte Sicherung heruntergeladen und in einen unabhängigen Browser-Kontext importiert. Lesezeichenfilter, Rücksprung zur Originalstelle und ausgeschaltete Automatik bleiben nach der Übertragung erhalten.
- Automatisches Speichern, Ausschalten ohne weitere Fortschrittsschreibvorgänge, persistierte Einstellung, erneutes Einschalten und Wiederaufnahme nach Neuladen geprüft. Die erweiterte Auswahlleiste wurde zusätzlich bei 320 px geprüft: keine überstehenden Knöpfe, mindestens 44 px große Bedienflächen.
- Geteilte Links enthalten nur kanonische Navigationsdaten und öffnen den richtigen Vers. Kopieren und native Freigabe wurden mit simulierten Browser-Schnittstellen geprüft, ohne Nachrichten zu versenden. Social-Links sind direkte Links ohne Drittanbieter-Skripte. Werktitel und Buchtutor-Grafik erscheinen in den Open-Graph-Metadaten.
- Unbekannte Pfade liefern HTTP 404 und die neue Ansicht. Auch fehlende Werke zeigen die neue Ansicht; Bibliotheks- und Notizbuchlinks funktionieren. Linkvorschau, Handy-Teilen-Menü und iPad-404 visuell geprüft.
- ESLint und TypeScript im Produktionsbuild erfolgreich. Der bekannte CSS-Parserhinweis zum Custom-Highlight-Pseudoelement bleibt unverändert. Keine echten Modellgenerierungen in diesen Prüfungen. WebKit unter Windows ersetzt keinen echten iPad-Hardwaretest.

## Besucherstatistik und KI-Verbrauch, Version 0.2.3

- Bestehende Vercel Web Analytics war im Hobby-Projekt aktiviert. Die neue Einbindung wurde veröffentlicht; ein kontrollierter Besucheraufruf erreichte den Collector mit HTTP 200. Anschließende Vercel-Abfrage zeigte erfasste Besucher und Seitenaufrufe. Automatisierte Browser werden vom Anbieter normalerweise ausgeschlossen; für genau einen Prüflauf wurde ein regulärer Browser simuliert. Testbesuche können in der Statistik enthalten sein.
- URL-Parameter und Fragmente sind im tatsächlichen Collector-Payload entfernt. Ein Lesestellenwechsel erzeugt keinen zusätzlichen Pageview. Mit DNT bzw. GPC sowie auf `/verwaltung` wird das Analytics-Skript nicht geladen. Keine Custom Events oder Übermittlung persönlicher Leseinhalte.
- 21 Funktionstests bestehen: darunter genaue Kostenübernahme, fehlende Kosten vs. Null, Reasoning als Teil der Ausgabe-Tokens, Zählung trotz abgelehnter KI-Ausgabe, unbekannte Metrikfelder, Sitzungssignatur, Manipulation, Ablauf und Passwortwechsel. Providerantworten wurden simuliert, keine echten Modellgenerierungen.
- Echter Redis-Integrationstest erfolgreich: UTC-Tageswerte, atomare Inkremente, Wiederholungs-Deduplizierung, 90-Tage-TTL und Trennung von Preview/Production/Development. Ausschließlich synthetische Entwicklungsdaten aus dem Jahr 2099 verwendet und anschließend gelöscht.
- Geschützte Übersicht auf der produktiven HTTPS-Adresse in Chromium (Desktop/Handy) und WebKit (iPad Hoch-/Querformat) geprüft: korrekte Anmeldung, abgewiesene falsche Passwörter/fremde oder fehlende Origin, HttpOnly-/Secure-/SameSite-Strict-Header, sieben Tageszeilen, kein Seitenüberlauf, Abmeldung und gesperrter Zugriff nach Neuladen. Keine JavaScript-Fehler. Windows-WebKit meldet SameSite in seiner Cookie-Inspektion abweichend als None; der tatsächlich gelieferte Strict-Header wurde daher browserübergreifend geprüft. Ein echter iPad-Hardwaretest bleibt separat.
- Eine vorbereitete Analyse auf Production angefordert: als vorhandene Antwort erfasst, keine neue Provideranfrage und keine Modellkosten. Kosten echter Luna-Antworten wurden mit Abrechnungs-Fixtures geprüft; die Live-Modellverbindung wurde nicht getestet. Fehlende oder verlorene Abrechnungsdaten werden nicht als vollständige Rechnung ausgegeben.
- STATS_PASSWORD als serverseitiges Production-Secret eingerichtet. Zugangsdaten separat in einer privaten lokalen Datei, außerhalb des Quellcodearchivs und Deployments. Schülerdaten bleiben lokal. Datenschutzhinweise an die neue Statistikfunktion angepasst; gewünschte Betreiberplatzhalter bleiben offen.
- ESLint, TypeScript im Produktionsbuild und Vercel-Build erfolgreich. Deployment dpl_8Vz2qJKwoL62TkqTpTCmWhSHpJcH ist Ready auf www.buchtutor.de. Vorhandener CSS-Parserhinweis zum Custom-Highlight-Pseudoelement bleibt ohne Buildfehler.

## Buchtutor, Version 0.2.2

- Name und Vektormarke in der Bibliothek und im Notizbuch; angepasste helle Variante im Nachtmodus. Favicon, iPad-Startbildschirm-Icon, Web-App-Manifest, Seitentitel, rechtliche Seitentitel und Dateinamen umgestellt.
- Sechs Browserprofile geprüft: Desktop-Chromium 1440×900, WebKit 834×1194 und 1194×834, mobiles Chromium und WebKit 390×844 sowie WebKit 320×740. Header ohne Überlauf oder überlappende Knöpfe; alle Header-Schaltflächen mindestens 44×44 px. Bibliothek, Werköffnung, Notizbuch und Rücknavigation bedienbar; Nachtmodus bleibt nach Neuladen erhalten.
- Manifest und sämtliche referenzierten Icons erreichbar. Der explizite Apple-Icon-Link wurde nach einer fehlenden Verknüpfung im ersten Produktionsbuild ergänzt. Keine JavaScript-Laufzeitfehler in den geprüften Ansichten.
- Synthetische Bestandsnotiz unter dem ursprünglichen IndexedDB-Namen bleibt sichtbar. Markdown-Download heißt Buchtutor-Notizen.md. Verschlüsselter Download heißt Buchtutor-Datum.buchtutor und lässt sich entschlüsseln. Dateien mit .leseraum und .buchtutor wurden jeweils in einen frischen Browser-Kontext importiert; Notizen bleiben nach Neuladen erhalten.
- Die 17 vorhandenen Funktionstests und ESLint bestehen. Keine realen Modellanfragen während dieser Prüfung. Textanker, Notizschema, lokale Speicherkennungen, Geräteschlüssel, Sicherungsformat und Cloud-Cache-Kennungen sind unverändert.
- Produktionsbuild lokal und auf Vercel erfolgreich, einschließlich TypeScript. Deployment dpl_4rcKR7tf5LbkagM1Xf3jRSZL8viP ist Ready. Die bereits in Vercel konfigurierte Adresse www.buchtutor.de liefert die neue Version; buchtutor.de leitet auf www weiter. Die bisherige Adresse leseraum.vercel.app bleibt ohne Weiterleitung erreichbar. Apple-Icon-Link auf allen drei Adressen geprüft. In diesem Durchgang wurde keine Domain gekauft oder DNS-Konfiguration geändert.
- Echte iPad-Hardware und die Ablage in der iPad-Dateien-App sind weiterhin separat zu prüfen. Lesedaten bleiben an die jeweilige Domain gebunden; für den Domainwechsel ist eine Sicherung nötig.

## Textauswahl, Version 0.2.1

- 37 erfolgreiche Browserprüfungen in Chromium (1440×900 und 390×844) und WebKit (834×1194 und 1194×834); drei Mausprüfungen auf Touch-Profilen absichtlich übersprungen.
- Vorwärts-/Rückwärtsauswahl, Element-Endpunkte, angrenzende unberührte Verse, Teilwörter, verschachtelte Figuren und gespeicherte Markierungen behalten die richtigen Quellenanker.
- Schneller Werkzeug-Tap übernimmt die neuesten Auswahlgriffe vor Fokusverlust; Notiz speichern, neu laden und erneut auswählen geprüft. Analyseanfragen nutzen die zuletzt gewählte Passage.
- Zwei-Tap-Modus startet ohne alten Auswahlanker, funktioniert rückwärts und lässt sich auf dem Handy bedienen. Kopieren entfernt Versnummern und Bedienoberfläche.
- Abgebrochene Scroll-/Pointer-Gesten öffnen keine Figuren. Tastaturbedienung, spätere Selection-Events, Drehung, Auswahl außerhalb des Lesetexts, Löschen, Abschnittswechsel und Fokusmodus geprüft.
- Die 17 vorhandenen Funktionstests, TypeScript und ESLint bestehen weiterhin. Sämtliche Modellanfragen der Browserprüfungen wurden abgefangen; keine KI-Kosten.
- Vercel-Produktionsbuild erfolgreich. Vier zusätzliche Prüfungen auf leseraum.vercel.app bestätigen schnelle Werkzeug-Taps, Notizspeicherung/Neuladen und Zwei-Tap-Auswahl in mobilem Chromium und WebKit. Nach der Korrektur überdeckender Hinweise bestehen auch die acht gezielt wiederholten lokalen Prüfungen.
- Der öffentliche Status-Endpunkt meldet inzwischen einen hinterlegten OpenRouter-Schlüssel. Seine Gültigkeit und tatsächliche Modellverbindung wurden in diesem Auswahl-Durchgang nicht geprüft.
- WebKit unter Windows ist kein iPad-Hardwaretest. Echte iOS-Auswahlgriffe, Lupe, OS-Menü und Bildschirmtastatur bleiben manuell zu prüfen.

## Bereits geprüfte Grundlage, Version 0.2.0

- Next.js-Produktionsbuild lokal und auf Vercel, TypeScript-Prüfung, ESLint.
- 17 automatisierte Funktionstests: Verschlüsselung, falsches Passwort, Manipulation, Größen-/Versionsgrenzen, Konflikte, wiederholter Import, Löschmarkierungen, jüngste Lesestände, IndexedDB-Transaktionen, tolerante Auswahlgrenzen einschließlich Negationserhalt, Editionsgrenzen, Kontextgrenzen, OpenRouter-Luna/max/ZDR-Konfiguration mit simuliertem Provider sowie Belegprüfung.
- Korpuscheck: neun Werke, 38 vorbereitete Analysen, 182 Prüfgruppen; Iphigenie 2.174 Verse; Faust bis 4.612, Quelllücke 4.335–4.342 erhalten.
- Echter Upstash-Test in Frankfurt: Schreiben/Lesen einer synthetischen Standardanalyse, Ablehnung privater Fragen, Sperren, atomare Lastgrenze, 50 neue Anfragen pro Tag. Nur eigene Testschlüssel anschließend entfernt.
- API-Prüfung lokal und öffentlich: vorbereitete Antwort, falsche Textanker/Editionen, Fremdursprung, sachfremde Programmierfrage, Metrik bei Prosa, neun Buch-Endpunkte. Private Notiz-/Fortschritts-Endpunkte antworten 410.
- Öffentlicher Cache-Leseweg funktioniert; bei fehlender Analyse wird ausdrücklich der noch fehlende OpenRouter-Schlüssel gemeldet.
- Chromium-Browser in 834×1194, 1194×834, 390×844 und 1440×900: Bibliothek, native Textauswahl, Versauswahl, direkt zu Vers 322, Fokusmodus, Hilfeblatt/Seitenpanel, Figurenpaar, Schrift/Nachtmodus, Notiz und Analyse speichern, Neuladen, verschlüsselter Import mit Vorschau und Übernahme.
- Inhaltsverzeichnis öffnet und schließt bei gleicher verankerter Position. Beim geprüften Breitenwechsel blieb der Anker bis auf 2 px erhalten.
- Kein horizontaler Überlauf in den geprüften Leseransichten.

## Bewusste Grenzen

- Kein echter Live-Aufruf von Luna: Betreiber richtet OPENROUTER_API_KEY später ein. Konfiguration und Ausgabeprüfung wurden mit simuliertem Provider getestet.
- Echter iPad/Safari-Hardwaretest mit Touch-Auswahl und Bildschirmtastatur steht aus. Browsergrößen allein ersetzen ihn nicht.
- Der frühere Download-Timeout des In-App-Browsers aus Version 0.2.0 wurde durch erfolgreiche Chromium-Downloads in Version 0.2.2 ergänzt. Dateierhalt im echten iPad-Dateisystem ist weiterhin Teil des Hardwaretests.
- CSS-Build meldet einen Parserhinweis zum gültigen Custom-Highlight-Pseudoelement. Die Markierung funktioniert im geprüften Browser; Build erfolgreich.
- Vollständige fachliche Editionsprüfung/Reclam-ISBN-Abgleich offen.
- Impressum enthält auf Wunsch Platzhalter. Rechtliche Seiten sind klar als Entwurf gekennzeichnet.
- Keine automatische Migration/Löschung der alten Cloudflare-D1-Daten und keine automatische Synchronisation. Geräteübertragung ist ausdrücklich manuell.
