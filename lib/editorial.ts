import type {Book,Character,Relation} from './reader-model';
const c=(id:string,name:string,description:string,aliases:string[]=[],afterSection=0):Character=>({id,name,description,aliases:[name,...aliases],afterSection,evidence:'Eigene Lesehilfe zum Originaltext; noch nicht fachredaktionell geprüft.'});
const rel=(active:string,passive:string,description:string,afterSection=0):Relation=>({active,passive,mutual:[],type:'literary',description,afterSection});
const introductions:Record<string,string>={
 iphigenie:'Iphigenie lebt fern ihrer Heimat als Priesterin auf Tauris. Gleich zu Beginn wird ihre Sehnsucht nach Griechenland hörbar.',
 krug:'Ein Gerichtstag beginnt mit einem Rätsel: Dorfrichter Adam ist verletzt. Sein Schreiber Licht möchte wissen, was geschehen ist.',
 faust:'Ein Gelehrter sucht nach Erkenntnis, die ihm seine Bücher nicht geben. Zueignung, Vorspiel und Prolog eröffnen das Drama aus verschiedenen Perspektiven.',
 woyzeck:'Büchners Drama blieb ein Fragment. Hier liest du die getrennten Handschriftengruppen H1–H4. Die Reihenfolge in deinem Schulbuch kann anders sein.',
 nathan:'Im Jerusalem der Kreuzzüge begegnen sich Menschen verschiedener Religionen. Lessing stellt die Frage, woran sich Menschlichkeit zeigt.',
 emilia:'Ein Prinz, ein Bild und ein Arbeitstag am Hof: Schon zu Beginn treffen private Wünsche auf politische Macht.',
 kabale:'Die Liebe zwischen Luise Miller und Ferdinand von Walter gerät in Konflikt mit Familie, Stand und höfischer Macht.',
 maria:'Maria Stuart ist in England gefangen. Schillers Drama macht den Konflikt zwischen persönlichem Schicksal und politischem Handeln sichtbar.',
 verwandlung:'Gregor Samsa wacht verwandelt auf. Trotzdem kreisen seine ersten Gedanken um Arbeit, Pflichten und die Erwartungen seiner Familie.'
};
const people:Record<string,Character[]>={
 iphigenie:[
  c('iphigenie','Iphigenie','Älteste Tochter Agamemnons und Priesterin der Diana auf Tauris. Artemis entriss sie in Aulis dem Opfertod und brachte sie in den Tempel. Zu Beginn lebt sie äußerlich geschützt, empfindet die Fremde aber als Bindung und sehnt sich nach Griechenland.',['Priesterin','Iphigenies','Iphigenien']),
  c('arkas','Arkas','Diener und Bote des Königs Thoas. Er überbringt Iphigenie dessen Werbung und drängt auf eine Entscheidung. Dabei beruft er sich auf ihre Dankespflicht gegenüber Thoas.',['Arkas’'],1),
  c('thoas','Thoas','König der Taurier. Er holte Iphigenie nach dem Tod seines Sohnes in sein Land und stellte die Menschenopfer ein. Zu Beginn wirbt er um sie und erwartet Dankbarkeit und Bindung.',['Thoas’','Königs Thoas'],2),
  c('orest','Orest','Iphigenies Bruder, Sohn Agamemnons und Klytaimnestras. Er kommt mit Pylades nach Tauris, verfolgt von Schuld und Unruhe nach dem Mord an seiner Mutter. Anfangs nennt er seinen Namen nicht.',['Orests','Orestes'],4),
  c('pylades','Pylades','Orests Freund und Begleiter seit der Kindheit. Er plant den Ausweg aus Tauris und redet Orest Mut zu. Dabei nimmt er es mit der Wahrheit nicht immer genau.',['Pylades’'],4),
  c('diana','Diana','Göttin der Jagd und des Mondes, der der Tempel auf Tauris geweiht ist. Iphigenie verdankt ihr nach eigener Aussage Leben und Rettung. In der griechischen Überlieferung entspricht ihr Artemis.',['Dianens','Artemis']),
  c('agamemnon','Agamemnon','Griechischer Heerführer vor Troja und Vater Iphigenies, Orests und Elektras. Iphigenie erinnert gleich im ersten Monolog an ihn und an die Opferung in Aulis.',['Agamemnons']),
  c('elektra','Elektra','Iphigenies Schwester in Mykene. Sie wird im ersten Monolog als Teil der zurückgelassenen Familie genannt und steht für die fortwirkende Schuld des Tantalidenhauses.',['Elektren','Elektrens'])
 ],
 krug:[
  c('adam','Adam','Dorfrichter in Huisum. Er erscheint am Morgen mit Wunden im Gesicht und an den Füßen und erklärt sie mit einem Sturz. Seine Erklärungen widersprechen sich und wecken Fragen.',['Adams','Richters Adam'],1),
  c('licht','Licht','Gerichtsschreiber in Huisum. Er bemerkt jede Lücke in Adams Geschichte und fragt hartnäckig nach. Gegenüber dem Gerichtsrat Walter vertritt er Ordnung und Aktenlage.',['Lichts','Schreibers Licht'],1),
  c('walter','Walter','Gerichtsrat aus Utrecht, der das ländliche Gericht unangemeldet prüft. Er beobachtet Verfahren und Personen genau und lässt sich nicht mit Ausreden abspeisen.',['Walters','Gerichtsrates'],4),
  c('frau_marthe','Frau Marthe','Marthe Rull, Klägerin vor dem Dorfgericht. Sie fordert Ersatz für ihren zerbrochenen Krug und tritt selbstbewusst und wortgewandt auf. Ihre Darstellung lenkt die Verhandlung.',['Marthe','Marthe Rull','Marthens'],6),
  c('eve','Eve','Tochter der Marthe Rull und Verlobte Ruprechts. Ihre Aussage ist für die Verhandlung entscheidend, doch sie zögert und weicht aus. Der Grund dafür wird erst spät verständlich.',['Eva','Eves'],6),
  c('ruprecht','Ruprecht','Verlobter Eves und Sohn Veits. Er gerät schnell unter Verdacht, den Krug zerbrochen zu haben, und reagiert eifersüchtig und aufbrausend. Seine Sicht der Nacht bleibt lückenhaft.',['Ruprechts'],6),
  c('veit','Veit','Bauer und Vater Ruprechts. Er bürgt für seinen Sohn und streitet mit Marthe Rull über Schuld und Entschädigung. Sein Misstrauen gilt auch dem Gericht selbst.',['Veits'],6),
  c('frau_brigitte','Frau Brigitte','Nachbarin mit wachem Blick, die als Zeugin auftritt. Was sie in der Nacht gesehen haben will, ist im Dorf umstritten. Ihre Aussage verschiebt die Beweislast.',['Brigitte','Brigitten'],11),
  c('der_buettel','Der Büttel','Gerichtsdiener in Huisum. Er führt Anordnungen aus, holt Personen herbei und kommentiert das Geschehen aus der Sicht des einfachen Personals.',['Büttels'],5)
 ],
 verwandlung:[
  c('gregor','Gregor Samsa','Reisender und Sohn der Familie Samsa. Er erwacht eines Morgens verwandelt und sorgt sich trotzdem zuerst um Pünktlichkeit, Arbeit und die Schulden der Familie. Sein Zimmer wird zu seinem einzigen Schutzraum.',['Gregor Samsa','Gregors']),
  c('grete','Grete Samsa','Gregors jüngere Schwester. Anfangs pflegt sie ihn heimlich und bringt ihm Essen. Wie weit ihre Zuwendung trägt, zeigt erst der weitere Verlauf.',['Grete Samsa','Gretes']),
  c('vater','Herr Samsa','Gregors Vater. Nach einem beruflichen Scheitern hängt die Familie finanziell von Gregors Verdienst ab. Er tritt gegenüber Gregor hart und abweisend auf.',['Herr Samsa','Vater','Vaters']),
  c('mutter','Frau Samsa','Gregors Mutter. Sie will zwischen Vater und Sohn vermitteln, scheut aber den direkten Anblick. Ihre ersten Worte an Gregor erreichen ihn nur durch die verschlossene Tür.',['Frau Samsa','Mutter','Mutters']),
  c('prokurist','Prokurist','Vertreter von Gregors Arbeitgeber. Er kommt persönlich in die Wohnung, um Gregors Fernbleiben zu klären, und steht für den Druck der Arbeitswelt. Sein Besuch löst die erste offene Konfrontation aus.',['Prokuristen','Prokuristin'])
 ],
 faust:[
  c('director','Theaterdirektor','Leiter des Theaters im Vorspiel. Ihn interessieren volle Kasse und gefälliges Programm. Dichtung ist für ihn zuerst ein Geschäft.',['Direktor','Theaterdirektors'],1),
  c('dichter','Dichter','Gesprächspartner im Vorspiel. Er will ein reines, hohes Kunstwerk und verachtet den Massengeschmack. Die Bühne empfindet er als Kompromiss.',['Dichters'],1),
  c('lustige_person','Lustige Person','Dritte Stimme im Vorspiel. Sie fordert Unterhaltung, Witz und Wirkung beim Publikum. Ihre Sicht vermittelt zwischen Direktor und Dichter.',['Lustigen Person'],1),
  c('der_herr','Der Herr','Göttliche Gestalt im Prolog im Himmel. Er lässt Mephistopheles gewähren und vertraut darauf, dass Faust seinen Weg findet. Seine Wette mit Mephistopheles eröffnet das Drama.',['Herrn'],2),
  c('mephistopheles','Mephistopheles','Geist der Verneinung, der im Prolog mit dem Herrn wettet und sich später an Faust bindet. Er ist scharfsinnig, spöttisch und zersetzend höflich. Ernst nimmt er nur den eigenen Vorteil.',['Mephisto','Mephistos'],2),
  c('faust','Faust','Gelehrter, der Theologie, Jura, Medizin und Philosophie durchlaufen hat und dennoch unbefriedigt bleibt. Er will erfahren, was die Welt zusammenhält, und setzt dafür alles ein. Seine Unruhe macht ihn angreifbar.',['Fausts','Doktor Faust'],3),
  c('wagner','Wagner','Fausts Famulus und gelehrter Gesprächspartner. Er vertraut Büchern, Fortschritt und Fleiß. Fausts innere Not bleibt ihm fremd.',['Wagners'],3),
  c('geist','Erdgeist','Geistige Macht, die Faust in der Nacht beschwört. Er weist Faust als Gleichrangigen ab und zeigt ihm seine Grenze. Die Begegnung stürzt Faust in Verzweiflung.',['Erdgeistes'],3),
  c('margarete','Margarete','Junge Frau aus einfachem Haus, genannt Gretchen. Sie lebt bei ihrer Mutter, versorgt das Kind ihrer Schwester und geht regelmäßig zur Kirche. Faust begegnet ihr auf der Straße und wirbt um sie.',['Gretchen','Gretchens','Margaretes','Margarethen'],9),
  c('gretchen','Gretchen','So wird Margarete meist genannt. Unter diesem Namen spricht sie in ihrer Stube, am Brunnen und im Kerker. Profil und Beziehung stehen bei Margarete.',['Margarete','Margaretes'],9),
  c('marthe','Marthe','Marthe Schwerdtlein, Nachbarin Gretchens und Kriegerwitwe. Sie nimmt Gretchen ins Vertrauen, vermittelt Treffen und folgt dabei auch eigenem Interesse an Mephistopheles’ Begleiter.',['Marthes','Frau Marthe'],12),
  c('valentin','Valentin','Gretchens Bruder und Soldat. Er kehrt zurück, erfährt von ihrer Schande und stellt Faust zur Rede. Familienehre bedeutet ihm mehr als Gretchens Lage.',['Valentins'],21),
  c('die_hexe','Hexe','Gestalt in der Hexenküche, die Faust einen verjüngenden Trank braut. Ihre Zaubersprüche und Tiere bilden eine Gegenwelt zur Gelehrtenstube.',['Hexen'],8),
  c('lieschen','Lieschen','Bekannte Gretchens am Brunnen. Ihr Gerede über eine gefallene Klassenkameradin zeigt die dörfliche Moral, vor der Gretchen sich fürchtet.',['Lieschens'],19),
  c('raphael','Raphael','Erzengel im Prolog im Himmel. Er preist mit Gabriel und Michael die Schöpfung. Die drei stehen für die verteidigte Ordnung, die Mephistopheles verspottet.',['Raphaels'],2),
  c('gabriel','Gabriel','Erzengel im Prolog im Himmel. Mit Raphael und Michael besingt er die Harmonie der Schöpfung. Mephistopheles’ Spott trifft auch sie.',['Gabriels'],2),
  c('michael','Michael','Erzengel im Prolog im Himmel. Dritter Lobpreis der Schöpfung neben Raphael und Gabriel. Seine Ordnung ist der Maßstab, an dem Mephisto reibt.',['Michaels'],2),
  c('frosch','Frosch','Zecher in Auerbachs Keller. Mit Brander, Siebel und Altmayer steht er für derbe Trinkfreude. Mephistopheles führt die Runde mit Zauber vor.',['Froschs'],7),
  c('brander','Brander','Zecher in Auerbachs Keller. Er stimmt das Rattenlied an und reizt die Runde. Mephistos Spuk antwortet auf seine Prahlerei.',['Branders'],7),
  c('siebel','Siebel','Zecher in Auerbachs Keller. Er neckt die Runde und bleibt bei Mephistos Zauber misstrauisch. Seine Nüchternheit schützt ihn nicht vor dem Spuk.',['Siebels'],7),
  c('altmayer','Altmayer','Zecher in Auerbachs Keller. Vierter in der Trinkrunde um Frosch, Brander und Siebel. Auch er erlebt Mephistos Weinwunder mit.',['Altmayers'],7),
  c('böser_geist','Böser Geist','Stimme in Gretchens Gewissen im Dom. Er hält ihr Mutter, Bruder und Kind vor und verdüstert ihr Gebet. Ob Engel oder Einbildung, bleibt Deutung.',['Bösen Geistes'],22)
 ],
 emilia:[
  c('der_prinz','Der Prinz','Hettore Gonzaga, Prinz von Guastalla. Er regiert absolut, langweilt sich bei den Amtsgeschäften und setzt seinen Willen auch in Liebesdingen durch. Emilia hat er bisher nur auf einem Bild und in der Kirche gesehen.',['Prinz','Prinzen','Hettore Gonzaga','Gonzaga'],1),
  c('conti','Conti','Hofmaler des Prinzen. Er malt Emilia und Orsina und spricht offen über Kunst und Charakter. Seine Bemerkung über Emilias Bild trifft den Prinzen empfindlich.',['Contis'],2),
  c('marinelli','Marinelli','Kammerherr und engster Vertrauter des Prinzen. Er verwandelt dessen Wünsche in Pläne und schreckt vor Gewalt nicht zurück. Sein Gegenspieler am Hof ist Camillo Rota, sein Werkzeug wird Angelo.',['Marinellis'],6),
  c('camillo_rota','Camillo Rota','Rat des Prinzen. Er steht für Recht und Verfahren und bremst Marinellis Willkür, wo er kann. Der Prinz übergeht ihn, sobald Emilia ins Spiel kommt.',['Rota','Camillo Rotas'],8),
  c('claudia','Claudia','Claudia Galotti, Emilias Mutter. Sie liebt ihre Tochter, plaudert aber sorglos über die Begegnung mit dem Prinzen. Ihre Offenheit wird später gegen die Familie verwendet.',['Claudia Galotti','Claudias'],10),
  c('odoardo','Odoardo','Odoardo Galotti, Emilias Vater und Oberst außer Dienst. Er lebt zurückgezogen auf dem Land, denkt streng und ehrenhaft und misstraut dem Hof zutiefst. Seine Sorge gilt Emilias Unbescholtenheit.',['Odoardo Galotti','Odoardos','Galotti'],11),
  c('emilia','Emilia','Tochter Odoardos und Claudias aus bürgerlichem Haus. Sie ist mit Graf Appiani verlobt und will noch am selben Tag heiraten. Fromm, selbstbewusst und ängstlich zugleich spürt sie die Gefahr am Hof genau.',['Emilia Galotti','Emilias','Emilien'],15),
  c('appiani','Appiani','Graf Appiani, Emilias Verlobter. Er liebt Emilia aufrichtig und will sie noch am Hochzeitstag vom Hof fernhalten. Marinellis Pläne machen ihn zum Hindernis.',['Graf Appiani','Appianis'],16),
  c('angelo','Angelo','Angeheuerter Verbrecher in Marinellis Diensten. Er überfällt die Hochzeitskutsche und tötet dabei Appiani. Odoardo kennt ihn noch von früher als seinen ehemaligen Diener.',['Angelos'],12),
  c('orsina','Orsina','Gräfin Orsina, frühere Geliebte des Prinzen. Klug, stolz und verletzt durchschaut sie Marinellis Spiel sofort. Im vierten Aufzug sucht sie Odoardo auf und bietet ihm Wahrheit und Waffe an.',['Gräfin Orsina','Orsinas'],33),
  c('pirro','Pirro','Diener im Hause Galotti. Er meldet Besucher an und steht für den geordneten bürgerlichen Haushalt, in den der Hof einbricht.',['Pirros'],10),
  c('battista','Battista','Diener des Prinzen. Er führt Befehle wortlos aus und zeigt, wie reibungslos der Hofapparat funktioniert.',['Battistas'],25),
  c('der_kammerdiener','Der Kammerdiener','Diener am Hof des Prinzen. Er bringt Nachrichten und wartet auf, ohne an den Entscheidungen beteiligt zu sein.',['Kammerdieners'],1)
 ],
 kabale:[
  c('miller','Miller','Musikmeister und Vater Luises. Er lebt von seiner Arbeit, denkt bürgerlich selbstbewusst und fürchtet zugleich die Macht des Hofes. Seine Tochter will er vor Ferdinand schützen und behalten.',['Millers','Musikmeisters'],0),
  c('millerin','Millerin','Frau des Musikmeisters und Mutter Luises. Sie schmeichelt sich gern an vornehme Namen und versteht die Gefahr zuerst nicht. Im Ernstfall steht sie zu Mann und Tochter.',['Millerins'],0),
  c('luise','Luise','Luise Miller, Tochter des Musikmeisters. Sie liebt Ferdinand aufrichtig, kennt aber die Standesschranke genau. Zwischen Liebe, Gehorsam und Gewissen gerät sie in einen unlösbaren Zwiespalt.',['Luise Miller','Luises','Luisen'],2),
  c('ferdinand','Ferdinand','Ferdinand von Walter, Major und einziger Sohn des Präsidenten. Er verachtet die Hofwelt seines Vaters und liebt Luise leidenschaftlich. Seine Eifersucht und sein Stolz machen ihn blind für die Intrige.',['Ferdinand von Walter','Ferdinands'],3),
  c('wurm','Wurm','Sekretär des Präsidenten. Er schmiedet mit dessen Wissen die Intrige gegen Luise und Ferdinand und wirbt selbst um Luise. Kalt, berechnend und kriecherisch nach oben kennt er keine Rücksicht.',['Wurms','Sekretärs Wurm'],1),
  c('praesident','Präsident von Walter','Präsident am Hof und Ferdinands Vater. Er plant für seinen Sohn eine Heirat mit Lady Milford und deckt Wurms Briefintrige. Macht und Standeserhalt stehen ihm über dem Glück des Sohnes.',['Präsident','Präsidenten','von Walter','Walters'],4),
  c('lady','Lady Milford','Johanna von Norfolk, Mätresse des Fürsten. Reich, klug und großzügig erkennt sie das Unrecht ihrer Stellung. Ihre Begegnung mit Luise wird zum Wendepunkt ihrer Lebensplanung.',['Lady Milford','Milford','Milfords'],8),
  c('hofmarschall','Hofmarschall von Kalb','Hofmarschall am Fürstenhof. Eitel, geschwätzig und feige dient er jedem Mächtigen an. Seine Heiratspläne mit Lady Milford scheitern an ihrer Verachtung.',['Hofmarschall von Kalb','von Kalb','Kalbs'],5),
  c('sophie','Sophie','Kammerjungfer der Lady Milford. Sie meldet Besucher, richtet Aufträge aus und beobachtet das Geschehen aus der Nähe des Hofes.',['Sophies'],8)
 ],
 maria:[
  c('maria','Maria','Maria Stuart, Königin von Schottland und Gefangene in England. Sie lebt seit Jahren in Haft auf Schloss Fotheringhay. Stolz, schuldig und gläubig zugleich kämpft sie um Würde, Freiheit und ihr Seelenheil.',['Maria Stuart','Marias','Stuart'],2),
  c('kennedy','Kennedy','Hanna Kennedy, Marias Amme und Vertraute. Sie pflegt Maria seit deren Kindheit und bleibt auch in der Haft an ihrer Seite. Ihre Sorge gilt Marias Leben und Glauben.',['Hanna Kennedy','Kennedys'],1),
  c('paulet','Paulet','Amias Paulet, Hüter Marias auf Fotheringhay. Er bewacht sie streng nach Vorschrift und verachtet ihre Religion. Menschlich bleibt er unbestechlich und lehnt heimlichen Mord ab.',['Amias Paulet','Paulets','Paulet'],1),
  c('mortimer','Mortimer','Neffe Paulets, neu aus Frankreich und Rom zurückgekehrt. Er gibt sich als Bekehrter und bietet Maria Rettung durch Mord an. Seine Leidenschaft gilt weniger der Sache als Maria selbst.',['Mortimers'],3),
  c('elisabeth','Elisabeth','Elisabeth I., Königin von England. Sie hält Maria gefangen, zögert aber mit der Unterschrift unter das Todesurteil. Eitelkeit, Staatsräson und Gewissensangst ringen in ihr miteinander.',['Elisabeth I','Elisabeths','Königin Elisabeth'],11),
  c('burleigh','Burleigh','Lord Burleigh, Schatzmeister und führender Staatsmann. Er drängt auf Marias Hinrichtung und denkt nur in Staatsnotwendigkeit. Gnade hält er für Schwäche.',['Lord Burleigh','Burleighs'],7),
  c('shrewsbury','Shrewsbury','Graf Shrewsbury, ältester englischer Lord. Er mahnt zu Recht, Maß und Menschlichkeit und warnt Elisabeth vor einem ungerechten Urteil. Maria begegnet er mit Achtung.',['Graf Shrewsbury','Shrewsburys','Talbot'],12),
  c('leicester','Leicester','Graf Leicester, Günstling Elisabeths. Er verspricht beiden Königinnen Hilfe und spielt ein doppeltes Spiel. Seine Eitelkeit und Feigheit gefährden alle.',['Graf Leicester','Leicesters'],12),
  c('davison','Davison','Staatssekretär Elisabeths. Er muss das unterschriebene Urteil verwahren und gerät zwischen Befehl und Verantwortung. Später lädt Elisabeth alle Schuld auf ihn ab.',['Davisons'],10),
  c('kent','Kent','Graf Kent, englischer Adliger am Hof. Er überbringt Befehle und steht für die offizielle Härte des Verfahrens.',['Kents'],10),
  c('aubespine','Aubespine','Französischer Gesandter in London. Er vertritt die Interessen Frankreichs und beobachtet den Prozess aus diplomatischer Distanz.',['Aubespines'],11),
  c('bellievre','Bellievre','Außerordentlicher Gesandter Frankreichs. Er bittet Elisabeth förmlich um Gnade für Maria und reist unverrichtet ab.',['Bellievres'],11),
  c('melvil','Melvil','Haushofmeister Marias. Er kehrt erst im fünften Aufzug zu ihr zurück und begleitet sie zum Schafott. Seine Treue gibt Maria Halt in der letzten Stunde.',['Melvils'],42),
  c('okelly','Okelly','Freund Mortimers und Mitwisser der Verschwörung. Er steht für das Netz heimlicher Boten und Helfer um Maria.',['Okellys'],27)
 ],
 nathan:[
  c('nathan','Nathan','Jüdischer Kaufmann in Jerusalem, genannt der Weise. Er zieht Recha als Pflegetochter auf und antwortet auf Saladins Fangfrage mit der Ringparabel. Seine Klugheit verbindet Großzügigkeit mit strenger Wahrheitsliebe.',['Nathans'],0),
  c('recha','Recha','Pflegetochter Nathans. Sie überlebt einen Brand und verehrt ihren Retter schwärmerisch als Engel. Was sie über ihre Herkunft glaubt, erweist sich erst spät als Irrtum.',['Rechas'],1),
  c('daja','Daja','Christliche Gesellschafterin Rechas im Hause Nathans. Sie kennt Rechas wahre Herkunft, plaudert Geheimnisse aus und drängt auf eine Heirat mit dem Tempelherrn.',['Dajas'],0),
  c('tempelherr','Tempelherr','Junger christlicher Ritter, von Saladin begnadigt. Er rettet Recha aus dem Feuer, verachtet zunächst Nathan und wirbt dann um Recha. Sein Name und seine Familie werden erst spät geklärt.',['Tempelherrn','Tempelherren'],4),
  c('klosterbruder','Klosterbruder','Früherer Diener Wolf von Filneks, nun Laienbruder. Er bringt Recha als Säugling zu Nathan und hütet das Geheimnis jahrelang. Seine Aussage löst die Auflösung mit aus.',['Klosterbruders'],4),
  c('saladin','Saladin','Sultan von Jerusalem. Großzügig, jähzornig und geldbedürftig stellt er Nathan die Frage nach der wahren Religion. Die Ringparabel gewinnt ihn für Freundschaft statt Urteil.',['Sultans Saladin','Saladins'],6),
  c('sittah','Sittah','Schwester Saladins. Klug und selbstbewusst lenkt sie das Gespräch auf Nathans Reichtum und plant mit ihrem Bruder die Fangfrage. Später erkennt sie in Recha und dem Tempelherrn ihre Verwandten.',['Sittahs'],6),
  c('derwisch','Derwisch','Al-Hafi, Derwisch und Schatzmeister Saladins. Er bewundert Nathan, hasst aber das Hofleben und die Geldgeschäfte. Schließlich verlässt er den Dienst und zieht nach Indien.',['Al-Hafi','Hafi','Derwischs','Derwischen'],2),
  c('patriarch','Patriarch','Christlicher Patriarch von Jerusalem. Machtbewusst und unduldsam hetzt er gegen Nathan und verlangt seine Bestrafung. Der Tempelherr wendet sich mit Abscheu von ihm ab.',['Patriarchen'],26)
 ],
 woyzeck:[
  c('woyzeck','Woyzeck','Franz Woyzeck, einfacher Füsilier. Er rasiert den Hauptmann, nimmt am Menschenversuch des Doktors teil und gibt seinen kargen Lohn an Marie und das Kind. Überarbeitung, Hunger und Eifersucht zermürben ihn.',['Franz Woyzeck','Woyzecks']),
  c('marie','Marie','Lebensgefährtin Woyzecks und Mutter seines Kindes. Sie liebt Woyzeck, lässt sich aber auf den Tambourmajor ein. Zwischen Reue, Trotz und Sinnlichkeit findet sie keinen Ausweg.',['Maries']),
  c('andres','Andres','Kamerad Woyzecks. Er teilt Dienst und Freizeit mit ihm, singt mit ihm und bemerkt seine Veränderung. Seine gutmütige Art bildet den Gegenpol zu Woyzecks Düsternis.',['Andres’']),
  c('tambourmajor','Tambourmajor','Selbstbewusster Unteroffizier. Er wirbt offen um Marie und prahlt mit Kraft und Ansehen. Für Woyzeck wird er zum Inbild des überlegenen Nebenbuhlers.',['Tambourmajors','Major']),
  c('doctor','Doctor','Arzt, der Woyzeck für eine Erbsendiät bezahlt und an ihm experimentiert. Menschen sind ihm Fälle, nicht Personen. Sein Ehrgeiz gilt dem wissenschaftlichen Ruhm.',['Doktor','Doktors','Doctors']),
  c('hauptmann','Hauptmann','Woyzecks Vorgesetzter. Er moralisiert über Tugend und Zeit, lässt sich rasieren und nutzt Woyzecks Abhängigkeit aus. Seine Reden zeigen Standesdünkel ohne Mitgefühl.',['Hauptmanns']),
  c('margreth','Margreth','Nachbarin Maries. Sie beobachtet genau, tratscht und hält Marie ihre Verbindung zum Tambourmajor vor. Ihre Worte schüren Maries Schuldgefühl.',['Margreths']),
  c('grossmutter','Großmutter','Alte Frau, die den Kindern ein Märchen ohne Trost erzählt. Ihre Geschichte von Mond, Sonne und Erde spiegelt die Verlorenheit der Welt.',['Großmutters','Großmuttern']),
  c('karl_narr','Karl','Als Narr bezeichneter Außenseiter. Er spricht in Rätseln und Prophezeiungen und hält Woyzeck und den Umstehenden einen verzerrten Spiegel vor.',['Karl','Narr','Karls'])
 ]
};
const relationships:Record<string,Relation[]>={
 iphigenie:[
  rel('iphigenie','thoas','Thoas ist König des Landes, in dem Iphigenie als Fremde lebt. Er schützt sie und wirbt um sie; sie empfindet Dank und zugleich Bindung. Beleg: erster Aufzug, besonders V. 33–34 und dritter Auftritt.'),
  rel('iphigenie','diana','Iphigenie dient Diana als Priesterin. Sie dankt der Göttin für die Rettung aus Aulis und bittet zugleich um Rückkehr nach Griechenland. Beleg: erstes Gebet, V. 35–42.'),
  rel('iphigenie','agamemnon','Agamemnon ist Iphigenies Vater. Im ersten Monolog erinnert sie an seine Tat in Aulis und an die Schuld ihres Hauses. Beleg: V. 41–58.'),
  rel('arkas','thoas','Arkas handelt als Bote und Vertrauter des Königs. Er überbringt dessen Werbung und drängt Iphigenie zur Antwort. Beleg: zweiter Auftritt, V. 54 ff.',1),
  rel('orest','pylades','Pylades begleitet Orest als Freund nach Tauris. Er plant die Flucht und stützt den verzweifelten Orest. Beleg: zweiter Aufzug, erster Auftritt.',4),
  rel('iphigenie','orest','Iphigenie und Orest sind Geschwister und erkennen einander erst im dritten Aufzug. Bis dahin spricht Orest unter falschem Namen von sich. Beleg: dritter Aufzug, dritter Auftritt.',9),
  rel('iphigenie','elektra','Elektra ist Iphigenies Schwester in Mykene. Beide trennt seit der Kindheit das Schicksal des Vaterhauses. Beleg: erster Monolog.')
 ],
 krug:[
  rel('adam','licht','Adam ist Dorfrichter, Licht sein Schreiber. Gleich zu Beginn fragt Licht nach Adams Wunden; jede Antwort wirft neue Fragen auf. Beleg: erster Auftritt.'),
  rel('adam','walter','Walter prüft als Gerichtsrat Adams Amtsführung. Er beobachtet Verfahren, Personen und Akten und lässt Ausflüchte nicht gelten. Beleg: ab viertem Auftritt.',4),
  rel('eve','frau_marthe','Eve ist die Tochter der Klägerin Marthe Rull. Sie soll deren Klage stützen, zögert aber mit der Aussage. Beleg: sechster Auftritt.',6),
  rel('eve','ruprecht','Eve und Ruprecht sind verlobt. Eifersucht und ein falsches Geständnis belasten ihre Beziehung schwer. Beleg: sechster bis achter Auftritt.',6),
  rel('veit','ruprecht','Veit ist Ruprechts Vater. Er verteidigt seinen Sohn gegen Marthe Rull und gegen das Gericht. Beleg: sechster Auftritt.',6),
  rel('frau_brigitte','eve','Frau Brigitte tritt als Zeugin gegen Eves Darstellung auf. Ob ihre nächtliche Beobachtung stimmt, bleibt im Dorf umstritten. Beleg: elfter Auftritt.',11),
  rel('adam','eve','Was Adam in der fraglichen Nacht bei Eve wollte, klärt erst Eves späte Aussage. Die Deutung bleibt eng am Text der letzten Auftritte zu prüfen. Beleg: zwölfter und letzter Auftritt.',12)
 ],
 verwandlung:[
  rel('gregor','grete','Gregor und Grete sind Geschwister. Anfangs versorgt Grete den verwandelten Gregor heimlich. Wie tragfähig ihre Zuwendung bleibt, zeigt erst der weitere Verlauf.',1),
  rel('gregor','vater','Herr Samsa ist Gregors Vater. Gregors Lohn sicherte bisher den Haushalt; nach der Verwandlung behandelt ihn der Vater mit Härte. Beleg: erstes Kapitel, besonders der Auftritt nach dem Prokuristenbesuch.'),
  rel('gregor','mutter','Frau Samsa ist Gregors Mutter. Sie will vermitteln, erträgt aber seinen Anblick kaum. Ihr erster Kontakt geschieht durch die verschlossene Tür.'),
  rel('gregor','prokurist','Der Prokurist vertritt Gregors Arbeitgeber und verlangt Rechenschaft für das Fernbleiben. Sein Besuch macht den Zusammenprall von Familie und Arbeitswelt sichtbar. Beleg: erstes Kapitel.')
 ],
 faust:[
  rel('director','dichter','Direktor und Dichter streiten im Vorspiel über Zweck des Theaters: Geschäft und Wirkung gegen reine Kunst. Die Lustige Person vermittelt. Beleg: Vorspiel auf dem Theater.',1),
  rel('der_herr','mephistopheles','Der Herr lässt Mephistopheles gewähren: Er darf Faust versuchen, aber nicht gewinnen. Die Wette eröffnet das Drama. Beleg: Prolog im Himmel.',2),
  rel('faust','wagner','Beide sind Gelehrte mit gegensätzlicher Haltung: Faust leidet am Buchwissen, Wagner vertraut ihm. Beleg: Nacht und Vor dem Tor.',3),
  rel('faust','mephistopheles','Mephistopheles bindet sich an Faust und verspricht Dienst im Diesseits gegen Dienst im Jenseits. Der Handel wird im Studierzimmer geschlossen. Beleg: Studierzimmer II.',6),
  rel('faust','margarete','Faust wirbt um Margarete; Mephistopheles und Marthe ebnen den Weg. Aus der Liebesgeschichte wird eine Schuldgeschichte. Beleg: ab Straße, dann Garten und Gretchens Stube.',9),
  rel('margarete','marthe','Marthe nimmt Gretchen ins Vertrauen und vermittelt die Treffen mit Faust. Dabei verfolgt sie auch eigenes Interesse. Beleg: Der Nachbarin Haus und Marthens Garten.',12),
  rel('margarete','valentin','Valentin ist Gretchens Bruder. Er erfährt von ihrer Schande und stellt Faust zum Kampf. Beleg: Nacht vor Gretchens Tür.',21),
  rel('margarete','lieschen','Lieschen und Gretchen kennen einander vom Brunnen. Lischens Gerede zeigt die Moral, die Gretchen fürchtet. Beleg: Am Brunnen.',19)
 ],
 emilia:[
  rel('odoardo','emilia','Odoardo und Claudia sind Emilias Eltern. Odoardo wacht streng über ihre Ehre und misstraut dem Hof. Beleg: zweiter Aufzug, zweiter Auftritt.',11),
  rel('claudia','emilia','Claudia liebt Emilia, unterschätzt aber die Gefahr. Ihre Erzählung von der Begegnung mit dem Prinzen liefert Marinelli Wissen. Beleg: zweiter Aufzug, erster und sechster Auftritt.',10),
  rel('emilia','appiani','Emilia und Graf Appiani sind verlobt und wollen noch am selben Tag heiraten. Die Hochzeit soll sie dem Zugriff des Hofes entziehen. Beleg: zweiter Aufzug, siebenter Auftritt.',16),
  rel('der_prinz','marinelli','Marinelli ist der Kammerherr und Planer des Prinzen. Er deutet dessen Wunsch als Befehl und organisiert den Überfall auf Appianis Kutsche. Beleg: erster Aufzug, sechster Auftritt und zweiter Aufzug.',6),
  rel('der_prinz','emilia','Der Prinz begehrt Emilia, die er kaum kennt. Seine Werbung vermischt Liebe mit Herrschaftsanspruch. Beleg: erster Aufzug, erster Auftritt.',1),
  rel('der_prinz','orsina','Orsina war die Geliebte des Prinzen und ist nun verstoßen. Sie durchschaut seine Taktik und sinnt auf Bloßstellung. Beleg: vierter Aufzug, dritter Auftritt.',33),
  rel('marinelli','orsina','Marinelli und Orsina sind Gegenspieler am Hof. Sie verachtet seine Ränke, er fürchtet ihre Klugheit und ihren Einfluss auf Odoardo. Beleg: vierter Aufzug.',33),
  rel('marinelli','angelo','Angelo führt Marinellis Auftrag aus: den Überfall auf Appiani. Dafür ist ihm Straflosigkeit versprochen. Beleg: zweiter Aufzug.',12),
  rel('der_prinz','conti','Conti ist der Hofmaler des Prinzen. Sein Emilia-Bildnis entfacht dessen Leidenschaft neu; sein Orsina-Bildnis kränkt den Prinzen mit Wahrheit. Beleg: erster Aufzug, zweiter Auftritt.',2)
 ],
 kabale:[
  rel('miller','luise','Miller ist Luises Vater. Er liebt sie, beansprucht Gehorsam und fürchtet zugleich Ferdinand und den Hof. Beleg: erster Akt, erste und dritte Szene.',0),
  rel('miller','millerin','Miller und seine Frau sind Luises Eltern. Er denkt selbstbewusst bürgerlich, sie schmeichelt dem Vornehmen. In der Not halten beide zusammen.'),
  rel('luise','ferdinand','Luise und Ferdinand lieben einander über die Standesschranke hinweg. Er stürmt voran, sie sieht das Unmögliche klarer. Beleg: erste Akte, besonders I/4 und II/3.',2),
  rel('praesident','ferdinand','Der Präsident ist Ferdinands Vater. Er verlangt Gehorsam und eine Heirat mit Lady Milford; Ferdinand verweigert sich. Beleg: I/5 und II/5.',4),
  rel('wurm','praesident','Wurm dient dem Präsidenten als Sekretär und Mitwisser. Gemeinsam erzwingen sie mit einem Brief Luises Gehorsam. Beleg: ab I/2, ausgeführt im dritten Akt.',1),
  rel('wurm','luise','Wurm wirbt selbst um Luise und wird abgewiesen. Seine Rache ist die erzwungene Liebesbrief-Lüge, die Ferdinand täuschen soll. Beleg: III/6.',21),
  rel('ferdinand','lady','Der Präsident bestimmt Lady Milford zur Braut Ferdinands; Ferdinand lehnt sie ab. Lady erkennt seine Liebe zu Luise. Beleg: II/1–II/3.',8),
  rel('lady','luise','Lady und Luise begegnen einander in II/3. Aus der Rivalin wird für Lady das moralische Vorbild, das ihren Abschied vom Hof auslöst. Beleg: II/3.',9),
  rel('lady','hofmarschall','Der Hofmarschall wirbt um Lady und wird von ihr verachtet. Er steht für die hohle Hofwelt, von der sie sich löst. Beleg: II/1.',8),
  rel('lady','sophie','Sophie dient Lady als Kammerjungfer. Sie meldet Ferdinand und Luise an und beobachtet den Umschwung ihrer Herrin. Beleg: II/1–II/2.',8)
 ],
 maria:[
  rel('maria','kennedy','Kennedy ist Marias Amme und Vertraute seit deren Kindheit. Sie pflegt Maria in der Haft und teilt ihre Angst. Beleg: erster Aufzug, erster Auftritt.',1),
  rel('maria','paulet','Paulet bewacht Maria streng und unerbittlich nach Vorschrift. Einen heimlichen Mord lehnt er dennoch ab. Beleg: I/1 und I/5.',1),
  rel('maria','mortimer','Mortimer bietet der Gefangenen Rettung durch Verschwörung und Mord an. Maria nimmt seine Hilfe an, ohne seine Leidenschaft zu teilen. Beleg: I/6.',6),
  rel('maria','elisabeth','Maria und Elisabeth sind rivalisierende Königinnen und Verwandte. Ihre einzige Begegnung im dritten Aufzug endet in offener Beschimpfung. Beleg: III/4.',24),
  rel('elisabeth','burleigh','Burleigh drängt Elisabeth zur Hinrichtung Marias und liefert die Staatsräson dafür. Gnade gilt ihm als Gefahr. Beleg: II/2 und IV/10.',11),
  rel('elisabeth','leicester','Leicester ist Elisabeths Günstling und verspricht gleichzeitig Maria Hilfe. Sein doppeltes Spiel fliegt im vierten Aufzug auf. Beleg: III/3 und IV/8–IV/9.',12),
  rel('elisabeth','shrewsbury','Shrewsbury mahnt Elisabeth zu Recht und Menschlichkeit und warnt vor dem Urteil. Er bleibt Marias Fürsprecher ohne Verschwörer zu sein. Beleg: II/3 und IV/10.',12),
  rel('elisabeth','davison','Davison trägt als Staatssekretär das unterschriebene Urteil weiter. Elisabeth schiebt ihm später die Verantwortung zu. Beleg: IV/10 und V/13.',29),
  rel('maria','melvil','Melvil ist Marias Haushofmeister und begleitet sie in der letzten Stunde. Mit ihm empfängt sie die Sakramente. Beleg: fünfter Aufzug, neunte Szene.',42),
  rel('elisabeth','aubespine','Aubespine und Bellievre bitten als französische Gesandte um Gnade für Maria. Elisabeth weist sie hin und schiebt die Schuld auf Frankreichs Einmischung. Beleg: II/2.',11)
 ],
 nathan:[
  rel('nathan','recha','Recha gilt zu Beginn als Nathans Tochter. Er liebt sie und hat sie ohne dogmatischen Zwang erzogen. Dass sie nicht seine leibliche Tochter ist, klärt erst der fünfte Aufzug. Beleg: I/1–I/2.',0),
  rel('nathan','daja','Daja lebt als Gesellschafterin in Nathans Haus. Sie kennt Rechas Geheimnis und trägt es gegen Nathans Willen weiter. Beleg: I/1.',0),
  rel('recha','tempelherr','Der Tempelherr rettet Recha aus dem Feuer; sie verehrt ihn, er weist sie zuerst ab. Daja betreibt ihre Verbindung. Beleg: I/6 und II/5.',4),
  rel('saladin','sittah','Sittah ist Saladins Schwester und kluge Beraterin. Gemeinsam stellen sie Nathan die Fangfrage nach der wahren Religion. Beleg: II/1.',6),
  rel('saladin','nathan','Saladin braucht Geld und stellt Nathan auf die Probe; Nathan antwortet mit der Ringparabel. Daraus wird Freundschaft und gegenseitige Achtung. Beleg: III/5–III/7.',16),
  rel('tempelherr','klosterbruder','Der Klosterbruder kennt die Herkunft des Tempelherrn und schweigt lange. Seine Auskunft bringt die Auflösung ins Rollen. Beleg: IV/7.',29),
  rel('tempelherr','patriarch','Der Tempelherr sucht Rat beim Patriarchen und stößt auf Unduldsamkeit und Machtgier. Er wendet sich angewidert ab. Beleg: IV/2.',26),
  rel('nathan','klosterbruder','Der Klosterbruder übergab Nathan einst das christliche Kind zur Pflege. Beide hüten das Buch mit den Geschlechtsnamen. Beleg: IV/7.',29),
  rel('recha','tempelherr','Recha und der Tempelherr sind Geschwister und Saladins Großnichte und Großneffe. Diese Verwandtschaft enthüllt erst der Schluss. Beleg: V/7–V/8.',39)
 ],
 woyzeck:[
  rel('woyzeck','marie','Woyzeck und Marie leben mit ihrem unehelichen Kind zusammen. Er gibt ihr seinen Lohn, sie sucht Nähe und Abwechslung anderswo. Die Beziehung trägt Liebe und Überforderung zugleich.'),
  rel('marie','tambourmajor','Der Tambourmajor wirbt offen um Marie; sie lässt sich auf ihn ein. Woyzeck beobachtet die Annäherung. Beleg: H1-Szenen um Jahrmarkt und Kammer.'),
  rel('woyzeck','andres','Andres ist Woyzecks Kamerad. Gemeinsam schneiden sie Stöcke, singen und teilen den Dienst. Andres bemerkt Woyzecks Veränderung, ohne sie zu verstehen.'),
  rel('woyzeck','hauptmann','Der Hauptmann beschäftigt Woyzeck als Barbier und moralisiert über ihn. Woyzeck hört zu und widerspricht kaum. Beleg: H2-Szene beim Hauptmann.'),
  rel('woyzeck','doctor','Der Doktor bezahlt Woyzeck für die Erbsendiät und beobachtet ihn wie einen Versuch. Woyzecks Klagen deutet er als interessante Symptome. Beleg: H2-Szene beim Doktor.'),
  rel('marie','margreth','Margreth hält Marie ihre Untreue vor und droht mit Gerede. Marie antwortet trotzig und zugleich schuldbewusst.'),
  rel('marie','grossmutter','Die Großmutter erzählt den Kindern ein trostloses Märchen. Marie hört zu; die Geschichte spiegelt ihre eigene Ausweglosigkeit.')
 ]
};
function fallback(book:Book,p:Character):Character {
 if(!/^(Figur in |Sprecher in )/.test(p.description))return p;
 if(book.id==='faust')return {...p,description:'Kurz auftretende Nebenstimme in Faust I, zum Beispiel Chor, Gruppe oder einzelne Walpurgisnacht-Gestalt. Für die Haupthandlung nicht tragend.'};
 return {...p,description:`Nebenfigur in ${book.title}. Tritt nur kurz auf und trägt die Haupthandlung nicht.`};
}
export function enrichBook(book:Book):Book {
 const overrides=people[book.id]??[];
 const chars=book.characters.map(p=>overrides.find(o=>o.id===p.id||o.name.toLowerCase()===p.name.toLowerCase())??fallback(book,p));
 for(const p of overrides) if(!chars.some(c=>c.id===p.id))chars.push(p);
 return {...book,referenceMode:book.id==='woyzeck'?'paragraph':book.referenceMode,characters:chars,relations:[...(relationships[book.id]??[]),...book.relations],introduction:introductions[book.id]};
}
