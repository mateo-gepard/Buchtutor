# Hörbücher und synchrones Mitlesen

Stand: 20.10.2026. Mateo hat nach der ersten Quellenrecherche die vollständige Integration und Veröffentlichung beauftragt. Die Vorbereitung verwendet ausschließlich die öffentlichen kanonischen Buchtexte. Private Notizen, Handschrift und Schülerdaten sind nicht beteiligt.

## Veröffentlichter Zwischenstand

Auf Betreiberwunsch wurde die Arbeit am 20.10.2026 nach dem Push pausiert. Verfügbar sind Iphigenie, Faust I, Woyzeck, Die Verwandlung, Der zerbrochne Krug und Emilia Galotti. Kabale und Liebe, Maria Stuart und Nathan der Weise sind noch in Vorbereitung; ihre vorhandenen Zwischenergebnisse bleiben lokal erhalten. Die Bibliothek kennzeichnet diesen Zustand und der Player bietet für diese drei Werke unmittelbar die Geräte-Stimme an. Woyzeck deckt wegen der unterschiedlichen Entwürfe nur einen Teil unserer Textausgabe ab.

## Aufnahmen und Herkunft

| Werk | Aufnahme | Besonderheiten |
| --- | --- | --- |
| Iphigenie auf Tauris | [LibriVox · redaer](https://librivox.org/iphigenie-auf-tauris-ein-schauspiel-by-johann-wolfgang-von-goethe/), fünf Audioteile | Andere Ausgangsausgabe; Zeitmarken werden am tatsächlich gesprochenen Text ermittelt. |
| Faust I | [LibriVox · redaer](https://librivox.org/faust-der-tragodie-erster-teil-by-johann-wolfgang-von-goethe/), 28 Audioteile | Die Textquelle Faustedition steht unter CC BY-NC-SA 4.0 und enthält die Verse 4335–4342 nicht. Fehlende Verse erhalten keine geratenen Textanker. |
| Woyzeck | [LibriVox · Thomas Rappel](https://librivox.org/woyzeck_by_georg_buechner/), 24 Audioteile | Die Aufnahme verwendet eine andere Szenenfolge als unsere Lehmann-Ausgabe. Nicht alle Szenen des Volltexts sind in dieser Lesung enthalten. Der Player weist darauf hin; die Geräte-Stimme kann die kanonische Ausgabe lesen. |
| Kabale und Liebe | [LibriVox · redaer](https://librivox.org/kabale-und-liebe-ein-burgerliches-trauerspiel-by-friedrich-schiller/) | **In Vorbereitung.** Deutsches Original, keine englische Übersetzung. |
| Maria Stuart | [LibriVox · redaer](https://librivox.org/maria-stuart-by-friedrich-von-schiller/) | **In Vorbereitung.** Deutsches Original; nicht mit dem englischen Katalogeintrag „Mary Stuart“ verwechseln. |
| Die Verwandlung | [LibriVox · Markus Wachenheim](https://librivox.org/die-verwandlung-von-franz-kafka/), drei Audioteile | Audioquelle Zeno, kanonischer Text Gutenberg-Transkription der Ausgabe 1917. Alle 97 Absätze haben zugeordnete Passagen; dies bedeutet keine fehlerfreie Wort-für-Wort-Erkennung. |
| Der zerbrochne Krug | Lokal erzeugte **synthetische Lesung**, Thorsten-Voice | Keine belastbar frei nutzbare vollständige deutsche Aufnahme gefunden. Unsere kanonische Ausgabe einschließlich ihrer Abschnitte wird gelesen. |
| Nathan der Weise | Geplante **synthetische Lesung**, Thorsten-Voice | **In Vorbereitung.** Keine belastbar frei nutzbare vollständige deutsche Aufnahme gefunden. |
| Emilia Galotti | Lokal erzeugte **synthetische Lesung**, Thorsten-Voice | Keine belastbar frei nutzbare vollständige deutsche Aufnahme gefunden. |
| Heimsuchung | Keine Aufnahme eingebunden | Keine Text- oder Audiofreigabe. Eine neue KI-Stimme ersetzt die Rechte am Roman nicht. |

Die konkrete Dateiliste, Laufzeit, Prüfsumme, Textrevision und Zeitmarken stehen je Werk in `public/audiobooks/<werk>.json`. Die Registerdaten stehen in `corpus/audiobook-sources.json`. Bei Woyzeck folgt die Audiowiedergabe bewusst der Reihenfolge der Aufnahme und führt zur jeweils tatsächlich gesprochenen Szene. Die 24 Audioteile sind nach Prüfung der erkannten Dialoge auf passende H1–H4-Szenen begrenzt (`trackSections` im Register). Zusammengesetzte Szenen dürfen mehrere aufeinanderfolgende Entwürfe verbinden; kurze, gleichlautende Sätze werden dadurch nicht versehentlich einem anderen Entwurf zugeordnet.

## Nutzungsgrundlage und Grenzen

LibriVox beschreibt die Wiederverwendung seiner Aufnahmen für Apps und Streaming ausdrücklich als willkommen, einschließlich Weiterverbreitung weltweit: [Anbietererklärung vom 16.09.2026](https://librivox.org/2026/09/16/librivox-api-update/). Die [allgemeine Public-Domain-Erklärung](https://librivox.org/pages/public-domain/) gestattet auch Wiederverwendung und Bearbeitung, garantiert den Gemeinfreiheitsstatus aber nur für die USA. Unsere Einbindung stützt sich auf die dokumentierte Wiederverwendungserklärung des Anbieters für diese konkret zugeordneten freiwilligen Lesungen und auf die gemeinfreien historischen Originaltexte. **Das ist keine Behauptung, jede als „Public Domain“ bezeichnete Aufnahme sei automatisch in Deutschland gemeinfrei.** Es wurde keine zusätzliche individuelle Erlaubnis eingeholt und keine Anfrage an Sprecher versandt. Die Aufnahme bleibt unverändert; Buchtutor ergänzt eine getrennte Zuordnungsdatei und nennt Sprecher, Herkunft und Nutzungsangaben im Player.

Die alten Originaltexte sind nach [§ 64 UrhG](https://www.gesetze-im-internet.de/urhg/__64.html) grundsätzlich gemeinfrei. Die Rechte an neueren Editionen und an Tonträgern sind separat zu betrachten ([§ 85 UrhG](https://www.gesetze-im-internet.de/urhg/__85.html)). Die bestehenden Textquellen und ihre Bedingungen bleiben erhalten, insbesondere die nichtkommerzielle Faustedition. Die [Commons-Dokumentation der ersten Kafka-Datei](https://commons.wikimedia.org/wiki/File:LibriVox_-_Kafka_Die_Verwandlung_01.ogg) verwendet eine ältere PD-Dedication; sie wird hier nicht fälschlich zu einer CC0-Lizenz für alle LibriVox-Aufnahmen umbenannt.

Die synthetischen Lesungen verwenden die von Thorsten Müller selbst veröffentlichte Stimme: [offizielle Installationsanleitung mit de_DE-thorsten-high](https://thorsten-voice.de/en/guides/piper/), [Modellkarte](https://huggingface.co/rhasspy/piper-voices/blob/v1.0.0/de/de_DE/thorsten/high/MODEL_CARD), [CC0-Lizenz der Sprachaufnahmen](https://github.com/thorstenMueller/Thorsten-Voice/blob/master/LICENSE). Die Modelldistribution bezeichnet ihre Lizenz als MIT. [Piper](https://github.com/OHF-Voice/piper1-gpl) wird nur lokal zur Vorbereitung ausgeführt, nicht in die Website eingebaut. Die Lesung ist im Player und in der Bibliothek als synthetisch gekennzeichnet. Namen, ältere Schreibweisen und Versintonation können ungewöhnlich klingen; es handelt sich nicht um eine Schauspielerlesung oder um ElevenLabs-Ausgabe.

Nicht verwendet wurden kommerzielle Kauf-/Hörspielangebote ohne passende Weiterverwendungserlaubnis: [Krug / Der Audio Verlag](https://der-audio-verlag.de/hoerbuecher/der-zerbrochne-krug-kleist-heinrich-von-978-3-86231-118-7/), [Nathan / Deutsche Grammophon, gekürzt](https://www.thalia.de/shop/home/artikeldetails/A1058722196), [Emilia / ORF](https://oe1.orf.at/hoerspiel/suche/6835), [Heimsuchung / Der Hörverlag](https://www.thalia.de/shop/home/artikeldetails/A1043006837). „Keine freie Aufnahme gefunden“ ist kein Beweis ihrer Nichtexistenz.

## ElevenLabs

Das verfügbare Kontingent wurde über den authentifizierten [Subscription-Endpunkt](https://elevenlabs.io/docs/api-reference/user/subscription/get) geprüft und reichte für keines der fehlenden vollständigen Werke. Es wurde keine Generierung bezahlt und kein Tarif erweitert. Deshalb werden die Lücken kostenfrei lokal vorbereitet; ElevenLabs wird nicht als verwendeter Anbieter angegeben. Zugangsdaten und kontobezogene Verbrauchsdetails gehören nicht in dieses öffentliche Repository.

## Wiedergabe und Bedienung

- **Hören** im Reader öffnet einen kompakten Player. Audio lädt erst nach einer Abspielaktion. Zunächst gilt die gespeicherte Hörstelle, andernfalls eine zugeordnete Stelle am aktuellen Lesepunkt.
- Play/Pause, Audiokapitel, ±15 Sekunden, Tempo 0,75–2× und Schlaftimer mit Abschnitts-/Kapitelende. Laden lässt sich abbrechen; nach 20 Sekunden Wartezeit erscheint eine Wiederholungsmöglichkeit. Netzwerkfehler setzen den Medienabruf für einen erneuten Versuch zurück. „Ab hier hören“ springt von ausgewähltem/aktuellem Text zum Ton.
- Die aktuelle Passage erhält eine dezente Markierung. Nur sicher zugeordnete Stellen werden mitgeführt; Einleitungen, abweichender Wortlaut und Zuordnungslücken erhalten keine erfundenen Anker.
- Eigenes Scrollen, Tippen und Bearbeiten unterbrechen das automatische Mitführen. „Zur Hörstelle“ schaltet es wieder ein. Das Ende eines Audioteils führt zum nächsten. Textwechsel folgen tatsächlichen Abschnittsankern.
- Hörstelle und Einstellungen bleiben unter einer eigenen versionierten Browserkennung lokal. Die bestehende verschlüsselte Geräteübertragung enthält diese zusätzlichen Hörpräferenzen noch nicht.
- Die zusätzliche **Geräte-Stimme** liest den öffentlichen kanonischen Text über die deutsche Betriebssystemstimme. Stimmenverfügbarkeit, Offlinebetrieb und Hintergrundwiedergabe sind vom Gerät abhängig. Lokale Stimmen sind gekennzeichnet; Buchtutor verspricht keinen generellen Offlinebetrieb.
- Während der Einführung pausiert die Wiedergabe. Der Player berücksichtigt die Hilfeseitenleiste und die Auswahlleiste, statt deren Aktionen zu verdecken.

Entwurfsgrundlagen: [Libby: Hörbuchfunktionen](https://help.libbyapp.com/en-us/categories/listening-to-audiobooks.htm), [Libby-Funktionsübersicht](https://resources.overdrive.com/library/libby-features/overdrive-listen/), [Amazon: Immersion Reading](https://press.aboutamazon.com/2012/9/audible-and-amazon-introduce-immersion-reading-and-whispersync-for-voice-two-momentous-steps-forward-for-reading), [W3C EPUB Media Overlays](https://www.w3.org/TR/epub-33/#sec-media-overlays). Die konkrete Gestaltung ist unsere Umsetzung; es wurde kein Zugriff auf angemeldete Kindle-/Libby-Konten behauptet.

## Reproduzierbare Vorbereitung

`scripts/prepare-audiobooks.py` lädt die sechs registrierten Originalaufnahmen mit Prüfsummenprüfung und erzeugt lokal Wortzeitmarken mit [MLX Whisper](https://github.com/ml-explore/mlx-examples/blob/main/whisper/README.md), Modell `mlx-community/whisper-large-v3-turbo`. Normalisierte Wortfolgen werden auf unveränderte kanonische UTF-16-Textoffsets abgebildet. Kurze Phrasen verhindern, dass ein ganzer langer Absatz als aktuelle Hörstelle behandelt wird. Lange Lücken werden nicht interpoliert. Originalaudio und ASR-Zwischendaten verbleiben im ignorierten `work/audio/`.

`scripts/generate-local-audiobooks.py` liest die kanonischen Einheiten über `scripts/audio-units.ts`, erzeugt mit Piper 1.8.0 / Thorsten-Voice lokale PCM-Abschnitte und schreibt MP3-Dateien mit 64 kbit/s. Zeitmarken entstehen unmittelbar aus den erzeugten Samplegrenzen. Zwischenergebnisse sind wiederverwendbar; ein Manifest wird erst nach Fertigstellung des gesamten Werks atomar veröffentlicht. Veröffentlichte MP3s enthalten keine privaten Metadaten.

Ein Manifest ist an Werk, Ausgabe, Revision und Aufnahme gebunden. Der Client prüft Schema, Quelle, Abschnitts-/Block-IDs, Textoffsets und Zeitgrenzen. Bei einem ungültigen oder nicht verfügbaren Manifest wird die Ursache angezeigt und die Geräte-Stimme angeboten. Die großen LibriVox-Dateien werden direkt von Internet Archive gestreamt; Byte-Range-Abrufe wurden geprüft. Die synthetischen Dateien werden vom eigenen Hosting ausgeliefert. Eine Vercel-Blob-Anlage war mit der vorhandenen Verbindung nicht erlaubt; es wurde kein zusätzlicher kostenpflichtiger Speicher eingerichtet.

## Prüfstand

Modultests prüfen Ausgabenbindung, ungültige Anker/Zeiten/Quellen, Zeitlücken und die unveränderte vollständige Abdeckung aller kanonischen Lesetexte durch die Geräte-Stimme. Browserprüfungen decken Desktop/Handy-Chromium und iPad-WebKit in beiden Ausrichtungen ab: Start erst nach Klick, echte HTML-Audio-Wiedergabe mit Testton, Suchlauf, Kapitelwechsel, Pause/Fortsetzen, lokale Hörstelle, Folge-Modus, Ausgabenfehler, schmaler Bildschirm und Abbruch der Geräte-Stimme während der Tour. Die Systemstimme wird für reproduzierbare Zustandsprüfungen simuliert; das ist kein physischer iPad-Lautsprechertest. Die bestehenden Auswahl-, Notiz-, Pencil- und Onboarding-Prüfungen bleiben Teil des Regressionstests.

Die automatischen Zuordnungen werden zusätzlich anhand von Anfang, Mitte und Ende der erkannten Passagen sowie auf fehlende/abweichende Szenen geprüft. Die Aufnahmen wurden nicht vollständig in Echtzeit gegengehört. Eine hohe Textabdeckung ist keine Garantie für fehlerfreie Erkennung jedes einzelnen Wortes.

## Fortsetzung nach der Pause

Die Python-Umgebung liegt lokal in `work/audio-venv/`, Modelle und Cache in `work/audio/`. Die bisher erzeugten Nathan-MP3s liegen geschützt vor versehentlicher Veröffentlichung in `work/audio/paused-output/nathan/`. Vor der Fortsetzung zurück nach `public/audio/nathan/` verschieben; PCM-Zwischenstände sind zusätzlich erhalten. Dann die Vorbereitung mit `work/audio-venv/bin/python scripts/prepare-audiobooks.py kabale maria` und `work/audio-venv/bin/python scripts/generate-local-audiobooks.py nathan` fortsetzen. Erst nach vollständigen Manifesten und erfolgreichem `npm run check:audio -- kabale maria nathan` die jeweiligen `status: preparing`-Einträge im Quellenregister entfernen und veröffentlichen. `npm run check:audio` prüft standardmäßig ausschließlich freigegebene Aufnahmen.
