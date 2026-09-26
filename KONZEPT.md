# Leseraum – Produktkonzept und Stand der ersten Version

Stand: 25. September 2026. Zielgruppe: Q12 und Q13 in Bayern. Arbeitstitel: **Leseraum**.

## Die zentrale Entscheidung

Der Originaltext bleibt das Zentrum. Die Hilfe wird genau dort erreichbar, wo eine Verständnisfrage entsteht. Eine Auswertung darf beim Lesen weder den Kontext verlieren noch eine längere Suche nach der richtigen Stelle verlangen.

Deshalb ist Leseraum ein Reader mit eingebauter Lesehilfe. Die Bibliothek, Figurenansicht und persönlichen Notizen gehören zu diesem Lesefluss. Der Text selbst wird niemals von einer KI neu geschrieben oder beim Import „verbessert“.

## Was bereits benutzbar ist

Neun Werke sind als strukturierte Texte eingebunden: Iphigenie auf Tauris, Der zerbrochne Krug, Faust I, Woyzeck, Nathan der Weise, Emilia Galotti, Kabale und Liebe, Maria Stuart und Die Verwandlung. Das meint jeweils die ausdrücklich genannte Textgrundlage, keine Garantie für Übereinstimmung mit jeder Schulausgabe.

Der Reader bietet Suche, Sprung zu Vers-/Textzeilen-/Absatznummern, Abschnittswechsel, anpassbare Schrift und Lichtmodi. Man kann einzelne Wörter oder mehrere Textblöcke auswählen. Eine alternative Auswahl über die Nummern funktioniert auch ohne präzises Ziehen am Touchscreen.

Notizen, Lesezeichen, ausgewählte KI-Antworten und Lesestand werden nach Anmeldung in der Datenbank gespeichert. Persönliche Einträge sind auf den jeweiligen Nutzer beschränkt. Ein Markdown-Export macht die Sammlung unabhängig vom Reader. Löschen ist zunächst reversibel.

Figurennamen sind dezent gekennzeichnet. Eine zweite ausgewählte Figur öffnet die vorhandene Beziehung. Die Informationen reichen je nach Werk vom Quellenverzeichnis bis zu ergänzten Profilen und Beziehungen. „Priesterin“ in Iphigenie wird anhand geprüfter Vorkommen zugeordnet. „Licht“ im Krug wird als Personenname nur an passenden Stellen erkannt – nicht in „Hat Sie das Licht dabei gehalten“.

38 vorbereitete Lesehilfen für die Anfangspassagen von acht Werken sind vorhanden. Sie decken Inhalt, Stilmittel, Metrik, Hintergrund und Konflikt ab; bei der Verwandlung sind zunächst drei dieser Aufgaben vorbereitet. Für Woyzeck gibt es noch kein vorbereitetes Analysepaket. Neue freie Fragen benötigen die angeschlossene Live-KI.

## Bayern: Pflicht und sinnvolle Ergänzung

Für die Abiturjahrgänge 2026–2028 nennt das ISB **Der zerbrochne Krug** und **Heimsuchung** als verbindliche Lektüren. Der Lehrplan verlangt darüber hinaus eine breitere Lektüre unterschiedlicher Gattungen und Epochen. Die Auswahl eines einzelnen Kurses bleibt deshalb relevant; „alle Abiturlektüren“ ist kein unveränderlicher Werkkatalog.

Heimsuchung ist in der Bibliothek als Pflichtlektüre sichtbar, aber ohne unlizenzierte Volltextkopie. Die freie Bibliothek und ein später lizenzierter Katalog sollten dieselben Metadaten und Lesefunktionen nutzen können.

