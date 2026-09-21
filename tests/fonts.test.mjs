import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { filterFonts, fontStyle, fontUrl, cssSnippet } from '../site/lib.js';
import { readFonts, validateFonts, generateIndexes } from '../scripts/catalog.mjs';
const sample = [
  { family: 'Example Sans', slug: 'example-sans', categories: ['sans-serif'], subsets: ['latin'], variants: ['regular', '700', 'italic'] },
  { family: 'Bangla Test', slug: 'bangla-test', categories: ['serif'], subsets: ['bengali', 'latin'], variants: ['300', '600'] },
];
test('search, script, category and favorites combine correctly', () => {
  assert.deepEqual(filterFonts(sample, { search: ' BAN ', subset: 'bengali', category: 'serif', savedOnly: true, favorites: ['bangla-test'] }), [sample[1]]);
  assert.equal(filterFonts(sample, { subset: 'bengali', category: 'sans-serif' }).length, 0);
  assert.equal(filterFonts(sample, { savedOnly: true }).length, 0);
});
test('only supported weight and style are requested', () => {
  assert.deepEqual(fontStyle(sample[0], 600), { weight: 700, italic: false });
  assert.deepEqual(fontStyle(sample[0], 700, true), { weight: 400, italic: true });
  assert.deepEqual(fontStyle(sample[1], 400, true), { weight: 300, italic: false });
  const italicOnly = { ...sample[0], variants: ['700italic'] };
  assert.deepEqual(fontStyle(italicOnly, 400), { weight: 700, italic: true });
  assert.match(fontUrl(sample[0], { weight: 700, italic: false }), /Example%20Sans:ital,wght@0,700&display=swap$/);
  assert.match(cssSnippet(sample[1], { weight: 300, italic: false }), /font-family: "Bangla Test", serif;/);
});
test('validation rejects unsafe paths, empty variants and duplicates', () => {
  assert.throws(() => validateFonts([{ ...sample[0], slug: '../outside' }]));
  assert.throws(() => validateFonts([{ ...sample[0], subsets: ['../outside'] }]));
  assert.throws(() => validateFonts([{ ...sample[0], variants: [] }]));
  assert.throws(() => validateFonts([sample[0], sample[0]]));
  assert.throws(() => validateFonts([]));
});
test('generated category and script indexes agree with font metadata', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shakil-fonts-test-'));
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
  try {
    await generateIndexes(directory, sample);
    const read = async name => JSON.parse(await readFile(path.join(directory, name), 'utf8'));
    assert.deepEqual(await read('subsets/bengali/fonts.json'), { fonts: ['Bangla Test'] });
    assert.deepEqual(await read('categories/serif/bengali/fonts.json'), { fonts: ['Bangla Test'] });
    assert.deepEqual(await read('subsets/latin/categories.json'), { categories: ['sans-serif', 'serif'] });
    assert.equal((await readFonts(directory)).length, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('entire checked-in catalog validates and matches top-level manifest', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const fonts = await readFonts(root);
  const manifest = JSON.parse(await readFile(path.join(root, 'fonts.json'), 'utf8'));
  assert.deepEqual(new Set(fonts.map(font => font.family)), new Set(manifest.fonts));
  assert.ok(fonts.some(font => font.subsets.includes('bengali')));
});
