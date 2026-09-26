# Buchtutor · Fokus

Lektüren lesen und verstehen, Textstellen untersuchen und Notizen sammeln. Für die Q12/Q13 in Bayern. Konzept A wurde vom Betreiber ausgewählt. Die Anwendung läuft als Next.js-Projekt auf Vercel; iPad-Hochformat nutzt eine Lesehilfe von unten, Querformat eine bei Bedarf geöffnete Hilfe neben dem Text.

Der sichtbare Name ist seit Version 0.2.2 **Buchtutor**. Die bestehende Vercel-Adresse und lokale Speicherkennungen bleiben erhalten, damit vorhandene Lesedaten weiter verfügbar sind. Neue Sicherungen enden auf `.buchtutor`; auch bisherige `.leseraum`-Dateien lassen sich importieren. Das Binärformat bleibt unverändert.

Die Vektormarke, Icons und die Social-Linkvorschau werden aus `lib/brand.ts` mit `npm run build:brand` erzeugt. Die gerasterten Bilder sind eingecheckte statische Dateien; Sharp wird über Next.js bereitgestellt. Der Web-App-Name und das iPad-Startbildschirm-Icon sind vorbereitet. Das Manifest bietet keine Offline-Garantie.

## Start und Prüfungen

Node.js 24 verwenden. In einer frischen Kopie:

```powershell
npm ci
npm run dev
```

Der Standardport ist 3000. Bei Belegung: `npx next dev --port 3001`.

Ohne Server-Geheimnisse funktionieren Lesen, lokale Notizen, Geräteübertragung und vorbereitete Analysen. Kopiere für die Cloud-Anbindung nur die Variablennamen aus `.env.example` nach `.env.local`; trage Geheimnisse ausschließlich dort oder in Vercel ein. Keine Geheimnisse ins Frontend, Git oder in Exportdateien.

```powershell
npm run test
npm run check:corpus
npm run lint
npm run build
npx tsx tests/api.integration.ts http://localhost:3000
```

Der optionale Cloud-Test benötigt die lokal geladenen Redis-Variablen. Er nutzt synthetische Testschlüssel und räumt ausschließlich diese auf:

```powershell
node --env-file=.env.local --import tsx tests/cloud.integration.ts
```

Auswahl-, Lesezeichen- und Teilen-Prüfungen gegen einen laufenden Server auf Port 3001:

```powershell
npx playwright install chromium webkit
npm run test:selection
```

`PLAYWRIGHT_BASE_URL` kann eine andere Test-URL setzen. Die Browserprüfungen fangen Modellanfragen ab und verbrauchen kein KI-Guthaben. 61 Prüfungen decken Chromium am Desktop/Handy und WebKit in iPad-Hoch-/Querformat ab; drei ausschließlich für die Maus bestimmte Kombinationen werden auf Touch-Profilen übersprungen. Dazu gehören der verschlüsselte Gerätewechsel mit Lesezeichen, die automatische Leseposition, native Freigabe mit simulierter Browser-Schnittstelle, Linkvorschauen, 404 und Bedienflächen bei 320 px. Native OS-Auswahlgriffe benötigen zusätzlich einen echten Gerätetest.

## Implementiert

