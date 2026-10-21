"""Prepare public-text/audio timing manifests locally. Never uses reader notes or API keys.

Run with work/audio-venv/bin/python scripts/prepare-audiobooks.py [work ...].
Dependencies: mlx-whisper, requests; ffmpeg/ffprobe on PATH.
Original audio and ASR intermediates stay in ignored work/audio/. Public manifests
contain canonical anchors and timings, without the ASR transcript.
"""
import difflib
import hashlib
import json
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import quote

import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'work/audio'
OUT = ROOT / 'public/audiobooks'
SOURCES = json.loads((ROOT / 'corpus/audiobook-sources.json').read_text())


def normalized(text):
    text = text.lower().replace('ß', 'ss').replace('ſ', 's')
    return ''.join(c for c in unicodedata.normalize('NFKD', text) if c.isalnum())


def duration(value):
    result = 0.0
    for part in str(value).split(':'):
        result = result * 60 + float(part)
    return result


def get_json(url, path):
    if path.exists():
        return json.loads(path.read_text())
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    data = response.json()
    path.write_text(json.dumps(data, ensure_ascii=False))
    return data


def download(url, path, expected_md5=None):
    if path.exists() and (not expected_md5 or hashlib.md5(path.read_bytes()).hexdigest() == expected_md5):
        return
    for attempt in range(3):
        try:
            response = requests.get(url, timeout=(20, 90), stream=True)
            response.raise_for_status()
            temporary = path.with_suffix('.part')
            with temporary.open('wb') as output:
                for chunk in response.iter_content(1024 * 256):
                    output.write(chunk)
            if expected_md5 and hashlib.md5(temporary.read_bytes()).hexdigest() != expected_md5:
                raise ValueError('Downloaded audio checksum mismatch')
            temporary.replace(path)
            return
        except (requests.RequestException, ValueError):
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))


def canonical(book):
    tokens, positions, blocks = [], [], {}
    for section in book['sections']:
        for block in section['blocks']:
            blocks[block['id']] = {**block, 'sectionId': section['id'], 'tokens': []}
            for match in re.finditer(r'\w+', block['text'], re.UNICODE):
                word = normalized(match.group())
                if word:
                    blocks[block['id']]['tokens'].append(len(tokens))
                    tokens.append(word)
                    positions.append((block['id'], match.start(), match.end()))
    return tokens, positions, blocks


def align(transcript, tokens, positions, blocks, autojunk=True):
    spoken = []
    for segment in transcript['segments']:
        for word in segment.get('words', []):
            parts = [normalized(m.group()) for m in re.finditer(r'\w+', word['word'], re.UNICODE)]
            for part in parts:
                if part:
                    spoken.append({**word, 'norm': part})
    matches = difflib.SequenceMatcher(None, tokens, [w['norm'] for w in spoken], autojunk=autojunk).get_matching_blocks()
    by_block = {}
    for match_index, match in enumerate(matches):
        if match.size < 3:
            # Within a reviewed scene, short replies can be evidenced by the
            # longer matching phrases immediately before AND after them.
            before = matches[match_index - 1] if match_index else None
            after = matches[match_index + 1] if match_index + 1 < len(matches) else None
            bounded = (not autojunk and match.size and before and after and
                       before.size >= 3 and after.size >= 3 and
                       match.a - (before.a + before.size) <= 8 and
                       match.b - (before.b + before.size) <= 8 and
                       after.a - (match.a + match.size) <= 8 and
                       after.b - (match.b + match.size) <= 8)
            if not bounded:
                continue
        for i in range(match.size):
            canonical_index, audio_index = match.a + i, match.b + i
            block_id, start, end = positions[canonical_index]
            by_block.setdefault(block_id, []).append((canonical_index, start, end, spoken[audio_index]))
    cues = []
    for block_id, aligned in by_block.items():
        block = blocks[block_id]
        if block['kind'] not in ('verse', 'prose'):
            continue
        coverage = len(aligned) / max(1, len(block['tokens']))
        if coverage < .45:
            continue
        # Short, evidenced phrases keep long prose paragraphs readable. Never
        # stretch a highlight across a long pause or unmatched passage.
        runs, run = [], []
        for word in aligned:
            if run and (len(run) >= 14 or word[0] - run[-1][0] > 3 or
                        word[3]['start'] - run[-1][3]['end'] > 2.5 or
                        re.search(r'[.!?;]', block['text'][run[-1][2]:word[1]])):
                runs.append(run)
                run = []
            run.append(word)
        if run:
            runs.append(run)
        for run in runs:
            start, end = run[0][3]['start'], run[-1][3]['end']
            if end <= start or end - start > max(12, len(run) * 2):
                continue
            # DOM Range offsets are UTF-16 code units, not Python code points.
            start_offset = len(block['text'][:run[0][1]].encode('utf-16-le')) // 2
            end_offset = len(block['text'][:run[-1][2]].encode('utf-16-le')) // 2
            cues.append({'start': round(start, 3), 'end': round(end, 3), 'sectionId': block['sectionId'], 'blockId': block_id,
                         'startOffset': start_offset, 'endOffset': end_offset, 'confidence': round(min(1, coverage), 3)})
    return sorted(cues, key=lambda c: c['start'])


