"""Local preparation checkpoint/boundary checks; no model or network access."""
import importlib.util
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('prepare_audio', Path(__file__).resolve().parents[1] / 'scripts/prepare-audiobooks.py')
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class PreparationTests(unittest.TestCase):
    def test_context_words_belong_to_one_core_and_valid_checkpoints_resume(self):
        calls = []
        def transcribe(*args, **kwargs):
            calls.append(args[0])
            words = ([{'word': 'Anfang', 'start': .1, 'end': .3}, {'word': 'Grenze', 'start': 480.1, 'end': 480.3}]
                     if len(calls) % 2 else [{'word': 'Anfang', 'start': 4.6, 'end': 4.8}, {'word': 'Grenze', 'start': 5.1, 'end': 5.3}])
            return {'segments': [{'words': words}]}
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'act.mp3'
            source.write_bytes(b'fixture: not real audio')
            with patch.dict(sys.modules, {'mlx_whisper': types.SimpleNamespace(transcribe=transcribe)}), patch.object(prepare.subprocess, 'run'):
                result = prepare.transcribe_cached(source, 500)
                words = [word for segment in result['segments'] for word in segment['words']]
                self.assertEqual([word['word'] for word in words], ['Anfang', 'Grenze'])
                self.assertAlmostEqual(words[1]['start'], 480.1)
                self.assertEqual(prepare.transcribe_cached(source, 500), result)
                self.assertEqual(len(calls), 2, 'resume must reuse both verified checkpoints')
                source.write_bytes(b'changed recording')
                prepare.transcribe_cached(source, 500)
                self.assertEqual(len(calls), 4, 'changed source must invalidate checkpoints')


if __name__ == '__main__':
    unittest.main()