- Bibliothek mit neun Werktexten, Volltextsuche, Inhaltsverzeichnis und direktem Nummernsprung.
- Fokusmodus; getrennt schließbares Inhaltsverzeichnis und Lesehilfe; anpassbare Schrift, Abstände, Hell/Warm/Nacht.
- Native Textauswahl mit stabiler Übergabe an Notizen/Analysen; Markierstift für Anfang/Ende per Antippen, auch auf dem Handy. Kopieren enthält nur den kanonischen Lesetext. Mehrere Notizen/Analysen einer Stelle bleiben einzeln erreichbar.
- Persönliche Notizen, Lesezeichen, Einstellungen, Lesestand und gespeicherte KI-Antworten in IndexedDB.
- Lesezeichen lassen sich in der festen Leseleiste und für ausgewählte Passagen setzen und entfernen. Unter „Meine Notizen“ gibt es einen Lesezeichenfilter.
- „Automatisches Lesezeichen“ in den Leseeinstellungen steuert das Merken und Wiederöffnen der letzten Lesestelle. Bei älteren Daten bleibt es standardmäßig eingeschaltet. Manuelle Lesezeichen und der Schalter werden mit der verschlüsselten Sicherung übertragen; das vorhandene Sicherungsformat bleibt kompatibel.
- Eigenes Teilen-Menü mit Web Share, Kopierfunktion und direkten Links zu WhatsApp, Telegram, Facebook und E-Mail. Geteilt werden Werk-/Abschnitts-/Textanker-Links, keine persönlichen Einträge. Open Graph und Twitter Cards verwenden die Buchtutor-Grafik und den Werktitel.
- Eigene 404-Seite für unbekannte Adressen und nicht vorhandene Werke/Abschnitte, mit Rückweg zur Bibliothek und zum Notizbuch.
- Komprimierte AES-256-GCM-Sicherungsdateien mit Passwort, Importvorschau, Zusammenführen und Konfliktkopien. Das ist manuelle Übertragung, keine automatische Synchronisation.
- Unverschlüsselter Markdown-Export als separate Funktion.
- Zehn ImageGen-Cover und neun Figuren-Porträttafeln. Namen, Beziehungen, Quellen und Auswahl sind echte UI; keine eingebrannten Beschriftungen.
- Figurenprofile, geprüfte Alias-Vorkommen und Zwei-Figuren-Beziehungen mit Abschnittsgrenze gegen Spoiler.
- 38 vorbereitete Lesehilfen. Die alten Beispiele wurden mit Muse Spark erstellt und werden als „Vorbereitet“ gekennzeichnet.
- Serverseitige OpenRouter-Anbindung an `openai/gpt-6-luna`, `reasoning.effort=max`, ohne stille Modelländerung.
- Canonical-Text-Kontext, serverseitige Eingabegrenzen, Aufgabenbegrenzung und Prüfung exakter Originalzitate.
- Öffentlicher Standardanalyse-Cache auf Upstash Redis, Frankfurt, Free, ohne automatisches Tarif-Upgrade.
- Atomare Begrenzung neuer Generierungen: 6 pro Minute, 50 pro Gerät/UTC-Tag, zunächst 500 insgesamt pro UTC-Tag. Cache-Hits und vorbereitete Antworten zählen nicht.
- Drei optionale WebMCP-Tools für öffentliche Lesestelle, Navigation und Auswahl. Keine privaten Notizen in Tool-Antworten.

## Besucher und KI-Verbrauch

Seit Version 0.2.3 auf ausdrücklichen Wunsch des Betreibers:

- Vercel Web Analytics ist nur in Production aktiv. Zulässige Pfade: `/`, `/impressum`, `/datenschutz`. URL-Parameter und Fragmente werden entfernt; Änderungen der Lesestelle zählen nicht als neue Seite. Keine Custom Events. DNT und Global Privacy Control unterdrücken das Laden des Skripts.
- `/verwaltung` zeigt 7, 30 oder 90 Tage KI-Verbrauch. Servervariable `STATS_PASSWORD` mit mindestens 32 zufälligen Zeichen eintragen. Das Passwort bleibt serverseitig; das signierte HttpOnly-/Secure-/SameSite-Strict-Cookie gilt acht Stunden ausschließlich für die Verwaltung. Passwortwechsel beendet bestehende Sitzungen.
- Die bestehende Redis-Datenbank speichert nur UTC-Tageszähler mit 90 Tagen TTL, getrennt für Production/Preview/Development. Kein Inhalt, keine User-, Geräte-, IP- oder Generation-ID. Eine zehn Minuten gültige zufällige Transaktionskennung verhindert doppelte Zählung durch Redis-Wiederholungen.
- Kosten kommen direkt aus OpenRouters `usage.cost`, auch bei intern verworfenen Antworten. Fehlende Werte bleiben als unbekannt erkennbar. Reasoning ist Teil der Ausgabe-Tokens. Zahlungsgebühren und Steuern sind nicht enthalten. Es gibt keine historische Rückbefüllung oder Garantie bei Netzwerk-/Speicherausfällen; zum Abgleich dient OpenRouter Activity.
- Die Erfassung läuft nach der Antwort mit Next.js `after()`. Vorhandene Lesehilfen verursachen keine neuen Modellkosten. Besucherzahlen werden nicht mit einzelnen KI-Aufrufen oder Schülern verknüpft.

Ein isolierter Cloud-Test prüft die Tageszähler, Deduplizierung und Löschfristen ohne Modellanfragen:

```powershell
node --env-file=.env.local --import tsx tests/usage.integration.ts
```

