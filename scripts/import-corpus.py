"""Deterministic source import. Never let a language model rewrite the source text.

Each edition is pinned by a SHA-256 digest. Re-imports preserve anchors if the
source digest is unchanged; an altered source is a new edition revision.
Only the Iphigenie source has validated split-verse annotations. Other TEI line
elements are intentionally called Textzeilen, never school edition verses.
"""
from pathlib import Path
import hashlib, json, re, sys, urllib.request, xml.etree.ElementTree as ET
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'corpus' / 'sources'
OUT = ROOT / 'corpus' / 'books'
NS = {'t': 'http://www.tei-c.org/ns/1.0'}
XML_ID = '{http://www.w3.org/XML/1998/namespace}id'
COMMIT = '5d9e0731345fa669e4b897fee9c97bc59a8e86d0'
WORKS = [
 ('iphigenie','goethe-iphigenie-auf-tauris','Iphigenie auf Tauris','Johann Wolfgang von Goethe',1787,'Weimarer Klassik','Versdrama','#305361'),
 ('krug','kleist-der-zerbrochene-krug','Der zerbrochne Krug','Heinrich von Kleist',1811,'Um 1800','Lustspiel','#a16043'),
 ('faust','goethe-faust-eine-tragoedie','Faust I','Johann Wolfgang von Goethe',1808,'Um 1800','Tragödie','#555075'),
 ('woyzeck','buechner-woyzeck','Woyzeck','Georg Büchner',1879,'Vormärz','Dramenfragment','#687e62'),
 ('nathan','lessing-nathan-der-weise','Nathan der Weise','Gotthold Ephraim Lessing',1779,'Aufklärung','Dramatisches Gedicht','#8b7143'),
 ('emilia','lessing-emilia-galotti','Emilia Galotti','Gotthold Ephraim Lessing',1772,'Aufklärung','Trauerspiel','#79616d'),
 ('kabale','schiller-kabale-und-liebe','Kabale und Liebe','Friedrich Schiller',1784,'Sturm und Drang','Trauerspiel','#486c6e'),
 ('maria','schiller-maria-stuart','Maria Stuart','Friedrich Schiller',1800,'Weimarer Klassik','Tragödie','#6c5771'),
]

def clean(text):
    return re.sub(r'\s+', ' ', text or '').strip()

def tag(el): return el.tag.rsplit('}', 1)[-1]
def words(el): return clean(''.join(el.itertext())) if el is not None else ''

def download(url, target):
    if not target.exists():
        request = urllib.request.Request(url, headers={'User-Agent':'Leseraum-Corpus/1.0 (educational text import)'})
        with urllib.request.urlopen(request, timeout=40) as response: target.write_bytes(response.read())
    return target.read_bytes()

