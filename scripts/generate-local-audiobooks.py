"""Create explicitly synthetic public-domain readings with the CC0 Thorsten voice.

Preparation tool, never part of the website runtime. No cloud or user data.
Requires piper-tts==1.8.0, onnxruntime, ffmpeg; download de_DE-thorsten-high
with piper.download_voices into work/audio/models first. Outputs one MP3 per
canonical section and exact phrase timing manifests. Intermediate PCM is resumable.
"""
import hashlib
import json
import subprocess
import sys
import wave
from pathlib import Path

import onnxruntime as ort
from piper import PiperVoice
from piper.config import PiperConfig

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / 'work/audio/models/de_DE-thorsten-high.onnx'
MODEL_HASH = hashlib.sha256(MODEL.read_bytes()).hexdigest()
CACHE = ROOT / 'work/audio/synthesis'
CACHE.mkdir(parents=True, exist_ok=True)
options = ort.SessionOptions()
options.intra_op_num_threads = 6
options.inter_op_num_threads = 1
voice = PiperVoice(session=ort.InferenceSession(str(MODEL), sess_options=options, providers=['CPUExecutionProvider']),
                   config=PiperConfig.from_dict(json.loads(MODEL.with_suffix('.onnx.json').read_text())))
RATE = voice.config.sample_rate


def generate(work):
    if work not in ('krug', 'emilia', 'nathan'):
        raise ValueError('Only the three cleared historical works may be generated here')
    data = json.loads(subprocess.check_output([str(ROOT / 'node_modules/.bin/tsx'), str(ROOT / 'scripts/audio-units.ts'), work]))
    book, units = data['book'], data['units']
    target = ROOT / 'public/audio' / work
    target.mkdir(parents=True, exist_ok=True)
    tracks = []
    for section in book['sections']:
        section_units = [unit for unit in units if unit['sectionId'] == section['id']]
        if not section_units:
            continue
        samples, cues = 0, []
        wav_path = CACHE / f'{work}-{section["id"]}.wav'
        with wave.open(str(wav_path), 'wb') as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(RATE)
            for unit in section_units:
                identity = hashlib.sha256(('piper-1.8.0:' + MODEL_HASH + ':' + unit['text']).encode()).hexdigest()
                cached = CACHE / (identity + '.pcm')
                if cached.exists():
                    pcm = cached.read_bytes()
                else:
                    pcm = b''.join(chunk.audio_int16_bytes for chunk in voice.synthesize(unit['text']))
                    if not pcm:
                        raise ValueError('Empty synthesis output')
                    temporary = cached.with_suffix('.tmp')
                    temporary.write_bytes(pcm)
                    temporary.replace(cached)
                start = samples / RATE
                output.writeframes(pcm)
                samples += len(pcm) // 2
                if unit['readable']:
                    cues.append({**{key: unit[key] for key in ('sectionId','blockId','startOffset','endOffset')},
                                 'start': round(start, 3), 'end': round(samples / RATE, 3), 'confidence': 1})
                # A small breath between canonical lines; timestamps include it.
                pause = int(RATE * .10)
                output.writeframes(b'\0\0' * pause)
                samples += pause
        mp3_path = target / (section['id'] + '.mp3')
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav_path),'-codec:a','libmp3lame','-b:a','64k','-map_metadata','-1',str(mp3_path)],check=True)
        track_duration = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(mp3_path)]))
        tracks.append({'id':section['id'],'title':' · '.join([*section['path'],section['title']]),'url':f'/audio/{work}/{section["id"]}.mp3',
                       'duration':round(track_duration,3),'sha256':hashlib.sha256(mp3_path.read_bytes()).hexdigest(),'cues':cues})
        wav_path.unlink()
        print(f'{work}: {len(tracks)}/{len(book["sections"])} sections; {track_duration:.0f}s audio',flush=True)
    readable = {unit['blockId'] for unit in units if unit['readable']}
    manifest = {'version':1,'workId':work,'editionId':book['editionId'],'revision':book['revision'],
                'recordingId':f'piper-thorsten-high-{MODEL_HASH[:12]}-v1','synthetic':True,
                'sourceLabel':'Thorsten-Voice · lokal erzeugt','sourceUrl':'https://thorsten-voice.de/en/guides/piper/',
                'licenseUrl':'https://github.com/thorstenMueller/Thorsten-Voice/blob/master/LICENSE',
                'narrator':'Thorsten-Voice (synthetisch)',
                'note':'Kostenfrei lokal erzeugte Lesung. Die künstliche Stimme kann Namen und historische Schreibweisen ungewöhnlich aussprechen.',
                'alignment':{'method':'Piper 1.8.0 / exact generated phrase sample boundaries','matchedBlocks':len(readable),'totalBlocks':len(readable)},'tracks':tracks}
    out=ROOT/'public/audiobooks';out.mkdir(parents=True,exist_ok=True)
    temporary=out/(work+'.tmp.json');temporary.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')));temporary.replace(out/(work+'.json'))
    print(f'Complete: {work}, {len(tracks)} sections',flush=True)


if __name__ == '__main__':
    for work in sys.argv[1:] or ('krug','emilia','nathan'):
        generate(work)
