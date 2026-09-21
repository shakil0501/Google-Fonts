import { mkdtemp, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFonts, validateFonts, generateIndexes, writeJson } from './catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), 'shakil-fonts-'));
const safeTemp = path.resolve(temporary);
if (path.dirname(safeTemp) !== path.resolve(tmpdir()) || !path.basename(safeTemp).startsWith('shakil-fonts-')) throw new Error('Unsafe temporary directory');
try {
  let fonts;
  let source;
  if (process.env.GOOGLE_FONTS_API_KEY) {
    const url = new URL('https://www.googleapis.com/webfonts/v1/webfonts');
    url.searchParams.set('key', process.env.GOOGLE_FONTS_API_KEY);
    url.searchParams.set('sort', 'alpha');
    // Do not log the URL or response body: either may contain credentials.
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Google Fonts API returned HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error('Unexpected Google Fonts API response');
    fonts = validateFonts(data.items.map(font => ({
      family: font.family,
      slug: font.family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      categories: [font.category], subsets: font.subsets, variants: font.variants,
      version: font.version, lastModified: font.lastModified,
    })));
    source = 'Google Fonts Developer API';
  } else {
    console.log('Syncing the upstream index (no API key required).');
    const upstream = path.join(temporary, 'upstream');
    execFileSync('git', ['clone', '--depth=1', '--quiet', 'https://github.com/hasinhayder/google-fonts.git', upstream], { stdio: 'pipe', timeout: 120000 });
    fonts = await readFonts(upstream);
    source = 'https://github.com/hasinhayder/google-fonts';
  }
  const current = await readFonts(root);
  if (fonts.length < current.length * .8) throw new Error('Update rejected: more than 20% of the catalog would disappear. Review the source manually.');
  if (JSON.stringify(fonts) === JSON.stringify(current)) { console.log(`Catalog already current: ${fonts.length} families.`); }
  else {
    // Fully validate and generate the replacement before touching tracked data.
    const staged = path.join(temporary, 'staged');
    await generateIndexes(staged, fonts);
    for (const name of ['fonts', 'categories', 'subsets']) {
      const target = path.resolve(root, name);
      if (path.dirname(target) !== path.resolve(root) || !['fonts', 'categories', 'subsets'].includes(path.basename(target))) throw new Error('Unsafe generated-data directory');
      await rm(target, { recursive: true, force: true });
      await cp(path.join(staged, name), target, { recursive: true });
    }
    for (const name of ['fonts.json', 'categories.json', 'subsets.json']) await cp(path.join(staged, name), path.join(root, name));
    await writeJson(path.join(root, 'updated.json'), { last_updated: new Date().toISOString(), source });
    console.log(`Updated ${fonts.length} font families from ${source}.`);
  }
} catch (error) {
  console.error(error.message?.includes('Google Fonts') || error.message?.includes('Update rejected') ? error.message : 'Font update failed. Check network access and source data. Existing data is retained unless file replacement had already started.');
  process.exitCode = 1;
} finally {
  await rm(safeTemp, { recursive: true, force: true });
}
