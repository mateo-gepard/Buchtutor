# Buchtutor – Projektentscheidungen und Umsetzung

Stand: 25. September 2026. Zielgruppe: Q12 und Q13 in Bayern.

**Lesezeichen und Teilen, Version 0.2.4 (26. September 2026):** Manuelle Lesezeichen sind weiterhin lokale Einträge mit stabilen Textankern; wiederholtes Setzen derselben Stelle erzeugt keinen zusätzlichen Eintrag, Entfernen bleibt als Löschmarkierung übertragbar. Ein eigener Filter im Notizbuch zeigt die Lesezeichen. Der Schalter „Automatisches Lesezeichen“ steuert das automatische Speichern und Wiederaufnehmen der Leseposition und wird mit den Einstellungen übertragen. Alte Daten ohne diesen Schalter behalten die bisherige eingeschaltete Automatik. Sicherungsformat, Schlüsselableitung und Speicherkennungen bleiben erhalten. Teilen verwendet direkte Links auf öffentliche Werk-/Abschnitts-/Textanker; persönliche Daten werden dabei nicht ergänzt. Social-Links und native Freigabe werden erst durch einen bewussten Klick geöffnet. Die Linkvorschau verwendet Buchtutor-Grafik und Werktitel. Unbekannte Seiten, Werke und Abschnitte erhalten eine eigene 404-Ansicht.

**Name und Logo, Version 0.2.2:** Der Betreiber hat Buchtutor und den Entwurf mit offenem dunkelgrünem Buch und terrakottafarbenem Register gewählt und die Umsetzung freigegeben. Sichtbare Marke, Metadaten, Startbildschirm-Icons und Exportnamen sind umgestellt. Technische Leseraum-Kennungen (IndexedDB, Geräte-ID, Sicherungsformat, Cache und Vercel-Projekt) bleiben aus Kompatibilitätsgründen erhalten. Neue Dateien heißen `.buchtutor`, der Import akzeptiert weiterhin `.leseraum`. Beim Produktionsdeploy am 25. September 2026 war www.buchtutor.de bereits als Domain im vorhandenen Vercel-Projekt eingerichtet; buchtutor.de leitet dorthin weiter. Beide Adressen und leseraum.vercel.app wurden öffentlich geprüft. In diesem Durchgang wurde keine Domain gekauft. Die bisherige Adresse bleibt ohne Weiterleitung erreichbar, damit dort gespeicherte Daten exportiert werden können. Der Wechsel zur .de-Domain erfordert eine manuelle Geräteübertragung.

**Aktuelle Entscheidung:** Der Betreiber hat Konzept **A · Fokus** gewählt und den Umbau einschließlich Hosting auf Vercel und kostenlosem Cloud-Cache freigegeben. Die frühere Beschränkung auf fünf Mockups ist damit erledigt.

Die Vercel-Version verwendet Next.js, lokale IndexedDB-Daten und komprimierte, authentifiziert verschlüsselte Sicherungen (AES-256-GCM, PBKDF2-SHA-256, 600.000 Iterationen). Geräteübertragung bleibt bewusst manuell. Der Shared Cache läuft auf Upstash Redis Free in Frankfurt ohne automatische Tarif-Upgrades: Standardanalysen höchstens 90 Tage / 3.000 Einträge, keine freien Fragen oder privaten Notizen. Neue Modellaufrufe sind atomar auf 6/Minute, 50/Tag/Gerät und zunächst 500/Tag insgesamt begrenzt; tägliche pseudonyme Zähler verfallen nach dem UTC-Tageswechsel plus zwei Minuten.

**Noch offen:** Der Betreiber richtet seinen OpenRouter-Schlüssel später ein. Bis dahin gibt es vorbereitete Analysen und keine neuen Modellaufrufe. Das gewünschte Modell bleibt GPT-6 Luna / max. Für das Impressum wurden ausdrücklich Platzhalter gewünscht. Die bisherige Cloudflare-Veröffentlichung und D1-Datenbank sind davon unabhängig; Bestandsdaten wurden weder still übertragen noch gelöscht.

**Späterer Prüfstand, Auswahl-Update 0.2.1:** Der öffentliche Status-Endpunkt meldet inzwischen einen hinterlegten OpenRouter-Schlüssel. Das bestätigt weder seine Gültigkeit noch eine funktionierende Live-Modellverbindung. Die Auswahlprüfungen fangen Modellanfragen ab; keine echten Generierungen in diesem Durchgang.

## Gestaltungs- und Bedienregeln

