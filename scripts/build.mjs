import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readFonts } from './catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fonts = await readFonts(root);
const updated = JSON.parse(await readFile(new URL('../updated.json', import.meta.url), 'utf8'));
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await cp(new URL('../site/', import.meta.url), new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/catalog.json', import.meta.url), JSON.stringify({ ...updated, fonts }));
await cp(new URL('../LICENSE', import.meta.url), new URL('../dist/LICENSE', import.meta.url));
await writeFile(new URL('../dist/.nojekyll', import.meta.url), '');
console.log(`Built Font Explorer with ${fonts.length} validated font families.`);
