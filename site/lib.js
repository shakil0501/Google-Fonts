export function filterFonts(fonts, { search = '', category = '', subset = '', savedOnly = false, favorites = [] } = {}) {
  const query = search.trim().toLowerCase();
  return fonts.filter(font => font.family.toLowerCase().includes(query)
    && (!category || font.categories.includes(category))
    && (!subset || font.subsets.includes(subset))
    && (!savedOnly || favorites.includes(font.slug)));
}

export function fontStyle(font, requested = 400, italic = false) {
  const styles = font.variants.map(variant => ({
    weight: parseInt(variant, 10) || 400,
    italic: variant.includes('italic'),
  }));
  const matches = styles.filter(style => style.italic === italic);
  return (matches.length ? matches : styles).reduce((best, style) =>
    Math.abs(style.weight - requested) < Math.abs(best.weight - requested) ? style : best);
}

export function fontUrl(font, style) {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:ital,wght@${style.italic ? 1 : 0},${style.weight}&display=swap`;
}

export function cssSnippet(font, style) {
  const family = font.family.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const fallback = font.categories.includes('monospace') ? 'monospace' : font.categories.includes('serif') ? 'serif' : 'sans-serif';
  return `@import url("${fontUrl(font, style)}");\n\n.your-text {\n  font-family: "${family}", ${fallback};\n  font-weight: ${style.weight};\n  font-style: ${style.italic ? 'italic' : 'normal'};\n}`;
}
