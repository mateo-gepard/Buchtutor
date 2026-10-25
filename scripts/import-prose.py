"""Import only the three additional prose works from pinned public snapshots.

No existing book or source is rewritten. The original nine editions must be
imported with their own established contract, not with this script. Source bytes
are hashed before parsing; a changed snapshot requires a deliberate new edition.
The v1 rendering contracts are stored with each book below. This importer never
uses an LLM, a spelling dictionary, or school-edition page/line numbers.
"""
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import textwrap
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'corpus/sources'
OUT = ROOT / 'corpus/books'
NS = {'t': 'http://www.tei-c.org/ns/1.0'}
SOURCES = {
    'lenz': ('html', 'https://de.wikisource.org/w/index.php?title=Lenz_(Georg_B%C3%BCchner)&oldid=3071239', 'daf24e8cf534d4013c1e3d1999b05ee38bfeacb45d368903c779f071bf10f41c'),
    'sandmann': ('xml', 'https://www.deutschestextarchiv.de/book/download_xml/hoffmann_nachtstuecke01_1817', 'd220f20e6f74d00eac2a35aaadc51a0bf08c5eb519e60a1b931c04d748973416'),
    'kleider': ('txt', 'https://www.gutenberg.org/cache/epub/28042/pg28042.txt', 'd2bcf015f1dfa76f71bd4781d7295f12a94637ad387f01e39bd0bf40b6ac0031'),
}
TYPOGRAPHY = str.maketrans({'ſ': 's'})
UMLAUTS = dict(zip('aouAOU', 'äöüÄÖÜ'))


def clean(value):
    """Typographic glyph normalization only; historical spelling stays intact."""
    value = value.translate(TYPOGRAPHY)
    value = re.sub(r'([aouAOU])\u0364', lambda m: UMLAUTS[m[1]], value)
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', value)).strip()


def snapshot(slug):
    ext, url, expected = SOURCES[slug]
    path = SOURCE / f'{slug}.{ext}'
    if not path.exists():
        request = urllib.request.Request(url, headers={
            'User-Agent': 'Buchtutor-Corpus/1.0 (educational text import)',
            'Cookie': 'verified=1',
        })
        with urllib.request.urlopen(request, timeout=45) as response:
            raw = response.read()
        assert hashlib.sha256(raw).hexdigest() == expected, 'Restore the pinned source snapshot; remote bytes changed.'
        path.write_bytes(raw)
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == expected, f'{slug}: source snapshot changed'
    return raw


def person(pid, name, description, evidence, aliases=(), after=0):
    return dict(id=pid, name=name, description=description, evidence=evidence,
                aliases=list(dict.fromkeys([name, *aliases])), afterSection=after)


def section(title, texts, kind='text', path=None):
    return dict(title=title, path=path or [], kind=kind, texts=texts)


def book(slug, title, author, year, epoch, genre, color, parts, characters,
         source_label, source_edition, licenses, note, contract, **extra):
    digest = SOURCES[slug][2]
    sections = []
    count = 0
    for i, part in enumerate(parts):
        blocks = []
        for text in part['texts']:
            assert text and text == clean(text)
            count += 1
            blocks.append(dict(id=f'b{count:05d}', kind='prose', text=text,
                               number=count, unit='paragraph'))
        assert len(blocks) >= 2, 'Each reading section needs a usable range.'
        sections.append(dict(id=f's{i+1:03d}', title=part['title'], path=part['path'],
                             kind=part['kind'], blocks=blocks, firstRef=blocks[0]['number'],
                             lastRef=blocks[-1]['number'], unit='paragraph', characters=[]))
    return dict(id=slug, title=title, author=author, year=year, epoch=epoch,
                genre=genre, color=color, editionId=f'{slug}-prose-v1-{digest[:12]}',
                revision=digest, sourceUrl=SOURCES[slug][1], sourceLabel=source_label,
                sourceEdition=source_edition, licenses=licenses, referenceMode='paragraph',
                schoolAligned=False, validation=dict(textBlocks=count, paragraphCount=count,
                textExact=True, manualReview=False), note=note,
                curriculum='Ergänzende Oberstufenlektüre', sourceFile=f'{slug}.{SOURCES[slug][0]}',
                sourceParser=dict(version='prose-v1', contract=contract),
                characters=characters, relations=[], sections=sections, **extra)