- iPad steht an erster Stelle: im Hochformat eine Lesespalte mit ausklappbarer Hilfe von unten; im Querformat bei Bedarf Hilfe neben dem Text. Split View folgt der tatsächlich verfügbaren Breite. Desktop und Handy bleiben vollständig bedienbar.
- Inhaltsverzeichnis, Lesehilfe und Fokusmodus müssen jederzeit erreichbar und schließbar sein. Textanker und Lesestelle bleiben bei Layout- und Schriftänderungen erhalten.
- Kurze, wörtliche deutsche Beschriftungen; keine Werbe-Heros, Slogans, erfundenen Zähler, Goldoptik oder Luxus-Typografie. Hauptschrift ist System-Sans, Buchschrift optional.
- Die früher erzeugten ImageGen-Cover und Figurenporträts werden wiederverwendet. Beziehungen und Namen sind echte strukturierte, bedienbare Inhalte.
- Impeccable darf für dieses Projekt nicht verwendet werden.
- Native Textauswahl und Versnummern-Auswahl; Metrik nur bei geeigneten Texten; Mehrfachanalysen einer Stelle bleiben einzeln erreichbar. Farbe ist nicht die einzige Kennzeichnung.
- Textauswahl bleibt während einer Geste browsergesteuert; vor Werkzeugaktionen wird der neueste kanonische Anker übernommen. Keine Unterdrückung nativer Touch-, Zoom- oder Kontextmenügesten. Der Markierstift bietet auf allen Bildschirmgrößen eine Anfang-/Ende-Auswahl per Antippen; in diesem Modus sind Figurennamen normaler auswählbarer Text.
- Schrift, Zeilenabstand, Hell/Warm/Nacht, Versnummern und Figurenmarkierungen sind einstellbar. Touch-Flächen, Fokus, Kontrast und Reduced Motion werden berücksichtigt.
- Figuren und geprüfte Aliasnamen verweisen auf Profile; die Auswahl zweier Figuren zeigt Beziehungen. Standardmäßig keine Informationen aus späteren Abschnitten. Illustrationen sind keine historischen Quellen.

## Daten und KI

**Statistik-Freigabe, Version 0.2.3:** Der Betreiber wünscht ausdrücklich Besucherstatistiken und KI-Verbrauch. Vercel Web Analytics erfasst nur öffentliche Seitenpfade ohne Query-Parameter, Fragmente oder Lesestellen und respektiert DNT/GPC. Keine Custom Events oder Verknüpfung mit Schülerdaten. Die private Betreiberansicht `/verwaltung` verwendet einen serverseitigen Zufalls-Passwortzugang mit achtstündiger signierter Sitzung. KI-Nutzung wird als UTC-Tageswerte in der bestehenden Redis-Datenbank gespeichert (90 Tage): Aufrufe, Cache-/Vorlagentreffer, Fehler, Limits, Tokenmengen und tatsächliche OpenRouter-`usage.cost`. Keine Fragen, Antworten, Notizen, IPs oder Benutzer-/Gerätekennungen. Nicht gemeldete Kosten bleiben unbekannt; keine historische Rückbefüllung. Produktions-, Vorschau- und Entwicklungszähler sind getrennt. Fehlgeschlagene Statistikschreibvorgänge dürfen die Lesehilfe nicht blockieren.

Persönliche Daten liegen ausschließlich in der neuen Anwendung lokal: versionierte Einstellungen, Lesepositionen je Ausgabe, stabile Textanker, Notizen, Markierungen, Löschmarkierungen und ausdrücklich gespeicherte Analysen. Importe zeigen vor der Übernahme eine Zusammenfassung; abweichende aktive Notizen werden als Konfliktkopien erhalten. Keine API-Schlüssel oder Gerätekennungen in Exportdateien. Markdown-Export ist ausdrücklich unverschlüsselt.

Ein kurzer Code kann keine beliebig große Notizensammlung enthalten. Sicherungsdatei und Passwort sind eine manuelle Geräteübertragung, keine automatische Synchronisation. Für einen späteren Kurzcode wäre ein zusätzlicher, explizit zu entscheidender Übertragungsdienst nötig.

Der Betreiber-Schlüssel gehört ausschließlich in Vercel Environment Variables als OPENROUTER_API_KEY. Server-Endpunkt verwendet openai/gpt-6-luna und reasoning.effort=max, ohne stille Modelländerung. Höchstens 80 Verse / 6.000 Zeichen Auswahl, begrenzter kanonischer Kontext davor und danach, Sprecher und Ausgabe. Fragen und Texte sind Daten, keine Systemanweisungen. Keine Codeausführungs- oder Browserwerkzeuge für die KI. Sachfremde Programmieraufträge werden vorab und über Ausgabeprüfung abgefangen; keine hundertprozentige Unüberwindbarkeit versprechen.