def import_tei(spec):
    slug, file, title, author, year, epoch, genre, color = spec
    url = f'https://raw.githubusercontent.com/dracor-org/gerdracor/{COMMIT}/tei/{file}.xml'
    if slug == 'faust':
        url = 'https://www.faustedition.net/downloads/faust.xml'
    raw = download(url, SOURCE / f'{slug}.xml')
    digest = hashlib.sha256(raw).hexdigest()
    root = ET.fromstring(raw)
    if slug == 'faust':
        # The critical apparatus is metadata, never part of the reading text.
        for parent in root.iter():
            for child in list(parent):
                if tag(child) == 'note':
                    siblings = list(parent); pos = siblings.index(child)
                    if child.tail:
                        if pos: siblings[pos-1].tail = (siblings[pos-1].tail or '') + child.tail
                        else: parent.text = (parent.text or '') + child.tail
                    parent.remove(child)
                elif tag(child) == 'lb': child.tail = ' ' + (child.tail or '')
    body = root.find('.//t:body', NS)
    assert body is not None
    if slug == 'faust':
        for child in list(body):
            if child.get('n') == '2': body.remove(child)
    sections, all_blocks = [], []
    counter = Counter()
    shared_open = False
    current_page = None
    source_type = 'verse' if slug in ('iphigenie','faust') else 'textline'
    errors = []
    source_leaves = [e for e in body.iter() if tag(e) in ('l','p') and words(e)]
    parents = {child: parent for parent in body.iter() for child in parent}
    def standalone_stage(el):
        parent = parents.get(el)
        while parent is not None:
            if tag(parent) in ('l','p','stage'): return False
            parent = parents.get(parent)
        return True
    source_stages = [words(e) for e in body.iter() if tag(e)=='stage' and words(e) and standalone_stage(e)]

    def add(section, kind, text, speaker=None, **extra):
        if not text: return
        counter['block'] += 1
        block = dict(id=f'b{counter["block"]:05d}',kind=kind,text=text,**extra)
        if speaker: block['speaker'] = speaker
        if current_page: block['page'] = current_page
        section['blocks'].append(block)
        all_blocks.append(block)

    def walk(el, section, speaker=None, group=None):
        nonlocal current_page, shared_open
        kind = tag(el)
        if kind == 'pb': current_page = el.get('n'); return
        if kind in ('l','p'):
            if kind == 'l':
                part = el.get('part','N')
                if slug == 'faust':
                    numbers = [int(n) for n in el.get('n','').split()]
                    assert numbers and len(numbers) <= 2, el.attrib
                    counter['verse'] = min(numbers)
                elif part in ('M','F') and slug == 'iphigenie':
                    if not shared_open: errors.append(f'Orphan verse part at {counter["verse"]}')
                    if part == 'F': shared_open = False
                else:
                    if shared_open: errors.append(f'Unclosed verse at {counter["verse"]}')
                    counter['verse'] += 1
                    shared_open = (part == 'I' and slug == 'iphigenie')
                number = counter['verse']
                unit = source_type
            else:
                counter['paragraph'] += 1
                number, unit, part = counter['paragraph'], 'paragraph', None
            extra = {'numberEnd':max(numbers)} if slug=='faust' and kind=='l' and len(numbers)>1 else {}
            add(section,'verse' if kind == 'l' else 'prose',words(el),speaker,number=number,unit=unit,part=part,group=group,**extra)
            counter['source_text'] += 1
            return
        if kind in ('speaker','stage','trailer'):
            add(section,kind,words(el),speaker)
            return
        if kind == 'head':
            add(section,'heading',words(el)); return
        if kind == 'sp':
            speaker = (el.get('who') or '').lstrip('#').split(' #')[0] or None
            if slug == 'faust':
                speaker = clean(words(el.find('t:speaker',NS))).lower().strip('.').replace(' ','_')
        if kind == 'lg':
            counter['group'] += 1
            group = f'g{counter["group"]}'
        for child in el: walk(child, section, speaker, group)

    def sectionize(el, path):
        nonlocal current_page
        head = el.find('t:head', NS)
        own_title = el.get('{http://www.faustedition.net/ns}label') or words(head)
        divs = el.findall('t:div',NS)
        current_path = path + ([own_title] if own_title else [])
        if not divs:
            section = dict(id=f's{len(sections)+1:03d}',title=own_title or 'Text',path=path,kind=el.get('type','section'),blocks=[])
            sections.append(section)
            for child in el:
                if child is not head: walk(child,section)
        else:
            section = None
            for child in el:
                if tag(child)=='pb': current_page=child.get('n')
                elif tag(child)=='div':
                    sectionize(child,current_path)
                    section = None
                elif child is not head:
                    if section is None:
                        section = dict(id=f's{len(sections)+1:03d}',title=own_title or ('Schluss' if tag(child)=='trailer' else 'Schauplatz'),path=path,kind=el.get('type','section'),blocks=[])
                        sections.append(section)
                    walk(child,section)

    sectionize(body,[])
    if shared_open: errors.append('Unclosed final split verse')
    assert not errors, errors
    assert counter['source_text'] == len(source_leaves), (slug,counter['source_text'],len(source_leaves))
    imported_text = [b['text'] for b in all_blocks if b['kind'] in ('verse','prose')]
    assert imported_text == [words(x) for x in source_leaves], 'Text order or content changed'
    assert [b['text'] for b in all_blocks if b['kind']=='stage'] == source_stages, 'Stage directions changed or reordered'
    if slug == 'iphigenie': assert counter['verse'] == 2174
    if slug == 'faust':
        assert counter['verse'] == 4612
        present={n for b in all_blocks if b.get('unit')=='verse' for n in range(b['number'],b.get('numberEnd',b['number'])+1)}
        # The constituted source follows the 1808 text here and omits these
        # numbered verses. Preserve and report this source gap, never fill it.
        assert present == set(range(1,4613)) - set(range(4335,4343)), sorted(set(range(1,4613))-present)
    for section in sections:
        refs=[b for b in section['blocks'] if b.get('number')]
        section['firstRef']=refs[0]['number'] if refs else None
        section['lastRef']=refs[-1]['number'] if refs else None
        section['unit']=refs[0]['unit'] if refs else None
        section['characters']=list(dict.fromkeys(b['speaker'] for b in section['blocks'] if b.get('speaker')))
    people=[]
    for person in root.findall('.//t:listPerson/t:person',NS)+root.findall('.//t:listPerson/t:personGrp',NS):
        pid=person.get(XML_ID)
        name=words(person.find('t:persName',NS)) or words(person.find('t:name',NS))
        if pid and name: people.append(dict(id=pid,name=name,aliases=[name],description='Figur in '+title+'.',evidence='Personenverzeichnis der Textquelle'))
    source=words(root.find('.//t:bibl[@type="originalSource"]',NS))
    if slug == 'faust':
        source='Goethe: Faust. Historisch-kritische Faustedition, konstituierter Text, Version 1.3 RC (12.09.2023). Gerrit Brüning, Dietmar Pravida und Thorsten Vitt. Hier nur der erste Teil mit Zueignung und Vorspielen; textkritische Anmerkungen sind ausgeblendet.'
        names={b['speaker']:b['text'] for b in all_blocks if b['kind']=='speaker' and b.get('speaker')}
        people=[dict(id=pid,name=name.strip('.'),aliases=[name.strip('.')],description='Sprecher in Faust I.',evidence='Sprecherangabe der Faustedition') for pid,name in names.items()]
    licenses=[dict(name=words(e),url=e.get('target')) for e in root.findall('.//t:licence',NS)]
    relations=[dict(type=e.get('name'),active=e.get('active','').lstrip('#'),passive=e.get('passive','').lstrip('#'),mutual=e.get('mutual','').replace('#','').split()) for e in root.findall('.//t:listPerson//t:relation',NS)]
    return dict(id=slug,title=title,author=author,year=year,epoch=epoch,genre=genre,color=color,
        editionId=f'{slug}-v1-{digest[:12]}',revision=digest,sourceUrl=url,sourceLabel='Faustedition' if slug=='faust' else 'DraCor / TextGrid',sourceEdition=source,
        licenses=licenses,sourceCommit=COMMIT if slug!='faust' else None,referenceMode='verse' if slug in ('iphigenie','faust') else ('paragraph' if slug=='woyzeck' or not counter['verse'] else 'textline'),
        schoolAligned=False,validation=dict(textBlocks=counter['source_text'],verseElements=sum(tag(e)=='l' for e in source_leaves),verseCount=counter['verse'],paragraphCount=counter['paragraph'],textExact=True,splitVersesChecked=slug in ('iphigenie','faust'),manualReview=False,missingReferences=list(range(4335,4343)) if slug=='faust' else []),
        note=('Die vier Handschriftengruppen H1–H4 sind getrennt enthalten. Keine rekonstruierte Schulfassung.' if slug=='woyzeck' else ('Versnummern aus der Faustedition. Die Nummern 4335–4342 sind im Lesetext dieser Quelle ausgespart und werden nicht ergänzt. CC BY-NC-SA 4.0: nur nichtkommerzielle Nutzung. Kein ISBN-Abgleich.' if slug=='faust' else ('Geteilte Verse zusammengeführt; Zählung endet bei 2174. Noch kein Abgleich mit einer konkreten Schulausgabe.' if slug=='iphigenie' else 'Die Textstruktur ist mit der Quelle abgeglichen. Schulversnummern und Seiten anderer Ausgaben sind noch nicht zugeordnet.'))),
        curriculum='Pflichtlektüre Bayern 2026–2028' if slug=='krug' else 'Ergänzende Oberstufenlektüre',
        characters=people,relations=relations,sections=sections)

