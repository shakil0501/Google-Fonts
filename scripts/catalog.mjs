import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function validateFonts(fonts) {
  if (!Array.isArray(fonts) || !fonts.length) throw new Error('The font catalog is empty.');
  const slugs = new Set();
  const names = new Set();
  for (const font of fonts) {
    if (typeof font.family !== 'string' || !font.family.trim() || /[\r\n\x00]/.test(font.family)
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(font.slug)) throw new Error('Invalid font family or slug.');
    if (slugs.has(font.slug) || names.has(font.family)) throw new Error(`Duplicate font: ${font.family}`);
    slugs.add(font.slug); names.add(font.family);
    for (const key of ['categories', 'subsets', 'variants']) {
      if (!Array.isArray(font[key]) || !font[key].length || font[key].some(value => typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value))) {
        throw new Error(`Invalid ${key} for ${font.family}`);
      }
    }
    if (font.variants.some(value => !/^(regular|italic|[1-9]\d{0,3}(italic)?)$/.test(value))) throw new Error(`Invalid variants for ${font.family}`);
  }
  return [...fonts].sort((a, b) => a.family.localeCompare(b.family, 'en'));
}

export async function readFonts(root) {
  const files = (await readdir(path.join(root, 'fonts'))).filter(file => file.endsWith('.json'));
  return validateFonts(await Promise.all(files.map(async file => JSON.parse(await readFile(path.join(root, 'fonts', file), 'utf8')))));
}

export async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

export async function generateIndexes(root, input) {
  const fonts = validateFonts(input);
  const categories = [...new Set(fonts.flatMap(font => font.categories))].sort();
  const subsets = [...new Set(fonts.flatMap(font => font.subsets))].sort();
  const names = items => items.map(font => font.family);
  await writeJson(path.join(root, 'fonts.json'), { fonts: names(fonts) });
  await writeJson(path.join(root, 'categories.json'), { categories });
  await writeJson(path.join(root, 'subsets.json'), { subsets });
  for (const font of fonts) await writeJson(path.join(root, 'fonts', `${font.slug}.json`), font);
  for (const category of categories) {
    const matches = fonts.filter(font => font.categories.includes(category));
    const scripts = [...new Set(matches.flatMap(font => font.subsets))].sort();
    await writeJson(path.join(root, 'categories', category, 'fonts.json'), { fonts: names(matches) });
    await writeJson(path.join(root, 'categories', category, 'subsets.json'), { subsets: scripts });
    for (const subset of scripts) await writeJson(path.join(root, 'categories', category, subset, 'fonts.json'), { fonts: names(matches.filter(font => font.subsets.includes(subset))) });
  }
  for (const subset of subsets) {
    const matches = fonts.filter(font => font.subsets.includes(subset));
    const types = [...new Set(matches.flatMap(font => font.categories))].sort();
    await writeJson(path.join(root, 'subsets', subset, 'fonts.json'), { fonts: names(matches) });
    await writeJson(path.join(root, 'subsets', subset, 'categories.json'), { categories: types });
    for (const category of types) await writeJson(path.join(root, 'subsets', subset, category, 'fonts.json'), { fonts: names(matches.filter(font => font.categories.includes(category))) });
  }
}
