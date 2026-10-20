"""Local preparation regressions; run with work/audio-venv/bin/python -m unittest discover -s tests -p 'test_audio_*.py'."""
import runpy
import unittest
from pathlib import Path

prep = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'scripts/prepare-audiobooks.py'))


def alignment(texts, spoken, reviewed=True):
    book = {'sections': [{'id': 'scene', 'blocks': [
        {'id': str(i), 'text': text, 'kind': 'prose'} for i, text in enumerate(texts)
    ]}]}
    tokens, positions, blocks = prep['canonical'](book)
    transcript = {'segments': [{'words': [
        {'word': word, 'start': i, 'end': i + .5} for i, word in enumerate(spoken.split())
    ]}]}
    return prep['align'](transcript, tokens, positions, blocks, autojunk=not reviewed)


class AlignmentTests(unittest.TestCase):
    def test_short_reply_needs_matching_context_on_both_sides(self):
        texts = ['eins zwei drei alt', 'ja', 'alt vier fünf sechs']
        self.assertIn('1', {c['blockId'] for c in alignment(texts, 'eins zwei drei neu ja neu vier fünf sechs')})
        self.assertNotIn('1', {c['blockId'] for c in alignment(texts, 'eins zwei drei neu ja nichts stimmt mehr')})
        self.assertNotIn('1', {c['blockId'] for c in alignment(texts, 'eins zwei drei neu ja neu vier fünf sechs', reviewed=False)})

    def test_offsets_remain_utf16_and_unmatched_passages_are_not_interpolated(self):
        cues = alignment(['😀 eins zwei drei. vier fünf sechs.'], 'eins zwei drei fremd fremd fremd vier fünf sechs')
        self.assertEqual(cues[0]['startOffset'], 3)
        self.assertEqual(cues[0]['end'], 2.5)
        self.assertEqual(cues[1]['start'], 6)
        self.assertLess(cues[0]['end'], cues[1]['start'])


if __name__ == '__main__':
    unittest.main()