Quellen: [ISB, Abiturjahrgänge](https://www.deutschabitur.bayern.de/informationen-zu-den-abiturjahrgaengen/) und [LehrplanPLUS Deutsch 13](https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/13/deutsch).

## Zitierfähigkeit braucht eine konkrete Ausgabe

Ein Vers ist keine Bildschirmzeile. Ein Satz kann über mehrere Verse gehen; mehrere Figuren können sich einen Vers teilen. Prosa braucht Kapitel und Absätze, später gegebenenfalls ein zusätzliches Seiten-/Zeilenraster einer bestimmten Druckausgabe. Bei Fragmenten kann sogar die Reihenfolge der Szenen von der Ausgabe abhängen.

Das Datenmodell trennt deshalb Werk, Ausgabe, Abschnitt und Textblock. Ein Textblock besitzt eine dauerhafte ID, seinen unveränderten Wortlaut und gegebenenfalls eine Quellenreferenz. Ein gespeicherter Bereich verwendet Anfangs- und Endblock, Zeichenpositionen sowie ein Kontrollzitat. Das Kontrollzitat wird beim Speichern serverseitig gegen die Ausgabe geprüft.

| Textgrundlage | Aktueller Stand der Referenzen |
| --- | --- |
| Iphigenie auf Tauris | 2.203 Versfragmente; unter Beachtung geteilter Verse 2.174 Versnummern. |
| Faust I | Nummern aus der Faustedition bis 4.612, einschließlich verteilter und zusammengefasster Verse. Die Quelle lässt 4.335–4.342 im konstituierten Lesetext aus. |
| Krug, Nathan, Maria Stuart | Digitale Textzeilen. Kein ungesicherter Anspruch, diese seien die schulischen Versnummern. |
| Emilia Galotti, Kabale und Liebe, Die Verwandlung | Fortlaufende Absätze dieser Digitalausgabe. |
| Woyzeck | Handschriftengruppen H1–H4 getrennt, mit Absätzen und einzelnen Verspassagen. Keine einheitliche Schulfassung behauptet. |

Für echte Reclam-Kompatibilität sollte als Nächstes die im Kurs verwendete **ISBN mit Auflage** festgelegt werden. Das Druckraster wird als gesonderte Referenztabelle angelegt. Es verändert weder den Originaltext noch bestehende Notizanker. „Seite 34, Zeile 12“ und „Vers 322“ müssen verschiedene Referenztypen bleiben.

## Die Qualitätsschleife für weitere Werke

1. Werk und Ausgabe auswählen, Quellenherkunft und Nutzungsbedingungen festhalten.
2. Strukturierte TEI-/XML-Quellen bevorzugen. OCR von PDFs nur einsetzen, wenn keine bessere Quelle verfügbar ist.
3. Originaldatei unverändert archivieren und per SHA-256 identifizieren.
4. Deterministisch in Abschnitte, Sprecher, Regieanweisungen, Verse, Strophen und Absätze übertragen. Jede Korrektur getrennt protokollieren.
5. Vollständigkeit und Reihenfolge prüfen: Titel, Textanfang, Schluss, Abschnittszahl, Textblöcke, Regieanweisungen, geteilte Verse, Lücken und doppelte Referenzen.
6. Mit einer tatsächlich unabhängigen zweiten Ausgabe vergleichen. Differenzen nicht automatisch „korrigieren“: Sie können echte Varianten sein.
7. Problemstellen fachlich prüfen und den Freigabestand sichtbar machen.
8. Erst nach erfolgreichem Druckausgaben-Abgleich das entsprechende ISBN-Profil als kompatibel ausweisen.

Aktuell umgesetzt sind die archivierte Quelle, der deterministische Import und maschinelle Extraktionskontrollen. Der unabhängige Doppelabgleich und eine vollständige Fachredaktion sind **noch offen**. Ein zweites Modell, das denselben Text liest, ersetzt diese Prüfung nicht.

## Lesen auf verschiedenen Geräten

Am Desktop stehen links die Abschnitte, in der Mitte der Text und rechts die Begleitung. Die Textspalte bleibt begrenzt breit und verwendet eine gut lesbare Serifenschrift. Rechts ist anfangs eine kleine Einführung statt einer leeren Chatfläche sichtbar.

Auf dem Tablet bleibt der Text groß; die Begleitung öffnet sich bei Bedarf als Panel. Auf dem Handy gibt es eine feste untere Leiste für Inhalt, Begleitung und Notizen. Das Öffnen einer Erklärung soll den Lesestand nicht zerstören. Nummern stehen außerhalb des eigentlichen Textes und werden bei einer Textauswahl nicht in das Zitat kopiert.

Markierungen tragen eine dezente Farbe je Aufgabe. Wenn mehrere Einträge dieselbe Passage betreffen, zeigt ein Randzeichen die Anzahl. Die Einträge bleiben getrennt abrufbar; eine Metrikanalyse überschreibt keine eigene Notiz. Farbe allein ist nicht der Informationsträger: Aufgabentitel und Symbole bleiben sichtbar.

Sinnvolle nächste Reader-Schritte: Offline-Pakete je Werk, ein dokumentiertes Synchronisations- und Konfliktverfahren, geteilte Links mit exaktem Textbereich, Rücksprung nach Querverweisen, optionaler Lesefokus ohne Seitenleisten und reale iPad-/Safari-Tests für Auswahlgriffe und Bildschirmtastatur.

## Welche Hilfen sich lohnen

**Inhalt:** Wer sagt oder tut was? Was wird vorausgesetzt? Eine kurze Paraphrase wahrt entscheidende Mehrdeutigkeiten.

**Stilmittel:** Nicht nur benennen, sondern Fundstelle, Beobachtung und mögliche Wirkung verbinden. Keine beliebige Liste aller rhetorischen Begriffe.

**Metrik:** Versmaß, Hebungen, Kadenz und Zeilensprung erklären. Bei geteilten Versen wird vor einer Skansion der vollständige Vers rekonstruiert. Prosa erhält Hinweise zum Satz- und Sprechrhythmus. Unsichere Betonungen werden als solche gezeigt.

**Hintergrund:** Begriffe, mythologische Anspielungen und historische Voraussetzungen knapp erläutern. Allgemeines Wissen darf nicht so aussehen, als stünde es im Text. Für ausgedehntere historische Erläuterungen ist eine redaktionelle Quellenbasis vorgesehen.

**Konflikt:** Ziele, Abhängigkeiten, Wissensunterschiede und Gegenpositionen der ausgewählten Szene sichtbar machen.

**Eigene Frage:** Dieselbe Passage mit einer individuellen Frage untersuchen. Diese Frage gehört in einen privaten Cache und darf nicht anderen Nutzern angezeigt werden.

Spätere Ergänzungen mit hohem Nutzen: ein Begriffslexikon beim Antippen unbekannter Wörter; eine Figurenansicht, die Wissen bis zum gewählten Abschnitt begrenzt; ein Lernmodus, der zuerst eine Rückfrage stellt und die Erklärung erst danach öffnet; aus eigenen Notizen erzeugte Wiederholungsfragen. Automatisch fertige Klausuraufsätze haben für das Leseziel eine geringere Priorität.

## KI, Kosten und Verlässlichkeit

Die Quelle bleibt unverändert. Die Analyse-API erhält nur die ausgewählte Passage, einen kurzen vorangehenden Kontext und die gewählte Aufgabe. Private Notiztexte werden nicht automatisch mitgeschickt. Jeder zurückgegebene Beleg muss wortgetreu in der zugelassenen Auswahl vorkommen. Eine falsche Belegstelle führt zur Ablehnung der Antwort. Das prüft Zitate, aber noch nicht die inhaltliche Richtigkeit einer Interpretation.

Cacheidentität: Ausgabe und Quellenrevision, genaue Textauswahl, Aufgabe, Promptversion und Modell. Freie Fragen zusätzlich mit Nutzeridentität. Damit werden Antworten aus veränderten Ausgaben nicht ungeprüft vermischt. Vorbereitete Antworten stehen unabhängig von einer gerade verfügbaren Live-KI bereit.

Muse Spark 1.3 mit xhigh wurde über OpenCode für Recherche und Entwürfe verwendet. Die direkte kostenlose Schnittstelle antwortete beim Test mit einer Beschränkung auf OpenCode. Diese Beschränkung wird nicht umgangen. Die Entwürfe zeigten konkrete Fehler – unter anderem bei Metrikbegriffen –, weshalb Modellantworten hier nicht als Textredaktion gelten.

Für die Website ist **Groq Free** vorbereitet. Ein eigener Account und API-Schlüssel sind erforderlich. Laut offizieller Tabelle sind bei `openai/gpt-oss-120b` derzeit unter anderem 1.000 Anfragen und 200.000 Tokens pro Tag angegeben; die Limits des jeweiligen Accounts sind maßgeblich. Die App hat zunächst deutlich niedrigere Pilotlimits. „Kostenlos“ ist damit ein begrenztes Kontingent, keine Zusage für beliebig viele Schüler.

Quellen: [Groq-Limits](https://console.groq.com/docs/rate-limits), [Groq-Abrechnung](https://console.groq.com/docs/billing-faqs), [eigenen Schlüssel erstellen](https://console.groq.com/keys), [OpenCode Zen](https://opencode.ai/docs/zen/).

## Technischer Aufbau

React und TypeScript bilden die Oberfläche. Vinext/Vite erzeugt den Worker und die Browserdateien. Die Datenbank D1 enthält persönliche Notizen, Lesestand, Analysen und Anfragezähler. Die Korpusdateien sind versionierte, reproduzierbare JSON-Daten; sie müssen nicht bei jedem Seitenaufruf neu aus PDFs extrahiert werden.

Schlüssel bleiben auf dem Server. Eigene Notizen und benutzerbezogene Antworten werden nur nach Anmeldung ausgeliefert. Ungültige Textanker, unpassende Ausgaben und Anfragen fremder Ursprünge werden abgewiesen. Das Lese-Layout ist die einzige Information, die lokal im Browser gespeichert wird; wichtige Nutzerdaten liegen in der Datenbank.

Die derzeitige ChatGPT-Anmeldung ist für den ersten Sites-Prototyp praktisch. Für eine öffentliche Schulplattform muss gesondert entschieden werden, ob ein Gastmodus mit späterer Kontoverknüpfung oder eine andere schulgeeignete Anmeldung besser passt. Ein kostenloser Reader sollte möglichst ohne Anmeldung lesbar bleiben.

## Nächste Freigabestufe

Die erste Version ist eine funktionierende Grundlage zur Erprobung. Für einen belastbaren öffentlichen Schulbetrieb haben diese Schritte Vorrang:

1. Den konkreten Krug-Text einschließlich ISBN-Zitierprofil redaktionell freigeben.
2. Eine Lehrkraft prüft einen definierten Satz von Metrik-, Stilmittel- und Inhaltsanalysen. Fehler werden als feste Prüffälle dokumentiert.
3. Den persönlichen Groq-Schlüssel hinterlegen und den echten Weg von Auswahl bis Modellantwort prüfen, einschließlich Limit- und Fehlerfällen.
4. Den Reader mit Schülern auf echten iPads und Mobilgeräten testen: Auswahl, Wiederfinden, große Schrift, Unterbrechungen, langsame Verbindung.
5. Vor öffentlicher Freigabe Hosting-Zugriff, Quellenrechte, Datennutzung, Löschung und laufende Kosten verbindlich festlegen. Die Faust-Quelle hat ausdrücklich eine nichtkommerzielle Lizenz.

Messbare Ziele für die nächste Stufe: keine ungeklärten Textverluste, sämtliche freigegebenen Referenzen eindeutig, gespeicherte Notizen nach Neustart wieder an derselben Stelle, schnelle Cacheantworten und eine erkennbare Lade-/Fehlerrückmeldung für jede Live-Anfrage. Eine feste Drei-Sekunden-Garantie wird ohne Messdaten nicht versprochen.
