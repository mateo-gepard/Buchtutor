# Recherche und Entwurfsentscheidungen

Stand: 19.10.2026. Auftrag: den als abrupt und wenig eingängig erlebten Ablauf anhand belastbarer Leitlinien und veröffentlichter Produktbeispiele überarbeiten. Die folgenden Quellen wurden gelesen; Aussagen zu Produkten beziehen sich auf deren öffentliche Hilfen und Lernangebote, nicht auf einen durchgespielten, angemeldeten Erststart. Figma/Atlassian waren im Webabruf nur teilweise zugänglich und werden daher nicht als Beleg für konkrete aktuelle Bildschirmabläufe verwendet.

## Gelesene Leitlinien

| Quelle | Für Buchtutor relevante Aussage | Umsetzung |
| --- | --- | --- |
| [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) | Kurze, freiwillige Einführung, Lernen durch sicheres Ausprobieren, Hinweise am jeweiligen Arbeitskontext. | Erst eine Einladung, dann Übungen; jederzeit aussteigen, keine Pflichtaktionen. |
| [Google Material: Onboarding](https://m1.material.io/growth-communications/onboarding.html) | Einen ersten sinnvollen Vorgang ermöglichen; den Einstieg mit der eigentlichen Nutzung verbinden; visuelle Kontinuität wahren. Historische Material-Leitlinie, keine aktuelle M3-Komponenten-API. | Eine zusammenhängende Textstelle statt einer Aufzählung unverbundener Features. |
| [Google Material: Feature discovery](https://m1.material.io/growth-communications/feature-discovery.html) | Auf Zeitpunkt, Häufigkeit und Relevanz von Hinweisen achten; weggeklickte Hinweise respektieren. | Abschlusskennung behalten; keine erzwungene Wiederholung nach dem Redesign. |
| [Microsoft: Teaching tips and in-app tours](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/administration/onboarding-teaching-tips-tours) | Touren freiwillig beginnen, relevante Ergebnisse erklären, kurze Texte, möglichst wenige Schritte. | Zehn vom Betreiber gewünschte Schritte in drei kurzen Kapiteln; Nebenfunktionen werden nicht jeweils lang erklärt. |
| [IBM Carbon: Onboard](https://www.carbondesignsystem.com/building-experiences/onboard) | Frühen nachvollziehbaren Nutzen und jeweils einen klaren nächsten Schritt schaffen. | Die selbst geschriebene Übungsnotiz wird später tatsächlich im Übungsnotizbuch gezeigt. |
| [IBM: Introduction to onboarding](https://www.carbondesignsystem.com/building-experiences/onboard/articles/introduction-to-onboarding) | Geführtes Lernen mit selbstständigem Erkunden verbinden. | Übungen sind optional, Zurück/Weiter bleiben frei verfügbar. |
| [IBM: Craft a seamless onboarding journey](https://www.carbondesignsystem.com/building-experiences/onboard/articles/craft-a-seamless-onboarding-journey) | Ablauf an Nutzerzielen und erkennbaren Reibungspunkten ausrichten. | Unerwarteter Ansichtswechsel vor Zustimmung entfällt; fast die ganze Übung bleibt im Reader. |
| [IBM: Create a memorable product experience](https://www.carbondesignsystem.com/building-experiences/onboard/articles/create-a-memorable-product-experience) | Kleine erreichbare Aufgaben, schrittweises Lernen, verständlicher Abschluss. | Konkrete Ergebnisrückmeldung und eine Abschlussübersicht statt eines abrupten Schließens. |
| [Salesforce Trailhead: Promote Feature Adoption and Discovery](https://trailhead.salesforce.com/content/learn/modules/user-engagement/promote-feature-adoption-and-discovery) | Zusammenhängende Arbeitsschritte eignen sich für Walkthroughs; lange Erklärungen und unverbundene Funktionen unterbrechen den Arbeitsfluss. | Aufgaben bauen auf derselben Auswahl und Notiz auf; keine zusätzlichen Provideraufrufe. |
| [NN/g: Mobile-App Onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/) | Vorab-Tutorials kosten Aufmerksamkeit und Gedächtnis; kontextbezogenes Lernen ist oft hilfreicher. | Einladung mit direktem Ausstieg, wenige Wörter je Schritt, ein Ziel je Übung. |
| [NN/g: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Erst Wesentliches, weiterführende Möglichkeiten bei Bedarf. | Pencil/Handschrift, KI und Figuren sind als optionale Vertiefungen erkennbar. |

## Öffentliche Lernangebote großer Produkte

- [Slack: Getting started for new users](https://slack.com/help/articles/218080037-Getting-started-for-new-Slack-users): wenige konkrete Aufgaben, danach Links zum Vertiefen. Für uns: klare Aufgaben statt einer vollständigen Funktionsbeschreibung.
- [Notion: Start here](https://www.notion.com/help/start-here): zunächst ein verständliches Grundmodell, weitere Konzepte folgen schrittweise. Für uns: Textstelle → Gedanke → Notizbuch als durchgehendes Modell.
- [Linear: Start Guide](https://linear.app/docs/start-guide): eine öffentliche Demo und verschiedene weitere Lernwege. Für uns: ungefährlicher Übungszustand, der echte Daten nicht verändert.
- [Figma: Get started](https://help.figma.com/hc/en-us/categories/360002051613-Figma-Design-Getting-Started): öffentlich indexierte Übersicht aus Orientierung, kleinen praktischen Projekten und späterer Vertiefung. Detailabruf nicht verfügbar; keine Behauptung über die aktuelle eingeloggte Tour.
- [Atlassian: Onboarding examples](https://atlaskit.atlassian.com/packages/design-system/onboarding/example/different-spotlights): dokumentierter Spotlight-Baustein mit zielbezogenen Touren. Die Beispiele benötigen JavaScript; aus dem nicht lesbaren Beispiel wird keine konkrete Ablaufempfehlung abgeleitet.

## Befund am bisherigen Ablauf

Das automatische Abdunkeln nach 600 ms und der sofortige Wechsel vom Reader zur Bibliothek ließen keine Orientierung zu. Die Reihenfolge folgte einem Funktionskatalog. Die eingegebene Probenotiz fehlte anschließend im leeren Notizbuch; ein Filter hatte dadurch kein sinnvolles Ergebnis. Erklärungskarten wechselten sichtbar und unvermittelt den Ort. Ein eigener Abschluss fehlte.

## Neuer Ablauf

Einladung im aktuellen Kontext → zehn optionale Übungsschritte in den Kapiteln **Eine Stelle bearbeiten**, **Gedanken ergänzen**, **Wiederfinden** → Abschluss mit Bezug auf die bearbeitete Stelle. Erst nach Zustimmung wechselt die Ansicht. Markierung, Schrift und Notiz bleiben innerhalb der Übung zusammen. Das Übungsnotizbuch enthält ausschließlich diese flüchtige Notiz. Karten werden beim Wechsel kurz ausgeblendet, nach dem Layout des Ziels wieder eingeblendet und behalten ihre Position, wenn dort genug Platz ist. Reduced Motion deaktiviert die Bewegung.

Die Quellen begründen Prinzipien; die konkrete Zehnerfolge und die Übergänge sind unsere Designentscheidung. Eine Prüfung mit echten Erstbenutzern steht aus. Technische Browsertests belegen Bedienbarkeit und Datenerhalt, keine gemessene Verbesserung von Verständnis oder Abschlussrate. Es werden dafür keine neuen Tracking-Ereignisse oder privaten Inhalte erhoben.