def import_kafka():
    raw=download('https://www.gutenberg.org/cache/epub/22367/pg22367.txt',SOURCE/'verwandlung.txt')
    source=raw.decode('utf-8-sig').replace('\r\n','\n')
    body=source.split('*** START OF THE PROJECT GUTENBERG EBOOK DIE VERWANDLUNG ***',1)[1].split('*** END OF THE PROJECT GUTENBERG EBOOK DIE VERWANDLUNG ***',1)[0]
    chapters=list(re.finditer(r'^([IVX]+)\.\s*$',body,re.M))
    assert [m.group(1) for m in chapters]==['I','II','III']
    sections=[]; count=0
    for idx,chapter in enumerate(chapters):
        content=body[chapter.end():chapters[idx+1].start() if idx+1<len(chapters) else len(body)].strip()
        blocks=[]
        for paragraph in re.split(r'\n\s*\n',content):
            text=clean(paragraph)
            if not text: continue
            count+=1
            blocks.append(dict(id=f'b{count:05d}',kind='prose',text=text,number=count,unit='paragraph'))
        sections.append(dict(id=f's{idx+1:03d}',title=f'{chapter.group(1)}. Kapitel',path=[],kind='chapter',blocks=blocks,firstRef=blocks[0]['number'],lastRef=blocks[-1]['number'],unit='paragraph',characters=[]))
    assert sections[0]['blocks'][0]['text'].startswith('Als Gregor Samsa')
    # Remove no source prose; the final paragraph must remain the work's ending.
    assert 'jungen Körper dehnte' in sections[-1]['blocks'][-1]['text'], sections[-1]['blocks'][-1]['text']
    digest=hashlib.sha256(raw).hexdigest()
    return dict(id='verwandlung',title='Die Verwandlung',author='Franz Kafka',year=1915,epoch='Literarische Moderne',genre='Erzählung',color='#495c74',editionId=f'verwandlung-pg-{digest[:12]}',revision=digest,sourceUrl='https://www.gutenberg.org/ebooks/22367',sourceLabel='Project Gutenberg',sourceEdition='Franz Kafka: Die Verwandlung. Kurt Wolff Verlag, Leipzig, Druck 1917. Transkription: Jana Srna, Alexander Bauer und Distributed Proofreading.',licenses=[dict(name='Gemeinfreier Originaltext; Transkriptionsquelle mit Gutenberg-Lizenz',url='https://www.gutenberg.org/policy/license.html')],referenceMode='paragraph',schoolAligned=False,validation=dict(textBlocks=count,paragraphCount=count,textExact=True,manualReview=False),note='Absätze sind innerhalb dieser digitalen Ausgabe nummeriert. Sie entsprechen keinen Zeilen- oder Seitenzahlen eines Schulhefts.',curriculum='Ergänzende Oberstufenlektüre',characters=[],relations=[],sections=sections)

def main():
    SOURCE.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
    books=[import_tei(spec) for spec in WORKS]+[import_kafka()]
    catalog=[]
    for book in books:
        (OUT/f'{book["id"]}.json').write_text(json.dumps(book,ensure_ascii=False,indent=2),encoding='utf-8')
        catalog.append({k:v for k,v in book.items() if k not in ('sections','characters','relations')})
        print(book['id'],len(book['sections']),'sections,',book['validation'])
    (ROOT/'corpus/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'corpus/validation.json').write_text(json.dumps({b['id']:b['validation'] for b in books},indent=2),encoding='utf-8')

if __name__=='__main__': main()