@dataclass
class HtmlNode:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)


class HtmlTree(HTMLParser):
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
            'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = HtmlNode('document')
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = HtmlNode(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def html_nodes(node):
    yield node
    for child in node.children:
        if isinstance(child, HtmlNode):
            yield from html_nodes(child)


def html_text(node):
    if isinstance(node, str):
        return node
    if node.tag in {'script', 'style'} or set(node.attrs.get('class', '').split()) & {
        'PageNumber', 'reference', 'references', 'mw-references'
    }:
        return ''
    if node.tag == 'br':
        return '\n'
    return ''.join(html_text(child) for child in node.children)


def import_lenz():
    tree = HtmlTree()
    raw = snapshot('lenz').decode('utf-8')
    assert '"wgRevisionId":3071239' in raw
    tree.feed(raw)
    content = next(node for node in html_nodes(tree.root)
                   if 'mw-parser-output' in node.attrs.get('class', '').split())
    texts = []
    started = ended = False
    for node in html_nodes(content):
        if node.tag != 'p':
            continue
        value = clean(html_text(node))
        if value.startswith('Den 20. ging Lenz durchs Gebirg.'):
            assert not started, 'Duplicate narrative beginning'
            started = True
        if started and value:
            texts.append(value)
        if started and value.endswith('So lebte er hin. …'):
            ended = True
            break
    assert started and ended and len(texts) == 33
    assert sum('Leiden sei mein Gottesdienst.' in t for t in texts) == 1
    assert sum('Ich hab‘ mein Schatz, und der ist weit.' in t for t in texts) == 1
    assert sum('Wird es denn niemals wieder Nacht?' in t for t in texts) == 1
    assert all('K.E.F.' not in t and 'K. E. F.' not in t for t in texts)
    return book('lenz', 'Lenz', 'Georg Büchner', 1839, 'Vormärz', 'Erzählfragment', '#687461',
        [section('Lenz · vollständiges Erzählfragment', texts)], [
            person('lenz', 'Lenz', 'Die Titelfigur wandert zu Beginn durch das Gebirge und kommt zu Oberlin ins Steinthal.', 'Abs. 1 dieser digitalen Ausgabe.', ['Lenzen', 'Lenzens']),
            person('oberlin', 'Oberlin', 'Pfarrer im Steinthal. Er nimmt Lenz in seinem Haus auf.', 'Abs. 1–2 dieser digitalen Ausgabe.', ["Oberlin’s", "Oberlin's"]),
            person('kaufmann', 'Kaufmann', 'Ein Besucher, der mit seiner Braut ins Steinthal kommt und mit Lenz spricht.', 'Abs. 8 dieser digitalen Ausgabe.', ['Kaufmanns']),
            person('madame_oberlin', 'Madame Oberlin', 'Oberlins Frau. Lenz sucht das Gespräch mit ihr.', 'Abs. 16–18 dieser digitalen Ausgabe.', ['Frau Oberlin']),
        ], 'Wikisource · Franzos-Ausgabe 1879',
        'Georg Büchner: Sämmtliche Werke und handschriftlicher Nachlaß. Erste kritische Gesammt-Ausgabe, herausgegeben von Karl Emil Franzos. Sauerländer, Frankfurt am Main 1879, S. 205, 207–239. Wikisource-Transkription, Revision 3071239. Erstveröffentlichung des Fragments 1839.',
        [dict(name='Gemeinfreier Originaltext; Wikisource-Lizenzbestimmungen', url='https://de.wikisource.org/wiki/Wikisource:Lizenzbestimmungen')],
        'Vollständiger erhaltener Erzähltext des Fragments, einschließlich der drei Liedstrophen; ohne Herausgeberanmerkungen. 33 digitale Absätze einschließlich Liedstrophen. Historische Schreibweise der Wikisource-Transkription; Leerraum und typografische Zeichen sind normalisiert. Keine Schulbuchseiten oder ISBN-Zuordnung.',
        'Wikisource HTML, oldid 3071239: p-Elemente im mw-parser-output vom eindeutigen Beginn „Den 20. ging Lenz durchs Gebirg.“ bis einschließlich „So lebte er hin. …“; eingeschobene Gedichte bleiben enthalten. PageNumber, Fußnotenverweise und Referenzlisten sind Metadaten und werden ausgeschlossen. HTML-Entities dekodieren; br und sonstigen Leerraum auf Einzelabstände reduzieren; ſ→s, a/o/u/A/O/U + U+0364→ä/ö/ü/Ä/Ö/Ü, Unicode NFC. Keine sonstige Rechtschreibänderung.',
        sourceContributors='https://de.wikisource.org/w/index.php?title=Lenz_(Georg_B%C3%BCchner)&action=history&offset=20171206215224')


def tei_tag(node):
    return node.tag.rsplit('}', 1)[-1]


def tei_text(node):
    tag = tei_tag(node)
    if tag in {'fw', 'note', 'pb', 'milestone'}:
        return ''
    if tag == 'lb':
        return '\n'
    if tag == 'choice':
        selected = node.find('t:corr', NS)
        assert selected is not None, 'Unspecified choice contract'
        return tei_text(selected)
    return (node.text or '') + ''.join(tei_text(c) + (c.tail or '') for c in node)


def sandmann_paragraphs(nodes):
    texts = []
    for node in nodes:
        value = tei_text(node)
        # Preserve genuine compound hyphens at these two printed line breaks.
        # "Wald- und" has a plain space and must not be joined.
        for left, right in [('Wetterglas-', 'Haͤndler'), ('himmliſch-', 'ſchoͤne')]:
            value = re.sub(re.escape(left) + r'\s*\n\s*' + re.escape(right), left + right, value)
        value = re.sub(r'¬\s*', '', value)
        value = clean(value)
        assert '¬' not in value
        # These are the two TEI p boundaries caused by a printed page break,
        # not new paragraphs: pp. 1/2 (entsetzli¬|ches) and 72/73 (Da|packte).
        first_child = next(iter(node), None)
        if texts and first_child is not None and tei_tag(first_child) == 'pb' and not (node.text or '').strip():
            assert ((texts[-1].endswith('entsetzli') and value.startswith('ches ist')) or
                    (texts[-1].endswith('— Da') and value.startswith('packte ihn')))
            join = '' if texts[-1].endswith('entsetzli') else ' '
            texts[-1] += join + value
        else:
            texts.append(value)
    return texts


def import_sandmann():
    root = ET.fromstring(snapshot('sandmann'))
    body = root.find('.//t:body', NS)
    divs = body.findall('t:div', NS)
    target = divs[0]
    assert clean(tei_text(target.find('t:head', NS))) == 'Der Sandmann .'
    assert clean(tei_text(divs[1].find('t:head', NS))) == 'Ignaz Denner.'
    letters = target.findall('t:div', NS)
    assert [clean(tei_text(d.find('t:head', NS))) for d in letters] == [
        'Nathanael an Lothar.', 'Clara an Nathanael.', 'Nathanael an Lothar.']
    first = sandmann_paragraphs(letters[0].findall('t:p', NS))
    second = sandmann_paragraphs(letters[1].findall('t:p', NS))
    third_nodes = letters[2].findall('t:p', NS)
    assert len(third_nodes) == 21
    third = sandmann_paragraphs(third_nodes[:2])
    narrative = sandmann_paragraphs(third_nodes[2:])
    assert [len(first), len(second), len(third), len(narrative)] == [15, 6, 2, 18]
    assert narrative[0].startswith('Seltsamer und wunderlicher')
    assert narrative[-1].endswith('niemals hätte gewähren können.')
    rendered = '\n'.join(first + second + third + narrative)
    assert rendered.count('Wetterglas-Händler') == 1
    assert rendered.count('himmlisch-schöne') == 1
    assert rendered.count('Wald- und Blumenflur') == 1
    assert 'Wetterglas- Händler' not in rendered and 'himmlisch- schöne' not in rendered
    assert sum(len(d.findall('t:p', NS)) for d in letters) == 43
    parts = [section('Nathanael an Lothar · erster Brief', first, 'letter', ['Der Sandmann']),
             section('Clara an Nathanael', second, 'letter', ['Der Sandmann']),
             section('Nathanael an Lothar · zweiter Brief', third, 'letter', ['Der Sandmann']),
             section('Erzählung nach den Briefen · redaktioneller Abschnitt', narrative, 'editorial-section', ['Der Sandmann'])]
    return book('sandmann', 'Der Sandmann', 'E. T. A. Hoffmann', 1817, 'Romantik', 'Erzählung', '#65546f', parts, [
        person('nathanael', 'Nathanael', 'Verfasser des ersten und dritten Briefs. Er berichtet Lothar von einer beunruhigenden Begegnung und von Erinnerungen an seine Kindheit.', 'Erster Brief, Abs. 1–2.', ['Nathanaels', "Nathanael's"]),
        person('clara', 'Clara', 'Nathanael nennt sie im ersten Brief liebevoll Clärchen. Im zweiten Brief antwortet sie selbst.', 'Erster Brief, Abs. 1; zweiter Brief, Abs. 16.', ['Clärchen', 'Claras', "Clara's"]),
        person('lothar', 'Lothar', 'Adressat von Nathanaels beiden Briefen. Nathanael wendet sich mit seinen Sorgen an ihn.', 'Überschrift und Beginn des ersten Briefs.', ['Lothars']),
        person('coppelius', 'Coppelius', 'Advokat und früherer Gast im Elternhaus. In seinem ersten Brief erinnert Nathanael sich mit Furcht an ihn.', 'Erster Brief, Abs. 4–7.', ['Coppelius’']),
        person('coppola', 'Giuseppe Coppola', 'Ein Wetterglashändler, dessen Besuch Nathanael im ersten Brief beschreibt. Nathanael verknüpft den Besucher mit seiner Erinnerung an Coppelius.', 'Erster Brief, Abs. 1 und 13.', ['Coppola', 'Giuseppe', 'Giuſeppe Coppola']),
        person('spalanzani', 'Spalanzani', 'Professor der Physik, dessen Vorlesungen Nathanael besucht.', 'Dritter Brief, Abs. 22.', ["Spalanzani's"], after=2),
        person('olimpia', 'Olimpia', 'Nathanael sieht sie in Spalanzanis Haus. Im dritten Brief berichtet er, sie sei dessen Tochter.', 'Dritter Brief, Abs. 22.', ['Olimpias'], after=2),
    ], 'Deutsches Textarchiv · Erstdruck 1817',
        'E. T. A. Hoffmann: Nachtstücke. Erster Theil. Realschulbuchhandlung, Berlin 1817, S. 1–82. DTA-Transkription des Exemplars der Staatsbibliothek zu Berlin, Signatur 19 ZZ 4975-1/2. Nur „Der Sandmann“, ohne die folgenden Erzählungen.',
        [dict(name='Gemeinfreier Originaltext; reine Texte nach DTA-Nutzungsbedingungen frei nutzbar', url='https://www.deutschestextarchiv.de/doku/nutzungsbedingungen'),
         dict(name='DTA-XML und Annotationen: CC BY-SA 4.0', url='https://creativecommons.org/licenses/by-sa/4.0/deed.de')],
        'Vollständige Erzählung des Erstdrucks von 1817. Drei originale Briefüberschriften; die anschließende Erzählung ist als redaktioneller Abschnitt abgetrennt. 41 digitale Absätze, keine Schulbuchseiten. Langes s und historische Umlautzeichen sind typografisch normalisiert; historische Schreibweise bleibt erhalten. DTA-Korrekturen werden übernommen, Drucksignaturen und rein druckbedingte Worttrennungen ausgelassen.',
        'DTA TEI: vollständiges erstes direktes body/div (n=1, head „Der Sandmann .“) bis vor „Ignaz Denner.“; alle 43 p-Elemente der drei untergeordneten divs in Reihenfolge. Dritter Brief endet vor dem Trennstrich nach „Tausend Grüße“; danach redaktionelle Abschnittsgrenze. choice/corr statt choice/sic; fw, note, pb, milestone aus dem Lesetext ausschließen. Discretionary ¬ plus folgenden Leerraum entfernen; die zwei p-Seitenfortsetzungen entsetzli¬|ches und Da|packte zusammenführen. Bei Wetterglas-<lb/>Händler und himmliſch-<lb/>ſchoͤne ausschließlich den Umbruchleerraum entfernen und den Bindestrich erhalten; „Wald- und Blumenflur“ bleibt unverändert. ſ→s, a/o/u/A/O/U + U+0364→ä/ö/ü/Ä/Ö/Ü; Unicode NFC und Leerraum vereinheitlichen. Keine sonstige Rechtschreibänderung.')


def import_kleider():
    raw = snapshot('kleider').decode('utf-8-sig').replace('\r\n', '\n')
    start = '\nKleider machen Leute\n'
    end = '\nDer Schmied seines Glückes\n'
    assert raw.count(start) == 1 and raw.count(end) == 1
    story = raw.split(start, 1)[1].split(end, 1)[0].strip()
    # The source introduction defines #...# as Antiqua typography.
    assert re.findall(r'#([^#]*)#', story) == ['a', 'b']
    story = re.sub(r'#([^#]*)#', r'\1', story)
    assert '#' not in story
    texts = [clean(p) for p in re.split(r'\n\s*\n', story) if p.strip()]
    assert len(texts) == 173
    assert texts[0].startswith('An einem unfreundlichen Novembertage wanderte ein armes Schneiderlein')
    assert texts[-1] == 'Aber in Seldwyla ließ er nicht einen Stüber zurück, sei es aus Undank oder aus Rache.'
    return book('kleider', 'Kleider machen Leute', 'Gottfried Keller', 1874, 'Poetischer Realismus', 'Novelle', '#806b4c',
        [section('Kleider machen Leute', texts)], [
            person('wenzel', 'Wenzel Strapinski', 'Ein armer Schneider auf dem Weg nach Goldach. Sein sorgfältig gepflegtes Äußeres steht im Gegensatz zu seiner Notlage.', 'Abs. 1; Namensnennung in Abs. 31.', ['Wenzel', 'Strapinski', 'Strapinskis']),
            person('wirt', 'Wirt', 'Wirt des Gasthauses zur Wage in Goldach. Er empfängt den ankommenden Schneider als vornehmen Gast.', 'Abs. 5–6.', ['Wirtes']),
            person('melcher', 'Melcher Böhni', 'Buchhalter einer großen Spinnerei. Er gehört zur Gesellschaft in Goldach.', 'Abs. 32.', ['Böhni', 'Böhnis', 'Melcher']),
            person('amtsrat', 'Amtsrat', 'Ein wohlhabender Mann bei Goldach und Nettchens Vater.', 'Abs. 39 und 47.', ['Amtsrates']),
            person('nettchen', 'Nettchen', 'Tochter des Amtsrats. Sie begegnet dem Schneider zusammen mit ihrem Vater.', 'Abs. 47.', ['Nettchens']),
        ], 'Project Gutenberg · Cotta-Ausgabe 1913',
        'Gottfried Keller: Gesammelte Werke. Fünfter Band. Die Leute von Seldwyla, zweiter Band. 74.–78. Auflage. J. G. Cotta, Stuttgart und Berlin 1913, S. 11–65. Project Gutenberg eBook 28042. Nur die Novelle „Kleider machen Leute“; Erstveröffentlichung 1874.',
        [dict(name='Gemeinfreier Originaltext; Transkriptionsquelle mit Gutenberg-Lizenz', url='https://www.gutenberg.org/policy/license.html')],
        'Vollständige Novelle nach der Cotta-Ausgabe von 1913, ohne Sammlungseinleitung und andere Erzählungen. 173 digitale Absätze; keine Zeilen- oder Seitenzahlen einer Schulausgabe und kein ISBN-Abgleich.',
        'Project-Gutenberg-UTF-8-Snapshot 28042, Originalbytes einschließlich CRLF durch .gitattributes erhalten. Zum Parsen UTF-8-BOM entfernen und CRLF→LF; Text nach der genau einmal vorkommenden alleinstehenden Überschrift „Kleider machen Leute“ bis vor die genau einmal vorkommende alleinstehende Überschrift „Der Schmied seines Glückes“. Die laut Quellenhinweis als Antiqua-Schriftauszeichnung verwendeten #...#-Marker bei #a# und #b# entfernen; die Buchstaben a und b erhalten. Leerzeilen trennen Absätze; übriger Leerraum→Einzelabstände, Unicode NFC. Kein Text aus Inhaltsverzeichnis, Sammlungseinleitung, Folgeschichten oder Gutenberg-Lizenzteil.')


def append_entries(path, values, object_mode=False):
    """Append only; preserve every pre-existing catalog/validation byte."""
    old_text = path.read_text(encoding='utf-8')
    current = json.loads(old_text)
    additions = []
    for key, value in values:
        existing = current.get(key) if object_mode else next((v for v in current if v['id'] == key), None)
        if existing is not None:
            assert existing == value, f'{path.name}: existing {key} differs; refusing to replace metadata'
            continue
        if object_mode:
            encoded = json.dumps({key: value}, ensure_ascii=False, indent=2)[2:-2]
        else:
            encoded = textwrap.indent(json.dumps(value, ensure_ascii=False, indent=2), '  ')
        additions.append(encoded)
    if additions:
        closing = '}' if object_mode else ']'
        assert old_text.rstrip().endswith(closing)
        prefix = old_text.rstrip()[:-1].rstrip()
        path.write_text(prefix + ',\n' + ',\n'.join(additions) + '\n' + closing, encoding='utf-8')


def main():
    # Parse and validate all three snapshots before writing any new book.
    books = [import_lenz(), import_sandmann(), import_kleider()]
    catalog = [(b['id'], {k: v for k, v in b.items() if k not in {'sections', 'characters', 'relations'}}) for b in books]
    validations = [(b['id'], b['validation']) for b in books]
    # Check existing added entries before any writes, to reject accidental changes.
    current_catalog = json.loads((ROOT / 'corpus/catalog.json').read_text())
    for key, value in catalog:
        previous = next((entry for entry in current_catalog if entry['id'] == key), None)
        assert previous is None or previous == value, f'{key}: existing edition metadata changed'
    for b in books:
        (OUT / f'{b["id"]}.json').write_text(json.dumps(b, ensure_ascii=False, indent=2), encoding='utf-8')
    append_entries(ROOT / 'corpus/catalog.json', catalog)
    append_entries(ROOT / 'corpus/validation.json', validations, object_mode=True)
    for b in books:
        print(json.dumps(dict(id=b['id'], editionId=b['editionId'], revision=b['revision'],
                              sections=len(b['sections']), **b['validation']), ensure_ascii=False))


if __name__ == '__main__':
    main()