OpenRouter wird mit ZDR und data_collection=deny aufgerufen. Das verhindert nicht notwendige Verarbeitung und Abrechnungsmetadaten; eine ausschließliche EU-Verarbeitung ist damit nicht zugesichert. Live-Verbindung erst nach Eintragen des Betreiber-Schlüssels prüfen. Maximales Reasoning ist keine Drei-Sekunden-Garantie.

Der öffentliche Cache-Schlüssel enthält Werk, Ausgabe/Revision, kanonische Auswahl, Analyseart, Prompt-/Kontextversion und Modell/Reasoning. Leerzeichen und versehentliche Teilwortreste werden normalisiert, echte kurze Wörter/Negationen bleiben erhalten. Metrik erhält vollständige Verse. Unterschiedliche Editionen werden nie aufgrund bloßer Textähnlichkeit vereinigt. Private Fragen werden weder gecached noch in Anwendungslogs geschrieben.

Cache-Hits und vorbereitete Antworten verbrauchen kein Generierungskontingent. Gleichzeitige neue Standardanalysen derselben Stelle haben eine Sperre. Gerätekennung wird täglich per HMAC pseudonymisiert; kurze und tägliche Limits werden atomar reserviert. Browser-Reset kann ein Geräte-Limit umgehen, deshalb zusätzliches Gesamtbudget. Kein Schülerkonto, keine gespeicherte IP für App-Limits.

Populäre Markierungen sind bisher nicht umgesetzt: keine privaten Markierungen hochladen und keine Abrufzahlen als Anzahl verschiedener Schüler ausgeben.

## Quellen, Editionen und Grenzen

Die bestehenden neun Volltexte und kanonischen Quellenanker werden erhalten. Heimsuchung hat keine freigegebene Volltext-Lizenz und bleibt als entsprechender Hinweis in der Bibliothek. Referenzen sind werkabhängig Verse, Textzeilen oder Absätze. Keine digitalen Bildschirmseiten als Seiten einer Reclam-Ausgabe darstellen. Vollständiger fachlicher Abgleich und Vergleich mit konkreten Reclam-ISBNs sind weiterhin offen.

Die alten D1-Tabellen/Cloudflare-Ressourcen sind Altbestand. Die Vercel-API nimmt keine privaten Notizen oder Lesefortschritte entgegen (410). Die alte Website kann vorhandene persönliche Notizen weiterhin als Markdown exportieren. Es gibt keine automatische Übernahme dieses Altbestands auf die neue Domain.

## Hosting und Veröffentlichung

Vercel-Projekt: leseraum im Scope mateos-projects-c394726f. Upstash-Ressource: leseraum-analysen, Frankfurt, Free, autoUpgrade=false. Keine Konten für Schüler. Lokale Daten sind an Browser und Domain gebunden; bei Wechsel zwischen Vorschau-/Produktionsdomain eine Sicherung verwenden.

Impressum und Datenschutzhinweise beschreiben den tatsächlichen Stand. Der Betreiber hat ausdrücklich Platzhalter gewünscht. Keine Behauptung, dass Hosting und KI keinerlei Daten verarbeiten oder eine kostenlose Website automatisch kein Impressum braucht. OPERATOR_NAME, OPERATOR_ADDRESS und OPERATOR_EMAIL sind vor regulärem öffentlichen Betrieb zu ergänzen; Verträge und internationale Übermittlungen bleiben Betreiberaufgaben.

## Prüfung

Automatisierte Tests prüfen Verschlüsselung, Manipulation, Größenlimits, Konflikte, Löschmarkierungen, IndexedDB-Transaktionen, Auswahl-Normalisierung, API-Eingabegrenzen und Vorlagen-Zuordnung. Ein gesonderter Cloud-Integrationstest prüft den echten Redis-Cache, Sperren und atomare Limits ausschließlich mit synthetischen Testdaten.

Browserprüfung in iPad-Hoch-/Querformat, Handy- und Desktop-Breiten erfolgt im verfügbaren Chromium-Browser. Ein echter iPad-Safari-Test mit Bildschirmtastatur/Touch bleibt vor breitem Einsatz sinnvoll; emulierte Fenstergrößen ersetzen keinen Hardwaretest.