Die separaten Betreiber-Browsertests benötigen `STATS_PASSWORD` in `.env.local` und einen Produktionsbuild auf Port 3002 (`npm run build`, danach `npx next start --port 3002`). `npm run test:stats` prüft lokal Chromium. Für die iPad-WebKit-Profile `PLAYWRIGHT_BASE_URL` auf die HTTPS-Veröffentlichung setzen; WebKit akzeptiert das produktive Secure-Cookie nicht über lokales HTTP. Die Tests speichern keine Traces mit Passwörtern oder Sitzungen. Die regulären Auswahltests benötigen diesen Betreiberzugang nicht.

## Live-KI später aktivieren

Der Betreiber hat die Einrichtung seines Schlüssels auf später verschoben. In Vercel unter Project → Settings → Environment Variables `OPENROUTER_API_KEY` für Production und Preview eintragen und anschließend neu deployen. Die Website zeigt bis dahin ausdrücklich, dass die Live-KI noch nicht eingerichtet ist.

Die Cloud-Variablen `KV_REST_API_URL`, `KV_REST_API_TOKEN` und `RATE_LIMIT_SECRET` sind im bestehenden Vercel-Projekt eingerichtet. Die Antwortbibliothek hat 90 Tage TTL und maximal 3.000 Einträge. Eigene Fragen werden nicht gemeinsam gespeichert. Gerätekennungen werden nur für täglich wechselnde HMAC-Zähler verwendet; keine gespeicherte IP für App-Limits. Browser-Reset kann das Gerätelimit umgehen, deshalb gibt es zusätzlich ein Gesamtbudget.

OpenRouter muss Provider mit `zdr=true`, `data_collection=deny` und den angeforderten Parametern liefern. Antwortinhalte werden nicht von der Anwendung protokolliert. Technische Verarbeitung und Abrechnungsmetadaten beim Anbieter werden dadurch nicht ausgeschlossen; EU-only wird nicht zugesichert. Der tatsächliche Live-Modellaufruf ist erst nach Einrichtung des Schlüssels prüfbar.

## Vercel

Projekt: `leseraum`, Scope: `mateos-projects-c394726f`.

```powershell
npx vercel link
npx vercel env pull .env.local
npx vercel --prod
```

Das bestehende Checkout ist bereits korrekt verknüpft. Nicht versehentlich ein zweites Projekt anlegen. Eine verteilte Quellcode-Kopie enthält bewusst keine `.vercel`-Kontoverknüpfung und keine Geheimnisse. CLI-Upload funktioniert ohne GitHub-Verknüpfung.

Impressum: `OPERATOR_NAME`, `OPERATOR_ADDRESS`, `OPERATOR_EMAIL` ergänzen und neu deployen. Auf ausdrücklichen Wunsch stehen bis dahin klare Platzhalter im Impressum und Entwurfshinweise auf den rechtlichen Seiten.

## Altbestand und fachliche Grenzen

Die frühere Cloudflare/Sites-Version mit D1-Tabellen ist eine separate Veröffentlichung. Die neue Vercel-Version ruft diese Tabellen nicht auf und nimmt keine privaten Notizen über ihre API entgegen (410). Alte Daten wurden weder automatisch übertragen noch gelöscht. Bestehende Notizen können auf der alten Website als Markdown exportiert werden. Lokale Browserdaten sind an die Domain gebunden.

- Automatischer Quellenabgleich ist Extraktionskontrolle, keine vollständige fachliche Editionsprüfung. Konkreter Reclam-ISBN-Abgleich bleibt offen.
- Iphigenie und die gewählte Faust-Ausgabe besitzen kanonische Versnummern; andere Dramen verwenden explizit digitale Textzeilen oder Absätze.
- Woyzeck enthält Handschriftengruppen H1–H4, keine künstlich zusammengesetzte Standardfassung.
- Faust: Die Quelle spart 4335–4342 aus; CC BY-NC-SA 4.0 erlaubt keine kommerzielle Weiterverwendung.
- Heimsuchung bleibt ohne lizenzierten Volltext.
- Kein Offline-PWA-Versprechen und keine garantierte Antwortzeit von drei Sekunden.
- Browserprüfung erfolgte mit Chromium und WebKit; echter iPad-Safari-Test mit OS-Auswahlgriffen, Touch und Bildschirmtastatur steht noch aus.

Quellen: `ATTRIBUTION.md`. Produktentscheidungen: `docs/PROJECT_DIRECTION.md`. Bildherkunft: `docs/art-prompts.json`. Historische Cloudflare-Konfigurationsdateien sind Altbestand und für den Vercel-Start nicht erforderlich.