def transcribe_cached(path, track_duration):
    """Bound memory and preserve progress across interrupted hour-long acts.

    Eight-minute cores have five seconds of context at each boundary. A word
    belongs to the core containing its midpoint; context is never duplicated.
    """
    import mlx_whisper
    model = 'mlx-community/whisper-large-v3-turbo'
    source_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    folder = path.parent / (path.stem + '.asr-chunks')
    folder.mkdir(exist_ok=True)
    segments = []
    for core in range(0, int(track_duration) + 1, 480):
        if core >= track_duration:
            break
        begin, end = max(0, core - 5), min(track_duration, core + 485)
        cache = folder / f'{core}.json'
        cached = json.loads(cache.read_text()) if cache.exists() else None
        if not cached or cached.get('source_sha256') != source_hash or cached.get('model') != model:
            clip = folder / 'current.wav'
            try:
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(begin), '-i', str(path), '-t', str(end - begin), '-ac', '1', '-ar', '16000', str(clip)], check=True)
                result = mlx_whisper.transcribe(str(clip), path_or_hf_repo=model, language='de', word_timestamps=True, verbose=None)
                cached = {'source_sha256': source_hash, 'model': model, 'result': result}
                temporary = cache.with_suffix('.tmp.json')
                temporary.write_text(json.dumps(cached, ensure_ascii=False))
                temporary.replace(cache)
                print(f'  Cached ASR {path.name}: {min(core + 480, track_duration):.0f}/{track_duration:.0f}s', flush=True)
            finally:
                clip.unlink(missing_ok=True)
        for segment in cached['result']['segments']:
            words = [{**word, 'start': word['start'] + begin, 'end': word['end'] + begin}
                     for word in segment.get('words', [])
                     if core <= (word['start'] + word['end']) / 2 + begin < min(core + 480, track_duration)]
            if words:
                segments.append({'start': words[0]['start'], 'end': words[-1]['end'], 'words': words})
    return {'segments': segments}


def prepare(work):
    source = SOURCES[work]
    if source.get('kind') != 'human' or not source.get('archiveId'):
        raise ValueError(f'No approved human recording for {work}')
    folder = CACHE / work
    folder.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    book = json.loads((ROOT / f'corpus/books/{work}.json').read_text())
    tokens, positions, blocks = canonical(book)
    metadata = get_json('https://archive.org/metadata/' + source['archiveId'], folder / 'metadata.json')
    files = sorted([f for f in metadata['files'] if f.get('format') == '64Kbps MP3'], key=lambda f: f['name'])
    if not files:
        files = sorted([f for f in metadata['files'] if f.get('format') == 'VBR MP3'], key=lambda f: f['name'])
    if not files:
        raise ValueError(f'No MP3 tracks for {work}')
    if source.get('trackSections') and len(source['trackSections']) != len(files):
        raise ValueError('Reviewed scene mapping does not match the source track list')
    if source.get('trackTitles') and len(source['trackTitles']) != len(files):
        raise ValueError('Reviewed titles do not match the source track list')
    tracks = []
    for index, file in enumerate(files):
        url = f"https://archive.org/download/{source['archiveId']}/{quote(file['name'])}"
        path = folder / file['name']
        download(url, path, file.get('md5'))
        track_duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(path)]))
        transcript_path = path.with_suffix('.transcript.json')
        if not transcript_path.exists():
            started = time.time()
            print(f'Transcribing {work} {index + 1}/{len(files)}: {file["name"]}', flush=True)
            transcript = transcribe_cached(path, track_duration)
            temporary = transcript_path.with_suffix('.tmp.json')
            temporary.write_text(json.dumps(transcript, ensure_ascii=False))
            temporary.replace(transcript_path)
            print(f'Finished ASR in {time.time() - started:.1f}s', flush=True)
        else:
            transcript = json.loads(transcript_path.read_text())
        if source.get('trackSections'):
            # Woyzeck's composite reading joins passages from different drafts.
            # Keep repeated dialogue within the reviewed scenes for this track;
            # a whole-book match can jump to an earlier draft of the same line.
            section_ids = source['trackSections'][index]
            selected = [next(s for s in book['sections'] if s['id'] == key) for key in section_ids]
            track_tokens, track_positions, track_blocks = canonical({'sections': selected})
            cues = align(transcript, track_tokens, track_positions, track_blocks, autojunk=False)
        else:
            cues = align(transcript, tokens, positions, blocks)
        title = source['trackTitles'][index] if source.get('trackTitles') else file.get('title')
        if isinstance(title, list):
            title = title[0]
        title = title or f'Teil {index + 1}'
        tracks.append({'id': f't{index + 1:03}', 'title': title, 'url': url, 'duration': round(track_duration, 3), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'cues': cues})
        print(f'Aligned {work} {index + 1}: {len(cues)} text blocks', flush=True)
    readable = [b for b in blocks.values() if b['kind'] in ('verse', 'prose')]
    matched = {cue['blockId'] for track in tracks for cue in track['cues']}
    manifest = {'version': 1, 'workId': work, 'editionId': book['editionId'], 'revision': book['revision'],
                'recordingId': source['archiveId'], 'sourceLabel': source.get('sourceLabel', 'LibriVox · Internet Archive'), 'sourceUrl': source['sourceUrl'],
                'licenseUrl': source.get('licenseUrl', 'https://librivox.org/pages/public-domain/'), 'narrator': source['narrator'], 'note': source.get('note', ''),
                'alignment': {'method': 'mlx-whisper-large-v3-turbo / canonical word matching', 'matchedBlocks': len(matched), 'totalBlocks': len(readable)}, 'tracks': tracks}
    temporary = OUT / (work + '.tmp.json')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
    temporary.replace(OUT / (work + '.json'))
    print(f'Published manifest {work}: {len(matched)}/{len(readable)} blocks ({len(matched)/max(1,len(readable)):.1%})', flush=True)


if __name__ == '__main__':
    for work in sys.argv[1:] or [key for key, value in SOURCES.items() if 'archiveId' in value]:
        prepare(work)
